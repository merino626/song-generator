/**
 * Orquestrador híbrido da produção.
 *
 * Regra: o robô SEMPRE tenta primeiro. Qualquer coisa que dê errado — erro do
 * provider, geração falha, ou demora demais — o pedido cai para `manual_review`
 * e aparece na fila do operador, que gera na conta Suno própria e sobe o áudio.
 *
 * O cliente nunca fica preso: no pior caso a entrega vira manual, não vira nada.
 */

import { supabaseAdmin } from "@/lib/supabase";
import { getStyle } from "@/lib/music-styles";
import { mirrorToR2, r2Configured } from "@/lib/r2";
import { isPaidOrBeyond } from "@/lib/order-status";
import { avisarProntoPorEmail } from "@/lib/email";
import { crunProvider } from "./crun";
import { ProviderError, type MusicProvider, type MusicRequest } from "./types";

/** Depois disso, um job "running" é considerado travado e vai pro manual. */
const STUCK_AFTER_MS = 10 * 60 * 1000;

function provider(): MusicProvider {
  return crunProvider;
}

/** Monta o pedido de música a partir do que o cliente respondeu no wizard. */
export function buildRequest(order: any): MusicRequest {
  const style = getStyle(order.style_id);
  const vocalTag =
    order.vocal === "feminino" ? "voz feminina" : order.vocal === "masculino" ? "voz masculina" : "dueto";

  return {
    title: order.title || `Música para ${order.recipient_name}`,
    lyrics: order.lyrics || "",
    tags: [style?.prompt || "música brasileira", vocalTag, "português do Brasil"].join(", "),
    vocalGender: order.vocal === "feminino" ? "f" : order.vocal === "masculino" ? "m" : undefined,
  };
}

/** Manda o pedido para a fila manual, registrando o motivo. */
export async function fallbackToManual(orderId: string, reason: string) {
  const db = supabaseAdmin();
  await db
    .from("orders")
    .update({ status: "manual_review", manual_reason: reason, last_error: reason })
    .eq("id", orderId);
  // TODO: notificar o operador (e-mail/WhatsApp) — a fila fica em /admin/fila
  return { status: "manual_review" as const, reason };
}

/**
 * Inicia a produção do vocal. Chamado quando o pagamento é confirmado.
 */
export async function startProduction(orderId: string, callbackUrl?: string) {
  const db = supabaseAdmin();

  const { data: order, error } = await db.from("orders").select("*").eq("id", orderId).single();
  if (error || !order) throw new Error(`pedido ${orderId} não encontrado`);

  // INVARIANTE, não confiança em quem chama: mesmo que esta função só seja
  // hoje alcançável por rotas com ADMIN_SECRET, ela mesma se recusa a gastar
  // crédito (e no fim liberar a música) para um pedido que não tem pagamento
  // confirmado. `order.status` só chega a "pago ou além" depois que o MP
  // aprovou de verdade — ver `lib/order-status.ts`.
  if (!isPaidOrBeyond(order.status)) {
    throw new Error(`pedido ${orderId} não está pago (status="${order.status}") — produção recusada`);
  }
  if (!order.lyrics) return fallbackToManual(orderId, "pedido sem letra definida");

  const attempt = (order.attempts ?? 0) + 1;
  const p = provider();
  const req = buildRequest(order);

  const { data: job } = await db
    .from("jobs")
    .insert({ order_id: orderId, type: "vocal", provider: p.name, status: "queued", request: req, attempt })
    .select()
    .single();

  await db.from("orders").update({ status: "producing_robot", attempts: attempt }).eq("id", orderId);

  try {
    const { externalId } = await p.create(req, { callbackUrl });

    // A partir daqui o crun.ai já criou a tarefa (crédito já gasto). Perder o
    // external_id aqui vira um job órfão que nunca mais pode ser consultado —
    // foi exatamente isto que causou "job sem id externo": este UPDATE falhava
    // (rede/DB) e o erro nunca era checado, então o código seguia como se
    // tivesse dado certo. Agora tenta salvar com retry e, se mesmo assim
    // falhar, preserva o external_id na própria linha antes de cair pro manual.
    let salvo = false;
    let ultimoErro: string | undefined;
    for (let i = 0; i < 3 && !salvo; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 500 * i));
      const { error: updErr } = await db
        .from("jobs")
        .update({ status: "running", external_id: externalId })
        .eq("id", job!.id);
      if (!updErr) {
        salvo = true;
        break;
      }
      ultimoErro = updErr.message;
    }

    if (!salvo) {
      await db
        .from("jobs")
        .update({ status: "failed", external_id: externalId, error: `falha ao salvar external_id: ${ultimoErro}` })
        .eq("id", job!.id);
      return fallbackToManual(
        orderId,
        `robô gerou a tarefa (${externalId}) mas o banco não salvou o id — buscar no painel do crun.ai`
      );
    }

    return { status: "producing_robot" as const, jobId: job!.id, externalId };
  } catch (e) {
    const err = e as ProviderError;
    await db.from("jobs").update({ status: "failed", error: err.message }).eq("id", job!.id);

    // Erro temporário e é a 1ª tentativa: vale mais uma antes de acionar humano.
    if (err.retryable && attempt < 2) return startProduction(orderId, callbackUrl);

    return fallbackToManual(orderId, `robô falhou: ${err.message}`);
  }
}

/**
 * Conclui um job a partir do resultado do provider (webhook ou polling).
 */
