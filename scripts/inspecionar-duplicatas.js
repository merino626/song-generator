// Encontra pedidos com mais de 2 faixas 'song' (sintoma do bug de clique duplo na entrega manual).
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
  const { data: songs } = await db.from("media_assets").select("id,order_id,url,source_url,is_primary,created_at").eq("type", "song").order("created_at");
  const byOrder = {};
  for (const s of songs ?? []) (byOrder[s.order_id] ??= []).push(s);

  const suspeitos = Object.entries(byOrder).filter(([, rows]) => rows.length > 2);
  if (!suspeitos.length) {
    console.log("Nenhum pedido com mais de 2 faixas. Nada para limpar.");
    process.exit(0);
  }

  for (const [orderId, rows] of suspeitos) {
    const { data: order } = await db.from("orders").select("title,status,recipient_name").eq("id", orderId).maybeSingle();
    console.log(`\nPedido ${orderId}  "${order?.title}"  status=${order?.status}  (${rows.length} faixas)`);
    rows.forEach((r, i) => console.log(`  [${i}] id=${r.id}  primary=${r.is_primary}  source=${(r.source_url || r.url).slice(0, 70)}`));
  }
})();
