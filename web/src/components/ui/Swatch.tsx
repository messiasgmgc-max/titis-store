import { cn } from '@/lib/format';

const sizes = {
  sm: { box: 'w-11', label: 'text-[10px]' },
  md: { box: 'w-16', label: 'text-[11px]' },
  lg: { box: 'w-24', label: 'text-xs' },
} as const;

/**
 * Amostra de tecido: bloco de cor com textura de trama e borda picotada (tesoura zig-zag),
 * como nos mostruários de alfaiataria.
 */
export function Swatch({
  name,
  hex,
  size = 'md',
  showLabel = true,
  muted = false,
  className,
}: {
  name: string;
  hex: string;
  size?: keyof typeof sizes;
  showLabel?: boolean;
  /** Para cores "a evitar": aplica um risco diagonal. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <figure className={cn('flex flex-col gap-2', sizes[size].box, className)} title={`${name} · ${hex}`}>
      <span className="pinked relative block aspect-[3/4] w-full overflow-hidden" style={{ backgroundColor: hex }}>
        <span
          className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, #000 0 1px, transparent 1px 3px)',
          }}
        />
        <span className="absolute inset-x-0 top-0 h-px bg-white/25" />
        {muted && (
          <span
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top right, transparent calc(50% - 1px), rgba(11,12,16,.85) 50%, transparent calc(50% + 1px))' }}
          />
        )}
      </span>
      {showLabel && (
        <figcaption className={cn('leading-tight text-mist', sizes[size].label)}>
          <span className="block text-ivory/90">{name}</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-smoke">{hex}</span>
        </figcaption>
      )}
    </figure>
  );
}

/** Bolinha de cor para listas compactas. */
export function ColorDot({ hex, className, size = 12 }: { hex: string; className?: string; size?: number }) {
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full ring-1 ring-white/20', className)}
      style={{ backgroundColor: hex, width: size, height: size }}
      aria-hidden
    />
  );
}
