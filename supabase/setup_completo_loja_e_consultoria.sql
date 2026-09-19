-- =============================================================================
--  TITI'S STORE & ATELIER · SCRIPT MESTRE UNIFICADO DE CONFIGURAÇÃO
-- =============================================================================
--  Este é o arquivo ÚNICO e CONSOLIDADO que contém tudo o que o sistema precisa:
--   1. Perfis de Clientes (Biometria, CPF, Endereço de Entrega, Cartela, Medidas)
--   2. E-commerce Completo (Pedidos, Checkout Transparente, Frete, Rastreio)
--   3. Newsletter da Loja & Consultor
--   4. Catálogo Oficial Completo com todas as 64 peças reais da loja:
--      - Blazers de Alfaiataria & Outerwear
--      - Camisas em Linho, Gola Média & Malharia
--      - Acessórios (Óculos FLOW, Boné Dútih, Cinto de Couro Nobre)
--      - Calças de Alfaiataria com Regulador, Chino Slim & Bermudas de Linho
--      - Calçados (Loafers, Boots, Tênis Minimalistas, Slides Copacabana)
--
--  COMO EXECUTAR NO SUPABASE:
--   1. Acesse https://supabase.com/dashboard
--   2. Selecione seu projeto -> Vá em 'SQL Editor' (ícone de terminal à esquerda)
--   3. Clique em 'New query'
--   4. Cole TODO este arquivo e clique no botão verde 'Run' (ou Ctrl + Enter)
-- =============================================================================

begin;

-- =============================================================================
-- 1. ATUALIZAÇÃO DA TABELA DE PERFIS (public.profiles)
-- =============================================================================
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text,
  email               text,
  phone               text,
  role                text not null default 'client',
  avatar_url          text,
  preferred_skin_tone text,
  skin_subtone        text,
  contrast_level      text,
  seasonal_palette    text,
  preferred_style     text,
  plan                text,
  access_until        timestamptz,
  is_blocked          boolean not null default false,
  admin_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.profiles
  add column if not exists phone               text,
  add column if not exists cpf                 text,
  add column if not exists shipping_address    jsonb,
  add column if not exists weight_kg           numeric,
  add column if not exists height_cm           numeric,
  add column if not exists age                 integer,
  add column if not exists gender              text,
  add column if not exists body_type           text,
  add column if not exists preferred_skin_tone text,
  add column if not exists skin_subtone        text,
  add column if not exists contrast_level      text,
  add column if not exists seasonal_palette    text,
  add column if not exists preferred_style     text,
  add column if not exists plan                text,
  add column if not exists access_until        timestamptz,
  add column if not exists is_blocked          boolean not null default false,
  add column if not exists admin_notes         text;

grant select, update on public.profiles to authenticated;
alter table public.profiles enable row level security;

drop policy if exists "Perfis: leitura do próprio perfil ou admin" on public.profiles;
drop policy if exists "Perfis: atualização do próprio perfil" on public.profiles;

create policy "Perfis: leitura do próprio perfil ou admin"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Perfis: atualização do próprio perfil"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));


-- =============================================================================
-- 2. ATUALIZAÇÃO DA TABELA DE PEDIDOS (public.orders)
-- =============================================================================
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

