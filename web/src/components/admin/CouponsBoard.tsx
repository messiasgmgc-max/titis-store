'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Copy, Pencil, Plus, SearchX, TicketPercent } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { COUPON_PLANS, applyCoupon, normalizeCode, validateCouponInput, type CouponStatus } from '@/lib/coupons';
import { cn, formatBRL, formatDateBR } from '@/lib/format';
import { getPlan } from '@/lib/site';
import type { PlanId } from '@/lib/types';
import {
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  InlineError,
  LoadingRows,
  PillOption,
  RefreshButton,
  SearchField,
  Segmented,
  SectionLabel,
  Switch,
} from './AdminUI';
import {
  COUPON_COLUMNS,
  COUPON_STATUSES,
  centsToInput,
  couponDiscountLabel,
  couponStatusOf,
  describeError,
  formatTimeBR,
  fromDateTimeInput,
  normalizeCoupon,
  normalizeSearch,
  parsePriceToCents,
  toDateTimeInput,
  type AdminCoupon,
} from './admin-utils';
import type { Resource } from './useAdminData';

type StatusFilter = 'all' | CouponStatus;
type DiscountKind = 'percent' | 'amount';

const STATUS_TONE: Record<CouponStatus, { dot: string; text: string }> = {
  active: { dot: 'bg-success', text: 'text-success' },
  inactive: { dot: 'bg-smoke', text: 'text-mist' },
  expired: { dot: 'bg-danger', text: 'text-danger' },
  exhausted: { dot: 'bg-gold', text: 'text-gold-light' },
};

const statusLabel = (id: CouponStatus) => COUPON_STATUSES.find((s) => s.id === id)?.label ?? id;

interface CouponForm {
  code: string;
  description: string;
  kind: DiscountKind;
  percent: string;
  amount: string;
  plans: PlanId[];
  maxUses: string;
  expiresAt: string;
  isActive: boolean;
}

function emptyForm(): CouponForm {
  return { code: '', description: '', kind: 'percent', percent: '10', amount: '', plans: [], maxUses: '', expiresAt: '', isActive: true };
}

function formFrom(c: AdminCoupon): CouponForm {
  return {
    code: c.code,
    description: c.description ?? '',
    kind: c.percent_off !== null ? 'percent' : 'amount',
    percent: c.percent_off !== null ? String(c.percent_off) : '10',
    amount: c.amount_off_cents !== null ? centsToInput(c.amount_off_cents) : '',
    plans: c.plans,
    maxUses: c.max_uses !== null ? String(c.max_uses) : '',
    expiresAt: toDateTimeInput(c.expires_at),
    isActive: c.is_active,
  };
}

function plansLabel(plans: PlanId[]): string {
  if (plans.length === 0) return 'Todos os planos';
  return plans.map((p) => getPlan(p)?.name ?? p).join(' · ');
}

