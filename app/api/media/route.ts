import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { keyFromRef, signedUrl } from "@/lib/r2";
import { isPaidOrBeyond } from "@/lib/order-status";

export const dynamic = "force-dynamic";

/**
 * Entrega da mídia: /api/media?token=<public_token>&id=<asset_id>
 *
 * Só libera se o pedido estiver pago — é aqui que a música vira produto
 * entregue, e não arquivo solto numa CDN pública. Redireciona para uma URL
 * assinada de curta duração, então o link compartilhado por engano expira.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const assetId = url.searchParams.get("id");
  if (!token || !assetId) {
    return NextResponse.json({ error: "token e id são obrigatórios" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: order } = await db.from("orders").select("id,status").eq("public_token", token).maybeSingle();
  if (!order) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });
  if (!isPaidOrBeyond(order.status)) {
    return NextResponse.json({ error: "pedido ainda não liberado" }, { status: 402 });
  }

  const { data: asset } = await db
    .from("media_assets")
    .select("url")
    .eq("id", assetId)
    .eq("order_id", order.id) // impede pedir mídia de outro pedido
    .maybeSingle();
  if (!asset) return NextResponse.json({ error: "mídia não encontrada" }, { status: 404 });

  const key = keyFromRef(asset.url);
  // Fallback: mídia que não foi espelhada ainda aponta direto para o provider.
  if (!key) return NextResponse.redirect(asset.url);

  return NextResponse.redirect(await signedUrl(key));
}
