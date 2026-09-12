/**
 * Teste ponta a ponta da produção híbrida (gasta ~12 créditos do crun).
 *   node scripts/e2e-producao.js [http://localhost:3100]
 *
 * 1. cria um pedido pago no banco
 * 2. dispara a produção (robô)
 * 3. acompanha até ready ou manual_review
 * 4. confere se a mídia foi espelhada no R2
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
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
      recipient_name: "Ângela",
      recipient_gender: "f",
      relationship: "Esposa",
      sender_name: "João",
      story: "Teste ponta a ponta da produção.",
      style_id: "sertanejo-romantico",
      vocal: "feminino",
      customer_email: "teste@viracancao.local",
      plan: "priority",
      amount_cents: 5990,
      title: "Teste E2E",
      lyrics:
        "[Verso 1]\nÂngela, essa é só um teste\nMas o carinho aqui é de verdade\n\n[Refrão]\nÂngela, é sobre você\nO João mandou essa canção",
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error("insert falhou: " + error.message);
  console.log("pedido criado:", order.id);

  const res = await fetch(`${BASE}/api/production/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    body: JSON.stringify({ orderId: order.id }),
  });
  console.log("start ->", res.status, await res.text());

  for (let i = 1; i <= 30; i++) {
    await sleep(10000);
    await fetch(`${BASE}/api/production/sweep`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {});
    const { data: o } = await db.from("orders").select("status,manual_reason").eq("id", order.id).single();
    console.log(`[${i * 10}s] status=${o.status}${o.manual_reason ? ` (${o.manual_reason})` : ""}`);
    if (["ready", "manual_review", "error"].includes(o.status)) break;
  }

  const { data: media } = await db.from("media_assets").select("type,url,duration_s").eq("order_id", order.id);
  console.log("\nmídias:");
  for (const m of media ?? []) {
    const noR2 = m.url.includes("suno.ai") || m.url.includes("mediaoss");
    console.log(` ${m.type.padEnd(6)} ${noR2 ? "[provider]" : "[R2 ✓]"} ${m.url.slice(0, 95)}`);
  }
  process.exit(0);
})().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
