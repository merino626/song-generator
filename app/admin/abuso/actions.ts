"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Ações do painel de abuso. Rodam no servidor e só são alcançáveis por quem
 * passou pelo middleware do /admin.
 */

const TIPOS = ["ip", "device", "fingerprint", "email"] as const;

export async function blockIdentity(formData: FormData) {
  const kind = String(formData.get("kind") || "");
  const value = String(formData.get("value") || "").trim();
  const reason = String(formData.get("reason") || "bloqueado manualmente pelo painel");
  const hours = Number(formData.get("hours") || 0);

  if (!TIPOS.includes(kind as any) || !value) return;

  const db = supabaseAdmin();

  // Desativa o bloqueio anterior (se houver) e insere um novo.
  //
  // Nada de upsert aqui: o índice único é PARCIAL (`where active`), e o
  // ON CONFLICT do Postgres não consegue mirar índice parcial — era isso que
  // fazia o botão falhar silenciosamente. Inserir uma linha nova também
  // preserva o histórico de quando cada bloqueio foi aplicado.
  await db.from("blocks").update({ active: false }).eq("kind", kind).eq("value", value).eq("active", true);

  const { error } = await db.from("blocks").insert({
    kind,
    value,
    reason,
    created_by: "admin",
    active: true,
    expires_at: hours > 0 ? new Date(Date.now() + hours * 3600_000).toISOString() : null,
  });

  if (error) throw new Error(`não foi possível bloquear: ${error.message}`);

  revalidatePath("/admin/abuso");
}

export async function unblockIdentity(formData: FormData) {
  const id = String(formData.get("id") || "");
  if (!id) return;

  const { error } = await supabaseAdmin().from("blocks").update({ active: false }).eq("id", id);
  if (error) throw new Error(`não foi possível desbloquear: ${error.message}`);

  revalidatePath("/admin/abuso");
}
