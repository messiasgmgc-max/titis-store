'use client';

import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ColorDot, Swatch } from '@/components/ui/Swatch';
import { supabase } from '@/lib/supabaseClient';
import { findProduct, useCatalog } from '@/lib/catalog';
import { cn, formatDateBR } from '@/lib/format';
import { SLOT_LABELS, climateTitle, occasionTitle, skinToneName, timeTitle } from '@/lib/stylist/knowledge';
import type { ConsultationRow, Look, Product } from '@/lib/types';
import { useCart, type CartInput } from '@/providers/CartProvider';
import { useUI } from '@/providers/UIProvider';
import { useConsultingLink } from './PlanStatusCard';
import { SkeletonList, StatePanel, TabIntro, Tag, toRoman } from './shared';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; rows: ConsultationRow[] };

const EASE = [0.22, 1, 0.36, 1] as const;

function normalizeLooks(value: unknown): Look[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((l): l is Look => Boolean(l) && typeof l === 'object' && typeof (l as Look).title === 'string')
    .map((l, i) => ({
      ...l,
      id: l.id || `look-${i}`,
      palette: Array.isArray(l.palette) ? l.palette : [],
      pieces: Array.isArray(l.pieces) ? l.pieces : [],
    }));
}

/** Peças do look que existem no acervo, prontas para a sacola (sem duplicar produto). */
function catalogPieces(look: Look, products: Product[]): CartInput[] {
  const seen = new Set<string>();
  const out: CartInput[] = [];
  for (const piece of look.pieces) {
    const product = findProduct(products, piece.productId);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    out.push({
      productId: product.id,
      name: product.name,
      detail: `Peça do look ${look.title}`,
      color: product.color_name ?? piece.color,
      hex: product.hex_color ?? piece.hex,
      image: product.image_url,
      size: null,
      priceCents: product.price_cents,
      lookTitle: look.title,
    });
  }
  return out;
}

