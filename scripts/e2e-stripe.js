/**
 * Ponta a ponta do checkout Stripe — sem navegador, direto na API.
 *
 * O que prova:
 *  1) /api/checkout/create-intent nunca aceita valor do cliente — só manda
 *     `orderId`, e o PaymentIntent criado tem exatamente `order.amount_cents`.
 *  2) confirmando o PaymentIntent com um cartão de teste da Stripe (do jeito
 *     que o navegador faria via Elements), /api/checkout/status detecta e
 *     libera o pedido.
 *  3) o mesmo pedido gera exatamente UM PaymentIntent mesmo pedindo duas vezes
 *     (reaproveitamento, evita cobrança duplicada em reload).
 *
 *   node scripts/e2e-stripe.js [http://localhost:3100]
 */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");
const Stripe = require("stripe");

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const BASE = process.argv[2] || "http://localhost:3100";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  let falhas = 0;

  const { data: order, error } = await db
    .from("orders")
    .insert({
      status: "awaiting_payment",
      occasion: "declaracao",
      recipient_name: "TesteStripe",
      sender_name: "Teste",
      story: "teste e2e do checkout stripe",
      style_id: "sertanejo-romantico",
      vocal: "feminino",
      customer_email: "teste.stripe@example.com",
      plan: "priority",
      amount_cents: 5990,
      title: "Teste Stripe",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  console.log(`1) pedido criado: R$ ${(order.amount_cents / 100).toFixed(2)} (${order.id})`);

  // --- 1) create-intent duas vezes: tem que reaproveitar, não duplicar ---
  console.log("\n2) chamando create-intent duas vezes seguidas");
  const r1 = await fetch(`${BASE}/api/checkout/create-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: order.id }),
  });
  const j1 = await r1.json();
  const r2 = await fetch(`${BASE}/api/checkout/create-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: order.id }),
  });
  const j2 = await r2.json();
  console.log(`   1ª chamada: HTTP ${r1.status} · clientSecret ${j1.clientSecret ? "recebido" : "AUSENTE"}`);
  console.log(`   2ª chamada: HTTP ${r2.status} · mesmo clientSecret? ${j1.clientSecret === j2.clientSecret ? "✓ sim" : "✗ NÃO — duplicou"}`);
  if (j1.clientSecret !== j2.clientSecret) falhas++;

  const { data: pagamentos } = await db.from("payments").select("external_id,amount_cents").eq("order_id", order.id);
  console.log(`   PaymentIntents criados no banco: ${pagamentos.length} (esperado 1)`);
  if (pagamentos.length !== 1) falhas++;

  const intentId = pagamentos[0].external_id;
  const intentReal = await stripe.paymentIntents.retrieve(intentId);
  console.log(`\n3) valor REAL do PaymentIntent na Stripe: R$ ${(intentReal.amount / 100).toFixed(2)} (esperado R$ 59.90)`);
  if (intentReal.amount !== order.amount_cents) {
    console.log("   ✗ FALHA: o valor cobrado não bate com o do pedido!");
    falhas++;
  } else {
    console.log("   ✓ bate — o servidor manda o valor, o cliente não tem voto");
  }

  // --- 2) confirma com um cartão de teste, igual o navegador faria ---
  // A Stripe bloqueia número de cartão cru na API server-side de propósito
  // (é justamente a proteção PCI que existe pra ninguém fazer isso em
  // produção) — por isso usa `pm_card_visa`, o PaymentMethod de teste que a
  // própria Stripe disponibiliza pra simular exatamente o cartão 4242 sem
  // precisar do Elements/tokenização no navegador.
  console.log("\n4) confirmando o PaymentIntent com pm_card_visa (equivalente ao 4242 4242 4242 4242)");
  const confirmado = await stripe.paymentIntents.confirm(intentId, { payment_method: "pm_card_visa" });
  console.log(`   status na Stripe após confirmar: ${confirmado.status}`);

  // --- 3) nosso status endpoint precisa detectar e liberar ---
  console.log("\n5) chamando /api/checkout/status (o que a tela chama após stripe.confirmPayment)");
  const rs = await fetch(`${BASE}/api/checkout/status?token=${order.public_token}`, { cache: "no-store" });
  const js = await rs.json();
  console.log(`   resposta: HTTP ${rs.status} -> ${JSON.stringify(js)}`);

  await new Promise((res) => setTimeout(res, 1200)); // startProduction roda sem await
  const { data: fresh } = await db.from("orders").select("status,paid_at").eq("id", order.id).single();
  console.log(`\n6) pedido no banco: status="${fresh.status}" paid_at=${fresh.paid_at ? "preenchido ✓" : "VAZIO ✗"}`);
  if (!fresh.paid_at || fresh.status === "awaiting_payment") {
    console.log("   ✗ FALHA: o pedido não foi liberado");
    falhas++;
  } else {
    console.log("   ✓ liberado corretamente");
  }

  // limpeza
  await db.from("jobs").delete().eq("order_id", order.id);
  await db.from("payments").delete().eq("order_id", order.id);
  await db.from("orders").delete().eq("id", order.id);
  console.log("\n(dados de teste removidos)");

  if (falhas) {
    console.log(`\n✗✗✗ ${falhas} FALHA(S) ✗✗✗`);
    process.exit(1);
  }
  console.log("\n✓✓✓ CHECKOUT STRIPE FUNCIONANDO DE PONTA A PONTA ✓✓✓");
  process.exit(0);
})().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
