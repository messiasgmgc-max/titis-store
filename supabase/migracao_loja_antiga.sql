-- =============================================================================
--  TITI'S STORE · Migração de Produtos da Loja Antiga (41 peças)
-- -----------------------------------------------------------------------------
--  Extraído automaticamente via API pública da antiga loja (WooCommerce/WordPress).
--  Importa: nome, slug, preço original, fotos de alta resolução, descrição, tamanhos.
-- =============================================================================

begin;

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'gold-milan-white-3', 'Gold Milan white', 'Calçados', 'calcado',
       'Couro legítimo', 44999, 'https://titisstore.com.br/wp-content/uploads/2026/05/IMG_8749-2.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/05/534f26b5-4e6d-42e1-9b78-666108d320b4-2.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/05/25bf2866-4635-4512-b5b1-445f263b5b64-2.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], true, true, 10
 where not exists (select 1 from public.products where slug = 'gold-milan-white-3');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'gold-milan-white-2', 'Gold Milan white', 'Calçados', 'calcado',
       'Couro legítimo', 44999, 'https://titisstore.com.br/wp-content/uploads/2026/05/IMG_8749-1.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/05/534f26b5-4e6d-42e1-9b78-666108d320b4-1.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/05/25bf2866-4635-4512-b5b1-445f263b5b64-1.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], true, true, 20
 where not exists (select 1 from public.products where slug = 'gold-milan-white-2');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'gold-milan-white', 'Gold Milan white', 'Calçados', 'calcado',
       'Couro legítimo', 44999, 'https://titisstore.com.br/wp-content/uploads/2026/05/IMG_8749.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/05/534f26b5-4e6d-42e1-9b78-666108d320b4.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/05/25bf2866-4635-4512-b5b1-445f263b5b64.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], true, true, 30
 where not exists (select 1 from public.products where slug = 'gold-milan-white');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'heritage-boot', 'Heritage boot', 'Calçados', 'calcado',
       'Bota em couro legítimo nobre', 49999, 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7854.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7856.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7853.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7852.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7855.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7850.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7851.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7849.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7848.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], true, true, 40
 where not exists (select 1 from public.products where slug = 'heritage-boot');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'chinelo-copacabana', 'Chinelo copacabana', 'Calçados', 'calcado',
       'Chinelo em couro legítimo', 19999, 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7862.png', '{}'::text[],
       array['38', '39', '40', '41', '42', '43']::text[], true, true, 50
 where not exists (select 1 from public.products where slug = 'chinelo-copacabana');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'oculos-low-camufle', 'Oculos low camufle', 'Acessórios', 'acessorio',
       'Óculos armação', 36999, 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7833.png', array['https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7826.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_7817-scaled-e1778528809628.png']::text[],
       array['Único']::text[], true, true, 60
 where not exists (select 1 from public.products where slug = 'oculos-low-camufle');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'mosc-over', 'Mosc over', 'Calçados', 'calcado',
       'Couro legítimo', 43999, 'https://titisstore.com.br/wp-content/uploads/2026/04/29d4949f-d79d-40e6-ada8-b54cbb3feb61.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/04/0587c11a-d540-401d-864f-1574eca83053.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], true, true, 70
 where not exists (select 1 from public.products where slug = 'mosc-over');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'loafer-mocca-italiano', 'Loafer mocca italiano', 'Calçados', 'calcado',
       'Calçado LOAFER mocassim italiano em couro legítimo e camurçado', 48999, 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_4849.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/04/IMG_4850.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_4851.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], true, true, 80
 where not exists (select 1 from public.products where slug = 'loafer-mocca-italiano');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'blub-scol-fler', 'Blub scol fler', 'Calçados', 'calcado',
       'Calçado em couro legítimo', 45999, 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6644.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6643.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6645.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 90
 where not exists (select 1 from public.products where slug = 'blub-scol-fler');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'black-scott', 'Black scott', 'Calçados', 'calcado',
       'Calçado todo em couro legítimo', 49999, 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6636.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6634.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6637.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6638.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6639.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 100
 where not exists (select 1 from public.products where slug = 'black-scott');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'blow-snap', 'Blow snap', 'Calçados', 'calcado',
       'Calçado em couro legítimo', 42999, 'https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6648.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/04/IMG_6649.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 110
 where not exists (select 1 from public.products where slug = 'blow-snap');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'alban-black', 'Alban black', 'Calçados', 'calcado',
       'Conforto que Você Sente, Estilo que Você Vê. Conheça o ALBAN. Imagine um calçado que não apenas complementa seu look, mas o transforma. O ALBAN foi projetado para quem não abre mão do design arrojado e do conforto duradouro. O solado geométrico absorve o impacto, enquanto o couro macio abraça seu pé. ✨ Do escritório ao happy hour, esteja sempre à frente. O ALBAN Black é o seu novo item essencial. 👉 Não espere esgotar. Invista em você mesmo e eleve sua coleção. Compre hoje e receba no conforto de casa.', 48999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_5529.png', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_5514.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_5513.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 120
 where not exists (select 1 from public.products where slug = 'alban-black');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'nimbus-black', 'Nimbus Black', 'Calçados', 'calcado',
       '&#8220;Nimbus Black&#8221; (Nimbus evoca nuvem, leveza e a ideia de flutuar sobre a plataforma) • Legenda: &#8220;Estilo que te eleva. Com uma plataforma confortável e um visual monocromático sofisticado, o Nimbus Black é o companheiro perfeito para quem busca conforto sem abrir mão da tendência.&#8221;', 45999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_5515.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_5516.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 130
 where not exists (select 1 from public.products where slug = 'nimbus-black');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'bermuda-em-linho', 'Bermuda em linho', 'Calças', 'inferior',
       'Bermudas em linho', 23999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4894.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4895.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4896.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4893.jpeg']::text[],
       array['38', '40', '42', '44', '46']::text[], false, true, 140
 where not exists (select 1 from public.products where slug = 'bermuda-em-linho');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'blazer-alpha', 'Blazer Alpha', 'Alfaiataria', 'sobreposicao',
       'Blazer alfaitaria', 65999, 'https://titisstore.com.br/wp-content/uploads/2026/03/4a978983-bb1a-4773-9ff2-a27ec7104859.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/ff36ef76-aacd-44fb-bacf-7894559778ff.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/06421e63-91f1-4ca6-aa7e-3edf7274e59c.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/e64dad73-5e4b-43d3-91e0-ba007fefe906.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/0931c042-3fa9-4672-8043-16bbabaf5130.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/dd0fcaac-e2a3-4dfd-9fe7-6a25cdcbecdf.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/cb8db3bc-adef-415e-a3d0-42155d4d38b4.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/eabd5432-85c8-4928-a0d7-59648bd620e6.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/05c5a834-5059-4eec-9e9b-181afe52ae1c.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], false, true, 150
 where not exists (select 1 from public.products where slug = 'blazer-alpha');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'bone-dutih', 'Boné Dútih', 'Acessórios', 'acessorio',
       'Boné em tecido flow', 8999, 'https://titisstore.com.br/wp-content/uploads/2026/03/7c7be826-cc84-4909-8d35-3f2c9bc324be.jpeg', '{}'::text[],
       array['Único']::text[], false, true, 160
 where not exists (select 1 from public.products where slug = 'bone-dutih');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'gold-white-couro', 'Gold white couro', 'Calçados', 'calcado',
       'Calçado em couro modelo bem versátil', 46999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4845.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4846.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4847.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 170
 where not exists (select 1 from public.products where slug = 'gold-white-couro');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'chinelo-hawai-em-couro', 'Chinelo Hawai em couro', 'Calçados', 'calcado',
       'Chinelo em couro legítimo', 18999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4857.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4858.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 180
 where not exists (select 1 from public.products where slug = 'chinelo-hawai-em-couro');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'lady-word', 'Lady word', 'Calçados', 'calcado',
       'Calado em couro legítimo', 44999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4860.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4859.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 190
 where not exists (select 1 from public.products where slug = 'lady-word');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'alfaiataria-tech', 'Alfaiataria tech', 'Alfaiataria', 'sobreposicao',
       'Calça alfaiataria tech com ajustes', 35999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_3133.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_3134.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_3137.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_3135.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], false, true, 200
 where not exists (select 1 from public.products where slug = 'alfaiataria-tech');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'camisa-gola-media', 'Camisa gola média', 'Camisaria', 'superior',
       'Camisa gola média', 16999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4688.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4689.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4687.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], false, true, 210
 where not exists (select 1 from public.products where slug = 'camisa-gola-media');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'oculos-flow', 'Óculos FLOW', 'Acessórios', 'acessorio',
       'Armação óculos para grau', 28999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4692.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4690.jpeg']::text[],
       array['Único']::text[], false, true, 220
 where not exists (select 1 from public.products where slug = 'oculos-flow');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'chinelo-slide', 'Chinelo slide', 'Calçados', 'calcado',
       'Chinelo slide , o estilo e o conforto que você merece em todos ambientes casuais descontraídos', 28999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4509-1.png', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4507-1.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4506-1.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4508.png']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 230
 where not exists (select 1 from public.products where slug = 'chinelo-slide');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'camisa-em-linho', 'Camisa em linho', 'Camisaria', 'superior',
       'Camisas em linho gola padre', 22999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4684.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4685.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4686.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], false, true, 240
 where not exists (select 1 from public.products where slug = 'camisa-em-linho');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'mochila-hummer', 'Mochila hummer', 'Acessórios', 'acessorio',
       'Mochilas em couro legítimo nobre', 69999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4680.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4679.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4681.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4683.jpeg']::text[],
       array['Único']::text[], false, true, 250
 where not exists (select 1 from public.products where slug = 'mochila-hummer');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'mala-over-em-couro-legitimo', 'Mala over em couro legítimo', 'Acessórios', 'acessorio',
       'Mala over toda em Couro legítimo nobre', 83999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4491.jpeg', '{}'::text[],
       array['Único']::text[], false, true, 260
 where not exists (select 1 from public.products where slug = 'mala-over-em-couro-legitimo');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'cinto-em-couro-legitimo', 'Cinto em couro legítimo', 'Acessórios', 'acessorio',
       'Cinto em couro legítimo', 12999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4635.jpeg', '{}'::text[],
       array['Único']::text[], false, true, 270
 where not exists (select 1 from public.products where slug = 'cinto-em-couro-legitimo');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'birken', 'Birken', 'Calçados', 'calcado',
       'Sandália unissex', 14999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4668.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4670.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4666.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 280
 where not exists (select 1 from public.products where slug = 'birken');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'bag', 'Bag', 'Acessórios', 'acessorio',
       'Bag em couro legítimo nobre', 33999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4516.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4515.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4517.jpeg']::text[],
       array['Único']::text[], false, true, 290
 where not exists (select 1 from public.products where slug = 'bag');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 't-shirt-egipcia', 'T-shirt egípcia', 'Camisaria', 'superior',
       'Camiseta em algodão egípcios com elastano', 18999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4421.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4420.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/copy_ED6D813E-3E32-4774-A0AE-F86C68A309D1.png']::text[],
       array['P', 'M', 'G', 'GG']::text[], false, true, 300
 where not exists (select 1 from public.products where slug = 't-shirt-egipcia');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'moscow-bold', 'Moscow bold', 'Calçados', 'calcado',
       'Calado em couro legítimo', 48999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4433.png', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4432.png', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4434.png']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 310
 where not exists (select 1 from public.products where slug = 'moscow-bold');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'over-snow', 'Over Snow', 'Calçados', 'calcado',
       'Calçado em couro legítimo', 48999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4480.png', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4481.png', 'https://titisstore.com.br/wp-content/uploads/2026/03/25301228-4dd3-4109-8540-29213949e814.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 320
 where not exists (select 1 from public.products where slug = 'over-snow');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'slide-dboa', 'Slide dböa', 'Calçados', 'calcado',
       'Chinelo slide unissex', 28999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4509.png', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4507.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4506.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 330
 where not exists (select 1 from public.products where slug = 'slide-dboa');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'gold-mily-2', 'Gold mily', 'Calçados', 'calcado',
       'O Gold Mily é a definição de luxo silencioso para os seus pés. Confeccionado inteiramente em couro legítimo selecionado, este calçado foi desenhado para quem não abre mão da sofisticação, mas exige o máximo de conforto para o dia a dia. Seu design clean e o solado robusto criam uma estética contemporânea que eleva qualquer visual básico a um novo patamar de estilo.', 43999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4413-1.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4414-1.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 340
 where not exists (select 1 from public.products where slug = 'gold-mily-2');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'gold-mily', 'Gold mily', 'Calçados', 'calcado',
       'O Gold Mily é a definição de luxo silencioso para os seus pés. Confeccionado inteiramente em couro legítimo selecionado, este calçado foi desenhado para quem não abre mão da sofisticação, mas exige o máximo de conforto para o dia a dia. Seu design clean e o solado robusto criam uma estética contemporânea que eleva qualquer visual básico a um novo patamar de estilo.', 41999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4413.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4414.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 350
 where not exists (select 1 from public.products where slug = 'gold-mily');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'overscoot', 'Overscoot', 'Calçados', 'calcado',
       'O Overscoot chega para redefinir o conceito de calçado casual premium. Com um solado robusto e moderno, ele traz o peso visual da tendência streetwear sem perder a elegância. O detalhe em contraste no calcanhar e as faixas laterais minimalistas garantem personalidade a cada passo. • Design Contemporâneo: Solado elevado (flatform) que oferece altura e estilo com estabilidade. • Contraste Premium: Acabamento em branco clássico com detalhes em preto e um toque de cor no calcanhar. • O Look: A peça chave para quebrar a formalidade da calça de alfaiataria ou elevar o básico jeans com camiseta.', 48999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4411.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4412.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 360
 where not exists (select 1 from public.products where slug = 'overscoot');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 't-shirt-100-algodao', 'T-shirt 100% algodão', 'Camisaria', 'superior',
       'A base de qualquer guarda-roupa inteligente começa aqui. Nossa camiseta básica é confeccionada com algodão 100% premium, garantindo uma peça extremamente macia, respirável e com caimento perfeito. É o equilíbrio ideal entre simplicidade e sofisticação. • Fibras Naturais: Permite que a pele respire, ideal para o clima tropical. • Acabamento Reforçado: Gola em ribana que não esgarça e costuras duplas para maior durabilidade. • Minimalismo: Sem logos aparentes, perfeita para composições casuais ou por baixo de blazers.', 13999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4404.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4407.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4405.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4406.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4408.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4409.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4410.jpeg']::text[],
       array['P', 'M', 'G', 'GG']::text[], false, true, 370
 where not exists (select 1 from public.products where slug = 't-shirt-100-algodao');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'calca-alfaitaria', 'Calça alfaitaria', 'Calças', 'inferior',
       'Eleve seu estilo com a nossa Calça Alfaiataria de corte reto e caimento impecável. Desenvolvida para transitar com facilidade entre o escritório e o jantar especial, esta peça combina a sofisticação clássica com o conforto que o dia a dia exige. • Destaques: Cintura alta com acabamento clean, bolsos laterais discretos e vincos frontais que alongam a silhueta. • Tecido: Crepe de alta gramatura (não amassa com facilidade). • Como usar: Combine com um blazer estruturado para um look power suit ou uma t-shirt de algodão para um visual high-low moderno', 26999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4401.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4396.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4398.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4399.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4397.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4403.jpeg', 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_4402.jpeg']::text[],
       array['38', '40', '42', '44', '46']::text[], false, true, 380
 where not exists (select 1 from public.products where slug = 'calca-alfaitaria');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'prisma-walk', 'Prisma walk', 'Calçados', 'calcado',
       'O Prisma Walk é a síntese da inovação visual com o artesanato clássico. Projetado para quem não abre mão de um design disruptivo, este calçado se destaca pelo seu solado geométrico tridimensional, que confere uma presença marcante e moderna a qualquer look. Fabricado com couro legítimo nobre, o modelo oferece uma experiência de uso superior, combinando a durabilidade e a respirabilidade do material natural com uma estética bold e urbana.', 48999, 'https://titisstore.com.br/wp-content/uploads/2026/03/0086973f-38bb-45f1-b07a-3101a513ef9c.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/2aa5dc4d-db0e-450e-96f7-eb62eee951f2.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 390
 where not exists (select 1 from public.products where slug = 'prisma-walk');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'old-bulb', 'Old bulb', 'Calçados', 'calcado',
       'Eleve seu estilo urbano com o Prisma Walk old bulb. Este modelo une a sofisticação do couro legítimo a um solado disruptivo, criando um calçado que é, ao mesmo tempo, uma peça de design e um aliado para o conforto diário. Seu grande diferencial está no solado tridimensional, com texturas que remetem a prismas, garantindo uma estética bold e moderna que não passa despercebida.', 46999, 'https://titisstore.com.br/wp-content/uploads/2026/03/51a7f22c-c9af-4e86-8122-0c6e08a705dd.jpeg', array['https://titisstore.com.br/wp-content/uploads/2026/03/f670e2fe-d531-4c2b-91e3-5a4228a87693.jpeg']::text[],
       array['38', '39', '40', '41', '42', '43']::text[], false, true, 400
 where not exists (select 1 from public.products where slug = 'old-bulb');

insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select 'bold-carbon', 'Bold Carbon', 'Alfaiataria', 'sobreposicao',
       '', 48999, 'https://titisstore.com.br/wp-content/uploads/2026/03/IMG_3660.jpeg', '{}'::text[],
       array['P', 'M', 'G', 'GG']::text[], false, true, 410
 where not exists (select 1 from public.products where slug = 'bold-carbon');

commit;
