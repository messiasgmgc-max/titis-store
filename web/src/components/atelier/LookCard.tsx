'use client';

import { useState } from 'react';
import { ChevronRight, ScanFace, ShoppingBag } from 'lucide-react';
import type { Look, LookPiece, PieceSlot, Product } from '@/lib/types';
import { SLOT_LABELS } from '@/lib/stylist/knowledge';
import { findProduct } from '@/lib/catalog';
import { useUI } from '@/providers/UIProvider';
import { useCart, type CartInput } from '@/providers/CartProvider';
import { Button } from '@/components/ui/Button';
import { ColorDot, Swatch } from '@/components/ui/Swatch';
import { cn, formatBRL, readableOn } from '@/lib/format';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const SLOT_WEIGHT: Record<PieceSlot, number> = { sobreposicao: 3, superior: 2.4, inferior: 2.2, calcado: 1.3, acessorio: 1 };
const SLOT_ORDER: Record<PieceSlot, number> = { sobreposicao: 0, superior: 1, inferior: 2, calcado: 3, acessorio: 4 };
const HANG = ['100%', '91%', '96%', '87%', '93%'];
const WEAVE =
  'repeating-linear-gradient(45deg, rgba(255,255,255,.55) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgba(0,0,0,.55) 0 1px, transparent 1px 3px)';

interface Entry {
  piece: LookPiece;
  product?: Product;
}
type ProductEntry = Required<Entry>;

function safeHex(hex: string | null | undefined, fallback = '#2C3539') {
  return hex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : fallback;
}