function LookDetail({
  look,
  index,
  products,
  catalogLoading,
}: {
  look: Look;
  index: number;
  products: Product[];
  catalogLoading: boolean;
}) {
  const { openOverlay, toast } = useUI();
  const { addMany } = useCart();
  const available = catalogLoading ? [] : catalogPieces(look, products);

  const takePieces = () => {
    if (available.length === 0) return;
    addMany(available);
    toast(
      available.length === 1 ? '1 peça adicionada à sacola.' : `${available.length} peças adicionadas à sacola.`,
      'success',
    );
  };

  return (
    <article className="flex h-full flex-col border border-line bg-coal/60 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="numeral text-xs">{toRoman(index + 1)}</span>
        <span className="stitch w-6" aria-hidden />
        {look.formality > 0 && <span className="kicker text-[0.58rem]">Formalidade {Math.round(look.formality)}/5</span>}
      </div>
      <h4 className="mt-3 font-display text-xl font-extrabold leading-[1.15] tracking-[-0.02em] text-ivory">{look.title}</h4>
      {look.tagline && <p className="mt-1.5 text-[0.95rem] font-medium leading-snug text-parchment">{look.tagline}</p>}

      {look.palette.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Paleta do look">
          {look.palette.map((c) => (
            <li key={`${c.name}-${c.hex}`}>
              <Swatch name={c.name} hex={c.hex} size="sm" showLabel={false} />
              <span className="sr-only">{c.name}</span>
            </li>
          ))}
        </ul>
      )}

      {look.pieces.length > 0 && (
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {look.pieces.map((piece, i) => (
            <li key={`${piece.slot}-${i}`} className="flex items-start gap-3 py-2.5">
              <ColorDot hex={piece.hex} size={11} className="mt-1" />
              <span className="min-w-0 text-sm leading-snug">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-smoke">
                  {SLOT_LABELS[piece.slot] ?? piece.slot}
                </span>
                <span className="text-parchment">{piece.name}</span>
                {piece.color && <span className="text-mist"> · {piece.color}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-6">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => openOverlay({ type: 'tryon', look })}>
            Provar
          </Button>
          <Button size="sm" variant="ghost" onClick={takePieces} loading={catalogLoading} disabled={available.length === 0}>
            {!catalogLoading && <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />}
            Levar peças do acervo
          </Button>
        </div>
        {!catalogLoading && (
          <p className="mt-3 text-xs text-smoke">
            {available.length === 0
              ? 'As peças deste look não estão no acervo no momento.'
              : `${available.length} de ${look.pieces.length} peças disponíveis no acervo.`}
          </p>
        )}
      </div>
    </article>
  );
}

function ConsultationCard({
  row,
  number,
  userId,
  products,
  catalogLoading,
  onDeleted,
}: {
  row: ConsultationRow;
  number: number;
  userId: string;
  products: Product[];
  catalogLoading: boolean;
  onDeleted: (id: string) => void;
}) {
  const { toast } = useUI();
  const bodyId = useId();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const looks = row.results;
  const title = row.title?.trim() || `Consultoria · ${occasionTitle(row.occasion)}`;
  const venue = row.occasion === 'outro' && row.custom_venue ? row.custom_venue : occasionTitle(row.occasion);
  const strip = Array.from(new Set(looks.flatMap((l) => l.palette.map((c) => c.hex)))).slice(0, 12);

  const remove = async () => {
    setDeleting(true);
    const { data, error } = await supabase
      .from('consultations')
      .delete()
      .eq('id', row.id)
      .eq('user_id', userId)
      .select('id');
    if (error || !data || data.length === 0) {
      setDeleting(false);
      setConfirming(false);
      toast('Não foi possível excluir agora.', 'error');
      return;
    }
    toast('Consultoria excluída.', 'success');
    onDeleted(row.id);
  };

  return (
    <article className={cn('panel relative transition-colors duration-500', open ? 'border-line-gold' : 'hover:border-line-gold')}>
      {strip.length > 0 && (
        <div className="flex h-1 w-full overflow-hidden" aria-hidden>
          {strip.map((hex) => (
            <span key={hex} className="h-full flex-1" style={{ backgroundColor: hex }} />
          ))}
        </div>
      )}

      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-[11px] font-semibold uppercase tabular-nums tracking-[0.16em] text-gold">
            Nº {String(number).padStart(2, '0')}
          </span>
          <time dateTime={row.created_at} className="text-xs text-smoke">
            {formatDateBR(row.created_at)}
          </time>
        </div>
        <h3 className="mt-3 font-display text-[clamp(1.35rem,2.5vw,1.8rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-ivory">
          {title}
        </h3>

        <div className="mt-4 flex flex-wrap gap-2">
          {row.seasonal_palette && <Tag className="border-line-gold text-gold-light">{row.seasonal_palette}</Tag>}
          <Tag>Pele {skinToneName(row.skin_tone)}</Tag>
          <Tag>{venue}</Tag>
          <Tag>{timeTitle(row.time_of_day)}</Tag>
          <Tag>Clima {climateTitle(row.climate).toLowerCase()}</Tag>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={bodyId}
            disabled={looks.length === 0}
            className="link-luxe text-gold-light disabled:text-smoke"
          >
            {looks.length === 0
              ? 'Sem looks registrados'
              : open
                ? 'Recolher'
                : `Ver ${looks.length} ${looks.length === 1 ? 'look' : 'looks'}`}
            {looks.length > 0 && (
              <ChevronDown
                className={cn('h-3.5 w-3.5 transition-transform duration-500', open && 'rotate-180')}
                strokeWidth={1.5}
                aria-hidden
              />
            )}
          </button>

          <div className="min-h-9 flex items-center">
            {confirming ? (
              <span className="inline-flex items-center gap-4 text-[12px] font-semibold uppercase tracking-[0.14em]" role="group" aria-label="Confirmar exclusão">
                <span className="text-parchment">Excluir?</span>
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting}
                  className="text-danger underline-offset-4 hover:underline disabled:opacity-50"
                >
                  {deleting ? 'Excluindo…' : 'Sim'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                  className="text-mist underline-offset-4 hover:text-ivory hover:underline disabled:opacity-50"
                  autoFocus
                >
                  Não
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-smoke transition-colors hover:text-danger"
                aria-label={`Excluir consultoria ${title}`}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                Excluir
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="looks"
            id={bodyId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-6 pb-8 pt-6 sm:px-8">
              {row.custom_venue && row.occasion !== 'outro' && (
                <p className="mb-5 text-sm text-mist">
                  Local descrito: <span className="text-parchment">{row.custom_venue}</span>
                </p>
              )}
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {looks.map((look, i) => (
                  <li key={look.id}>
                    <LookDetail look={look} index={i} products={products} catalogLoading={catalogLoading} />
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

export function SavedLooksTab({ userId }: { userId: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { products, loading: catalogLoading } = useCatalog();
  const consulting = useConsultingLink();

  useEffect(() => {
    let active = true;
    supabase
      .from('consultations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({ status: 'error' });
          return;
        }
        const rows = ((data ?? []) as ConsultationRow[]).map((r) => ({ ...r, results: normalizeLooks(r.results) }));
        setState({ status: 'ready', rows });
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  const handleDeleted = (id: string) =>
    setState((s) => (s.status === 'ready' ? { status: 'ready', rows: s.rows.filter((r) => r.id !== id) } : s));

  const total = state.status === 'ready' ? state.rows.length : 0;

  return (
    <section aria-label="Looks salvos" className="space-y-10">
      <TabIntro
        numeral="II"
        eyebrow="Looks salvos"
        title={
          <>
            Seu <span className="text-gold-light">guarda-roupa</span> de ocasiões
          </>
        }
        lead="Cada consultoria salva guarda o contexto e os looks montados para ele. Prove, leve as peças do acervo ou refaça quando quiser."
        aside={
          <Button href={consulting.href} size="sm">
            Nova consultoria
          </Button>
        }
      />

      {state.status === 'loading' && <SkeletonList label="Carregando looks salvos" />}

      {state.status === 'error' && (
        <StatePanel
          tone="error"
          title="Não foi possível carregar agora."
          actions={
            <Button variant="ghost" size="sm" onClick={retry}>
              Tentar novamente
            </Button>
          }
        >
          Verifique sua conexão e tente de novo em instantes.
        </StatePanel>
      )}

      {state.status === 'ready' && total === 0 && (
        <StatePanel
          title={
            <>
              Nenhum look <span className="text-foil">salvo</span> ainda
            </>
          }
          actions={
            <Button href={consulting.href}>{consulting.hasAccess ? 'Abrir a consultoria' : 'Ver planos'}</Button>
          }
        >
          Monte looks para a sua próxima ocasião na consultoria e salve para encontrá-los aqui.
        </StatePanel>
      )}

      {state.status === 'ready' && total > 0 && (
        <ul className="space-y-5">
          <AnimatePresence initial={false}>
            {state.rows.map((row, i) => (
              <motion.li
                key={row.id}
                layout
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="overflow-hidden"
              >
                <ConsultationCard
                  row={row}
                  number={total - i}
                  userId={userId}
                  products={products}
                  catalogLoading={catalogLoading}
                  onDeleted={handleDeleted}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
