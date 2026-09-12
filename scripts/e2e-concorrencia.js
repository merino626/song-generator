/**
 * Prova o fix da corrida: dispara DUAS requisições simultâneas para
 * /api/pedido/[token] enquanto o job ainda está "running" — reproduz
 * fielmente duas abas do cliente (ou dois polls se sobrepondo). Sem a
 * reivindicação atômica, isso gera 4 faixas (2 pares duplicados); com o fix,
 * sempre 2.
 *   node scripts/e2e-concorrencia.js [http://localhost:3100]
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
      recipient_name: "Concorrencia",
      sender_name: "Teste",
      story: "Teste da corrida.",
      style_id: "sertanejo-romantico",
      vocal: "feminino",
      customer_email: "concorrencia@teste.local",
      plan: "priority",
      amount_cents: 5990,
      title: "Teste Concorrencia",
      lyrics: "[Verso]\nteste da trava atomica",
      paid_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  console.log("1) pedido criado:", order.id);

  const startRes = await fetch(`${BASE}/api/production/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.ADMIN_SECRET}` },
    body: JSON.stringify({ orderId: order.id }),
  });
  console.log("2) robô disparado ->", startRes.status);

  // Espera o crun terminar DE VERDADE do lado dele (consultando a API deles
  // diretamente) enquanto nosso `jobs.status` continua "running" — é
  // exatamente a janela onde a corrida acontece: o provider já tem o
  // resultado, mas ninguém ainda "reivindicou" o job no nosso banco.
  console.log("3) aguardando o crun terminar (consultando a API deles direto)...");
  const { data: job } = await db.from("jobs").select("external_id").eq("order_id", order.id).eq("type", "vocal").single();
  for (let i = 1; i <= 40; i++) {
    await sleep(5000);
    const r = await fetch(`${process.env.CRUN_BASE_URL}/api/v1/client/job/TaskInfo?task_id=${job.external_id}`, {
      headers: { "x-api-key": process.env.CRUN_API_KEY },
    });
    const j = await r.json();
    console.log(`   [${i * 5}s] crun status=${j?.data?.status}`);
    if (j?.data?.status === "success") break;
  }

  console.log("4) disparando 5 GETs SIMULTÂNEOS em /api/pedido/[token] (Promise.all)");
  const respostas = await Promise.all(
    Array.from({ length: 5 }, () => fetch(`${BASE}/api/pedido/${order.public_token}`, { cache: "no-store" }).then((r) => r.json())),
  );
  respostas.forEach((r, i) => console.log(`   resposta ${i + 1}: estado="${r.estado}" faixas=${r.faixas?.length ?? "-"}`));

  const { data: media } = await db.from("media_assets").select("type,id").eq("order_id", order.id).eq("type", "song");
  console.log(`\nfaixas 'song' no banco: ${media?.length ?? 0}`);
  if (media?.length === 2) {
    console.log("✓ SEM DUPLICATA — a trava atômica segurou as 5 chamadas simultâneas.");
  } else {
    console.log(`✗ DUPLICOU — esperado 2, veio ${media?.length}.`);
  }

  await db.from("orders").delete().eq("id", order.id);
  console.log("(pedido de teste removido)");
  process.exit(media?.length === 2 ? 0 : 1);
})().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
