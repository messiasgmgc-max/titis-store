// ============================================================
// Catálogo no servidor — peças ativas do Supabase com cache curto
// em memória; acervo inicial quando o banco está vazio ou indisponível.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { SEED_PRODUCTS } from '@/lib/catalog-seed';
import { normalizeProduct, sortProducts } from '@/lib/products';
import type { Product } from '@/lib/types';
import { createServerSupabase } from './supabase-server';

const TTL_MS = 60_000;
const RETRY_AFTER_ERROR_MS = 15_000;
const QUERY_TIMEOUT_MS = 5_000;

let client: SupabaseClient | null = null;
let cache: { expiresAt: number; products: Product[] } | null = null;
let inflight: Promise<Product[]> | null = null;

async function load(): Promise<Product[]> {
  try {
    client ??= createServerSupabase();
    const { data, error } = await client
      .from('products')
      .select('*')
      .limit(500)
      .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS));
    if (error) throw new Error(error.message);

    const products = sortProducts((data ?? []).map((row) => normalizeProduct(row as Record<string, unknown>))).filter(
      (p) => p.is_active,
    );
    const result = products.length > 0 ? products : SEED_PRODUCTS;
    cache = { expiresAt: Date.now() + TTL_MS, products: result };
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[catalog] usando acervo inicial — ${message.slice(0, 200)}`);
    cache = { expiresAt: Date.now() + RETRY_AFTER_ERROR_MS, products: SEED_PRODUCTS };
    return SEED_PRODUCTS;
  }
}

/** Peças ativas ordenadas (nunca lança; cai no acervo inicial). */
export async function getActiveCatalog(): Promise<Product[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.products;
  inflight ??= load().finally(() => {
    inflight = null;
  });
  return inflight;
}
