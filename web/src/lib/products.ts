// Normalização de linhas da tabela public.products — isomórfico (servidor e navegador).
import type { PieceSlot, Product, ProductVariant } from './types';
import { slugify } from './format';

export const LEGACY_SLOT: Record<string, PieceSlot> = {
  alfaiataria: 'sobreposicao',
  'sobreposição': 'sobreposicao',
  sobreposicao: 'sobreposicao',
  camisaria: 'superior',
  camisa: 'superior',
  malharia: 'superior',
  superior: 'superior',
  'calças': 'inferior',
  calcas: 'inferior',
  'calça': 'inferior',
  calca: 'inferior',
  'calçados': 'calcado',
  calcados: 'calcado',
  'calçado': 'calcado',
  calcado: 'calcado',
  'acessórios': 'acessorio',
  acessorios: 'acessorio',
  'acessório': 'acessorio',
  acessorio: 'acessorio',
};

/** Slot sugerido para uma categoria de produto. */
export function slotForCategory(category: string): PieceSlot {
  return LEGACY_SLOT[category.trim().toLowerCase()] ?? 'sobreposicao';
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Converte URLs antigas do WordPress para os arquivos estáticos locais em /produtos/ */
export function sanitizeProductImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.includes('/wp-content/uploads/')) {
    const filename = trimmed.split('/').pop()?.split('?')[0];
    if (filename) return `/produtos/${filename}`;
  }
  return trimmed;
}

/** Aceita linhas do schema novo e do antigo (colunas ausentes recebem padrão). */
export function normalizeProduct(row: Record<string, unknown>): Product {
  const category = String(row.category ?? 'Alfaiataria');
  const slot = (row.slot as PieceSlot) || slotForCategory(category);
  const rawVariants = Array.isArray(row.variants) ? (row.variants as Record<string, unknown>[]) : [];
  const variants: ProductVariant[] = rawVariants.map((v, i) => ({
    id: String(v.id || `variant-${i}`),
    color_name: String(v.color_name || ''),
    hex_color: String(v.hex_color || ''),
    image_url: sanitizeProductImageUrl(v.image_url as string),
    gallery: arr<string>(v.gallery)
      .map((u) => sanitizeProductImageUrl(u))
      .filter((u): u is string => Boolean(u)),
    sizes: arr<string>(v.sizes),
    price_cents: typeof v.price_cents === 'number' ? v.price_cents : null,
    sku: v.sku ? String(v.sku) : null,
    stock: typeof v.stock === 'number' ? v.stock : null,
  }));

  return {
    id: String(row.id),
    slug: (row.slug as string) ?? null,
    name: String(row.name ?? 'Peça sem nome'),
    category,
    slot,
    description: (row.description as string) ?? null,
    fabric: (row.fabric as string) ?? null,
    color_name: (row.color_name as string) ?? null,
    hex_color: (row.hex_color as string) ?? null,
    image_url: sanitizeProductImageUrl(row.image_url as string),
    gallery: arr<string>(row.gallery)
      .map((u) => sanitizeProductImageUrl(u))
      .filter((u): u is string => Boolean(u)),
    variants,
    price_cents: typeof row.price_cents === 'number' ? row.price_cents : null,
    sizes: arr<string>(row.sizes),
    skin_tones: arr(row.skin_tones),
    occasions: arr(row.occasions),
    climates: arr(row.climates),
    formality: typeof row.formality === 'number' ? row.formality : 3,
    season_compatibility: arr<string>(row.season_compatibility),
    is_active: row.is_active !== false,
    is_featured: row.is_featured === true,
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 100,
    created_at: (row.created_at as string) ?? undefined,
    updated_at: (row.updated_at as string) ?? undefined,
  };
}

export function sortProducts(list: Product[]): Product[] {
  return [...list].sort(
    (a, b) => a.sort_order - b.sort_order || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
  );
}

// ------------------------------------------------------------
// Roteamento amigável por Categoria e Variação (/categoria/slug-cor-tamanho)
// ------------------------------------------------------------

export const CATEGORY_SLUGS: Record<string, string> = {
  alfaiataria: 'alfaiataria',
  camisaria: 'camisaria',
  malharia: 'malharia',
  calcas: 'calcas',
  'calças': 'calcas',
  calca: 'calcas',
  'calça': 'calcas',
  calcados: 'calcados',
  'calçados': 'calcados',
  calcado: 'calcados',
  'calçado': 'calcados',
  acessorios: 'acessorios',
  'acessórios': 'acessorios',
  acessorio: 'acessorios',
  'acessório': 'acessorios',
};

