'use client';

import { useMemo, useState } from 'react';
import { CreditCard, Megaphone, MessageCircle, Tags, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatBRL } from '@/lib/format';
import { normalizeWhatsappNumber, parseSettings, settingsToRows, type SettingKey, type SettingRow, type SiteSettings } from '@/lib/settings';
import { CHECKOUT_PROVIDER, CLUB_PLANS } from '@/lib/site';
import type { CheckoutProvider, PlanId } from '@/lib/types';
import { ErrorState, Field, InlineError, LoadingRows, PillOption, RefreshButton, SectionLabel, Switch } from './AdminUI';
import { centsToInput, describeError, displayPhone, formatShortDateBR, parsePriceToCents } from './admin-utils';
import type { Resource } from './useAdminData';

type IconComponent = React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;

/** Campos de texto dos planos (preço em reais, dias), separados do valor gravado. */
interface PlanDraft {
  price: string;
  days: string;
  active: boolean;
}

const DIGITAL_PLANS = CLUB_PLANS.filter((p) => p.accessDays !== null);

function planDrafts(settings: SiteSettings): Record<PlanId, PlanDraft> {
  const out = {} as Record<PlanId, PlanDraft>;
  for (const p of CLUB_PLANS) {
    const s = settings.plans[p.id];
    out[p.id] = { price: centsToInput(s.price_cents), days: s.access_days === null ? '' : String(s.access_days), active: s.active };
  }
  return out;
}

