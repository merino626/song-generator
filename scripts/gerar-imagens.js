/**
 * Gera as imagens da landing pelo crun.ai e salva em `public/img/`.
 *
 * São imagens ILUSTRATIVAS de clima, não fotos de cliente — a página não
 * afirma em lugar nenhum que são pessoas reais que compraram, e não pode
 * passar a afirmar. Depoimento e reação de verdade entram quando existirem.
 *
 * Preços medidos na conta (ver docs/estudo-midias-crun.md):
 *   google/nano-banana-pro  8 créditos  R$ 0,22  — usado no herói
 *   google/nano-banana-2    5 créditos  R$ 0,14  — usado nas capas
 *
 *   node scripts/gerar-imagens.js [--so-capas|--so-heroi]
 */
const fs = require("fs");
const path = require("path");

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const KEY = process.env.CRUN_API_KEY;
const BASE = process.env.CRUN_BASE_URL || "https://api.crun.ai";
const DEST = path.join("public", "img");

/** Descrição comum: evita imagem genérica de banco de imagens americano. */
const BASE_LOOK =
  "fotografia editorial brasileira, luz natural quente de fim de tarde, cores suaves, " +
  "grão sutil de filme, foco no sentimento e não na pose, pessoas brasileiras reais e diversas, " +
  "sem texto, sem marca d'água, sem logotipo";

const HEROI = [
  ["casal", "casal jovem brasileiro dividindo um fone de ouvido, olhos fechados, sorrindo emocionados, sala de casa simples"],
  ["aniversario", "mulher brasileira de meia idade se emocionando ao ouvir algo no celular durante uma festa de aniversário com bolo ao fundo"],
  ["familia", "mãe brasileira e filha adulta abraçadas ouvindo música juntas na cozinha, xícaras de café na mesa"],
  ["amigos", "grupo de amigos brasileiros rindo alto em volta de uma mesa de churrasco, celular tocando música no centro"],
  ["surpresa", "homem brasileiro segurando o celular com as mãos no rosto, surpreso e emocionado, luz suave de janela"],
];

const CAPAS = [
  ["capa-sertanejo", "capa de single de sertanejo romântico brasileiro, estrada de terra ao pôr do sol, tons de âmbar e vinho, ilustração cinematográfica, sem texto"],
  ["capa-romantico", "capa de single romântico brasileiro, duas silhuetas de mãos dadas sob luz quente, tons rosados e dourados, ilustração delicada, sem texto"],
  ["capa-festa", "capa de single de música de celebração brasileira, confete e luzes de festa desfocadas, cores vibrantes e alegres, ilustração, sem texto"],
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function gerar(modelo, prompt, aspect) {
  const criar = await fetch(`${BASE}/api/v1/client/job/CreateTask`, {
    method: "POST",
    headers: { "x-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ model: modelo, callback_url: "", input: { prompt, aspect_ratio: aspect } }),
  });
  const criado = await criar.json();
  const taskId = criado?.data?.task_id;
  if (!taskId) throw new Error(`não criou tarefa: ${JSON.stringify(criado).slice(0, 200)}`);
  // Registrado em arquivo: se o download falhar, a imagem já está paga e dá
  // para buscá-la depois pelo TaskInfo em vez de gerar (e pagar) de novo.
  fs.appendFileSync(path.join(DEST, "_tasks.log"), `${new Date().toISOString()} ${taskId} ${prompt.slice(0, 60)}\n`);

  // Imagem costuma sair em 10–30s; damos até 3 min antes de desistir.
  for (let i = 0; i < 60; i++) {
    await dormir(3000);
    const r = await fetch(`${BASE}/api/v1/client/job/TaskInfo?task_id=${taskId}`, { headers: { "x-api-key": KEY } });
    const j = await r.json();
    const st = j?.data?.status;
    if (st === "success") {
      const res = j.data.result;
      // O crun devolve `media_urls` (array). Os outros nomes ficam como rede
      // caso a resposta mude — errar aqui custa a geração inteira: a imagem
      // já foi paga e o task_id se perde se não for registrado.
      const url =
        res?.media_urls?.[0] || res?.image_url || res?.images?.[0]?.url || res?.images?.[0] || res?.url;
      if (!url) throw new Error(`sucesso sem URL (task ${taskId}): ${JSON.stringify(res).slice(0, 250)}`);
      return url;
    }
    if (st === "failed" || st === "error") throw new Error(j?.data?.result?.message || "geração falhou");
  }
  throw new Error("timeout esperando a imagem");
}

async function baixar(url, destino) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download HTTP ${r.status}`);
  fs.writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return fs.statSync(destino).size;
}

const saldo = async () => {
  const r = await fetch(`${BASE}/api/v1/client/account/balance`, { headers: { "x-api-key": KEY } });
  return (await r.json())?.data?.balance;
};

(async () => {
  fs.mkdirSync(DEST, { recursive: true });
  const arg = process.argv[2];
  const lista = [
    ...(arg === "--so-capas" ? [] : HEROI.map(([n, p]) => ["google/nano-banana-pro", `${n}.jpg`, p, "4:5"])),
    ...(arg === "--so-heroi" ? [] : CAPAS.map(([n, p]) => ["google/nano-banana-2", `${n}.jpg`, p, "1:1"])),
  ];

  const antes = await saldo();
  console.log(`saldo antes: ${antes} créditos · vou gerar ${lista.length} imagens\n`);

  let ok = 0;
  for (const [modelo, arquivo, prompt, aspect] of lista) {
    const destino = path.join(DEST, arquivo);
    process.stdout.write(`  ${arquivo.padEnd(20)} `);
    try {
      const url = await gerar(modelo, `${prompt}. ${BASE_LOOK}`, aspect);
      const bytes = await baixar(url, destino);
      console.log(`✓ ${(bytes / 1024).toFixed(0)} KB`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 90)}`);
    }
  }

  const depois = await saldo();
  const gasto = antes - depois;
  console.log(`\n${ok}/${lista.length} geradas · gastou ${gasto.toFixed(1)} créditos (R$ ${(gasto * 0.005 * 5.4).toFixed(2)})`);
  console.log(`saldo agora: ${depois}`);
})();
