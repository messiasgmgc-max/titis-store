-- =============================================================================
--  TITI'S STORE · Catálogo real (23 peças)
-- -----------------------------------------------------------------------------
--  Rode DEPOIS do schema.sql, no SQL Editor. Idempotente: uma peça só é inserida
--  se ainda não existir uma com o mesmo slug. As fotos ficam no próprio site
--  (pasta /produtos), então não dependem do Storage.
--  Preços ficam "sob consulta" (price_cents null): ajuste pelo painel /admin.
-- =============================================================================

begin;

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'calca-alfaiataria-regulador-cinza-grafite', 'Calça de Alfaiataria com Regulador', 'Calças', 'inferior',
       'Regulador lateral em metal e cós limpo: veste sem cinto e afina a silhueta. Caimento slim com barra no ponto para tênis ou loafer.',
       'Sarja com elastano', 'Cinza Grafite', '#4A4D52', '/produtos/calca-alfaiataria-regulador-cinza-grafite.jpg', array['/produtos/calca-alfaiataria-regulador-cinza-grafite-2.jpg']::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'esporte']::text[], '{}'::text[], 3, true, 10, true
 where not exists (select 1 from public.products where slug = 'calca-alfaiataria-regulador-cinza-grafite');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'calca-chino-slim-azul-marinho', 'Calça Chino Slim', 'Calças', 'inferior',
       'Chino de sarja com elastano, bolsos faca e barra reta. A base mais versátil do guarda-roupa: do escritório ao jantar.',
       'Sarja de algodão com elastano', 'Azul Marinho', '#1F2D45', '/produtos/calca-chino-slim-azul-marinho.jpg', '{}'::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['trabalho', 'casual', 'barzinho', 'jantar', 'esporte']::text[], '{}'::text[], 3, false, 20, true
 where not exists (select 1 from public.products where slug = 'calca-chino-slim-azul-marinho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'calca-chino-slim-off-white', 'Calça Chino Slim', 'Calças', 'inferior',
       'Chino claro de sarja com elastano, bolsos faca e barra reta. Ilumina o look e combina com camurça, caramelo e tons de terra.',
       'Sarja de algodão com elastano', 'Off-White', '#E9E1D2', '/produtos/calca-chino-slim-off-white.jpg', '{}'::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 30, true
 where not exists (select 1 from public.products where slug = 'calca-chino-slim-off-white');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'calca-alfaiataria-regulador-preto', 'Calça de Alfaiataria com Regulador', 'Calças', 'inferior',
       'Preto absoluto com regulador lateral em metal e cós limpo. Caimento slim, sem cinto, para noites e ocasiões que pedem sobriedade.',
       'Sarja com elastano', 'Preto', '#101114', '/produtos/calca-alfaiataria-regulador-preto.jpg', array['/produtos/calca-alfaiataria-regulador-preto-2.jpg']::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['trabalho', 'barzinho', 'jantar', 'festa']::text[], '{}'::text[], 4, false, 40, true
 where not exists (select 1 from public.products where slug = 'calca-alfaiataria-regulador-preto');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'calca-alfaiataria-cordao-azul-marinho', 'Calça de Alfaiataria com Cordão', 'Calças', 'inferior',
       'Vinco frontal marcado e cós com cordão: aparência de alfaiataria com conforto de malha. Disponível também em preto, marrom e azul petróleo.',
       'Malha de alfaiataria', 'Azul Marinho', '#1B2A4A', '/produtos/calca-alfaiataria-cordao-azul-marinho.jpg', array['/produtos/calca-alfaiataria-cordao-azul-marinho-2.jpg']::text[],
       array['38', '40', '42', '44', '46', '48']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], '{}'::text[], 2, false, 50, true
 where not exists (select 1 from public.products where slug = 'calca-alfaiataria-cordao-azul-marinho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'loafer-camurca-azul-nevoa', 'Loafer de Camurça', 'Calçados', 'calcado',
       'Loafer de camurça com pesponto aparente e solado creme leve. Vai de calça de alfaiataria a chino, sem meia à mostra.',
       'Camurça', 'Azul Névoa', '#7C8CA3', '/produtos/loafer-camurca-azul-nevoa.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 60, true
 where not exists (select 1 from public.products where slug = 'loafer-camurca-azul-nevoa');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'tenis-couro-tricolor-caramelo', 'Tênis de Couro Tricolor', 'Calçados', 'calcado',
       'Cabedal em couro branco com recortes em preto e caramelo e um toque de laranja no calcanhar. Solado alto e leve.',
       'Couro', 'Branco, Preto e Caramelo', '#EDEBE6', '/produtos/tenis-couro-tricolor-caramelo.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte']::text[], '{}'::text[], 1, false, 70, true
 where not exists (select 1 from public.products where slug = 'tenis-couro-tricolor-caramelo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'tenis-listras-calcanhar-vermelho', 'Tênis de Couro com Listras', 'Calçados', 'calcado',
       'Couro branco com duas listras pretas e calcanhar vermelho. Solado robusto e limpo, para chino, alfaiataria leve ou jeans.',
       'Couro', 'Branco e Preto', '#F4F4F2', '/produtos/tenis-listras-calcanhar-vermelho.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte']::text[], '{}'::text[], 1, false, 80, true
 where not exists (select 1 from public.products where slug = 'tenis-listras-calcanhar-vermelho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'tenis-colorblock-preto-branco', 'Tênis Colorblock', 'Calçados', 'calcado',
       'Recortes em preto, branco e cinza sobre solado branco alto. Um tênis com presença para looks monocromáticos.',
       'Couro e camurça', 'Preto, Branco e Cinza', '#2A2B2E', '/produtos/tenis-colorblock-preto-branco.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte']::text[], '{}'::text[], 1, false, 90, true
 where not exists (select 1 from public.products where slug = 'tenis-colorblock-preto-branco');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'tenis-couro-minimalista-branco', 'Tênis de Couro Minimalista', 'Calçados', 'calcado',
       'Todo branco, em couro macio e sem logos. O tênis que resolve qualquer look casual refinado e acompanha até alfaiataria leve.',
       'Couro', 'Branco', '#F7F7F5', '/produtos/tenis-couro-minimalista-branco.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte', 'jantar']::text[], '{}'::text[], 2, true, 100, true
 where not exists (select 1 from public.products where slug = 'tenis-couro-minimalista-branco');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'tenis-listras-calcanhar-caramelo', 'Tênis de Couro com Listras', 'Calçados', 'calcado',
       'Couro branco com duas listras pretas e calcanhar caramelo. Combina com linho, chino claro e tons de terra.',
       'Couro', 'Branco e Caramelo', '#F1EFE9', '/produtos/tenis-listras-calcanhar-caramelo.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['casual', 'barzinho', 'esporte']::text[], '{}'::text[], 1, false, 110, true
 where not exists (select 1 from public.products where slug = 'tenis-listras-calcanhar-caramelo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'derby-couro-solado-tratorado-conhaque', 'Derby de Couro com Solado Tratorado', 'Calçados', 'calcado',
       'Couro conhaque polido com solado tratorado creme e cadarço encerado. Formal o bastante para o trabalho, moderno o bastante para o jantar.',
       'Couro', 'Conhaque', '#8A4B22', '/produtos/derby-couro-solado-tratorado-conhaque.jpg', '{}'::text[],
       array['38', '39', '40', '41', '42', '43', '44']::text[], '{}'::text[],
       array['trabalho', 'jantar', 'casual', 'festa']::text[], array['ameno', 'frio']::text[], 3, true, 120, true
 where not exists (select 1 from public.products where slug = 'derby-couro-solado-tratorado-conhaque');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'polo-trico-off-white', 'Polo de Tricô', 'Malharia', 'superior',
       'Polo de tricô com três botões, punhos e barra canelados. Veste com calça de alfaiataria ou chino e dispensa a camisa social.',
       'Tricô de algodão', 'Off-White', '#EFEAE0', '/produtos/polo-trico-off-white.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte', 'trabalho']::text[], array['quente', 'ameno']::text[], 2, true, 130, true
 where not exists (select 1 from public.products where slug = 'polo-trico-off-white');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'polo-trico-azul-ceu', 'Polo de Tricô', 'Malharia', 'superior',
       'Polo de tricô com três botões, punhos e barra canelados. Veste com calça de alfaiataria ou chino e dispensa a camisa social.',
       'Tricô de algodão', 'Azul Céu', '#5F86BE', '/produtos/polo-trico-azul-ceu.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte', 'trabalho']::text[], array['quente', 'ameno']::text[], 2, false, 140, true
 where not exists (select 1 from public.products where slug = 'polo-trico-azul-ceu');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'polo-trico-preto', 'Polo de Tricô', 'Malharia', 'superior',
       'Polo de tricô com três botões, punhos e barra canelados. Veste com calça de alfaiataria ou chino e dispensa a camisa social.',
       'Tricô de algodão', 'Preto', '#1C1D20', '/produtos/polo-trico-preto.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte', 'trabalho']::text[], array['quente', 'ameno']::text[], 2, false, 150, true
 where not exists (select 1 from public.products where slug = 'polo-trico-preto');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'camiseta-gola-alta-caramelo', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Caramelo', '#A67B3E', '/produtos/camiseta-gola-alta-caramelo.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], array['morena', 'parda', 'negra']::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 160, true
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-caramelo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'camiseta-gola-alta-branco', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Branco', '#F5F5F3', '/produtos/camiseta-gola-alta-branco.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 170, true
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-branco');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'camiseta-gola-alta-preto', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Preto', '#121316', '/produtos/camiseta-gola-alta-preto.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, true, 180, true
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-preto');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'camiseta-gola-alta-verde-floresta', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Verde Floresta', '#1F4A38', '/produtos/camiseta-gola-alta-verde-floresta.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 190, true
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-verde-floresta');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'camiseta-gola-alta-azul-marinho', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Azul Marinho', '#17305E', '/produtos/camiseta-gola-alta-azul-marinho.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 200, true
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-azul-marinho');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'camiseta-gola-alta-creme', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Creme', '#F1E9D2', '/produtos/camiseta-gola-alta-creme.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 210, true
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-creme');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'camiseta-gola-alta-cinza-chumbo', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Cinza Chumbo', '#5B6166', '/produtos/camiseta-gola-alta-cinza-chumbo.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], '{}'::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 220, true
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-cinza-chumbo');

insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url, gallery,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order, is_active
)
select 'camiseta-gola-alta-marrom-cafe', 'Camiseta Gola Alta', 'Malharia', 'superior',
       'Gola alta canelada e modelagem slim que valoriza ombros e braços. Malha encorpada, sem transparência, que segura o caimento o dia todo.',
       'Malha de algodão com elastano', 'Marrom Café', '#5A3B2B', '/produtos/camiseta-gola-alta-marrom-cafe.jpg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], array['morena', 'parda', 'negra']::text[],
       array['casual', 'barzinho', 'jantar', 'esporte']::text[], array['quente', 'ameno']::text[], 2, false, 230, true
 where not exists (select 1 from public.products where slug = 'camiseta-gola-alta-marrom-cafe');

notify pgrst, 'reload schema';

commit;

-- -----------------------------------------------------------------------------
-- Opcional: despublicar as peças antigas de exemplo e as que tinham foto em base64
-- (elas continuam no banco; basta reativar pelo painel).
--
--   update public.products
--      set is_active = false
--    where slug in ('blazer-tailored-super-120s-marinho', 'trico-cashmere-italiano-terracota',
--                   'camisa-pima-cotton-giza-marfim', 'chino-tailored-cinza-grafite', 'costume-noturno-obsidian')
--       or image_url like 'data:%';
-- -----------------------------------------------------------------------------
