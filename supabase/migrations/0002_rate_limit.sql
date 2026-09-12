-- Contador atômico para o rate limit.
-- Precisa ser função no banco: fazer "ler e depois gravar" pelo app abre janela
-- para duas requisições simultâneas passarem pelo mesmo limite.

create or replace function bump_rate_limit(p_key text, p_window timestamptz)
returns int
language plpgsql
as $$
declare
  novo int;
begin
  insert into rate_limits (key, window_start, count)
  values (p_key, p_window, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into novo;
  return novo;
end $$;

-- Limpeza do que já passou (evita a tabela crescer para sempre).
create or replace function prune_rate_limits()
returns void
language sql
as $$
  delete from rate_limits where window_start < now() - interval '2 days';
$$;
