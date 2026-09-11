'use client';

/* Pré-visualizações locais (blob:) — next/image não se aplica. */
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, CircleCheck, CloudUpload, Hourglass, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/providers/SessionProvider';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { ApiRequestError, analyzeProductPhoto } from '@/lib/api';
import { fileToDataUrl } from '@/lib/image';
import { cn, uid } from '@/lib/format';
import { slotForCategory } from '@/lib/products';
import { PRODUCT_CATEGORIES, type Product } from '@/lib/types';
import {
  describeError,
  formatBytes,
  isSetupError,
  nameFromFile,
  removeBucketFiles,
  sanitizeSuggestion,
  uniqueSlug,
  uploadProductImage,
  withSlugSuffix,
  type CleanSuggestion,
  type ProductPayload,
} from './admin-utils';

const MAX_FILES = 60;
const CONCURRENCY = 2;

type ItemStatus = 'aguardando' | 'enviando' | 'analisando' | 'pronto' | 'erro';

interface QueueItem {
  id: string;
  file: File;
  preview: string;
  status: ItemStatus;
  productName?: string;
  note?: string;
}

interface BatchContext {
  slugs: Set<string>;
  order: number;
  abort: string | null;
}

const STATUS_META: Record<ItemStatus, { label: string; className: string }> = {
  aguardando: { label: 'Aguardando', className: 'text-smoke' },
  enviando: { label: 'Enviando', className: 'text-gold' },
  analisando: { label: 'Analisando', className: 'text-gold-light' },
  pronto: { label: 'Pronto', className: 'text-success' },
  erro: { label: 'Erro', className: 'text-danger' },
};

function StatusIcon({ status }: { status: ItemStatus }) {
  if (status === 'enviando' || status === 'analisando') return <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />;
  if (status === 'pronto') return <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />;
  if (status === 'erro') return <CircleAlert className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />;
  return <Hourglass className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />;
}

interface BatchUploadProps {
  products: Product[];
  /** Deve ser estável (useCallback). */
  onClose: () => void;
  onFinished: () => void | Promise<void>;
  onShowDrafts: () => void;
}

