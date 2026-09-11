'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Camera, Check, CircleAlert, ImageUp, LoaderCircle, RotateCcw, ScanFace, ShieldCheck } from 'lucide-react';
import type { ColorSwatch, Diagnosis } from '@/lib/types';
import { CONTRASTS, SUBTONES, getSeason, isContrast, isSkinToneId, isSubtone, skinToneName } from '@/lib/stylist/knowledge';
import { ApiRequestError, requestDiagnosis } from '@/lib/api';
import { analyzeFaceImage } from '@/lib/colorimetry';
import { fileToDataUrl, loadImage } from '@/lib/image';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';
import { useSession } from '@/providers/SessionProvider';
import { ConsultingLock } from '@/components/consulting/ConsultingLock';
import { isConsultingLockError, lockReason, lockToastMessage } from '@/components/consulting/shared';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Swatch } from '@/components/ui/Swatch';
import { SeasonName } from '@/components/atelier/StepTone';
import { cn } from '@/lib/format';

type Phase = 'intro' | 'camera' | 'analyzing' | 'result';

const EASE = [0.22, 1, 0.36, 1] as const;
const MIN_ANALYSIS_MS = 1800;
const ROMAN = ['I', 'II', 'III'];
const ROMAN_LOWER = ['i', 'ii', 'iii', 'iv', 'v'];
const STAGES = ['Foto', 'Leitura', 'Cartela'];

const TIPS = [
  'Luz natural, de frente para uma janela',
  'Rosto de frente, sem inclinar a cabeça',
  'Sem filtros ou retoques',
  'Sem óculos escuros',
  'Cabelo e barba visíveis na foto',
];

const PHRASES = ['Medindo a luz da pele…', 'Lendo o subtom…', 'Comparando cabelo, olhos e pele…', 'Encontrando a sua estação…'];

const PRIVACY =
  'Sua foto é usada apenas para esta leitura e não é armazenada em nossos servidores. A análise detalhada é processada por inteligência artificial.';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function isSwatch(s: unknown): s is ColorSwatch {
  return !!s && typeof s === 'object' && typeof (s as ColorSwatch).name === 'string' && typeof (s as ColorSwatch).hex === 'string';
}

/** Valida e completa o diagnóstico devolvido pelo servidor. */
function normalizeRemote(raw: unknown): Diagnosis | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Partial<Diagnosis>;
  if (!isSkinToneId(d.skinTone) || !isSubtone(d.subtone)) return null;
  const season = getSeason(d.skinTone, d.subtone);
  const palette = Array.isArray(d.palette) ? d.palette.filter(isSwatch) : [];
  const avoid = Array.isArray(d.avoid) ? d.avoid.filter(isSwatch) : [];
  return {
    skinTone: d.skinTone,
    subtone: d.subtone,
    contrast: isContrast(d.contrast) ? d.contrast : 'medio',
    season: typeof d.season === 'string' && d.season.trim() ? d.season.trim() : season.name,
    palette: palette.length > 0 ? palette : [...season.palette, ...season.neutrals],
    avoid: avoid.length > 0 ? avoid : season.avoid,
    notes: typeof d.notes === 'string' && d.notes.trim() ? d.notes.trim() : season.note,
    recommendations: Array.isArray(d.recommendations) ? d.recommendations.filter((r): r is string => typeof r === 'string') : [],
    source: d.source === 'local' ? 'local' : 'ai',
    confidence: typeof d.confidence === 'number' ? d.confidence : undefined,
    createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
  };
}

/** Versão menor da foto para guardar no navegador (provador virtual). */
async function compressForDevice(dataUrl: string, maxSize = 768, quality = 0.84): Promise<string> {
  const img = await loadImage(dataUrl);
  const ratio = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

function cameraMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'O acesso à câmera foi negado. Libere a permissão nas configurações do navegador ou envie uma foto.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Nenhuma câmera foi encontrada neste aparelho. Envie uma foto da galeria.';
    case 'NotReadableError':
    case 'AbortError':
      return 'A câmera está em uso por outro aplicativo. Feche-o e tente de novo, ou envie uma foto.';
    default:
      return 'Não foi possível abrir a câmera. Envie uma foto da galeria.';
  }
}

