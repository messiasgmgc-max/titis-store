"use client";

import React from 'react';
import { Crown, Smartphone, Globe, ShieldCheck, Check } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B0C10] border-t border-slate-900 text-slate-400 text-xs py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center">
                <Crown className="w-4 h-4 text-[#0B0C10]" />
              </div>
              <span className="text-xl font-extrabold text-white font-[family-name:var(--font-serif)] tracking-wider">
                TITI'S
              </span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Plataforma de alta elegância para consultoria de imagem masculina. Combinando inteligência cromática de tom de pele, formalidade por ocasião e alfaiataria sob medida.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-amber-300">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pronto para Vercel</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-emerald-400">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pronto para Supabase</span>
              </div>
            </div>
          </div>

          {/* Links 1 */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">
              Navegação
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li><a href="#consultoria" className="hover:text-amber-400 transition-colors">Montar Look Interativo</a></li>
              <li><a href="#sobre" className="hover:text-amber-400 transition-colors">A Metodologia Cromática</a></li>
              <li><a href="#catalogo" className="hover:text-amber-400 transition-colors">Catálogo Signature</a></li>
            </ul>
          </div>

          {/* Links 2 Mobile App */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">
              Aplicativo Mobile (iOS & Android)
            </h4>
            <p className="text-xs text-slate-400">
              Disponível em formato limpo no diretório <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded">/mobile</code> com React Native & Expo.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-slate-200 text-xs">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Apple iOS & Android</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-4">
          <div>
            © {new Date().getFullYear()} Titi's Consultoria de Imagem. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-6">
            <span>Privacidade</span>
            <span>Termos de Serviço</span>
            <span>Suporte VIP</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
