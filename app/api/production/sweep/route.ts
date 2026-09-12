import { NextResponse } from "next/server";
import { sweepRunningJobs } from "@/lib/music/orchestrator";

export const dynamic = "force-dynamic";

/** Varre até 25 jobs, cada um consultando o provider — pode passar de 1 min. */
export const maxDuration = 300;

/**
 * Rede de segurança: varre os jobs em andamento caso o callback do provider
 * não chegue. Rodada 1x/dia via Vercel Cron (`vercel.json`) — o plano Hobby
 * não permite frequência maior. Não é a única defesa: enquanto o cliente
 * está com a página do pedido aberta, cada consulta já reconfere o job na
 * hora (ver "auto-cura" em `app/api/pedido/[token]/route.ts`); este sweep
 * cobre só o caso de o cliente ter fechado a aba antes da música ficar
 * pronta. Protegido por CRON_SECRET para não virar endpoint público de
 * trabalho — a Vercel manda esse bearer sozinha quando a env var existe.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const results = await sweepRunningJobs();
  return NextResponse.json({ checked: results.length, results });
}