type LockReason = 'unauthorized' | 'payment_required';

const LOCK_COPY: Record<LockReason, { title: string; description: string }> = {
  unauthorized: {
    title: 'Entre para fazer a leitura por foto',
    description: 'A leitura por foto faz parte da consultoria e fica guardada na sua conta.',
  },
  payment_required: {
    title: 'A leitura por foto faz parte da consultoria',
    description: 'Com um plano ativo, uma selfie revela pele, subtom e contraste e monta a sua cartela completa.',
  },
};

function LockedScanner({ reason, onClose }: { reason: LockReason; onClose: () => void }) {
  return (
    <Modal title="Leitura de colorimetria" size="md" onClose={onClose}>
      <ConsultingLock title={LOCK_COPY[reason].title} description={LOCK_COPY[reason].description} onClose={onClose} />
    </Modal>
  );
}

/** Leitura por foto: exclusiva para quem tem a consultoria ativa (sem análise local para quem não tem). */
export function ScannerModal({ onClose }: { onClose: () => void }) {
  const { hasAccess, loading, user } = useSession();

  if (loading) {
    return (
      <Modal title="Leitura de colorimetria" size="sm" onClose={onClose}>
        <div role="status" className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-mist">
          <LoaderCircle className="h-4 w-4 animate-spin text-gold" aria-hidden />
          Conferindo seu acesso…
        </div>
      </Modal>
    );
  }
  if (!hasAccess) return <LockedScanner reason={user ? 'payment_required' : 'unauthorized'} onClose={onClose} />;
  return <ScannerStudio onClose={onClose} />;
}