/** Medidor de formalidade: cinco botões de punho. */
function CuffButtons({ value }: { value: number }) {
  const v = Math.min(5, Math.max(1, Math.round(value)));
  return (
    <span className="flex items-center gap-1.5" role="img" aria-label={`Formalidade ${v} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
          <circle
            cx="6"
            cy="6"
            r="5.2"
            strokeWidth="0.8"
            className={i <= v ? 'fill-gold stroke-gold-light/70' : 'fill-transparent stroke-ivory/25'}
          />
          {i <= v && (
            <>
              <circle cx="4.7" cy="4.7" r="0.7" className="fill-obsidian/70" />
              <circle cx="7.3" cy="4.7" r="0.7" className="fill-obsidian/70" />
              <circle cx="4.7" cy="7.3" r="0.7" className="fill-obsidian/70" />
              <circle cx="7.3" cy="7.3" r="0.7" className="fill-obsidian/70" />
            </>
          )}
        </svg>
      ))}
    </span>
  );
}

function FabricCell({ name, hex, caption }: { name: string; hex: string; caption?: string }) {
  const color = safeHex(hex);
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: color }}>
      <span className="absolute inset-0 opacity-[0.14] mix-blend-overlay" style={{ backgroundImage: WEAVE }} aria-hidden />
      <span
        className="absolute left-3 top-3 max-w-[85%] text-[0.55rem] font-medium uppercase leading-snug tracking-[0.22em]"
        style={{ color: readableOn(color), opacity: 0.78 }}
      >
        {name}
      </span>
      {caption && (
        <span className="absolute bottom-2 left-2 rounded-full bg-obsidian/80 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.2em] text-parchment backdrop-blur-sm">
          {caption}
        </span>
      )}
    </div>
  );
}

function ProductCell({ entry }: { entry: ProductEntry }) {
  const [failed, setFailed] = useState(false);
  const { product, piece } = entry;
  if (!product.image_url || failed) {
    return <FabricCell name={product.name} hex={product.hex_color ?? piece.hex} caption={SLOT_LABELS[piece.slot]} />;
  }
  return (
    <div className="group/cell relative h-full w-full overflow-hidden bg-coal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.image_url}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="img-editorial h-full w-full object-cover transition-transform duration-[1400ms] ease-[var(--ease-couture)] group-hover/cell:scale-105"
      />
      <span className="absolute bottom-2 left-2 rounded-full bg-obsidian/80 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.2em] text-parchment backdrop-blur-sm">
        {SLOT_LABELS[piece.slot]}
      </span>
    </div>
  );
}

/** Composição flat-lay com as fotos das peças do acervo (e tecidos para as demais). */
function FlatLay({ entries }: { entries: Entry[] }) {
  const ordered = [...entries.filter((e) => e.product), ...entries.filter((e) => !e.product)].slice(0, 4);
  const n = ordered.length;
  return (
    <div
      className={cn(
        'grid h-full w-full gap-px bg-line',
        n === 1 && 'grid-cols-1',
        n === 2 && 'grid-cols-2',
        n >= 3 && 'grid-cols-2 grid-rows-2',
      )}
    >
      {ordered.map((entry, i) => (
        <div key={`${entry.piece.slot}-${i}`} className={cn('min-h-0', n === 3 && i === 0 && 'row-span-2')}>
          {entry.product ? (
            <ProductCell entry={entry as ProductEntry} />
          ) : (
            <FabricCell name={entry.piece.color} hex={entry.piece.hex} caption={SLOT_LABELS[entry.piece.slot]} />
          )}
        </div>
      ))}
    </div>
  );
}

/** Prancha de tecidos: amostras penduradas com as cores de cada peça. */
function FabricBoard({ pieces }: { pieces: LookPiece[] }) {
  const ordered = [...pieces].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
  return (
    <div className="relative flex h-full w-full flex-col bg-coal">
      <div className="relative z-[1] mx-4 mt-4 h-px bg-gold/40" aria-hidden>
        <span className="absolute -top-[3px] left-0 h-[7px] w-[7px] rounded-full bg-gold/70" />
        <span className="absolute -top-[3px] right-0 h-[7px] w-[7px] rounded-full bg-gold/70" />
      </div>
      <div className="flex min-h-0 flex-1 items-start gap-1 px-4 pb-0">
        {ordered.map((p, i) => {
          const color = safeHex(p.hex);
          return (
            <div
              key={`${p.slot}-${i}`}
              className="pinked relative min-w-0"
              style={{ flexGrow: SLOT_WEIGHT[p.slot], flexBasis: 0, height: HANG[i % HANG.length], backgroundColor: color }}
            >
              <span className="absolute inset-0 opacity-[0.16] mix-blend-overlay" style={{ backgroundImage: WEAVE }} aria-hidden />
              <span className="absolute inset-x-0 top-0 h-px bg-white/25" aria-hidden />
              <span
                className="vertical-text absolute bottom-6 left-1.5 max-h-[80%] overflow-hidden text-[0.52rem] font-medium uppercase tracking-[0.22em] sm:left-2"
                style={{ color: readableOn(color), opacity: 0.8 }}
              >
                {p.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LookCard({ look, index, products }: { look: Look; index: number; products: Product[] }) {
  const { openOverlay, toast } = useUI();
  const { add, addMany } = useCart();

  const entries: Entry[] = look.pieces.map((piece) => ({ piece, product: findProduct(products, piece.productId) }));
  const productEntries = entries.filter((e): e is ProductEntry => !!e.product);
  const numeral = ROMAN[index] ?? String(index + 1);
  const harmony = Math.round(Math.min(100, Math.max(0, look.harmony)));
  const inStore = productEntries.length > 0;

  const uniqueProducts = Array.from(new Map(productEntries.map((e) => [e.product.id, e.product])).values());
  const pricedTotal = uniqueProducts.reduce((sum, p) => sum + (p.price_cents ?? 0), 0);
  const hasUnpriced = uniqueProducts.some((p) => p.price_cents === null);
  const countLabel = `${uniqueProducts.length} ${uniqueProducts.length === 1 ? 'peça deste look' : 'peças deste look'} na loja`;
  const storeLine =
    pricedTotal > 0 ? `${countLabel} · ${formatBRL(pricedTotal)}${hasUnpriced ? ' + itens sob consulta' : ''}` : countLabel;

  const takeFromAcervo = () => {
    const unique = new Map<string, CartInput>();
    productEntries.forEach(({ piece, product }) => {
      if (unique.has(product.id)) return;
      unique.set(product.id, {
        productId: product.id,
        name: product.name,
        detail: product.category,
        color: product.color_name ?? piece.color,
        hex: product.hex_color ?? piece.hex,
        image: product.image_url,
        size: null,
        priceCents: product.price_cents,
        lookTitle: look.title,
      });
    });
    const items = Array.from(unique.values());
    addMany(items);
    toast(`${items.length} ${items.length === 1 ? 'peça' : 'peças'} na sacola`, 'success');
  };

  const requestLook = () => {
    add({
      productId: null,
      name: look.title,
      detail: 'Look completo sob consulta',
      color: look.palette.map((s) => s.name).join(' · '),
      hex: look.palette[0]?.hex ?? '#D4AF37',
      image: null,
      size: null,
      priceCents: null,
      lookTitle: look.title,
    });
    toast('Look na sacola. Finalize a compra com o Titi pelo WhatsApp.', 'success');
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-[border-color,box-shadow] duration-500 hover:border-line-gold hover:shadow-[0_30px_60px_-40px_rgb(212_175_55/0.35)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-line">
        {productEntries.length > 0 ? <FlatLay entries={entries} /> : <FabricBoard pieces={look.pieces} />}
        <span className="absolute left-3 top-3 z-[2] rounded-full border border-gold/30 bg-obsidian/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold backdrop-blur-sm">
          Look {numeral}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ivory sm:text-[1.75rem]">{look.title}</h3>
        {look.tagline && <p className="mt-2 text-sm leading-relaxed text-mist">{look.tagline}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-line py-3">
          <span className="flex items-center gap-3">
            <span className="text-[0.6rem] uppercase tracking-[0.22em] text-smoke">Formalidade</span>
            <CuffButtons value={look.formality} />
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.22em] text-smoke">
            Harmonia <span className="ml-1 font-caps text-[0.7rem] tracking-[0.12em] text-gold">{harmony}</span>
          </span>
        </div>

        {look.palette.length > 0 && (
          <div className="mt-5">
            <p className="sr-only">Paleta: {look.palette.map((s) => s.name).join(', ')}</p>
            <div className="flex flex-wrap gap-2" aria-hidden>
              {look.palette.map((s, i) => (
                <Swatch key={`${s.hex}-${i}`} name={s.name} hex={safeHex(s.hex)} size="sm" showLabel={false} />
              ))}
            </div>
          </div>
        )}

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {entries.map(({ piece, product }, i) => {
            const body = (
              <>
                <span className="w-[5.5rem] shrink-0 pt-0.5 text-[0.56rem] uppercase leading-snug tracking-[0.2em] text-smoke">
                  {SLOT_LABELS[piece.slot]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug text-ivory">{piece.name}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mist">
                    <ColorDot hex={safeHex(piece.hex)} size={10} />
                    {piece.color}
                    {piece.fabric && <span className="text-smoke">· {piece.fabric}</span>}
                  </span>
                </span>
                {product && (
                  <span className="flex shrink-0 items-center gap-1 self-center">
                    <span className="rounded-full border border-line-gold px-2 py-0.5 text-[0.52rem] uppercase tracking-[0.18em] text-gold">
                      No acervo
                    </span>
                    <ChevronRight
                      className="h-3.5 w-3.5 text-smoke transition-transform duration-500 group-hover:translate-x-0.5 group-hover:text-gold"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </span>
                )}
              </>
            );
            return (
              <li key={`${piece.slot}-${i}`}>
                {product ? (
                  <button
                    type="button"
                    onClick={() => openOverlay({ type: 'product', product })}
                    className="group -mx-2 flex w-[calc(100%+1rem)] items-start gap-3 rounded-xl px-2 py-3 text-left transition-colors duration-500 hover:bg-gold/[0.04]"
                  >
                    {body}
                  </button>
                ) : (
                  <div className="flex items-start gap-3 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>

        {look.rationale && <p className="mt-6 text-sm leading-relaxed text-mist">{look.rationale}</p>}

        {look.tip && (
          <>
            <div className="stitch mt-6" aria-hidden />
            <p className="mt-5 text-base font-semibold leading-snug text-parchment">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                Detalhe de alfaiate
              </span>
              {look.tip}
            </p>
          </>
        )}

        <div className="mt-auto pt-7">
          <div className="rounded-2xl border border-line-gold bg-gold/[0.04] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
              {inStore ? 'Disponível na loja' : 'Look sob consulta'}
            </p>
            <p className="mt-1.5 text-sm leading-snug text-parchment">
              {inStore ? storeLine : 'Peça o look completo e finalize a compra com o Titi pelo WhatsApp.'}
            </p>
            <Button onClick={inStore ? takeFromAcervo : requestLook} className="mt-4 w-full whitespace-normal">
              <ShoppingBag className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              {inStore ? 'Levar peças do acervo' : 'Comprar peças com o Titi'}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => openOverlay({ type: 'tryon', look })}
            className="mt-2.5 w-full whitespace-normal"
          >
            <ScanFace className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Provar com meu rosto
          </Button>
        </div>
      </div>
    </article>
  );
}
