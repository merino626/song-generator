/**
 * Gera as músicas de exemplo da home — versão 2, mais caprichada.
 *
 * Diferenças da v1:
 *  - histórias reescritas com mais detalhe concreto e mais "gancho" emocional
 *    (a v1 tinha histórias corretas mas genéricas — pouco material pro LLM
 *    trabalhar sobra em clichê).
 *  - pega as DUAS versões de letra que o endpoint já gera e escolhe a melhor
 *    na mão, em vez de usar sempre a primeira.
 *  - tags de áudio pedem produção mais rica (evita som de demo/maquete).
 *  - salva a letra inteira em _demos.json, pra dar pra revisar sem re-gerar.
 *
 * Precisa do servidor rodando com NEXT_PUBLIC_TURNSTILE_TEST=1.
 *   node scripts/gerar-demos.js [http://localhost:3100]
 */
const fs = require("fs");
const path = require("path");

for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const BASE = process.argv[2] || "http://localhost:3100";
const KEY = process.env.CRUN_API_KEY;
const CRUN = process.env.CRUN_BASE_URL || "https://api.crun.ai";
const DEST = path.join("public", "samples");

const DEMOS = [
  {
    arquivo: "demo-sertanejo",
    occasion: "declaracao",
    styleId: "sertanejo-romantico",
    vocal: "masculino",
    recipientName: "Marina",
    recipientGender: "f",
    senderName: "Rafael",
    story:
      "Nos conhecemos numa parada de ônibus em Uberlândia, no maior temporal, dividindo o mesmo guarda-chuva furado. Ela reclamou do meu carro velho o caminho todo até em casa dela, e no fim me deu o número escrito com batom na palma da mão porque tinha esquecido o celular. Hoje faz seis anos e três filhos de gato depois, e todo dia de chuva forte ela me manda foto do céu escuro dizendo 'lembrei de você'. Vou pedir ela em casamento no mesmo ponto de ônibus, no mesmo horário, com o mesmo guarda-chuva furado guardado até hoje.",
  },
  {
    arquivo: "demo-forro",
    occasion: "aniversario",
    styleId: "forro",
    vocal: "feminino",
    recipientName: "Dona Zefinha",
    recipientGender: "f",
    senderName: "os netos",
    story:
      "Vovó Zefinha completa 80 anos vendendo tapioca na mesma barraca da feira de Caruaru há 52 anos, a mesma barraca de zinco pintada de azul que o marido dela construiu antes de morrer. Ela nunca perdeu um São João na vida, dança xote melhor que qualquer neta, e cria os 14 netos com o dinheiro da tapioca desde que a filha mais velha ficou viúva cedo. Todo domingo a casa dela enche de gente e comida e ela finge que reclama do barulho mas fica no batente da porta sorrindo o tempo todo. A receita da tapioca com coco ninguém consegue copiar igual.",
  },
  {
    arquivo: "demo-zoacao",
    occasion: "zoacao",
    styleId: "rap-roast",
    vocal: "masculino",
    recipientName: "Diego",
    recipientGender: "m",
    senderName: "a turma do futebol",
    story:
      "O Diego se autoproclamou goleiro titular do racha de quinta-feira há 4 anos, mesmo levando em média 6 gols por partida porque ele pula pro lado errado sempre. Jura de pé junto que fez teste pro Corinthians em 2009 e que só não foi aprovado porque 'o técnico tinha implicância pessoal'. Nunca traz a camisa do time combinada, esquece a carteira toda vez que é dia de pagar o campo, e uma vez caiu duas vezes na mesma poça de lama tentando fazer uma defesa que nem existia perigo. Mas é o primeiro a aparecer de madrugada quando alguém da turma quebra o carro na estrada, sem pensar duas vezes.",
  },
];

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function letrasDuasVersoes(d) {
  const r = await fetch(`${BASE}/api/generate-lyrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...d, email: "demos@viracancao.local", turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }),
  });
  if (!r.ok) throw new Error(`letra HTTP ${r.status}: ${(await r.text()).slice(0, 150)}`);

  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const versoes = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const linhas = buf.split("\n");
    buf = linhas.pop();
    for (const l of linhas) {
      if (!l.trim()) continue;
      const e = JSON.parse(l);
      if (e.tipo === "variante") versoes[e.indice] = e.variante;
    }
  }
  return versoes.filter(Boolean);
}

/**
 * Escolhe a melhor entre as versões — heurística simples: penaliza clichês
 * conhecidos e recompensa presença de detalhes concretos da própria história
 * (nome do lugar, número, objeto citado). Não substitui ouvido humano, mas
 * evita pegar de propósito a pior das duas.
 */
function pontuar(variante, story) {
  const texto = variante.lyrics.toLowerCase();
  let pontos = variante.lyrics.length > 200 ? 5 : 0;
  const cliches = ["meu porto seguro", "minha metade", "você é meu tudo", "brilha como uma estrela"];
  for (const c of cliches) if (texto.includes(c)) pontos -= 10;
  const palavrasDaHistoria = story
    .toLowerCase()
    .replace(/[.,!?]/g, "")
    .split(/\s+/)
    .filter((p) => p.length > 5);
  const unicas = new Set(palavrasDaHistoria);
  for (const p of unicas) if (texto.includes(p)) pontos += 1;
  return pontos;
}

async function musica(d, v) {
  const style = JSON.parse(fs.readFileSync("scripts/.styles-cache.json", "utf8"))[d.styleId];
  const vocalTag = d.vocal === "feminino" ? "voz feminina" : "voz masculina";
  // Tags extras pedindo produção rica — sem isso o motor às vezes entrega som
  // fino/maquete em vez de arranjo cheio, o que faz a demo soar menos "profissional".
  const tags = [style, vocalTag, "português do Brasil", "produção rica, mixagem profissional, arranjo cheio, alta fidelidade"].join(", ");

  const criar = await fetch(`${CRUN}/api/v1/client/job/CreateTask`, {
    method: "POST",
    headers: { "x-api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "suno/music-generate",
      callback_url: "",
      input: {
        mode: "custom",
        model: process.env.CRUN_MUSIC_VERSION || "v5.5",
        instrumental: false,
        title: v.title,
        tags,
        lyrics: v.lyrics,
        vocal_gender: d.vocal === "feminino" ? "f" : "m",
      },
    }),
  });
  const taskId = (await criar.json())?.data?.task_id;
  if (!taskId) throw new Error("não criou a tarefa de música");
  fs.appendFileSync(path.join(DEST, "_tasks.log"), `${new Date().toISOString()} ${taskId} ${d.arquivo}\n`);

  for (let i = 0; i < 80; i++) {
    await dormir(5000);
    const r = await fetch(`${CRUN}/api/v1/client/job/TaskInfo?task_id=${taskId}`, { headers: { "x-api-key": KEY } });
    const j = await r.json();
    if (j?.data?.status === "success") return j.data.result.suno_data;
    if (["failed", "error"].includes(j?.data?.status)) throw new Error(j?.data?.result?.message || "falhou");
  }
  throw new Error("timeout da música");
}

(async () => {
  fs.mkdirSync(DEST, { recursive: true });
  const resumo = [];

  for (const d of DEMOS) {
    console.log(`\n=== ${d.arquivo} (${d.styleId}) ===`);
    const versoes = await letrasDuasVersoes(d);
    if (!versoes.length) throw new Error("nenhuma versão veio");

    const pontuadas = versoes.map((v) => ({ v, pontos: pontuar(v, d.story) }));
    pontuadas.sort((a, b) => b.pontos - a.pontos);
    const escolhida = pontuadas[0].v;
    console.log(`  ${versoes.length} versão(ões) geradas, escolhida: "${escolhida.title}" (pontos: ${pontuadas.map((p) => p.pontos).join(" vs ")})`);
    console.log("  --- letra completa ---");
    console.log(
      escolhida.lyrics
        .split("\n")
        .map((l) => "  " + l)
        .join("\n"),
    );

    const faixas = await musica(d, escolhida);
    const url = faixas?.[0]?.suno_audio_url;
    if (!url) throw new Error("música sem áudio");

    const res = await fetch(url);
    const destino = path.join(DEST, `${d.arquivo}.mp3`);
    fs.writeFileSync(destino, Buffer.from(await res.arrayBuffer()));
    console.log(`  ✓ ${(fs.statSync(destino).size / 1024 / 1024).toFixed(1)} MB · ${d.arquivo}.mp3`);

    resumo.push({ arquivo: `${d.arquivo}.mp3`, titulo: escolhida.title, letra: escolhida.lyrics, estilo: d.styleId, para: d.recipientName });
  }

  fs.writeFileSync(path.join(DEST, "_demos.json"), JSON.stringify(resumo, null, 2));
  console.log("\nresumo salvo em public/samples/_demos.json");
})();
