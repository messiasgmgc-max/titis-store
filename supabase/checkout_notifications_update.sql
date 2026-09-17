-- =============================================================================
-- TITI'S STORE — Migração SQL: Rastreio de Pedidos & Newsletter
-- Como usar:
--   Supabase Dashboard → SQL Editor → Nova Consulta → Cole este código → Run
-- =============================================================================

begin;

-- 1. Campos de rastreamento na tabela public.orders
alter table public.orders
  add column if not exists tracking_code     text,
  add column if not exists tracking_carrier  text,
  add column if not exists tracking_url      text,
  add column if not exists dispatched_at     timestamptz;

-- 2. Tabela de inscritos na Newsletter (Loja e Consultor)
create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  source      text not null default 'store', -- 'store' ou 'consultor'
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint newsletter_email_source_key unique (email, source)
);

-- Habilita RLS na newsletter
alter table public.newsletter_subscribers enable row level security;

-- Políticas de RLS para Newsletter
drop policy if exists "Newsletter: inscrição pública" on public.newsletter_subscribers;
drop policy if exists "Newsletter: leitura e gestão por admin" on public.newsletter_subscribers;

-- Qualquer visitante pode se inscrever
create policy "Newsletter: inscrição pública"
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (true);

-- Apenas administradores e service role podem ler ou gerenciar
create policy "Newsletter: leitura e gestão por admin"
  on public.newsletter_subscribers
  for all
  to authenticated, service_role
  using ((select public.is_admin()) or (auth.role() = 'service_role'))
  with check ((select public.is_admin()) or (auth.role() = 'service_role'));

-- Permissões básicas
grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated, service_role;

-- 3. Atualiza cache do PostgREST
notify pgrst, 'reload schema';

commit;
