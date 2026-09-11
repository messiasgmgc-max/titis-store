import { Medallion } from '@/components/ui/Logo';
import { cn } from '@/lib/format';

/** Carregador da área do cliente: medalhão girando devagar sobre pesponto dourado. */
export function AccountLoader({ label = 'Abrindo sua ficha', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex min-h-[70dvh] flex-col items-center justify-center gap-7 px-6 text-center', className)}
    >
      <span className="relative grid place-items-center">
        <span className="glow-gold absolute h-44 w-44" aria-hidden />
        <span className="absolute h-[124px] w-[124px] rounded-full border border-dashed border-line-gold animate-spin-slow" aria-hidden />
        <Medallion size={84} className="animate-spin-slow" />
      </span>
      <span className="flex flex-col items-center gap-3">
        <span className="stitch w-16" aria-hidden />
        <span className="eyebrow">{label}</span>
      </span>
    </div>
  );
}
