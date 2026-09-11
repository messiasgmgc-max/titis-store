'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import type { ColorSwatch, Diagnosis, Product } from '@/lib/types';
import { closestSwatch } from '@/lib/stylist/color';
import { cn, formatBRL } from '@/lib/format';
import { ColorDot } from '@/components/ui/Swatch';
import { useCart } from '@/providers/CartProvider';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';

// ---------------------------------------------------------------------------
// Utilitários de peça — compartilhados com a Coleção e a gaveta de produto.
// ---------------------------------------------------------------------------

const HEX_RE = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Hex válido (com "#") ou null — dados antigos podem trazer valores inválidos. */
export function safeHex(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v || !HEX_RE.test(v)) return null;
  return v.startsWith('#') ? v : `#${v}`;
}

/** Foto principal seguida da galeria, sem vazios nem repetições. */
export function productImages(product: Product): string[] {
  const list = [product.image_url, ...product.gallery]
    .map((src) => (typeof src === 'string' ? src.trim() : ''))
    .filter((src) => src.length > 0);
  return Array.from(new Set(list));
}

export type FitLevel = 'excelente' | 'boa' | 'distante';

export interface PaletteFit {
  level: FitLevel;
  /** Distância cromática (CIE76) até a cor mais próxima da cartela. */
  distance: number;
  nearest: ColorSwatch;
  /** A curadoria indicou a peça para este tom de pele (ou para todos). */
  toneMatch: boolean;
  /** Cor "a evitar" praticamente idêntica à cor da peça. */
  nearAvoid: ColorSwatch | null;
}

const EXCELLENT_DELTA = 14;
const GOOD_DELTA = 28;
const AVOID_DELTA = 6;

function validSwatches(list: ColorSwatch[] | undefined): ColorSwatch[] {
  return (list ?? []).flatMap((s) => {
    const hex = safeHex(s?.hex);
    return hex ? [{ name: s.name, hex }] : [];
  });
}

/** Peça sem restrição de tom ou indicada para o tom do diagnóstico. */
export function toneMatches(product: Product, diagnosis: Diagnosis): boolean {
  return product.skin_tones.length === 0 || product.skin_tones.includes(diagnosis.skinTone);
}

/** Aderência da cor da peça à cartela do diagnóstico (null sem diagnóstico ou sem cor). */
export function paletteFit(product: Product, diagnosis: Diagnosis | null | undefined): PaletteFit | null {
  if (!diagnosis) return null;
  const hex = safeHex(product.hex_color);
  const palette = validSwatches(diagnosis.palette);
  if (!hex || palette.length === 0) return null;

  const best = closestSwatch(hex, palette);
  if (!best) return null;

  const avoidList = validSwatches(diagnosis.avoid);
  const avoid = avoidList.length > 0 ? closestSwatch(hex, avoidList) : null;
  const nearAvoid = avoid && avoid.distance <= AVOID_DELTA && avoid.distance < best.distance ? avoid.swatch : null;
  const toneMatch = toneMatches(product, diagnosis);

  let level: FitLevel = best.distance <= EXCELLENT_DELTA ? 'excelente' : best.distance <= GOOD_DELTA ? 'boa' : 'distante';
  if (!toneMatch || nearAvoid) level = 'distante';

  return { level, distance: best.distance, nearest: best.swatch, toneMatch, nearAvoid };
}

// ---------------------------------------------------------------------------
// Peças visuais
// ---------------------------------------------------------------------------

const WEAVE =
  'repeating-linear-gradient(45deg, rgb(245 241 234) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgb(11 12 16) 0 1px, transparent 1px 3px)';

/** Amostra de tecido picotada na cor da peça — aparece quando não há foto. */
export function FabricSample({ hex, label, className }: { hex: string | null; label?: string | null; className?: string }) {
  return (
    <div
      role="img"
      aria-label={label ? `Amostra de tecido na cor ${label}` : 'Amostra de tecido'}
      className={cn('absolute inset-0 grid place-items-center overflow-hidden bg-surface-2', className)}
    >
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgb(245 241 234 / 0.025) 0 1px, transparent 1px 8px)' }}
      />
      <span
        aria-hidden
        className="pinked relative block h-[58%] w-[56%] rounded-t-[6px]"
        style={{ backgroundColor: hex ?? 'var(--color-surface)' }}
      >
        <span className="absolute inset-0 opacity-[0.14] mix-blend-overlay" style={{ backgroundImage: WEAVE }} />
        <span className="absolute inset-x-0 top-0 h-px bg-ivory/25" />
      </span>
      {label && (
        <span aria-hidden className="absolute bottom-4 left-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
          {label}
        </span>
      )}
    </div>
  );
}

/** Etiqueta de papel pendurada por um cordão dourado (hang tag de alfaiataria). */
export function HangTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none flex origin-top flex-col items-center drop-shadow-[0_8px_10px_rgb(0_0_0/0.55)]',
        'transition-transform duration-[900ms] ease-[var(--ease-couture)] group-hover:rotate-[4deg]',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-gold-dark" />
      <span className="relative z-[1] -mt-0.5 h-6 w-px bg-linear-to-b from-gold-dark via-gold to-gold-light" />
      <span className="relative -mt-2 rounded-[7px_7px_10px_10px] bg-parchment px-2.5 pb-1.5 pt-4 shadow-[inset_0_0_0_1px_rgb(11_12_16/0.08)]">
        <span className="absolute left-1/2 top-[5px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-obsidian/85 ring-1 ring-obsidian/15" />
        <span className="block max-w-[7.5rem] truncate text-[10px] font-bold uppercase tracking-[0.14em] text-obsidian">
          {label}
        </span>
      </span>
    </span>
  );
}

