-- Pagamentos (Mercado Pago) — uma linha por TENTATIVA de cobrança.
-- Um pedido pode ter mais de um pagamento se o Pix expirar e a pessoa gerar
-- outro, ou se um cartão for recusado e ela tentar de novo.

create table payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  provider      text not null default 'mercadopago',
  external_id   text,               -- id do pagamento no Mercado Pago
  method        text,               -- pix | credit_card | bolbradesco | ...
  status        text not null default 'pending',  -- pending|approved|rejected|cancelled|in_process|refunded
  amount_cents  int not null,
  raw           jsonb,              -- resposta completa da API, para auditoria/depuração
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index payments_order_idx on payments (order_id, created_at desc);
-- Evita gravar o mesmo pagamento do MP duas vezes (webhook + polling podem colidir).
create unique index payments_external_idx on payments (provider, external_id) where external_id is not null;

create trigger payments_touch before update on payments
  for each row execute function touch_updated_at();

alter table payments enable row level security;