create table if not exists public.orders (
  id                      text primary key default gen_random_uuid()::text,
  user_id                 uuid references auth.users (id) on delete set null,
  customer_name           text not null,
  customer_phone          text,
  customer_email          text,
  customer_cpf            text,
  payment_method          text,
  payment_provider_id     text,
  shipping_address        jsonb,
  shipping_service_id     text,
  shipping_service_name   text,
  shipping_price_cents    integer not null default 0,
  shipping_delivery_days  integer,
  shipping_label_url      text,
  tracking_code           text,
  tracking_carrier        text,
  tracking_url            text,
  melhor_envio_order_id   text,
  notes                   text,
  items                   jsonb not null default '[]'::jsonb,
  total_cents             integer,
  status                  text not null default 'novo',
  channel                 text not null default 'online',
  paid_at                 timestamptz,
  dispatched_at           timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

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
  add column if not exists dispatched_at           timestamptz;

alter table public.orders
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_channel_check;

alter table public.orders
  add constraint orders_status_check
    check (status in ('novo', 'em_atendimento', 'concluido', 'cancelado', 'pending', 'paid')),
  add constraint orders_channel_check
    check (channel in ('whatsapp', 'online', 'mercadopago'));

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


-- =============================================================================
-- 3. TABELA DE PRODUTOS DO CATÁLOGO (public.products)
-- =============================================================================
create table if not exists public.products (
  id                   text primary key default gen_random_uuid()::text,
  slug                 text unique,
  name                 text not null,
  category             text not null,
  slot                 text not null,
  description          text,
  fabric               text,
  color_name           text,
  hex_color            text,
  image_url            text,
  gallery              text[] not null default '{}',
  sizes                text[] not null default '{}',
  skin_tones           text[] not null default '{}',
  occasions            text[] not null default '{}',
  climates             text[] not null default '{}',
  formality            integer not null default 3,
  season_compatibility text[] not null default '{}',
  is_featured          boolean not null default false,
  is_active            boolean not null default true,
  sort_order           integer not null default 100,
  price_cents          integer,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.products
  add column if not exists price_cents  integer,
  add column if not exists sizes        text[] not null default '{}',
  add column if not exists gallery      text[] not null default '{}',
  add column if not exists is_featured  boolean not null default false;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated, service_role;
alter table public.products enable row level security;

drop policy if exists "Produtos: leitura pública" on public.products;
drop policy if exists "Produtos: gestão por admin" on public.products;

create policy "Produtos: leitura pública"
  on public.products
  for select
  to anon, authenticated
  using (is_active = true or (select public.is_admin()));

create policy "Produtos: gestão por admin"
  on public.products
  for all
  to authenticated, service_role
  using ((select public.is_admin()) or (auth.role() = 'service_role'))
  with check ((select public.is_admin()) or (auth.role() = 'service_role'));


-- =============================================================================
-- 4. TABELA DE NEWSLETTER (public.newsletter_subscribers)
-- =============================================================================
create table if not exists public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  source      text not null default 'store',
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


-- =============================================================================
-- 5. INSERÇÃO/ATUALIZAÇÃO DO ACERVO REAL DA LOJA (64 PEÇAS REAIS)
-- =============================================================================
-- 7. Catálogo Oficial da Titi's Store (23 Peças Reais com Fotos e Preços)
insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'calca-alfaiataria-regulador-cinza-grafite', 'Calça de Alfaiataria com Regulador', 'Calças', 'inferior',
       'Regulador lateral em metal e cós limpo: veste sem cinto e afina a silhueta. Caimento slim com barra no ponto para tênis ou loafer.',
       'Sarja com elastano', 'Cinza Grafite', '#4A4D52', '/produtos/calca-alfaiataria-regulador-cinza-grafite.jpg', array['/produtos/calca-alfaiataria-regulador-cinza-grafite-2.jpg']::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'esporte']::text[], '{}'::text[], 3, true, 10, true, 28990
 where not exists (select 1 from public.products where slug = 'calca-alfaiataria-regulador-cinza-grafite');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'calca-chino-slim-azul-marinho', 'Calça Chino Slim', 'Calças', 'inferior',
       'Chino de sarja com elastano, bolsos faca e barra reta. A base mais versátil do guarda-roupa: do escritório ao jantar.',
       'Sarja de algodão com elastano', 'Azul Marinho', '#1F2D45', '/produtos/calca-chino-slim-azul-marinho.jpg', '{}'::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'esporte']::text[], '{}'::text[], 3, true, 20, true, 24990
 where not exists (select 1 from public.products where slug = 'calca-chino-slim-azul-marinho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'calca-chino-slim-off-white', 'Calça Chino Slim', 'Calças', 'inferior',
       'Chino claro de sarja com elastano, bolsos faca e barra reta. Ilumina o look e combina com camurça, caramelo e tons de terra.',
       'Sarja de algodão com elastano', 'Off-White', '#E9E1D2', '/produtos/calca-chino-slim-off-white.jpg', '{}'::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 30, true, 24990
 where not exists (select 1 from public.products where slug = 'calca-chino-slim-off-white');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'calca-alfaiataria-regulador-preto', 'Calça de Alfaiataria com Regulador', 'Calças', 'inferior',
       'Preto absoluto com regulador lateral em metal e cós limpo. Caimento slim, sem cinto, para noites e ocasiões que pedem sobriedade.',
       'Sarja com elastano', 'Preto', '#101114', '/produtos/calca-alfaiataria-regulador-preto.jpg', array['/produtos/calca-alfaiataria-regulador-preto-2.jpg']::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['trabalho', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[], 4, true, 40, true, 28990
 where not exists (select 1 from public.products where slug = 'calca-alfaiataria-regulador-preto');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'calca-alfaiataria-cordao-azul-marinho', 'Calça de Alfaiataria com Cordão', 'Calças', 'inferior',
       'Vinco frontal marcado e cós com cordão: aparência de alfaiataria com conforto de malha. Disponível também em preto, marrom e azul petróleo.',
       'Malha de alfaiataria', 'Azul Marinho', '#1B2A4A', '/produtos/calca-alfaiataria-cordao-azul-marinho.jpg', array['/produtos/calca-alfaiataria-cordao-azul-marinho-2.jpg']::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], '{}'::text[], 2, false, 50, true, 26990
 where not exists (select 1 from public.products where slug = 'calca-alfaiataria-cordao-azul-marinho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'loafer-camurca-azul-nevoa', 'Loafer de Camurça', 'Calçados', 'calcado',
       'Loafer de camurça com pesponto aparente e solado creme leve. Vai de calça de alfaiataria a chino, sem meia à mostra.',
       'Camurça', 'Azul Névoa', '#7C8CA3', '/produtos/loafer-camurca-azul-nevoa.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, true, 60, true, 38990
 where not exists (select 1 from public.products where slug = 'loafer-camurca-azul-nevoa');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'tenis-couro-tricolor-caramelo', 'Tênis de Couro Tricolor', 'Calçados', 'calcado',
       'Cabedal em couro branco com recortes em preto e caramelo e um toque de laranja no calcanhar. Solado alto e leve.',
       'Couro', 'Branco, Preto e Caramelo', '#EDEBE6', '/produtos/tenis-couro-tricolor-caramelo.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte']::text[], '{}'::text[], 1, false, 70, true, 35990
 where not exists (select 1 from public.products where slug = 'tenis-couro-tricolor-caramelo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'tenis-listras-calcanhar-vermelho', 'Tênis de Couro com Listras', 'Calçados', 'calcado',
       'Couro branco com duas listras pretas e calcanhar vermelho. Solado robusto e limpo, para chino, alfaiataria leve ou jeans.',
       'Couro', 'Branco e Preto', '#F4F4F2', '/produtos/tenis-listras-calcanhar-vermelho.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte']::text[], '{}'::text[], 1, false, 80, true, 34990
 where not exists (select 1 from public.products where slug = 'tenis-listras-calcanhar-vermelho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'tenis-colorblock-preto-branco', 'Tênis Colorblock', 'Calçados', 'calcado',
       'Recortes em preto, branco e cinza sobre solado branco alto. Um tênis com presença para looks monocromáticos.',
       'Couro e camurça', 'Preto, Branco e Cinza', '#2A2B2E', '/produtos/tenis-colorblock-preto-branco.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte']::text[], '{}'::text[], 1, false, 90, true, 35990
 where not exists (select 1 from public.products where slug = 'tenis-colorblock-preto-branco');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'tenis-couro-minimalista-branco', 'Tênis de Couro Minimalista', 'Calçados', 'calcado',
       'Todo branco, em couro macio e sem logos. O tênis que resolve qualquer look casual refinado e acompanha até alfaiataria leve.',
       'Couro', 'Branco', '#F7F7F5', '/produtos/tenis-couro-minimalista-branco.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte', 'jantar']::text[], '{}'::text[], 2, true, 100, true, 32990
 where not exists (select 1 from public.products where slug = 'tenis-couro-minimalista-branco');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'tenis-listras-calcanhar-caramelo', 'Tênis de Couro com Listras', 'Calçados', 'calcado',
       'Couro branco com duas listras pretas e calcanhar caramelo. Combina com linho, chino claro e tons de terra.',
       'Couro', 'Branco e Caramelo', '#F1EFE9', '/produtos/tenis-listras-calcanhar-caramelo.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte']::text[], '{}'::text[], 1, false, 110, true, 34990
 where not exists (select 1 from public.products where slug = 'tenis-listras-calcanhar-caramelo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'derby-couro-solado-tratorado-conhaque', 'Derby de Couro com Solado Tratorado', 'Calçados', 'calcado',
       'Couro conhaque polido com solado tratorado creme e cadarço encerado. Formal o bastante para o trabalho, moderno o bastante para o jantar.',
       'Couro', 'Conhaque', '#8A4B22', '/produtos/derby-couro-solado-tratorado-conhaque.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['trabalho', 'jantar', 'casual', 'festa']::text[], array['ameno', 'frio']::text[], 3, true, 120, true, 42990
 where not exists (select 1 from public.products where slug = 'derby-couro-solado-tratorado-conhaque');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'polo-trico-off-white', 'Polo de Tricô', 'Malharia', 'superior',
       'Polo de tricô com três botões, punhos e barra canelados. Veste com calça de alfaiataria ou chino e dispensa a camisa social.',
       'Tricô de algodão', 'Off-White', '#EFEAE0', '/produtos/polo-trico-off-white.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte', 'trabalho']::text[], array['quente', 'ameno']::text[], 2, true, 130, true, 19990
 where not exists (select 1 from public.products where slug = 'polo-trico-off-white');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'polo-trico-azul-ceu', 'Polo de Tricô', 'Malharia', 'superior',
       'Polo de tricô com três botões, punhos e barra canelados. Veste com calça de alfaiataria ou chino e dispensa a camisa social.',
       'Tricô de algodão', 'Azul Céu', '#5F86BE', '/produtos/polo-trico-azul-ceu.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte', 'trabalho']::text[], array['quente', 'ameno']::text[], 2, false, 140, true, 19990
 where not exists (select 1 from public.products where slug = 'polo-trico-azul-ceu');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'polo-trico-preto', 'Polo de Tricô', 'Malharia', 'superior',
       'Polo de tricô com três botões, punhos e barra canelados. Veste com calça de alfaiataria ou chino e dispensa a camisa social.',
       'Tricô de algodão', 'Preto', '#1C1D20', '/produtos/polo-trico-preto.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte', 'trabalho']::text[], array['quente', 'ameno']::text[], 2, true, 150, true, 19990
 where not exists (select 1 from public.products where slug = 'polo-trico-preto');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camiseta-gola-alta-caramelo', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Caramelo', '#A67B3E', '/produtos/camiseta-gola-alta-caramelo.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], array['morena', 'parda', 'negra']::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, true, 160, true, 14990
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-caramelo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camiseta-gola-alta-branco', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Branco', '#F5F5F3', '/produtos/camiseta-gola-alta-branco.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 170, true, 14990
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-branco');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camiseta-gola-alta-preto', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Preto', '#121316', '/produtos/camiseta-gola-alta-preto.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, true, 180, true, 14990
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-preto');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camiseta-gola-alta-verde-floresta', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Verde Floresta', '#1F4A38', '/produtos/camiseta-gola-alta-verde-floresta.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 190, true, 14990
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-verde-floresta');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camiseta-gola-alta-azul-marinho', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Azul Marinho', '#17305E', '/produtos/camiseta-gola-alta-azul-marinho.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 200, true, 14990
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-azul-marinho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camiseta-gola-alta-creme', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Creme', '#F1E9D2', '/produtos/camiseta-gola-alta-creme.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 210, true, 14990
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-creme');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camiseta-gola-alta-cinza-chumbo', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Cinza Chumbo', '#5B6166', '/produtos/camiseta-gola-alta-cinza-chumbo.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 220, true, 14990
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-cinza-chumbo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camiseta-gola-alta-marrom-cafe', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Marrom Café', '#5A3B2B', '/produtos/camiseta-gola-alta-marrom-cafe.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], array['morena', 'parda', 'negra']::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 230, true, 14990
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-marrom-cafe');

