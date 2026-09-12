import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { totalCents, type PlanId, type UpsellId } from "@/lib/pricing";

/**
 * Persiste o pedido no momento em que o cliente decide pagar — é o "commit
 * point" do funil (antes disso tudo vive só no localStorage).
 *
 * Idempotente: se `orderId` vier no corpo e o pedido ainda não foi pago,
 * ATUALIZA em vez de criar outro — evita linha órfã quando a pessoa volta e
 * troca de plano antes de pagar.
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { orderId, occasion, recipientName, recipientGender, relationship, senderName, story, styleId, vocal, email, phone, title, lyrics, plan, upsells } = body ?? {};

  if (!recipientName || !story || !title || !lyrics || !plan) {
    return NextResponse.json({ error: "Dados do pedido incompletos" }, { status: 422 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email || "")) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 422 });
  }
  if (!["standard", "priority"].includes(plan)) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 422 });
  }

  // INVARIANTE, não confiança na tela: nenhum upsell é vendável enquanto não
  // existir código que o produza e entregue. A UI já não os oferece, mas um
  // POST direto ainda criaria um pedido cobrado por algo que não sabemos
  // cumprir. Para reativar: devolver o filtro e implementar a produção.
  const VENDAVEIS: UpsellId[] = [];
  const validUpsells: UpsellId[] = Array.isArray(upsells)
    ? upsells.filter((u: unknown): u is UpsellId => VENDAVEIS.includes(u as UpsellId))
    : [];
  const amountCents = totalCents(plan as PlanId, validUpsells);

  const row = {
    occasion,
    recipient_name: recipientName,
    recipient_gender: recipientGender ?? null,
    relationship: relationship ?? null,
    sender_name: senderName ?? null,
    story,
    style_id: styleId ?? null,
    vocal: vocal ?? null,
    customer_email: String(email).toLowerCase().trim(),
    customer_phone: phone ?? null,
    title,
    lyrics,
    plan,
    amount_cents: amountCents,
    upsells: validUpsells,
  };

  const db = supabaseAdmin();

  // Reaproveita o pedido se ele ainda não foi pago (evita duplicar a cada "voltar").
  if (orderId) {
    const { data: existing } = await db.from("orders").select("id,status").eq("id", orderId).maybeSingle();
    if (existing && existing.status === "awaiting_payment") {
      const { data: updated, error } = await db.from("orders").update(row).eq("id", orderId).select("id,public_token").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ orderId: updated.id, publicToken: updated.public_token, amountCents });
    }
  }

  const { data: created, error } = await db
    .from("orders")
    .insert({ ...row, status: "awaiting_payment" })
    .select("id,public_token")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orderId: created.id, publicToken: created.public_token, amountCents });
}
