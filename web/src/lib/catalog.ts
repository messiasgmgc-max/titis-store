'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { SEED_PRODUCTS } from './catalog-seed';
import { normalizeProduct, sortProducts } from './products';
import type { LookPiece, Product } from './types';

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
  return products.find((p) => p.id === id || p.slug === id);
}

/**
 * Vincula inteligentemente qualquer peça gerada pelo Atelier a um produto real do catálogo.
 * Se a peça não tiver productId ou o id não for encontrado, busca o melhor produto do mesmo slot
 * por cor, nome e categoria, garantindo que toda recomendação tenha foto e preço real da loja.
 */
export function matchProductForPiece(products: Product[], piece: LookPiece | null | undefined): Product | undefined {
  if (!piece || !products || products.length === 0) return undefined;

  // 1. Busca direta por productId ou slug
  if (piece.productId) {
    const direct = products.find((p) => p.id === piece.productId || p.slug === piece.productId);
    if (direct) return direct;
  }

  // 2. Candidatos no mesmo slot
  const slotCandidates = products.filter((p) => p.is_active && p.slot === piece.slot);
  if (slotCandidates.length === 0) return undefined;
  if (slotCandidates.length === 1) return slotCandidates[0];

  const pieceNameNorm = (piece.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const pieceColorNorm = (piece.color || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 3. Pontuação de similaridade
  const scored = slotCandidates.map((prod) => {
    let score = 0;
    const prodNameNorm = (prod.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const prodColorNorm = (prod.color_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const prodDescNorm = (prod.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const words = pieceNameNorm.split(/\s+/).filter((w) => w.length >= 4);
    for (const w of words) {
      if (prodNameNorm.includes(w)) score += 40;
      if (prodDescNorm.includes(w)) score += 15;
    }

    if (pieceColorNorm && prodColorNorm) {
      if (prodColorNorm.includes(pieceColorNorm) || pieceColorNorm.includes(prodColorNorm)) {
        score += 50;
      }
    }

    if (piece.hex && prod.hex_color && piece.hex.toLowerCase() === prod.hex_color.toLowerCase()) {
      score += 30;
    }

    if (prod.image_url) score += 10;
    if (prod.is_featured) score += 5;

    return { prod, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.prod;
}