function ScannerStudio({ onClose }: { onClose: () => void }) {
  const { setDiagnosis, setFaceImage } = useDiagnosis();
  const { toast } = useUI();
  const { refreshProfile } = useSession();
  const [locked, setLocked] = useState<LockReason | null>(null);

  const [phase, setPhase] = useState<Phase>('intro');
  const [photo, setPhoto] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keepPhoto, setKeepPhoto] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const runRef = useRef(0);
  const aliveRef = useRef(true);
  const maskId = `oval-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    aliveRef.current = true;
    const runs = runRef;
    return () => {
      aliveRef.current = false;
      runs.current += 1;
    };
  }, []);

  // Liga a câmera ao <video> e desliga as trilhas ao sair (troca de etapa ou fechamento).
  useEffect(() => {
    if (!stream) return;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.play().catch(() => undefined);
    }
    return () => {
      stream.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    if (phase !== 'analyzing') return;
    const timer = window.setInterval(() => setPhraseIndex((i) => (i + 1) % PHRASES.length), 1400);
    return () => window.clearInterval(timer);
  }, [phase]);

  const analyze = async (image: string) => {
    const run = ++runRef.current;
    setPhoto(image);
    setResult(null);
    setError(null);
    setPhraseIndex(0);
    setPhase('analyzing');
    const started = Date.now();

    let reading: Diagnosis | null = null;
    let failure: string | null = null;
    let blocked: LockReason | null = null;
    try {
      const { diagnosis } = await requestDiagnosis(image);
      reading = normalizeRemote(diagnosis);
    } catch (err) {
      if (isConsultingLockError(err)) {
        blocked = lockReason(err);
      } else if (err instanceof ApiRequestError && err.code === 'bad_request') {
        failure = err.message || 'Não encontramos um rosto nítido nesta foto. Tente outra imagem, de frente e com boa luz.';
      }
    }
    // 401/402: sem leitura local — a leitura por foto é exclusiva da consultoria.
    if (blocked) {
      if (!aliveRef.current || run !== runRef.current) return;
      setLocked(blocked);
      setPhase('intro');
      toast(lockToastMessage(blocked), 'info');
      void refreshProfile();
      return;
    }
    if (!reading && !failure) {
      try {
        reading = await analyzeFaceImage(image);
      } catch (err) {
        failure =
          err instanceof Error && err.message
            ? err.message
            : 'Não foi possível ler esta foto. Tente outra imagem com luz natural.';
      }
    }

    const elapsed = Date.now() - started;
    if (elapsed < MIN_ANALYSIS_MS) await wait(MIN_ANALYSIS_MS - elapsed);
    if (!aliveRef.current || run !== runRef.current) return;

    if (reading) {
      setResult(reading);
      setPhase('result');
    } else {
      setError(failure);
      setPhase('intro');
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file, 1024);
      if (aliveRef.current) void analyze(dataUrl);
    } catch (err) {
      if (aliveRef.current) setError(err instanceof Error ? err.message : 'Não foi possível ler esta imagem.');
    }
  };

  const startCamera = async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador não permite usar a câmera nesta página. Envie uma foto da galeria.');
      return;
    }
    const run = ++runRef.current;
    setVideoReady(false);
    setPhase('camera');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      if (!aliveRef.current || run !== runRef.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      setStream(media);
    } catch (err) {
      if (!aliveRef.current || run !== runRef.current) return;
      setPhase('intro');
      setError(cameraMessage(err));
    }
  };

  const cancelCamera = () => {
    runRef.current += 1;
    setStream(null);
    setVideoReady(false);
    setPhase('intro');
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const ratio = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * ratio);
    const height = Math.round(video.videoHeight * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      cancelCamera();
      setError('Não foi possível capturar a imagem neste navegador. Envie uma foto da galeria.');
      return;
    }
    // Mesma orientação da prévia espelhada.
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setStream(null);
    setVideoReady(false);
    void analyze(dataUrl);
  };

  const redo = () => {
    runRef.current += 1;
    setPhoto(null);
    setResult(null);
    setError(null);
    setPhase('intro');
  };

  const apply = async () => {
    if (!result || applying) return;
    setApplying(true);
    let face: string | null = null;
    if (keepPhoto && photo) {
      try {
        face = await compressForDevice(photo);
      } catch {
        face = null;
      }
    }
    setDiagnosis(result);
    setFaceImage(face);
    toast(`Cartela aplicada: ${result.season}.`, 'success');
    onClose();
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      document.getElementById('atelier')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }, 650);
  };

  if (locked) return <LockedScanner reason={locked} onClose={onClose} />;

  const stage = phase === 'analyzing' ? 1 : phase === 'result' ? 2 : 0;
  const subtoneName = result ? (SUBTONES.find((s) => s.id === result.subtone)?.name ?? result.subtone) : '';
  const contrastName = result ? (CONTRASTS.find((c) => c.id === result.contrast)?.name ?? result.contrast) : '';

  return (
    <Modal title="Leitura de colorimetria" size="lg" showTitle onClose={onClose}>
      <div className="px-6 pb-8 pt-3 sm:px-8 sm:pb-10">
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.6rem] uppercase tracking-[0.22em]" aria-label="Etapas da leitura">
          {STAGES.map((label, i) => (
            <li
              key={label}
              aria-current={i === stage ? 'step' : undefined}
              className={cn('flex items-center gap-3 transition-colors', i <= stage ? 'text-gold' : 'text-smoke')}
            >
              <span className="font-caps">{ROMAN[i]}</span>
              <span className={i === stage ? 'text-ivory' : undefined}>{label}</span>
              {i < STAGES.length - 1 && <span className="stitch w-6 sm:w-10" aria-hidden />}
            </li>
          ))}
        </ol>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => void onFile(e)}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {phase === 'intro' && (
              <div>
                <div className="mt-8 grid gap-8 sm:grid-cols-[1fr_11rem] sm:items-center">
                  <div>
                    <p className="text-sm leading-relaxed text-mist">
                      Uma selfie bem iluminada revela a profundidade, o subtom e o contraste do seu rosto. Para uma leitura fiel:
                    </p>
                    <ol className="mt-5 space-y-3">
                      {TIPS.map((tip, i) => (
                        <li key={tip} className="flex items-baseline gap-4 text-sm text-parchment">
                          <span className="numeral w-6 shrink-0 text-[0.65rem]">{ROMAN_LOWER[i]}.</span>
                          {tip}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="relative mx-auto hidden aspect-[3/4] w-44 sm:block" aria-hidden>
                    <svg viewBox="0 0 120 160" className="h-full w-full">
                      <ellipse cx="60" cy="80" rx="48" ry="68" fill="none" className="stroke-gold/70" strokeWidth="1" strokeDasharray="4 5" />
                      <path d="M4 18 V4 H18 M102 4 H116 V18 M116 142 V156 H102 M18 156 H4 V142" fill="none" className="stroke-gold/40" strokeWidth="1" />
                    </svg>
                    <ScanFace className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-gold/60" strokeWidth={1} />
                  </div>
                </div>

                {error && (
                  <div role="alert" className="mt-6 flex items-start gap-3 border border-danger/40 bg-danger/[0.06] px-4 py-3 text-sm text-parchment">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" strokeWidth={1.75} aria-hidden />
                    <span>{error}</span>
                  </div>
                )}

                <div className="mt-7 flex items-start gap-3 border-t border-line pt-6">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                  <p className="text-xs leading-relaxed text-mist">{PRIVACY}</p>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => fileRef.current?.click()} className="sm:flex-1" data-autofocus>
                    <ImageUp className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    {error ? 'Enviar outra foto' : 'Enviar foto'}
                  </Button>
                  <Button variant="outline" onClick={() => void startCamera()} className="sm:flex-1">
                    <Camera className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Usar a câmera
                  </Button>
                </div>
              </div>
            )}

            {phase === 'camera' && (
              <div className="mt-6">
                <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden bg-coal">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    onLoadedMetadata={() => setVideoReady(true)}
                    className="h-full w-full -scale-x-100 object-cover"
                    aria-label="Prévia da câmera"
                  />
                  <svg viewBox="0 0 300 400" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                    <defs>
                      <mask id={maskId}>
                        <rect width="300" height="400" fill="white" />
                        <ellipse cx="150" cy="188" rx="104" ry="140" fill="black" />
                      </mask>
                    </defs>
                    <rect width="300" height="400" className="fill-obsidian/60" mask={`url(#${maskId})`} />
                    <ellipse cx="150" cy="188" rx="104" ry="140" fill="none" className="stroke-gold" strokeWidth="1.5" strokeDasharray="6 6" />
                  </svg>
                  {!videoReady && (
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="flex items-center gap-2 text-sm text-mist">
                        <LoaderCircle className="h-4 w-4 animate-spin text-gold" aria-hidden />
                        Abrindo a câmera…
                      </span>
                    </div>
                  )}
                  <p className="absolute inset-x-0 bottom-4 text-center text-[0.6rem] uppercase tracking-[0.22em] text-parchment">
                    Centralize o rosto na moldura
                  </p>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                  <Button variant="ghost" onClick={cancelCamera}>
                    <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Voltar
                  </Button>
                  <Button onClick={capture} disabled={!videoReady}>
                    <Camera className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Capturar
                  </Button>
                </div>
              </div>
            )}

            {phase === 'analyzing' && (
              <div className="mt-8 flex flex-col items-center py-4 text-center">
                <p className="sr-only" role="status">
                  Analisando sua foto. Aguarde alguns instantes.
                </p>
                <div className="relative aspect-[3/4] w-52 overflow-hidden rounded-[50%] border border-gold/60 shadow-[0_0_60px_-20px_rgba(212,175,55,0.6)]">
                  {photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute inset-0 bg-obsidian/20" aria-hidden />
                  <span
                    className="absolute inset-x-0 top-[6%] h-px animate-scan bg-gold-light shadow-[0_0_14px_3px_rgba(245,215,127,0.65)]"
                    aria-hidden
                  />
                </div>
                <div className="mt-8 min-h-[2.5rem]" aria-hidden>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                      key={phraseIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="text-2xl font-bold tracking-[-0.02em] text-parchment"
                    >
                      {PHRASES[phraseIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            )}

            {phase === 'result' && result && (
              <div className="mt-8">
                <div className="grid gap-8 sm:grid-cols-[10rem_1fr] sm:items-start">
                  <div className="flex items-center gap-5 sm:flex-col sm:items-start">
                    {photo && (
                      <div className="aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-[50%] border border-gold/50 sm:w-40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo} alt="Sua foto analisada" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <span className="border border-line-gold px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.22em] text-gold">
                      {result.source === 'ai' ? 'Leitura detalhada' : 'Leitura rápida por cor'}
                    </span>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Sua estação</p>
                    <h3 className="mt-3 font-display text-5xl leading-none text-ivory sm:text-6xl">
                      <SeasonName name={result.season} />
                    </h3>
                    <dl className="mt-6 grid grid-cols-3 border-y border-line">
                      {[
                        { k: 'Pele', v: skinToneName(result.skinTone) },
                        { k: 'Subtom', v: subtoneName },
                        { k: 'Contraste', v: contrastName },
                      ].map((item, i) => (
                        <div key={item.k} className={cn('py-3', i > 0 && 'border-l border-line pl-4')}>
                          <dt className="text-[0.58rem] uppercase tracking-[0.22em] text-smoke">{item.k}</dt>
                          <dd className="mt-1 text-lg font-bold leading-tight text-ivory">{item.v}</dd>
                        </div>
                      ))}
                    </dl>
                    {result.notes && <p className="mt-5 text-sm leading-relaxed text-parchment/85">{result.notes}</p>}
                  </div>
                </div>

                {result.palette.length > 0 && (
                  <div className="mt-8">
                    <p className="label">Sua cartela</p>
                    <div className="flex flex-wrap gap-3">
                      {result.palette.map((s, i) => (
                        <Swatch key={`${s.hex}-${i}`} name={s.name} hex={s.hex} size="md" />
                      ))}
                    </div>
                  </div>
                )}

                {result.avoid.length > 0 && (
                  <div className="mt-6">
                    <p className="label">Evitar perto do rosto</p>
                    <div className="flex flex-wrap gap-3">
                      {result.avoid.map((s, i) => (
                        <Swatch key={`${s.hex}-${i}`} name={s.name} hex={s.hex} size="sm" muted />
                      ))}
                    </div>
                  </div>
                )}

                {result.recommendations.length > 0 && (
                  <div className="mt-8">
                    <p className="label">Recomendações</p>
                    <ul className="prose-luxe text-sm leading-relaxed text-mist">
                      {result.recommendations.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="stitch my-8" aria-hidden />

                <label className="flex cursor-pointer items-start gap-3 text-sm text-parchment">
                  <input
                    type="checkbox"
                    checked={keepPhoto}
                    onChange={(e) => setKeepPhoto(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-gold"
                  />
                  <span>
                    Guardar a foto neste aparelho para o provador virtual
                    <span className="mt-1 block text-xs text-smoke">Fica salva somente neste navegador.</span>
                  </span>
                </label>

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="ghost" onClick={redo}>
                    <RotateCcw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    Refazer
                  </Button>
                  <Button onClick={() => void apply()} loading={applying}>
                    {!applying && <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                    Aplicar à minha cartela
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Modal>
  );
}