export async function finalizeJob(jobId: string) {
  const db = supabaseAdmin();
  const { data: job } = await db.from("jobs").select("*").eq("id", jobId).single();
  if (!job) throw new Error(`job ${jobId} não encontrado`);
  if (job.status === "success") return { status: "ready" as const };
  if (!job.external_id) {
    // Normal por um instante: `startProduction` insere o job ANTES de chamar
    // o provider, então existe uma janela real (ms a poucos segundos) em que
    // o job existe mas ainda não tem external_id. Sem esta tolerância, o
    // self-heal do cliente pode consultar bem nessa janela, concluir "job
    // quebrado" e mandar pro manual um pedido que ia terminar bem sozinho —
    // e como o job (assíncrono, em outra chamada) recebe o external_id um
    // instante depois, ele fica "running" certinho enquanto o PEDIDO fica
    // preso em manual_review, e mais ninguém volta a checar esse job.
    const idadeMs = Date.now() - new Date(job.created_at).getTime();
    if (idadeMs < 60_000) return { status: "producing_robot" as const };

    await db.from("jobs").update({ status: "failed", error: "sem external_id" }).eq("id", jobId);
    return fallbackToManual(job.order_id, "job sem id externo (tarefa nunca foi criada no provider)");
  }

  let result;
  try {
    result = await provider().status(job.external_id);
  } catch (e) {
    return fallbackToManual(job.order_id, `erro ao consultar robô: ${(e as Error).message}`);
  }

  if (result.state === "running") {
    // Travou? Não deixa o cliente esperando indefinidamente.
    if (Date.now() - new Date(job.created_at).getTime() > STUCK_AFTER_MS) {
      await db.from("jobs").update({ status: "failed", error: "timeout" }).eq("id", jobId);
      return fallbackToManual(job.order_id, "robô demorou demais (timeout)");
    }
    return { status: "producing_robot" as const };
  }

  if (result.state === "failed") {
    await db.from("jobs").update({ status: "failed", error: result.error }).eq("id", jobId);
    return fallbackToManual(job.order_id, `robô falhou: ${result.error}`);
  }

  // Sucesso do provider. ANTES de gravar qualquer coisa, reivindica o job
  // atomicamente: se duas chamadas de finalizeJob rodarem em paralelo para o
  // MESMO job — ex.: duas abas do cliente, ou o polling de `/pedido/[token]`
  // sobrepondo com o `sweep` do cron, ambos veem "running" e ambos tentam
  // processar — só a PRIMEIRA a rodar este UPDATE ganha a corrida (o Postgres
  // serializa updates na mesma linha); a segunda vê 0 linhas afetadas e sai
  // sem duplicar as faixas. Foi exatamente isto que causou "4 versões" na
  // tela do cliente (2 pares duplicados) mesmo com o R2 certo — o R2 dedupa
  // pela chave determinística, mas cada insert em `media_assets` gera IDs novos.
  const { data: claimed, error: claimErr } = await db
    .from("jobs")
    .update({ status: "success", response: result as any })
    .eq("id", jobId)
    .in("status", ["queued", "running"])
    .select("id")
    .maybeSingle();

  // Sem isto, um erro de verdade neste UPDATE (rede/DB, não concorrência)
  // parecia com "outra chamada já reivindicou" e o código seguia como se a
  // entrega tivesse sido tratada — o pedido ficava preso sem nunca lançar erro.
  if (claimErr) throw new Error(`falha ao reivindicar job: ${claimErr.message}`);
  if (!claimed) {
    // Outra chamada concorrente já reivindicou e está processando (ou já
    // processou) este job — não insere de novo.
    return { status: "ready" as const };
  }

  // A partir daqui somos os únicos donos deste job. Espelhamos no R2 antes de
  // salvar: a CDN do provider é temporária, e o cliente não pode perder a
  // música que pagou porque um link expirou.
  const rows: any[] = [];
  for (const [i, t] of result.tracks.entries()) {
    let audioUrl = t.audioUrl;
    let coverUrl = t.coverUrl;

    if (r2Configured()) {
      try {
        audioUrl = await mirrorToR2(t.audioUrl, `orders/${job.order_id}/${t.externalId}.mp3`, "audio/mpeg");
        if (t.coverUrl) {
          coverUrl = await mirrorToR2(t.coverUrl, `orders/${job.order_id}/${t.externalId}.jpg`, "image/jpeg");
        }
      } catch (e) {
        // Falhar o espelhamento não pode travar a entrega: fica a URL do
        // provider e o source_url permite reprocessar depois.
        console.error("[r2] espelhamento falhou:", (e as Error).message);
      }
    }

    rows.push({
      order_id: job.order_id,
      type: "song",
      url: audioUrl,
      source_url: t.audioUrl,
      duration_s: t.durationS,
      is_primary: i === 0,
    });
    if (coverUrl) {
      rows.push({ order_id: job.order_id, type: "cover", url: coverUrl, source_url: t.coverUrl, is_primary: i === 0 });
    }
  }
  await db.from("media_assets").insert(rows);
  const { data: pronto } = await db
    .from("orders")
    .update({ status: "ready", ready_at: new Date().toISOString() })
    .eq("id", job.order_id)
    .select("id,customer_email,public_token,title,recipient_name")
    .maybeSingle();

  if (pronto) await avisarProntoPorEmail(pronto);

  return { status: "ready" as const, tracks: result.tracks };
}

/**
 * Varre jobs em andamento — rede de segurança para quando o webhook não chega.
 * Ideal chamar por cron (pg_cron/Vercel Cron) a cada ~1 min.
 */
export async function sweepRunningJobs() {
  const db = supabaseAdmin();
  const { data: jobs } = await db.from("jobs").select("id").in("status", ["queued", "running"]).limit(25);
  const results = [];
  for (const j of jobs ?? []) {
    try {
      results.push({ jobId: j.id, ...(await finalizeJob(j.id)) });
    } catch (e) {
      results.push({ jobId: j.id, error: (e as Error).message });
    }
  }
  return results;
}
