'use client';

/* Miniaturas de URLs remotas e de pré-visualizações locais (blob:) — next/image não se aplica. */
/* eslint-disable @next/next/no-img-element */

import { useId, useImperativeHandle, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, Link2, LoaderCircle, Plus, Star, X } from 'lucide-react';
import { useUI } from '@/providers/UIProvider';
import { cn, uid } from '@/lib/format';
import { MAX_GALLERY, describeError, uploadProductImage, type ImageSet } from './admin-utils';

export type UploadTarget = 'replace' | 'auto';

export interface ImageUploaderHandle {
  addFiles: (files: File[], target: UploadTarget) => void;
}

type Placement = 'replace' | 'main' | 'gallery';

interface PendingUpload {
  id: string;
  preview: string;
  placement: Placement;
}

/** Posiciona uma imagem recém-enviada sem perder as que chegaram antes (uploads concorrentes). */
function placeImage(prev: ImageSet, url: string, placement: Placement): ImageSet {
  const gallery = prev.gallery.filter((u) => u !== url);
  if (placement === 'replace' || !prev.image_url) return { image_url: url, gallery };
  if (placement === 'main') return { image_url: url, gallery: [prev.image_url, ...gallery] };
  if (prev.image_url === url || gallery.length >= MAX_GALLERY) return prev;
  return { image_url: prev.image_url, gallery: [...gallery, url] };
}

interface ImageUploaderProps {
  ref?: React.Ref<ImageUploaderHandle>;
  value: ImageSet;
  onChange: (updater: (prev: ImageSet) => ImageSet) => void;
  /** Chamado a cada arquivo enviado ao Storage (para limpeza e análise). Deve ser estável. */
  onUploaded: (url: string, file: File) => void;
  /** +n ao iniciar envios, −1 ao concluir cada um. */
  onBusyChange: (delta: number) => void;
  disabled?: boolean;
}

const tinyButton =
  'grid h-7 w-7 place-items-center text-parchment transition-colors hover:text-gold-light disabled:pointer-events-none disabled:opacity-30';

