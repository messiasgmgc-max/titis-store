import { cn } from '@/lib/format';

const ROMAN: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** Numeral romano para capítulos e índices (1 → I). */
export function toRoman(value: number): string {
  let n = Math.max(1, Math.floor(value));
  let out = '';
  for (const [amount, symbol] of ROMAN) {
    while (n >= amount) {
      out += symbol;
      n -= amount;
    }
  }
  return out;
}

/** Primeira palavra do nome, com fallback para o início do e-mail. */
export function firstName(fullName: string | null | undefined, email?: string | null): string {
  const fromName = fullName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const fromEmail = email?.split('@')[0]?.split(/[._-]/)[0];
  if (fromEmail) return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
  return 'cliente';
}

/** Cabeçalho interno de cada aba. */
export function TabIntro({
  numeral,
  eyebrow,
  title,
  lead,
  aside,
}: {
  numeral: string;
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <div className="flex items-center gap-4">
          <span className="numeral text-xs">{numeral}</span>
          <span className="stitch w-8" aria-hidden />
          <span className="eyebrow">{eyebrow}</span>
        </div>
        <h2 className="mt-4 font-display text-[clamp(1.6rem,3.3vw,2.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-ivory">
          {title}
        </h2>
        {lead && <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">{lead}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Estado vazio ou de erro, com moldura em pesponto. */
export function StatePanel({
  title,
  children,
  actions,
  tone = 'neutral',
  className,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: 'neutral' | 'error';
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn('panel relative overflow-hidden px-6 py-12 text-center sm:px-12 sm:py-16', className)}
    >
      <span className="stitch absolute inset-x-6 top-4" aria-hidden />
      <span className="stitch absolute inset-x-6 bottom-4" aria-hidden />
      <h3
        className={cn(
          'font-display text-[clamp(1.35rem,2.8vw,1.9rem)] font-extrabold leading-[1.12] tracking-[-0.02em]',
          tone === 'error' ? 'text-parchment' : 'text-ivory',
        )}
      >
        {title}
      </h3>
      {children && <div className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-mist">{children}</div>}
      {actions && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}

/** Esqueleto de carregamento para listas de cartões. */
export function SkeletonList({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="panel animate-pulse p-6 sm:p-8" aria-hidden style={{ animationDelay: `${i * 120}ms` }}>
          <div className="flex items-center gap-4">
            <span className="h-3 w-10 bg-surface-2" />
            <span className="h-3 w-24 bg-surface-2" />
          </div>
          <div className="mt-5 h-6 w-2/3 max-w-sm bg-surface-2" />
          <div className="mt-5 flex gap-2">
            <span className="h-5 w-16 bg-surface-2" />
            <span className="h-5 w-20 bg-surface-2" />
            <span className="h-5 w-14 bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Etiqueta retangular de contexto (tecido/ocasião/clima). */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border border-line px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist',
        className,
      )}
    >
      {children}
    </span>
  );
}