/** Cupons de desconto do checkout: lista, criação, edição, ativação e cópia do código. */
export function CouponsBoard({ resource }: { resource: Resource<AdminCoupon> }) {
  const { data: coupons, loading, refreshing, error, reload, setData } = resource;
  const { toast } = useUI();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [editing, setEditing] = useState<{ id: string | null; form: CouponForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = { all: coupons.length, active: 0, inactive: 0, expired: 0, exhausted: 0 };
    coupons.forEach((c) => {
      base[couponStatusOf(c)] += 1;
    });
    return base;
  }, [coupons]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return coupons.filter((c) => {
      if (filter !== 'all' && couponStatusOf(c) !== filter) return false;
      if (!q) return true;
      return normalizeSearch(`${c.code} ${c.description ?? ''} ${plansLabel(c.plans)}`).includes(q);
    });
  }, [coupons, filter, query]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast(`Código ${code} copiado.`, 'success');
    } catch {
      toast('Não foi possível copiar. Selecione o código e copie manualmente.', 'error');
    }
  };

  const toggleActive = async (coupon: AdminCoupon, next: boolean) => {
    if (togglingId) return;
    setTogglingId(coupon.id);
    setData((list) => list.map((c) => (c.id === coupon.id ? { ...c, is_active: next } : c)));
    try {
      const { data, error: updateError } = await supabase.from('coupons').update({ is_active: next }).eq('id', coupon.id).select('id');
      if (updateError) throw updateError;
      if (!data || data.length === 0) throw new Error('Nenhuma alteração foi aplicada. Confirme que sua conta tem papel de administração.');
      toast(`Cupom ${coupon.code} ${next ? 'ativado' : 'desativado'}.`, 'success');
    } catch (err) {
      setData((list) => list.map((c) => (c.id === coupon.id ? { ...c, is_active: coupon.is_active } : c)));
      toast(describeError(err, 'Não foi possível alterar o cupom.'), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const openNew = () => {
    setFormErrors([]);
    setEditing({ id: null, form: emptyForm() });
  };

  const openEdit = (c: AdminCoupon) => {
    setFormErrors([]);
    setEditing({ id: c.id, form: formFrom(c) });
  };

  const closeEditor = useCallback(() => {
    setEditing((current) => (saving ? current : null));
  }, [saving]);

  const patchForm = (patch: Partial<CouponForm>) => setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  const saveCoupon = async () => {
    if (!editing || saving) return;
    const f = editing.form;
    const code = normalizeCode(f.code);
    const percent = f.kind === 'percent' ? (f.percent.trim() === '' ? Number.NaN : Number(f.percent)) : null;
    const amountParsed = f.kind === 'amount' ? parsePriceToCents(f.amount) : null;
    const amount = f.kind === 'amount' ? (amountParsed === undefined || amountParsed === null ? Number.NaN : amountParsed) : null;
    const maxUses = f.maxUses.trim() === '' ? null : Number(f.maxUses);
    const expiresAt = f.expiresAt.trim() === '' ? null : (fromDateTimeInput(f.expiresAt) ?? 'invalid');

    const errors = validateCouponInput({
      code,
      percent_off: percent,
      amount_off_cents: amount,
      plans: f.plans,
      max_uses: maxUses,
      expires_at: expiresAt,
    });
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors([]);

    const payload = {
      code,
      description: f.description.trim() || null,
      percent_off: percent,
      amount_off_cents: amount,
      plans: f.plans,
      max_uses: maxUses,
      expires_at: expiresAt,
      is_active: f.isActive,
    };

    setSaving(true);
    try {
      const request = editing.id
        ? supabase.from('coupons').update(payload).eq('id', editing.id).select(COUPON_COLUMNS).single()
        : supabase.from('coupons').insert(payload).select(COUPON_COLUMNS).single();
      const { data, error: saveError } = await request;
      if (saveError) {
        if (saveError.code === '23505') throw new Error(`Já existe um cupom com o código ${code}.`);
        throw saveError;
      }
      const saved = normalizeCoupon((data ?? {}) as Record<string, unknown>);
      setData((list) => (editing.id ? list.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...list]));
      toast(editing.id ? `Cupom ${saved.code} atualizado.` : `Cupom ${saved.code} criado.`, 'success');
      setSaving(false);
      setEditing(null);
      await reload();
    } catch (err) {
      toast(describeError(err, 'Não foi possível salvar o cupom.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingRows rows={4} label="Carregando os cupons" />;
  } else if (error && coupons.length === 0) {
    body = <ErrorState message={error} onRetry={() => void reload()} retrying={refreshing} />;
  } else if (coupons.length === 0) {
    body = (
      <EmptyState
        icon={TicketPercent}
        title="Nenhum cupom criado"
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Criar cupom
          </Button>
        }
      >
        Crie códigos com desconto percentual ou fixo, limite de usos e validade. O cliente digita o código no checkout.
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Nenhum cupom encontrado"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            Limpar filtros
          </Button>
        }
      >
        Ajuste a busca ou o filtro de situação.
      </EmptyState>
    );
  } else {
    body = (
      <div className="overflow-x-auto rounded-3xl border border-line bg-surface/40">
        <table className="w-full min-w-[58rem] border-collapse text-left">
          <caption className="sr-only">Cupons de desconto</caption>
          <thead>
            <tr className="border-b border-line-gold text-[0.6rem] uppercase tracking-[0.22em] text-smoke">
              <th scope="col" className="py-3.5 pl-4 pr-3 font-semibold">
                Código
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold">
                Desconto
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold">
                Planos
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold">
                Usos
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold">
                Validade
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold">
                Situação
              </th>
              <th scope="col" className="py-3.5 pl-3 pr-4 text-right font-semibold">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((c) => {
              const status = couponStatusOf(c);
              const tone = STATUS_TONE[status];
              return (
                <tr key={c.id} className={cn('transition-colors duration-300 hover:bg-ivory/[0.02]', !c.is_active && 'opacity-70')}>
                  <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-2">
                      <code className="rounded-full border border-line-gold bg-gold/[0.06] px-3 py-1 text-xs font-bold tracking-[0.14em] text-gold-light">
                        {c.code}
                      </code>
                      <IconButton label={`Copiar código ${c.code}`} onClick={() => void copyCode(c.code)}>
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      </IconButton>
                    </div>
                    {c.description && <p className="mt-1 max-w-[16rem] truncate text-xs text-smoke">{c.description}</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm font-semibold tabular-nums text-ivory">{couponDiscountLabel(c)}</td>
                  <td className="px-3 py-3 text-sm text-parchment">{plansLabel(c.plans)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm tabular-nums text-parchment">
                    {c.used_count}
                    <span className="text-smoke"> / {c.max_uses === null ? '∞' : c.max_uses}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-parchment">
                    {c.expires_at ? (
                      <>
                        {formatDateBR(c.expires_at)}
                        <span className="ml-1.5 text-xs tabular-nums text-smoke">{formatTimeBR(c.expires_at)}</span>
                      </>
                    ) : (
                      <span className="text-smoke">Sem validade</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-hidden />
                      <span className={cn('text-sm font-semibold', tone.text)}>{statusLabel(status)}</span>
                    </span>
                  </td>
                  <td className="py-3 pl-3 pr-4">
                    <div className="flex items-center justify-end gap-3">
                      <Switch
                        checked={c.is_active}
                        onChange={(next) => void toggleActive(c, next)}
                        label={c.is_active ? `Desativar cupom ${c.code}` : `Ativar cupom ${c.code}`}
                        disabled={togglingId === c.id}
                      />
                      <IconButton label={`Editar cupom ${c.code}`} onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const form = editing?.form;
  const previewBase = form ? (form.plans.length === 1 ? (getPlan(form.plans[0])?.priceCents ?? 4990) : 4990) : 0;
  const previewPercent = form && form.kind === 'percent' ? Number(form.percent) : null;
  const previewAmountParsed = form && form.kind === 'amount' ? parsePriceToCents(form.amount) : null;
  const previewAmount = typeof previewAmountParsed === 'number' ? previewAmountParsed : null;
  const previewValid =
    form !== undefined &&
    ((form.kind === 'percent' && Number.isInteger(previewPercent) && previewPercent! >= 1 && previewPercent! <= 100) ||
      (form.kind === 'amount' && previewAmount !== null));
  const previewMath = previewValid ? applyCoupon(previewBase, { percent_off: previewPercent, amount_off_cents: previewAmount }) : null;

  return (
    <section aria-labelledby="cupons-titulo">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel numeral="V">Cupons</SectionLabel>
          <h2 id="cupons-titulo" className="mt-3 font-display text-3xl font-extrabold text-ivory sm:text-4xl">
            Cupons de <span className="text-gold-light">desconto</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
            Códigos que o cliente digita no checkout dos planos. O desconto é sempre recalculado no servidor; desativar um cupom
            mantém o histórico e impede novos usos.
          </p>
        </div>
        {coupons.length > 0 && (
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Criar cupom
          </Button>
        )}
      </div>

      {!loading && coupons.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <SearchField value={query} onChange={setQuery} label="Buscar cupom" placeholder="Buscar por código, descrição ou plano" />
            <RefreshButton onClick={() => void reload()} busy={refreshing} />
          </div>
          <Segmented<StatusFilter>
            label="Filtrar cupons por situação"
            value={filter}
            onChange={setFilter}
            options={[{ id: 'all', label: 'Todos', count: counts.all }, ...COUPON_STATUSES.map((s) => ({ id: s.id, label: s.plural, count: counts[s.id] }))]}
          />
        </div>
      )}

      {error && coupons.length > 0 && (
        <div className="mt-6">
          <InlineError message={error} onRetry={() => void reload()} retrying={refreshing} />
        </div>
      )}

      <div className="mt-6">{body}</div>

      <AnimatePresence>
        {editing && form && (
          <Modal key="cupom" onClose={closeEditor} title={editing.id ? `Editar cupom ${form.code || ''}` : 'Novo cupom'} showTitle className="rounded-3xl">
            <form
              className="px-6 pb-6 pt-4 sm:px-8 sm:pb-8"
              onSubmit={(e) => {
                e.preventDefault();
                void saveCoupon();
              }}
            >
              {formErrors.length > 0 && (
                <ul className="mb-5 space-y-1 rounded-2xl border border-danger/30 bg-danger/[0.04] px-4 py-3 text-sm text-parchment" role="alert">
                  {formErrors.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Field label="Código" htmlFor="cupom-codigo" hint="3 a 24 caracteres: letras, números, hífen ou sublinhado. Guardado em caixa-alta.">
                  <input
                    id="cupom-codigo"
                    value={form.code}
                    onChange={(e) => patchForm({ code: normalizeCode(e.target.value) })}
                    maxLength={24}
                    placeholder="BEMVINDO"
                    autoComplete="off"
                    spellCheck={false}
                    data-autofocus
                    className="field rounded-2xl font-bold uppercase tracking-[0.14em]"
                  />
                </Field>
                <Field label="Descrição" htmlFor="cupom-descricao" hint="Só a administração vê.">
                  <input
                    id="cupom-descricao"
                    value={form.description}
                    onChange={(e) => patchForm({ description: e.target.value })}
                    maxLength={160}
                    placeholder="20% na primeira compra"
                    className="field rounded-2xl"
                  />
                </Field>
              </div>

              <p className="label mt-5">Tipo de desconto</p>
              <div role="group" aria-label="Tipo de desconto" className="mt-2 flex flex-wrap gap-2">
                <PillOption active={form.kind === 'percent'} onClick={() => patchForm({ kind: 'percent' })}>
                  Percentual
                </PillOption>
                <PillOption active={form.kind === 'amount'} onClick={() => patchForm({ kind: 'amount' })}>
                  Valor fixo
                </PillOption>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {form.kind === 'percent' ? (
                  <Field label="Percentual (%)" htmlFor="cupom-pct">
                    <input
                      id="cupom-pct"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={100}
                      step={1}
                      value={form.percent}
                      onChange={(e) => patchForm({ percent: e.target.value })}
                      className="field rounded-2xl tabular-nums"
                    />
                  </Field>
                ) : (
                  <Field label="Valor do desconto (R$)" htmlFor="cupom-valor">
                    <input
                      id="cupom-valor"
                      inputMode="decimal"
                      value={form.amount}
                      onChange={(e) => patchForm({ amount: e.target.value })}
                      placeholder="10,00"
                      className="field rounded-2xl tabular-nums"
                    />
                  </Field>
                )}
                <div className="rounded-2xl border border-line bg-obsidian/60 px-4 py-3" aria-live="polite">
                  <p className="text-[0.6rem] uppercase tracking-[0.22em] text-smoke">Exemplo</p>
                  {previewMath ? (
                    <p className="mt-1.5 text-sm text-parchment">
                      {formatBRL(previewBase)} → <span className="font-semibold text-ivory">{formatBRL(previewMath.finalCents)}</span>
                      <span className="ml-2 text-xs text-smoke">(−{formatBRL(previewMath.discountCents)})</span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-sm text-smoke">Informe o desconto para ver o exemplo.</p>
                  )}
                </div>
              </div>

              <p className="label mt-5">Planos aceitos</p>
              <div role="group" aria-label="Planos aceitos" className="mt-2 flex flex-wrap gap-2">
                <PillOption active={form.plans.length === 0} onClick={() => patchForm({ plans: [] })}>
                  Todos
                </PillOption>
                {COUPON_PLANS.map((id) => {
                  const active = form.plans.includes(id);
                  return (
                    <PillOption
                      key={id}
                      active={active}
                      onClick={() => patchForm({ plans: active ? form.plans.filter((p) => p !== id) : [...form.plans, id] })}
                    >
                      {getPlan(id)?.name ?? id}
                    </PillOption>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Field label="Limite de usos" htmlFor="cupom-limite" hint="Vazio = ilimitado.">
                  <input
                    id="cupom-limite"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={form.maxUses}
                    onChange={(e) => patchForm({ maxUses: e.target.value })}
                    placeholder="∞"
                    className="field rounded-2xl tabular-nums"
                  />
                </Field>
                <Field label="Válido até" htmlFor="cupom-validade" hint="Vazio = sem validade.">
                  <input
                    id="cupom-validade"
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={(e) => patchForm({ expiresAt: e.target.value })}
                    className="field rounded-2xl text-sm"
                  />
                </Field>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ivory">{form.isActive ? 'Cupom ativo' : 'Cupom desativado'}</p>
                  <p className="mt-0.5 text-xs text-smoke">Desativado, o código não é aceito no checkout.</p>
                </div>
                <Switch checked={form.isActive} onChange={(next) => patchForm({ isActive: next })} label="Cupom ativo" />
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="ghost" size="sm" onClick={closeEditor} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" loading={saving}>
                  {editing.id ? 'Salvar cupom' : 'Criar cupom'}
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </AnimatePresence>
    </section>
  );
}
