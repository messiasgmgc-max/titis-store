'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { SEED_PRODUCTS } from './catalog-seed';
import { normalizeProduct, sortProducts } from './products';
import type { Product } from './types';

export { normalizeProduct, sortProducts } from './products';

type CatalogSource = 'supabase' | 'seed';
interface CatalogResult {
  products: Product[];
  source: CatalogSource;
}

let pending: Promise<CatalogResult> | null = null;
const listeners = new Set<() => void>();

async function load(): Promise<CatalogResult> {
  try {
    const { data, error } = await supabase.from('products').select('*').limit(500);
    if (error) throw error;
    const products = sortProducts((data ?? []).map((r) => normalizeProduct(r as Record<string, unknown>))).filter(
      (p) => p.is_active,
    );
    if (products.length === 0) return { products: SEED_PRODUCTS, source: 'seed' };
    return { products, source: 'supabase' };
  } catch (err) {
    console.warn('[catalog] usando acervo inicial:', err);
    return { products: SEED_PRODUCTS, source: 'seed' };
  }
}

export function fetchCatalog(force = false): Promise<CatalogResult> {
  if (!pending || force) pending = load();
  return pending;
}

/** Descarta o cache e notifica todos os componentes que usam o catálogo. */
export function invalidateCatalog() {
  pending = null;
  listeners.forEach((fn) => fn());
}

/** Catálogo público (somente peças ativas), compartilhado entre componentes. */
export function useCatalog() {
  const [state, setState] = useState<{ products: Product[]; source: CatalogSource; loading: boolean }>({
    products: [],
    source: 'seed',
    loading: true,
  });

  const alive = useRef(true);

  const apply = useCallback((r: CatalogResult) => {
    if (alive.current) setState({ products: r.products, source: r.source, loading: false });
  }, []);

  const reload = useCallback(
    (force: boolean) => {
      setState((s) => ({ ...s, loading: true }));
      fetchCatalog(force).then(apply);
    },
    [apply],
  );

  useEffect(() => {
    alive.current = true;
    fetchCatalog().then(apply);
    // invalidateCatalog() já descartou o cache: todos os ouvintes compartilham a mesma nova busca.
    const listener = () => reload(false);
    listeners.add(listener);
    return () => {
      alive.current = false;
      listeners.delete(listener);
    };
  }, [apply, reload]);

  const refresh = useCallback(() => reload(true), [reload]);

  return { ...state, refresh };
}

export function findProduct(products: Product[], id: string | null | undefined): Product | undefined {
  if (!id) return undefined;
  return products.find((p) => p.id === id);
}
