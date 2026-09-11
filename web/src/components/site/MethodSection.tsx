import Link from 'next/link';
import { ArrowRight, Compass, Layers, ScanFace, Scissors } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ColorDot } from '@/components/ui/Swatch';
import { cn } from '@/lib/format';
import { SEASON_MATRIX, SKIN_TONES, SUBTONES } from '@/lib/stylist/knowledge';
import type { SkinToneId, Subtone } from '@/lib/types';

interface Act {
  numeral: string;
  title: string;
  detail: string;
  text: string;
  icon: typeof ScanFace;
}

const ACTS: Act[] = [
  {
    numeral: 'I',
    title: 'Leitura',
    detail: 'Tom · subtom · contraste',
    text: 'Por uma foto ou por escolha guiada, identificamos a profundidade da pele, o subtom e o contraste entre pele, cabelo e barba. É daí que nasce a sua estação.',
    icon: ScanFace,
  },
  {
    numeral: 'II',
    title: 'Contexto',
    detail: 'Ocasião · horário · clima · estilo',
    text: 'Uma reunião às nove e um jantar à noite pedem linguagens diferentes. Antes de escolher a peça, entendemos o momento, a temperatura e o seu jeito de vestir.',
    icon: Compass,
  },
  {
    numeral: 'III',
    title: 'Composição',
    detail: 'Três looks com peças do acervo',
    text: 'Montamos três looks completos com peças do acervo da casa, equilibrando cor, formalidade e proporção em cada combinação.',
    icon: Layers,
  },
  {
    numeral: 'IV',
    title: 'Prova',
    detail: 'Provador virtual · ajuste no WhatsApp',
    text: 'Veja o look aplicado ao seu rosto no provador virtual e finalize os detalhes — tamanho, caimento e disponibilidade — direto pelo WhatsApp.',
    icon: Scissors,
  },
];

const WEAVE =
  'repeating-linear-gradient(45deg, rgb(245 241 234) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgb(11 12 16) 0 1px, transparent 1px 3px)';

const CHART_ROW =
  'grid grid-cols-3 gap-x-3 gap-y-3 sm:gap-x-4 lg:grid-cols-[8.5rem_repeat(3,minmax(0,1fr))] lg:gap-x-5';

const METAL_LABEL = { ouro: 'Ouro', prata: 'Prata', ambos: 'Ouro e prata' } as const;

function SeasonTile({ tone, subtone }: { tone: SkinToneId; subtone: Subtone }) {
  const season = SEASON_MATRIX[tone][subtone];
  const lead = season.palette[0];
  const metals = METAL_LABEL[season.metals];

  return (
    <div role="cell" className="group min-w-0">
      <div className="pinked relative aspect-[4/5] overflow-hidden sm:aspect-[5/4]" style={{ backgroundColor: lead.hex }}>
        {/* Ao passar o cursor, as quatro cores da estação sobem como tiras de tecido */}
        <span aria-hidden className="absolute inset-0 flex">
          {season.palette.map((color, index) => (
            <span
              key={`${color.hex}-${index}`}
              className="h-full flex-1 translate-y-full transition-transform duration-700 ease-[var(--ease-couture)] group-hover:translate-y-0"
              style={{ backgroundColor: color.hex, transitionDelay: `${index * 60}ms` }}
            />
          ))}
        </span>
        <span aria-hidden className="absolute inset-0 opacity-[0.16] mix-blend-overlay" style={{ backgroundImage: WEAVE }} />
        <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-ivory/25" />
      </div>

      <p className="mt-3 font-display text-[1.02rem] leading-tight text-ivory transition-colors duration-500 group-hover:text-gold-light sm:text-lg">
        {season.name}
      </p>
      <div className="mt-2 flex items-center gap-1.5">
        {season.palette.map((color, index) => (
          <ColorDot key={`${color.hex}-${index}`} hex={color.hex} size={7} />
        ))}
        <span aria-hidden className="ml-auto hidden text-[0.55rem] font-medium uppercase tracking-[0.18em] text-smoke sm:inline">
          {metals}
        </span>
      </div>
      <p className="sr-only">
        Cores de destaque: {season.palette.map((color) => color.name).join(', ')}. Metais: {metals.toLowerCase()}.
      </p>
    </div>
  );
}

