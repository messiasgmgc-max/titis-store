-- =============================================================================
-- TITI'S STORE — Migração SQL: E-Commerce & Checkout Transparente
-- Como usar:
--   Supabase Dashboard → SQL Editor → Nova Consulta → Cole este código → Run
-- =============================================================================

begin;

-- 1. Permite IDs flexíveis (tanto UUIDs quanto códigos alfanuméricos TITIS-XXXX)
do $$
begin
  -- Se id for uuid, altera para text para aceitar códigos de pedidos da loja
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

-- 2. Adiciona colunas do E-commerce e Checkout Transparente na tabela public.orders
alter table public.orders
  add column if not exists customer_email     text,
  add column if not exists customer_cpf       text,
  add column if not exists payment_method     text,
  add column if not exists payment_provider_id text,
  add column if not exists shipping_address   jsonb,
  add column if not exists paid_at            timestamptz;

-- 3. Atualiza os CHECKs da tabela public.orders para aceitar pagamentos online
alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_channel_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('novo', 'em_atendimento', 'concluido', 'cancelado', 'pending', 'paid')),
  add constraint orders_channel_check
    check (channel in ('whatsapp', 'online', 'mercadopago'));

-- 4. Garante permissão para visitantes criarem pedidos no Checkout Transparente
grant select, insert, update on public.orders to anon, authenticated, service_role;

-- 5. Atualiza Políticas de RLS da tabela public.orders
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

-- 6. Tabela public.products — Garante colunas do E-commerce
alter table public.products
  add column if not exists price_cents  integer,
  add column if not exists sizes        text[] not null default '{}',
  add column if not exists gallery      text[] not null default '{}',
  add column if not exists is_featured  boolean not null default false;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated, service_role;

-- 7. Recarrega o cache do PostgREST para a API reconhecer as alterações na hora
notify pgrst, 'reload schema';

commit;
