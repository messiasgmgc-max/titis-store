'use client';

import { useMemo, useState } from 'react';
import { Lock, ShieldCheck, ShieldOff, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatBRL, formatDateBR } from '@/lib/format';
import { CLUB_PLANS, getPlan } from '@/lib/site';
import type { PlanId, Role } from '@/lib/types';
import { DangerButton, Field, PillOption, SelectBox, Switch } from './AdminUI';
import {
  ACCESS_TONE,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  accessStateOf,
  describeError,
  displayPhone,
  extendAccessUntil,
  formatTimeBR,
  fromDateInput,
  toDateInput,
  waLinkFor,
  type AdminPayment,
  type ClientProfile,
} from './admin-utils';

type PlanChoice = PlanId | 'none';

const SHORTCUTS: { days: number | null; label: string }[] = [
  { days: 30, label: '+30 dias' },
  { days: 90, label: '+90 dias' },
  { days: 365, label: '+1 ano' },
  { days: null, label: 'Sem prazo' },
];

const PLAN_OPTIONS: { id: PlanChoice; label: string }[] = [
  { id: 'none', label: 'Nenhum (cliente comum)' },
  ...CLUB_PLANS.filter((p) => p.accessDays !== null).map((p) => ({ id: p.id as PlanChoice, label: `${p.name} · ${p.priceLabel}` })),
];

export function clientDisplayName(c: ClientProfile): string {
  return c.full_name || c.email?.split('@')[0] || 'Cliente sem nome';
}

export function clientInitials(c: ClientProfile): string {
  const source = c.full_name || c.email || '';
  const parts = source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '').slice(0, 2);
  return letters.toUpperCase() || 'T';
}

const statusLabel = (id: AdminPayment['status']) => PAYMENT_STATUSES.find((s) => s.id === id)?.label ?? id;

/**
 * Ficha do cliente: plano, validade, bloqueio, observações internas, atalhos de
 * liberação/administração e histórico de pagamentos. Salvar chama set_client_access.
 */
