'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { SEED_PRODUCTS } from './catalog-seed';
import { normalizeProduct, sortProducts } from './products';
import { deltaE } from './stylist/color';
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

/** Inscrição ativa em tempo real com Supabase Realtime para sincronização imediata */
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function initCatalogRealtime() {
  if (typeof window === 'undefined' || realtimeChannel) return;

  try {
    realtimeChannel = supabase
      .channel('catalog-products-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.info('[catalog realtime] Atualização detectada em public.products:', payload.eventType);
          invalidateCatalog();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[catalog realtime] Conectado ao Supabase Realtime com sucesso.');
        }
      });
  } catch (err) {
    console.warn('[catalog realtime] Falha ao registrar canal:', err);
  }
}

/** Função utilitária de busca rápida e resiliente no catálogo */
export function searchProducts(products: Product[], query: string): Product[] {
  const clean = (query || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!clean) return [];

  const terms = clean.split(/\s+/).filter(Boolean);

  return products.filter((p) => {
    const nameNorm = (p.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const catNorm = (p.category || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const descNorm = (p.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const colorNorm = (p.color_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const slugNorm = (p.slug || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const haystack = `${nameNorm} ${catNorm} ${descNorm} ${colorNorm} ${slugNorm}`;

    return terms.every((term) => haystack.includes(term));
  });
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
    initCatalogRealtime();
    fetchCatalog().then(apply);
    // invalidateCatalog() descarta o cache e notifica ouvintes com busca forçada atualizada
    const listener = () => reload(true);
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
 * por cor, nome e categoria, garantindo que NUNCA exiba foto com cor destoante da recomendação.
 */
export function matchProductForPiece(products: Product[], piece: LookPiece | null | undefined): Product | undefined {
  if (!piece || !products || products.length === 0) return undefined;

  // 1. Busca direta por productId ou slug
  if (piece.productId) {
    const direct = products.find((p) => p.id === piece.productId || p.slug === piece.productId);
    if (direct) {
      // Se a peça especificou hex e o produto tem hex, valida que não haja discrepância visual grosseira
      if (piece.hex && direct.hex_color) {
        const dist = deltaE(piece.hex, direct.hex_color);
        if (dist <= 35) return direct;
      } else {
        return direct;
      }
    }
  }

  // 2. Candidatos no mesmo slot
  const slotCandidates = products.filter((p) => p.is_active && p.slot === piece.slot);
  if (slotCandidates.length === 0) return undefined;

  const pieceNameNorm = (piece.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const pieceColorNorm = (piece.color || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 3. Pontuação de similaridade estrita com trava de fidelidade cromática
  const scored = slotCandidates
    .map((prod) => {
      let score = 0;
      const prodNameNorm = (prod.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const prodColorNorm = (prod.color_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const prodDescNorm = (prod.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Cálculo de proximidade de cor perceptual (deltaE)
      let colorDist = 999;
      if (piece.hex && prod.hex_color) {
        colorDist = deltaE(piece.hex, prod.hex_color);
      }

      const colorsMatch = Boolean(
        pieceColorNorm &&
          prodColorNorm &&
          (prodColorNorm.includes(pieceColorNorm) || pieceColorNorm.includes(prodColorNorm)),
      );

      // Trava de cor: se o deltaE for alto (> 32) e os nomes das cores não coincidirem, REJEITA o produto
      // Isso evita mostrar fotos de blazers beges quando o look pede blazer marinho ou vinho
      if (colorDist > 32 && !colorsMatch) {
        return { prod, score: -100 };
      }

      if (colorDist <= 10) score += 60;
      else if (colorDist <= 20) score += 40;
      else if (colorDist <= 32) score += 20;

      if (colorsMatch) score += 40;

      const words = pieceNameNorm.split(/\s+/).filter((w) => w.length >= 4);
      for (const w of words) {
        if (prodNameNorm.includes(w)) score += 30;
        if (prodDescNorm.includes(w)) score += 10;
      }

      if (prod.image_url) score += 10;
      if (prod.is_featured) score += 5;

      return { prod, score };
    })
    .filter((item) => item.score >= 35); // Exige compatibilidade real comprovada

  if (scored.length === 0) return undefined;

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.prod;
}
