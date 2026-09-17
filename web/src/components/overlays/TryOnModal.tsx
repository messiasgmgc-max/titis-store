'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CircleAlert,
  Download,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Controls';
import { ColorDot, Swatch } from '@/components/ui/Swatch';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useCart, type CartInput } from '@/providers/CartProvider';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';
import { useSession } from '@/providers/SessionProvider';
import { ConsultingLock } from '@/components/consulting/ConsultingLock';
import { isConsultingLockError, lockReason, lockToastMessage } from '@/components/consulting/shared';
import { findProduct, matchProductForPiece, useCatalog } from '@/lib/catalog';
import { ApiRequestError, requestTryOn } from '@/lib/api';
import { fileToDataUrl } from '@/lib/image';
import { cn, formatBRL, whatsappLink } from '@/lib/format';
import { SLOT_LABELS } from '@/lib/stylist/knowledge';
import { PIECE_SLOTS, type Look, type LookPiece, type Product } from '@/lib/types';

type Phase = 'idle' | 'generating' | 'result' | 'fallback' | 'error';
interface PieceMatch {
  piece: LookPiece;
  product: Product | undefined;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const ACCEPT = 'image/jpeg,image/png,image/webp';
const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.45, ease: EASE },
};
const WEAVE =
  'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, #000 0 1px, transparent 1px 3px)';

const PHRASES = [
  'Tirando as medidas',
  'Escolhendo o tecido',
  'Ajustando o caimento dos ombros',
  'Alinhando a paleta ao seu tom de pele',
  'Passando o vinco da calça',
  'Conferindo os últimos detalhes',
];

function PieceVisual({ piece, product, wide }: { piece: LookPiece; product?: Product; wide?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = product?.image_url;

  return (
    <span className={cn('relative block overflow-hidden rounded-xl bg-coal', wide ? 'aspect-[16/10]' : 'aspect-[4/5]')}>
      {src && !failed ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="img-editorial h-full w-full object-cover"
          />
        </>
      ) : (
        <span className="pinked absolute inset-0" style={{ backgroundColor: piece.hex }}>
          <span className="absolute inset-0 opacity-[0.16] mix-blend-overlay" style={{ backgroundImage: WEAVE }} />
          <span className="absolute inset-x-0 top-0 h-px bg-ivory/25" />
        </span>
      )}
    </span>
  );
}

