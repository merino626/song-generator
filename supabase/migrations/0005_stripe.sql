-- Troca de provedor de pagamento: Mercado Pago -> Stripe.
--
-- O sandbox do Mercado Pago ficou comprovadamente inviável (10/10 chamadas a
-- /v1/payments retornando internal_error, com GET e outros POST funcionando
-- normalmente na mesma credencial — não era bug nosso, era o provedor).
--
-- Não precisa migrar linhas existentes: `provider` e `status` sempre foram
-- gravados explicitamente pelo código em todo INSERT, nunca dependeram do
-- default. Só corrige o default e o comentário pra não mentir pra quem ler o
-- schema depois.
alter table payments alter column provider set default 'stripe';
comment on column payments.method is 'card | ...(Payment Method Types do Stripe)';
comment on column payments.status is 'status nativo do PaymentIntent do Stripe: requires_payment_method | requires_action | processing | succeeded | canceled';
comment on column payments.external_id is 'id do PaymentIntent no Stripe (pi_...)';
