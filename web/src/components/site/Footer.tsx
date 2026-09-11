'use client';

import Link from 'next/link';
import { ArrowUp } from 'lucide-react';
import { LogoFull } from '@/components/ui/Logo';
import { WhatsAppIcon } from '@/components/ui/icons';
import { whatsappLink } from '@/lib/format';
import { CONSULTING_PATH, SITE } from '@/lib/site';

const FOOTER_TEXT = 'Olá, Titi! Vim pelo site e gostaria de atendimento.';

const LINK =
  'inline-flex items-center gap-2 text-left text-[15px] text-mist transition-colors duration-300 hover:text-gold-light';

const CONSULTING_LINKS = [
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Planos', href: '/#planos' },
  { label: 'Dúvidas', href: '/#duvidas' },
  { label: 'Minha consultoria', href: CONSULTING_PATH },
] as const;

const LEGAL_LINKS = [
  { label: 'Privacidade', href: '/privacidade' },
  { label: 'Termos de uso', href: '/termos' },
] as const;

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">{title}</h2>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line bg-coal">
      <div aria-hidden className="rule-gold absolute inset-x-0 top-0" />

      {/* pb extra no mobile: espaço para a barra fixa de CTA */}
      <div className="container-luxe pb-28 pt-16 lg:pb-10 lg:pt-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block" aria-label="Titi's Store — início">
              <LogoFull size={150} className="-ml-3" />
            </Link>
            <p className="mt-5 max-w-xs text-lg font-semibold leading-snug tracking-[-0.01em] text-parchment">
              Consultoria de imagem masculina online e loja com curadoria do Titi.
            </p>
          </div>

          <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:col-span-7 lg:col-start-6">
            <Column title="Consultoria">
              {CONSULTING_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </Column>

            <Column title="Loja">
              <li>
                <Link href="/colecao" className={LINK}>
                  Ver a loja
                </Link>
              </li>
              <li>
                <a href={whatsappLink(FOOTER_TEXT)} target="_blank" rel="noopener noreferrer" className={LINK}>
                  <WhatsAppIcon className="h-3.5 w-3.5 text-gold" />
                  WhatsApp
                </a>
                <span className="mt-1 block text-xs text-smoke">{SITE.whatsappDisplay}</span>
              </li>
            </Column>

            <Column title="Legal">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </Column>
          </nav>
        </div>

        <div className="mt-16">
          <div aria-hidden className="tape opacity-25" />
          <div className="mt-6 flex flex-col gap-4 text-xs text-smoke sm:flex-row sm:items-center sm:justify-between">
            <p>
              © <span suppressHydrationWarning>{year}</span> {SITE.name} · {SITE.tagline}
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0 })}
              className="group inline-flex items-center gap-2 self-start text-xs font-semibold text-smoke transition-colors duration-300 hover:text-gold-light sm:self-auto"
            >
              Voltar ao topo
              <ArrowUp
                aria-hidden
                strokeWidth={1.8}
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5"
              />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