/** Foto principal + galeria (até 6): arrastar e soltar, clique, reordenar e URL colada. */
export function ImageUploader({ ref, value, onChange, onUploaded, onBusyChange, disabled = false }: ImageUploaderProps) {
  const { toast } = useUI();
  const urlId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickTarget = useRef<UploadTarget>('auto');
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const upload = async (job: PendingUpload & { file: File }) => {
    try {
      const url = await uploadProductImage(job.file);
      onUploaded(url, job.file);
      onChange((prev) => placeImage(prev, url, job.placement));
    } catch (err) {
      toast(describeError(err, 'Não foi possível enviar a imagem.'), 'error');
    } finally {
      URL.revokeObjectURL(job.preview);
      setPending((list) => list.filter((p) => p.id !== job.id));
      onBusyChange(-1);
    }
  };

  const addFiles = (incoming: File[], target: UploadTarget) => {
    if (disabled) return;
    const files = incoming.filter((f) => f.type.startsWith('image/'));
    if (files.length < incoming.length) toast('Alguns arquivos foram ignorados: envie apenas imagens.', 'info');
    if (files.length === 0) return;

    let mainTaken = Boolean(value.image_url) || pending.some((p) => p.placement !== 'gallery');
    let room = MAX_GALLERY - value.gallery.length - pending.filter((p) => p.placement === 'gallery').length;
    let skipped = 0;
    const jobs: Array<PendingUpload & { file: File }> = [];

    files.forEach((file, index) => {
      let placement: Placement = 'gallery';
      if (target === 'replace' && index === 0) placement = 'replace';
      else if (!mainTaken) placement = 'main';

      if (placement === 'gallery') {
        if (room <= 0) {
          skipped += 1;
          return;
        }
        room -= 1;
      } else {
        mainTaken = true;
      }
      jobs.push({ id: uid('foto'), file, preview: URL.createObjectURL(file), placement });
    });

    if (skipped > 0) {
      toast(`A galeria aceita até ${MAX_GALLERY} fotos; ${skipped} ${skipped === 1 ? 'ficou' : 'ficaram'} de fora.`, 'info');
    }
    if (jobs.length === 0) return;

    setPending((list) => [...list, ...jobs.map(({ id, preview, placement }) => ({ id, preview, placement }))]);
    onBusyChange(jobs.length);
    jobs.forEach((job) => {
      void upload(job);
    });
  };

  useImperativeHandle(ref, () => ({ addFiles }));

  const openPicker = (target: UploadTarget) => {
    if (disabled) return;
    pickTarget.current = target;
    inputRef.current?.click();
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const target = pickTarget.current;
    addFiles(target === 'replace' ? files.slice(0, 1) : files, target);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled || !Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files), 'auto');
  };

  const removeMain = () =>
    onChange((prev) =>
      prev.gallery.length > 0 ? { image_url: prev.gallery[0], gallery: prev.gallery.slice(1) } : { image_url: null, gallery: [] },
    );

  const removeAt = (index: number) => onChange((prev) => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== index) }));

  const move = (index: number, delta: -1 | 1) =>
    onChange((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.gallery.length) return prev;
      const gallery = [...prev.gallery];
      [gallery[index], gallery[target]] = [gallery[target], gallery[index]];
      return { ...prev, gallery };
    });

  const promote = (index: number) =>
    onChange((prev) => {
      const chosen = prev.gallery[index];
      if (!chosen) return prev;
      const rest = prev.gallery.filter((_, i) => i !== index);
      return { image_url: chosen, gallery: prev.image_url ? [prev.image_url, ...rest] : rest };
    });

  const addUrl = () => {
    const raw = urlDraft.trim();
    if (!raw) return;
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      toast('Endereço inválido. Cole uma URL que comece com https://', 'error');
      return;
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      toast('Use uma URL http(s). Imagens embutidas não são aceitas.', 'error');
      return;
    }
    const url = parsed.href;
    if (value.image_url === url || value.gallery.includes(url)) {
      toast('Esta imagem já faz parte da peça.', 'info');
      return;
    }
    if (value.image_url && value.gallery.length >= MAX_GALLERY) {
      toast(`A galeria aceita até ${MAX_GALLERY} fotos.`, 'info');
      return;
    }
    onChange((prev) => placeImage(prev, url, 'gallery'));
    setUrlDraft('');
  };

  const mainPending = pending.find((p) => p.placement !== 'gallery');
  const galleryPending = pending.filter((p) => p.placement === 'gallery');
  const canAddMore = value.gallery.length + galleryPending.length < MAX_GALLERY;

  return (
    <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className="space-y-5">
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden />

      {/* Foto principal */}
      <div
        className={cn(
          'relative aspect-[3/4] w-full overflow-hidden border bg-coal transition-colors duration-300',
          dragging ? 'border-gold' : 'border-line',
        )}
      >
        {value.image_url ? (
          <img src={value.image_url} alt="Foto principal da peça" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          !mainPending && (
            <button
              type="button"
              onClick={() => openPicker('auto')}
              disabled={disabled}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center transition-colors duration-300 hover:bg-gold/[0.04]"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full border border-line-gold text-gold">
                <ImagePlus className="h-5 w-5" strokeWidth={1.25} aria-hidden />
              </span>
              <span className="font-display text-xl text-ivory">
                Arraste as <em className="italic text-gold-light">fotos</em>
              </span>
              <span className="text-xs leading-relaxed text-smoke">
                ou clique para escolher
                <br />
                JPG, PNG ou WEBP · comprimidas no envio
              </span>
            </button>
          )
        )}

        {mainPending && (
          <div className="absolute inset-0 grid place-items-center">
            <img src={mainPending.preview} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            <span className="relative flex items-center gap-2 bg-obsidian/85 px-3 py-2 text-[0.62rem] uppercase tracking-[0.2em] text-gold-light">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Enviando
            </span>
          </div>
        )}

        <span className="pointer-events-none absolute left-3 top-3 bg-obsidian/85 px-2 py-1 font-caps text-[0.56rem] tracking-[0.22em] text-gold">
          Principal
        </span>

        {value.image_url && !mainPending && (
          <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 border-t border-line-gold bg-obsidian/85 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => openPicker('replace')}
              disabled={disabled}
              className="py-2.5 text-[0.62rem] uppercase tracking-[0.2em] text-parchment transition-colors hover:text-gold-light"
            >
              Substituir
            </button>
            <button
              type="button"
              onClick={removeMain}
              disabled={disabled}
              className="border-l border-line py-2.5 text-[0.62rem] uppercase tracking-[0.2em] text-parchment transition-colors hover:text-danger"
            >
              Remover
            </button>
          </div>
        )}

        {dragging && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-obsidian/75">
            <span className="font-display text-2xl italic text-gold-light">Solte para enviar</span>
          </div>
        )}
      </div>

      {/* Galeria */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="label mb-0">Galeria</span>
          <span className="text-xs tabular-nums text-smoke">
            {value.gallery.length}/{MAX_GALLERY}
          </span>
        </div>
        <ul className="grid grid-cols-3 gap-2">
          {value.gallery.map((url, index) => (
            <li key={url} className="relative aspect-square overflow-hidden border border-line bg-coal">
              <img src={url} alt={`Foto ${index + 2} da peça`} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                disabled={disabled}
                aria-label={`Remover foto ${index + 2}`}
                className="absolute right-0 top-0 grid h-7 w-7 place-items-center bg-obsidian/85 text-mist transition-colors hover:text-danger"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-obsidian/85">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={disabled || index === 0}
                  aria-label={`Mover foto ${index + 2} para a esquerda`}
                  className={tinyButton}
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => promote(index)}
                  disabled={disabled}
                  aria-label={`Definir foto ${index + 2} como principal`}
                  title="Definir como principal"
                  className={tinyButton}
                >
                  <Star className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={disabled || index === value.gallery.length - 1}
                  aria-label={`Mover foto ${index + 2} para a direita`}
                  className={tinyButton}
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}

          {galleryPending.map((p) => (
            <li key={p.id} className="relative grid aspect-square place-items-center overflow-hidden border border-line-gold bg-coal">
              <img src={p.preview} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
              <LoaderCircle className="relative h-5 w-5 animate-spin text-gold-light" aria-hidden />
              <span className="sr-only">Enviando foto</span>
            </li>
          ))}

          {canAddMore && (
            <li>
              <button
                type="button"
                onClick={() => openPicker('auto')}
                disabled={disabled}
                className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 border border-dashed border-line-gold text-gold/80 transition-colors duration-300 hover:bg-gold/[0.05] hover:text-gold-light"
              >
                <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                <span className="text-[0.56rem] uppercase tracking-[0.2em]">Adicionar</span>
              </button>
            </li>
          )}
        </ul>
      </div>

      {/* URL colada */}
      <div>
        <label htmlFor={urlId} className="label">
          Ou cole a URL de uma imagem
        </label>
        <div className="flex">
          <input
            id={urlId}
            type="url"
            inputMode="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="https://"
            disabled={disabled}
            autoComplete="off"
            className="field min-w-0 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={addUrl}
            disabled={disabled || !urlDraft.trim()}
            aria-label="Adicionar imagem pela URL"
            className="btn btn-ghost btn-sm -ml-px shrink-0"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
