-- =============================================================================
-- TITI'S STORE — Migração SQL: Módulo de PDV & Notificações WhatsApp Evolution API
-- Como usar:
--   1. Acesse o painel do Supabase: https://supabase.com/dashboard
--   2. Vá em SQL Editor → New Query (Nova Consulta)
--   3. Cole TODO o conteúdo deste arquivo e clique em RUN (Executar)
-- =============================================================================

begin;

-- 1. Garante que o ID da tabela public.orders suporte identificadores de texto (ex: TITIS-PDV-123456-789)
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

-- 2. Garante todas as colunas necessárias na tabela public.orders
alter table public.orders
  add column if not exists customer_name          text not null default 'Cliente Balcão',
  add column if not exists customer_phone         text,
  add column if not exists customer_email         text,
  add column if not exists customer_cpf           text,
  add column if not exists payment_method         text,
  add column if not exists payment_provider_id    text,
  add column if not exists shipping_address       jsonb,
  add column if not exists shipping_service_name  text,
  add column if not exists shipping_price_cents   integer not null default 0,
  add column if not exists notes                  text,
  add column if not exists items                  jsonb not null default '[]'::jsonb,
  add column if not exists total_cents            integer,
  add column if not exists status                 text not null default 'novo',
  add column if not exists channel                text not null default 'whatsapp',
  add column if not exists paid_at                timestamptz,
  add column if not exists dispatched_at         timestamptz,
  add column if not exists created_at            timestamptz not null default now(),
  add column if not exists updated_at            timestamptz not null default now();

-- 3. Atualiza os CHECKs da tabela public.orders para aceitar os canais PDV e EXTERNA
alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_channel_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('novo', 'em_atendimento', 'concluido', 'cancelado', 'pending', 'paid')),
  add constraint orders_channel_check
    check (channel in ('whatsapp', 'online', 'mercadopago', 'pdv', 'externa'));

-- 4. Cria índices para performance de relatórios do PDV e controle de saídas
create index if not exists orders_channel_created_idx
  on public.orders (channel, created_at desc);

create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);

-- 5. Garante a tabela public.settings com permissões adequadas
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.settings enable row level security;

drop policy if exists "Configurações: leitura pública" on public.settings;
drop policy if exists "Configurações: gestão por admin e service_role" on public.settings;

create policy "Configurações: leitura pública"
  on public.settings
  for select
  to anon, authenticated, service_role
  using (true);

create policy "Configurações: gestão por admin e service_role"
  on public.settings
  for all
  to authenticated, service_role
  using ((select public.is_admin()) or (auth.role() = 'service_role'))
  with check ((select public.is_admin()) or (auth.role() = 'service_role'));

-- 6. Insere ou atualiza o bloco de configurações 'notifications' preservando dados existentes
insert into public.settings (key, value, updated_at)
values (
  'notifications',
  jsonb_build_object(
    'merchant_whatsapp_phone', '5531996000213',
    'merchant_notify_on_order', true,
    'evolution_api_url', coalesce((select value->>'evolution_api_url' from public.settings where key = 'notifications'), ''),
    'evolution_api_key', coalesce((select value->>'evolution_api_key' from public.settings where key = 'notifications'), ''),
    'evolution_instance_name', coalesce((select value->>'evolution_instance_name' from public.settings where key = 'notifications'), 'titis-store'),
    'ntfy_enabled', true,
    'ntfy_server_url', 'https://ntfy.sh',
    'ntfy_topic', 'titis-store-vendas',
    'ntfy_token', ''
  ),
  now()
)
on conflict (key) do update
set value = public.settings.value || excluded.value,
    updated_at = now();

-- 7. Garante permissões completas para criação e consulta de pedidos PDV
grant select, insert, update on public.orders to authenticated, service_role;
grant select, insert, update on public.settings to authenticated, service_role;

-- 8. Notifica o PostgREST para recarregar o schema imediatamente
notify pgrst, 'reload schema';

commit;
