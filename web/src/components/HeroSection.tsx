"use client";

import React from 'react';
import Image from 'next/image';
import { ArrowRight, Sparkles, ShieldCheck, Award, Star } from 'lucide-react';

interface HeroSectionProps {
  onStartConsultation: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartConsultation }) => {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />
      <div className="absolute -top-10 right-10 w-72 h-72 bg-amber-400/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Consultoria de Imagem Masculina Premium</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-[family-name:var(--font-serif)] leading-[1.15]">
                Estilo, Intensidade <br />
                <span className="text-gold-gradient">e Presença Inconfundível</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl">
                Descubra looks de alta alfaiataria e combinações inteligentes projetadas sob medida para o seu tom de pele, ocasião, clima e estilo de vida. Curadoria assinada com o padrão **Titi's**.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                onClick={onStartConsultation}
                className="group px-8 py-4 rounded-xl text-sm font-bold text-[#0B0C10] uppercase tracking-wider bg-gold-gradient shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <span>Montar Meu Look Agora</span>
                <ArrowRight className="w-4 h-4 text-[#0B0C10] group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#sobre"
                className="px-6 py-4 rounded-xl text-sm font-medium text-slate-200 glass-card hover:bg-slate-800/80 hover:text-white transition-all text-center border border-slate-700/60"
              >
                Conhecer a Metodologia
              </a>
            </div>

            {/* Trust Metrics */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-[family-name:var(--font-serif)]">
                  99.4%
                </div>
                <div className="text-xs text-slate-400 mt-1">Aprovação de Estilo</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#D4AF37] font-[family-name:var(--font-serif)]">
                  +3.200
                </div>
                <div className="text-xs text-slate-400 mt-1">Looks Mapeados</div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-[family-name:var(--font-serif)]">
                  <div className="flex items-center gap-1">
                    <span>5.0</span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-1">Avaliação dos Clientes</div>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Feature */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl p-2 glass-card border-amber-500/30 shadow-2xl shadow-amber-950/40 group overflow-hidden">
              <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden">
                <Image
                  src="/hero_titis_style.jpg"
                  alt="Titi's Consultoria de Imagem Masculina"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent opacity-80" />
                
                {/* Floating Badge on Card */}
                <div className="absolute bottom-6 left-6 right-6 glass-card p-4 rounded-xl border border-amber-500/30 flex items-center justify-between backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Edição Signature 2026
                      </div>
                      <div className="text-sm font-semibold text-white">
                        Alfaiataria & Smart Casual
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-md bg-amber-500 text-[#0B0C10] text-[11px] font-extrabold uppercase">
                    Exclusivo
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative background element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
          </div>

        </div>
      </div>
    </section>
  );
};
