"use client";

import React from 'react';
import Image from 'next/image';
import { ArrowRight, Sparkles, Award, Star } from 'lucide-react';

interface HeroSectionProps {
  onStartConsultation: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartConsultation }) => {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -top-10 right-10 w-80 h-80 bg-amber-400/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-amber-500/40 text-amber-300 text-xs font-medium uppercase tracking-wider shadow-md">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span>Consultoria de Imagem Masculina Premium</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white font-heading leading-[1.15]">
                Estilo, Intensidade <br />
                <span className="text-gold-gradient">e Presença Inconfundível</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl">
                Descubra looks de alta alfaiataria e combinações inteligentes projetadas sob medida para o seu tom de pele, ocasião, clima e estilo de vida. Curadoria oficial assinada pela <strong className="text-white font-medium">Titi's Store</strong>.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={onStartConsultation}
                className="group px-9 py-4 rounded-full text-xs sm:text-sm font-semibold text-[#0B0C10] uppercase tracking-wider bg-gold-gradient shadow-2xl shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <span>Montar Meu Look Agora</span>
                <ArrowRight className="w-4 h-4 text-[#0B0C10] group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#sobre"
                className="px-7 py-4 rounded-full text-xs sm:text-sm font-medium text-slate-200 glass-card hover:bg-slate-800/90 hover:text-white hover:border-amber-500/40 transition-all text-center border border-slate-700/80"
              >
                Conhecer a Metodologia
              </a>
            </div>

            {/* Trust Metrics */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl sm:text-3xl font-semibold text-amber-400 font-heading">
                  99.4%
                </div>
                <div className="text-xs font-normal text-slate-400 mt-1">Aprovação de Estilo</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-semibold text-[#D4AF37] font-heading">
                  +3.200
                </div>
                <div className="text-xs font-normal text-slate-400 mt-1">Looks Mapeados</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-semibold text-amber-400 font-heading">
                  <div className="flex items-center gap-1">
                    <span>5.0</span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                </div>
                <div className="text-xs font-normal text-slate-400 mt-1">Avaliação dos Clientes</div>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Feature */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[36px] p-2.5 glass-card border-amber-500/30 shadow-2xl shadow-amber-950/40 group overflow-hidden">
              <div className="relative aspect-[4/5] w-full rounded-[28px] overflow-hidden">
                <Image
                  src="/hero_titis_style.jpg"
                  alt="Titi's Store Consultoria de Imagem"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent opacity-75" />
                
                {/* Floating Badge */}
                <div className="absolute bottom-6 left-6 right-6 glass-card p-4 rounded-2xl border border-amber-500/35 flex items-center justify-between backdrop-blur-xl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-widest">
                        Titi's Store 2026
                      </div>
                      <div className="text-sm font-semibold text-white font-heading">
                        Alfaiataria & Smart Casual
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-gold-gradient text-[#0B0C10] text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Exclusivo
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
          </div>

        </div>
      </div>
    </section>
  );
};
