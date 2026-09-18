'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShoppingBag, Sparkles, Eye } from 'lucide-react';
import { Tilt3D } from '@/components/ui/Tilt3D';
import { formatBRL } from '@/lib/format';
import { useCart } from '@/providers/CartProvider';
import { useUI } from '@/providers/UIProvider';
import type { Product } from '@/lib/types';

interface FeaturedCarousel3DProps {
  products: Product[];
}

export function FeaturedCarousel3D({ products }: FeaturedCarousel3DProps) {
  const { add } = useCart();
  const { openOverlay } = useUI();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = products.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Autoplay a cada 6 segundos quando não estiver com o mouse em cima
  useEffect(() => {
    if (total <= 1 || isHovered) return;
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 6000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [total, isHovered, nextSlide]);

  if (!products || products.length === 0) {
    return null;
  }

  const current = products[currentIndex] || products[0];
  const priceLabel = current.price_cents ? formatBRL(current.price_cents) : 'Sob consulta';
  const productUrl = `/produtos/${current.slug || current.id}`;
  const productImage = current.image_url || '/produtos/calca-alfaiataria-regulador-cinza-grafite.jpg';

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      productId: current.id,
      name: current.name,
      detail: current.category || 'Peça em Destaque',
      color: current.color_name ?? 'Padrão',
      hex: current.hex_color ?? '#181b24',
      image: productImage,
      size: current.sizes?.[0] || 'M',
      priceCents: current.price_cents ?? 0,
      quantity: 1,
    });
    openOverlay({ type: 'bag' });
  };

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Moldura 3D com Tilt interativo */}
      <Tilt3D max={7} lift={12} perspective={1100} className="w-full">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.5rem] border border-line-gold bg-surface shadow-2xl group">
          
          {/* Slides animados com transição suave e 3D fade */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id || currentIndex}
              initial={{ opacity: 0, scale: 0.96, rotateY: 8 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 1.03, rotateY: -8 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={productImage}
                alt={current.name}
                fill
                priority
                className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent" />
            </motion.div>
          </AnimatePresence>

          {/* Badge superior "Destaque da Coleção" */}
          <div className="absolute top-5 left-5 z-20 flex items-center gap-2 rounded-full border border-line-gold/60 bg-obsidian/80 px-3.5 py-1.5 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gold-light">
              Destaque {total > 1 ? `· ${currentIndex + 1}/${total}` : ''}
            </span>
          </div>

          {/* Botões de Navegação 3D Anterior / Próximo */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); prevSlide(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full border border-line-gold/40 bg-obsidian/75 text-ivory opacity-80 backdrop-blur-md transition-all hover:scale-110 hover:border-gold hover:text-gold active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Peça anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); nextSlide(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-30 grid h-10 w-10 place-items-center rounded-full border border-line-gold/40 bg-obsidian/75 text-ivory opacity-80 backdrop-blur-md transition-all hover:scale-110 hover:border-gold hover:text-gold active:scale-95 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Próxima peça"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Card Flutuante Inferior com Dados da Peça */}
          <div className="absolute bottom-5 left-5 right-5 z-20 rounded-2xl border border-line-gold/40 bg-surface/92 p-5 backdrop-blur-md shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gold block truncate">
                  {current.category || 'Alta Alfaiataria'}
                </span>
                <Link href={productUrl} className="hover:text-gold transition-colors">
                  <h3 className="mt-0.5 text-base font-bold text-ivory line-clamp-1">
                    {current.name}
                  </h3>
                </Link>
                <span className="mt-1 block text-sm font-extrabold text-gold">
                  {priceLabel}
                </span>
              </div>

              {/* Botão Rápido: Adicionar à Sacola */}
              <button
                type="button"
                onClick={handleQuickBuy}
                title="Adicionar à sacola"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-gradient text-obsidian shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <ShoppingBag className="h-4 w-4" />
              </button>
            </div>

            {/* Links inferiores: Ver Detalhes */}
            <div className="mt-3 flex items-center justify-between border-t border-line/50 pt-2.5">
              <Link
                href={productUrl}
                className="text-xs text-parchment hover:text-gold-light font-bold flex items-center gap-1 transition-colors"
              >
                <Eye className="h-3.5 w-3.5 text-gold" />
                <span>Ver detalhes da peça</span>
              </Link>

              {/* Bolinhas indicadoras */}
              {total > 1 && (
                <div className="flex items-center gap-1.5">
                  {products.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentIndex
                          ? 'w-5 bg-gold'
                          : 'w-1.5 bg-line-gold/40 hover:bg-gold/60'
                      }`}
                      aria-label={`Ir para peça ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </Tilt3D>
    </div>
  );
}
