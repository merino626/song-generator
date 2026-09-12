"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { deliverManual } from "@/lib/delivery";
import { startProduction } from "@/lib/music/orchestrator";

/**
 * Ações da fila. A entrega em si vive em `lib/delivery.ts`, compartilhada com
 * a rota de API — assim as duas nunca divergem.
 */
export type ManualState = { error?: string } | null;

/**
 * Assinatura de `useActionState` (prevState, formData) em vez do `(formData)`
 * simples — é o que permite o formulário desabilitar o botão durante o envio
 * (`useFormStatus`) e mostrar o erro na tela em vez de estourar sem aviso.
 * O guard real contra duplicata está em `deliverManual`; isto é só a UX de
 * evitar que a pessoa clique duas vezes pensando que não registrou o 1º clique.
 */
export async function concluirManual(_prev: ManualState, formData: FormData): Promise<ManualState> {
  try {
    await deliverManual({
      orderId: String(formData.get("orderId") || ""),
      urls: [String(formData.get("audio1") || ""), String(formData.get("audio2") || "")],
      capa: String(formData.get("capa") || ""),
      operador: String(formData.get("operador") || "").trim() || "admin",
    });
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/fila");
  return null;
}

/** Assume o pedido (sinaliza que você está cuidando dele). */
export async function assumirPedido(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return;
  await supabaseAdmin().from("orders").update({ status: "producing_manual" }).eq("id", orderId);
  revalidatePath("/admin/fila");
}

/** Devolve para o robô tentar de novo (ex.: caiu por falha temporária). */
export async function reenviarParaRobo(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  if (!orderId) return;
  await supabaseAdmin()
    .from("orders")
    .update({ status: "paid", manual_reason: null, last_error: null })
    .eq("id", orderId);

  // Só resetar o status não bastava: nada mais ficava "escutando" um pedido em
  // "paid" pra retomar a produção (o self-heal só reage a "producing_robot").
  // O botão parecia funcionar (limpava o motivo do erro) mas não fazia nada —
  // o pedido ficava parado em "paid" pra sempre até alguém entregar manual.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const callbackUrl = site && !site.includes("localhost") ? `${site}/api/production/callback` : undefined;
  try {
    await startProduction(orderId, callbackUrl);
  } catch (e) {
    console.error("[fila] reenviar pro robô falhou:", (e as Error).message);
  }

  revalidatePath("/admin/fila");
}
