'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CircleAlert, LoaderCircle, WandSparkles, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ColorDot } from '@/components/ui/Swatch';
import { useSession } from '@/providers/SessionProvider';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { ApiRequestError, analyzeProductPhoto } from '@/lib/api';
import { fileToDataUrl } from '@/lib/image';
import { cn, formatBRL, formatDateBR, slugify } from '@/lib/format';
import { slotForCategory } from '@/lib/products';
import { CLIMATES, OCCASIONS, SKIN_TONES, SLOT_LABELS } from '@/lib/stylist/knowledge';
import {
  PIECE_SLOTS,
  PRODUCT_CATEGORIES,
  type ClimateId,
  type OccasionId,
  type PieceSlot,
  type Product,
  type ProductVisionSuggestion,
  type SkinToneId,
} from '@/lib/types';
import { DangerButton, Field, SectionLabel, SelectBox, Switch } from './AdminUI';
import { ImageUploader, type ImageUploaderHandle } from './ImageUploader';
import {
  FORMALITY_LABELS,
  ROMAN,
  centsToInput,
  clampFormality,
  describeError,
  normalizeHex,
  parsePriceToCents,
  productImages,
  removeBucketFiles,
  sanitizeSuggestion,
  uniqueSlug,
  urlToFile,
  urlsInUse,
  withSlugSuffix,
  type ImageSet,
  type ProductPayload,
} from './admin-utils';

// ------------------------------------------------------------
// Constantes do formulário
// ------------------------------------------------------------
const SIZE_PRESETS = [
  { label: 'PP–GG', sizes: ['PP', 'P', 'M', 'G', 'GG'] },
  { label: '38–48', sizes: ['38', '40', '42', '44', '46', '48'] },
  { label: '46–56', sizes: ['46', '48', '50', '52', '54', '56'] },
  { label: 'Único', sizes: ['Único'] },
];

/** Tons clássicos de alfaiataria (mesmas referências da base de colorimetria). */
const COLOR_PRESETS = [
  { name: 'Azul Marinho', hex: '#1B2A4A' },
  { name: 'Preto Obsidian', hex: '#0B0C10' },
  { name: 'Cinza Grafite', hex: '#2C3539' },
  { name: 'Cinza Médio', hex: '#8A8D91' },
  { name: 'Branco Marfim', hex: '#FAF7F0' },
  { name: 'Areia', hex: '#D8C7A8' },
  { name: 'Camel', hex: '#B08A5A' },
  { name: 'Marrom Café', hex: '#3E2723' },
  { name: 'Verde Oliva', hex: '#556B2F' },
  { name: 'Bordô Imperial', hex: '#58111A' },
  { name: 'Terracota', hex: '#A0522D' },
  { name: 'Azul Royal', hex: '#002D72' },
];

const FABRIC_SUGGESTIONS = [
  'Lã fria Super 120s',
  'Lã fria',
  'Cashmere',
  'Linho',
  'Algodão egípcio',
  'Algodão pima',
  'Tricoline',
  'Oxford',
  'Sarja',
  'Veludo',
  'Seda',
  'Tweed',
  'Flanela',
  'Couro nappa',
  'Camurça',
];

const OCCASION_OPTIONS = OCCASIONS.filter((o) => o.id !== 'outro');

