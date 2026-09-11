'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Look, Product } from '@/lib/types';
import { uid } from '@/lib/format';

export type Overlay =
  | { type: 'auth'; mode?: 'login' | 'register' }
  | { type: 'bag' }
  | { type: 'scanner' }
  | { type: 'tryon'; look: Look }
  | { type: 'product'; product: Product };

export type ToastTone = 'success' | 'error' | 'info';
export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface UIValue {
  overlay: Overlay | null;
  openOverlay: (overlay: Overlay) => void;
  closeOverlay: () => void;
  conciergeOpen: boolean;
  setConciergeOpen: (open: boolean) => void;
  toasts: Toast[];
  toast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
}

const UIContext = createContext<UIValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = uid('toast');
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      setTimeout(() => dismissToast(id), tone === 'error' ? 6000 : 3800);
    },
    [dismissToast],
  );

  const openOverlay = useCallback((next: Overlay) => {
    setConciergeOpen(false);
    setOverlay(next);
  }, []);
  const closeOverlay = useCallback(() => setOverlay(null), []);

  const value = useMemo(
    () => ({ overlay, openOverlay, closeOverlay, conciergeOpen, setConciergeOpen, toasts, toast, dismissToast }),
    [overlay, openOverlay, closeOverlay, conciergeOpen, toasts, toast, dismissToast],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI deve ser usado dentro de <UIProvider>.');
  return ctx;
}