const IMG_TRANSITION =
  'transform 1.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)';

interface ProductCardProps {
  product: Product;
  /** Posição na grade — exibida como "Nº 01". */
  index?: number;
  /** Peça de capa: ocupa 2 colunas × 2 linhas a partir do tablet. */
  lead?: boolean;
  className?: string;
}

export function ProductCard({ product, index, lead = false, className }: ProductCardProps) {
  const { openOverlay, toast } = useUI();
  const { add } = useCart();
  const { diagnosis } = useDiagnosis();
  const [failed, setFailed] = useState<string[]>([]);

  const images = productImages(product).filter((src) => !failed.includes(src));
  const cover = images[0] ?? null;
  const alternate = images[1] ?? null;
  const hex = safeHex(product.hex_color);
  const fit = paletteFit(product, diagnosis);
  const inPalette = fit !== null && fit.level !== 'distante';
  const hasSizes = product.sizes.length > 0;
  const priced = product.price_cents !== null;
  const alt = product.color_name ? `${product.name} — ${product.color_name}` : product.name;

  const markFailed = (src: string) => setFailed((prev) => (prev.includes(src) ? prev : [...prev, src]));
  const open = () => openOverlay({ type: 'product', product });

  const quickAdd = () => {
    if (hasSizes) {
      open();
      return;
    }
    add({
      productId: product.id,
      name: product.name,
      detail: product.category,
      color: product.color_name ?? '',
      hex: hex ?? '#D4AF37',
      image: cover ?? product.image_url,
      size: null,
      priceCents: product.price_cents,
      quantity: 1,
    });
    toast('Adicionado à sacola', 'success');
  };

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col',
        'rounded-2xl has-[.card-link:focus-visible]:outline has-[.card-link:focus-visible]:outline-offset-8 has-[.card-link:focus-visible]:outline-gold',
        className,
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-surface',
          lead ? 'aspect-[4/5] md:aspect-auto md:min-h-[26rem] md:flex-1' : 'aspect-[4/5]',
        )}
      >
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={cover}
              src={cover}
              alt={alt}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => markFailed(cover)}
              style={{ transition: IMG_TRANSITION }}
              className={cn(
                'img-editorial absolute inset-0 h-full w-full select-none object-cover group-hover:scale-[1.06]',
                alternate && 'group-hover:opacity-0',
              )}
            />
            {alternate && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={alternate}
                src={alternate}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={() => markFailed(alternate)}
                style={{ transition: IMG_TRANSITION }}
                className="img-editorial absolute inset-0 h-full w-full scale-[1.06] select-none object-cover opacity-0 group-hover:scale-100 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <FabricSample hex={hex} label={product.color_name} />
        )}

        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-obsidian/60 via-obsidian/10 to-transparent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-[10px] border border-gold-light/0 transition-colors duration-700 ease-[var(--ease-couture)] group-hover:border-gold-light/35 sm:inset-4"
        />

        <HangTag label={product.category} className="absolute left-3 top-0 z-[2] sm:left-5" />

        {inPalette && (
          <span
            aria-hidden
            title="Na sua cartela"
            className="absolute right-3 top-3 z-[2] grid h-8 w-8 place-items-center rounded-full border border-gold/50 bg-obsidian/70 text-gold-light backdrop-blur-sm sm:right-4 sm:top-4"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
        )}

        <button
          type="button"
          onClick={quickAdd}
          aria-label={hasSizes ? `Escolher tamanho de ${product.name}` : `Adicionar ${product.name} à sacola`}
          className="absolute bottom-3 right-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-gold/45 bg-obsidian/65 text-gold-light backdrop-blur-sm transition-all duration-500 ease-[var(--ease-couture)] hover:scale-105 hover:border-gold hover:bg-gold hover:text-obsidian sm:bottom-4 sm:right-4"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div className={cn('flex flex-col pt-4 sm:pt-5', !lead && 'flex-1')}>
        <h3
          className={cn(
            'font-display text-ivory',
            lead
              ? 'text-xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-2xl lg:text-[1.75rem]'
              : 'text-base font-bold leading-[1.15] tracking-[-0.02em] sm:text-lg lg:text-[1.2rem]',
          )}
        >
          <button
            type="button"
            onClick={open}
            className="card-link text-left transition-colors duration-500 after:absolute after:inset-0 after:z-[1] after:content-[''] hover:text-gold-light focus-visible:outline-none"
          >
            {product.name}
          </button>
        </h3>

        {(product.fabric || product.color_name) && (
          <p className="mt-2 flex min-w-0 items-center gap-2 text-xs text-mist">
            {product.fabric && <span className="hidden truncate sm:inline">{product.fabric}</span>}
            {product.fabric && product.color_name && (
              <span className="hidden text-smoke sm:inline" aria-hidden>
                ·
              </span>
            )}
            {product.color_name && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                {hex && <ColorDot hex={hex} size={9} />}
                <span className="truncate">{product.color_name}</span>
              </span>
            )}
          </p>
        )}

        {inPalette && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-light">
            <Check className="h-3 w-3" strokeWidth={2} aria-hidden />
            Na sua cartela
          </p>
        )}

        <div className="mt-auto">
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <p
              className={
                priced
                  ? 'text-[0.95rem] font-extrabold tabular-nums text-parchment'
                  : 'text-sm font-semibold text-mist'
              }
            >
              {formatBRL(product.price_cents)}
            </p>
            {typeof index === 'number' && (
              <span aria-hidden className="shrink-0 text-[11px] font-semibold tabular-nums tracking-[0.14em] text-smoke">
                Nº {String(index + 1).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
