/**
 * Testa o caminho MANUAL: pedido cai na fila -> operador entrega -> cliente vê.
 *   node scripts/e2e-manual.js [http://localhost:3100]
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

// Um MP3 real que já temos no R2 (do teste do robô), para simular o link do Suno.
const AUDIO_TESTE = "https://cdn1.suno.ai/a408b61b-6192-4461-be2e-90c2768105cf.mp3";

(async () => {
  const { data: order, error } = await db
    .from("orders")
    .insert({
      status: "manual_review",
      manual_reason: "robô falhou: teste do caminho manual",
      occasion: "zoacao",
      recipient_name: "Bruno",
      recipient_gender: "m",
      sender_name: "A turma",
      story: "Teste do caminho manual.",
      style_id: "rock-comico",
      vocal: "masculino",
      customer_email: "manual@viracancao.local",
      plan: "standard",
      amount_cents: 4790,
      title: "Teste Manual",
      lyrics: "[Verso]\nEssa veio pela fila manual",
      paid_at: new Date().toISOString(),
      attempts: 2,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  console.log("1) pedido criado em manual_review:", order.id);

  // Cliente já consegue acompanhar? (deve mostrar "produzindo", não "manual")
  const antes = await (await fetch(`${BASE}/api/pedido/${order.public_token}`)).json();
  console.log(`2) cliente vê: "${antes.estado}"  ${antes.estado === "produzindo" ? "✓ (não expõe o manual)" : "✗"}`);

  // Operador entrega (mesma função que o formulário do painel usa)
  const res = await fetch(`${BASE}/api/production/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    body: JSON.stringify({ orderId: order.id, urls: [AUDIO_TESTE], operator: "dudu" }),
  });
  console.log("3) entrega manual ->", res.status, await res.text());

  const depois = await (await fetch(`${BASE}/api/pedido/${order.public_token}`)).json();
  console.log(`4) cliente vê agora: "${depois.estado}" com ${depois.faixas.length} faixa(s)`);

  const { data: media } = await db.from("media_assets").select("url").eq("order_id", order.id);
  const noR2 = media?.every((m) => m.url.startsWith("r2://"));
  console.log(`5) espelhado no R2: ${noR2 ? "✓ sim" : "✗ não"}`);

  if (depois.faixas[0]) {
    const dl = await fetch(`${BASE}${depois.faixas[0].url}`, { redirect: "follow" });
    console.log(`6) download do cliente: HTTP ${dl.status} (${(await dl.arrayBuffer()).byteLength} bytes)`);
  }
  console.log(`\nlink do cliente: ${BASE}/pedido/${order.public_token}`);
  process.exit(0);
})().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
