'use client';

import Link from 'next/link';
import { ArrowUp } from 'lucide-react';
import { LogoFull } from '@/components/ui/Logo';
import { WhatsAppIcon } from '@/components/ui/icons';
import { whatsappLink } from '@/lib/format';
import { NAV_LINKS, SITE } from '@/lib/site';
import { useUI } from '@/providers/UIProvider';

const FOOTER_TEXT = 'Olá, Titi! Vim pelo site e gostaria de atendimento.';

const LINK =
  'group inline-flex items-center gap-2 text-left text-sm text-mist transition-colors duration-500 hover:text-gold-light';

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="eyebrow text-[0.6rem]">{title}</h2>
      <ul className="mt-6 space-y-3.5">{children}</ul>
    </div>
  );
}

export function Footer() {
  const { setConciergeOpen } = useUI();
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line bg-coal">
      <div aria-hidden className="rule-gold absolute inset-x-0 top-0" />

      <div className="container-luxe pb-10 pt-20 lg:pt-24">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block">
              <LogoFull size={180} className="-ml-4" />
            </Link>
            <p className="mt-6 max-w-xs font-display text-2xl italic leading-snug text-parchment">
              Cor, medida e contexto — para que cada escolha diga quem você é.
            </p>
          </div>

          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 lg:col-span-7 lg:col-start-6">
            <Column title="Navegação">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </Column>

            <Column title="Atendimento">
              <li>
                <a href={whatsappLink(FOOTER_TEXT)} target="_blank" rel="noopener noreferrer" className={LINK}>
                  <WhatsAppIcon className="h-3.5 w-3.5 text-gold/80" />
                  WhatsApp
                </a>
                <span className="mt-1 block text-xs tracking-wide text-smoke">{SITE.whatsappDisplay}</span>
              </li>
              <li>
                <button type="button" onClick={() => setConciergeOpen(true)} className={LINK}>
                  Concierge
                </button>
              </li>
              <li>
                <Link href="/dashboard" className={LINK}>
                  Minha conta
                </Link>
              </li>
            </Column>

            <Column title="Legal">
              <li>
                <Link href="/privacidade" className={LINK}>
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos" className={LINK}>
                  Termos de uso
                </Link>
              </li>
            </Column>
          </nav>
        </div>

        <div className="mt-20">
          <div aria-hidden className="tape opacity-25" />
          <div className="mt-6 flex flex-col gap-4 text-xs text-smoke sm:flex-row sm:items-center sm:justify-between">
            <p>
              © <span suppressHydrationWarning>{year}</span> Titi&apos;s Store · Consultoria de Imagem Masculina
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0 })}
              className="group inline-flex items-center gap-2 self-start text-[0.62rem] font-medium uppercase tracking-[0.24em] text-smoke transition-colors duration-500 hover:text-gold-light sm:self-auto"
            >
              Voltar ao topo
              <ArrowUp
                aria-hidden
                strokeWidth={1.4}
                className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-translate-y-0.5"
              />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
