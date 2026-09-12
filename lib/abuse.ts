import { createHash } from "crypto";
import { supabaseAdmin } from "./supabase";

/**
 * Inteligência de abuso.
 *
 * O rate limit conta e barra, mas não explica. Aqui a gente registra cada
 * geração e transforma o histórico em um score, para o painel mostrar QUEM
 * está abusando e por quê — e para você decidir bloquear ou liberar.
 *
 * O score é heurístico de propósito: ele ORDENA a suspeita para revisão
 * humana, não condena sozinho. Bloqueio automático só nos casos gritantes.
 */

export type Identity = { ip?: string; deviceId?: string; fingerprint?: string; email?: string };

export function storyHash(story: string): string {
  // normaliza para pegar repetição com pequenas variações
  const normal = story.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normal).digest("hex").slice(0, 16);
}

/** Domínios de e-mail descartável — sinal forte de quem não pretende comprar. */
const DESCARTAVEIS = [
  "mailinator.com", "tempmail", "10minutemail", "guerrillamail", "yopmail",
  "trashmail", "sharklasers", "getnada", "dispostable", "maildrop",
];

export function isDisposableEmail(email?: string): boolean {
  if (!email) return false;
  const domain = email.toLowerCase().split("@")[1] || "";
  return DESCARTAVEIS.some((d) => domain.includes(d));
}

/** Registra a tentativa (não lança: telemetria nunca pode derrubar a venda). */
export async function recordGeneration(params: {
  identity: Identity;
  userAgent?: string;
  occasion?: string;
  story?: string;
  blocked?: boolean;
}) {
  try {
    await supabaseAdmin().from("generation_events").insert({
      ip: params.identity.ip,
      device_id: params.identity.deviceId,
      fingerprint: params.identity.fingerprint,
      email: params.identity.email?.toLowerCase(),
      user_agent: params.userAgent?.slice(0, 300),
      occasion: params.occasion,
      story_hash: params.story ? storyHash(params.story) : null,
      story_len: params.story?.length ?? null,
      blocked: params.blocked ?? false,
    });
  } catch (e) {
    console.error("[abuse] falha ao registrar evento:", (e as Error).message);
  }
}

/** Alguma das identidades está bloqueada? */
export async function isBlocked(identity: Identity): Promise<{ blocked: boolean; reason?: string }> {
  const pares = [
    ["ip", identity.ip],
    ["device", identity.deviceId],
    ["fingerprint", identity.fingerprint],
    ["email", identity.email?.toLowerCase()],
  ].filter(([, v]) => v) as [string, string][];
  if (!pares.length) return { blocked: false };

  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("blocks")
      .select("kind,value,reason,expires_at")
      .eq("active", true)
      .in("value", pares.map(([, v]) => v));

    const agora = Date.now();
    const hit = (data ?? []).find(
      (b) =>
        pares.some(([k, v]) => b.kind === k && b.value === v) &&
        (!b.expires_at || new Date(b.expires_at).getTime() > agora),
    );
    return hit ? { blocked: true, reason: hit.reason ?? "bloqueado" } : { blocked: false };
  } catch (e) {
    // Não dá pra checar? Deixa passar — o rate limit e o teto global seguram.
    console.error("[abuse] falha ao checar bloqueio:", (e as Error).message);
    return { blocked: false };
  }
}

// ------------------------------------------------------------------ score

export type Suspect = {
  kind: string;
  value: string;
  events: number;
  blockedEvents: number;
  distinctIps: number;
  distinctEmails: number;
  distinctStories: number;
  conversions: number;
  firstSeen: string;
  lastSeen: string;
  score: number;
  flags: string[];
};

/**
 * Traduz os números em suspeita. Cada sinal aqui responde a um padrão real:
 *  - volume alto sem nenhuma compra é o perfil clássico de quem só quer letra grátis
 *  - história sempre idêntica indica script (gente escreve diferente a cada vez)
 *  - muitos IPs para o mesmo aparelho é rotação de proxy
 *  - muitos e-mails para o mesmo aparelho é tentativa de furar o limite por e-mail
 */
export function scoreSuspect(row: any): Suspect {
  const events = Number(row.events ?? 0);
  const blockedEvents = Number(row.blocked_events ?? 0);
  const distinctIps = Number(row.distinct_ips ?? 0);
  const distinctEmails = Number(row.distinct_emails ?? 0);
  const distinctStories = Number(row.distinct_stories ?? 0);
  const conversions = Number(row.conversions ?? 0);

  const flags: string[] = [];
  let score = 0;

  if (events >= 10) {
    score += Math.min(30, events);
    flags.push(`${events} gerações`);
  }
  if (events >= 8 && conversions === 0) {
    score += 25;
    flags.push("nenhuma compra");
  }
  if (blockedEvents >= 3) {
    score += 20;
    flags.push(`${blockedEvents} bloqueios no limite`);
  }
  // história repetida: poucas histórias distintas para muitas gerações
  if (events >= 5 && distinctStories <= Math.max(1, Math.floor(events / 4))) {
    score += 25;
    flags.push("história repetida (script)");
  }
  if (row.kind !== "ip" && distinctIps >= 4) {
    score += 20;
    flags.push(`${distinctIps} IPs diferentes`);
  }
  if (row.kind !== "email" && distinctEmails >= 4) {
    score += 15;
    flags.push(`${distinctEmails} e-mails diferentes`);
  }
  if (row.kind === "email" && isDisposableEmail(row.value)) {
    score += 20;
    flags.push("e-mail descartável");
  }
  // comprou: forte sinal de que é cliente de verdade
  if (conversions > 0) {
    score -= 40;
    flags.push(`${conversions} compra(s)`);
  }

  return {
    kind: row.kind,
    value: row.value,
    events,
    blockedEvents,
    distinctIps,
    distinctEmails,
    distinctStories,
    conversions,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    score: Math.max(0, score),
    flags,
  };
}

export async function getSuspects(hours = 24): Promise<Suspect[]> {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("abuse_report", { p_hours: hours });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(scoreSuspect)
    .filter((s: Suspect) => s.score > 0)
    .sort((a: Suspect, b: Suspect) => b.score - a.score);
}

export function riskLabel(score: number): { label: string; tone: "alto" | "medio" | "baixo" } {
  if (score >= 60) return { label: "Alto", tone: "alto" };
  if (score >= 30) return { label: "Médio", tone: "medio" };
  return { label: "Baixo", tone: "baixo" };
}
