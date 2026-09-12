import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { finalizeJob } from "@/lib/music/orchestrator";

/**
 * Webhook do crun.ai (`callback_url`). Ele nos avisa quando a música fica pronta,
 * então não precisamos ficar consultando em loop.
 *
 * Confiamos no aviso, mas NÃO no conteúdo: usamos só o task_id e vamos conferir
 * o estado real na API. Assim um POST forjado não consegue marcar pedido como pronto.
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const taskId = body?.task_id ?? body?.data?.task_id;
  if (!taskId) return NextResponse.json({ error: "task_id ausente" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: job } = await db
    .from("jobs")
    .select("id")
    .eq("provider", "crun")
    .eq("external_id", taskId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "job desconhecido" }, { status: 404 });

  const result = await finalizeJob(job.id);
  return NextResponse.json({ ok: true, ...result });
}