/** Mapeamento de slug para nome formal de categoria */
export const CATEGORY_NAMES_BY_SLUG: Record<string, string> = {
  alfaiataria: 'Alfaiataria',
  camisaria: 'Camisaria',
  malharia: 'Malharia',
  calcas: 'Calças',
  calcados: 'Calçados',
  acessorios: 'Acessórios',
};

export function getCategorySlug(category?: string | null): string {
  if (!category) return 'alfaiataria';
  const norm = slugify(category);
  return CATEGORY_SLUGS[norm] || norm || 'alfaiataria';
}

/** Obtém o slug base limpo de um produto sem sufixos redundantes de cor ou tamanho */
export function getProductBaseSlug(product: Product): string {
  let rawSlug = product.slug ? slugify(product.slug) : slugify(product.name);
  if (!rawSlug) rawSlug = product.id;

  const colorSlugs = [
    product.color_name,
    ...(product.variants?.map((v) => v.color_name) || []),
  ]
    .filter((c): c is string => Boolean(c && c.trim()))
    .map((c) => slugify(c))
    .filter(Boolean);

  for (const cSlug of colorSlugs) {
    if (cSlug && rawSlug.endsWith(`-${cSlug}`)) {
      const stripped = rawSlug.slice(0, -(cSlug.length + 1));
      if (stripped.length >= 3) {
        rawSlug = stripped;
        break;
      }
    }
  }

  return rawSlug;
}

/** Constrói o caminho URL canônico do produto com variação de cor e tamanho (ex: /alfaiataria/blazer-roma-azul-marinho-48) */
export function buildProductPath(
  product: Product,
  options?: { colorName?: string | null; size?: string | null }
): string {
  const catSlug = getCategorySlug(product.category);
  const baseSlug = getProductBaseSlug(product);

  const color = options?.colorName ?? product.color_name ?? product.variants?.[0]?.color_name ?? '';
  const colorSlug = color ? slugify(color) : '';

  const size = options?.size ?? product.sizes?.[0] ?? '';
  const sizeSlug = size ? slugify(size) : '';

  const parts = [baseSlug];
  if (colorSlug && !baseSlug.endsWith(colorSlug)) {
    parts.push(colorSlug);
  }
  if (sizeSlug) {
    parts.push(sizeSlug);
  }

  return `/${catSlug}/${parts.join('-')}`;
}

export interface ResolvedProductRoute {
  product: Product;
  selectedVariantId: string;
  selectedColor: string;
  selectedHex: string;
  selectedSize: string;
  canonicalPath: string;
}

