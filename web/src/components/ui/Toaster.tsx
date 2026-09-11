'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useUI } from '@/providers/UIProvider';
import { cn } from '@/lib/format';

const icons = { success: CircleCheck, error: CircleAlert, info: Info };

export function Toaster() {
  const { toasts, dismissToast } = useUI();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex max-w-md items-center gap-3 border border-line-gold bg-surface/95 px-4 py-3 text-sm text-ivory shadow-2xl backdrop-blur-md"
              role={t.tone === 'error' ? 'alert' : 'status'}
            >
              <Icon
                className={cn('h-4 w-4 shrink-0', t.tone === 'success' && 'text-success', t.tone === 'error' && 'text-danger', t.tone === 'info' && 'text-gold')}
                strokeWidth={1.75}
              />
              <span className="leading-snug">{t.message}</span>
              <button type="button" onClick={() => dismissToast(t.id)} className="ml-1 text-smoke hover:text-ivory" aria-label="Dispensar aviso">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
