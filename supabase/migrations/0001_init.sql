-- Vira Canção — schema inicial
-- Estratégia híbrida: o robô (crun.ai) tenta primeiro; qualquer falha cai
-- para tratativa manual (operador gera na conta Suno própria e sobe o áudio).
-- Nenhum pedido fica preso: ou o robô entrega, ou aparece na fila manual.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- pedidos
create type order_status as enum (
  'draft',            -- rascunho no wizard
  'lyrics_ready',     -- letra gerada, aguardando decisão
  'awaiting_payment', -- checkout criado
  'paid',             -- pagamento confirmado -> entra na fila
  'producing_robot',  -- robô (crun.ai) processando
  'manual_review',    -- robô falhou -> tratativa manual
  'producing_manual', -- operador assumiu
  'ready',            -- áudio pronto
  'delivered',        -- entregue (e-mail/WhatsApp)
  'refunded',
  'error'
);

create table orders (
  id                uuid primary key default gen_random_uuid(),
  public_token      uuid not null unique default gen_random_uuid(),
  status            order_status not null default 'draft',

  -- respostas do wizard
  occasion          text,
  recipient_name    text,
  recipient_gender  text check (recipient_gender in ('f','m','n')),
  relationship      text,
  sender_name       text,
  story             text,
  style_id          text,
  vocal             text,

  -- contato
  customer_email    text,
  customer_phone    text,

  -- letra
  title             text,
  lyrics            text,              -- letra final (já editada pelo cliente)
  lyrics_variants   jsonb,             -- as 2 versões oferecidas

  -- comercial
  plan              text check (plan in ('standard','priority')),
  amount_cents      int,
  upsells           text[] default '{}',

  -- produção
  attempts          int not null default 0,
  last_error        text,
  manual_reason     text,              -- por que caiu pro manual
  assigned_to       text,              -- operador que assumiu

  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  ready_at          timestamptz,
  delivered_at      timestamptz,
  updated_at        timestamptz not null default now()
);

create index orders_status_idx on orders (status, created_at);
create index orders_email_idx  on orders (customer_email);

-- ------------------------------------------------------- jobs de produção
-- Um job por tentativa. Guarda o provider usado para sabermos o que
-- funcionou/quebrou e medir a taxa de automação vs. manual.
create type job_type   as enum ('vocal','stems','video');
create type job_status as enum ('queued','running','success','failed');

create table jobs (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  type          job_type   not null default 'vocal',
  status        job_status not null default 'queued',
  provider      text not null,          -- 'crun' | 'manual'
  external_id   text,                   -- task_id no provider
  request       jsonb,
  response      jsonb,
  error         text,
  attempt       int not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index jobs_order_idx  on jobs (order_id, created_at desc);
create index jobs_status_idx on jobs (status) where status in ('queued','running');
create unique index jobs_external_idx on jobs (provider, external_id) where external_id is not null;

-- ------------------------------------------------------------- mídias
create type media_type as enum ('song','preview','karaoke','instrumental','video','cover','photo');

create table media_assets (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  type         media_type not null,
  url          text not null,           -- URL no R2 (re-hospedado, nunca a do provider)
  source_url   text,                    -- original do provider, para auditoria
  duration_s   numeric,
  is_primary   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index media_order_idx on media_assets (order_id, type);

-- --------------------------------------------------- rate limit da letra
-- Blindagem do endpoint gratuito (o concorrente não tem e por isso é abusável).
create table rate_limits (
  key         text not null,
  window_start timestamptz not null,
  count       int not null default 1,
  primary key (key, window_start)
);

-- ------------------------------------------------------------ updated_at
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger orders_touch before update on orders
  for each row execute function touch_updated_at();
create trigger jobs_touch before update on jobs
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------------ RLS
-- Tudo fechado por padrão: o acesso é sempre pelo backend com service_role.
-- O cliente enxerga o próprio pedido só via token no endpoint, nunca direto.
alter table orders       enable row level security;
alter table jobs         enable row level security;
alter table media_assets enable row level security;
alter table rate_limits  enable row level security;