// ------------------------------------------------------------
// Estado
// ------------------------------------------------------------
interface FormState {
  name: string;
  category: string;
  slot: PieceSlot;
  price: string;
  sizes: string[];
  color_name: string;
  hex: string;
  fabric: string;
  description: string;
  formality: number;
  skin_tones: SkinToneId[];
  occasions: OccasionId[];
  climates: ClimateId[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: string;
}

type FieldKey = keyof FormState;
type Errors = Partial<Record<FieldKey, string>>;

const FIELD_ORDER: FieldKey[] = ['name', 'price', 'hex', 'sort_order'];

function nextSortOrder(products: Product[]): number {
  return products.reduce((max, p) => Math.max(max, p.sort_order), 0) + 10;
}

function initialForm(product: Product | null, products: Product[]): FormState {
  if (!product) {
    const category = PRODUCT_CATEGORIES[0];
    return {
      name: '',
      category,
      slot: slotForCategory(category),
      price: '',
      sizes: [],
      color_name: '',
      hex: '',
      fabric: '',
      description: '',
      formality: 3,
      skin_tones: [],
      occasions: [],
      climates: [],
      is_active: true,
      is_featured: false,
      sort_order: String(nextSortOrder(products)),
    };
  }
  return {
    name: product.name,
    category: product.category,
    slot: product.slot,
    price: centsToInput(product.price_cents),
    sizes: product.sizes,
    color_name: product.color_name ?? '',
    hex: product.hex_color ? (normalizeHex(product.hex_color) ?? product.hex_color) : '',
    fabric: product.fabric ?? '',
    description: product.description ?? '',
    formality: clampFormality(product.formality),
    skin_tones: product.skin_tones,
    occasions: product.occasions.filter((o) => o !== 'outro'),
    climates: product.climates,
    is_active: product.is_active,
    is_featured: product.is_featured,
    sort_order: String(product.sort_order),
  };
}

/** Campos que a análise da foto não deve sobrescrever. */
function initialTouched(product: Product | null): Set<FieldKey> {
  if (!product) return new Set();
  const touched = new Set<FieldKey>(['category', 'formality']);
  if (product.slot !== slotForCategory(product.category)) touched.add('slot');
  return touched;
}

function validate(form: FormState): { errors: Errors; cents: number | null } {
  const errors: Errors = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Dê um nome à peça.';
  else if (name.length > 140) errors.name = 'Use até 140 caracteres.';
  const cents = parsePriceToCents(form.price);
  if (cents === undefined) errors.price = 'Use apenas números, ex.: 1.290,00';
  if (form.hex.trim() && !normalizeHex(form.hex)) errors.hex = 'Use o formato #RRGGBB.';
  if (!/^-?\d{1,6}$/.test(form.sort_order.trim())) errors.sort_order = 'Informe um número inteiro.';
  return { errors, cents: cents ?? null };
}

async function persistProduct(payload: ProductPayload, id: string | null) {
  const res = id
    ? await supabase.from('products').update(payload).eq('id', id).select('id')
    : await supabase.from('products').insert({ ...payload, season_compatibility: [] }).select('id');
  return { error: res.error, rows: res.data?.length ?? 0 };
}

// ------------------------------------------------------------
// Componente
// ------------------------------------------------------------
interface ProductFormProps {
  product: Product | null;
  /** Acervo completo (endereços em uso, ordem sugerida e fotos compartilhadas). */
  products: Product[];
  /** Deve ser estável (useCallback). */
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

export function ProductForm({ product, products, onClose, onSaved }: ProductFormProps) {
  const { accessToken } = useSession();
  const { toast } = useUI();
  const ids = useId();

  const [initial] = useState(() => {
    const form = initialForm(product, products);
    const images: ImageSet = { image_url: product?.image_url ?? null, gallery: product?.gallery ?? [] };
    return { form, images, snapshot: JSON.stringify([form, images]) };
  });

  const [form, setForm] = useState<FormState>(initial.form);
  const [images, setImages] = useState<ImageSet>(initial.images);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = useMemo(() => JSON.stringify([form, images]) !== initial.snapshot, [form, images, initial.snapshot]);
  const originalImages = useMemo(() => (product ? productImages(product) : []), [product]);

  const touched = useRef<Set<FieldKey>>(initialTouched(product));
  const sessionUploads = useRef(new Set<string>());
  const fileByUrl = useRef(new Map<string, File>());
  const uploaderRef = useRef<ImageUploaderHandle>(null);
  const analyzeInputRef = useRef<HTMLInputElement>(null);
  const latest = useRef({ form: initial.form, dirty: false, uploading: 0, saving: false, closed: false });

  useEffect(() => {
    latest.current.form = form;
    latest.current.dirty = dirty;
    latest.current.uploading = uploading;
  }, [form, dirty, uploading]);

  // ---------------------------------------------------------- fechar / descartar
  const discardSessionUploads = useCallback(() => {
    latest.current.closed = true;
    const keep = new Set(originalImages);
    const orphans = Array.from(sessionUploads.current).filter((u) => !keep.has(u));
    sessionUploads.current.clear();
    if (orphans.length > 0) void removeBucketFiles(orphans).catch(() => undefined);
  }, [originalImages]);

  const requestClose = useCallback(() => {
    if (latest.current.saving) return;
    if (latest.current.dirty || latest.current.uploading > 0) {
      setConfirmDiscard(true);
      return;
    }
    discardSessionUploads();
    onClose();
  }, [discardSessionUploads, onClose]);

  const discardAndClose = () => {
    discardSessionUploads();
    onClose();
  };

  // ---------------------------------------------------------- imagens
  const handleUploaded = useCallback((url: string, file: File) => {
    if (latest.current.closed) {
      void removeBucketFiles([url]).catch(() => undefined);
      return;
    }
    sessionUploads.current.add(url);
    fileByUrl.current.set(url, file);
  }, []);

  const handleBusyChange = useCallback((delta: number) => {
    setUploading((n) => Math.max(0, n + delta));
  }, []);

  // ---------------------------------------------------------- campos
  const setField = <K extends FieldKey>(key: K, value: FormState[K]) => {
    touched.current.add(key);
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
    setFormError(null);
  };

  const changeCategory = (category: string) => {
    const keepSlot = touched.current.has('slot');
    touched.current.add('category');
    setForm((f) => ({ ...f, category, slot: keepSlot ? f.slot : slotForCategory(category) }));
  };

  // ---------------------------------------------------------- preenchimento pela foto
  const applySuggestion = (raw: ProductVisionSuggestion): number => {
    const s = sanitizeSuggestion(raw);
    const t = touched.current;
    const current = latest.current.form;
    const next: FormState = { ...current };
    let count = 0;

    const fillText = (key: 'name' | 'color_name' | 'fabric' | 'description', value: string) => {
      if (!current[key].trim() && value) {
        next[key] = value;
        count += 1;
      }
    };
    fillText('name', s.name);
    fillText('color_name', s.color_name);
    fillText('fabric', s.fabric);
    fillText('description', s.description);
    if (!current.hex.trim() && s.hex_color) {
      next.hex = s.hex_color;
      count += 1;
    }
    if (!t.has('category')) {
      next.category = s.category;
      if (!t.has('slot')) next.slot = s.slot;
      t.add('category');
      count += 1;
    }
    if (!t.has('formality')) {
      next.formality = s.formality;
      t.add('formality');
      count += 1;
    }
    if (current.skin_tones.length === 0 && s.skin_tones.length > 0) {
      next.skin_tones = s.skin_tones;
      count += 1;
    }
    if (current.occasions.length === 0 && s.occasions.length > 0) {
      next.occasions = s.occasions;
      count += 1;
    }
    if (current.climates.length === 0 && s.climates.length > 0) {
      next.climates = s.climates;
      count += 1;
    }

    if (count > 0) {
      latest.current.form = next;
      setForm(next);
      setErrors((e) => ({ ...e, name: next.name.trim() ? undefined : e.name, hex: undefined }));
    }
    return count;
  };

  const runAnalysis = async (file: File) => {
    if (!accessToken) {
      toast('Sua sessão expirou. Entre novamente para usar o preenchimento automático.', 'error');
      return;
    }
    setAnalyzing(true);
    try {
      const dataUrl = await fileToDataUrl(file, 1024);
      const { suggestion } = await analyzeProductPhoto(dataUrl, accessToken);
      const count = applySuggestion(suggestion);
      if (count > 0) {
        toast(`${count} ${count === 1 ? 'campo preenchido' : 'campos preenchidos'} a partir da foto. Revise antes de salvar.`, 'success');
      } else {
        toast('Os campos já estavam preenchidos; nada foi alterado.', 'info');
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'not_configured') {
        toast('Configure GEMINI_API_KEY na Vercel para usar o preenchimento automático.', 'error');
      } else if (err instanceof ApiRequestError && (err.code === 'unauthorized' || err.code === 'forbidden')) {
        toast('Sua sessão não tem permissão de administração. Entre novamente.', 'error');
      } else {
        toast(describeError(err, 'Não foi possível analisar a foto.'), 'error');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeClick = async () => {
    const main = images.image_url;
    if (main) {
      const remembered = fileByUrl.current.get(main);
      if (remembered) {
        await runAnalysis(remembered);
        return;
      }
      setAnalyzing(true);
      const fetched = await urlToFile(main);
      setAnalyzing(false);
      if (fetched) {
        await runAnalysis(fetched);
        return;
      }
      toast('Não foi possível ler a foto atual. Escolha o arquivo da peça.', 'info');
    }
    analyzeInputRef.current?.click();
  };

  const onAnalyzeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!images.image_url) uploaderRef.current?.addFiles([file], 'auto');
    void runAnalysis(file);
  };

  // ---------------------------------------------------------- salvar
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    if (uploading > 0) {
      toast('Aguarde o envio das imagens terminar.', 'info');
      return;
    }

    const { errors: found, cents } = validate(form);
    const firstInvalid = FIELD_ORDER.find((key) => found[key]);
    if (firstInvalid) {
      setErrors(found);
      document.getElementById(`${ids}-${firstInvalid}`)?.focus();
      return;
    }
    // Garantia: somente URLs http(s) chegam ao banco — nunca base64.
    if (!productImages(images).every((u) => /^https?:\/\//i.test(u))) {
      setFormError('Há uma imagem em formato inválido. Remova-a e envie novamente.');
      return;
    }

    const name = form.name.trim();
    const taken = new Set(
      products.filter((p) => p.id !== product?.id).map((p) => p.slug).filter((s): s is string => Boolean(s)),
    );
    const slug = product?.slug && product.name.trim() === name ? product.slug : uniqueSlug(name, taken);

    const payload: ProductPayload = {
      name,
      slug,
      category: form.category,
      slot: form.slot,
      description: form.description.trim() || null,
      fabric: form.fabric.trim() || null,
      color_name: form.color_name.trim() || null,
      hex_color: form.hex.trim() ? normalizeHex(form.hex) : null,
      image_url: images.image_url,
      gallery: images.gallery,
      price_cents: cents,
      sizes: form.sizes,
      skin_tones: form.skin_tones,
      occasions: form.occasions,
      climates: form.climates,
      formality: form.formality,
      is_active: form.is_active,
      is_featured: form.is_featured,
      sort_order: Number.parseInt(form.sort_order, 10),
    };

    setSaving(true);
    latest.current.saving = true;
    setFormError(null);
    try {
      const id = product?.id ?? null;
      let result = await persistProduct(payload, id);
      if (result.error?.code === '23505') {
        result = await persistProduct({ ...payload, slug: withSlugSuffix(slug) }, id);
      }
      if (result.error) throw result.error;
      if (id && result.rows === 0) {
        throw new Error('Nenhuma alteração foi aplicada. Confirme que sua conta tem papel de administração.');
      }

      // Limpa do Storage as fotos que deixaram de ser usadas.
      const finalSet = new Set(productImages(images));
      const inUse = urlsInUse(products, product?.id);
      const stale = Array.from(new Set([...sessionUploads.current, ...originalImages])).filter(
        (u) => !finalSet.has(u) && !inUse.has(u),
      );
      sessionUploads.current.clear();
      latest.current.closed = true;
      if (stale.length > 0) void removeBucketFiles(stale).catch(() => undefined);

      toast(product ? 'Alterações salvas.' : form.is_active ? 'Peça publicada no acervo.' : 'Peça salva como rascunho.', 'success');
      await onSaved();
    } catch (err) {
      setFormError(describeError(err, 'Não foi possível salvar a peça.'));
    } finally {
      latest.current.saving = false;
      setSaving(false);
    }
  };

  // ---------------------------------------------------------- derivados
  const parsedPrice = parsePriceToCents(form.price);
  const priceHint =
    parsedPrice === undefined ? undefined : parsedPrice === null ? 'Vazio = sob consulta' : `Na vitrine: ${formatBRL(parsedPrice)}`;
  const validHex = normalizeHex(form.hex);
  const slugPreview =
    product?.slug && product.name.trim() === form.name.trim() ? product.slug : slugify(form.name) || 'peca';
  const categoryOptions: string[] = (PRODUCT_CATEGORIES as readonly string[]).includes(form.category)
    ? [...PRODUCT_CATEGORIES]
    : [form.category, ...PRODUCT_CATEGORIES];
  const fieldId = (key: FieldKey) => `${ids}-${key}`;

  return (
    <Modal onClose={requestClose} title={product ? 'Editar peça' : 'Nova peça'} showTitle size="xl">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col">
        <input ref={analyzeInputRef} type="file" accept="image/*" onChange={onAnalyzeFile} className="sr-only" tabIndex={-1} aria-hidden />

        {/* Cabeçalho da ficha */}
        <div className="flex flex-col gap-4 border-b border-line px-6 pb-6 pt-2 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div className="min-w-0 text-sm text-mist">
            <p>
              {product?.created_at
                ? `Cadastrada em ${formatDateBR(product.created_at)}`
                : 'Fotos, medidas e curadoria do Atelier em uma única ficha.'}
            </p>
            <p className="mt-1 truncate font-mono text-xs text-smoke" title="Endereço da peça">
              /{slugPreview}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleAnalyzeClick()}
            loading={analyzing}
            disabled={saving}
            className="shrink-0"
          >
            {!analyzing && <WandSparkles className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
            {analyzing ? 'Lendo a foto' : 'Preencher a partir da foto'}
          </Button>
        </div>

        <div className="grid gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          {/* I · Fotografia */}
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <SectionLabel numeral="I">Fotografia</SectionLabel>
            <ImageUploader
              ref={uploaderRef}
              value={images}
              onChange={setImages}
              onUploaded={handleUploaded}
              onBusyChange={handleBusyChange}
              disabled={saving}
            />
            <p className="text-xs leading-relaxed text-smoke">A foto principal abre a vitrine; a galeria acompanha a ficha da peça.</p>
          </aside>

          <div className="min-w-0 space-y-12">
            {/* II · Identificação */}
            <section className="space-y-5" aria-label="Identificação">
              <SectionLabel numeral="II">Identificação</SectionLabel>

              <Field label="Nome da peça *" htmlFor={fieldId('name')} error={errors.name}>
                <input
                  id={fieldId('name')}
                  data-autofocus
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Ex.: Blazer Tailored Super 120s"
                  maxLength={160}
                  autoComplete="off"
                  aria-invalid={Boolean(errors.name)}
                  className="field"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Categoria" htmlFor={fieldId('category')}>
                  <SelectBox id={fieldId('category')} value={form.category} onChange={(e) => changeCategory(e.target.value)}>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </SelectBox>
                </Field>
                <Field
                  label="Posição no look"
                  htmlFor={fieldId('slot')}
                  hint={form.slot === slotForCategory(form.category) ? 'Sugerida pela categoria' : 'Definida manualmente'}
                >
                  <SelectBox id={fieldId('slot')} value={form.slot} onChange={(e) => setField('slot', e.target.value as PieceSlot)}>
                    {PIECE_SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {SLOT_LABELS[s]}
                      </option>
                    ))}
                  </SelectBox>
                </Field>
              </div>

              <Field label="Preço" htmlFor={fieldId('price')} hint={priceHint} error={errors.price}>
                <div className="relative sm:max-w-xs">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-smoke">R$</span>
                  <input
                    id={fieldId('price')}
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                    placeholder="Sob consulta"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.price)}
                    className="field pl-11 tabular-nums"
                  />
                </div>
              </Field>

