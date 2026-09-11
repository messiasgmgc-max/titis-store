import Image from 'next/image';
import { Medallion } from '@/components/ui/Logo';
import { Reveal } from '@/components/ui/Reveal';
import { SITE } from '@/lib/site';

const PRINCIPLES = [
  {
    numeral: 'i',
    title: 'Medida',
    text: 'O caimento vem antes da marca. Ombro no lugar, manga na altura certa e barra sem sobra fazem mais pela presença do que qualquer etiqueta.',
  },
  {
    numeral: 'ii',
    title: 'Cor',
    text: 'Perto do rosto, a cor certa ilumina a pele e suaviza o cansaço; a errada apaga. Por isso partimos da sua estação cromática, nunca da vitrine.',
  },
  {
    numeral: 'iii',
    title: 'Contexto',
    text: 'Vestir bem é ler o momento. Uma reunião pela manhã e um casamento ao entardecer pedem duas respostas diferentes — e igualmente precisas.',
  },
] as const;

export function Manifesto() {
  return (
    <section id="manifesto" aria-labelledby="manifesto-title" className="relative overflow-hidden py-24 md:py-36">
      <div aria-hidden className="glow-gold pointer-events-none absolute -left-[12%] top-1/4 h-[40rem] w-[40rem] opacity-60" />

      <div className="container-luxe relative grid items-center gap-16 lg:grid-cols-12 lg:gap-8">
        {/* Composição de imagens */}
        <div className="relative pb-20 sm:pb-24 lg:col-span-6 lg:pb-28">
          <Reveal>
            <figure className="relative w-[80%] sm:w-[72%] lg:w-[78%]">
              <div className="frame relative aspect-[3/4] overflow-hidden bg-surface">
                <Image
                  src="/skin_parda.jpg"
                  alt="Homem de pele parda com blazer grafite e gola alta preta, numa rua ao entardecer"
                  fill
                  sizes="(min-width: 1024px) 36vw, (min-width: 640px) 60vw, 80vw"
                  className="img-editorial object-cover object-[50%_28%]"
                />
                <div aria-hidden className="absolute inset-0 bg-linear-to-t from-obsidian/45 via-transparent to-transparent" />
              </div>
              <figcaption className="mt-4 flex items-center gap-3 text-[0.6rem] font-medium uppercase tracking-[0.26em] text-smoke">
                <span className="font-caps tracking-[0.2em] text-gold/80">Pl. I</span>
                <span aria-hidden className="stitch w-6" />
                Grafite &amp; gola alta
              </figcaption>
            </figure>
          </Reveal>

          <Reveal delay={0.2} y={48} className="absolute bottom-0 right-0 w-[46%] sm:w-[40%] lg:w-[44%]">
            <figure>
              <div className="frame relative aspect-[3/4] overflow-hidden border-[6px] border-obsidian bg-surface shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
                <Image
                  src="/skin_negra.jpg"
                  alt="Homem de pele negra profunda com blazer de veludo esmeralda, em ambiente de madeira escura"
                  fill
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 34vw, 46vw"
                  className="img-editorial object-cover object-[50%_22%]"
                />
              </div>
              <figcaption className="mt-3 flex items-center justify-end gap-3 text-[0.6rem] font-medium uppercase tracking-[0.26em] text-smoke">
                Veludo esmeralda
                <span aria-hidden className="stitch w-6" />
                <span className="font-caps tracking-[0.2em] text-gold/80">Pl. II</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>

        {/* Texto */}
        <div className="lg:col-span-5 lg:col-start-8">
          <Reveal>
            <div className="flex items-center gap-4">
              <span aria-hidden className="stitch w-10" />
              <p className="eyebrow">Manifesto da casa</p>
            </div>
            <h2
              id="manifesto-title"
              className="mt-7 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.98] text-ivory"
            >
              Não vestimos tendências. <em className="pr-[0.06em] italic text-foil">Traduzimos presença.</em>
            </h2>
          </Reveal>

          <ol className="mt-12 space-y-8">
            {PRINCIPLES.map((principle, index) => (
              <Reveal
                as="li"
                key={principle.title}
                delay={0.1 + index * 0.1}
                className="grid grid-cols-[2.75rem_1fr] gap-4 border-t border-line pt-6"
              >
                <span aria-hidden className="font-display text-2xl italic leading-none text-gold/80">
                  {principle.numeral}.
                </span>
                <div>
                  <h3 className="font-sans text-[0.68rem] font-medium uppercase tracking-[0.26em] text-parchment">
                    {principle.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-mist">{principle.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={0.4} className="mt-12 flex items-center gap-4">
            <Medallion size={52} />
            <div>
              <p className="font-caps text-sm font-semibold tracking-[0.2em] text-foil">Atelier Titi&apos;s Store</p>
              <p className="mt-1.5 text-[0.58rem] font-medium uppercase tracking-[0.24em] text-smoke">
                Consultoria de imagem masculina · Est. {SITE.established}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