/** Prancha editorial com as peças do look (quando o provador com foto não está disponível). */
function CompositionBoard({ pieces }: { pieces: PieceMatch[] }) {
  const oddCount = pieces.length % 2 === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="rounded-3xl border border-line-gold bg-surface-2 p-5 sm:p-6"
    >
      <p className="text-sm leading-relaxed text-parchment">
        O provador com foto estará disponível em breve. Veja a composição do seu look:
      </p>
      <div className="stitch my-5" aria-hidden />
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Composição das peças</p>
      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
        {pieces.map(({ piece, product }, i) => {
          const wide = oddCount && i === 0;
          return (
            <li key={`${piece.slot}-${i}`} className={cn(wide && 'col-span-2')}>
              <div className="relative">
                <PieceVisual piece={piece} product={product} wide={wide} />
                <span className="absolute left-2 top-2 rounded-full bg-obsidian/80 px-2.5 py-1 font-caps text-[0.55rem] tracking-[0.25em] text-gold-light backdrop-blur-sm">
                  {ROMAN[i] ?? i + 1}
                </span>
              </div>
              <p className="mt-2.5 text-[0.58rem] font-medium uppercase tracking-[0.2em] text-smoke">{SLOT_LABELS[piece.slot]}</p>
              <p className="mt-1 text-[1.05rem] font-bold leading-tight text-ivory">{piece.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-mist">
                <ColorDot hex={piece.hex} size={9} />
                {piece.color}
              </p>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function RememberCheckbox({ id, checked, onChange }: { id: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <Checkbox id={id} checked={checked} onChange={onChange} align="center" label="Guardar a foto neste aparelho" />;
}

type LockReason = 'unauthorized' | 'payment_required';

function LockedTryOn({ reason, onClose }: { reason: LockReason; onClose: () => void }) {
  return (
    <Modal onClose={onClose} title="Provador virtual" size="md">
      <ConsultingLock
        title={reason === 'unauthorized' ? 'Entre para usar o provador virtual' : 'O provador virtual faz parte da consultoria'}
        description="Com um plano ativo, você vê o look com o seu rosto antes de levar as peças."
        onClose={onClose}
      />
    </Modal>
  );
}

/** Provador virtual: exclusivo para quem tem a consultoria ativa. */
export function TryOnModal({ look, onClose }: { look: Look; onClose: () => void }) {
  const { hasAccess, loading, user } = useSession();

  if (loading) {
    return (
      <Modal onClose={onClose} title="Provador virtual" size="sm">
        <div role="status" className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-mist">
          <LoaderCircle className="h-4 w-4 animate-spin text-gold" aria-hidden />
          Conferindo seu acesso…
        </div>
      </Modal>
    );
  }
  if (!hasAccess) return <LockedTryOn reason={user ? 'payment_required' : 'unauthorized'} onClose={onClose} />;
  return <TryOnStudio look={look} onClose={onClose} />;
}

function TryOnStudio({ look, onClose }: { look: Look; onClose: () => void }) {
  const { diagnosis, faceImage, setFaceImage } = useDiagnosis();
  const { addMany } = useCart();
  const { toast, openOverlay } = useUI();
  const { refreshProfile } = useSession();
  const [locked, setLocked] = useState<LockReason | null>(null);
  const { products, loading: catalogLoading } = useCatalog();
  const uid = useId();

  const [face, setFace] = useState<string | null>(null);
  const [remember, setRemember] = useState(() => Boolean(faceImage));
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [added, setAdded] = useState(false);
  const requestRef = useRef(0);

  // Respostas que chegarem depois de fechar o provador são descartadas.
  useEffect(() => {
    const token = requestRef;
    return () => {
      token.current += 1;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'generating') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  const pieces = useMemo<PieceMatch[]>(
    () =>
      [...look.pieces]
        .sort((a, b) => PIECE_SLOTS.indexOf(a.slot) - PIECE_SLOTS.indexOf(b.slot))
        .map((piece) => ({ piece, product: matchProductForPiece(products, piece) })),
    [look.pieces, products],
  );
  const fromCatalog = pieces.filter((m): m is PieceMatch & { product: Product } => Boolean(m.product));
  const expectsCatalog = look.pieces.some((p) => Boolean(p.productId));

  const elapsed = phase === 'generating' ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const progress = Math.min(0.94, 1 - Math.exp(-elapsed / 24));
  const phrase = PHRASES[Math.floor(elapsed / 5) % PHRASES.length];
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  async function generate() {
    if (!face || phase === 'generating') return;
    requestRef.current += 1;
    const requestId = requestRef.current;
    const start = Date.now();
    setStartedAt(start);
    setNow(start);
    setError(null);
    setResult(null);
    setPhase('generating');

    try {
      const response = await requestTryOn({
        face,
        skinTone: diagnosis?.skinTone ?? 'morena',
        look: { title: look.title, pieces: look.pieces, palette: look.palette },
      });
      if (requestId !== requestRef.current) return;
      if (!response.image) throw new ApiRequestError('A prova voltou sem imagem. Tente novamente.', 'upstream', 502);
      setResult(response.image);
      setPhase('result');
    } catch (err) {
      if (requestId !== requestRef.current) return;
      if (isConsultingLockError(err)) {
        const reason = lockReason(err);
        setLocked(reason);
        setPhase('idle');
        toast(lockToastMessage(reason), 'info');
        void refreshProfile();
        return;
      }
      if (err instanceof ApiRequestError && err.code === 'not_configured') {
        setPhase('fallback');
        return;
      }
      setError(err instanceof Error && err.message ? err.message : 'Não foi possível gerar a prova agora.');
      setPhase('error');
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file || reading) return;
    setUploadError(null);
    setReading(true);
    try {
      const dataUrl = await fileToDataUrl(file, 768);
      setFace(dataUrl);
      setResult(null);
      setError(null);
      setPhase('idle');
      if (remember) setFaceImage(dataUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Não foi possível ler esta imagem.');
    } finally {
      setReading(false);
    }
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    void handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  }

  function applyStoredFace() {
    if (!faceImage) return;
    setFace(faceImage);
    setRemember(true);
    setUploadError(null);
    setPhase('idle');
  }

  function toggleRemember(checked: boolean) {
    setRemember(checked);
    if (!checked) setFaceImage(null);
    else if (face) setFaceImage(face);
  }

  function takePieces() {
    if (added) {
      openOverlay({ type: 'bag' });
      return;
    }
    if (fromCatalog.length === 0) return;
    // Mesma regra do LookCard: uma linha por produto do acervo.
    const unique = new Map<string, CartInput>();
    fromCatalog.forEach(({ piece, product }) => {
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
    const inputs = Array.from(unique.values());
    addMany(inputs);
    setAdded(true);
    toast(
      inputs.length === 1 ? '1 peça adicionada à sacola.' : `${inputs.length} peças adicionadas à sacola.`,
      'success',
    );
  }

  if (locked) return <LockedTryOn reason={locked} onClose={onClose} />;

  const orderText = [
    `Olá, Titi! Quero pedir este look da minha consultoria na Titi's Store: *${look.title}*`,
    '',
    ...pieces.map(({ piece }) => `- ${SLOT_LABELS[piece.slot]}: ${piece.name} — ${piece.color}${piece.fabric ? ` (${piece.fabric})` : ''}`),
    ...(diagnosis ? ['', `Minha estação: ${diagnosis.season}`] : []),
  ].join('\n');

  return (
    <Modal onClose={onClose} title="Provador virtual" showTitle size="xl">
      <p className="mt-2 px-6 pr-14 text-sm text-mist sm:px-8">Veja o look com o seu rosto antes de levar as peças.</p>

      <div className="grid gap-8 px-6 pb-8 pt-6 sm:px-8 sm:pb-10 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-12">
        {/* ------------------------------------------------------------ Estúdio */}
        <div className="min-w-0">
          {phase === 'fallback' ? (
            <CompositionBoard pieces={pieces} />
          ) : (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-coal">
              <AnimatePresence mode="wait" initial={false}>
                {!face ? (
                  <motion.div key="upload" {...FADE} className="absolute inset-0 p-3">
                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={onDrop}
                      className={cn(
                        'group relative flex h-full cursor-pointer flex-col items-center justify-center gap-5 rounded-[20px] border border-dashed px-8 text-center transition-colors duration-500 focus-within:border-gold',
                        dragging ? 'border-gold bg-gold/[0.06]' : 'border-line-gold hover:border-gold/70 hover:bg-gold/[0.03]',
                      )}
                    >
                      <input
                        type="file"
                        accept={ACCEPT}
                        className="sr-only"
                        onChange={onFileInput}
                        disabled={reading}
                        aria-label="Enviar uma foto do rosto"
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-2.5 rounded-[14px] border border-gold/20 transition-colors duration-500 group-hover:border-gold/40"
                      />
                      <span className="grid h-16 w-16 place-items-center rounded-full border border-line-gold bg-gold/[0.04] text-gold transition-transform duration-700 ease-[var(--ease-couture)] group-hover:scale-105">
                        {reading ? (
                          <LoaderCircle className="h-6 w-6 animate-spin" aria-hidden />
                        ) : (
                          <ImagePlus className="h-6 w-6" strokeWidth={1.25} aria-hidden />
                        )}
                      </span>
                      <span className="text-[1.7rem] font-extrabold leading-tight tracking-[-0.03em] text-ivory">
                        Envie uma foto do <span className="text-foil">rosto</span>
                      </span>
                      <span className="max-w-[17rem] text-sm leading-relaxed text-mist">
                        De frente, com luz natural e sem óculos escuros. JPG, PNG ou WEBP.
                      </span>
                      <span aria-hidden className="btn btn-outline btn-sm pointer-events-none mt-1">
                        {reading ? 'Preparando…' : 'Escolher foto'}
                      </span>
                    </label>
                  </motion.div>
                ) : phase === 'generating' ? (
                  <motion.div key="generating" {...FADE} className="absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={face} alt="" className="h-full w-full scale-105 object-cover opacity-45 blur-[2px] grayscale-[40%]" />
                    <div aria-hidden className="absolute inset-0 bg-linear-to-t from-obsidian via-obsidian/60 to-obsidian/20" />
                    <span
                      aria-hidden
                      className="absolute inset-x-8 h-px animate-scan bg-linear-to-r from-transparent via-gold-light to-transparent shadow-[0_0_18px_rgba(245,215,127,0.65)]"
                    />
                    <div role="status" className="absolute inset-x-0 bottom-0 z-[3] p-6 sm:p-7">
                      <span className="sr-only">Gerando sua prova. Isso pode levar até um minuto.</span>
                      <div aria-hidden>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Na prova</span>
                          <span className="font-caps text-xs tabular-nums tracking-[0.2em] text-gold-light">{clock}</span>
                        </div>
                        <div className="mt-3 h-9 overflow-hidden">
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.p
                              key={phrase}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -12 }}
                              transition={{ duration: 0.5, ease: EASE }}
                              className="text-[1.5rem] font-bold leading-9 tracking-[-0.02em] text-ivory"
                            >
                              {phrase}…
                            </motion.p>
                          </AnimatePresence>
                        </div>
                        <div className="relative mt-5">
                          <div className="tape rounded-full opacity-25" />
                          <div
                            className="absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width] duration-1000 ease-linear"
                            style={{ width: `${Math.round(progress * 100)}%` }}
                          >
                            <div className="tape w-[2000px]" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,.45))' }} />
                          </div>
                        </div>
                        <p className="mt-4 text-xs text-smoke">Leva de 20 a 60 segundos. Mantenha esta janela aberta.</p>
                      </div>
                    </div>
                  </motion.div>
                ) : phase === 'result' && result ? (
                  <motion.div key="result" {...FADE} className="absolute inset-0 bg-obsidian">
                    <motion.img
                      src={result}
                      alt={`Prova virtual do look ${look.title}`}
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 1.1, ease: EASE }}
                      className="h-full w-full object-contain"
                    />
                    <span aria-hidden className="frame pointer-events-none absolute inset-0" />
                  </motion.div>
                ) : (
                  <motion.div key="face" {...FADE} className="frame absolute inset-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={face} alt="Sua foto para o provador" className="h-full w-full object-cover" />
                    <div aria-hidden className="absolute inset-0 bg-linear-to-t from-obsidian/90 via-obsidian/10 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 z-[3] flex items-end justify-between gap-4 p-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Sua foto</p>
                        <p className="mt-1.5 text-xs text-mist">Pronta para a prova</p>
                      </div>
                      <label className="link-luxe cursor-pointer text-parchment focus-within:text-gold-light">
                        <input type="file" accept={ACCEPT} className="sr-only" onChange={onFileInput} disabled={reading} />
                        {reading ? 'Preparando…' : 'Trocar foto'}
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-5 space-y-4">
            {phase !== 'fallback' && !face && faceImage && (
              <Button variant="ghost" size="sm" className="w-full" onClick={applyStoredFace}>
                <ScanFace className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Usar a foto da leitura
              </Button>
            )}

            {uploadError && (
              <p role="alert" className="flex items-start gap-2 text-sm text-danger">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {uploadError}
              </p>
            )}

            {face && phase === 'idle' && (
              <div>
                <Button className="w-full" onClick={generate} disabled={reading}>
                  Gerar prova
                </Button>
                <p className="mt-2.5 text-center text-xs text-smoke">A prova leva de 20 a 60 segundos para ficar pronta.</p>
              </div>
            )}

            {phase === 'error' && (
              <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/[0.05] p-4">
                <p className="flex items-start gap-2.5 text-sm leading-snug text-danger">
                  <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  {error}
                </p>
                <Button size="sm" variant="outline" className="mt-4" onClick={generate}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Tentar novamente
                </Button>
              </div>
            )}

            {phase === 'result' && result && (
              <div className="grid gap-3 sm:grid-cols-2">
                <a href={result} download="titis-prova.jpg" className="btn btn-gold btn-sm">
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Baixar imagem
                </a>
                <Button variant="ghost" size="sm" onClick={generate}>
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  Gerar novamente
                </Button>
              </div>
            )}

            {phase !== 'fallback' && (
              <>
                <RememberCheckbox id={`${uid}-remember`} checked={remember} onChange={toggleRemember} />
                <p className="flex items-start gap-2.5 text-xs leading-relaxed text-smoke">
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-gold/70" strokeWidth={1.5} aria-hidden />
                  Sua foto é usada apenas para gerar esta prova, processada por inteligência artificial. Ela só fica
                  guardada neste aparelho se você escolher.
                </p>
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------ Look */}
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-3">
            <span className="stitch w-8" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Look da consultoria</span>
          </div>
          <h3 className="mt-4 font-display text-[clamp(2rem,3.2vw,2.75rem)] leading-[1.04] text-ivory">{look.title}</h3>
          {look.tagline && (
            <p className="mt-2 text-lg font-semibold leading-snug text-gold-light/90">{look.tagline}</p>
          )}

          {look.palette.length > 0 && (
            <section className="mt-7" aria-labelledby={`${uid}-palette`}>
              <h4 id={`${uid}-palette`} className="kicker">
                Paleta
              </h4>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {look.palette.map((color, i) => (
                  <Swatch key={`${color.hex}-${i}`} name={color.name} hex={color.hex} size="sm" showLabel={false} />
                ))}
              </div>
            </section>
          )}

          <section className="mt-7" aria-labelledby={`${uid}-pieces`}>
            <h4 id={`${uid}-pieces`} className="kicker">
              Peças
            </h4>
            <ol className="mt-3 divide-y divide-line rounded-2xl border border-line bg-ivory/[0.015] px-4">
              {pieces.map(({ piece, product }, i) => (
                <li key={`${piece.slot}-${i}`} className="flex items-center gap-3.5 py-3.5">
                  <span className="numeral w-7 shrink-0 text-[0.68rem]">{ROMAN[i] ?? i + 1}</span>
                  <ColorDot hex={piece.hex} size={14} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ivory">{piece.name}</p>
                    <p className="truncate text-xs text-mist">
                      {piece.color}
                      {piece.fabric ? ` · ${piece.fabric}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[0.58rem] font-medium uppercase tracking-[0.2em] text-smoke">{SLOT_LABELS[piece.slot]}</p>
                    {product && <p className="mt-1 text-xs text-gold-light">{formatBRL(product.price_cents)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row md:flex-col xl:flex-row">
            {(fromCatalog.length > 0 || (catalogLoading && expectsCatalog)) && (
              <Button className="flex-1" onClick={takePieces} loading={catalogLoading && fromCatalog.length === 0}>
                {!(catalogLoading && fromCatalog.length === 0) && (
                  <ShoppingBag className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                )}
                {added ? 'Ver sacola' : 'Levar peças do acervo'}
              </Button>
            )}
            <Button
              className="flex-1"
              variant={fromCatalog.length > 0 || (catalogLoading && expectsCatalog) ? 'outline' : 'gold'}
              href={whatsappLink(orderText)}
              external
            >
              <WhatsAppIcon className="h-4 w-4" />
              Pedir este look
            </Button>
          </div>

          {!catalogLoading && fromCatalog.length === 0 && (
            <p className="mt-3 text-xs leading-relaxed text-smoke">
              Estas peças não estão no acervo on-line. Peça pelo WhatsApp e o Titi orienta a composição.
            </p>
          )}
          {!catalogLoading && fromCatalog.length > 0 && fromCatalog.length < pieces.length && (
            <p className="mt-3 text-xs leading-relaxed text-smoke">
              {fromCatalog.length} de {pieces.length} peças estão no acervo on-line; as demais são orientadas no atendimento.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