/** Localiza o produto e seleciona variação e tamanho a partir da URL (/categoria/slug-cor-tamanho) */
export function resolveProductFromPath(
  products: Product[],
  rawSlug: string,
  categoryParam?: string
): ResolvedProductRoute | null {
  if (!products || products.length === 0 || !rawSlug) return null;

  const cleanSlug = slugify(rawSlug);
  const catFilter = categoryParam ? getCategorySlug(categoryParam) : null;

  // 1. Prioriza produtos que pertencem à categoria especificada (se informada)
  const candidates = catFilter && catFilter !== 'produtos'
    ? [
        ...products.filter((p) => getCategorySlug(p.category) === catFilter),
        ...products.filter((p) => getCategorySlug(p.category) !== catFilter),
      ]
    : products;

  let matchedProduct: Product | null = null;
  let matchedVariantColor: string | null = null;
  let matchedSize: string | null = null;

  // Verifica se há produto com slug ou id exato
  const exact = candidates.find(
    (p) => p.id === rawSlug || (p.slug && slugify(p.slug) === cleanSlug)
  );

  if (exact) {
    matchedProduct = exact;
  } else {
    // 2. Procura por prefixo do baseSlug ou slug do produto
    const scored = candidates
      .map((p) => {
        const pBase = getProductBaseSlug(p);
        const pSlug = p.slug ? slugify(p.slug) : '';
        let score = 0;
        let matchedPrefix = '';

        if (cleanSlug === pBase || cleanSlug === pSlug) {
          score = 1000 + pBase.length;
          matchedPrefix = cleanSlug === pBase ? pBase : pSlug;
        } else if (cleanSlug.startsWith(`${pBase}-`)) {
          score = 500 + pBase.length;
          matchedPrefix = pBase;
        } else if (pSlug && cleanSlug.startsWith(`${pSlug}-`)) {
          score = 400 + pSlug.length;
          matchedPrefix = pSlug;
        } else if (pBase.startsWith(cleanSlug) || cleanSlug.includes(pBase)) {
          score = 100 + pBase.length;
          matchedPrefix = pBase;
        }

        if (score > 0 && catFilter && getCategorySlug(p.category) === catFilter) {
          score += 200;
        }

        return { product: p, score, matchedPrefix };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0) {
      matchedProduct = scored[0].product;
      const prefix = scored[0].matchedPrefix;
      const suffix = cleanSlug.startsWith(`${prefix}-`)
        ? cleanSlug.slice(prefix.length + 1)
        : '';

      if (suffix) {
        const allSizes = (matchedProduct.sizes || []).map((s) => ({
          raw: s,
          slug: slugify(s),
        }));

        // Tenta extrair o tamanho no final do suffix
        for (const s of allSizes) {
          if (suffix === s.slug) {
            matchedSize = s.raw;
            break;
          }
          if (suffix.endsWith(`-${s.slug}`)) {
            matchedSize = s.raw;
            const restColor = suffix.slice(0, -(s.slug.length + 1));
            if (restColor) {
              matchedVariantColor = restColor;
            }
            break;
          }
        }

        if (!matchedSize && !matchedVariantColor) {
          matchedVariantColor = suffix;
        }
      }
    }
  }

  if (!matchedProduct) return null;

  // 3. Constrói lista de todas as variantes disponíveis (base + variants[])
  const allVariants = [];
  if (matchedProduct.color_name || matchedProduct.hex_color || matchedProduct.image_url) {
    allVariants.push({
      id: 'base',
      color_name: matchedProduct.color_name || 'Padrão',
      hex_color: matchedProduct.hex_color || '#181b24',
      image_url: matchedProduct.image_url,
      sizes: matchedProduct.sizes?.length ? matchedProduct.sizes : ['P', 'M', 'G', 'GG'],
    });
  }
  if (matchedProduct.variants && Array.isArray(matchedProduct.variants)) {
    for (const v of matchedProduct.variants) {
      if (v && (v.color_name || v.hex_color || v.image_url)) {
        allVariants.push({
          id: v.id || v.color_name || `var-${allVariants.length}`,
          color_name: v.color_name || 'Variação',
          hex_color: v.hex_color || '#181b24',
          image_url: v.image_url || matchedProduct.image_url,
          sizes: v.sizes?.length ? v.sizes : (matchedProduct.sizes?.length ? matchedProduct.sizes : ['P', 'M', 'G', 'GG']),
        });
      }
    }
  }

  // 4. Seleciona a variante correspondente
  let chosenVariant = allVariants[0];
  if (matchedVariantColor) {
    const cleanColorQuery = slugify(matchedVariantColor);
    const found = allVariants.find((v) => {
      const vSlug = slugify(v.color_name);
      return (
        vSlug === cleanColorQuery ||
        vSlug.includes(cleanColorQuery) ||
        cleanColorQuery.includes(vSlug)
      );
    });
    if (found) {
      chosenVariant = found;
    }
  }

  const availableSizes = chosenVariant?.sizes?.length
    ? chosenVariant.sizes
    : (matchedProduct.sizes?.length ? matchedProduct.sizes : ['P', 'M', 'G', 'GG']);

  // 5. Seleciona o tamanho
  let chosenSize = availableSizes[0] || 'M';
  if (matchedSize) {
    const cleanSizeQuery = slugify(matchedSize);
    const foundSize = availableSizes.find((s) => slugify(s) === cleanSizeQuery);
    if (foundSize) {
      chosenSize = foundSize;
    }
  }

  const canonical = buildProductPath(matchedProduct, {
    colorName: chosenVariant?.color_name,
    size: chosenSize,
  });

  return {
    product: matchedProduct,
    selectedVariantId: chosenVariant?.id || 'base',
    selectedColor: chosenVariant?.color_name || matchedProduct.color_name || 'Padrão',
    selectedHex: chosenVariant?.hex_color || matchedProduct.hex_color || '#181b24',
    selectedSize: chosenSize,
    canonicalPath: canonical,
  };
}