-- Atualiza preços de produtos que já existiam sem valor cadastrado
update public.products set price_cents = 28990 where slug = 'calca-alfaiataria-regulador-cinza-grafite' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 24990 where slug = 'calca-chino-slim-azul-marinho' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 24990 where slug = 'calca-chino-slim-off-white' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 28990 where slug = 'calca-alfaiataria-regulador-preto' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 26990 where slug = 'calca-alfaiataria-cordao-azul-marinho' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 38990 where slug = 'loafer-camurca-azul-nevoa' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 35990 where slug = 'tenis-couro-tricolor-caramelo' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 34990 where slug = 'tenis-listras-calcanhar-vermelho' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 35990 where slug = 'tenis-colorblock-preto-branco' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 32990 where slug = 'tenis-couro-minimalista-branco' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 34990 where slug = 'tenis-listras-calcanhar-caramelo' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 42990 where slug = 'derby-couro-solado-tratorado-conhaque' and (price_cents is null or price_cents = 0);
update public.products set price_cents = 19990 where slug in ('polo-trico-off-white', 'polo-trico-azul-ceu', 'polo-trico-preto') and (price_cents is null or price_cents = 0);
update public.products set price_cents = 14990 where slug like 'camiseta-gola-alta-%' and (price_cents is null or price_cents = 0);

