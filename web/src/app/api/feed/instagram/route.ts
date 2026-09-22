// ============================================================
// GET /api/feed/instagram — Feed de Catálogo Meta (Facebook / Instagram Shopping)
// Formato: RSS 2.0 XML (Google Merchant / Meta Catalog)
// ============================================================
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/server/supabase-server';
import { SEED_PRODUCTS } from '@/lib/catalog-seed';
import { normalizeProduct, sortProducts, getCategorySlug, buildProductPath } from '@/lib/products';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache de 1 hora

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.titisstore.com.br';
  return url.replace(/\/+$/, '');
}

function resolveFullImageUrl(imageUrl: string | null | undefined, baseUrl: string): string {
  if (!imageUrl) return `${baseUrl}/apple-icon.jpg`;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}

export async function GET() {
  const baseUrl = getBaseUrl();

  // 1. Busca produtos no Supabase com fallback seguro para SEED_PRODUCTS
  let products: Product[] = [];
  try {
    const { data, error } = await createServerSupabase()
      .from('products')
      .select('*')
      .eq('is_active', true)
      .limit(1000);

    if (error || !data || data.length === 0) {
      products = SEED_PRODUCTS.filter((p) => p.is_active !== false);
    } else {
      products = sortProducts(data.map((r) => normalizeProduct(r as Record<string, unknown>)));
    }
  } catch {
    products = SEED_PRODUCTS.filter((p) => p.is_active !== false);
  }

  // 2. Geração dos itens no formato XML padrão Google Merchant / Meta Catalog
  const itemsXml: string[] = [];

  for (const product of products) {
    const parentId = product.id;
    const categorySlug = getCategorySlug(product.category);
    const defaultPriceCents = product.price_cents || 19900;
    const formattedPrice = `${(defaultPriceCents / 100).toFixed(2)} BRL`;
    const description = product.description || `${product.name} — Peça exclusiva de alta alfaiataria masculina da Titi's Store.`;
    const mainImage = resolveFullImageUrl(product.image_url, baseUrl);

    // Se o produto tiver variantes cadastradas, geramos um item para cada variação (cor / SKU)
    const variants = product.variants || [];
    const hasVariants = variants.length > 0;

    if (hasVariants) {
      for (const variant of variants) {
        const variantId = `${parentId}_${variant.id || variant.color_name || 'var'}`;
        const variantColor = variant.color_name || product.color_name || 'Única';
        const variantImage = resolveFullImageUrl(variant.image_url || product.image_url, baseUrl);
        const variantPriceCents = variant.price_cents || defaultPriceCents;
        const variantFormattedPrice = `${(variantPriceCents / 100).toFixed(2)} BRL`;
        const variantSizes = variant.sizes && variant.sizes.length > 0 ? variant.sizes.join('/') : (product.sizes?.join('/') || 'Tamanho Único');

        const productLink = `${baseUrl}${buildProductPath(product, { colorName: variantColor })}`;

        // Imagens adicionais da galeria
        const additionalImages = (variant.gallery && variant.gallery.length > 0 ? variant.gallery : product.gallery || [])
          .slice(0, 5)
          .map((img) => `<g:additional_image_link>${escapeXml(resolveFullImageUrl(img, baseUrl))}</g:additional_image_link>`)
          .join('\n        ');

        itemsXml.push(`    <item>
      <g:id>${escapeXml(variantId)}</g:id>
      <g:item_group_id>${escapeXml(parentId)}</g:item_group_id>
      <g:title><![CDATA[${product.name} - ${variantColor}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${escapeXml(productLink)}</g:link>
      <g:image_link>${escapeXml(variantImage)}</g:image_link>
      ${additionalImages ? `${additionalImages}\n      ` : ''}<g:brand><![CDATA[Titi's Store]]></g:brand>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${variantFormattedPrice}</g:price>
      <g:google_product_category>1604</g:google_product_category>
      <g:product_type><![CDATA[Vestuário > ${product.category}]]></g:product_type>
      <g:color><![CDATA[${variantColor}]]></g:color>
      <g:size><![CDATA[${variantSizes}]]></g:size>
      <g:gender>male</g:gender>
      <g:age_group>adult</g:age_group>
      ${product.fabric ? `<g:material><![CDATA[${product.fabric}]]></g:material>` : ''}
    </item>`);
      }
    } else {
      // Produto simples (sem variantes complexas)
      const productLink = `${baseUrl}${buildProductPath(product)}`;
      const color = product.color_name || 'Única';
      const sizes = product.sizes && product.sizes.length > 0 ? product.sizes.join('/') : 'Tamanho Único';

      const additionalImages = (product.gallery || [])
        .slice(0, 5)
        .map((img) => `<g:additional_image_link>${escapeXml(resolveFullImageUrl(img, baseUrl))}</g:additional_image_link>`)
        .join('\n        ');

      itemsXml.push(`    <item>
      <g:id>${escapeXml(parentId)}</g:id>
      <g:title><![CDATA[${product.name}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${escapeXml(productLink)}</g:link>
      <g:image_link>${escapeXml(mainImage)}</g:image_link>
      ${additionalImages ? `${additionalImages}\n      ` : ''}<g:brand><![CDATA[Titi's Store]]></g:brand>
      <g:condition>new</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${formattedPrice}</g:price>
      <g:google_product_category>1604</g:google_product_category>
      <g:product_type><![CDATA[Vestuário > ${product.category}]]></g:product_type>
      <g:color><![CDATA[${color}]]></g:color>
      <g:size><![CDATA[${sizes}]]></g:size>
      <g:gender>male</g:gender>
      <g:age_group>adult</g:age_group>
      ${product.fabric ? `<g:material><![CDATA[${product.fabric}]]></g:material>` : ''}
    </item>`);
    }
  }

  // 3. Montagem do XML completo no padrão RSS 2.0
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title><![CDATA[Titi's Store — Catálogo Oficial]]></title>
    <link>${baseUrl}</link>
    <description><![CDATA[Catálogo de produtos e alfaiataria masculina Titi's Store para Instagram Shopping e Facebook Commerce.]]></description>
${itemsXml.join('\n')}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
