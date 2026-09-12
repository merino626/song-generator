import { supabaseAdmin } from "./supabase";

/**
 * Blindagem do endpoint gratuito de letra.
 *
 * Sem isso, qualquer um roda um script e nos custa dinheiro (foi exatamente o
 * buraco que encontramos no concorrente). Camadas, do mais fácil de furar ao
 * mais difícil:
 *
 *   1. IP           — limite FROUXO de propósito. Por CGNAT, um prédio ou uma
 *                     operadora móvel inteira compartilha o mesmo IP; apertar
 *                     aqui bloqueia cliente de verdade. Serve só contra o
 *                     script ingênuo que dispara de uma máquina só.
 *   2. dispositivo  — cookie assinado que sobrevive à navegação normal.
 *   3. fingerprint  — hash do aparelho; pega quem limpa cookie.
 *   4. e-mail       — pega quem troca de IP e de navegador.
 *   5. teto global  — disjuntor opcional, HOJE DESLIGADO (ver `globalPerDay`).
 *                     Só faz sentido quando gerar custar dinheiro de verdade.
 *
 * Nada disso segura um atacante determinado (proxy residencial + aba anônima
 * derruba 1–3); as camadas do meio existem para encarecer o abuso casual. Com
 * o teto desligado, quem de fato segura script é o Turnstile na frente — sem
 * `TURNSTILE_SECRET_KEY` configurada, este endpoint fica aberto.
 */

export const LIMITS = {
  // O IP precisa ficar bem acima do limite por pessoa: com CGNAT, um prédio
  // ou uma operadora móvel inteira sai pelo mesmo IP. Se ele empatar com o
  // limite individual, o primeiro cliente a mexer bastante na letra derruba
  // todos os vizinhos.
  perIpPerHour: Number(process.env.LIMIT_IP_HOUR ?? 25),
  /**
   * ATENÇÃO À UNIDADE: estes números contam PEDIDOS, e cada pedido escreve
   * DUAS versões da letra. O alvo combinado é "no máximo 10 letras por
   * pessoa" — por isso 5 aqui, e não 10.
   *
   * Se um dia o gerador passar a devolver 1 versão por pedido, este número
   * precisa dobrar para manter a mesma promessa ao cliente.
   */
  perDevicePerHour: Number(process.env.LIMIT_DEVICE_HOUR ?? 5),
  perDevicePerDay: Number(process.env.LIMIT_DEVICE_DAY ?? 8),
  perEmailPerDay: Number(process.env.LIMIT_EMAIL_DAY ?? 5),
  /**
   * Teto global do dia — DESLIGADO por padrão (0 = sem teto).
   *
   * Enquanto a letra é gerada localmente (`lib/lyrics.ts` é mock), gerar não
   * custa nada, então o teto não protegia dinheiro nenhum — só criava o risco
   * de derrubar a loja justamente no melhor dia, quando a procura passasse do
   * número. Um disjuntor que desarma no sucesso é pior que não ter disjuntor.
   *
   * LIGUE de novo (`LIMIT_GLOBAL_DAY=<n>`) quando a letra passar a sair de um
   * LLM pago: aí cada geração vira custo real e um script solto queima caixa.
   * Escolha o número pelo gasto máximo aceitável por dia, não pela demanda
   * esperada — ele existe para limitar prejuízo, não para racionar venda.
   */
  globalPerDay: Number(process.env.LIMIT_GLOBAL_DAY ?? 0),
};

/**
 * E-mails que passam sem limite — os seus, para testar sem esbarrar no teto de
 * 5/hora por dispositivo a cada ajuste.
 *
 * Fica em variável de ambiente (`LIMIT_ALLOWLIST_EMAILS`, separados por
 * vírgula) e não no código de propósito: e-mail pessoal não entra em arquivo
 * versionado, e em produção dá para esvaziar a lista sem alterar código.
 */
const ALLOWLIST = new Set(
  (process.env.LIMIT_ALLOWLIST_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isAllowlisted(email?: string): boolean {
  return !!email && ALLOWLIST.has(email.trim().toLowerCase());
}

export type LimitVerdict = { ok: true } | { ok: false; reason: string; retryAfterS: number };

const HOUR = 3_600_000;
const DAY = 86_400_000;

function windowStart(ms: number): string {
  return new Date(Math.floor(Date.now() / ms) * ms).toISOString();
}

async function bump(key: string, window: string): Promise<number> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("bump_rate_limit", { p_key: key, p_window: window });
  if (error) throw new Error(`rate limit indisponível: ${error.message}`);
  return data as number;
}

/** IP real atrás do proxy da Vercel/Cloudflare. */
export function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "desconhecido"
  );
}

/** Id de dispositivo vindo do cookie (setado na resposta da 1ª visita). */
export function deviceIdFrom(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") || "";
  return cookie.match(/(?:^|;\s*)vc_did=([A-Za-z0-9_-]+)/)?.[1];
}

export function newDeviceId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function checkGenerationLimits(
  request: Request,
  opts: { email?: string; fingerprint?: string; deviceId?: string } = {},
): Promise<LimitVerdict> {
  const tooMany = (reason: string, retryAfterS: number): LimitVerdict => ({ ok: false, reason, retryAfterS });

  // Allowlist antes de tudo: nem conta, nem consome teto. Assim testar à
  // vontade não trava o dispositivo nem gasta o orçamento do dia.
  if (isAllowlisted(opts.email)) return { ok: true };

  // 5. disjuntor global — só quando configurado. Sem o `> 0` aqui, um teto
  // igual a 0 significaria "nenhuma geração permitida" e derrubaria o site
  // inteiro, em vez de simplesmente não ter teto.
  if (LIMITS.globalPerDay > 0) {
    if ((await bump("global", windowStart(DAY))) > LIMITS.globalPerDay) {
      return tooMany("Estamos com muita procura agora. Tente novamente em alguns minutos.", 900);
    }
  }

  // 1. IP (frouxo)
  if ((await bump(`ip:${clientIp(request)}`, windowStart(HOUR))) > LIMITS.perIpPerHour) {
    return tooMany("Muitas criações vindas da sua rede agora. Tente de novo em alguns minutos.", 600);
  }

  // 2 e 3. dispositivo e fingerprint — o limite que de fato vale por pessoa
  for (const id of [opts.deviceId && `dev:${opts.deviceId}`, opts.fingerprint && `fp:${opts.fingerprint}`]) {
    if (!id) continue;
    if ((await bump(id, windowStart(HOUR))) > LIMITS.perDevicePerHour) {
      return tooMany("Você já criou várias letras seguidas. Aguarde alguns minutos para gerar outra.", 600);
    }
    if ((await bump(id, windowStart(DAY))) > LIMITS.perDevicePerDay) {
      return tooMany("Limite de letras por hoje atingido. Volte amanhã ou fale com a gente.", 3600);
    }
  }

  // 4. e-mail
  if (opts.email && (await bump(`email:${opts.email.toLowerCase()}`, windowStart(DAY))) > LIMITS.perEmailPerDay) {
    return tooMany("Limite diário de letras atingido para este e-mail. Fale com a gente se precisar de mais.", 3600);
  }

  return { ok: true };
}
