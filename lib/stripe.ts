import Stripe from "stripe";

/**
 * Cliente Stripe — diferente do resto deste projeto (MP, crun.ai são fetch
 * puro), aqui usamos o SDK oficial de propósito. Assinatura de webhook e
 * idempotência são coisas fáceis de acertar errado na mão; o SDK da Stripe é
 * extremamente bem mantido e é o jeito padrão da indústria de integrar — não
 * há ganho em reescrever isso, só risco.
 */

let cliente: Stripe | null = null;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY não configurada");
  if (!cliente) {
    cliente = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Fixa a versão da API: sem isso, uma atualização de conta na Stripe
      // pode mudar o formato da resposta por baixo do nosso código sem aviso.
      apiVersion: "2026-08-26.dahlia",
    });
  }
  return cliente;
}

export const PAGAMENTO_ATIVO = ["requires_payment_method", "requires_action", "requires_confirmation", "processing"] as const;
