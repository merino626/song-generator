import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { confirmarPagamento } from "@/lib/payment-confirmed";

export const dynamic = "force-dynamic";

/**
 * Polling do cliente enquanto aguarda confirmação. Depois de
 * `stripe.confirmPayment()` no navegador, é este endpoint que a tela chama
 * (de imediato, e depois em intervalo) para saber se pode redirecionar —
 * sempre reconferindo a verdade DIRETO na Stripe, nunca confiando no que o
 * próprio navegador disse que aconteceu. Mesmo princípio do `sweep` dos jobs
 * de produção: nunca confiar em cache, sempre reconferir a fonte enquanto o
 * estado ainda está pendente.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token obrigatório" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: order } = await db.from("orders").select("id,status,public_token").eq("public_token", token).maybeSingle();
  if (!order) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  if (order.status === "awaiting_payment" && stripeConfigured()) {
    const { data: payment } = await db
      .from("payments")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (payment?.external_id && payment.status !== "succeeded") {
      try {
        const live = await stripe().paymentIntents.retrieve(payment.external_id);
        if (live.status !== payment.status) {
          await db
            .from("payments")
            .update({ status: live.status, method: live.payment_method_types?.[0] ?? null, raw: live })
            .eq("id", payment.id);
        }

        if (live.status === "succeeded") {
          await confirmarPagamento(order.id);
          // Responde já como pago, mesmo que outro caminho (webhook) tenha
          // ganhado a corrida — para o cliente o que importa é que está confirmado.
          order.status = "paid";
        } else if (live.status === "canceled") {
          // Só "canceled" é terminal. Um cartão recusado deixa o PaymentIntent
          // em "requires_payment_method" para o cliente tentar outro cartão
          // no mesmo formulário — isso NÃO é falha do pedido, então não
          // redireciona para lugar nenhum.
          order.status = "error" as any;
        }
      } catch (e) {
        // Falha ao consultar a Stripe não pode travar o polling — tenta de novo no próximo ciclo.
        console.error("[checkout/status] consulta à Stripe falhou:", (e as Error).message);
      }
    }
  }

  return NextResponse.json({ status: order.status });
}
