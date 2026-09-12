import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { confirmarPagamento } from "@/lib/payment-confirmed";
import type Stripe from "stripe";

/**
 * Webhook da Stripe. Mesma regra de ouro do resto do projeto: NUNCA confiar
 * no corpo do POST — a assinatura garante que veio da Stripe, mas quem
 * decide se o pedido foi pago é sempre o campo `status` do próprio objeto
 * assinado, nunca um dado que pudesse ser forjado por outra via.
 *
 * Precisa do corpo CRU (não `request.json()`) porque a verificação de
 * assinatura da Stripe é sobre os bytes exatos que ela enviou — reserializar
 * o JSON depois de fazer `.parse()` pode não bater byte a byte com o
 * original e derrubar a assinatura.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const assinatura = request.headers.get("stripe-signature");
  const corpoCru = await request.text();

  let event: Stripe.Event;
  if (secret) {
    if (!assinatura) return NextResponse.json({ error: "assinatura ausente" }, { status: 401 });
    try {
      event = stripe().webhooks.constructEvent(corpoCru, assinatura, secret);
    } catch (e) {
      return NextResponse.json({ error: `assinatura inválida: ${(e as Error).message}` }, { status: 401 });
    }
  } else {
    // Sem STRIPE_WEBHOOK_SECRET configurado (comum em dev local, onde o
    // Stripe CLI ainda não foi apontado pra cá): aceita sem verificar, mas
    // ainda reconsulta a verdade na API antes de liberar qualquer coisa —
    // um POST forjado nesse modo só nos manda reconferir um PaymentIntent
    // real, nunca marca nada como pago sem essa confirmação.
    try {
      event = JSON.parse(corpoCru);
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
  }

  if (event.type !== "payment_intent.succeeded" && event.type !== "payment_intent.payment_failed") {
    return NextResponse.json({ ok: true });
  }

  const intentId = (event.data.object as Stripe.PaymentIntent).id;

  // Não confia no corpo do evento — busca o PaymentIntent de novo, direto na
  // API autenticada da Stripe.
  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe().paymentIntents.retrieve(intentId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const orderId = intent.metadata?.orderId;
  if (!orderId) return NextResponse.json({ ok: true });

  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("payments")
    .select("id")
    .eq("provider", "stripe")
    .eq("external_id", intent.id)
    .maybeSingle();

  if (existing) {
    await db
      .from("payments")
      .update({ status: intent.status, method: intent.payment_method_types?.[0] ?? null, raw: intent })
      .eq("id", existing.id);
  } else {
    await db.from("payments").insert({
      order_id: orderId,
      provider: "stripe",
      external_id: intent.id,
      method: intent.payment_method_types?.[0] ?? null,
      status: intent.status,
      amount_cents: intent.amount,
      raw: intent,
    });
  }

  if (intent.status === "succeeded") {
    await confirmarPagamento(orderId);
  } else if (intent.status === "canceled") {
    await db
      .from("orders")
      .update({ status: "error", last_error: `pagamento ${intent.status}` })
      .eq("id", orderId)
      .eq("status", "awaiting_payment");
  }

  return NextResponse.json({ ok: true });
}
