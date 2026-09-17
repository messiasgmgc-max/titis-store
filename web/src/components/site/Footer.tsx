'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Mail, CheckCircle2 } from 'lucide-react';
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

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'consultor' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao se inscrever.');
      setSubscribed(true);
      setEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao se inscrever.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative border-t border-line bg-coal">
      <div aria-hidden className="rule-gold absolute inset-x-0 top-0" />

      {/* pb extra no mobile: espaço para a barra fixa de CTA */}
      <div className="container-luxe pb-28 pt-16 lg:pb-10 lg:pt-20">
        
        {/* Banner Newsletter Consultoria */}
        <div className="mb-14 rounded-2xl border border-line-gold bg-surface/60 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-gold text-xs font-bold uppercase tracking-widest">
              <Mail className="h-3.5 w-3.5" />
              <span>Círculo VIP de Imagem & Estilo</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-ivory">
              Receba dicas de alfaiataria e novidades de consultoria
            </h3>
            <p className="text-xs text-mist">
              Conteúdo selecionado pelo Titi diretamente no seu e-mail, sem spam.
            </p>
          </div>

          <div className="w-full md:w-auto">
            {subscribed ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-full text-xs font-bold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Inscrição confirmada! Verifique seu e-mail.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
                <input
                  type="email"
                  required
                  placeholder="Seu e-mail..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-obsidian border border-line rounded-full px-4 py-2.5 text-xs text-ivory placeholder-smoke focus:outline-none focus:border-gold sm:w-64"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-gold btn-sm rounded-full text-xs font-bold uppercase tracking-wider shrink-0"
                >
                  {loading ? 'Inscrevendo...' : 'Participar'}
                </button>
              </form>
            )}
            {errorMsg && <p className="text-danger text-[11px] mt-1.5">{errorMsg}</p>}
          </div>
        </div>

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
