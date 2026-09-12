import { supabaseAdmin } from "./supabase";
import { mirrorToR2, r2Configured } from "./r2";
import { isPaidOrBeyond } from "./order-status";
import { avisarProntoPorEmail } from "./email";

/**
 * Conclusão manual de um pedido — fonte única de verdade.
 *
 * Usada tanto pelo formulário do painel quanto pela rota de API. Ter duas
 * implementações separadas era pedir para uma esquecer o espelhamento no R2 e
 * entregar link que expira.
 */
export async function deliverManual(params: {
  orderId: string;
  urls: string[];
  capa?: string;
  operador?: string;
}) {
  const { orderId, capa, operador = "admin" } = params;
  const urls = params.urls.map((u) => u.trim()).filter(Boolean);

  if (!orderId) throw new Error("orderId é obrigatório");
  if (!urls.length) throw new Error("informe ao menos um link de áudio");
  for (const u of urls) {
    if (!/^https?:\/\//i.test(u)) throw new Error(`link inválido: ${u.slice(0, 40)}`);
  }

  const db = supabaseAdmin();

  // Trava contra clique duplo / reenvio do formulário: sem isso, dois cliques
  // no "Concluir e liberar" inserem as mesmas faixas duas vezes (foi
  // exatamente o que causou "4 versões" na tela do cliente). A trava real é
  // esta condição no UPDATE abaixo — aqui é só para falhar cedo com uma
  // mensagem clara em vez de duplicar mídia primeiro.
  const { data: atual } = await db.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!atual) throw new Error("pedido não encontrado");
  if (["ready", "delivered"].includes(atual.status)) {
    throw new Error("Este pedido já foi entregue — reenviar duplicaria as faixas. Recarregue a fila.");
  }
  // INVARIANTE, não confiança em quem chama: a entrega manual existe para
  // completar um pedido que JÁ estava em produção (o robô falhou em algum
  // ponto depois do pagamento aprovado) — nunca para liberar um pedido que
  // nunca foi pago. Ver `lib/order-status.ts`.
  if (!isPaidOrBeyond(atual.status)) {
    throw new Error(`Este pedido não está pago (status="${atual.status}") — entrega recusada.`);
  }

  const linhas: any[] = [];

  const espelhar = async (url: string, key: string, tipo: string) => {
    if (!r2Configured()) return url;
    try {
      return await mirrorToR2(url, key, tipo);
    } catch (e) {
      // Espelhar falhou não pode travar a entrega: segue com o link original.
      console.error("[manual] espelhamento falhou:", (e as Error).message);
      return url;
    }
  };

  for (const [i, url] of urls.entries()) {
    linhas.push({
      order_id: orderId,
      type: "song",
      url: await espelhar(url, `orders/${orderId}/manual-${i + 1}-${Date.now()}.mp3`, "audio/mpeg"),
      source_url: url,
      is_primary: i === 0,
    });
  }

  if (capa?.trim()) {
    linhas.push({
      order_id: orderId,
      type: "cover",
      url: await espelhar(capa.trim(), `orders/${orderId}/manual-capa-${Date.now()}.jpg`, "image/jpeg"),
      source_url: capa.trim(),
      is_primary: true,
    });
  }

  const { error: errMedia } = await db.from("media_assets").insert(linhas);
  if (errMedia) throw new Error(`falha ao salvar mídias: ${errMedia.message}`);

  await db.from("jobs").insert({
    order_id: orderId,
    type: "vocal",
    provider: "manual",
    status: "success",
    response: { urls, capa, operador },
  });

  // Guarda atômica: só marca "ready" se ainda não estava — fecha a janela de
  // corrida entre a checagem acima e este update (dois cliques quase
  // simultâneos). Se 0 linhas mudarem, outra chamada já entregou primeiro.
  const { data: updated, error } = await db
    .from("orders")
    .update({ status: "ready", ready_at: new Date().toISOString(), assigned_to: operador })
    .eq("id", orderId)
    .not("status", "in", "(ready,delivered)")
    .select("id,customer_email,public_token,title,recipient_name")
    .maybeSingle();
  if (error) throw new Error(`falha ao concluir: ${error.message}`);
  if (!updated) throw new Error("Este pedido já foi entregue por outra chamada — as faixas enviadas agora ficaram órfãs, confira a fila.");

  // Mesmo aviso que o robô manda — o cliente não precisa saber quem produziu.
  await avisarProntoPorEmail(updated);

  return { status: "ready" as const, faixas: urls.length };
}
