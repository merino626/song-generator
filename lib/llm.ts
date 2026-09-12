/**
 * Cliente de LLM (crun.ai, endpoint compatível com OpenAI).
 *
 * Mesmo estilo de `lib/music/crun.ts`: fetch puro, sem SDK. A chave e o saldo
 * são os mesmos já usados para gerar música — uma conta só.
 *
 * Modelo escolhido: `claude-haiku-4-5`. Medido em `scripts/cotar-letra-llm.js`:
 * R$ 0,011 por letra, ~5s, e sem gastar tokens com "raciocínio" (os modelos de
 * raciocínio queimam 800–1.100 tokens pensando antes de escrever, o que numa
 * tarefa criativa curta é só custo e lentidão). Ver `docs/estudo-custo-letra-llm.md`.
 */

const BASE = process.env.CRUN_BASE_URL || "https://api.crun.ai";
const MODEL = process.env.LYRICS_MODEL || "claude-haiku-4-5";
const TIMEOUT_MS = Number(process.env.LYRICS_TIMEOUT_MS ?? 25_000);

export class LLMError extends Error {}

export function llmConfigured(): boolean {
  return Boolean(process.env.CRUN_API_KEY);
}

export async function chat(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const key = process.env.CRUN_API_KEY;
  if (!key) throw new LLMError("CRUN_API_KEY não configurada");

  // Sem timeout, um LLM lento segura a requisição do cliente até o limite da
  // Vercel e a pessoa fica olhando um botão travado. Melhor abortar e cair no
  // fallback.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      cache: "no-store",
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
        // Folgado de propósito: se um dia trocarmos por um modelo de
        // raciocínio, o "pensamento" sai deste mesmo orçamento — com teto
        // curto ele gasta tudo pensando e devolve conteúdo VAZIO com HTTP 200.
        max_tokens: params.maxTokens ?? 3000,
        temperature: params.temperature ?? 0.9,
      }),
    });
  } catch (e) {
    throw new LLMError(
      (e as Error).name === "AbortError" ? `LLM demorou mais de ${TIMEOUT_MS}ms` : `falha de rede: ${(e as Error).message}`,
    );
  } finally {
    clearTimeout(t);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new LLMError(`LLM HTTP ${res.status}: ${body?.error?.message || body?.message || "sem detalhe"}`);
  }

  const texto = body?.choices?.[0]?.message?.content;
  // Conteúdo vazio com HTTP 200 é um modo de falha REAL desta API (visto no
  // gpt-5-nano, que gastou o orçamento inteiro pensando). Tratar como erro,
  // senão entregaríamos letra em branco achando que deu certo.
  if (!texto || !texto.trim()) throw new LLMError("LLM devolveu conteúdo vazio");

  return texto;
}
