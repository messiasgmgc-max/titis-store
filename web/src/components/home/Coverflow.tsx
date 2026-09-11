'use client';

import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn, formatBRL } from '@/lib/format';
import type { Product } from '@/lib/types';

const ARROW =
  'grid h-11 w-11 place-items-center rounded-full border border-line text-parchment transition-colors duration-300 hover:border-line-gold hover:text-gold-light';

function ProductFace({ product, active }: { product: Product; active: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = product.image_url?.trim() || product.gallery.find((image) => image.trim().length > 0) || null;

  return (
    <span className="relative block h-full w-full overflow-hidden rounded-2xl border border-line bg-surface">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="img-editorial h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden className="absolute inset-0" style={{ backgroundColor: product.hex_color ?? undefined }} />
      )}
      {/* reflexo de vitrine */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_40%,rgba(245,215,127,0.16)_50%,transparent_60%)]"
      />
      <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(11,12,16,0.94)_60%)] p-4 pt-12 text-left">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">{product.category}</span>
        <span className="mt-1 block truncate text-[15px] font-bold text-ivory">{product.name}</span>
        <span className="mt-0.5 flex items-center justify-between text-xs text-mist">
          {formatBRL(product.price_cents)}
          {active && <span className="font-semibold text-gold-light">Ver peça →</span>}
        </span>
      </span>
    </span>
  );
}

/** Vitrine em carrossel 3D (coverflow): a peça central em destaque, as demais em leque. */
export function Coverflow({ products, onOpen }: { products: Product[]; onOpen: (product: Product) => void }) {
  const [active, setActive] = useState(() => Math.min(2, Math.max(0, products.length - 1)));
  const reduceMotion = useReducedMotion();
  const count = products.length;
  const go = (direction: 1 | -1) => setActive((current) => (current + direction + count) % count);

  return (
    <div>
      <div className="relative h-[430px] overflow-hidden [perspective:1500px]">
        <div className="absolute inset-0 transform-3d">
          {products.map((product, index) => {
            const offset = index - active;
            const distance = Math.abs(offset);
            const isActive = offset === 0;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => (isActive ? onOpen(product) : setActive(index))}
                aria-label={isActive ? `Abrir ${product.name}` : `Mostrar ${product.name}`}
                tabIndex={distance > 2 ? -1 : 0}
                className={cn(
                  'absolute left-1/2 top-1/2 h-[340px] w-[250px] cursor-pointer rounded-2xl outline-none focus-visible:ring-1 focus-visible:ring-gold',
                  !reduceMotion && 'transition-[transform,opacity,filter] duration-[900ms] ease-[var(--ease-couture)]',
                )}
                style={{
                  transform: `translate(-50%, -50%) translateX(${offset * 175}px) translateZ(${-distance * 150}px) rotateY(${-offset * 38}deg)`,
                  zIndex: 20 - distance,
                  opacity: distance > 3 ? 0 : 1 - distance * 0.18,
                  filter: `brightness(${1 - distance * 0.2})`,
                  pointerEvents: distance > 3 ? 'none' : 'auto',
                }}
              >
                <ProductFace product={product} active={isActive} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button type="button" onClick={() => go(-1)} aria-label="Peça anterior" className={ARROW}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </button>
        <span className="min-w-[4ch] text-center text-xs font-semibold tabular-nums text-mist">
          {String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
        <button type="button" onClick={() => go(1)} aria-label="Próxima peça" className={ARROW}>
          <ArrowRight className="h-4 w-4" strokeWidth={1.8} aria-hidden />
        </button>
      </div>
    </div>
  );
}
