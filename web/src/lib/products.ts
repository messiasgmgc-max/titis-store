// Normalização de linhas da tabela public.products — isomórfico (servidor e navegador).
import type { PieceSlot, Product } from './types';

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

/** Aceita linhas do schema novo e do antigo (colunas ausentes recebem padrão). */
export function normalizeProduct(row: Record<string, unknown>): Product {
  const category = String(row.category ?? 'Alfaiataria');
  const slot = (row.slot as PieceSlot) || slotForCategory(category);
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
    image_url: (row.image_url as string) ?? null,
    gallery: arr<string>(row.gallery),
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
