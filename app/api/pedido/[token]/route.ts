import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { finalizeJob, startProduction } from "@/lib/music/orchestrator";

export const dynamic = "force-dynamic";

/**
 * Estado do pedido para o cliente. O `public_token` (UUID não adivinhável) é a
 * própria credencial — sem login, que é o que mantém o resgate sem atrito.
 *
 * Regra importante: o cliente NUNCA vê o estado interno da produção. Se o robô
 * falhou e um humano assumiu, para ele continua sendo "sendo produzida" — o
 * problema é nosso, não dele.
 */
const PARA_O_CLIENTE: Record<string, string> = {
  draft: "rascunho",
  lyrics_ready: "aguardando_pagamento",
  awaiting_payment: "aguardando_pagamento",
  paid: "produzindo",
  producing_robot: "produzindo",
  manual_review: "produzindo",
  producing_manual: "produzindo",
  ready: "pronta",
  delivered: "pronta",
  error: "produzindo",
  refunded: "reembolsado",
};

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = supabaseAdmin();

  let order = await fetchOrder(db, token);
  if (!order) return NextResponse.json({ error: "pedido não encontrado" }, { status: 404 });

  // Auto-cura: enquanto o cliente está com a página aberta esperando, cada
  // consulta aproveita para checar o robô de verdade — em vez de só ler o
  // banco e confiar que algo mais (webhook, cron) vai atualizar sozinho.
  //
  // Sem isso, em ambiente sem URL pública (localhost) o crun.ai nunca
  // consegue nos avisar via callback, e sem um cron rodando `sweep` também
  // ninguém pergunta de novo — o pedido fica "produzindo" para sempre mesmo
  // depois de a música já estar pronta do lado de lá. Mesmo princípio já
  // usado no polling de pagamento (`/api/checkout/status`): nunca confiar só
  // em um mecanismo de notificação, sempre poder reconferir puxando.
  // Também cobre `manual_review`: uma corrida entre o self-heal e o
  // `startProduction` ainda em andamento pode ter mandado o pedido pro manual
  // por engano enquanto o job de verdade seguia rodando certo no provider —
  // ver comentário em `finalizeJob`. Sem checar aqui também, esse pedido fica
  // preso pra sempre (ninguém mais volta a consultar o job).
  if (order.status === "producing_robot" || order.status === "manual_review") {
    const { data: job } = await db
      .from("jobs")
      .select("id")
      .eq("order_id", order.id)
      .eq("type", "vocal")
      .in("status", ["queued", "running"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (job) {
      try {
        await finalizeJob(job.id);
        order = (await fetchOrder(db, token)) ?? order;
      } catch (e) {
        console.error("[pedido] auto-cura falhou:", (e as Error).message);
      }
    }
  }

  // Cobre um jeito específico (e real) de travar: `startProduction` é
  // disparado via `after()` no instante em que o pagamento é confirmado, sem
  // bloquear a resposta ao cliente — mas se a instância serverless morrer
  // antes desse `after()` terminar (ou por qualquer outro motivo ele nunca
  // rodar), o pedido fica em "paid" pra sempre SEM NENHUM job criado, e o
  // self-heal acima não pega isso porque não há job nenhum pra reconsultar.
  // Um atraso de 20s evita disparar de novo em cima do `after()` que ainda
  // está no meio do próprio request original.
  if (order.status === "paid" && order.paid_at && Date.now() - new Date(order.paid_at).getTime() > 20_000) {
    const { data: job } = await db.from("jobs").select("id").eq("order_id", order.id).eq("type", "vocal").maybeSingle();
    if (!job) {
      try {
        const site = process.env.NEXT_PUBLIC_SITE_URL;
        const callbackUrl = site && !site.includes("localhost") ? `${site}/api/production/callback` : undefined;
        await startProduction(order.id, callbackUrl);
        order = (await fetchOrder(db, token)) ?? order;
      } catch (e) {
        console.error("[pedido] auto-cura (paid sem job) falhou:", (e as Error).message);
      }
    }
  }

  const { data: media } = await db
    .from("media_assets")
    .select("id,type,duration_s,is_primary")
    .eq("order_id", order.id)
    .order("is_primary", { ascending: false });

  const estado = PARA_O_CLIENTE[order.status] ?? "produzindo";

  return NextResponse.json({
    token: order.public_token,
    estado,
    titulo: order.title,
    letra: order.lyrics,
    para: order.recipient_name,
    de: order.sender_name,
    ocasiao: order.occasion,
    estilo: order.style_id,
    plano: order.plan,
    criadoEm: order.created_at,
    pagoEm: order.paid_at,
    prontoEm: order.ready_at,
    // Só entrega as faixas quando está pronta — sem espiar antes de pagar.
    faixas:
      estado === "pronta"
        ? (media ?? [])
            .filter((m) => m.type === "song")
            // Sem "rótulo" pronto aqui: essa API não sabe o idioma da
            // interface. "Versão N"/"Version N" é montado no cliente
            // (components/PedidoView.tsx) a partir do índice.
            .map((m) => ({
              id: m.id,
              duracaoS: m.duration_s,
              url: `/api/media?token=${order.public_token}&id=${m.id}`,
            }))
        : [],
    capa:
      estado === "pronta" && media?.some((m) => m.type === "cover")
        ? `/api/media?token=${order.public_token}&id=${media.find((m) => m.type === "cover")!.id}`
        : null,
  });
}

async function fetchOrder(db: ReturnType<typeof supabaseAdmin>, token: string) {
  const { data } = await db
    .from("orders")
    .select("id,public_token,status,title,lyrics,recipient_name,sender_name,occasion,style_id,vocal,plan,created_at,paid_at,ready_at")
    .eq("public_token", token)
    .maybeSingle();
  return data;
}
