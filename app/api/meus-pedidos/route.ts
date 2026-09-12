import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { clientIp } from "@/lib/rate-limit";
import { isPaidOrBeyond } from "@/lib/order-status";
import { getOccasion } from "@/lib/occasions";

export const dynamic = "force-dynamic";

/**
 * Consulta de pedidos pelo e-mail.
 *
 * Decisão consciente: quem sabe o e-mail vê os pedidos daquele e-mail. É o
 * mesmo modelo do concorrente, escolhido por atrito zero — sem caixa de
 * entrada, sem login, sem esperar link chegar.
 *
 * O preço disso é que o e-mail vira a senha, e e-mail não é segredo. Duas
 * defesas para o buraco não ficar escancarado:
 *   1. LIMITE POR IP — sem isso, um script percorre uma lista de e-mails e
 *      colhe músicas alheias. É esta camada que impede a enumeração.
 *   2. só pedidos PAGOS — rascunho e carrinho abandonado não aparecem.
 *
 * O que NÃO fazemos: esconder que o e-mail existe. Não dá — a resposta útil é
 * justamente a lista. Por isso o limite acima é a proteção que importa.
 */

const LIMITE_POR_IP_HORA = Number(process.env.LIMIT_LOOKUP_IP_HOUR ?? 10);
const HOUR = 3_600_000;

/** Status interno -> o que o cliente lê. Ele nunca vê a cozinha da produção. */
const PARA_O_CLIENTE: Record<string, string> = {
  paid: "Em produção",
  producing_robot: "Em produção",
  manual_review: "Em produção",
  producing_manual: "Em produção",
  ready: "Pronta",
  delivered: "Pronta",
};

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 422 });
  }

  const db = supabaseAdmin();

  // Trava de enumeração. Conta por IP, não por e-mail: contar por e-mail
  // deixaria o atacante trocar de alvo à vontade, que é exatamente o ataque.
  try {
    const janela = new Date(Math.floor(Date.now() / HOUR) * HOUR).toISOString();
    const { data: usos } = await db.rpc("bump_rate_limit", {
      p_key: `lookup:${clientIp(request)}`,
      p_window: janela,
    });
    if (Number(usos) > LIMITE_POR_IP_HORA) {
      return NextResponse.json(
        { error: "Muitas consultas seguidas. Tente de novo em alguns minutos." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }
  } catch (e) {
    // Banco de limite fora do ar não pode derrubar a consulta de um cliente
    // legítimo — mas fica registrado.
    console.error("[meus-pedidos] rate limit indisponível:", (e as Error).message);
  }

  const { data: orders, error } = await db
    .from("orders")
    .select("public_token,status,title,recipient_name,occasion,plan,created_at,ready_at")
    .eq("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[meus-pedidos] falha ao consultar:", error.message);
    return NextResponse.json({ error: "Não foi possível consultar agora. Tente de novo." }, { status: 503 });
  }

  // Só o que já foi pago: rascunho e carrinho abandonado não são "pedido".
  const pedidos = (orders ?? [])
    .filter((o) => isPaidOrBeyond(o.status))
    .map((o) => ({
      token: o.public_token,
      titulo: o.title || `Música para ${o.recipient_name}`,
      para: o.recipient_name,
      ocasiao: getOccasion(o.occasion)?.label ?? o.occasion,
      estado: PARA_O_CLIENTE[o.status] ?? "Em produção",
      pronta: ["ready", "delivered"].includes(o.status),
      criadoEm: o.created_at,
      prontoEm: o.ready_at,
      url: `/pedido/${o.public_token}`,
    }));

  return NextResponse.json({ pedidos });
}
