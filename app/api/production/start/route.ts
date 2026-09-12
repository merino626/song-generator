import { NextResponse } from "next/server";
import { startProduction } from "@/lib/music/orchestrator";

/**
 * Dispara a produção de um pedido. Quem chama, em produção, é o webhook da
 * Stripe assim que o pagamento é confirmado.
 * Protegido por ADMIN_SECRET para não virar gerador gratuito de música.
 */
/** Cria a tarefa no provider e pode reintentar uma vez em erro temporário. */
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body?.orderId) return NextResponse.json({ error: "orderId obrigatório" }, { status: 422 });

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  // O callback só é enviado quando temos URL pública — em localhost o crun não
  // consegue nos alcançar, e aí o sweep por cron cobre.
  const callbackUrl = site && !site.includes("localhost") ? `${site}/api/production/callback` : undefined;

  try {
    const result = await startProduction(body.orderId, callbackUrl);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