export function MethodSection() {
  return (
    <section id="metodo" aria-label="O Método" className="relative overflow-hidden py-24 md:py-36">
      <div aria-hidden className="glow-gold pointer-events-none absolute -left-40 top-40 h-[34rem] w-[34rem] opacity-50" />

      <div className="container-luxe relative">
        <Reveal>
          <SectionHeading
            numeral="I"
            eyebrow="O Método"
            title={
              <>
                Quatro atos entre você e o <em className="pr-[0.06em] italic text-foil">espelho</em>.
              </>
            }
            lead="Imagem não se improvisa. Cada ato prepara o seguinte — da leitura da sua cor ao ajuste final da peça — para que o resultado pareça natural, porque foi pensado para você."
          />
        </Reveal>

        {/* Os quatro atos */}
        <ol className="mt-16 grid md:-mx-8 md:mt-20 md:grid-cols-2 lg:grid-cols-4">
          {ACTS.map((act, index) => {
            const Icon = act.icon;
            return (
              <Reveal as="li" key={act.numeral} delay={index * 0.08} className="group relative py-10 md:px-8 md:py-12">
                <span
                  aria-hidden
                  className={cn(
                    'stitch absolute inset-x-0 top-0 md:inset-x-8 lg:hidden',
                    index === 0 && 'hidden',
                    index === 1 && 'md:hidden',
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    'stitch-v absolute inset-y-12 left-0 hidden',
                    index % 2 === 1 && 'md:block',
                    index === 2 && 'lg:block',
                  )}
                />

                <div className="flex items-start justify-between gap-6">
                  <span
                    aria-hidden
                    className="font-caps text-[4.25rem] font-medium leading-[0.8] text-transparent transition-colors duration-700 ease-[var(--ease-couture)] [-webkit-text-stroke:1px_rgb(212_175_55/0.6)] group-hover:text-gold/85"
                  >
                    {act.numeral}
                  </span>
                  <Icon
                    aria-hidden
                    strokeWidth={1.1}
                    className="mt-1 h-6 w-6 shrink-0 text-gold/70 transition-colors duration-500 group-hover:text-gold-light"
                  />
                </div>

                <h3 className="mt-10 font-display text-[2.1rem] leading-none text-ivory">
                  <span className="sr-only">Ato {index + 1}: </span>
                  {act.title}
                </h3>
                <p className="mt-3 text-[0.62rem] font-medium uppercase tracking-[0.24em] text-gold-light/80">{act.detail}</p>
                <p className="mt-5 max-w-sm text-[0.95rem] leading-relaxed text-mist">{act.text}</p>
              </Reveal>
            );
          })}
        </ol>

        {/* Destaque: cartela das 12 estações */}
        <Reveal className="mt-16 md:mt-24">
          <div className="panel relative overflow-hidden">
            <div aria-hidden className="tape absolute inset-x-0 top-0 opacity-40" />

            <div className="grid gap-12 px-5 pb-10 pt-14 sm:px-10 sm:pb-12 lg:grid-cols-12 lg:gap-10 lg:px-14 lg:pb-14 lg:pt-20">
              <div className="lg:col-span-4">
                <p className="eyebrow">Mostruário</p>
                <h3 className="mt-5 font-display text-[clamp(2rem,3.4vw,3rem)] leading-[1.04] text-ivory">
                  Cartela das 12 <em className="pr-[0.06em] italic text-foil">estações</em>
                </h3>
                <p className="mt-5 text-[0.95rem] leading-relaxed text-mist">
                  Quatro profundidades de pele cruzadas com três subtons. Cada encontro forma uma estação, com cores de
                  destaque, neutros de base e o metal que valoriza o rosto.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-smoke">
                  Cada amostra abre as quatro cores de destaque da sua estação.
                </p>
                <Link href="/#atelier" className="link-luxe mt-10">
                  Descobrir a minha estação
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                </Link>
              </div>

              <div className="lg:col-span-8">
                <div
                  role="table"
                  aria-label="Cartela das 12 estações cromáticas: profundidade de pele por subtom"
                  className="space-y-7 sm:space-y-8"
                >
                  <div role="row" className={CHART_ROW}>
                    <span role="columnheader" className="hidden lg:block">
                      <span className="sr-only">Pele</span>
                    </span>
                    {SUBTONES.map((subtone) => (
                      <span
                        key={subtone.id}
                        role="columnheader"
                        className="flex items-center gap-2 text-[0.6rem] font-medium uppercase tracking-[0.26em] text-mist"
                      >
                        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45 bg-gold/70" />
                        <span className="sr-only">Subtom </span>
                        {subtone.name}
                      </span>
                    ))}
                  </div>

                  {SKIN_TONES.map((tone) => (
                    <div key={tone.id} role="row" className={CHART_ROW}>
                      <span
                        role="rowheader"
                        className="col-span-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-2 lg:col-span-1 lg:flex-col lg:gap-1.5 lg:border-0 lg:pb-0 lg:pt-2"
                      >
                        <span className="font-display text-xl leading-none text-parchment">{tone.name}</span>
                        <span className="text-[0.58rem] uppercase leading-snug tracking-[0.18em] text-smoke">{tone.subtitle}</span>
                      </span>
                      {SUBTONES.map((subtone) => (
                        <SeasonTile key={subtone.id} tone={tone.id} subtone={subtone.id} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
