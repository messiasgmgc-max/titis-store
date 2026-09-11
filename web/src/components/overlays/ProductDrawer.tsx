'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Minus, Plus, Ruler, ShoppingBag } from 'lucide-react';
import type { PieceSlot, Product } from '@/lib/types';
import { cn, formatBRL, whatsappLink } from '@/lib/format';
import { climateTitle, occasionTitle } from '@/lib/stylist/knowledge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Swatch } from '@/components/ui/Swatch';
import { WhatsAppIcon } from '@/components/ui/icons';
import {
  FabricSample,
  paletteFit,
  productImages,
  safeHex,
  type FitLevel,
  type PaletteFit,
} from '@/components/collection/ProductCard';
import { useCart } from '@/providers/CartProvider';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_QUANTITY = 20;
const FORMALITY_LABELS = ['Descontraído', 'Casual refinado', 'Social leve', 'Social', 'Black tie'] as const;
const FAR_FROM_FACE: PieceSlot[] = ['inferior', 'calcado'];

const FIT_COPY: Record<FitLevel, { title: string; bars: number }> = {
  excelente: { title: 'Excelente', bars: 3 },
  boa: { title: 'Boa', bars: 2 },
  distante: { title: 'Use longe do rosto', bars: 1 },
};

const pad = (n: number) => String(n).padStart(2, '0');

function fitMessage(fit: PaletteFit, product: Product): string {
  if (fit.level === 'excelente') {
    return `Tom muito próximo de ${fit.nearest.name}, uma das cores da sua cartela. Pode usar perto do rosto com segurança.`;
  }
  if (fit.level === 'boa') {
    return `Conversa com ${fit.nearest.name}, da sua cartela. Perto do rosto, funciona melhor ao lado de um neutro que você já usa bem.`;
  }
  if (FAR_FROM_FACE.includes(product.slot)) {
    return 'Como a peça fica longe do rosto, ela funciona bem: complete o look com uma cor da sua cartela na parte de cima.';
  }
  if (fit.nearAvoid) {
    return `A cor se aproxima de ${fit.nearAvoid.name}, que a sua cartela pede para evitar. Use afastada do rosto e aproxime dele uma cor que valorize você.`;
  }
  if (!fit.toneMatch) {
    return 'A curadoria indicou esta peça para outros tons de pele. Se quiser usá-la, mantenha-a longe do rosto e combine com cores da sua cartela.';
  }
  return 'A cor fica distante da sua cartela. Use em camadas afastadas do rosto e aproxime dele uma cor que valorize você.';
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 py-4 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-smoke">{label}</dt>
      <dd className="text-sm text-ivory">{children}</dd>
    </div>
  );
}

const ARROW_BUTTON =
  'grid h-9 w-9 place-items-center rounded-full border border-ivory/20 bg-obsidian/60 text-ivory backdrop-blur-sm transition-colors duration-500 hover:border-gold hover:text-gold-light';

