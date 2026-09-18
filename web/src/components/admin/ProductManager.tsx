'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Images, Pencil, Plus, SearchX, Shirt, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ColorDot } from '@/components/ui/Swatch';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { invalidateCatalog } from '@/lib/catalog';
import { cn, formatBRL } from '@/lib/format';
import { SLOT_LABELS } from '@/lib/stylist/knowledge';
import { PRODUCT_CATEGORIES, type Product } from '@/lib/types';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  InlineError,
  LoadingRows,
  RefreshButton,
  SearchField,
  Segmented,
  SectionLabel,
  SelectBox,
  Switch,
  Thumb,
} from './AdminUI';
import { ProductForm } from './ProductForm';
import { BatchUpload } from './BatchUpload';
import { describeError, normalizeSearch, productImages, removeBucketFiles, urlsInUse } from './admin-utils';
import type { Resource } from './useAdminData';

export type ProductStatusFilter = 'all' | 'active' | 'featured' | 'draft';

type ProductPatch = Partial<Pick<Product, 'is_active' | 'is_featured' | 'sort_order'>>;

type ModalState = { type: 'form'; product: Product | null } | { type: 'batch' } | null;

const NO_PERMISSION = 'Nenhuma alteração foi aplicada. Confirme que sua conta tem papel de administração.';

interface ProductManagerProps {
  resource: Resource<Product>;
  status: ProductStatusFilter;
  onStatusChange: (status: ProductStatusFilter) => void;
}

