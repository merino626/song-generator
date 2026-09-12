// Remove faixas duplicadas (mesma source_url no mesmo pedido), mantendo a mais antiga.
// Reordena is_primary para sobrar exatamente 1 primária.
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  const { data: rows } = await db.from("media_assets").select("*").order("created_at");
  const byOrderType = {};
  for (const r of rows ?? []) (byOrderType[`${r.order_id}:${r.type}`] ??= []).push(r);

  let removidas = 0;
  for (const [key, group] of Object.entries(byOrderType)) {
    const seen = new Set();
    const manter = [];
    const remover = [];
    for (const r of group) {
      const k = r.source_url || r.url;
      if (seen.has(k)) remover.push(r);
      else {
        seen.add(k);
        manter.push(r);
      }
    }
    if (remover.length) {
      console.log(`${key}: removendo ${remover.length} duplicata(s)`);
      await db.from("media_assets").delete().in("id", remover.map((r) => r.id));
      removidas += remover.length;

      // Garante exatamente 1 is_primary por (order,type) restante.
      await db.from("media_assets").update({ is_primary: false }).in("id", manter.map((r) => r.id));
      await db.from("media_assets").update({ is_primary: true }).eq("id", manter[0].id);
    }
  }
  console.log(`\nTotal removido: ${removidas}`);
  process.exit(0);
})();
