-- Detecção de abuso: registrar para poder investigar, e bloquear com controle.
--
-- O rate limit é cego: ele conta e barra, mas não guarda o que aconteceu.
-- Aqui ficam os eventos, para o painel mostrar QUEM está abusando e com que
-- padrão — e para você bloquear/desbloquear na mão.

create table generation_events (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- identidades (as 4 chaves que o anti-abuso conhece)
  ip           text,
  device_id    text,
  fingerprint  text,
  email        text,

  user_agent   text,
  occasion     text,
  story_hash   text,           -- mesma história repetida = script
  story_len    int,

  blocked      boolean not null default false,  -- foi barrado no rate limit?
  converted    boolean not null default false,  -- virou pedido pago?
  order_id     uuid references orders(id) on delete set null
);

create index gen_events_time_idx   on generation_events (created_at desc);
create index gen_events_device_idx on generation_events (device_id, created_at desc);
create index gen_events_ip_idx     on generation_events (ip, created_at desc);
create index gen_events_fp_idx     on generation_events (fingerprint, created_at desc);

-- ------------------------------------------------------------- bloqueios
create type block_kind as enum ('ip','device','fingerprint','email');

create table blocks (
  id          uuid primary key default gen_random_uuid(),
  kind        block_kind not null,
  value       text not null,
  reason      text,
  created_by  text not null default 'admin',   -- 'admin' | 'auto'
  active      boolean not null default true,
  expires_at  timestamptz,                     -- null = permanente
  created_at  timestamptz not null default now()
);

create unique index blocks_unique_active on blocks (kind, value) where active;
create index blocks_lookup_idx on blocks (kind, value) where active;

alter table generation_events enable row level security;
alter table blocks            enable row level security;

-- ---------------------------------------------------- relatório de abuso
-- Agrega por identidade numa janela. O score fica no app (fácil de ajustar
-- sem migration); aqui só saem os números crus.
create or replace function abuse_report(p_hours int default 24)
returns table (
  kind             text,
  value            text,
  events           bigint,
  blocked_events   bigint,
  distinct_ips     bigint,
  distinct_emails  bigint,
  distinct_stories bigint,
  conversions      bigint,
  first_seen       timestamptz,
  last_seen        timestamptz
)
language sql stable
as $$
  with janela as (
    select * from generation_events
    where created_at > now() - make_interval(hours => p_hours)
  ),
  por_identidade as (
    select 'device' as kind, device_id as value, * from janela where device_id is not null
    union all
    select 'fingerprint', fingerprint, * from janela where fingerprint is not null
    union all
    select 'ip', ip, * from janela where ip is not null
    union all
    select 'email', email, * from janela where email is not null
  )
  select
    kind,
    value,
    count(*)                                   as events,
    count(*) filter (where blocked)            as blocked_events,
    count(distinct ip)                         as distinct_ips,
    count(distinct email)                      as distinct_emails,
    count(distinct story_hash)                 as distinct_stories,
    count(*) filter (where converted)          as conversions,
    min(created_at)                            as first_seen,
    max(created_at)                            as last_seen
  from por_identidade
  group by kind, value
  having count(*) > 1
  order by count(*) desc
  limit 200;
$$;
