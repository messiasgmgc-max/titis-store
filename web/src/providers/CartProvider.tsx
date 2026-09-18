'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem } from '@/lib/types';
import { slugify } from '@/lib/format';
import { readLocal, useLocalValue, writeLocal } from '@/lib/local-store';

const BAG_KEY = 'titis:bag:v1';
const MAX_QUANTITY = 20;
/** Mesmo limite de linhas aceito pela tabela public.orders. */
export const MAX_CART_LINES = 60;

export type CartInput = Omit<CartItem, 'key' | 'quantity'> & { quantity?: number };

interface CartValue {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  hasUnpriced: boolean;
  /** Timestamp da última adição — útil para animar o ícone da sacola. */
  lastAddedAt: number;
  add: (item: CartInput) => void;
  addMany: (items: CartInput[]) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);
const EMPTY: CartItem[] = [];

function parseBag(raw: string | null): CartItem[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(
      (i): i is CartItem =>
        Boolean(i) && typeof i === 'object' && typeof (i as CartItem).key === 'string' && typeof (i as CartItem).name === 'string',
    );
  } catch {
    return EMPTY;
  }
}

function lineKey(item: CartInput): string {
  return [item.productId ?? slugify(item.name), item.size ?? '', item.color ?? ''].join('|');
}

function merge(list: CartItem[], input: CartInput): CartItem[] {
  const key = lineKey(input);
  const qty = Math.min(MAX_QUANTITY, Math.max(1, input.quantity ?? 1));
  const existing = list.find((i) => i.key === key);
  if (existing) {
    return list.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QUANTITY, i.quantity + qty) } : i));
  }
  if (list.length >= MAX_CART_LINES) return list;
  return [...list, { ...input, key, quantity: qty }];
}

/** Aplica a mudança sobre o valor mais recente gravado (evita closures desatualizadas). */
function updateBag(fn: (prev: CartItem[]) => CartItem[]) {
  const next = fn(parseBag(readLocal(BAG_KEY)));
  writeLocal(BAG_KEY, next.length ? JSON.stringify(next) : null);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const raw = useLocalValue(BAG_KEY);
  const items = useMemo(() => parseBag(raw), [raw]);
  const [lastAddedAt, setLastAddedAt] = useState(0);

  const add = useCallback((item: CartInput) => {
    updateBag((prev) => merge(prev, item));
    setLastAddedAt(Date.now());
  }, []);

  const addMany = useCallback((list: CartInput[]) => {
    updateBag((prev) => list.reduce(merge, prev));
    setLastAddedAt(Date.now());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const bagParam = searchParams.get('bag');
      if (bagParam) {
        const decoded = JSON.parse(decodeURIComponent(bagParam));
        if (Array.isArray(decoded) && decoded.length > 0) {
          addMany(decoded);
          const url = new URL(window.location.href);
          url.searchParams.delete('bag');
          window.history.replaceState({}, '', url.toString());
        }
      }
    } catch (err) {
      console.warn('Falha ao importar sacola da URL:', err);
    }
  }, [addMany]);

  const setQuantity = useCallback((key: string, quantity: number) => {
    updateBag((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_QUANTITY, quantity) } : i)),
    );
  }, []);

  const remove = useCallback((key: string) => updateBag((prev) => prev.filter((i) => i.key !== key)), []);
  const clear = useCallback(() => writeLocal(BAG_KEY, null), []);

  const value = useMemo<CartValue>(() => {
    const count = items.reduce((n, i) => n + i.quantity, 0);
    const subtotalCents = items.reduce((n, i) => n + (i.priceCents ?? 0) * i.quantity, 0);
    const hasUnpriced = items.some((i) => i.priceCents === null);
    return { items, count, subtotalCents, hasUnpriced, lastAddedAt, add, addMany, setQuantity, remove, clear };
  }, [items, lastAddedAt, add, addMany, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de <CartProvider>.');
  return ctx;
}
