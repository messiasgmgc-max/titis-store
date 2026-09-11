'use client';

import { useState } from 'react';
import { ChevronDown, CircleAlert, ImageOff, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/format';

type IconComponent = React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;

/** Cabeçalho de bloco: numeral romano · pesponto · sobretítulo. */
export function SectionLabel({ numeral, children, className }: { numeral: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="numeral text-[0.7rem]">{numeral}</span>
      <span className="stitch w-8" aria-hidden />
      <span className="eyebrow">{children}</span>
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      ) : (
        <span className="label">{label}</span>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-danger" role="alert">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-smoke">{hint}</p>
      ) : null}
    </div>
  );
}

/** Interruptor retangular (sem pílulas): trilho fino e botão quadrado dourado. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'group relative inline-flex h-5 w-9 shrink-0 items-center border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'border-gold bg-gold/15' : 'border-line bg-ivory/[0.03] hover:border-ivory/25',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute left-[3px] h-3 w-3 transition-transform duration-300 ease-[var(--ease-couture)]',
          checked ? 'translate-x-4 bg-gold' : 'translate-x-0 bg-smoke group-hover:bg-mist',
        )}
      />
    </button>
  );
}

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn('relative block', className)}>
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" strokeWidth={1.5} aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="field py-2.5 pl-10 text-sm"
      />
    </label>
  );
}

export function SelectBox({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn('relative block', className)}>
      <select {...props} className="field cursor-pointer appearance-none py-2.5 pr-9 text-sm disabled:cursor-not-allowed disabled:opacity-50">
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke" strokeWidth={1.5} aria-hidden />
    </span>
  );
}

/** Filtro segmentado com contagens. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'inline-flex items-center gap-2 border px-3 py-2 text-[0.66rem] font-medium uppercase tracking-[0.18em] transition-colors duration-300',
              active ? 'border-gold/70 bg-gold/10 text-gold-light' : 'border-line text-mist hover:border-ivory/25 hover:text-ivory',
            )}
          >
            {o.label}
            {typeof o.count === 'number' && <span className={cn('tabular-nums', active ? 'text-gold' : 'text-smoke')}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function RefreshButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className="btn btn-ghost btn-sm" aria-label="Atualizar lista">
      <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} strokeWidth={1.75} aria-hidden />
      <span className="hidden sm:inline">Atualizar</span>
    </button>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  disabled,
  active,
  tone = 'default',
  className,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  tone?: 'default' | 'danger';
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'grid h-9 w-9 shrink-0 place-items-center border border-transparent transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-35',
        tone === 'danger' ? 'text-smoke hover:border-danger/40 hover:text-danger' : 'text-mist hover:border-line-gold hover:text-gold-light',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Miniatura de imagem remota com fallback discreto. */
export function Thumb({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const broken = !src || failed === src;
  return (
    <span className={cn('relative block shrink-0 overflow-hidden border border-line bg-surface-2', className)}>
      {broken ? (
        <span className="absolute inset-0 grid place-items-center text-smoke">
          <ImageOff className="h-4 w-4" strokeWidth={1.25} aria-hidden />
          <span className="sr-only">{alt}</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

export function LoadingRows({ rows = 5, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-live="polite" className="divide-y divide-line border border-line">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4" aria-hidden>
          <span className="h-14 w-11 animate-pulse bg-surface-2" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-2/5 animate-pulse bg-surface-2" />
            <span className="block h-2.5 w-1/4 animate-pulse bg-surface-2/70" />
          </span>
          <span className="hidden h-3 w-20 animate-pulse bg-surface-2 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: IconComponent;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center border border-line px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-line-gold text-gold">
        <Icon className="h-5 w-5" strokeWidth={1.25} aria-hidden />
      </span>
      <p className="mt-5 font-display text-2xl text-ivory sm:text-3xl">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm leading-relaxed text-mist">{children}</div>}
      {action && <div className="mt-7 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying?: boolean }) {
  return (
    <div className="flex flex-col items-center border border-danger/30 bg-danger/[0.04] px-6 py-14 text-center" role="alert">
      <CircleAlert className="h-6 w-6 text-danger" strokeWidth={1.25} aria-hidden />
      <p className="mt-4 font-display text-2xl text-ivory">Algo não saiu como previsto</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">{message}</p>
      <Button variant="outline" size="sm" className="mt-6" onClick={onRetry} loading={retrying}>
        Tentar novamente
      </Button>
    </div>
  );
}

export function InlineError({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-danger/30 bg-danger/[0.04] px-4 py-3 text-sm" role="alert">
      <span className="flex items-center gap-2 text-parchment">
        <CircleAlert className="h-4 w-4 shrink-0 text-danger" strokeWidth={1.75} aria-hidden />
        {message}
      </span>
      <button type="button" onClick={onRetry} disabled={retrying} className="link-luxe text-[0.66rem] text-gold-light">
        Tentar novamente
      </button>
    </div>
  );
}

/** Botão de ação destrutiva (contorno em tom de alerta). */
export function DangerButton({
  children,
  onClick,
  loading,
  disabled,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn('btn btn-sm border border-danger/50 text-danger hover:border-danger hover:bg-danger/10', className)}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Diálogo de confirmação. `onCancel` deve ser estável (useCallback). */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = 'gold',
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  tone?: 'gold' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal onClose={onCancel} title={title} showTitle size="sm">
      <div className="px-6 pb-6 pt-3 sm:px-8 sm:pb-8">
        <div className="text-sm leading-relaxed text-mist">{children}</div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          {tone === 'danger' ? (
            <DangerButton onClick={onConfirm} loading={busy}>
              {confirmLabel}
            </DangerButton>
          ) : (
            <Button size="sm" onClick={onConfirm} loading={busy}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
