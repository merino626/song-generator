/**
 * Prova o fix do bug relatado: cria um pedido pago, dispara o robô, e daí em
 * diante SÓ consulta GET /api/pedido/[token] (exatamente o que a tela do
 * cliente faz) — sem chamar /sweep, sem webhook. Se ficar "ready" mesmo assim,
 * o self-heal está funcionando.
 *   node scripts/e2e-autocura.js [http://localhost:3100]
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const BASE = process.argv[2] || "http://localhost:3100";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const { data: order, error } = await db
    .from("orders")
    .insert({
      status: "paid",
      occasion: "declaracao",
      recipient_name: "Autocura",
      sender_name: "Teste",
      story: "Teste do self-heal.",
      style_id: "sertanejo-romantico",
      vocal: "feminino",
      customer_email: "autocura@teste.local",
      plan: "priority",
      amount_cents: 5990,
      title: "Teste Autocura",
      lyrics: "[Verso]\nteste de autocura do polling",
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  console.log("1) pedido criado:", order.id, "-> token", order.public_token);

  const startRes = await fetch(`${BASE}/api/production/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    body: JSON.stringify({ orderId: order.id }),
  });
  console.log("2) robô disparado ->", startRes.status, await startRes.text());

  console.log("3) simulando a tela do cliente: só GET /api/pedido/[token] em loop (sem sweep, sem webhook)");
  for (let i = 1; i <= 20; i++) {
    await sleep(6000);
    const r = await fetch(`${BASE}/api/pedido/${order.public_token}`, { cache: "no-store" });
    const data = await r.json();
    console.log(`   [${i * 6}s] estado="${data.estado}"  faixas=${data.faixas?.length ?? 0}`);
    if (data.estado === "pronta") {
      console.log("\n✓ AUTO-CURADO — a tela do cliente sozinha destravou o pedido, sem sweep/webhook.");
      const { data: media } = await db.from("media_assets").select("type,url").eq("order_id", order.id);
      console.log("mídias salvas:", media?.map((m) => `${m.type}: ${m.url.startsWith("r2://") ? "R2 ✓" : m.url.slice(0, 40)}`));
      process.exit(0);
    }
  }
  console.log("\n✗ não curou em 2 minutos — investigar.");
  process.exit(1);
})().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
