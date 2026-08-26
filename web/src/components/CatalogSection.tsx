"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag, Sparkles, Check, ChevronRight } from 'lucide-react';
import { CartItem } from './WhatsAppCartModal';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  colorName: string;
  hex: string;
  image: string;
  description: string;
  skinToneMatch: string;
}

const signatureCatalog: ProductItem[] = [
  {
    id: 'prod-1',
    name: 'Blazer Tailored Super 120s',
    category: 'Alfaiataria',
    colorName: 'Azul Marinho Obsidian',
    hex: '#1B2A4A',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600',
    description: 'Corte italiano slim fit com ombreiras estruturadas e forro em seda acetinada.',
    skinToneMatch: 'Ideal para peles Claras e Pardas de alto contraste',
  },
  {
    id: 'prod-2',
    name: 'Tricô Cashmere Italiano',
    category: 'Smart Casual',
    colorName: 'Terracota Vulcânico',
    hex: '#A0522D',
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600',
    description: 'Fios nobres de cashmere com gola redonda reforçada e caimento fluido.',
    skinToneMatch: 'Harmonia perfeita com peles Morena Dourada e Negras',
  },
  {
    id: 'prod-3',
    name: 'Camisa Pima Cotton Giza',
    category: 'Camisaria',
    colorName: 'Branco Marfim Puro',
    hex: '#FFFFFF',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600',
    description: 'Algodão egípcio de fibra extra longa. Não amassa com facilidade e possui brilho discreto.',
    skinToneMatch: 'Universal para todos os tons de pele',
  },
  {
    id: 'prod-4',
    name: 'Chino Tailored Cotton-Elastano',
    category: 'Calça',
    colorName: 'Cinza Grafite Nobre',
    hex: '#2C3539',
    image: 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=600',
    description: 'Bolsos faca frontais e ajuste de cós sob medida sem necessidade de cinto.',
    skinToneMatch: 'Essencial para composições executivas noturnas',
  },
];

interface CatalogSectionProps {
  onAddToCart: (item: CartItem) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({ onAddToCart }) => {
  return (
    <section id="catalogo" className="py-20 bg-slate-950/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Curadoria Exclusiva Titi's Store</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white font-heading tracking-tight">
            Catálogo Signature
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
            Peças selecionadas individualmente por sua qualidade de fibra, caimento impecável e facilidade de combinação.
          </p>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {signatureCatalog.map((prod) => (
            <div
              key={prod.id}
              className="glass-card rounded-[32px] overflow-hidden border border-slate-800 flex flex-col justify-between group hover:border-amber-500/40 transition-all duration-300 shadow-xl"
            >
              <div>
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-900">
                  <Image
                    src={prod.image}
                    alt={prod.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-amber-300 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md">
                    {prod.category}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: prod.hex }} />
                    <span className="text-xs text-slate-300 font-medium">{prod.colorName}</span>
                  </div>

                  <h3 className="text-lg font-semibold text-white font-heading">{prod.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">{prod.description}</p>
                  
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-amber-200 font-normal italic">
                    ✨ {prod.skinToneMatch}
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <button
                  onClick={() => onAddToCart({
                    id: prod.id,
                    name: prod.name,
                    category: prod.category,
                    color: prod.colorName,
                    hex: prod.hex,
                  })}
                  className="w-full py-3 rounded-full bg-gold-gradient text-[#0B0C10] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-all"
                >
                  <ShoppingBag className="w-4 h-4 text-[#0B0C10]" />
                  <span>Encomendar no WhatsApp (+5531996000213)</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
