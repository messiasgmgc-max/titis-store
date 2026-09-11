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
        <div className="tape opacity-40" aria-hidden />
        <div className="absolute inset-y-0 left-0 overflow-hidden transition-[width] duration-700 ease-[var(--ease-couture)]" style={{ width: `${pct}%` }} aria-hidden>
          <div className="tape w-[2000px]" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,.45))' }} />
        </div>
        <div className="absolute inset-x-0 top-[22px] h-px bg-line" aria-hidden />
      </div>

      <ol className="relative mt-4 flex justify-between">
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
                className={cn('group flex flex-col gap-1.5 disabled:cursor-default', i === 0 ? 'items-start' : i === steps.length - 1 ? 'items-end' : 'items-center')}
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