export function ProductDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const { add } = useCart();
  const { toast, openOverlay } = useUI();
  const { diagnosis } = useDiagnosis();
  const reduceMotion = useReducedMotion();
  const errorId = useId();
  const sizesRef = useRef<HTMLFieldSetElement>(null);

  const [failed, setFailed] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  const images = productImages(product).filter((src) => !failed.includes(src));
  const total = images.length;
  const current = total > 0 ? Math.min(active, total - 1) : 0;
  const currentSrc = total > 0 ? images[current] : null;

  const hex = safeHex(product.hex_color);
  const fit = paletteFit(product, diagnosis);
  const hasSizes = product.sizes.length > 0;
  const priced = product.price_cents !== null;
  const formality = Math.min(5, Math.max(1, Math.round(product.formality || 3)));

  const askText = `Olá, Titi! Tenho interesse na peça *${product.name}*${
    product.color_name ? ` na cor ${product.color_name}` : ''
  }${size ? `, tamanho ${size}` : ''}. Pode me ajudar?`;

  const markFailed = (src: string) => setFailed((prev) => (prev.includes(src) ? prev : [...prev, src]));
  const go = (delta: number) => {
    if (total < 2) return;
    setActive((i) => (Math.min(i, total - 1) + delta + total) % total);
  };

  const handleAdd = () => {
    if (hasSizes && !size) {
      setSizeError(true);
      sizesRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      sizesRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
      return;
    }
    add({
      productId: product.id,
      name: product.name,
      detail: product.category,
      color: product.color_name ?? '',
      hex: hex ?? '#D4AF37',
      image: product.image_url,
      size: hasSizes ? size : null,
      priceCents: product.price_cents,
      quantity,
    });
    toast('Adicionado à sacola', 'success');
    onClose();
  };

  return (
    <Modal variant="drawer" title={product.name} onClose={onClose} className="sm:max-w-lg">
      <div className="flex min-h-full flex-1 flex-col">
        <div className="flex-1">
          {/* Galeria ------------------------------------------------------ */}
          <div className="relative">
            <motion.div
              className="relative aspect-[4/5] w-full overflow-hidden bg-coal"
              drag={total > 1 ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              onDragEnd={(_event: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
                if (info.offset.x < -60 || info.velocity.x < -450) go(1);
                else if (info.offset.x > 60 || info.velocity.x > 450) go(-1);
              }}
            >
              <AnimatePresence initial={false}>
                {currentSrc ? (
                  <motion.img
                    key={currentSrc}
                    src={currentSrc}
                    alt={`${product.name}${product.color_name ? ` em ${product.color_name}` : ''}${
                      total > 1 ? ` — foto ${current + 1} de ${total}` : ''
                    }`}
                    draggable={false}
                    onError={() => markFailed(currentSrc)}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="img-editorial pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                  />
                ) : (
                  <FabricSample key="amostra" hex={hex} label={product.color_name} />
                )}
              </AnimatePresence>
            </motion.div>

            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-obsidian/70 to-transparent"
            />
            {total > 1 && (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-obsidian/70 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-5 pb-4 sm:px-8">
                  <span className="text-[11px] font-semibold tabular-nums tracking-[0.14em] text-parchment" aria-hidden>
                    {pad(current + 1)} / {pad(total)}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => go(-1)} aria-label="Foto anterior" className={ARROW_BUTTON}>
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </button>
                    <button type="button" onClick={() => go(1)} aria-label="Próxima foto" className={ARROW_BUTTON}>
                      <ChevronRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {total > 1 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-3 sm:px-8" role="group" aria-label="Fotos da peça">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Ver foto ${i + 1} de ${total}`}
                  aria-current={i === current ? 'true' : undefined}
                  className={cn(
                    'relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-xl border transition-[border-color,opacity,box-shadow] duration-500',
                    i === current ? 'border-gold shadow-[0_0_0_1px_rgb(212_175_55/0.35)]' : 'border-line opacity-55 hover:opacity-100',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onError={() => markFailed(src)}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Informações -------------------------------------------------- */}
          <div className="px-5 pb-10 pt-7 sm:px-8">
            <div className="flex items-center gap-3">
              <span className="eyebrow">{product.category}</span>
              <span className="stitch w-8" aria-hidden />
            </div>

            <p
              aria-hidden
              className="mt-4 font-display text-[1.75rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-ivory sm:text-[2.15rem]"
            >
              {product.name}
            </p>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {priced ? (
                <p className="text-2xl font-extrabold tabular-nums tracking-[-0.01em] text-gold-light">
                  {formatBRL(product.price_cents)}
                </p>
              ) : (
                <>
                  <p className="font-display text-xl font-extrabold tracking-[-0.02em] text-gold-light">Sob consulta</p>
                  <p className="text-xs text-smoke">valor informado no atendimento</p>
                </>
              )}
            </div>

            <div className="rule-gold mt-7" aria-hidden />

            {product.description && <p className="mt-7 leading-relaxed text-parchment/90">{product.description}</p>}

            <dl className="mt-8 divide-y divide-line border-y border-line">
              {product.fabric && <DetailRow label="Tecido">{product.fabric}</DetailRow>}
              {(product.color_name || hex) && (
                <DetailRow label="Cor">
                  <span className="flex items-center gap-4">
                    {hex && <Swatch name={product.color_name ?? hex} hex={hex} size="sm" showLabel={false} />}
                    <span className="flex min-w-0 flex-col">
                      <span>{product.color_name ?? 'Cor da peça'}</span>
                      {hex && <span className="font-mono text-[0.62rem] uppercase tracking-wider text-smoke">{hex}</span>}
                    </span>
                  </span>
                </DetailRow>
              )}
              <DetailRow label="Ocasiões ideais">
                {product.occasions.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {product.occasions.map((o) => (
                      <li key={o} className="rounded-full border border-line px-2.5 py-1 text-xs text-parchment">
                        {occasionTitle(o)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-parchment">Versátil para qualquer ocasião</span>
                )}
              </DetailRow>
              <DetailRow label="Clima">
                <span className="text-parchment">
                  {product.climates.length > 0 ? product.climates.map((c) => climateTitle(c)).join(' · ') : 'Qualquer clima'}
                </span>
              </DetailRow>
              <DetailRow label="Formalidade">
                <span className="flex items-center gap-3">
                  <span className="flex gap-1.5" role="img" aria-label={`Formalidade ${formality} de 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={cn('h-2 w-2 rounded-full', n <= formality ? 'bg-gold' : 'border border-line-gold')}
                      />
                    ))}
                  </span>
                  <span className="text-xs text-mist">{FORMALITY_LABELS[formality - 1]}</span>
                </span>
              </DetailRow>
            </dl>

            {fit && diagnosis && hex && (
              <section className="panel-gold mt-8 p-5 sm:p-6" aria-label="Harmonia com a sua cartela">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="eyebrow">Harmonia com a sua cartela</p>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-smoke">{diagnosis.season}</span>
                </div>
                <div className="mt-5 flex items-center gap-5">
                  <div className="flex shrink-0 items-center gap-2" aria-hidden>
                    <Swatch name={product.color_name ?? 'Peça'} hex={hex} size="sm" showLabel={false} />
                    <span className="stitch w-4" />
                    <Swatch name={fit.nearest.name} hex={fit.nearest.hex} size="sm" showLabel={false} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'font-display text-xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-2xl',
                        fit.level === 'distante' ? 'text-parchment' : 'text-gold-light',
                      )}
                    >
                      {FIT_COPY[fit.level].title}
                    </p>
                    <div className="mt-2.5 flex gap-1" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <span key={i} className={cn('h-1 w-6 rounded-full', i < FIT_COPY[fit.level].bars ? 'bg-gold' : 'bg-line')} />
                      ))}
                    </div>
                    <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-wider text-smoke">
                      ΔE {fit.distance.toFixed(1).replace('.', ',')} · {fit.nearest.name}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-mist">{fitMessage(fit, product)}</p>
              </section>
            )}

            {!diagnosis && hex && (
              <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-line bg-ivory/[0.015] p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-relaxed text-mist">Quer saber se esta cor valoriza o seu tom?</p>
                <button
                  type="button"
                  onClick={() => openOverlay({ type: 'scanner' })}
                  className="link-luxe shrink-0 self-start sm:self-auto"
                >
                  Ler minha cartela
                </button>
              </div>
            )}

            {hasSizes ? (
              <fieldset ref={sizesRef} className="mt-9" aria-describedby={sizeError ? errorId : undefined}>
                <legend className="label">
                  Tamanho
                  {size && <span className="ml-2 text-gold-light">· {size}</span>}
                </legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip min-w-[3.25rem] justify-center"
                      data-active={size === s}
                      aria-pressed={size === s}
                      onClick={() => {
                        setSize(s);
                        setSizeError(false);
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {sizeError && (
                  <p id={errorId} role="alert" className="mt-3 text-xs text-danger">
                    Escolha um tamanho para adicionar à sacola.
                  </p>
                )}
                <p className="mt-4 flex items-center gap-2 text-xs text-smoke">
                  <Ruler className="h-3.5 w-3.5 shrink-0 text-gold/70" strokeWidth={1.5} aria-hidden />
                  Em dúvida entre dois tamanhos? O Titi orienta no atendimento.
                </p>
              </fieldset>
            ) : (
              <div className="mt-9 flex items-start gap-3 rounded-2xl border border-line-gold bg-gold/[0.04] p-4">
                <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                <p className="text-sm leading-relaxed text-parchment">Sob medida — informe suas medidas no atendimento</p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé fixo ----------------------------------------------------- */}
        <div className="sticky bottom-0 z-20 mt-auto border-t border-line-gold bg-surface/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:px-8 sm:pb-6 sm:pt-5">
          <div className="flex items-stretch gap-3">
            <div className="flex shrink-0 items-stretch rounded-full border border-line bg-ivory/[0.02] p-0.5" role="group" aria-label="Quantidade">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuir quantidade"
                className="grid w-10 place-items-center rounded-full text-mist transition-colors hover:bg-ivory/[0.06] hover:text-gold-light disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </button>
              <output aria-live="polite" className="grid w-7 place-items-center text-sm tabular-nums text-ivory">
                {quantity}
              </output>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                disabled={quantity >= MAX_QUANTITY}
                aria-label="Aumentar quantidade"
                className="grid w-10 place-items-center rounded-full text-mist transition-colors hover:bg-ivory/[0.06] hover:text-gold-light disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
            <Button variant="gold" onClick={handleAdd} className="flex-1 px-4">
              <ShoppingBag className="hidden h-4 w-4 sm:block" strokeWidth={1.5} aria-hidden />
              Adicionar à sacola
            </Button>
          </div>
          <Button variant="ghost" size="sm" href={whatsappLink(askText)} external className="mt-2.5 w-full">
            <WhatsAppIcon className="h-3.5 w-3.5 text-gold" />
            Perguntar ao Titi
          </Button>
        </div>
      </div>
    </Modal>
  );
}