export function ClientPanel({
  client,
  payments,
  isSelf,
  onClose,
  onSaved,
  onGrant,
  onRevoke,
  onPromote,
  onDemote,
}: {
  client: ClientProfile;
  payments: AdminPayment[];
  /** A própria conta: só leitura. */
  isSelf: boolean;
  /** Deve ser estável (useCallback). */
  onClose: () => void;
  onSaved: (updated: ClientProfile) => void;
  onGrant: () => void;
  onRevoke: () => void;
  onPromote: () => void;
  onDemote: () => void;
}) {
  const { toast } = useUI();
  const isAdmin = client.role === 'admin';
  const readOnly = isSelf;

  const initialPlan: PlanChoice = client.plan && client.role !== 'client' ? client.plan : 'none';
  const [plan, setPlan] = useState<PlanChoice>(initialPlan);
  const [until, setUntil] = useState(toDateInput(client.access_until));
  const [blocked, setBlocked] = useState(client.is_blocked);
  const [notes, setNotes] = useState(client.admin_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const planOptions = useMemo(() => {
    if (client.plan === 'presencial' && !PLAN_OPTIONS.some((o) => o.id === 'presencial')) {
      return [...PLAN_OPTIONS, { id: 'presencial' as PlanChoice, label: 'Consultoria Presencial' }];
    }
    return PLAN_OPTIONS;
  }, [client.plan]);

  const history = useMemo(
    () => payments.filter((p) => p.user_id === client.id).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 12),
    [payments, client.id],
  );

  const currentState = accessStateOf(client);

  // Situação resultante do que está no formulário (mesma regra de set_client_access).
  const preview = useMemo(() => {
    const role: Role = isAdmin ? 'admin' : plan === 'none' ? 'client' : 'vip';
    const accessUntil = plan === 'none' ? null : fromDateInput(until);
    return accessStateOf({ role, plan: plan === 'none' ? client.plan : plan, access_until: accessUntil, is_blocked: blocked });
  }, [isAdmin, plan, until, blocked, client.plan]);

  const dirty =
    plan !== initialPlan ||
    until !== toDateInput(client.access_until) ||
    blocked !== client.is_blocked ||
    notes.trim() !== (client.admin_notes ?? '');

  const applyShortcut = (days: number | null) => {
    setDateError(null);
    if (days === null) {
      setUntil('');
      return;
    }
    // Soma ao prazo do formulário (ou ao atual do cliente) quando ainda ativo — como grant_consulting_access.
    const base = until ? fromDateInput(until) : client.access_until;
    setUntil(toDateInput(extendAccessUntil(base, days)));
    if (plan === 'none') setPlan(client.plan === 'passe' ? 'passe' : 'clube');
  };

  const save = async () => {
    if (saving || readOnly) return;
    const accessUntil = plan === 'none' ? null : until ? fromDateInput(until) : null;
    if (plan !== 'none' && until && !accessUntil) {
      setDateError('Data inválida. Use o formato dia/mês/ano.');
      return;
    }
    setDateError(null);
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('set_client_access', {
        p_user: client.id,
        p_plan: plan === 'none' ? null : plan,
        p_access_until: accessUntil,
        p_role: null,
        p_blocked: blocked,
        p_notes: notes,
      });
      if (error) throw error;
      const r = (data ?? {}) as Record<string, unknown>;
      const role: Role = r.role === 'admin' ? 'admin' : r.role === 'vip' ? 'vip' : 'client';
      onSaved({
        ...client,
        role,
        plan: typeof r.plan === 'string' ? (r.plan as PlanId) : null,
        access_until: typeof r.access_until === 'string' ? r.access_until : null,
        is_blocked: r.is_blocked === true,
        admin_notes: typeof r.admin_notes === 'string' && r.admin_notes ? r.admin_notes : null,
      });
      toast(`Ficha de ${clientDisplayName(client)} atualizada.`, 'success');
    } catch (err) {
      toast(describeError(err, 'Não foi possível salvar a ficha.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const phone = displayPhone(client.phone);
  const chat = waLinkFor(client.phone, `Olá, ${clientDisplayName(client).split(/\s+/)[0]}! Aqui é da Titi's Store.`);
  const tone = ACCESS_TONE[currentState.kind];
  const previewTone = ACCESS_TONE[preview.kind];
  const dateId = 'ficha-validade';
  const notesId = 'ficha-observacoes';

  return (
    <Modal onClose={onClose} title={`Ficha de ${clientDisplayName(client)}`} size="lg" className="rounded-3xl">
      <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
        {/* Cabeçalho ---------------------------------------------------------- */}
        <div className="flex flex-col gap-5 pr-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'grid h-14 w-14 shrink-0 place-items-center rounded-full border text-base font-extrabold',
                isAdmin ? 'border-gold bg-gold/10 text-gold-light' : currentState.kind === 'active' ? 'border-line-gold text-gold' : 'border-line text-parchment',
              )}
              aria-hidden
            >
              {clientInitials(client)}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-display text-2xl font-extrabold leading-tight text-ivory">{clientDisplayName(client)}</span>
                {isSelf && (
                  <span className="rounded-full border border-line-gold px-2 py-0.5 text-[0.52rem] uppercase tracking-[0.2em] text-gold">Você</span>
                )}
              </p>
              {client.email && (
                <a href={`mailto:${client.email}`} className="mt-0.5 block truncate text-sm text-mist transition-colors hover:text-gold-light">
                  {client.email}
                </a>
              )}
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-smoke">
                {phone && chat ? (
                  <a href={chat} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-parchment transition-colors hover:text-gold-light">
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                    {phone}
                  </a>
                ) : (
                  <span>{phone || 'Telefone não informado'}</span>
                )}
                {client.created_at && <span>Desde {formatDateBR(client.created_at)}</span>}
                {client.seasonal_palette && <span className="text-gold-light">{client.seasonal_palette}</span>}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-obsidian/50 px-4 py-3 sm:min-w-[13rem]">
            <p className="text-[0.6rem] uppercase tracking-[0.22em] text-smoke">Situação atual</p>
            <p className="mt-1.5 flex items-center gap-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-hidden />
              <span className={cn('text-sm font-semibold', tone.text)}>{currentState.label}</span>
            </p>
            {currentState.detail && <p className="mt-0.5 pl-4 text-xs text-smoke">{currentState.detail}</p>}
          </div>
        </div>

        {readOnly && (
          <p className="mt-6 rounded-2xl border border-line-gold bg-gold/[0.05] px-4 py-3 text-sm text-parchment">
            Esta é a sua própria conta: a ficha fica só para consulta. Alterações na própria conta são feitas pelo SQL Editor.
          </p>
        )}

        {/* Acesso -------------------------------------------------------------- */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="panel rounded-3xl p-5 sm:p-6" aria-labelledby="ficha-acesso">
            <h3 id="ficha-acesso" className="flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-gold">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Acesso à consultoria
            </h3>

            <Field label="Plano" htmlFor="ficha-plano" className="mt-5">
              <SelectBox id="ficha-plano" value={plan} disabled={readOnly || saving} onChange={(e) => setPlan(e.target.value as PlanChoice)}>
                {planOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </SelectBox>
            </Field>

            <Field
              label="Válido até"
              htmlFor={dateId}
              className="mt-4"
              error={dateError ?? undefined}
              hint={plan === 'none' ? 'Sem plano não há prazo.' : until ? undefined : 'Vazio = sem prazo (acesso até você mudar).'}
            >
              <input
                id={dateId}
                type="date"
                value={until}
                disabled={readOnly || saving || plan === 'none'}
                onChange={(e) => {
                  setUntil(e.target.value);
                  setDateError(null);
                }}
                className="field rounded-2xl py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              />
            </Field>
            <div role="group" aria-label="Atalhos de validade" className="mt-3 flex flex-wrap gap-2">
              {SHORTCUTS.map((s) => (
                <PillOption
                  key={s.label}
                  active={s.days === null ? plan !== 'none' && until === '' : false}
                  disabled={readOnly || saving}
                  onClick={() => applyShortcut(s.days)}
                >
                  {s.label}
                </PillOption>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-obsidian/60 px-4 py-3" aria-live="polite">
              <p className="text-[0.6rem] uppercase tracking-[0.22em] text-smoke">Ao salvar</p>
              <p className="mt-1.5 flex items-center gap-2">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', previewTone.dot)} aria-hidden />
                <span className={cn('text-sm font-semibold', previewTone.text)}>{preview.label}</span>
              </p>
              {preview.detail && <p className="mt-0.5 pl-4 text-xs text-smoke">{preview.detail}</p>}
              <p className="mt-2 text-xs text-smoke">Não registra pagamento. Para registrar, use “Liberar acesso”.</p>
            </div>
          </section>

          <section className="panel rounded-3xl p-5 sm:p-6" aria-labelledby="ficha-bloqueio">
            <h3 id="ficha-bloqueio" className="flex items-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-gold">
              <Lock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Bloqueio e observações
            </h3>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3">
              <div>
                <p className={cn('text-sm font-semibold', blocked ? 'text-danger' : 'text-ivory')}>
                  {blocked ? 'Acesso bloqueado' : 'Acesso liberado'}
                </p>
                <p className="mt-0.5 text-xs text-smoke">
                  {isAdmin
                    ? 'Administradores não são afetados pelo bloqueio.'
                    : 'O bloqueio derruba a consultoria na hora, mesmo com plano vigente.'}
                </p>
              </div>
              <Switch
                checked={blocked}
                onChange={setBlocked}
                label={blocked ? 'Desbloquear acesso' : 'Bloquear acesso'}
                tone="danger"
                disabled={readOnly || saving || isAdmin}
              />
            </div>

            <Field
              label="Observações internas"
              htmlFor={notesId}
              className="mt-4"
              hint={blocked ? 'Anote aqui o motivo do bloqueio.' : 'Só a administração vê. Combinados, contexto, motivo de bloqueio.'}
            >
              <textarea
                id={notesId}
                value={notes}
                disabled={readOnly || saving}
                maxLength={4000}
                rows={5}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={blocked ? 'Motivo do bloqueio…' : 'Ex.: pediu para renovar em outubro; prefere contato por áudio.'}
                className="field min-h-[7.5rem] resize-y rounded-2xl text-sm disabled:cursor-not-allowed disabled:opacity-50"
              />
            </Field>
          </section>
        </div>

        {/* Ações ---------------------------------------------------------------- */}
        {!readOnly && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {!isAdmin && (
                <>
                  <Button variant="outline" size="sm" disabled={saving} onClick={onGrant}>
                    {currentState.kind === 'active' ? 'Estender acesso' : 'Liberar acesso'}
                  </Button>
                  {client.role === 'vip' && (
                    <DangerButton disabled={saving} onClick={onRevoke}>
                      Revogar
                    </DangerButton>
                  )}
                  <button type="button" disabled={saving} onClick={onPromote} className="btn btn-ghost btn-sm rounded-full">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    Tornar admin
                  </button>
                </>
              )}
              {isAdmin && (
                <DangerButton disabled={saving} onClick={onDemote}>
                  <ShieldOff className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  Remover admin
                </DangerButton>
              )}
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
                Fechar
              </Button>
              <Button size="sm" onClick={() => void save()} loading={saving} disabled={!dirty}>
                Salvar ficha
              </Button>
            </div>
          </div>
        )}

        {/* Histórico ------------------------------------------------------------ */}
        <section className="mt-8" aria-labelledby="ficha-pagamentos">
          <h3 id="ficha-pagamentos" className="text-[0.66rem] font-semibold uppercase tracking-[0.22em] text-gold">
            Pagamentos
          </h3>
          {history.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-line px-4 py-4 text-sm text-mist">Nenhum pagamento registrado para esta conta.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/40">
              {history.map((p) => {
                const st = p.status;
                const stTone = st === 'approved' ? 'text-success' : st === 'pending' ? 'text-gold-light' : st === 'cancelled' ? 'text-mist' : 'text-danger';
                return (
                  <li key={p.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[8.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                    <p className="text-parchment">
                      {p.created_at ? formatDateBR(p.created_at) : '—'}
                      {p.created_at && <span className="ml-2 text-xs tabular-nums text-smoke">{formatTimeBR(p.created_at)}</span>}
                    </p>
                    <p className="min-w-0 truncate text-mist">
                      <span className="text-ivory">{getPlan(p.plan)?.name ?? p.plan}</span> · {PAYMENT_PROVIDERS[p.provider]}
                      {p.coupon_code && <span className="ml-2 rounded-full border border-line-gold px-2 py-0.5 text-[0.58rem] tracking-[0.14em] text-gold-light">{p.coupon_code}</span>}
                    </p>
                    <p className="text-right tabular-nums">
                      <span className="font-semibold text-ivory">{formatBRL(p.amount_cents)}</span>
                      {p.discount_cents > 0 && <span className="ml-2 text-xs text-smoke">−{formatBRL(p.discount_cents)}</span>}
                      <span className={cn('ml-3 text-xs font-semibold', stTone)}>{statusLabel(st)}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
