import { cn } from '@/lib/format';

/**
 * Fita métrica de alfaiate usada como indicador de progresso.
 * `current` é o índice (0-based) da etapa ativa.
 */
export function TapeMeasure({
  steps,
  current,
  onStepClick,
  canVisit,
  className,
}: {
  steps: string[];
  current: number;
  onStepClick?: (index: number) => void;
  /** Define se uma etapa pode ser clicada (padrão: etapas já visitadas). */
  canVisit?: (index: number) => boolean;
  className?: string;
}) {
  const last = Math.max(1, steps.length - 1);
  const pct = (Math.min(current, last) / last) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <div className="tape rounded-full opacity-40" aria-hidden />
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width] duration-700 ease-[var(--ease-couture)]"
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          <div className="tape w-[2000px]" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,.45))' }} />
        </div>
        <div className="absolute inset-x-0 top-[22px] h-px rounded-full bg-line" aria-hidden />
        {/* Marcadores redondos sobre a linha, um por etapa */}
        <div className="pointer-events-none absolute inset-x-0 top-[22px]" aria-hidden>
          {steps.map((label, i) => {
            const active = i === current;
            const done = i < current;
            const left = steps.length > 1 ? (i / (steps.length - 1)) * 100 : 0;
            return (
              <span
                key={label}
                className={cn(
                  'absolute top-1/2 h-3 w-3 rounded-full border transition-[background-color,border-color,box-shadow,transform] duration-500 ease-[var(--ease-couture)]',
                  active
                    ? 'border-gold-light bg-gold shadow-[0_0_0_4px_rgb(212_175_55/0.18),0_0_14px_rgb(212_175_55/0.6)]'
                    : done
                      ? 'border-gold bg-gold'
                      : 'border-ivory/25 bg-obsidian',
                )}
                style={{
                  left: `${left}%`,
                  transform: `translate(${i === 0 ? '0' : i === steps.length - 1 ? '-100%' : '-50%'}, -50%) scale(${active ? 1.25 : 1})`,
                }}
              />
            );
          })}
        </div>
      </div>

      <ol className="relative mt-5 flex justify-between">
        {steps.map((label, i) => {
          const active = i === current;
          const done = i < current;
          const clickable = onStepClick && (canVisit ? canVisit(i) : i <= current);
          return (
            <li key={label} className={cn('flex flex-1 flex-col', i === 0 ? 'items-start' : i === steps.length - 1 ? 'items-end text-right' : 'items-center text-center')}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => clickable && onStepClick?.(i)}
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'group -mx-2 flex flex-col gap-1.5 rounded-2xl px-2 py-1 transition-colors disabled:cursor-default',
                  clickable && 'hover:bg-ivory/[0.03]',
                  i === 0 ? 'items-start' : i === steps.length - 1 ? 'items-end' : 'items-center',
                )}
              >
                <span
                  className={cn(
                    'numeral text-[11px] font-semibold tracking-[0.14em] transition-colors',
                    active || done ? 'text-gold' : 'text-smoke',
                  )}
                >
                  {['I', 'II', 'III', 'IV', 'V'][i]}
                </span>
                <span
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors sm:text-[12px]',
                    active ? 'text-ivory' : done ? 'text-mist group-hover:text-ivory' : 'text-smoke',
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