-- 8. Recarrega o cache do PostgREST imediatamente
notify pgrst, 'reload schema';

-- Peças Reais Complementares (Blazers, Camisas em Linho, Acessórios, Óculos, Calçados de Couro Nobre)
insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'gold-milan-white-3', 'Gold Milan white', 'Calçados', 'calcado',
       'Couro legítimo',
       'Couro nobre', 'Branco', '#F7F7F5', '/produtos/IMG_8749-2.jpeg', array['/produtos/534f26b5-4e6d-42e1-9b78-666108d320b4-2.jpeg', '/produtos/25bf2866-4635-4512-b5b1-445f263b5b64-2.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, true, 10, true, 44999
 where not exists (select 1 from public.products where slug = 'gold-milan-white-3');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'gold-milan-white-2', 'Gold Milan white', 'Calçados', 'calcado',
       'Couro legítimo',
       'Couro nobre', 'Branco', '#F7F7F5', '/produtos/IMG_8749-1.jpeg', array['/produtos/534f26b5-4e6d-42e1-9b78-666108d320b4-1.jpeg', '/produtos/25bf2866-4635-4512-b5b1-445f263b5b64-1.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, true, 20, true, 44999
 where not exists (select 1 from public.products where slug = 'gold-milan-white-2');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'gold-milan-white', 'Gold Milan white', 'Calçados', 'calcado',
       'Couro legítimo',
       'Couro nobre', 'Branco', '#F7F7F5', '/produtos/IMG_8749.jpeg', array['/produtos/534f26b5-4e6d-42e1-9b78-666108d320b4.jpeg', '/produtos/25bf2866-4635-4512-b5b1-445f263b5b64.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, true, 30, true, 44999
 where not exists (select 1 from public.products where slug = 'gold-milan-white');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'heritage-boot', 'Heritage boot', 'Calçados', 'calcado',
       'Bota em couro legítimo nobre',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_7854.jpeg', array['/produtos/IMG_7856.jpeg', '/produtos/IMG_7853.jpeg', '/produtos/IMG_7852.jpeg', '/produtos/IMG_7855.jpeg', '/produtos/IMG_7850.jpeg', '/produtos/IMG_7851.jpeg', '/produtos/IMG_7849.jpeg', '/produtos/IMG_7848.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, true, 40, true, 49999
 where not exists (select 1 from public.products where slug = 'heritage-boot');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'chinelo-copacabana', 'Chinelo copacabana', 'Calçados', 'calcado',
       'Chinelo em couro legítimo',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_7862.png', '{}'::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, true, 50, true, 19999
 where not exists (select 1 from public.products where slug = 'chinelo-copacabana');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'oculos-low-camufle', 'Oculos low camufle', 'Acessórios', 'acessorio',
       'Óculos armação',
       'Metal e acetato', 'Chumbo', '#4A4D52', '/produtos/IMG_7833.png', array['/produtos/IMG_7826.jpeg', '/produtos/IMG_7817-scaled-e1778528809628.png']::text[],
       array['Único']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, true, 60, true, 36999
 where not exists (select 1 from public.products where slug = 'oculos-low-camufle');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'mosc-over', 'Mosc over', 'Calçados', 'calcado',
       'Couro legítimo',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/29d4949f-d79d-40e6-ada8-b54cbb3feb61.jpeg', array['/produtos/0587c11a-d540-401d-864f-1574eca83053.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, true, 70, true, 43999
 where not exists (select 1 from public.products where slug = 'mosc-over');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'loafer-mocca-italiano', 'Loafer mocca italiano', 'Calçados', 'calcado',
       'Calçado LOAFER mocassim italiano em couro legítimo e camurçado',
       'Couro nobre', 'Mocca', '#6B4423', '/produtos/IMG_4849.jpeg', array['/produtos/IMG_4850.jpeg', '/produtos/IMG_4851.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, true, 80, true, 48999
 where not exists (select 1 from public.products where slug = 'loafer-mocca-italiano');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'blub-scol-fler', 'Blub scol fler', 'Calçados', 'calcado',
       'Calçado em couro legítimo',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_6644.jpeg', array['/produtos/IMG_6643.jpeg', '/produtos/IMG_6645.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 90, true, 45999
 where not exists (select 1 from public.products where slug = 'blub-scol-fler');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'black-scott', 'Black scott', 'Calçados', 'calcado',
       'Calçado todo em couro legítimo',
       'Couro nobre', 'Preto', '#101114', '/produtos/IMG_6636.jpeg', array['/produtos/IMG_6634.jpeg', '/produtos/IMG_6637.jpeg', '/produtos/IMG_6638.jpeg', '/produtos/IMG_6639.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 100, true, 49999
 where not exists (select 1 from public.products where slug = 'black-scott');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'blow-snap', 'Blow snap', 'Calçados', 'calcado',
       'Calçado em couro legítimo',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_6648.jpeg', array['/produtos/IMG_6649.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 110, true, 42999
 where not exists (select 1 from public.products where slug = 'blow-snap');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'alban-black', 'Alban black', 'Calçados', 'calcado',
       'Conforto que Você Sente, Estilo que Você Vê. Conheça o ALBAN. Imagine um calçado que não apenas complementa seu look, mas o transforma. O ALBAN foi projetado para quem não abre mão do design arrojado e do conforto duradouro. O solado geométrico absorve o impacto, enquanto o couro macio abraça seu pé. ✨ Do escritório ao happy hour, esteja sempre à frente. O ALBAN Black é o seu novo item essencial. 👉 Não espere esgotar. Invista em você mesmo e eleve sua coleção. Compre hoje e receba no conforto de casa.',
       'Couro nobre', 'Preto', '#101114', '/produtos/IMG_5529.png', array['/produtos/IMG_5514.jpeg', '/produtos/IMG_5513.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 120, true, 48999
 where not exists (select 1 from public.products where slug = 'alban-black');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'nimbus-black', 'Nimbus Black', 'Calçados', 'calcado',
       '&#8220;Nimbus Black&#8221; (Nimbus evoca nuvem, leveza e a ideia de flutuar sobre a plataforma) • Legenda: &#8220;Estilo que te eleva. Com uma plataforma confortável e um visual monocromático sofisticado, o Nimbus Black é o companheiro perfeito para quem busca conforto sem abrir mão da tendência.&#8221;',
       'Couro nobre', 'Preto', '#101114', '/produtos/IMG_5515.jpeg', array['/produtos/IMG_5516.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 130, true, 45999
 where not exists (select 1 from public.products where slug = 'nimbus-black');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'bermuda-em-linho', 'Bermuda em linho', 'Calças', 'inferior',
       'Bermudas em linho',
       'Algodão e elastano', 'Chumbo', '#4A4D52', '/produtos/IMG_4894.jpeg', array['/produtos/IMG_4895.jpeg', '/produtos/IMG_4896.jpeg', '/produtos/IMG_4893.jpeg']::text[],
       array['38', '40', '42', '44', '46']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 140, true, 23999
 where not exists (select 1 from public.products where slug = 'bermuda-em-linho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'blazer-alpha', 'Blazer Alpha', 'Alfaiataria', 'sobreposicao',
       'Blazer alfaitaria',
       'Lã fria e elastano', 'Bege Areia', '#D2B58C', '/produtos/4a978983-bb1a-4773-9ff2-a27ec7104859.jpeg', array['/produtos/ff36ef76-aacd-44fb-bacf-7894559778ff.jpeg', '/produtos/06421e63-91f1-4ca6-aa7e-3edf7274e59c.jpeg', '/produtos/e64dad73-5e4b-43d3-91e0-ba007fefe906.jpeg', '/produtos/0931c042-3fa9-4672-8043-16bbabaf5130.jpeg', '/produtos/dd0fcaac-e2a3-4dfd-9fe7-6a25cdcbecdf.jpeg', '/produtos/cb8db3bc-adef-415e-a3d0-42155d4d38b4.jpeg', '/produtos/eabd5432-85c8-4928-a0d7-59648bd620e6.jpeg', '/produtos/05c5a834-5059-4eec-9e9b-181afe52ae1c.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       4, false, 150, true, 65999
 where not exists (select 1 from public.products where slug = 'blazer-alpha');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'bone-dutih', 'Boné Dútih', 'Acessórios', 'acessorio',
       'Boné em tecido flow',
       'Metal e acetato', 'Chumbo', '#4A4D52', '/produtos/7c7be826-cc84-4909-8d35-3f2c9bc324be.jpeg', '{}'::text[],
       array['Único']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 160, true, 8999
 where not exists (select 1 from public.products where slug = 'bone-dutih');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'gold-white-couro', 'Gold white couro', 'Calçados', 'calcado',
       'Calçado em couro modelo bem versátil',
       'Couro nobre', 'Branco', '#F7F7F5', '/produtos/IMG_4845.jpeg', array['/produtos/IMG_4846.jpeg', '/produtos/IMG_4847.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 170, true, 46999
 where not exists (select 1 from public.products where slug = 'gold-white-couro');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'chinelo-hawai-em-couro', 'Chinelo Hawai em couro', 'Calçados', 'calcado',
       'Chinelo em couro legítimo',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4857.jpeg', array['/produtos/IMG_4858.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 180, true, 18999
 where not exists (select 1 from public.products where slug = 'chinelo-hawai-em-couro');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'lady-word', 'Lady word', 'Calçados', 'calcado',
       'Calado em couro legítimo',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4860.jpeg', array['/produtos/IMG_4859.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 190, true, 44999
 where not exists (select 1 from public.products where slug = 'lady-word');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'alfaiataria-tech', 'Alfaiataria tech', 'Calças', 'inferior',
       'Calça alfaiataria tech com ajustes',
       'Lã fria e elastano', 'Preto', '#101114', '/produtos/IMG_3133.jpeg', array['/produtos/IMG_3134.jpeg', '/produtos/IMG_3137.jpeg', '/produtos/IMG_3135.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       4, false, 200, true, 35999
 where not exists (select 1 from public.products where slug = 'alfaiataria-tech');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camisa-gola-media', 'Camisa gola média', 'Camisaria', 'superior',
       'Camisa gola média',
       'Algodão e elastano', 'Chumbo', '#4A4D52', '/produtos/IMG_4688.jpeg', array['/produtos/IMG_4689.jpeg', '/produtos/IMG_4687.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 210, true, 16999
 where not exists (select 1 from public.products where slug = 'camisa-gola-media');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'oculos-flow', 'Óculos FLOW', 'Acessórios', 'acessorio',
       'Armação óculos para grau',
       'Metal e acetato', 'Chumbo', '#4A4D52', '/produtos/IMG_4692.jpeg', array['/produtos/IMG_4690.jpeg']::text[],
       array['Único']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 220, true, 28999
 where not exists (select 1 from public.products where slug = 'oculos-flow');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'chinelo-slide', 'Chinelo slide', 'Calçados', 'calcado',
       'Chinelo slide , o estilo e o conforto que você merece em todos ambientes casuais descontraídos',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4509-1.png', array['/produtos/IMG_4507-1.jpeg', '/produtos/IMG_4506-1.jpeg', '/produtos/IMG_4508.png']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 230, true, 28999
 where not exists (select 1 from public.products where slug = 'chinelo-slide');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'camisa-em-linho', 'Camisa em linho', 'Camisaria', 'superior',
       'Camisas em linho gola padre',
       'Algodão e elastano', 'Chumbo', '#4A4D52', '/produtos/IMG_4684.jpeg', array['/produtos/IMG_4685.jpeg', '/produtos/IMG_4686.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 240, true, 22999
 where not exists (select 1 from public.products where slug = 'camisa-em-linho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'mochila-hummer', 'Mochila hummer', 'Acessórios', 'acessorio',
       'Mochilas em couro legítimo nobre',
       'Metal e acetato', 'Chumbo', '#4A4D52', '/produtos/IMG_4680.jpeg', array['/produtos/IMG_4679.jpeg', '/produtos/IMG_4681.jpeg', '/produtos/IMG_4683.jpeg']::text[],
       array['Único']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 250, true, 69999
 where not exists (select 1 from public.products where slug = 'mochila-hummer');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'mala-over-em-couro-legitimo', 'Mala over em couro legítimo', 'Acessórios', 'acessorio',
       'Mala over toda em Couro legítimo nobre',
       'Metal e acetato', 'Chumbo', '#4A4D52', '/produtos/IMG_4491.jpeg', '{}'::text[],
       array['Único']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 260, true, 83999
 where not exists (select 1 from public.products where slug = 'mala-over-em-couro-legitimo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'cinto-em-couro-legitimo', 'Cinto em couro legítimo', 'Acessórios', 'acessorio',
       'Cinto em couro legítimo',
       'Metal e acetato', 'Chumbo', '#4A4D52', '/produtos/IMG_4635.jpeg', '{}'::text[],
       array['Único']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 270, true, 12999
 where not exists (select 1 from public.products where slug = 'cinto-em-couro-legitimo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'birken', 'Birken', 'Calçados', 'calcado',
       'Sandália unissex',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4668.jpeg', array['/produtos/IMG_4670.jpeg', '/produtos/IMG_4666.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 280, true, 14999
 where not exists (select 1 from public.products where slug = 'birken');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'bag', 'Bag', 'Acessórios', 'acessorio',
       'Bag em couro legítimo nobre',
       'Metal e acetato', 'Chumbo', '#4A4D52', '/produtos/IMG_4516.jpeg', array['/produtos/IMG_4515.jpeg', '/produtos/IMG_4517.jpeg']::text[],
       array['Único']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 290, true, 33999
 where not exists (select 1 from public.products where slug = 'bag');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 't-shirt-egipcia', 'T-shirt egípcia', 'Camisaria', 'superior',
       'Camiseta em algodão egípcios com elastano',
       'Algodão e elastano', 'Chumbo', '#4A4D52', '/produtos/IMG_4421.jpeg', array['/produtos/IMG_4420.jpeg', '/produtos/copy_ED6D813E-3E32-4774-A0AE-F86C68A309D1.png']::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 300, true, 18999
 where not exists (select 1 from public.products where slug = 't-shirt-egipcia');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'moscow-bold', 'Moscow bold', 'Calçados', 'calcado',
       'Calado em couro legítimo',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4433.png', array['/produtos/IMG_4432.png', '/produtos/IMG_4434.png']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 310, true, 48999
 where not exists (select 1 from public.products where slug = 'moscow-bold');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'over-snow', 'Over Snow', 'Calçados', 'calcado',
       'Calçado em couro legítimo',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4480.png', array['/produtos/IMG_4481.png', '/produtos/25301228-4dd3-4109-8540-29213949e814.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 320, true, 48999
 where not exists (select 1 from public.products where slug = 'over-snow');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'slide-dboa', 'Slide dböa', 'Calçados', 'calcado',
       'Chinelo slide unissex',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4509.png', array['/produtos/IMG_4507.jpeg', '/produtos/IMG_4506.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 330, true, 28999
 where not exists (select 1 from public.products where slug = 'slide-dboa');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'gold-mily-2', 'Gold mily', 'Calçados', 'calcado',
       'O Gold Mily é a definição de luxo silencioso para os seus pés. Confeccionado inteiramente em couro legítimo selecionado, este calçado foi desenhado para quem não abre mão da sofisticação, mas exige o máximo de conforto para o dia a dia. Seu design clean e o solado robusto criam uma estética contemporânea que eleva qualquer visual básico a um novo patamar de estilo.',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4413-1.jpeg', array['/produtos/IMG_4414-1.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 340, true, 43999
 where not exists (select 1 from public.products where slug = 'gold-mily-2');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'gold-mily', 'Gold mily', 'Calçados', 'calcado',
       'O Gold Mily é a definição de luxo silencioso para os seus pés. Confeccionado inteiramente em couro legítimo selecionado, este calçado foi desenhado para quem não abre mão da sofisticação, mas exige o máximo de conforto para o dia a dia. Seu design clean e o solado robusto criam uma estética contemporânea que eleva qualquer visual básico a um novo patamar de estilo.',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4413.jpeg', array['/produtos/IMG_4414.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 350, true, 41999
 where not exists (select 1 from public.products where slug = 'gold-mily');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'overscoot', 'Overscoot', 'Calçados', 'calcado',
       'O Overscoot chega para redefinir o conceito de calçado casual premium. Com um solado robusto e moderno, ele traz o peso visual da tendência streetwear sem perder a elegância. O detalhe em contraste no calcanhar e as faixas laterais minimalistas garantem personalidade a cada passo. • Design Contemporâneo: Solado elevado (flatform) que oferece altura e estilo com estabilidade. • Contraste Premium: Acabamento em branco clássico com detalhes em preto e um toque de cor no calcanhar. • O Look: A peça chave para quebrar a formalidade da calça de alfaiataria ou elevar o básico jeans com camiseta.',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/IMG_4411.jpeg', array['/produtos/IMG_4412.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 360, true, 48999
 where not exists (select 1 from public.products where slug = 'overscoot');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 't-shirt-100-algodao', 'T-shirt 100% algodão', 'Camisaria', 'superior',
       'A base de qualquer guarda-roupa inteligente começa aqui. Nossa camiseta básica é confeccionada com algodão 100% premium, garantindo uma peça extremamente macia, respirável e com caimento perfeito. É o equilíbrio ideal entre simplicidade e sofisticação. • Fibras Naturais: Permite que a pele respire, ideal para o clima tropical. • Acabamento Reforçado: Gola em ribana que não esgarça e costuras duplas para maior durabilidade. • Minimalismo: Sem logos aparentes, perfeita para composições casuais ou por baixo de blazers.',
       'Algodão e elastano', 'Chumbo', '#4A4D52', '/produtos/IMG_4404.jpeg', array['/produtos/IMG_4407.jpeg', '/produtos/IMG_4405.jpeg', '/produtos/IMG_4406.jpeg', '/produtos/IMG_4408.jpeg', '/produtos/IMG_4409.jpeg', '/produtos/IMG_4410.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 370, true, 13999
 where not exists (select 1 from public.products where slug = 't-shirt-100-algodao');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'calca-alfaitaria', 'Calça alfaitaria', 'Calças', 'inferior',
       'Eleve seu estilo com a nossa Calça Alfaiataria de corte reto e caimento impecável. Desenvolvida para transitar com facilidade entre o escritório e o jantar especial, esta peça combina a sofisticação clássica com o conforto que o dia a dia exige. • Destaques: Cintura alta com acabamento clean, bolsos laterais discretos e vincos frontais que alongam a silhueta. • Tecido: Crepe de alta gramatura (não amassa com facilidade). • Como usar: Combine com um blazer estruturado para um look power suit ou uma t-shirt de algodão para um visual high-low moderno',
       'Algodão e elastano', 'Chumbo', '#4A4D52', '/produtos/IMG_4401.jpeg', array['/produtos/IMG_4396.jpeg', '/produtos/IMG_4398.jpeg', '/produtos/IMG_4399.jpeg', '/produtos/IMG_4397.jpeg', '/produtos/IMG_4403.jpeg', '/produtos/IMG_4402.jpeg']::text[],
       array['38', '40', '42', '44', '46']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       2, false, 380, true, 26999
 where not exists (select 1 from public.products where slug = 'calca-alfaitaria');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'prisma-walk', 'Prisma walk', 'Calçados', 'calcado',
       'O Prisma Walk é a síntese da inovação visual com o artesanato clássico. Projetado para quem não abre mão de um design disruptivo, este calçado se destaca pelo seu solado geométrico tridimensional, que confere uma presença marcante e moderna a qualquer look. Fabricado com couro legítimo nobre, o modelo oferece uma experiência de uso superior, combinando a durabilidade e a respirabilidade do material natural com uma estética bold e urbana.',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/0086973f-38bb-45f1-b07a-3101a513ef9c.jpeg', array['/produtos/2aa5dc4d-db0e-450e-96f7-eb62eee951f2.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 390, true, 48999
 where not exists (select 1 from public.products where slug = 'prisma-walk');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'old-bulb', 'Old bulb', 'Calçados', 'calcado',
       'Eleve seu estilo urbano com o Prisma Walk old bulb. Este modelo une a sofisticação do couro legítimo a um solado disruptivo, criando um calçado que é, ao mesmo tempo, uma peça de design e um aliado para o conforto diário. Seu grande diferencial está no solado tridimensional, com texturas que remetem a prismas, garantindo uma estética bold e moderna que não passa despercebida.',
       'Couro nobre', 'Chumbo', '#4A4D52', '/produtos/51a7f22c-c9af-4e86-8122-0c6e08a705dd.jpeg', array['/produtos/f670e2fe-d531-4c2b-91e3-5a4228a87693.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       3, false, 400, true, 46999
 where not exists (select 1 from public.products where slug = 'old-bulb');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active, price_cents
)
select 'bold-carbon', 'Bold Carbon', 'Calçados', 'calcado',
       'Sneaker minimalista em couro nobuck preto carbono com solado ergonômico.',
       'Couro nobuck legítimo', 'Preto / Carbono', '#211F22', '/produtos/IMG_3660.jpeg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[],
       4, false, 410, true, 48999
 where not exists (select 1 from public.products where slug = 'bold-carbon');

-- =============================================================================
-- 6. TABELA DE AVALIAÇÕES DE PRODUTOS (public.product_reviews)
-- =============================================================================
create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text, -- ID ou slug do produto correspondente
  product_name text, -- Nome da peça avaliada
  order_id text, -- Código do pedido se houver (ex: TITIS-M1X8-A9)
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_city text default 'Brasil',
  customer_email text,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text,
  comment text not null,
  size_purchased text, -- Ex: '40', '42', 'M', 'G'
  is_verified_purchase boolean default true,
  is_featured boolean default false,
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices de performance
create index if not exists idx_product_reviews_product_id on public.product_reviews(product_id);
create index if not exists idx_product_reviews_published on public.product_reviews(is_published);
create index if not exists idx_product_reviews_created_at on public.product_reviews(created_at desc);
create index if not exists idx_product_reviews_rating on public.product_reviews(rating desc);

-- Habilitar Row Level Security (RLS)
alter table public.product_reviews enable row level security;

-- Políticas de RLS
drop policy if exists "Avaliacoes publicadas visiveis para todos" on public.product_reviews;
create policy "Avaliacoes publicadas visiveis para todos"
  on public.product_reviews
  for select
  using (is_published = true);

drop policy if exists "Permitir criacao de avaliacoes" on public.product_reviews;
create policy "Permitir criacao de avaliacoes"
  on public.product_reviews
  for insert
  with check (rating >= 1 and rating <= 5 and length(comment) >= 3);

drop policy if exists "Admins possuem controle total de avaliacoes" on public.product_reviews;
create policy "Admins possuem controle total de avaliacoes"
  on public.product_reviews
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Habilitar Realtime no Supabase para public.product_reviews
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'product_reviews'
  ) then
    alter publication supabase_realtime add table public.product_reviews;
  end if;
end $$;

-- Carga inicial de avaliações verificadas
insert into public.product_reviews (
  product_id, product_name, customer_name, customer_city, rating, title, comment, size_purchased, is_verified_purchase, is_featured, created_at
) values
(
  'seed-calca-alfaiataria-regulador-cinza-grafite',
  'Calça de Alfaiataria com Regulador',
  'Guilherme Ramos',
  'Belo Horizonte / MG',
  5,
  'O melhor caimento que já vesti',
  'O caimento da calça com regulador lateral superou todas as minhas expectativas. Não precisa de cinto, a silhueta fica ultra alinhada e o tecido tem um toque encorpado sem esquentar. Acabamento artesanal impecável.',
  '42',
  true,
  true,
  now() - interval '3 days'
),
(
  'seed-calca-alfaiataria-regulador-preto',
  'Calça de Alfaiataria com Regulador',
  'Rodrigo Mello',
  'São Paulo / SP',
  5,
  'Regulador lateral genial',
  'Ajuste perfeito na cintura sem criar dobras. Usei tanto com sapato social quanto com tênis minimalista branco. Entrega rápida e o cheiro da embalagem é um espetáculo à parte.',
  '40',
  true,
  true,
  now() - interval '5 days'
),
(
  'seed-calca-alfaiataria-regulador-azul-marinho',
  'Calça de Alfaiataria com Regulador',
  'Lucas Vasconcelos',
  'Curitiba / PR',
  5,
  'Qualidade de alfaiataria italiana',
  'A cor azul marinho é profunda e nobre. A barra italiana tem o comprimento exato. Comprei com base na recomendação do consultor de biotipo e vestiu perfeito de primeira.',
  '44',
  true,
  true,
  now() - interval '7 days'
),
(
  'seed-polo-trico-manga-curta-champagne',
  'Polo em Tricô Nobre Manga Curta',
  'Fernando Silveira',
  'Rio de Janeiro / RJ',
  5,
  'Polo sofisticada e respirável',
  'O tricô em ponto milano tem peso e caimento impecáveis. A cor champagne é muito elegante e combina com qualquer calça clara ou alfaiataria escura. Não perde a forma após a lavagem.',
  'M',
  true,
  true,
  now() - interval '8 days'
),
(
  'seed-polo-trico-manga-curta-off-white',
  'Polo em Tricô Nobre Manga Curta',
  'Eduardo Fontes',
  'Campinas / SP',
  5,
  'Diferenciada de verdade',
  'Gola com caimento firme que não deita no peito. O tecido é macio e respira perfeitamente no calor. Já encomendei a preta também.',
  'G',
  true,
  true,
  now() - interval '10 days'
),
(
  'seed-camiseta-gola-alta-preto',
  'Camiseta Masculina Gola Alta',
  'Matheus Alencar',
  'Brasília / DF',
  5,
  'Gola perfeita sem sufocar',
  'Procurava há meses uma camiseta de gola alta estruturada que não ficasse frouxa ou apertada. O algodão com elastano desenha o ombro e o peitoral de forma muito natural.',
  'M',
  true,
  true,
  now() - interval '12 days'
),
(
  'seed-derby-couro-solado-tratorado-conhaque',
  'Derby em Couro Legítimo Solado Tratorado',
  'Thiago Sampaio',
  'Porto Alegre / RS',
  5,
  'Conforto absoluto e couro legítimo',
  'Derby robusto e moderno com a sola tratorada. Couro macio desde o primeiro uso, sem machucar o calcanhar. Vale cada centavo.',
  '41',
  true,
  true,
  now() - interval '14 days'
),
(
  'seed-calca-chino-slim-caqui',
  'Calça Chino Slim em Sarja Nobre',
  'Carlos Henrique Neves',
  'Goiânia / GO',
  5,
  'Coringa para o trabalho e lazer',
  'A chino mais confortável que tenho. O elastano na medida certa dá liberdade de movimento sem deixar a calça relaxar no joelho durante o dia.',
  '42',
  true,
  true,
  now() - interval '16 days'
),
(
  'seed-loafer-camurca-fivela-tabaco',
  'Loafer em Camurça com Fivela',
  'Alexandre Prado',
  'Salvador / BA',
  5,
  'Camurça impecável',
  'Acabamento premium da fivela e camurça aveludada. Fica espetacular com calça de linho ou alfaiataria com a barra italiana mais curta.',
  '40',
  true,
  false,
  now() - interval '18 days'
),
(
  'seed-tenis-couro-minimalista-branco',
  'Tênis Minimalista em Couro Legítimo',
  'Bruno Guimarães',
  'Florianópolis / SC',
  5,
  'Design limpo e muito elegante',
  'Tênis que dá para usar com costume completo sem parecer informal demais. Todo forrado em couro, palmilha macia e fácil de limpar.',
  '41',
  true,
  false,
  now() - interval '20 days'
),
(
  'seed-camisa-linho-puro-manga-longa-cru',
  'Camisa em Linho Puro Manga Longa',
  'Rafael Meireles',
  'Recife / PE',
  5,
  'Linho legítimo com toque macio',
  'O linho da Titi’s Store é diferente: não pinica na pele e tem um caimento despojado-chique incomparável. O colarinho tem estrutura perfeita.',
  'G',
  true,
  true,
  now() - interval '22 days'
),
(
  'seed-blazer-alfaiataria-desestruturado-marinho',
  'Blazer em Lã Fria Desestruturado',
  'Marcelo Antunes',
  'São Paulo / SP',
  5,
  'Sem ombreiras pesadas, elegância pura',
  'O corte desestruturado é moderno e leve. Você veste alfaiataria como se estivesse com uma camisa. O tecido é lã fria autêntica.',
  '50',
  true,
  true,
  now() - interval '25 days'
)
on conflict (id) do nothing;

commit;
