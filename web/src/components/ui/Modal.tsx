'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/format';

type Variant = 'center' | 'drawer' | 'fullscreen';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  /** Título acessível (visível se `showTitle`). */
  title: string;
  showTitle?: boolean;
  variant?: Variant;
  size?: Size;
  className?: string;
  hideClose?: boolean;
}

const sizeClass: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

const EASE = [0.22, 1, 0.36, 1] as const;
const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

const subscribeNever = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Diálogo acessível (ESC, trava de rolagem, foco preso) com variantes centro, gaveta e tela cheia. */
export function Modal({
  onClose,
  children,
  title,
  showTitle = false,
  variant = 'center',
  size = 'md',
  className,
  hideClose = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Portal só existe no navegador: falso na renderização do servidor e na hidratação.
  const mounted = useSyncExternalStore(subscribeNever, clientSnapshot, serverSnapshot);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ??
        panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    }, 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (n) => n.offsetParent !== null,
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKey);
      html.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  if (!mounted) return null;

  const panelMotion =
    variant === 'drawer'
      ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
      : variant === 'fullscreen'
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
        : { initial: { opacity: 0, y: 24, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 16, scale: 0.98 } };

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="presentation">
      <motion.div
        className="absolute inset-0 bg-obsidian/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex',
          variant === 'center' && 'items-end justify-center sm:items-center sm:p-6',
          variant === 'drawer' && 'justify-end',
        )}
      >
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          {...panelMotion}
          transition={{ duration: 0.55, ease: EASE }}
          className={cn(
            'pointer-events-auto relative flex flex-col bg-surface text-ivory outline-none',
            variant === 'center' &&
              cn(
                'max-h-[92dvh] w-full overflow-y-auto rounded-t-[var(--radius-panel)] border border-line-gold sm:max-h-[88vh] sm:rounded-[var(--radius-panel)]',
                sizeClass[size],
              ),
            variant === 'drawer' &&
              'h-full w-full max-w-md overflow-y-auto border-l border-line-gold sm:rounded-l-[var(--radius-panel)]',
            variant === 'fullscreen' && 'h-full w-full overflow-y-auto',
            className,
          )}
        >
          <h2 id={titleId} className={cn(showTitle ? 'px-6 pt-6 font-display text-[1.6rem] font-extrabold leading-[1.1] tracking-[-0.02em] sm:px-8 sm:pt-8 sm:text-[1.85rem]' : 'sr-only')}>
            {title}
          </h2>
          {!hideClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full text-mist transition-colors hover:bg-ivory/[0.05] hover:text-gold-light"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          )}
          {children}
        </motion.div>
      </div>
    </div>,
    document.body,
  );
}