              <Field label="Tamanhos" htmlFor={fieldId('sizes')}>
                <SizesInput id={fieldId('sizes')} value={form.sizes} onChange={(sizes) => setField('sizes', sizes)} />
              </Field>
            </section>

            {/* III · Cor e matéria */}
            <section className="space-y-5" aria-label="Cor e matéria">
              <SectionLabel numeral="III">Cor e matéria</SectionLabel>

              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,13rem)]">
                <Field label="Nome da cor" htmlFor={fieldId('color_name')}>
                  <input
                    id={fieldId('color_name')}
                    value={form.color_name}
                    onChange={(e) => setField('color_name', e.target.value)}
                    placeholder="Ex.: Azul Marinho"
                    maxLength={60}
                    autoComplete="off"
                    className="field"
                  />
                </Field>
                <Field label="Cor (hex)" htmlFor={fieldId('hex')} error={errors.hex}>
                  <div className="flex">
                    <input
                      type="color"
                      aria-label="Escolher a cor no seletor"
                      value={(validHex ?? '#1B2A4A').toLowerCase()}
                      onChange={(e) => setField('hex', e.target.value.toUpperCase())}
                      className="w-12 shrink-0 cursor-pointer border border-line bg-transparent p-1.5 [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-0"
                    />
                    <input
                      id={fieldId('hex')}
                      value={form.hex}
                      onChange={(e) => setField('hex', e.target.value)}
                      onBlur={() => {
                        const normalized = normalizeHex(form.hex);
                        if (normalized && normalized !== form.hex) setForm((f) => ({ ...f, hex: normalized }));
                      }}
                      placeholder="#1B2A4A"
                      maxLength={7}
                      spellCheck={false}
                      autoComplete="off"
                      aria-invalid={Boolean(errors.hex)}
                      className="field -ml-px min-w-0 font-mono uppercase"
                    />
                  </div>
                </Field>
              </div>

              <div>
                <span className="label">Tons de alfaiataria</span>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((c) => {
                    const active = validHex === c.hex;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        title={`${c.name} · ${c.hex}`}
                        aria-label={`Usar ${c.name}`}
                        aria-pressed={active}
                        onClick={() => {
                          setField('hex', c.hex);
                          const currentName = form.color_name.trim();
                          if (!currentName || COLOR_PRESETS.some((p) => p.name === currentName)) setField('color_name', c.name);
                        }}
                        className={cn(
                          'grid h-9 w-9 place-items-center rounded-full transition-transform duration-300 hover:scale-110',
                          active && 'ring-1 ring-gold',
                        )}
                      >
                        <ColorDot hex={c.hex} size={22} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Tecido" htmlFor={fieldId('fabric')}>
                <input
                  id={fieldId('fabric')}
                  list={`${ids}-fabrics`}
                  value={form.fabric}
                  onChange={(e) => setField('fabric', e.target.value)}
                  placeholder="Ex.: Lã fria Super 120s"
                  maxLength={80}
                  autoComplete="off"
                  className="field"
                />
                <datalist id={`${ids}-fabrics`}>
                  {FABRIC_SUGGESTIONS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                </datalist>
              </Field>

              <Field label="Descrição" htmlFor={fieldId('description')} hint={`${form.description.length}/600`}>
                <textarea
                  id={fieldId('description')}
                  rows={4}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Corte, caimento, acabamento e quando usar."
                  maxLength={600}
                  className="field resize-y leading-relaxed"
                />
              </Field>
            </section>

            {/* IV · Curadoria do Atelier */}
            <section className="space-y-6" aria-label="Curadoria do Atelier">
              <SectionLabel numeral="IV">Curadoria do Atelier</SectionLabel>

              <div>
                <span id={`${ids}-formality-label`} className="label">
                  Formalidade
                </span>
                <div role="group" aria-labelledby={`${ids}-formality-label`} className="grid grid-cols-5 gap-px border border-line bg-line">
                  {FORMALITY_LABELS.map((label, i) => {
                    const level = i + 1;
                    const active = form.formality === level;
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setField('formality', level)}
                        className={cn(
                          'flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 px-1 py-2.5 text-center transition-colors duration-300',
                          active
                            ? 'bg-surface-2 text-gold-light shadow-[inset_0_-2px_0_var(--color-gold)]'
                            : 'bg-surface text-mist hover:bg-surface-2 hover:text-ivory',
                        )}
                      >
                        <span className="font-caps text-sm tracking-[0.1em]">{ROMAN[i]}</span>
                        <span className="text-[0.54rem] uppercase leading-tight tracking-[0.1em] sm:text-[0.6rem]">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <ChipGroup
                label="Tons de pele"
                hint="Nenhum marcado = combina com todos"
                options={SKIN_TONES.map((t) => ({ id: t.id, label: t.name }))}
                value={form.skin_tones}
                onChange={(v) => setField('skin_tones', v)}
              />
              <ChipGroup
                label="Ocasiões"
                hint="Nenhuma marcada = qualquer ocasião"
                options={OCCASION_OPTIONS.map((o) => ({ id: o.id, label: o.title }))}
                value={form.occasions}
                onChange={(v) => setField('occasions', v)}
              />
              <ChipGroup
                label="Climas"
                hint="Nenhum marcado = qualquer clima"
                options={CLIMATES.map((c) => ({ id: c.id, label: c.title }))}
                value={form.climates}
                onChange={(v) => setField('climates', v)}
              />
            </section>

            {/* V · Vitrine */}
            <section className="space-y-5" aria-label="Vitrine">
              <SectionLabel numeral="V">Vitrine</SectionLabel>
              <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
                <ToggleCell
                  title="Publicado"
                  text="Visível na coleção e no Atelier"
                  checked={form.is_active}
                  onChange={(v) => setField('is_active', v)}
                />
                <ToggleCell
                  title="Destaque"
                  text="Marcada como destaque da coleção"
                  checked={form.is_featured}
                  onChange={(v) => setField('is_featured', v)}
                />
                <div className="bg-surface p-4">
                  <label htmlFor={fieldId('sort_order')} className="text-sm text-ivory">
                    Ordem
                  </label>
                  <input
                    id={fieldId('sort_order')}
                    type="number"
                    inputMode="numeric"
                    step={1}
                    value={form.sort_order}
                    onChange={(e) => setField('sort_order', e.target.value)}
                    aria-invalid={Boolean(errors.sort_order)}
                    className="field mt-2 py-2 text-sm tabular-nums"
                  />
                  <p className={cn('mt-1.5 text-xs', errors.sort_order ? 'text-danger' : 'text-smoke')}>
                    {errors.sort_order ?? 'Menor número aparece primeiro'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="sticky bottom-0 z-10 border-t border-line-gold bg-surface/95 px-6 py-4 backdrop-blur sm:px-8">
          {confirmDiscard ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="text-sm text-parchment">
                {uploading > 0 ? 'Há imagens em envio e alterações não salvas.' : 'Há alterações não salvas.'} Deseja descartá-las?
              </p>
              <div className="flex gap-3 sm:shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(false)} data-autofocus>
                  Continuar editando
                </Button>
                <DangerButton onClick={discardAndClose}>Descartar</DangerButton>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5 text-sm" aria-live="polite">
                {formError ? (
                  <p className="flex items-start gap-2 text-danger">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    {formError}
                  </p>
                ) : uploading > 0 ? (
                  <p className="flex items-center gap-2 text-mist">
                    <LoaderCircle className="h-4 w-4 animate-spin text-gold" aria-hidden />
                    Enviando {uploading} {uploading === 1 ? 'imagem' : 'imagens'}
                  </p>
                ) : (
                  <p className="text-smoke">{dirty ? 'Alterações não salvas' : 'Nenhuma alteração pendente'}</p>
                )}
              </div>
              <div className="flex gap-3 sm:shrink-0">
                <Button variant="ghost" size="sm" onClick={requestClose} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" loading={saving} disabled={uploading > 0}>
                  {product ? 'Salvar alterações' : 'Criar peça'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------
// Subcomponentes
// ------------------------------------------------------------
function SizesInput({ id, value, onChange }: { id: string; value: string[]; onChange: (sizes: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const parts = raw
      .split(/[,;\n]/)
      .map((s) => s.trim().slice(0, 12))
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    parts.forEach((p) => {
      if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    });
    onChange(next);
    setDraft('');
  };

  return (
    <div>
      <div className="flex min-h-[3.05rem] flex-wrap items-center gap-2 border border-line bg-ivory/[0.025] px-2 py-2 transition-colors duration-300 focus-within:border-gold/65">
        {value.map((size) => (
          <span
            key={size}
            className="inline-flex items-center gap-1 border border-line-gold bg-gold/10 py-1 pl-2.5 pr-1 text-xs tracking-wide text-gold-light"
          >
            {size}
            <button
              type="button"
              onClick={() => onChange(value.filter((s) => s !== size))}
              aria-label={`Remover tamanho ${size}`}
              className="grid h-5 w-5 place-items-center text-gold/70 transition-colors hover:text-ivory"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          placeholder={value.length ? 'Adicionar' : 'Digite e tecle Enter'}
          autoComplete="off"
          className="min-w-24 flex-1 bg-transparent px-1.5 py-1 text-sm text-ivory placeholder:text-smoke focus:outline-none"
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[0.6rem] uppercase tracking-[0.22em] text-smoke">Atalhos</span>
        {SIZE_PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => onChange(preset.sizes)} className="link-luxe pb-1 text-[0.62rem] text-parchment">
            {preset.label}
          </button>
        ))}
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-[0.62rem] uppercase tracking-[0.2em] text-smoke hover:text-danger">
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  options: { id: T; label: string }[];
  value: T[];
  onChange: (value: T[]) => void;
}) {
  const labelId = useId();
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span id={labelId} className="label mb-0">
          {label}
        </span>
        {value.length > 0 ? (
          <button type="button" onClick={() => onChange([])} className="text-xs text-smoke transition-colors hover:text-gold-light">
            Limpar seleção
          </button>
        ) : (
          <span className="text-xs text-smoke">{hint}</span>
        )}
      </div>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              className="chip"
              data-active={active}
              aria-pressed={active}
              onClick={() => onChange(active ? value.filter((v) => v !== o.id) : [...value, o.id])}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleCell({
  title,
  text,
  checked,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 bg-surface p-4">
      <div>
        <p className="text-sm text-ivory">{title}</p>
        <p className="mt-1 text-xs leading-snug text-smoke">{text}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} className="mt-0.5" />
    </div>
  );
}
