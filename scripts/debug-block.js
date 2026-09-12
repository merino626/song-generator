// Verifica o ciclo bloquear -> desbloquear -> bloquear de novo (lógica corrigida).
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const KIND = "fingerprint";
const VAL = "teste-ciclo-bloqueio";

// mesma lógica de app/admin/abuso/actions.ts
async function bloquear(reason) {
  await db.from("blocks").update({ active: false }).eq("kind", KIND).eq("value", VAL).eq("active", true);
  return db.from("blocks").insert({ kind: KIND, value: VAL, reason, created_by: "admin", active: true });
}
async function desbloquear() {
  const { data } = await db.from("blocks").select("id").eq("value", VAL).eq("active", true).maybeSingle();
  if (!data) return { error: { message: "nada ativo para desbloquear" } };
  return db.from("blocks").update({ active: false }).eq("id", data.id);
}
const ativos = async () =>
  (await db.from("blocks").select("id").eq("value", VAL).eq("active", true)).data?.length ?? 0;

(async () => {
  await db.from("blocks").delete().eq("value", VAL);

  for (const [n, passo, fn] of [
    [1, "bloquear", () => bloquear("teste 1")],
    [2, "desbloquear", desbloquear],
    [3, "bloquear DE NOVO", () => bloquear("teste 2")],
    [4, "desbloquear de novo", desbloquear],
    [5, "bloquear 3ª vez", () => bloquear("teste 3")],
  ]) {
    const r = await fn();
    console.log(`${n}) ${passo.padEnd(20)} erro: ${r.error?.message ?? "nenhum"}  | ativos: ${await ativos()}`);
  }

  const { data: hist } = await db.from("blocks").select("reason,active").eq("value", VAL).order("created_at");
  console.log("\nhistórico preservado:", JSON.stringify(hist));
  await db.from("blocks").delete().eq("value", VAL);
  process.exit(0);
})();
