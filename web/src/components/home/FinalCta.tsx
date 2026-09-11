import { Coin } from '@/components/ui/Logo';
import { WhatsAppIcon } from '@/components/ui/icons';
import { whatsappLink } from '@/lib/format';
import { ConsultingCta } from './ConsultingCta';
import { FadeIn } from './FadeIn';
import { DOUBT_TEXT } from './links';

export function FinalCta() {
  return (
    <section data-hide-mobile-cta aria-labelledby="cta-final-title" className="pb-24 sm:pb-32">
      <div className="container-luxe">
        <FadeIn rise className="panel-gold relative isolate overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="glow-gold pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2"
          />
          <div className="flex justify-center">
            <Coin size={72} mode="spin" />
          </div>
          <h2
            id="cta-final-title"
            className="mx-auto mt-6 max-w-2xl text-[clamp(2rem,4.6vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-ivory"
          >
            Sua próxima escolha <span className="text-foil">já pode ser a certa.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-mist md:text-lg">
            Descubra sua cartela, receba seus looks e compre com orientação. Tudo pelo celular.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-8">
            <ConsultingCta />
            <a
              href={whatsappLink(DOUBT_TEXT)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[15px] font-semibold text-ivory transition-colors duration-300 hover:text-gold-light"
            >
              <WhatsAppIcon className="h-4 w-4 text-gold" />
              Tirar dúvidas com o Titi
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
