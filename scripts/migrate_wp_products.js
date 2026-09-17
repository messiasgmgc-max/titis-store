const fs = require('fs');
const path = require('path');

function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function mapSlot(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('calçado') || cat.includes('calcado')) return 'calcado';
  if (cat.includes('calça') || cat.includes('calca') || cat.includes('bermuda')) return 'inferior';
  if (cat.includes('camisa') || cat.includes('camiseta')) return 'superior';
  if (cat.includes('blazer') || cat.includes('alfaiataria')) return 'sobreposicao';
  return 'acessorio';
}

function mapCategory(categories, productName) {
  const text = ((categories ? categories.map(c => c.name).join(' ') : '') + ' ' + productName).toLowerCase();
  
  if (text.includes('calçado') || text.includes('calcado') || text.includes('boot') || text.includes('chinelo') || text.includes('loafer') || text.includes('mocca') || text.includes('walk')) {
    return 'Calçados';
  }
  if (text.includes('blazer') || text.includes('paletó') || text.includes('costume') || text.includes('alfaiataria')) {
    return 'Alfaiataria';
  }
  if (text.includes('camisa') || text.includes('camiseta') || text.includes('t-shirt') || text.includes('gola média') || text.includes('polo')) {
    return 'Camisaria';
  }
  if (text.includes('calça') || text.includes('calca') || text.includes('chino') || text.includes('sarja')) {
    return 'Calças';
  }
  if (text.includes('bermuda')) {
    return 'Calças';
  }
  if (text.includes('óculos') || text.includes('oculos') || text.includes('cinto') || text.includes('boné') || text.includes('bone') || text.includes('mochila') || text.includes('bolsa') || text.includes('acessório') || text.includes('acessorio')) {
    return 'Acessórios';
  }

  return 'Alfaiataria';
}

async function run() {
  console.log('Conectando na API da antiga loja (https://titisstore.com.br)...');
  const response = await fetch('https://titisstore.com.br/wp-json/wc/store/v1/products?per_page=100');
  const products = await response.json();

  console.log(`Encontrados ${products.length} produtos!`);

  const dumpPath = path.resolve(__dirname, '../supabase/wp_products_full.json');
  fs.writeFileSync(dumpPath, JSON.stringify(products, null, 2), 'utf-8');

  let sql = `-- =============================================================================
--  TITI'S STORE · Migração de Produtos da Loja Antiga (${products.length} peças)
-- -----------------------------------------------------------------------------
--  Extraído automaticamente via API pública da antiga loja (WooCommerce/WordPress).
--  Importa: nome, slug, preço original, fotos de alta resolução, descrição, tamanhos.
-- =============================================================================

begin;

`;

  const seenSlugs = new Set();
  const summaryByCategory = {};

  products.forEach((p, index) => {
    let slug = p.slug || ('prod-' + p.id);
    if (seenSlugs.has(slug)) {
      slug = slug + '-' + p.id;
    }
    seenSlugs.add(slug);

    const name = p.name.replace(/'/g, "''");
    const category = mapCategory(p.categories, p.name);
    const slot = mapSlot(category);
    const description = cleanHtml(p.description || p.short_description).replace(/'/g, "''");
    const priceCents = p.prices && p.prices.price ? parseInt(p.prices.price, 10) : null;
    
    summaryByCategory[category] = (summaryByCategory[category] || 0) + 1;

    const imageUrl = p.images && p.images[0] ? p.images[0].src : '';
    const gallery = (p.images && p.images.length > 1) 
      ? p.images.slice(1).map(img => img.src)
      : [];

    let sizes = ['38', '39', '40', '41', '42', '43'];
    if (category === 'Calçados') sizes = ['38', '39', '40', '41', '42', '43'];
    else if (category === 'Calças') sizes = ['38', '40', '42', '44', '46'];
    else if (category === 'Camisaria' || category === 'Alfaiataria') sizes = ['P', 'M', 'G', 'GG'];
    else if (category === 'Acessórios') sizes = ['Único'];

    const galleryArraySql = gallery.length > 0 
      ? "array[" + gallery.map(g => "'" + g.replace(/'/g, "''") + "'").join(', ') + "]::text[]"
      : "'{}'::text[]";

    const sizesArraySql = "array[" + sizes.map(s => "'" + s + "'").join(', ') + "]::text[]";

    sql += `insert into public.products (
  slug, name, category, slot, description, price_cents, image_url, gallery,
  sizes, is_featured, is_active, sort_order
)
select '${slug}', '${name}', '${category}', '${slot}',
       '${description}', ${priceCents ?? 'null'}, '${imageUrl}', ${galleryArraySql},
       ${sizesArraySql}, ${index < 8 ? 'true' : 'false'}, true, ${(index + 1) * 10}
 where not exists (select 1 from public.products where slug = '${slug}');

`;
  });

  sql += "commit;\n";

  const sqlPath = path.resolve(__dirname, '../supabase/migracao_loja_antiga.sql');
  fs.writeFileSync(sqlPath, sql, 'utf-8');
  console.log(`Sucesso! Gerado arquivo SQL: ${sqlPath}`);
  console.log('Distribuição por categoria:', summaryByCategory);
}

run().catch(console.error);
