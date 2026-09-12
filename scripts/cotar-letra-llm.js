/**
 * Cotação REAL do custo de gerar a letra por LLM.
 *
 * Não estima por tabela: gera uma letra de verdade em cada modelo e mede
 * quantos créditos do crun.ai foram debitados (saldo antes − saldo depois).
 * Também imprime um trecho da letra, porque preço só importa junto com
 * qualidade — o modelo mais barato que escreve mal não serve.
 *
 *   node scripts/cotar-letra-llm.js
 */
const fs = require("fs");
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const KEY = process.env.CRUN_API_KEY;
const BASE = process.env.CRUN_BASE_URL || "https://api.crun.ai";

const USD_POR_CREDITO = 0.005; // tabela de recarga: $5 -> 200 créditos
const BRL_POR_USD = 5.4;

// Os candidatos baratos do catálogo do crun. Modelo grande não entra: escrever
// 8 versos de música não é a tarefa que justifica pagar por raciocínio pesado.
const MODELOS = [
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
  "claude-haiku-4-5",
  "claude-haiku-4-5-lite",
  "gpt-4o-mini",
  // Os GPT-5 são modelos de RACIOCÍNIO: gastam centenas de tokens pensando
  // antes de escrever, e você paga por eles. Numa tarefa criativa curta como
  // letra de música isso é custo sem retorno — entram aqui só para comparar.
  "gpt-5-nano",
  "gpt-5-mini",
];

const SISTEMA = `Você é compositor brasileiro. Escreve letras de música personalizadas, em português do Brasil, emocionantes e específicas — nunca genéricas.
Regras:
- Use os detalhes concretos da história. Se a pessoa citou um lugar, uma data, uma mania, ISSO precisa aparecer na letra.
- Estrutura: [Verso 1], [Pré-refrão], [Refrão], [Verso 2], [Ponte], [Refrão final].
- Nada de clichê vazio ("você é meu tudo", "meu porto seguro").
- Concordância de gênero correta para quem recebe e quem envia.
Responda APENAS com a letra, sem comentários.`;

const PEDIDO = `Ocasião: pedido de namoro
Para: Ana (mulher)
De: José (homem)
Estilo: sertanejo romântico
História: A gente se conheceu numa fila de padaria em Santo André, em 2023. Ela riu porque eu pedi pão de queijo com sotaque errado — sou mineiro. Desde então, todo sábado de manhã a gente volta lá. Quero pedir ela em namoro no mesmo lugar, na mesma fila.`;

const saldo = async () => {
  const r = await fetch(`${BASE}/api/v1/client/account/balance`, { headers: { "x-api-key": KEY } });
  return (await r.json())?.data?.balance;
};

const gerar = async (model) => {
  const r = await fetch(`${BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SISTEMA },
        { role: "user", content: PEDIDO },
      ],
      // Folgado de propósito: nos modelos de raciocínio o "pensamento" sai
      // deste mesmo orçamento, e com um teto curto eles gastam tudo pensando
      // e devolvem a letra VAZIA (foi o que aconteceu com 900).
      max_tokens: 3000,
    }),
  });
  const j = await r.json().catch(() => ({}));
  return { http: r.status, texto: j?.choices?.[0]?.message?.content, uso: j?.usage, erro: j?.error?.message || j?.message };
};

(async () => {
  console.log("Cotação real — gerando a MESMA letra em cada modelo e medindo o débito.\n");
  console.log(`(1 crédito = US$ ${USD_POR_CREDITO} · US$ 1 = R$ ${BRL_POR_USD})\n`);

  const linhas = [];
  for (const model of MODELOS) {
    const antes = await saldo();
    const t0 = Date.now();
    const res = await gerar(model);
    const seg = ((Date.now() - t0) / 1000).toFixed(1);
    await new Promise((r) => setTimeout(r, 1500)); // deixa o débito assentar
    const depois = await saldo();
    const creditos = antes - depois;

    if (res.http !== 200 || !res.texto) {
      console.log(`✗ ${model.padEnd(32)} HTTP ${res.http} — ${String(res.erro).slice(0, 80)}`);
      continue;
    }

    const usd = creditos * USD_POR_CREDITO;
    linhas.push({ model, creditos, usd, brl: usd * BRL_POR_USD, seg, uso: res.uso, texto: res.texto });

    const raciocinio = res.uso?.completion_tokens_details?.reasoning_tokens ?? 0;
    console.log(`✓ ${model.padEnd(26)} ${creditos.toFixed(2).padStart(6)} créd · US$ ${usd.toFixed(4)} · R$ ${(usd * BRL_POR_USD).toFixed(4)} · ${seg}s`);
    if (res.uso) {
      console.log(
        `   tokens: ${res.uso.prompt_tokens} entrada + ${res.uso.completion_tokens} saída` +
          (raciocinio ? `  (${raciocinio} deles só "pensando", pagos e jogados fora)` : ""),
      );
    }
  }

  console.log("\n\n=== CUSTO POR CENÁRIO (só a letra) ===\n");
  console.log("modelo                            1 letra      20/dia (1 pessoa)   20×100 pessoas/dia");
  console.log("-".repeat(88));
  for (const l of linhas) {
    console.log(
      `${l.model.padEnd(32)} R$ ${l.brl.toFixed(4).padStart(8)}   R$ ${(l.brl * 20).toFixed(2).padStart(8)}          R$ ${(l.brl * 20 * 100).toFixed(2).padStart(9)}`,
    );
  }
  console.log("-".repeat(88));
  console.log(`${"SUNO (música inteira)".padEnd(32)} R$ ${(12 * USD_POR_CREDITO * BRL_POR_USD).toFixed(4).padStart(8)}   R$ ${(12 * USD_POR_CREDITO * BRL_POR_USD * 20).toFixed(2).padStart(8)}          R$ ${(12 * USD_POR_CREDITO * BRL_POR_USD * 20 * 100).toFixed(2).padStart(9)}`);

  console.log("\n\n=== QUALIDADE (mesma história em todos) ===");
  for (const l of linhas) {
    console.log(`\n--- ${l.model} ---`);
    console.log(l.texto.split("\n").slice(0, 12).join("\n"));
  }
})();