/** Envio em lote: cada foto vira uma peça em rascunho (concorrência 2). */
export function BatchUpload({ products, onClose, onFinished, onShowDrafts }: BatchUploadProps) {
  const { accessToken } = useSession();
  const { toast } = useUI();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [analyze, setAnalyze] = useState(true);
  const [analysisUnavailable, setAnalysisUnavailable] = useState(false);
  const [abortReason, setAbortReason] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const runningRef = useRef(false);
  const analyzeRef = useRef(true);
  const warnedRef = useRef(false);
  const previews = useRef(new Set<string>());

  useEffect(() => {
    const urls = previews.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  const update = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const releasePreview = (item: QueueItem) => {
    URL.revokeObjectURL(item.preview);
    previews.current.delete(item.preview);
  };

  const addFiles = (incoming: File[]) => {
    if (runningRef.current) return;
    const images = incoming.filter((f) => f.type.startsWith('image/'));
    if (images.length < incoming.length) toast('Alguns arquivos foram ignorados: envie apenas imagens.', 'info');
    const accepted = images.slice(0, Math.max(0, MAX_FILES - items.length));
    if (images.length > accepted.length) toast(`Envie até ${MAX_FILES} fotos por lote.`, 'info');
    if (accepted.length === 0) return;
    const next: QueueItem[] = accepted.map((file) => {
      const preview = URL.createObjectURL(file);
      previews.current.add(preview);
      return { id: uid('lote'), file, preview, status: 'aguardando' };
    });
    setItems((list) => [...list, ...next]);
    setAbortReason(null);
  };

  const removeItem = (item: QueueItem) => {
    releasePreview(item);
    setItems((list) => list.filter((i) => i.id !== item.id));
  };

  const clearDone = () => {
    items.filter((i) => i.status === 'pronto' || i.status === 'erro').forEach(releasePreview);
    setItems((list) => list.filter((i) => i.status !== 'pronto' && i.status !== 'erro'));
  };

  const toggleAnalyze = (checked: boolean) => {
    analyzeRef.current = checked;
    setAnalyze(checked);
  };

  const disableAnalysis = () => {
    analyzeRef.current = false;
    setAnalyze(false);
    setAnalysisUnavailable(true);
    if (!warnedRef.current) {
      warnedRef.current = true;
      toast('Configure GEMINI_API_KEY na Vercel para usar o preenchimento automático.', 'info');
    }
  };

  const processItem = async (item: QueueItem, ctx: BatchContext) => {
    let uploadedUrl: string | null = null;
    try {
      update(item.id, { status: 'enviando', note: undefined, productName: undefined });
      uploadedUrl = await uploadProductImage(item.file);

      let suggestion: CleanSuggestion | null = null;
      let note: string | undefined;
      if (analyzeRef.current) {
        if (!accessToken) {
          note = 'Sessão expirada: criada sem preenchimento automático.';
        } else {
          update(item.id, { status: 'analisando' });
          try {
            const dataUrl = await fileToDataUrl(item.file, 1024);
            const { suggestion: raw } = await analyzeProductPhoto(dataUrl, accessToken);
            suggestion = sanitizeSuggestion(raw);
          } catch (err) {
            if (err instanceof ApiRequestError && err.code === 'not_configured') disableAnalysis();
            else note = 'Criada sem preenchimento automático.';
          }
        }
      }

      const name = suggestion?.name || nameFromFile(item.file.name);
      const category = suggestion?.category ?? PRODUCT_CATEGORIES[0];
      const slug = uniqueSlug(name, ctx.slugs);
      ctx.slugs.add(slug);
      ctx.order += 10;

      const payload: ProductPayload = {
        name,
        slug,
        category,
        slot: suggestion?.slot ?? slotForCategory(category),
        description: suggestion?.description || null,
        fabric: suggestion?.fabric || null,
        color_name: suggestion?.color_name || null,
        hex_color: suggestion?.hex_color ?? null,
        image_url: uploadedUrl,
        gallery: [],
        price_cents: null,
        sizes: [],
        skin_tones: suggestion?.skin_tones ?? [],
        occasions: suggestion?.occasions ?? [],
        climates: suggestion?.climates ?? [],
        formality: suggestion?.formality ?? 3,
        season_compatibility: [],
        is_active: false,
        is_featured: false,
        sort_order: ctx.order,
      };

      let { error } = await supabase.from('products').insert(payload);
      if (error?.code === '23505') {
        const retrySlug = withSlugSuffix(slug);
        ctx.slugs.add(retrySlug);
        ({ error } = await supabase.from('products').insert({ ...payload, slug: retrySlug }));
      }
      if (error) throw error;

      update(item.id, { status: 'pronto', productName: name, note });
    } catch (err) {
      if (uploadedUrl) void removeBucketFiles([uploadedUrl]).catch(() => undefined);
      const message = describeError(err, 'Não foi possível processar esta foto.');
      update(item.id, { status: 'erro', note: message });
      if (isSetupError(err)) ctx.abort = message;
    }
  };

  const run = async (retryErrors: boolean) => {
    if (runningRef.current) return;
    const targets = items.filter((i) => i.status === 'aguardando' || (retryErrors && i.status === 'erro'));
    if (targets.length === 0) return;

    runningRef.current = true;
    setRunning(true);
    setAbortReason(null);
    if (retryErrors) {
      setItems((list) => list.map((i) => (i.status === 'erro' ? { ...i, status: 'aguardando', note: undefined } : i)));
    }

    const ctx: BatchContext = {
      slugs: new Set(products.map((p) => p.slug).filter((s): s is string => Boolean(s))),
      order: products.reduce((max, p) => Math.max(max, p.sort_order), 0),
      abort: null,
    };
    let cursor = 0;
    const worker = async () => {
      while (!ctx.abort && cursor < targets.length) {
        const item = targets[cursor];
        cursor += 1;
        await processItem(item, ctx);
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, () => worker()));

    runningRef.current = false;
    setRunning(false);
    if (ctx.abort) setAbortReason(ctx.abort);
    await onFinished();
  };

  const handleClose = useCallback(() => {
    if (runningRef.current) {
      toast('Aguarde o término do envio para fechar.', 'info');
      return;
    }
    onClose();
  }, [onClose, toast]);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (running || !Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const counts = items.reduce<Record<ItemStatus, number>>(
    (acc, i) => {
      acc[i.status] += 1;
      return acc;
    },
    { aguardando: 0, enviando: 0, analisando: 0, pronto: 0, erro: 0 },
  );
  const total = items.length;
  const processed = counts.pronto + counts.erro;
  const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
  const finished = !running && processed > 0 && counts.aguardando === 0;

  const startLabel = running
    ? 'Enviando'
    : counts.aguardando > 0
      ? `Enviar ${counts.aguardando} ${counts.aguardando === 1 ? 'foto' : 'fotos'}`
      : 'Enviar fotos';

  return (
    <Modal onClose={handleClose} title="Enviar fotos em lote" showTitle size="lg">
      <div className="space-y-6 px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
        <p className="max-w-xl text-sm leading-relaxed text-mist">
          Cada foto vira uma peça em <span className="text-parchment">rascunho</span>, fora da vitrine, para você revisar preço e
          tamanhos antes de publicar.
        </p>

        {/* Área de envio */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            'relative border border-dashed transition-colors duration-300',
            dragging ? 'border-gold bg-gold/[0.06]' : 'border-line-gold bg-coal/60',
            running && 'opacity-50',
          )}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={running}
            className="flex w-full flex-col items-center gap-3 px-6 py-10 text-center disabled:cursor-not-allowed"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full border border-line-gold text-gold">
              <CloudUpload className="h-5 w-5" strokeWidth={1.25} aria-hidden />
            </span>
            <span className="font-display text-2xl text-ivory">
              {dragging ? (
                <em className="italic text-gold-light">Solte as fotos</em>
              ) : (
                <>
                  Arraste as fotos ou <em className="italic text-gold-light">escolha</em> no aparelho
                </>
              )}
            </span>
            <span className="text-xs text-smoke">Até {MAX_FILES} imagens por lote · comprimidas antes do envio</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              addFiles(files);
            }}
          />
        </div>

        {/* Preenchimento automático */}
        <label className={cn('flex items-start gap-3', running || analysisUnavailable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={analyze}
            disabled={running || analysisUnavailable}
            onChange={(e) => toggleAnalyze(e.target.checked)}
          />
          <span
            aria-hidden
            className={cn(
              'mt-0.5 grid h-5 w-5 shrink-0 place-items-center border transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold',
              analyze ? 'border-gold bg-gold text-obsidian' : 'border-line',
            )}
          >
            {analyze && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
          </span>
          <span className="text-sm leading-relaxed">
            <span className="text-ivory">Preencher nome, categoria, cor e tecido a partir de cada foto</span>
            <span className="mt-0.5 block text-xs text-smoke">
              {analysisUnavailable
                ? 'Indisponível: configure GEMINI_API_KEY na Vercel. As peças usam o nome do arquivo.'
                : 'As fotos são processadas por inteligência artificial. Sem esta opção, o nome vem do arquivo.'}
            </span>
          </span>
        </label>

        {abortReason && (
          <div role="alert" className="flex items-start gap-3 border border-danger/30 bg-danger/[0.05] px-4 py-3 text-sm">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" strokeWidth={1.75} aria-hidden />
            <p className="text-parchment">
              Envio interrompido. {abortReason}
              {counts.aguardando > 0 &&
                ` ${counts.aguardando} ${counts.aguardando === 1 ? 'foto continua' : 'fotos continuam'} na fila.`}
            </p>
          </div>
        )}

        {/* Fila */}
        {total > 0 && (
          <div className="border border-line">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-[0.64rem] uppercase tracking-[0.2em] text-mist">
                <span className="tabular-nums text-ivory">{processed}</span> de <span className="tabular-nums">{total}</span> processadas
              </p>
              {counts.pronto > 0 && (
                <p className="text-[0.64rem] uppercase tracking-[0.2em] text-success">
                  <span className="tabular-nums">{counts.pronto}</span> {counts.pronto === 1 ? 'criada' : 'criadas'}
                </p>
              )}
            </div>
            <div
              className="h-0.5 bg-line"
              role="progressbar"
              aria-label="Progresso do lote"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-full bg-foil transition-[width] duration-500 ease-[var(--ease-couture)]" style={{ width: `${progress}%` }} />
            </div>
            <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
              {items.map((item) => {
                const meta = STATUS_META[item.status];
                return (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="relative h-14 w-11 shrink-0 overflow-hidden border border-line bg-surface-2">
                      <img src={item.preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ivory">{item.productName ?? item.file.name}</p>
                      <p className="truncate text-xs text-smoke">
                        {item.productName ? item.file.name : formatBytes(item.file.size)}
                      </p>
                      {item.note && (
                        <p className={cn('mt-0.5 line-clamp-2 text-xs', item.status === 'erro' ? 'text-danger' : 'text-mist')}>{item.note}</p>
                      )}
                    </div>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1.5 text-[0.6rem] font-medium uppercase tracking-[0.18em]',
                        meta.className,
                      )}
                    >
                      <StatusIcon status={item.status} />
                      <span className="hidden sm:inline">{meta.label}</span>
                      <span className="sr-only sm:hidden">{meta.label}</span>
                    </span>
                    {!running && (item.status === 'aguardando' || item.status === 'erro') && (
                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        aria-label={`Remover ${item.file.name} da fila`}
                        className="grid h-8 w-8 shrink-0 place-items-center text-smoke transition-colors hover:text-danger"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Resumo */}
        {finished && (
          <div className="panel-gold px-5 py-5" role="status">
            <p className="eyebrow">Lote concluído</p>
            <p className="mt-2 font-display text-2xl leading-snug text-ivory">
              <span className="tabular-nums">{counts.pronto}</span> {counts.pronto === 1 ? 'peça criada' : 'peças criadas'} como{' '}
              <em className="italic text-gold-light">rascunho</em>
            </p>
            {counts.erro > 0 && (
              <p className="mt-1 text-sm text-danger">
                {counts.erro} {counts.erro === 1 ? 'foto não pôde ser processada.' : 'fotos não puderam ser processadas.'}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              {counts.pronto > 0 && (
                <Button size="sm" onClick={onShowDrafts}>
                  Ver rascunhos
                </Button>
              )}
              {counts.erro > 0 && (
                <Button variant="outline" size="sm" onClick={() => void run(true)}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Tentar novamente
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={clearDone}>
                Novo lote
              </Button>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-smoke" aria-live="polite">
            {running
              ? 'Não feche esta janela durante o envio.'
              : counts.aguardando > 0
                ? `${counts.aguardando} ${counts.aguardando === 1 ? 'foto na fila' : 'fotos na fila'}`
                : 'Selecione as fotos para montar o lote.'}
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={running}>
              Fechar
            </Button>
            <Button size="sm" onClick={() => void run(false)} loading={running} disabled={counts.aguardando === 0}>
              {startLabel}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
