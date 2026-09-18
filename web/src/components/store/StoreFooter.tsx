'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Truck, RefreshCw, CreditCard, Sparkles, Mail, CheckCircle2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons';
import { SITE } from '@/lib/site';

export function StoreFooter() {
  const consultorUrl = process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br';

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
        body: JSON.stringify({ email, source: 'store' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao se inscrever.');
      setSubscribed(true);
      setEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao se inscrever na newsletter.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-line bg-surface text-mist">
      
      {/* 1. Barra de Vantagens da Loja */}
      <div className="border-b border-line bg-surface-2 py-8">
        <div className="container-luxe grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-gold/10 text-gold border border-gold/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ivory">Entrega Segura</h4>
              <p className="text-[11px] text-mist">Envio com rastreamento para todo o Brasil.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-gold/10 text-gold border border-gold/20">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ivory">Até 12x no Cartão</h4>
              <p className="text-[11px] text-mist">Até 6x sem juros ou Pix instantâneo.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-gold/10 text-gold border border-gold/20">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ivory">1ª Troca Grátis</h4>
              <p className="text-[11px] text-mist">Até 7 dias para troca ou devolução sem burocracia.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-gold/10 text-gold border border-gold/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-ivory">Checkout Seguro</h4>
              <p className="text-[11px] text-mist">Transações criptografadas pelo Mercado Pago.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Banner de Newsletter Privada */}
      <div className="border-b border-line bg-obsidian py-10">
        <div className="container-luxe flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left space-y-1">
            <div className="inline-flex items-center gap-2 text-gold text-xs font-bold uppercase tracking-widest">
              <Mail className="h-3.5 w-3.5" />
              <span>Círculo Privado Titi&apos;s Store</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-ivory">
              Receba lançamentos exclusivos e 10% OFF
            </h3>
            <p className="text-xs text-mist">
              Inscreva-se para receber convites de coleções cápsula e seu cupom exclusivo de boas-vindas por e-mail.
            </p>
          </div>

          <div className="w-full lg:w-auto">
            {subscribed ? (
              <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-full text-xs font-bold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Pronto! Seu cupom exclusivo foi enviado para o seu e-mail.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
                <input
                  type="email"
                  required
                  placeholder="Seu melhor e-mail..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-surface border border-line rounded-full px-4 py-3 text-xs text-ivory placeholder-smoke focus:outline-none focus:border-gold sm:w-72"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-gold btn-md rounded-full text-xs font-bold uppercase tracking-wider shrink-0"
                >
                  {loading ? 'Cadastrando...' : 'Fazer Parte'}
                </button>
              </form>
            )}
            {errorMsg && <p className="text-danger text-[11px] mt-1.5">{errorMsg}</p>}
          </div>
        </div>
      </div>

      {/* 3. Conteúdo Principal do Rodapé */}
      <div className="container-luxe py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-4 lg:gap-12">
          
          {/* Coluna da Marca */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-full overflow-hidden border border-line-gold">
                <Image src="/titislogo.jpeg" alt="Titi's Store" fill className="object-cover" />
              </div>
              <span className="font-display font-extrabold text-lg text-ivory tracking-wider">
                TITI&apos;S STORE
              </span>
            </div>
            <p className="text-xs leading-relaxed text-mist">
              Alta alfaiataria e moda masculina contemporânea. Peças com modelagem precisa e matérias-primas nobres para homens que valorizam presença e sofisticação.
            </p>
            <div className="pt-2">
              <a
                href={`https://wa.me/${SITE.whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:underline"
              >
                <WhatsAppIcon className="h-4 w-4" />
                <span>Atendimento WhatsApp: {SITE.whatsappDisplay}</span>
              </a>
            </div>
          </div>

          {/* Coluna Categorias */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-parchment mb-4">
              Categorias
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/colecao?categoria=Alfaiataria" className="hover:text-gold transition-colors">Alfaiataria & Blazers</Link></li>
              <li><Link href="/colecao?categoria=Camisaria" className="hover:text-gold transition-colors">Camisaria Nobre</Link></li>
              <li><Link href="/colecao?categoria=Calças" className="hover:text-gold transition-colors">Calças Chino & Alfaiataria</Link></li>
              <li><Link href="/colecao?categoria=Calçados" className="hover:text-gold transition-colors">Calçados em Couro</Link></li>
              <li><Link href="/colecao?categoria=Acessórios" className="hover:text-gold transition-colors">Acessórios & Gravataria</Link></li>
              <li><Link href="/colecao" className="hover:text-gold transition-colors font-bold text-gold">Ver Todas as Peças</Link></li>
            </ul>
          </div>

          {/* Coluna Atendimento & Políticas */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-parchment mb-4">
              Atendimento & Suporte
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/termos" className="hover:text-gold transition-colors">Termos de Serviço</Link></li>
              <li><Link href="/privacidade" className="hover:text-gold transition-colors">Política de Privacidade</Link></li>
              <li><span className="text-mist">Horário: Seg. a Sex. 09h às 19h</span></li>
              <li><span className="text-mist">Belo Horizonte / MG - Brasil</span></li>
            </ul>
          </div>

          {/* Coluna Ecossistema / Consultoria */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-parchment mb-4">
              Consultoria Digital
            </h4>
            <p className="text-xs leading-relaxed text-mist">
              Descubra quais cores e modelagens harmonizam com seu subtom de pele e formato facial.
            </p>
            <a
              href={consultorUrl}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold/10 border border-line-gold text-gold text-xs font-bold hover:bg-gold hover:text-obsidian transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Acessar Consultor IA</span>
            </a>
          </div>

        </div>

        {/* 4. Rodapé Inferior */}
        <div className="mt-12 border-t border-line/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-smoke">
          <p>© {new Date().getFullYear()} Titi&apos;s Store. Todos os direitos reservados.</p>
          <div className="flex items-center gap-3">
            <span>Pagamento Seguro Mercado Pago</span>
            <span>·</span>
            <span>CNPJ e Razão Social sob consulta</span>
          </div>
        </div>

      </div>

    </footer>
  );
}
