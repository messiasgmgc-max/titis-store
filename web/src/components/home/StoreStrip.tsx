'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useCatalog } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';
import type { Product } from '@/lib/types';
import { useUI } from '@/providers/UIProvider';
import { SectionTitle } from './Heading';

const MAX_ITEMS = 8;
const EDGE = 'clamp(1.25rem,4vw,3rem)';
const ITEM_WIDTH = 'w-[68%] shrink-0 snap-start sm:w-[42%] md:w-[31%] lg:w-[calc((100%_-_3.75rem)/4)]';
const ARROW =
  'grid h-11 w-11 place-items-center rounded-full border border-line text-parchment transition-colors duration-300 hover:border-line-gold hover:text-gold-light';

/** Peças em destaque primeiro, mantendo a ordem da loja. */
function pickProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => Number(b.is_featured) - Number(a.is_featured)).slice(0, MAX_ITEMS);
}

function ProductTile({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  const src = product.image_url?.trim() || product.gallery.find((image) => image.trim().length > 0) || null;

  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left">
      <span className="relative block aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface">
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="img-editorial h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-couture)] group-hover:scale-[1.04]"
          />
        ) : (
          <span aria-hidden className="absolute inset-0" style={{ backgroundColor: product.hex_color ?? undefined }} />
        )}
      </span>
      <span className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.14em] text-smoke">
        {product.category}
      </span>
      <span className="mt-1 block truncate text-[15px] font-bold text-ivory transition-colors duration-300 group-hover:text-gold-light">
        {product.name}
      </span>
      <span className="mt-0.5 block text-sm text-mist">{formatBRL(product.price_cents)}</span>
    </button>
  );
}

export function StoreStrip() {
  const { products, loading } = useCatalog();
  const { openOverlay } = useUI();
  const trackRef = useRef<HTMLUListElement>(null);
  const items = useMemo(() => pickProducts(products), [products]);

  function scrollTrack(direction: 1 | -1) {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  }

  if (!loading && items.length === 0) return null;

  return (
    <section id="loja" aria-labelledby="loja-title" className="border-t border-line py-20 sm:py-28">
      <div className="container-luxe">
        <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <SectionTitle
            id="loja-title"
            eyebrow="Loja Titi's Store"
            title={
              <>
                Peças da loja que <span className="text-foil">combinam com você.</span>
              </>
            }
            lead="Com a consultoria você sabe exatamente o que comprar: sua cartela aponta as cores certas e o Titi indica as peças. Os pedidos são feitos pelo WhatsApp."
          />
          <div className="flex shrink-0 items-center gap-5">
            <Link
              href="/colecao"
              className="group inline-flex items-center gap-2 text-[15px] font-semibold text-ivory transition-colors duration-300 hover:text-gold-light"
            >
              Ver loja completa
              <ArrowUpRight
                className="h-4 w-4 text-gold transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
            <div className="hidden gap-2 md:flex">
              <button type="button" onClick={() => scrollTrack(-1)} aria-label="Peças anteriores" className={ARROW}>
                <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </button>
              <button type="button" onClick={() => scrollTrack(1)} aria-label="Próximas peças" className={ARROW}>
                <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <ul
          ref={trackRef}
          aria-label="Peças da loja"
          aria-busy={loading || undefined}
          className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:gap-5"
          style={{ marginInline: `calc(-1 * ${EDGE})`, paddingInline: EDGE, scrollPaddingInline: EDGE }}
        >
          {loading
            ? Array.from({ length: 4 }, (_, index) => (
                <li key={index} aria-hidden className={ITEM_WIDTH}>
                  <span className="block aspect-[4/5] animate-pulse rounded-2xl bg-surface" />
                  <span className="mt-3 block h-3 w-1/3 rounded-full bg-surface" />
                  <span className="mt-2 block h-4 w-2/3 rounded-full bg-surface" />
                </li>
              ))
            : items.map((product) => (
                <li key={product.id} className={ITEM_WIDTH}>
                  <ProductTile product={product} onOpen={() => openOverlay({ type: 'product', product })} />
                </li>
              ))}
        </ul>
      </div>
    </section>
  );
}
