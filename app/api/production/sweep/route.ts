import { NextResponse } from "next/server";
import { sweepRunningJobs } from "@/lib/music/orchestrator";

export const dynamic = "force-dynamic";

/** Varre até 25 jobs, cada um consultando o provider — pode passar de 1 min. */
export const maxDuration = 300;

/**
 * Rede de segurança: varre os jobs em andamento caso o webhook não chegue.
 * Chamar por cron (Vercel Cron / pg_cron) a cada ~1 minuto.
 * Protegido por CRON_SECRET para não virar endpoint público de trabalho.
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
