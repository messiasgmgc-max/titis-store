import { Camera, Palette, ScanFace, Shirt, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FadeIn } from './FadeIn';
import { SectionTitle } from './Heading';

const DELIVERABLES: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Camera,
    title: 'Leitura de colorimetria por foto',
    text: 'Uma selfie basta: tom de pele, subtom e contraste definem a sua estação entre as 12 do método.',
  },
  {
    icon: Palette,
    title: 'Sua cartela completa',
    text: 'Cores que valorizam, neutros para a base do guarda-roupa, o que evitar perto do rosto e o metal ideal.',
  },
  {
    icon: Shirt,
    title: 'Looks prontos para cada ocasião',
    text: 'Combinações montadas por ocasião, horário e clima, com peças reais da loja.',
  },
  {
    icon: ScanFace,
    title: 'Provador virtual e o Titi por perto',
    text: 'Veja o look com o seu rosto e, no Clube, tire dúvidas direto com o Titi pelo WhatsApp.',
  },
];

const STEPS = [
  {
    title: 'Escolha seu plano',
    text: 'Passe Digital para resolver um compromisso ou Clube para ter o Titi sempre por perto.',
  },
  {
    title: 'Envie uma foto e conte a ocasião',
    text: 'Uma selfie com luz natural e três toques: evento, horário e clima.',
  },
  {
    title: 'Receba sua cartela e seus looks',
    text: 'O resultado sai na hora. Gostou de uma peça? Compre com o Titi pelo WhatsApp.',
  },
] as const;

export function HowItWorks() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="border-t border-line py-20 sm:py-28">
      <div className="container-luxe">
        <SectionTitle
          id="como-funciona-title"
          eyebrow="O que você recebe"
          title={
            <>
              Sua imagem resolvida, <span className="text-foil">do espelho à compra.</span>
            </>
          }
          lead="Uma consultoria completa, feita no seu tempo e pelo celular, com o método das 12 estações usado pelo Titi."
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {DELIVERABLES.map(({ icon: Icon, title, text }, index) => (
            <FadeIn as="li" key={title} delay={index * 0.05} className="panel rounded-3xl p-6">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-line-gold text-gold">
                <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-bold leading-snug tracking-[-0.01em] text-ivory">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-mist">{text}</p>
            </FadeIn>
          ))}
        </ul>

        <div className="mt-6 rounded-[2rem] border border-line bg-surface/50 p-6 sm:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ivory">
              Como funciona, em 3 passos
            </h3>
            <Button href="#planos" variant="outline" size="sm" className="self-start sm:self-auto">
              Ver planos e preços
            </Button>
          </div>

          <ol className="mt-9 grid gap-9 lg:grid-cols-3 lg:gap-10">
            {STEPS.map((step, index) => (
              <FadeIn as="li" key={step.title} delay={index * 0.06}>
                <div className="flex items-center gap-4">
                  <span className="text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-foil">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {index < STEPS.length - 1 && <span aria-hidden className="stitch hidden flex-1 lg:block" />}
                </div>
                <h4 className="mt-4 text-xl font-bold leading-snug tracking-[-0.01em] text-ivory">{step.title}</h4>
                <p className="mt-2 text-[15px] leading-relaxed text-mist">{step.text}</p>
              </FadeIn>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
