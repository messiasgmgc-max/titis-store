import { cn } from '@/lib/format';

/**
 * Título que entra palavra por palavra com uma virada 3D (CSS puro: começa
 * antes mesmo da hidratação). As `accentWords` recebem o acabamento em ouro.
 */
export function FlipWords({
  words,
  accentWords = [],
  startDelay = 0.15,
  step = 0.09,
  className,
}: {
  words: string[];
  accentWords?: string[];
  startDelay?: number;
  step?: number;
  className?: string;
}) {
  const all = [...words.map((w) => ({ w, accent: false })), ...accentWords.map((w) => ({ w, accent: true }))];
  return (
    <span className={cn('inline', className)}>
      {all.map(({ w, accent }, index) => (
        <span key={`${w}-${index}`}>
          <span className="inline-block [perspective:900px]">
            <span
              className={cn('inline-block origin-bottom animate-flip-in', accent && 'text-foil')}
              style={{ animationDelay: `${(startDelay + index * step).toFixed(2)}s` }}
            >
              {w}
            </span>
          </span>
          {index < all.length - 1 ? ' ' : null}
        </span>
      ))}
    </span>
  );
}
