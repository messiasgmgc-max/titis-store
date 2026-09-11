import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { SITE } from '@/lib/site';
import { whatsappLink } from '@/lib/format';
import { toRoman } from './shared';

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

/** Documento institucional com tipografia editorial: sumário e capítulos em numerais romanos. */
export function LegalDocument({
  eyebrow,
  title,
  updated,
  intro,
  sections,
  related,
}: {
  eyebrow: string;
  title: React.ReactNode;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
  related: { href: string; label: string };
}) {
  return (
    <article className="container-luxe pb-24 pt-32 sm:pt-40">
      <div className="mx-auto max-w-3xl">
        <header>
          <div className="flex items-center gap-4">
            <span className="numeral text-xs">§</span>
            <span className="stitch w-10" aria-hidden />
            <span className="eyebrow">{eyebrow}</span>
          </div>
          <h1 className="mt-6 font-display text-[clamp(2.15rem,5.8vw,3.9rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-ivory">
            {title}
          </h1>
          <p className="mt-5 kicker">{updated}</p>
          <div className="mt-8 text-lg leading-relaxed text-mist">{intro}</div>
        </header>

        <nav aria-label="Sumário" className="mt-12 border-y border-line py-8">
          <p className="kicker text-[0.62rem]">Sumário</p>
          <ol className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="group flex items-baseline gap-4 text-[0.95rem] text-parchment transition-colors hover:text-gold-light">
                  <span className="numeral w-10 shrink-0 text-[0.68rem] text-gold-dark transition-colors group-hover:text-gold">
                    {toRoman(i + 1)}
                  </span>
                  <span>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-6">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-28 border-b border-line py-12 last:border-b-0">
              <div className="flex items-center gap-4">
                <span className="numeral text-sm">{toRoman(i + 1)}</span>
                <span className="stitch w-8" aria-hidden />
              </div>
              <h2 id={`${s.id}-title`} className="mt-4 font-display text-[clamp(1.4rem,3vw,1.95rem)] font-extrabold leading-[1.12] tracking-[-0.02em] text-ivory"
              >
                {s.title}
              </h2>
              <div className="prose-luxe mt-5 text-[1rem] leading-[1.8] text-mist">{s.body}</div>
            </section>
          ))}
        </div>

        <aside className="panel-gold frame relative mt-10 p-8 sm:p-10">
          <p className="eyebrow">Contato</p>
          <p className="mt-4 font-display text-[clamp(1.35rem,2.8vw,1.8rem)] font-extrabold leading-[1.12] tracking-[-0.02em] text-ivory">
            Dúvidas sobre este documento? <span className="text-foil">Fale conosco.</span>
          </p>
          <p className="mt-3 text-mist">
            Atendimento pelo WhatsApp oficial {SITE.whatsappDisplay}.
          </p>
          <div className="relative z-10 mt-8 flex flex-wrap items-center gap-6">
            <Button href={whatsappLink(`Olá! Tenho uma dúvida sobre os documentos legais da ${SITE.name}.`)} external>
              <WhatsAppIcon className="h-4 w-4" />
              Falar pelo WhatsApp
            </Button>
            <Link href={related.href} className="link-luxe">
              {related.label}
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
