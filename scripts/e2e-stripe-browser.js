/**
 * Ponta a ponta da tela de pagamento DE VERDADE, num navegador real —
 * cobre exatamente o caminho que o e2e-stripe.js (via API pura) não cobre:
 * o ciclo de vida do <PaymentElement> da Stripe dentro do nosso React.
 *
 *   node scripts/e2e-stripe-browser.js [http://localhost:3100]
 */
const fs = require("fs");
const { chromium } = require("playwright");
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
  let falhas = 0;

  const { data: order, error } = await db
    .from("orders")
    .insert({
      status: "awaiting_payment",
      occasion: "declaracao",
      recipient_name: "TesteBrowser",
      sender_name: "Teste",
      story: "teste e2e via navegador do fix do payment element",
      style_id: "sertanejo-romantico",
      vocal: "feminino",
      customer_email: "teste.browser@example.com",
      plan: "priority",
      amount_cents: 5990,
      title: "Teste Browser",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  console.log(`1) pedido criado: ${order.id} / token ${order.public_token}`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const erros = [];
  page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") erros.push(`console.error: ${msg.text()}`);
  });

  // Precisa estar no domínio antes de escrever localStorage.
  await page.goto(`${BASE}/criar/pagamento`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ orderId, publicToken }) => {
      localStorage.setItem(
        "vc.draft.v1",
        JSON.stringify({ orderId, publicToken, plan: "priority", upsells: [] })
      );
    },
    { orderId: order.id, publicToken: order.public_token }
  );
  console.log("2) draft escrito no localStorage, recarregando a página de pagamento");
  await page.goto(`${BASE}/criar/pagamento`, { waitUntil: "domcontentloaded" });

  console.log("3) esperando o Payment Element da Stripe montar (iframe)");
  const frame = await page
    .frameLocator('iframe[title="Secure payment input frame"]')
    .first();
  await frame.locator('input[name="number"]').waitFor({ timeout: 20000 });

  console.log("4) preenchendo cartão de teste 4242 4242 4242 4242");
  await frame.locator('input[name="number"]').fill("4242424242424242");
  await frame.locator('input[name="expiry"]').fill("12/30");
  await frame.locator('input[name="cvc"]').fill("123");
  const cep = frame.locator('input[name="postalCode"]');
  if (await cep.count()) await cep.fill("01310-100");

  console.log("5) clicando em Pagar / Pay");
  await page.getByRole("button", { name: /pagar|pay/i }).click();

  console.log("6) aguardando redirecionamento para /pedido/<token>");
  try {
    await page.waitForURL(new RegExp(`/pedido/${order.public_token}`), { timeout: 25000 });
    console.log(`   ✓ redirecionou: ${page.url()}`);
  } catch {
    console.log(`   ✗ FALHA: não redirecionou a tempo. URL atual: ${page.url()}`);
    falhas++;
  }

  await page.waitForTimeout(500); // dá tempo de qualquer erro tardio aparecer

  if (erros.length) {
    console.log(`\n✗ Erros de página/console capturados (${erros.length}):`);
    for (const e of erros) console.log("   " + e);
    falhas += erros.length;
  } else {
    console.log("\n✓ nenhum erro de página ou console");
  }

  await browser.close();

  const { data: fresh } = await db.from("orders").select("status,paid_at").eq("id", order.id).single();
  console.log(`\n7) pedido no banco: status="${fresh.status}" paid_at=${fresh.paid_at ? "preenchido ✓" : "VAZIO ✗"}`);
  if (!fresh.paid_at || fresh.status === "awaiting_payment") falhas++;

  await db.from("jobs").delete().eq("order_id", order.id);
  await db.from("payments").delete().eq("order_id", order.id);
  await db.from("orders").delete().eq("id", order.id);
  console.log("\n(dados de teste removidos)");

  if (falhas) {
    console.log(`\n✗✗✗ ${falhas} FALHA(S) ✗✗✗`);
    process.exit(1);
  }
  console.log("\n✓✓✓ TELA DE PAGAMENTO STRIPE FUNCIONANDO NO NAVEGADOR, SEM ERROS ✓✓✓");
  process.exit(0);
})().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
