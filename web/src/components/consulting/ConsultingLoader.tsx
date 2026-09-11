import { Medallion } from '@/components/ui/Logo';
import { cn } from '@/lib/format';
import { EYEBROW } from './shared';

/** Carregador da área paga: medalhão girando devagar com pesponto dourado. */
export function ConsultingLoader({ label = 'Abrindo sua consultoria', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex min-h-[60dvh] flex-col items-center justify-center gap-7 px-6 text-center', className)}
    >
      <span className="relative grid place-items-center">
        <span className="glow-gold absolute h-40 w-40" aria-hidden />
        <span className="absolute h-[112px] w-[112px] animate-spin-slow rounded-full border border-dashed border-line-gold" aria-hidden />
        <Medallion size={76} />
      </span>
      <span className="flex flex-col items-center gap-3">
        <span className="stitch w-14" aria-hidden />
        <span className={EYEBROW}>{label}</span>
      </span>
    </div>
  );
}
