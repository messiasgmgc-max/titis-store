-- =============================================================================
-- TITI'S STORE — MIGRAÇÃO SQL COMPLETA E UNIFICADA
-- E-commerce, Checkout Transparente, Melhor Envio, Rastreamento & Newsletter
--
-- Como usar:
--   1. Acesse o painel do Supabase: https://supabase.com/dashboard
--   2. Vá em SQL Editor → New Query (Nova Consulta)
--   3. Cole TODO o conteúdo deste arquivo e clique em RUN (Executar)
-- =============================================================================

begin;

-- 1. Garante que o ID da tabela orders aceite textos (ex: TITIS-M1X8-99A1)
do $$
begin
  if exists (
    select 1 
    from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'orders' 
      and column_name = 'id' 
      and data_type = 'uuid'
  ) then
    alter table public.orders alter column id drop default;
    alter table public.orders alter column id type text using id::text;
    alter table public.orders alter column id set default gen_random_uuid()::text;
  end if;
end;
$$;

-- 2. Colunas completas de E-commerce, Pagamento, Frete e Rastreio em public.orders
alter table public.orders
  add column if not exists customer_email          text,
  add column if not exists customer_cpf            text,
  add column if not exists payment_method          text,
  add column if not exists payment_provider_id     text,
  add column if not exists shipping_address        jsonb,
  add column if not exists shipping_service_id     text,
  add column if not exists shipping_service_name   text,
  add column if not exists shipping_price_cents    integer not null default 0,
  add column if not exists shipping_delivery_days  integer,
  add column if not exists shipping_label_url      text,
  add column if not exists tracking_code           text,
  add column if not exists tracking_carrier        text,
  add column if not exists tracking_url            text,
  add column if not exists melhor_envio_order_id   text,
  add column if not exists paid_at                 timestamptz,
  add column if not exists dispatched_at          timestamptz;

-- 3. Atualiza os CHECKs da tabela public.orders para aceitar os novos canais e status
alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_channel_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('novo', 'em_atendimento', 'concluido', 'cancelado', 'pending', 'paid')),
  add constraint orders_channel_check
    check (channel in ('whatsapp', 'online', 'mercadopago'));

-- 4. Permissões e RLS para public.orders
grant select, insert, update on public.orders to anon, authenticated, service_role;
alter table public.orders enable row level security;

drop policy if exists "Pedidos: criação pública" on public.orders;
drop policy if exists "Pedidos: leitura do próprio pedido ou admin" on public.orders;
drop policy if exists "Pedidos: atualização por admin ou service_role" on public.orders;

create policy "Pedidos: criação pública"
  on public.orders
  for insert
  to anon, authenticated
  with check (true);

create policy "Pedidos: leitura do próprio pedido ou admin"
  on public.orders
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Pedidos: atualização por admin ou service_role"
  on public.orders
  for update
  to authenticated, service_role
  using ((select public.is_admin()) or (auth.role() = 'service_role'))
  with check ((select public.is_admin()) or (auth.role() = 'service_role'));

-- 5. Colunas do E-commerce na tabela public.products
alter table public.products
  add column if not exists price_cents  integer,
  add column if not exists sizes        text[] not null default '{}',
  add column if not exists gallery      text[] not null default '{}',
  add column if not exists is_featured  boolean not null default false;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated, service_role;

-- 6. Tabela de inscritos na Newsletter (Loja & Consultor)
create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  source      text not null default 'store', -- 'store' ou 'consultor'
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint newsletter_email_source_key unique (email, source)
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "Newsletter: inscrição pública" on public.newsletter_subscribers;
drop policy if exists "Newsletter: leitura e gestão por admin" on public.newsletter_subscribers;

create policy "Newsletter: inscrição pública"
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (true);

create policy "Newsletter: leitura e gestão por admin"
  on public.newsletter_subscribers
  for all
  to authenticated, service_role
  using ((select public.is_admin()) or (auth.role() = 'service_role'))
  with check ((select public.is_admin()) or (auth.role() = 'service_role'));

grant insert on public.newsletter_subscribers to anon, authenticated;
grant select, update, delete on public.newsletter_subscribers to authenticated, service_role;

-- 7. Recarrega o cache do PostgREST imediatamente
notify pgrst, 'reload schema';

commit;
