"use client";

import React from 'react';
import Image from 'next/image';
import { Smartphone, Check } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0B0C10] border-t border-slate-900 text-slate-400 text-xs py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="relative w-10 h-10 rounded-full p-0.5 bg-gradient-to-br from-[#F5D77F] via-[#D4AF37] to-[#AA7C11] shadow-lg shadow-amber-500/20 overflow-hidden shrink-0">
                <div className="w-full h-full rounded-full relative overflow-hidden bg-black">
                  <Image
                    src="/logo_titis.jpg"
                    alt="Titi's Store Logo"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <span className="text-xl font-black text-white font-heading tracking-wider">
                TITI'S STORE
              </span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              Plataforma oficial da **Titi's Store** para consultoria de imagem masculina. Combinando inteligência cromática de tom de pele, formalidade por ocasião e alfaiataria sob medida.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-amber-300 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pronto para Vercel</span>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pronto para Supabase</span>
              </div>
            </div>
          </div>

          {/* Links 1 */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider font-heading">
              Navegação
            </h4>
            <ul className="space-y-2 text-slate-400 font-medium">
              <li><a href="/#consultoria" className="hover:text-amber-400 transition-colors">Montar Look Interativo</a></li>
              <li><a href="/#sobre" className="hover:text-amber-400 transition-colors">A Metodologia Cromática</a></li>
              <li><a href="/#catalogo" className="hover:text-amber-400 transition-colors">Catálogo Signature</a></li>
            </ul>
          </div>

          {/* Links 2 Mobile App */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider font-heading">
              Aplicativo Mobile (iOS & Android)
            </h4>
            <p className="text-xs text-slate-400">
              Disponível em formato limpo no diretório <code className="text-amber-300 bg-slate-900 px-2 py-0.5 rounded-md font-mono">/mobile</code> com React Native & Expo.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <div className="px-4 py-2 rounded-full bg-slate-900 border border-slate-800 flex items-center gap-2 text-slate-200 text-xs font-semibold">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>Apple iOS & Android</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-4 font-medium">
          <div>
            © {new Date().getFullYear()} Titi's Store. Todos os direitos reservados.
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
