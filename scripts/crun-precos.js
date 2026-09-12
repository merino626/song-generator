/**
 * Consulta o preço REAL (em créditos) de cada modelo do crun.ai para a nossa conta.
 * Usa /api/v1/client/job/estimate-credits — não cria tarefa, não gasta nada.
 *   node scripts/crun-precos.js
 */
const fs = require("fs");
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const KEY = process.env.CRUN_API_KEY;
const BASE = process.env.CRUN_BASE_URL || "https://api.crun.ai";

const PROMPT = "casal brasileiro emocionado ouvindo uma musica juntos, luz quente, cinematografico";

const CASOS = [
  // ---- imagens (posts, criativos estáticos, capas) ----
  ["IMAGEM", "google/nano-banana-2-v2", { prompt: PROMPT, aspect_ratio: "9:16" }],
  ["IMAGEM", "google/nano-banana-2", { prompt: PROMPT, aspect_ratio: "9:16" }],
  ["IMAGEM", "google/nano-banana-pro-v2", { prompt: PROMPT, aspect_ratio: "9:16" }],
  ["IMAGEM", "google/nano-banana-pro", { prompt: PROMPT, aspect_ratio: "9:16" }],
  ["IMAGEM", "google/image-4", { prompt: PROMPT, aspect_ratio: "9:16" }],
  ["IMAGEM", "openai/gpt-image-1-5", { prompt: PROMPT }],

  // ---- vídeo (reels, anúncios) ----
  ["VIDEO 4s", "google/veo3-1-lite-t2v", { prompt: PROMPT, duration: 4, aspect_ratio: "9:16" }],
  ["VIDEO 6s", "google/veo3-1-lite-t2v", { prompt: PROMPT, duration: 6, aspect_ratio: "9:16" }],
  ["VIDEO 4s", "google/veo3-1-fast-t2v", { prompt: PROMPT, duration: 4, aspect_ratio: "9:16" }],
  ["VIDEO 6s", "google/veo3-1-fast-t2v", { prompt: PROMPT, duration: 6, aspect_ratio: "9:16" }],
  ["VIDEO 6s", "google/veo3-1-t2v", { prompt: PROMPT, duration: 6, aspect_ratio: "9:16" }],
  ["VIDEO", "kling/v2-5-turbo-pro", { prompt: PROMPT, duration: 5 }],
  ["VIDEO", "minimax/hailuo-2-3", { prompt: PROMPT, duration: 6 }],
  ["VIDEO", "grok-imagine/t2v", { prompt: PROMPT }],

  // ---- referência: o que já usamos ----
  ["MUSICA", "suno/music-generate", { mode: "simple", model: "v5.5", prompt: PROMPT, instrumental: false }],
];

(async () => {
  const saldo = await fetch(`${BASE}/api/v1/client/job/estimate-credits`, { method: "POST" }).catch(() => null);
  void saldo;

  console.log("categoria   modelo                          créditos");
  console.log("-".repeat(62));
  const out = [];
  for (const [cat, model, input] of CASOS) {
    try {
      const r = await fetch(`${BASE}/api/v1/client/job/estimate-credits`, {
        method: "POST",
        headers: { "x-api-key": KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ model, input }),
      });
      const j = await r.json();
      const c = j?.data?.credits;
      const est = j?.data?.estimated ? "~" : "";
      const val = c != null ? `${est}${c}` : `erro: ${(j?.message || "").slice(0, 40)}`;
      console.log(`${cat.padEnd(11)} ${model.padEnd(31)} ${val}`);
      if (c != null) out.push({ cat, model, credits: c });
    } catch (e) {
      console.log(`${cat.padEnd(11)} ${model.padEnd(31)} falhou: ${e.message.slice(0, 30)}`);
    }
  }
  fs.writeFileSync("docs/crun-precos.json", JSON.stringify(out, null, 2));
  console.log("\nsalvo em docs/crun-precos.json");
  process.exit(0);
})();
