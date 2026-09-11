import Link from 'next/link';
import { ArrowDown, Check } from 'lucide-react';
import { formatBRL } from '@/lib/format';
import { CLUB_PLANS } from '@/lib/site';
import { ConsultingCta } from './ConsultingCta';
import { Eyebrow } from './Heading';
import { PhoneMockup } from './PhoneMockup';

const EASE_POINTS = ['100% online, pelo celular', 'Resultado na hora', 'Atendimento do Titi no WhatsApp'] as const;

const LOWEST_PRICE = Math.min(...CLUB_PLANS.flatMap((plan) => (plan.priceCents === null ? [] : [plan.priceCents])));

export function HomeHero() {
  return (
    <section
      id="inicio"
      data-hide-mobile-cta
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden pt-[72px] lg:pt-[88px]"
    >
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute -right-[12%] top-0 -z-10 aspect-square w-[70vw] max-w-[880px] opacity-70"
      />

      <div className="container-luxe grid items-center gap-14 pb-20 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12 lg:pb-24 lg:pt-12 xl:gap-20">
        <div className="max-w-[40rem]">
          <Eyebrow>Consultoria de imagem masculina online</Eyebrow>
          <h1
            id="hero-title"
            className="mt-5 text-[clamp(2.75rem,7vw,5.25rem)] font-extrabold leading-[1] tracking-[-0.035em] text-ivory"
          >
            Pare de adivinhar <span className="text-foil">o que vestir.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist md:text-xl">
            Envie uma foto e descubra as cores que valorizam o seu rosto. Receba sua cartela completa e looks montados
            para cada ocasião, com peças reais da loja e o Titi ao seu lado.
          </p>

          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
            <ConsultingCta />
            <Link
              href="#como-funciona"
              className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ivory transition-colors duration-300 hover:text-gold-light"
            >
              Ver como funciona
              <ArrowDown
                className="h-4 w-4 text-gold transition-transform duration-300 group-hover:translate-y-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-mist">
            {EASE_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-gold" strokeWidth={2.2} aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-smoke">
            Planos a partir de <span className="font-semibold text-parchment">{formatBRL(LOWEST_PRICE)}</span>.
          </p>
        </div>

        <PhoneMockup />
      </div>
    </section>
  );
}
