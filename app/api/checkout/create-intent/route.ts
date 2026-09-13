import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe, stripeConfigured, PAGAMENTO_ATIVO } from "@/lib/stripe";

/** Criar o PaymentIntent e trocar mensagens com a Stripe pode levar um instante. */
export const maxDuration = 30;

/**
 * Cria (ou reaproveita) o PaymentIntent do pedido e devolve o `clientSecret`
 * para o Stripe Elements montar o formulário no navegador.
 *
 * Diferença de arquitetura em relação ao Mercado Pago: lá, uma chamada só
 * criava E cobrava (tokenização + cobrança na mesma requisição do nosso
 * servidor). Aqui são dois passos propositalmente separados pela própria
 * Stripe: o PaymentIntent nasce ANTES de existir cartão nenhum, e quem de
 * fato confirma a cobrança é o navegador do cliente, direto com a Stripe
 * (via `stripe.confirmPayment`) — nosso servidor nunca vê o cartão nem
 * participa dessa parte. Depois, SEMPRE reconferimos o resultado direto na
 * API da Stripe (`/api/checkout/status`, o webhook) — nunca no que o cliente
 * disser que aconteceu.
 */
export async function POST(request: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json({ error: "Pagamento ainda não configurado (STRIPE_SECRET_KEY ausente)." }, { status: 503 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { orderId } = body ?? {};
  if (!orderId) return NextResponse.json({ error: "orderId obrigatório" }, { status: 422 });

  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  if (order.status !== "awaiting_payment") {
    return NextResponse.json(
      { error: "Este pedido já não está aguardando pagamento.", status: order.status },
      { status: 409 },
    );
  }

  // Reaproveita um PaymentIntent ainda vivo do mesmo pedido — evita criar um
  // novo a cada reload da tela de pagamento (o cliente re-hidrataria com o
  // clientSecret novo, mas o antigo ficaria órfão do lado da Stripe).
  const { data: pendente } = await db
    .from("payments")
    .select("external_id,status")
    .eq("order_id", order.id)
    .eq("provider", "stripe")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendente?.external_id && (PAGAMENTO_ATIVO as readonly string[]).includes(pendente.status)) {
    try {
      const existente = await stripe().paymentIntents.retrieve(pendente.external_id);
      if ((PAGAMENTO_ATIVO as readonly string[]).includes(existente.status) && existente.amount === order.amount_cents) {
        return NextResponse.json({ clientSecret: existente.client_secret });
      }
    } catch (e) {
      // PaymentIntent sumiu do lado da Stripe (raro) — segue e cria um novo.
      console.error("[create-intent] falha ao reconferir intent pendente:", (e as Error).message);
    }
  }

  let intent;
  try {
    intent = await stripe().paymentIntents.create({
      // O VALOR VEM DO BANCO, NUNCA DO CLIENTE — mesmo princípio que já
      // aplicávamos com o Mercado Pago. `order.amount_cents` é calculado em
      // `/api/checkout/order` a partir de `totalCents()`, nunca do navegador.
      amount: order.amount_cents,
      currency: "brl",
      description: `Vira Canção — ${order.title || "Música personalizada"}`.slice(0, 250),
      receipt_email: order.customer_email || undefined,
      metadata: { orderId: order.id },
      // Só cartão, de propósito. Pix ficaria ótimo aqui, mas a Stripe exige
      // acesso liberado por convite pra essa conta — incluir "pix" neste
      // array SEM esse acesso faz a criação do PaymentIntent inteiro ser
      // recusada (erro 502), quebrando até o cartão. Testado e confirmado:
      // ver histórico do commit que reverteu isto. Só reativar depois que o
      // Dashboard (Settings > Payment methods) mostrar Pix como disponível
      // de verdade, não só "solicitar acesso".
      payment_method_types: ["card"],
    });
  } catch (e) {
    console.error("[create-intent] Stripe recusou criar o PaymentIntent:", (e as Error).message);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento. Tente de novo em instantes." }, { status: 502 });
  }

  await db.from("payments").insert({
    order_id: order.id,
    provider: "stripe",
    external_id: intent.id,
    method: null,
    status: intent.status,
    amount_cents: order.amount_cents,
    raw: intent,
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}
