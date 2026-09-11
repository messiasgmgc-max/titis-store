'use client';

import { MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Medallion } from '@/components/ui/Logo';
import { Reveal } from '@/components/ui/Reveal';
import { WhatsAppIcon } from '@/components/ui/icons';
import { whatsappLink } from '@/lib/format';
import { SITE } from '@/lib/site';
import { useUI } from '@/providers/UIProvider';

const CONTACT_TEXT = 'Olá, Titi! Gostaria de conversar sobre uma consultoria de imagem.';

export function ContactSection() {
  const { setConciergeOpen } = useUI();

  return (
    <section id="contato" aria-labelledby="contato-title" className="relative py-24 md:py-36">
      <div className="container-luxe">
        <Reveal>
          <div className="panel-gold relative overflow-hidden">
            {/* Fita métrica e pesponto interno */}
            <div aria-hidden className="tape absolute inset-x-0 top-0 opacity-60" />
            <span aria-hidden className="stitch absolute inset-x-4 top-9 opacity-50 sm:inset-x-5" />
            <span aria-hidden className="stitch absolute inset-x-4 bottom-4 opacity-50 sm:inset-x-5 sm:bottom-5" />
            <span aria-hidden className="stitch-v absolute bottom-4 left-4 top-9 opacity-50 sm:bottom-5 sm:left-5" />
            <span aria-hidden className="stitch-v absolute bottom-4 right-4 top-9 opacity-50 sm:bottom-5 sm:right-5" />
            <div aria-hidden className="glow-gold pointer-events-none absolute -right-40 -top-40 h-[36rem] w-[36rem]" />

            <div className="relative grid gap-16 px-9 pb-14 pt-20 sm:px-14 lg:grid-cols-12 lg:gap-10 lg:px-20 lg:pb-20 lg:pt-24">
              <div className="lg:col-span-7">
                <div className="flex items-center gap-4">
                  <span aria-hidden className="stitch w-10" />
                  <p className="eyebrow">Contato</p>
                </div>
                <h2
                  id="contato-title"
                  className="mt-6 font-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.02] text-ivory"
                >
                  Sua próxima escolha começa com uma <em className="pr-[0.06em] italic text-foil">conversa</em>.
                </h2>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-mist md:text-lg">
                  Conte a ocasião, a data e o que você quer transmitir. Pelo WhatsApp, o atelier orienta a escolha,
                  confirma a disponibilidade das peças e combina os próximos passos.
                </p>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button href={whatsappLink(CONTACT_TEXT)} external size="lg">
                    <WhatsAppIcon className="h-4 w-4" />
                    Conversar no WhatsApp
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => setConciergeOpen(true)}>
                    <MessagesSquare className="h-4 w-4" strokeWidth={1.4} aria-hidden />
                    Falar com o concierge
                  </Button>
                </div>

                <p className="mt-6 text-sm text-mist">
                  ou escreva direto para{' '}
                  <a
                    href={whatsappLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="whitespace-nowrap text-gold-light underline decoration-gold/40 underline-offset-4 transition-colors hover:decoration-gold"
                  >
                    {SITE.whatsappDisplay}
                  </a>
                </p>
              </div>

              {/* Etiqueta (hang tag) */}
              <div className="lg:col-span-5 lg:flex lg:items-center lg:justify-end">
                <div className="relative mx-auto w-full max-w-sm pt-10 lg:mx-0">
                  <span
                    aria-hidden
                    className="absolute left-1/2 top-0 h-14 w-px -translate-x-1/2 bg-linear-to-b from-transparent to-gold/60"
                  />
                  <div className="relative rotate-[-2.5deg] border border-line-gold bg-obsidian/85 px-7 pb-7 pt-12 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] transition-[rotate] duration-700 ease-[var(--ease-couture)] hover:rotate-0">
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-4 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-gold/70 bg-surface"
                    />
                    <div className="flex items-center justify-between gap-4">
                      <p className="eyebrow text-[0.6rem]">Atendimento</p>
                      <Medallion size={34} />
                    </div>
                    <div aria-hidden className="stitch mt-5" />

                    <dl className="mt-6 space-y-5">
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-mist">WhatsApp</dt>
                        <dd className="mt-1.5 font-display text-2xl leading-tight text-ivory">{SITE.whatsappDisplay}</dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-mist">Concierge</dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-parchment">
                          Dúvidas sobre cor, caimento e ocasião, aqui mesmo no site.
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.6rem] font-medium uppercase tracking-[0.24em] text-mist">Consultoria presencial</dt>
                        <dd className="mt-1.5 text-sm leading-relaxed text-parchment">Sessão individual, mediante agendamento.</dd>
                      </div>
                    </dl>

                    <div aria-hidden className="tape mt-8 opacity-50" />
                    <p
                      aria-hidden
                      className="mt-3 flex justify-between font-caps text-[0.55rem] tracking-[0.3em] text-smoke"
                    >
                      <span>Titi&apos;s Store</span>
                      <span>Est. {SITE.established}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