/** Configurações do site gravadas em public.settings, uma chave por bloco. */
export function SettingsPanel({ resource }: { resource: Resource<SettingRow> }) {
  const { data: rows, loading, refreshing, error, reload, setData } = resource;
  const { toast } = useUI();

  const saved = useMemo(() => parseSettings(rows), [rows]);
  const updatedAt = useMemo(() => {
    const map = new Map<SettingKey, string | null>();
    rows.forEach((r) => map.set(r.key, r.updated_at));
    return map;
  }, [rows]);

  const [whatsapp, setWhatsapp] = useState(saved.whatsapp.number);
  const [provider, setProvider] = useState<CheckoutProvider>(saved.checkout.provider);
  const [plans, setPlans] = useState<Record<PlanId, PlanDraft>>(() => planDrafts(saved));
  const [announcement, setAnnouncement] = useState(saved.announcement);
  const [savingKey, setSavingKey] = useState<SettingKey | null>(null);
  const [planErrors, setPlanErrors] = useState<Partial<Record<PlanId, string>>>({});

  // Sincroniza os rascunhos quando o banco chega (primeira carga) ou é recarregado
  // (ajuste de estado durante a renderização, sem efeito).
  const [syncedFrom, setSyncedFrom] = useState(saved);
  if (syncedFrom !== saved) {
    setSyncedFrom(saved);
    setWhatsapp(saved.whatsapp.number);
    setProvider(saved.checkout.provider);
    setPlans(planDrafts(saved));
    setAnnouncement(saved.announcement);
  }

  const persist = async (key: SettingKey, next: SiteSettings, message: string) => {
    if (savingKey) return;
    const row = settingsToRows(next).find((r) => r.key === key);
    if (!row) return;
    setSavingKey(key);
    try {
      const { data, error: upsertError } = await supabase
        .from('settings')
        .upsert({ key, value: row.value }, { onConflict: 'key' })
        .select('key, value, updated_at')
        .single();
      if (upsertError) throw upsertError;
      const savedRow = (data ?? {}) as Record<string, unknown>;
      const updated: SettingRow = {
        key,
        value: row.value,
        updated_at: typeof savedRow.updated_at === 'string' ? savedRow.updated_at : new Date().toISOString(),
      };
      setData((list) => (list.some((r) => r.key === key) ? list.map((r) => (r.key === key ? updated : r)) : [...list, updated]));
      toast(message, 'success');
    } catch (err) {
      toast(describeError(err, 'Não foi possível salvar a configuração.'), 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const saveWhatsapp = () => {
    const number = normalizeWhatsappNumber(whatsapp);
    if (!number) {
      toast('Informe o número com DDI e DDD, só dígitos (ex.: 5531996000213).', 'error');
      return;
    }
    setWhatsapp(number);
    void persist('whatsapp', { ...saved, whatsapp: { number } }, 'WhatsApp da loja atualizado.');
  };

  const saveCheckout = () => void persist('checkout', { ...saved, checkout: { provider } }, 'Provedor de checkout atualizado.');

  const savePlans = () => {
    const errors: Partial<Record<PlanId, string>> = {};
    const next: SiteSettings['plans'] = { ...saved.plans };
    for (const p of CLUB_PLANS) {
      const d = plans[p.id];
      if (p.accessDays === null) {
        next[p.id] = { ...saved.plans[p.id], active: d.active };
        continue;
      }
      const cents = parsePriceToCents(d.price);
      if (cents === undefined || cents === null || cents <= 0) {
        errors[p.id] = 'Informe um preço válido, maior que zero.';
        continue;
      }
      const days = Number(d.days);
      if (!Number.isInteger(days) || days < 1 || days > 3660) {
        errors[p.id] = 'Informe de 1 a 3660 dias de acesso.';
        continue;
      }
      next[p.id] = { price_cents: cents, access_days: days, active: d.active };
    }
    setPlanErrors(errors);
    if (Object.keys(errors).length > 0) return;
    void persist('plans', { ...saved, plans: next }, 'Planos atualizados.');
  };

  const saveAnnouncement = () => {
    const text = announcement.text.trim().slice(0, 280);
    if (announcement.active && !text) {
      toast('Escreva o aviso antes de ativá-lo.', 'error');
      return;
    }
    void persist('announcement', { ...saved, announcement: { text, active: announcement.active } }, 'Aviso do site atualizado.');
  };

  const mpEnvOn = CHECKOUT_PROVIDER === 'mercadopago';
  const whatsappDirty = whatsapp !== saved.whatsapp.number;
  const checkoutDirty = provider !== saved.checkout.provider;
  const plansDirty = JSON.stringify(plans) !== JSON.stringify(planDrafts(saved));
  const announcementDirty = announcement.text !== saved.announcement.text || announcement.active !== saved.announcement.active;

  const stamp = (key: SettingKey) => {
    const at = updatedAt.get(key);
    return at ? `Salvo em ${formatShortDateBR(at)}` : 'Padrão do site (ainda não salvo)';
  };

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingRows rows={4} label="Carregando as configurações" />;
  } else if (error && rows.length === 0) {
    body = <ErrorState message={error} onRetry={() => void reload()} retrying={refreshing} />;
  } else {
    body = (
      <div className="grid gap-6 lg:grid-cols-2">
        {/* WhatsApp ------------------------------------------------------------ */}
        <SettingsCard icon={MessageCircle} title="WhatsApp da loja" stamp={stamp('whatsapp')}>
          <Field label="Número" htmlFor="cfg-whatsapp" hint={`Só dígitos, com DDI e DDD. Exibido como ${displayPhone(whatsapp) || '—'}.`}>
            <input
              id="cfg-whatsapp"
              inputMode="numeric"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 15))}
              placeholder="5531996000213"
              className="field rounded-2xl tabular-nums"
            />
          </Field>
          <SaveRow dirty={whatsappDirty} busy={savingKey === 'whatsapp'} onSave={saveWhatsapp} />
        </SettingsCard>

        {/* Checkout ------------------------------------------------------------ */}
        <SettingsCard icon={CreditCard} title="Provedor de checkout" stamp={stamp('checkout')}>
          <p className="label">Como a compra é concluída</p>
          <div role="group" aria-label="Provedor de checkout" className="mt-2 flex flex-wrap gap-2">
            <PillOption active={provider === 'whatsapp'} onClick={() => setProvider('whatsapp')}>
              WhatsApp · liberação manual
            </PillOption>
            <PillOption active={provider === 'mercadopago'} onClick={() => setProvider('mercadopago')}>
              Mercado Pago · automático
            </PillOption>
          </div>
          <div
            className={cn(
              'mt-4 flex gap-3 rounded-2xl border px-4 py-3 text-xs leading-relaxed',
              provider === 'mercadopago' && !mpEnvOn ? 'border-danger/40 bg-danger/[0.05] text-parchment' : 'border-line text-mist',
            )}
            role={provider === 'mercadopago' && !mpEnvOn ? 'alert' : undefined}
          >
            <TriangleAlert className={cn('mt-0.5 h-4 w-4 shrink-0', provider === 'mercadopago' && !mpEnvOn ? 'text-danger' : 'text-gold')} strokeWidth={1.5} aria-hidden />
            <p>
              Este ajuste é informativo: o site decide pelo deploy. Neste deploy, <code className="text-gold-light">NEXT_PUBLIC_CHECKOUT_PROVIDER</code> está
              como <strong className="text-ivory">{CHECKOUT_PROVIDER}</strong>.
              {provider === 'mercadopago' && !mpEnvOn && (
                <> Para o Mercado Pago funcionar, cadastre a variável e as chaves do servidor na Vercel e faça redeploy (veja supabase/README.md, seção 3).</>
              )}
            </p>
          </div>
          <SaveRow dirty={checkoutDirty} busy={savingKey === 'checkout'} onSave={saveCheckout} />
        </SettingsCard>

        {/* Planos -------------------------------------------------------------- */}
        <SettingsCard icon={Tags} title="Planos" stamp={stamp('plans')} className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            {DIGITAL_PLANS.map((p) => {
              const d = plans[p.id];
              const err = planErrors[p.id];
              return (
                <div key={p.id} className={cn('rounded-2xl border px-4 py-4', d.active ? 'border-line' : 'border-line opacity-70')}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ivory">{p.name}</p>
                    <Switch checked={d.active} onChange={(next) => setPlans((s) => ({ ...s, [p.id]: { ...s[p.id], active: next } }))} label={`${p.name} ativo`} />
                  </div>
                  <Field label="Preço (R$)" htmlFor={`cfg-preco-${p.id}`} className="mt-3" error={err}>
                    <input
                      id={`cfg-preco-${p.id}`}
                      inputMode="decimal"
                      value={d.price}
                      onChange={(e) => setPlans((s) => ({ ...s, [p.id]: { ...s[p.id], price: e.target.value } }))}
                      className="field rounded-2xl py-2.5 text-sm tabular-nums"
                    />
                  </Field>
                  <Field label="Dias de acesso" htmlFor={`cfg-dias-${p.id}`} className="mt-3">
                    <input
                      id={`cfg-dias-${p.id}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={3660}
                      value={d.days}
                      onChange={(e) => setPlans((s) => ({ ...s, [p.id]: { ...s[p.id], days: e.target.value } }))}
                      className="field rounded-2xl py-2.5 text-sm tabular-nums"
                    />
                  </Field>
                  <p className="mt-2 text-xs text-smoke">
                    Salvo: {formatBRL(saved.plans[p.id].price_cents)} · {saved.plans[p.id].access_days ?? '—'} dias
                  </p>
                </div>
              );
            })}
            {CLUB_PLANS.filter((p) => p.accessDays === null).map((p) => (
              <div key={p.id} className={cn('rounded-2xl border border-line px-4 py-4', !plans[p.id].active && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ivory">{p.name}</p>
                  <Switch
                    checked={plans[p.id].active}
                    onChange={(next) => setPlans((s) => ({ ...s, [p.id]: { ...s[p.id], active: next } }))}
                    label={`${p.name} ativo`}
                  />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-smoke">Sob consulta, agendado pelo WhatsApp. Só é possível ligar ou desligar a exibição.</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-2xl border border-line-gold bg-gold/[0.04] px-4 py-3 text-xs leading-relaxed text-parchment">
            Estes valores valem para o checkout e para a liberação manual assim que o site for reconstruído (cache de até 5 minutos). Os
            textos e benefícios de cada plano continuam em <code className="text-gold-light">src/lib/site.ts</code>; enquanto a home não estiver
            ligada a estas configurações, os preços exibidos nela também vêm de lá.
          </p>
          <SaveRow dirty={plansDirty} busy={savingKey === 'plans'} onSave={savePlans} />
        </SettingsCard>

        {/* Aviso ---------------------------------------------------------------- */}
        <SettingsCard icon={Megaphone} title="Aviso no site" stamp={stamp('announcement')} className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <Field label="Texto" htmlFor="cfg-aviso" hint={`${announcement.text.length}/280 · aparece no topo do site quando ativo.`}>
              <textarea
                id="cfg-aviso"
                value={announcement.text}
                maxLength={280}
                rows={3}
                onChange={(e) => setAnnouncement((a) => ({ ...a, text: e.target.value }))}
                placeholder="Ex.: Agenda de setembro aberta para consultorias presenciais."
                className="field min-h-[5.5rem] resize-y rounded-2xl text-sm"
              />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3 md:mt-7 md:min-w-[12rem]">
              <p className="text-sm font-semibold text-ivory">{announcement.active ? 'Exibindo' : 'Oculto'}</p>
              <Switch checked={announcement.active} onChange={(next) => setAnnouncement((a) => ({ ...a, active: next }))} label="Aviso ativo" />
            </div>
          </div>
          <SaveRow dirty={announcementDirty} busy={savingKey === 'announcement'} onSave={saveAnnouncement} />
        </SettingsCard>
      </div>
    );
  }

  return (
    <section aria-labelledby="config-titulo">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel numeral="VI">Configurações</SectionLabel>
          <h2 id="config-titulo" className="mt-3 font-display text-3xl font-extrabold text-ivory sm:text-4xl">
            Ajustes da <span className="text-gold-light">casa</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
            WhatsApp, forma de pagamento, preços dos planos e aviso do site. Cada bloco é salvo separadamente.
          </p>
        </div>
        {!loading && <RefreshButton onClick={() => void reload()} busy={refreshing} />}
      </div>

      {error && rows.length > 0 && (
        <div className="mt-6">
          <InlineError message={error} onRetry={() => void reload()} retrying={refreshing} />
        </div>
      )}

      <div className="mt-8">{body}</div>
    </section>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  stamp,
  className,
  children,
}: {
  icon: IconComponent;
  title: string;
  stamp: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('panel rounded-3xl p-5 sm:p-6', className)} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-gold">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          {title}
        </h3>
        <span className="text-[0.62rem] uppercase tracking-[0.18em] text-smoke">{stamp}</span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SaveRow({ dirty, busy, onSave }: { dirty: boolean; busy: boolean; onSave: () => void }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <span className="text-xs text-smoke" aria-live="polite">
        {dirty ? 'Alterações não salvas' : 'Tudo salvo'}
      </span>
      <Button size="sm" onClick={onSave} loading={busy} disabled={!dirty}>
        Salvar
      </Button>
    </div>
  );
}
