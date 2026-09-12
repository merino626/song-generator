/**
 * Única fonte de verdade sobre "este pedido já foi pago" — usada como
 * INVARIANTE, não como confiança em quem chama.
 *
 * Por quê: `startProduction` (gasta crédito real) e `deliverManual` (libera a
 * música) são hoje só alcançáveis por rotas com ADMIN_SECRET, então não são
 * superfície pública de ataque. Mas depender só disso é frágil — um bug
 * futuro, um script de teste esquecido rodando, ou uma nova rota chamando
 * essas funções sem essa checagem, poderia liberar produto sem pagamento.
 *
 * A regra real é: `orders.status` só chega a estes valores DEPOIS que
 * `/api/checkout/status` ou `/api/webhooks/stripe` confirmam `succeeded` num
 * PaymentIntent consultado DIRETO na API da Stripe (nunca de dado que o
 * cliente manda) — então checar o status aqui é checar a prova de
 * pagamento, não confiar em quem pediu.
 */
export const PAID_OR_BEYOND = [
  "paid",
  "producing_robot",
  "manual_review",
  "producing_manual",
  "ready",
  "delivered",
] as const;

export function isPaidOrBeyond(status: string | null | undefined): boolean {
  return !!status && (PAID_OR_BEYOND as readonly string[]).includes(status);
}
