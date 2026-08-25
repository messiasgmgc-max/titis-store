"use client";

import React from 'react';
import Image from 'next/image';
import { Crown, Star, Eye, ExternalLink } from 'lucide-react';

interface CatalogItem {
  id: string;
  title: string;
  category: string;
  image: string;
  rating: number;
  views: number;
  palette: string[];
  description: string;
}

const catalogItems: CatalogItem[] = [
  {
    id: '1',
    title: 'Executivo Noir Gold',
    category: 'Alfaiataria Premium',
    image: '/skin_clara.jpg',
    rating: 4.9,
    views: 1420,
    palette: ['#0B0C10', '#1B2A4A', '#D4AF37'],
    description: 'Lã fria super 130 com caimento impecável e detalhes em botões de madrepérola escura.',
  },
  {
    id: '2',
    title: 'Casual Chic Champagne',
    category: 'Modern Elegance',
    image: '/skin_morena.jpg',
    rating: 4.8,
    views: 980,
    palette: ['#E6D7C3', '#A0522D', '#2C3539'],
    description: 'Tricô fino em algodão egípcio combinado com calça chino tailored e sapatos minimalistas.',
  },
  {
    id: '3',
    title: 'Noturno Velour Velvet',
    category: 'Gala & Eventos',
    image: '/skin_negra.jpg',
    rating: 5.0,
    views: 2100,
    palette: ['#58111A', '#0B0C10', '#C0C0C0'],
    description: 'Blazer em veludo italiano bordô com lapela xale em cetim de seda natural.',
  },
];

export const CatalogSection: React.FC = () => {
  return (
    <section id="catalogo" className="py-20 bg-slate-950/60 border-t border-slate-900 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3 border border-amber-500/30">
              <Crown className="w-4 h-4 text-[#D4AF37]" />
              <span>Curadoria de Assinatura</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-heading">
              Catálogo Signature Titi's Store
            </h2>
            <p className="text-slate-300 text-sm mt-2 max-w-xl font-medium">
              Explore os conjuntos mais desejados e validados por consultores de imagem internacionais.
            </p>
          </div>

          <a
            href="#consultoria"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest hover:text-amber-300 transition-colors"
          >
            <span>Ver Todos os Combos</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {catalogItems.map((item) => (
            <div
              key={item.id}
              className="glass-card rounded-[32px] p-4.5 border border-slate-800 hover:border-amber-500/40 transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                {/* Image Box */}
                <div className="relative aspect-[4/5] w-full rounded-[24px] overflow-hidden mb-4">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent opacity-60" />
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0B0C10]/85 text-amber-300 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border border-amber-500/20">
                    {item.category}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 px-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-slate-200">{item.rating}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-medium">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.views} visualizações</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white font-heading">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Color Swatches Footer */}
              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between px-1">
                <span className="text-[11px] text-slate-400 font-bold">Paleta Hex:</span>
                <div className="flex items-center gap-1.5">
                  {item.palette.map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
