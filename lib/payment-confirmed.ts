import { after } from "next/server";
import { supabaseAdmin } from "./supabase";
import { startProduction } from "./music/orchestrator";
import { enviar, emailPagamentoConfirmado } from "./email";

/**
 * O que acontece quando um pagamento é aprovado — em UM lugar só.
 *
 * Dois caminhos independentes descobrem a aprovação: o polling da tela de
 * pagamento (`/api/checkout/status`, chamado logo após `stripe.confirmPayment`
 * no navegador) e o webhook da Stripe. Antes, cada caminho repetia o mesmo
 * update guardado e o mesmo `startProduction` — cópias que precisariam ser
 * lembradas a cada mudança. Foi assim que outras duplicações desta base
 * viraram bug.
 *
 * A guarda `.eq("status","awaiting_payment")` é o que torna isto seguro de
 * chamar de qualquer lugar, quantas vezes for: só a PRIMEIRA chamada encontra
 * a linha para atualizar. As outras veem `updated == null` e saem sem
 * reenviar e-mail nem iniciar produção duplicada.
 *
 * Importante: quem chama já confirmou a aprovação **direto na API da
 * Stripe** — nunca a partir de dado vindo do navegador. Ver `lib/order-status.ts`.
 */
export async function confirmarPagamento(orderId: string): Promise<boolean> {
  const db = supabaseAdmin();

  const { data: updated } = await db
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "awaiting_payment")
    .select("id,customer_email,public_token,recipient_name")
    .maybeSingle();

  // Outro caminho chegou primeiro: nada a fazer.
  if (!updated) return false;

  // Avisa que o pagamento entrou e já entrega o link. Falha de e-mail não
  // pode impedir a produção de começar — por isso não é await bloqueante.
  //
  // Tanto isto quanto o `startProduction` abaixo usam `after()`: numa function
  // serverless da Vercel, uma promise solta (sem await, sem after) pode ser
  // congelada no meio do trabalho assim que a resposta HTTP é mandada — foi
  // exatamente isso que deixou um pedido PAGO DE VERDADE preso pra sempre
  // sem nenhuma linha em `jobs`, porque `startProduction` nem chegou a
  // rodar o primeiro insert antes do runtime matar a instância. `after()`
  // avisa a Vercel pra manter a function viva até o callback terminar,
  // mesmo depois da resposta já ter saído — sem isso o cliente esperaria a
  // criação da tarefa no crun.ai antes de ver a tela de "processando".
  if (updated.customer_email) {
    after(() =>
      enviar(emailPagamentoConfirmado(updated)).catch((e) =>
        console.error("[pagamento] e-mail de confirmação falhou:", (e as Error).message),
      ),
    );
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const callbackUrl = site && !site.includes("localhost") ? `${site}/api/production/callback` : undefined;
  after(() =>
    startProduction(orderId, callbackUrl).catch((e) =>
      console.error("[pagamento] startProduction falhou:", (e as Error).message),
    ),
  );

  return true;
}
