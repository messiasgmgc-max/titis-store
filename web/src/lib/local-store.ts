'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Armazenamento local reativo (useSyncExternalStore).
 * - No servidor e durante a hidratação o valor é sempre `null` (sem divergência de HTML).
 * - Gravações também ficam em memória: se o localStorage estiver cheio ou bloqueado
 *   (aba anônima, cota excedida), o estado continua funcionando nesta sessão.
 * - Mudanças feitas em outras abas chegam pelo evento `storage`.
 */

type Listener = () => void;

const memory = new Map<string, string | null>();
const listeners = new Map<string, Set<Listener>>();

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

export function readLocal(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  let value: string | null = null;
  try {
    value = window.localStorage.getItem(key);
  } catch {
    value = null;
  }
  // Cache: evita reler (e copiar) data URLs grandes a cada renderização.
  memory.set(key, value);
  return value;
}

export function writeLocal(key: string, value: string | null) {
  memory.set(key, value);
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* armazenamento indisponível: o valor segue em memória nesta sessão */
  }
  notify(key);
}

function subscribe(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key !== key && e.key !== null) return;
    memory.delete(key);
    listener();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    set.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const serverValue = () => null;

/** Valor bruto (string) de uma chave do localStorage, atualizado em tempo real. */
export function useLocalValue(key: string): string | null {
  const subscribeKey = useCallback((listener: Listener) => subscribe(key, listener), [key]);
  const snapshot = useCallback(() => readLocal(key), [key]);
  return useSyncExternalStore(subscribeKey, snapshot, serverValue);
}

const noopSubscribe = () => () => {};

/** `true` somente no navegador, depois da hidratação. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
