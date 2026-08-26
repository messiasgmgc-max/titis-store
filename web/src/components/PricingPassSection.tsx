"use client";

import React from 'react';
import { Crown, Check, Sparkles, Zap, MessageSquare } from 'lucide-react';

export const PricingPassSection: React.FC = () => {
  const handleOpenWhatsAppTier = (planName: string) => {
    const text = encodeURIComponent(`Olá Titi! Tenho interesse no *${planName}* da Titi's Store. Como posso ativar meu acesso?`);
    window.open(`https://wa.me/5531996000213?text=${text}`, '_blank');
  };

  return (
    <section id="planos" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Democratizando a Alta Consultoria</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-heading tracking-tight">
            Passes de Acesso Titi's Store
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium">
            Não é preciso gastar milhares de reais em consultorias complexas. Tenha inteligência de imagem de alto padrão na palma da sua mão.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* Plan 1 */}
          <div className="glass-card rounded-[36px] p-8 border border-slate-800 flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Acesso Essencial</span>
                <h3 className="text-2xl font-black text-white font-heading">Passe Digital Instantâneo</h3>
                <p className="text-xs text-slate-300 font-medium">Para quem quer descobrir seu tom de pele e montar looks rapidamente.</p>
              </div>

              <div className="py-4 border-y border-slate-800">
                <span className="text-4xl font-black text-white font-heading">R$ 29,90</span>
                <span className="text-xs text-slate-400 font-medium ml-2">/ acesso único</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Scanner Facial com IA</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Diagnóstico Cromático (12 Estações)</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Até 3 Lookbooks Recomendados</li>
              </ul>
            </div>

            <button
              onClick={() => handleOpenWhatsAppTier('Passe Digital Instantâneo (R$ 29,90)')}
              className="mt-8 w-full py-3.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all"
            >
              Ativar Passe Digital
            </button>
          </div>

          {/* Plan 2: Featured VIP */}
          <div className="glass-card-active rounded-[36px] p-8 border border-amber-500/50 flex flex-col justify-between shadow-2xl relative scale-105 z-10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gold-gradient text-[#0B0C10] text-[10px] font-black uppercase tracking-widest shadow-md">
              Mais Recomendado
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Experiência Completa</span>
                <h3 className="text-2xl font-black text-white font-heading">Clube VIP Titi's Store</h3>
                <p className="text-xs text-slate-200 font-medium">Consultoria contínua, provador virtual IA e curadoria direta via WhatsApp.</p>
              </div>

              <div className="py-4 border-y border-amber-500/30">
                <span className="text-4xl font-black text-amber-300 font-heading">R$ 49,90</span>
                <span className="text-xs text-slate-300 font-medium ml-2">/ mês</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-100 font-semibold">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> **Consultorias Ilimitadas**</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> **Provador Virtual de Roupas IA**</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> **Contato Direto no WhatsApp do Titi**</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Histórico Ilimitado na Nuvem</li>
              </ul>
            </div>

            <button
              onClick={() => handleOpenWhatsAppTier('Clube VIP Mensal (R$ 49,90/mês)')}
              className="mt-8 w-full py-4 rounded-full bg-gold-gradient text-[#0B0C10] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 hover:scale-105 transition-all"
            >
              Assinar Clube VIP Agora
            </button>
          </div>

          {/* Plan 3 */}
          <div className="glass-card rounded-[36px] p-8 border border-slate-800 flex flex-col justify-between hover:border-amber-500/40 transition-all duration-300">
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Atendimento Físico</span>
                <h3 className="text-2xl font-black text-white font-heading">Consultoria Presencial VIP</h3>
                <p className="text-xs text-slate-300 font-medium">Sessão individual com o Titi para renovação completa de guarda-roupa.</p>
              </div>

              <div className="py-4 border-y border-slate-800">
                <span className="text-2xl font-bold text-white font-heading">Sob Consulta</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 font-medium">
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Atendimento presencial privado</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Análise de armário físico</li>
                <li className="flex items-center gap-2.5"><Check className="w-4 h-4 text-amber-400 shrink-0" /> Personal Shopper dedicado</li>
              </ul>
            </div>

            <button
              onClick={() => handleOpenWhatsAppTier('Consultoria Presencial VIP')}
              className="mt-8 w-full py-3.5 rounded-full bg-slate-900 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all"
            >
              Agendar Presencial
            </button>
          </div>

        </div>

      </div>
    </section>
  );
};
