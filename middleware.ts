import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proteção do /admin.
 *
 * Defesa em três camadas:
 *  1. SEGREDO FORTE — 256 bits de entropia. É a defesa principal: adivinhar
 *     por tentativa é inviável mesmo sem nenhum limite de taxa.
 *  2. RATE LIMIT PERSISTENTE — poucas tentativas erradas por IP, contadas no
 *     banco (e não em memória), para o limite valer entre instâncias da Vercel
 *     e sobreviver a deploy. Só é consultado quando NÃO há cookie válido, então
 *     o uso normal do painel não paga essa ida ao banco.
 *  3. COMPARAÇÃO EM TEMPO CONSTANTE — evita descobrir o segredo medindo quanto
 *     tempo a resposta demora.
 *
 * Sem ADMIN_SECRET definido, o painel fica FECHADO (503). O padrão é negar,
 * para nunca subir um admin aberto por esquecimento.
 */
export const config = { matcher: ["/admin/:path*"] };

const MAX_TENTATIVAS = 5;
const JANELA_MIN = 15;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Compara sem vazar em quanto tempo as strings divergiram. */
function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function ipDe(request: NextRequest): string {
  const h = request.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0].trim() ||
    "desconhecido"
  );
}

/**
 * Conta a tentativa no Postgres (mesma função do anti-abuso do site).
 * Falha de rede não pode trancar o dono do lado de fora: se o banco não
 * responder, seguimos apenas com a checagem do segredo.
 */
async function contarTentativa(ip: string): Promise<number> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return 0;

  const janelaMs = JANELA_MIN * 60_000;
  const janela = new Date(Math.floor(Date.now() / janelaMs) * janelaMs).toISOString();

  try {
    const res = await fetch(`${url}/rest/v1/rpc/bump_rate_limit`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: `admin:${ip}`, p_window: janela }),
    });
    return res.ok ? Number(await res.json()) : 0;
  } catch {
    return 0;
  }
}

function negar(mensagem: string, status: number) {
  return new NextResponse(mensagem, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function middleware(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return negar("Painel indisponível: defina ADMIN_SECRET no servidor.", 503);

  const esperado = await sha256(secret);
  const url = request.nextUrl;

  // Caminho feliz: já autenticado. Sai antes de qualquer consulta.
  const cookie = request.cookies.get("vc_admin")?.value;
  if (cookie && equalsConstantTime(cookie, esperado)) return NextResponse.next();

  const ip = ipDe(request);
  const tentativas = await contarTentativa(ip);
  if (tentativas > MAX_TENTATIVAS) {
    return negar(`Muitas tentativas. Tente novamente em ${JANELA_MIN} minutos.`, 429);
  }

  const fornecido = url.searchParams.get("key");
  if (fornecido && equalsConstantTime(await sha256(fornecido), esperado)) {
    // Chave correta: vira cookie e some da URL (não fica no histórico/logs).
    const limpo = new URL(url);
    limpo.searchParams.delete("key");
    const res = NextResponse.redirect(limpo);
    res.cookies.set("vc_admin", esperado, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/admin",
      maxAge: 60 * 60 * 12,
    });
    return res;
  }

  const restantes = Math.max(0, MAX_TENTATIVAS - tentativas);
  return negar(
    `Acesso restrito.\n\nAbra a URL com ?key=SUA_CHAVE.\nTentativas restantes: ${restantes}`,
    401,
  );
}
