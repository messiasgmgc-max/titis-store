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

commit;
