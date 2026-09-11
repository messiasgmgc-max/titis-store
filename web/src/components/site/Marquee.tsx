import { ATELIER_WORDS } from '@/lib/site';

/** Letreiro infinito com tecidos e ofícios do atelier. Pausa ao passar o cursor. */
export function Marquee() {
  const loop = [...ATELIER_WORDS, ...ATELIER_WORDS];

  return (
    <div className="relative border-y border-line bg-coal/60 py-6 sm:py-8">
      <div aria-hidden className="rule-gold absolute inset-x-0 top-0 opacity-50" />
      <p className="sr-only">Tecidos e ofícios do atelier: {ATELIER_WORDS.join(', ')}.</p>

      <div
        aria-hidden
        className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      >
        <ul className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused]">
          {loop.map((word, index) => (
            <li key={`${word}-${index}`} className="flex shrink-0 items-center">
              <span className="whitespace-nowrap px-6 font-display text-[clamp(2rem,4.6vw,3.9rem)] italic leading-[1.15] text-mist transition-colors duration-700 hover:text-parchment sm:px-10">
                {word}
              </span>
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden className="rule-gold absolute inset-x-0 bottom-0 opacity-30" />
    </div>
  );
}
