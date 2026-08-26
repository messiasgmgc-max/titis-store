"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, Shirt, RefreshCw, ShoppingBag, CheckCircle2 } from 'lucide-react';

interface VirtualTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  lookTitle: string;
  skinTone: string;
  items: { name: string; category: string; color: string; hex: string }[];
  onAddToCart: () => void;
}

export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({
  isOpen,
  onClose,
  lookTitle,
  skinTone,
  items,
  onAddToCart,
}) => {
  const [generating, setGenerating] = useState(false);

  if (!isOpen) return null;

  const skinToneImageMap: Record<string, string> = {
    clara: '/skin_clara_model.jpg',
    morena: '/skin_morena_model.jpg',
    parda: '/skin_parda_model.jpg',
    negra: '/skin_negra_model.jpg',
  };

  const modelImage = skinToneImageMap[skinTone.toLowerCase()] || '/skin_morena_model.jpg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-card border border-amber-500/35 rounded-[36px] p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Provador Virtual IA - Titi's Store</span>
          </div>
          <h3 className="text-2xl font-black text-white font-heading">
            {lookTitle}
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            Simulação de caimento e contraste no seu manequim cromático tom <strong className="text-amber-400 uppercase">{skinTone}</strong>.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          
          {/* AI Model Image */}
          <div className="sm:col-span-6 relative aspect-[3/4] w-full rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl group">
            <Image
              src={modelImage}
              alt="Modelo Provador IA"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent opacity-60" />
            
            <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl glass-card border border-amber-500/30 text-center">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                Manequim Digital Personalizado
              </span>
              <span className="text-[10px] text-slate-300 font-medium">Renderização de Caimento Slim Tailored</span>
            </div>
          </div>

          {/* Outfit Items Specification */}
          <div className="sm:col-span-6 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
              Combinação de Peças Provadas:
            </h4>

            <div className="space-y-2.5">
              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: item.hex }} />
                    <div>
                      <div className="text-xs font-bold text-white font-heading">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{item.category}</div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  onAddToCart();
                  onClose();
                }}
                className="w-full py-3.5 rounded-full bg-gold-gradient text-[#0B0C10] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-[#0B0C10]" />
                <span>Adicionar Peças ao Carrinho WhatsApp</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