/** Acervo: busca, filtros, publicação, destaque, ordem, edição e exclusão das peças. */
export function ProductManager({ resource, status, onStatusChange }: ProductManagerProps) {
  const { data: products, loading, refreshing, error, reload, setData } = resource;
  const { toast } = useUI();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [modal, setModal] = useState<ModalState>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const deletingRef = useRef(false);

  const afterMutation = useCallback(async () => {
    invalidateCatalog();
    await reload();
  }, [reload]);

  // ---------------------------------------------------------- filtros
  const categories = useMemo(() => {
    const known = PRODUCT_CATEGORIES as readonly string[];
    const extra = Array.from(new Set(products.map((p) => p.category).filter((c) => c && !known.includes(c))));
    return [...known, ...extra.sort((a, b) => a.localeCompare(b, 'pt-BR'))];
  }, [products]);

  const counts = useMemo(() => {
    const active = products.filter((p) => p.is_active).length;
    const featured = products.filter((p) => p.is_featured).length;
    return { all: products.length, active, featured, draft: products.length - active };
  }, [products]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return products.filter((p) => {
      if (status === 'active' && !p.is_active) return false;
      if (status === 'featured' && !p.is_featured) return false;
      if (status === 'draft' && p.is_active) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (q && !normalizeSearch(`${p.name} ${p.color_name ?? ''} ${p.fabric ?? ''}`).includes(q)) return false;
      return true;
    });
  }, [products, query, category, status]);

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    onStatusChange('all');
  };

  // ---------------------------------------------------------- mutações rápidas
  const setRowBusy = (id: string, on: boolean) =>
    setBusy((prev) => {
      const next = { ...prev };
      if (on) next[id] = true;
      else delete next[id];
      return next;
    });

  const patchProduct = async (product: Product, patch: ProductPatch, successMessage: string) => {
    const revert = Object.fromEntries(Object.keys(patch).map((k) => [k, product[k as keyof ProductPatch]])) as ProductPatch;
    setRowBusy(product.id, true);
    setData((list) => list.map((p) => (p.id === product.id ? { ...p, ...patch } : p)));
    try {
      const { data, error: updateError } = await supabase.from('products').update(patch).eq('id', product.id).select('id');
      if (updateError) throw updateError;
      if (!data || data.length === 0) throw new Error(NO_PERMISSION);
      toast(successMessage, 'success');
      await afterMutation();
    } catch (err) {
      setData((list) => list.map((p) => (p.id === product.id ? { ...p, ...revert } : p)));
      toast(describeError(err, 'Não foi possível atualizar a peça.'), 'error');
    } finally {
      setRowBusy(product.id, false);
    }
  };

  const togglePublished = (p: Product, next: boolean) =>
    void patchProduct(p, { is_active: next }, next ? `“${p.name}” publicada na coleção.` : `“${p.name}” voltou para rascunho.`);

  const toggleFeatured = (p: Product) =>
    void patchProduct(
      p,
      { is_featured: !p.is_featured },
      p.is_featured ? `“${p.name}” removida do Carrossel 3D.` : `“${p.name}” adicionada ao Carrossel 3D com sucesso!`,
    );

  const changeOrder = (p: Product, order: number) => void patchProduct(p, { sort_order: order }, 'Ordem atualizada.');

  // ---------------------------------------------------------- exclusão
  const cancelDelete = useCallback(() => {
    if (!deletingRef.current) setToDelete(null);
  }, []);

  const confirmDelete = async () => {
    const target = toDelete;
    if (!target || deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      const { data, error: deleteError } = await supabase.from('products').delete().eq('id', target.id).select('id');
      if (deleteError) throw deleteError;
      if (!data || data.length === 0) throw new Error('Nenhuma peça foi excluída. Confirme que sua conta tem papel de administração.');

      setData((list) => list.filter((p) => p.id !== target.id));
      const inUse = urlsInUse(products, target.id);
      const files = productImages(target).filter((u) => !inUse.has(u));
      try {
        await removeBucketFiles(files);
        toast(`“${target.name}” foi excluída.`, 'success');
      } catch {
        toast('Peça excluída, mas a foto não pôde ser removida do Storage.', 'info');
      }
      deletingRef.current = false;
      setToDelete(null);
      await afterMutation();
    } catch (err) {
      toast(describeError(err, 'Não foi possível excluir a peça.'), 'error');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------- modais
  const closeModal = useCallback(() => setModal(null), []);

  const handleSaved = useCallback(async () => {
    setModal(null);
    await afterMutation();
  }, [afterMutation]);

  const showDrafts = useCallback(() => {
    setModal(null);
    setQuery('');
    setCategory('all');
    onStatusChange('draft');
  }, [onStatusChange]);

  // ---------------------------------------------------------- render
  let body: React.ReactNode;
  if (loading) {
    body = <LoadingRows rows={6} label="Carregando o acervo" />;
  } else if (error && products.length === 0) {
    body = <ErrorState message={error} onRetry={() => void reload()} retrying={refreshing} />;
  } else if (products.length === 0) {
    body = (
      <EmptyState
        icon={Shirt}
        title="O acervo ainda está vazio"
        action={
          <>
            <Button size="sm" onClick={() => setModal({ type: 'form', product: null })}>
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Nova peça
            </Button>
            <Button variant="outline" size="sm" onClick={() => setModal({ type: 'batch' })}>
              <Images className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Enviar fotos em lote
            </Button>
          </>
        }
      >
        Cadastre a primeira peça ou envie várias fotos de uma vez. Enquanto o acervo estiver vazio, a vitrine exibe as peças de
        apresentação.
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Nenhuma peça encontrada"
        action={
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        }
      >
        Ajuste a busca, a categoria ou o status para ver outras peças.
      </EmptyState>
    );
  } else {
    body = (
      <>
        <div className="overflow-x-auto border border-line bg-surface/40">
          <table className="w-full min-w-[58rem] border-collapse text-left">
            <caption className="sr-only">Peças do acervo</caption>
            <thead>
              <tr className="border-b border-line-gold text-[0.6rem] uppercase tracking-[0.22em] text-smoke">
                <th scope="col" className="py-3.5 pl-4 pr-3 font-medium">
                  Peça
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Categoria
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Preço
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Publicado
                </th>
                <th scope="col" className="px-3 py-3.5 text-center font-medium text-gold">
                  ⭐ Carrossel 3D
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Ordem
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-4 text-right font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((p) => {
                const rowBusy = Boolean(busy[p.id]);
                const details = [p.color_name, p.fabric].filter(Boolean).join(' · ');
                return (
                  <tr key={p.id} className={cn('transition-colors duration-300 hover:bg-ivory/[0.02]', rowBusy && 'opacity-70')}>
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-4">
                        <Thumb src={p.image_url} alt={p.name} className="h-16 w-12" />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setModal({ type: 'form', product: p })}
                            className="block max-w-[20rem] truncate text-left text-sm text-ivory transition-colors hover:text-gold-light"
                          >
                            {p.name}
                          </button>
                          <p className="mt-1 flex max-w-[20rem] items-center gap-2 text-xs text-smoke">
                            {p.hex_color && <ColorDot hex={p.hex_color} size={10} />}
                            <span className="truncate">{details || 'Cor e tecido não informados'}</span>
                          </p>
                          <p className="mt-1.5 flex flex-wrap gap-1.5">
                            {!p.is_active && (
                              <span className="border border-line px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] text-mist">
                                Rascunho
                              </span>
                            )}
                            {!p.image_url && (
                              <span className="border border-danger/30 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] text-danger">
                                Sem foto
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <p className="text-parchment">{p.category || 'Sem categoria'}</p>
                      <p className="mt-1 text-xs text-smoke">{SLOT_LABELS[p.slot]}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm tabular-nums">
                      {p.price_cents === null ? (
                        <span className="font-display text-base italic text-mist">Sob consulta</span>
                      ) : (
                        <span className="text-ivory">{formatBRL(p.price_cents)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Switch
                          checked={p.is_active}
                          onChange={(next) => togglePublished(p, next)}
                          label={`Publicar ${p.name}`}
                          disabled={rowBusy}
                        />
                        <span className={cn('text-xs', p.is_active ? 'text-gold-light' : 'text-smoke')}>
                          {p.is_active ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(p)}
                        disabled={rowBusy}
                        title={p.is_featured ? 'Remover do Carrossel 3D' : 'Exibir no Carrossel 3D da Loja'}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
                          p.is_featured
                            ? 'bg-gold/15 border border-line-gold text-gold-light shadow-sm shadow-gold/20 hover:bg-gold/25'
                            : 'border border-line text-smoke hover:border-line-gold hover:text-gold'
                        )}
                      >
                        <Star className={cn('h-3.5 w-3.5', p.is_featured && 'fill-gold text-gold')} strokeWidth={1.5} />
                        <span>{p.is_featured ? 'No Carrossel' : '+ Destacar'}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <OrderInput
                        key={`${p.id}-${p.sort_order}`}
                        value={p.sort_order}
                        label={`Ordem de ${p.name}`}
                        disabled={rowBusy}
                        onCommit={(order) => changeOrder(p, order)}
                      />
                    </td>
                    <td className="py-3 pl-3 pr-4">
                      <div className="flex justify-end gap-1">
                        <IconButton label={`Editar ${p.name}`} onClick={() => setModal({ type: 'form', product: p })}>
                          <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                        </IconButton>
                        <IconButton label={`Excluir ${p.name}`} tone="danger" onClick={() => setToDelete(p)} disabled={rowBusy}>
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-smoke" aria-live="polite">
          {filtered.length === products.length
            ? `${products.length} ${products.length === 1 ? 'peça' : 'peças'} no acervo`
            : `Mostrando ${filtered.length} de ${products.length} peças`}
          {' · '}menor ordem aparece primeiro na vitrine
        </p>
      </>
    );
  }

  return (
    <section aria-labelledby="acervo-titulo">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SectionLabel numeral="I">Acervo</SectionLabel>
          <h2 id="acervo-titulo" className="mt-3 font-display text-3xl text-ivory sm:text-4xl">
            Peças da <em className="italic text-gold-light">casa</em>
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist">
            Somente as peças publicadas aparecem na coleção e alimentam as sugestões da consultoria.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" size="sm" onClick={() => setModal({ type: 'batch' })}>
            <Images className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Enviar fotos em lote
          </Button>
          <Button size="sm" onClick={() => setModal({ type: 'form', product: null })}>
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Nova peça
          </Button>
        </div>
      </div>

      {!loading && products.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-center">
            <SearchField value={query} onChange={setQuery} label="Buscar peça por nome" placeholder="Buscar por nome, cor ou tecido" />
            <SelectBox value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoria">
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectBox>
            <RefreshButton onClick={() => void reload()} busy={refreshing} />
          </div>
          <Segmented<ProductStatusFilter>
            label="Filtrar por status"
            value={status}
            onChange={onStatusChange}
            options={[
              { id: 'all', label: 'Todas as Peças', count: counts.all },
              { id: 'featured', label: '⭐ Carrossel 3D', count: counts.featured },
              { id: 'active', label: 'Publicadas', count: counts.active },
              { id: 'draft', label: 'Rascunhos', count: counts.draft },
            ]}
          />
        </div>
      )}

      {error && products.length > 0 && (
        <div className="mt-6">
          <InlineError message={error} onRetry={() => void reload()} retrying={refreshing} />
        </div>
      )}

      <div className="mt-6">{body}</div>

      <AnimatePresence>
        {modal?.type === 'form' && (
          <ProductForm
            key={modal.product?.id ?? 'nova-peca'}
            product={modal.product}
            products={products}
            onClose={closeModal}
            onSaved={handleSaved}
          />
        )}
        {modal?.type === 'batch' && (
          <BatchUpload key="lote" products={products} onClose={closeModal} onFinished={afterMutation} onShowDrafts={showDrafts} />
        )}
        {toDelete && (
          <ConfirmDialog
            key="excluir-peca"
            title="Excluir peça"
            confirmLabel="Excluir definitivamente"
            tone="danger"
            busy={deleting}
            onConfirm={() => void confirmDelete()}
            onCancel={cancelDelete}
          >
            <p>
              <span className="text-ivory">“{toDelete.name}”</span> será removida do acervo, da coleção e das sugestões da consultoria.
            </p>
            <p className="mt-3">
              As fotos enviadas ao Storage também serão apagadas, exceto as usadas por outras peças. Esta ação não pode ser
              desfeita.
            </p>
            {toDelete.is_active && (
              <p className="mt-3 text-xs text-smoke">Para apenas tirar a peça da vitrine, desligue “Publicado”.</p>
            )}
          </ConfirmDialog>
        )}
      </AnimatePresence>
    </section>
  );
}

/** Campo de ordem: grava ao sair do campo ou ao teclar Enter. */
function OrderInput({
  value,
  label,
  disabled,
  onCommit,
}: {
  value: number;
  label: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const valid = /^-?\d{1,6}$/.test(draft.trim());

  const commit = () => {
    if (!valid) {
      setDraft(String(value));
      return;
    }
    const next = Number.parseInt(draft, 10);
    if (next !== value) onCommit(next);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      step={1}
      value={draft}
      disabled={disabled}
      aria-label={label}
      aria-invalid={!valid}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          setDraft(String(value));
        }
      }}
      className={cn('field w-20 px-2.5 py-1.5 text-sm tabular-nums', !valid && 'border-danger/60')}
    />
  );
}
