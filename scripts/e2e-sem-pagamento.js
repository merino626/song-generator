/**
 * Teste adversarial: cria um pedido NUNCA pago (status='draft', sem paid_at)
 * e tenta forçar produção/entrega pelos dois caminhos que existem — deve
 * falhar nos dois, sem gastar crédito e sem criar mídia nenhuma.
 *   node scripts/e2e-sem-pagamento.js [http://localhost:3100]
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

(async () => {
  const { data: order, error } = await db
    .from("orders")
    .insert({
      status: "draft", // NUNCA foi pago — nem awaiting_payment, nem paid_at
      occasion: "declaracao",
      recipient_name: "NuncaPagou",
      sender_name: "Teste",
      story: "Este pedido nunca foi pago.",
      style_id: "sertanejo-romantico",
      vocal: "feminino",
      customer_email: "nuncapagou@teste.local",
      plan: "priority",
      amount_cents: 5990,
      title: "Nao Deveria Gerar",
      lyrics: "[Verso]\nse isso gerar, é bug grave",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  console.log("1) pedido criado com status='draft' (nunca pago):", order.id);

  let falhas = 0;

  console.log("\n2) tentando /api/production/start (deveria RECUSAR)");
  const r1 = await fetch(`${BASE}/api/production/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    body: JSON.stringify({ orderId: order.id }),
  });
  const j1 = await r1.json();
  console.log(`   HTTP ${r1.status} ->`, j1);
  if (r1.status >= 400 && /não está pago|nao esta pago/i.test(j1.error || "")) {
    console.log("   ✓ recusado corretamente");
  } else {
    console.log("   ✗ FALHA DE SEGURANÇA: não recusou!");
    falhas++;
  }

  console.log("\n3) tentando /api/production/manual (deveria RECUSAR)");
  const r2 = await fetch(`${BASE}/api/production/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    body: JSON.stringify({ orderId: order.id, urls: ["https://cdn1.suno.ai/fake-sem-pagar.mp3"] }),
  });
  const j2 = await r2.json();
  console.log(`   HTTP ${r2.status} ->`, j2);
  if (r2.status >= 400 && /não está pago|nao esta pago/i.test(j2.error || "")) {
    console.log("   ✓ recusado corretamente");
  } else {
    console.log("   ✗ FALHA DE SEGURANÇA: não recusou!");
    falhas++;
  }

  console.log("\n4) conferindo o banco: nada deveria ter mudado");
  const { data: fresh } = await db.from("orders").select("status").eq("id", order.id).single();
  const { data: jobs } = await db.from("jobs").select("id").eq("order_id", order.id);
  const { data: media } = await db.from("media_assets").select("id").eq("order_id", order.id);
  console.log(`   status ainda é "${fresh.status}" (esperado "draft")`);
  console.log(`   jobs criados: ${jobs?.length ?? 0} (esperado 0)`);
  console.log(`   media_assets criados: ${media?.length ?? 0} (esperado 0)`);
  if (fresh.status !== "draft" || (jobs?.length ?? 0) > 0 || (media?.length ?? 0) > 0) {
    console.log("   ✗ FALHA DE SEGURANÇA: algo foi criado/alterado sem pagamento!");
    falhas++;
  } else {
    console.log("   ✓ nada foi criado — o pedido continua intocado");
  }

  await db.from("orders").delete().eq("id", order.id);
  console.log("\n(pedido de teste removido)");

  if (falhas > 0) {
    console.log(`\n✗✗✗ ${falhas} FALHA(S) DE SEGURANÇA ENCONTRADA(S) ✗✗✗`);
    process.exit(1);
  }
  console.log("\n✓✓✓ TUDO RECUSADO CORRETAMENTE — nenhum caminho libera sem pagamento ✓✓✓");
  process.exit(0);
})().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
