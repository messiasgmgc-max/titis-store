'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ContactRound, SearchX, ShieldCheck, ShieldOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatBRL, formatDateBR } from '@/lib/format';
import { CLUB_PLANS, getPlan } from '@/lib/site';
import type { PlanId, Role } from '@/lib/types';
import {
  ConfirmDialog,
  DangerButton,
  EmptyState,
  ErrorState,
  IconButton,
  InlineError,
  LoadingRows,
  PillOption,
  RefreshButton,
  SearchField,
  Segmented,
  SectionLabel,
} from './AdminUI';
import { ClientPanel, clientDisplayName, clientInitials } from './ClientPanel';
import {
  ACCESS_KINDS,
  ACCESS_TONE,
  accessStateOf,
  describeError,
  displayPhone,
  grantPreview,
  normalizeSearch,
  waLinkFor,
  type AccessKind,
  type AccessState,
  type AdminPayment,
  type ClientProfile,
} from './admin-utils';
import type { Resource } from './useAdminData';

type AccessFilter = 'all' | AccessKind;

type Pending =
  | { kind: 'grant'; client: ClientProfile }
  | { kind: 'revoke'; client: ClientProfile }
  | { kind: 'promote'; client: ClientProfile }
  | { kind: 'demote'; client: ClientProfile };

/** Planos com acesso digital (o presencial é agendado à parte). */
const GRANT_PLANS = CLUB_PLANS.filter((p) => p.accessDays !== null);

const DURATIONS: { days: number | null; label: string }[] = [
  { days: 30, label: '30 dias' },
  { days: 90, label: '90 dias' },
  { days: 365, label: '1 ano' },
  { days: null, label: 'Sem prazo' },
];

/** Clientes cadastrados, situação do acesso à consultoria e níveis de administração. */
export function ClientsTable({
  resource,
  payments,
  currentUserId,
  onAccessChanged,
}: {
  resource: Resource<ClientProfile>;
  /** Pagamentos já carregados (histórico na ficha do cliente). */
  payments: AdminPayment[];
  currentUserId: string;
  /** Chamado após liberar ou revogar acesso (ex.: recarregar pagamentos). */
  onAccessChanged?: () => void;
}) {
  const { data: clients, loading, refreshing, error, reload, setData } = resource;
  const { toast } = useUI();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AccessFilter>('all');
  const [pending, setPending] = useState<Pending | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grantPlan, setGrantPlan] = useState<PlanId>('clube');
  const [grantDays, setGrantDays] = useState<number | null>(30);
  const [savingId, setSavingId] = useState<string | null>(null);
  const savingRef = useRef(false);

  const accessById = useMemo(() => {
    const map = new Map<string, AccessState>();
    clients.forEach((c) => map.set(c.id, accessStateOf(c)));
    return map;
  }, [clients]);

  const counts = useMemo(() => {
    const base: Record<AccessFilter, number> = { all: clients.length, active: 0, expired: 0, blocked: 0, none: 0, admin: 0 };
    accessById.forEach((state) => {
      base[state.kind] += 1;
    });
    return base;
  }, [clients.length, accessById]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    const digits = query.replace(/\D/g, '');
    return clients.filter((c) => {
      if (filter !== 'all' && accessById.get(c.id)?.kind !== filter) return false;
      if (!q) return true;
      if (normalizeSearch(`${c.full_name ?? ''} ${c.email ?? ''} ${c.seasonal_palette ?? ''} ${c.admin_notes ?? ''}`).includes(q)) return true;
      return digits.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(digits);
    });
  }, [clients, filter, query, accessById]);

  const selected = useMemo(() => clients.find((c) => c.id === selectedId) ?? null, [clients, selectedId]);

  /** Executa uma ação com trava contra cliques repetidos e recarrega a lista. */
  const run = async (client: ClientProfile, action: () => Promise<string>, fallback: string) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSavingId(client.id);
    try {
      const message = await action();
      toast(message, 'success');
      savingRef.current = false;
      setPending(null);
      onAccessChanged?.();
      await reload();
    } catch (err) {
      toast(describeError(err, fallback), 'error');
    } finally {
      savingRef.current = false;
      setSavingId(null);
    }
  };

  const updateProfile = async (client: ClientProfile, patch: Partial<Pick<ClientProfile, 'role' | 'access_until'>>) => {
    const { data, error: updateError } = await supabase.from('profiles').update(patch).eq('id', client.id).select('id');
    if (updateError) throw updateError;
    if (!data || data.length === 0) {
      throw new Error('Nenhuma alteração foi aplicada. Confirme que sua conta tem papel de administração.');
    }
    setData((list) => list.map((c) => (c.id === client.id ? { ...c, ...patch } : c)));
  };

  const grantAccess = (client: ClientProfile) =>
    run(
      client,
      async () => {
        const { data, error: rpcError } = await supabase.rpc('grant_consulting_access', {
          p_user: client.id,
          p_plan: grantPlan,
          p_days: grantDays,
        });
        if (rpcError) throw rpcError;
        const result = (data ?? {}) as { role?: unknown; access_until?: unknown };
        const role: Role = result.role === 'admin' ? 'admin' : 'vip';
        const accessUntil = typeof result.access_until === 'string' ? result.access_until : null;
        setData((list) =>
          list.map((c) => (c.id === client.id ? { ...c, role, plan: grantPlan, access_until: accessUntil } : c)),
        );
        const until = accessUntil ? `até ${formatDateBR(accessUntil)}` : 'sem prazo';
        return `Acesso de ${clientDisplayName(client)} liberado ${until}.`;
      },
      'Não foi possível liberar o acesso.',
    );

  const confirmPending = () => {
    if (!pending) return;
    const { client } = pending;
    switch (pending.kind) {
      case 'grant':
        void grantAccess(client);
        break;
      case 'revoke':
        void run(
          client,
          async () => {
            await updateProfile(client, { role: 'client', access_until: null });
            return `Acesso de ${clientDisplayName(client)} revogado.`;
          },
          'Não foi possível revogar o acesso.',
        );
        break;
      case 'promote':
        void run(
          client,
          async () => {
            await updateProfile(client, { role: 'admin' });
            return `${clientDisplayName(client)} agora é administrador.`;
          },
          'Não foi possível alterar o papel.',
        );
        break;
      case 'demote':
        void run(
          client,
          async () => {
            await updateProfile(client, { role: 'client' });
            return `${clientDisplayName(client)} deixou a administração.`;
          },
          'Não foi possível alterar o papel.',
        );
        break;
    }
  };

  const openGrant = (client: ClientProfile) => {
    setSelectedId(null);
    setGrantPlan(client.plan === 'passe' ? 'passe' : 'clube');
    setGrantDays(30);
    setPending({ kind: 'grant', client });
  };

  /** Abre um diálogo de confirmação fechando a ficha (um diálogo por vez). */
  const openPending = (next: Pending) => {
    setSelectedId(null);
    setPending(next);
  };

  const cancelPending = useCallback(() => {
    if (!savingRef.current) setPending(null);
  }, []);

  const closePanel = useCallback(() => setSelectedId(null), []);

  const onPanelSaved = (updated: ClientProfile) => {
    setData((list) => list.map((c) => (c.id === updated.id ? updated : c)));
    onAccessChanged?.();
    void reload();
  };

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingRows rows={5} label="Carregando os clientes" />;
  } else if (error && clients.length === 0) {
    body = <ErrorState message={error} onRetry={() => void reload()} retrying={refreshing} />;
  } else if (clients.length === 0) {
    body = (
      <EmptyState icon={Users} title="Nenhuma conta cadastrada">
        As contas criadas no site aparecem aqui, com contato, cartela e situação do acesso.
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Nenhum cliente encontrado"
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
        Ajuste a busca ou o filtro de acesso.
      </EmptyState>
    );
  } else {
    body = (
      <>
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface/40">
          <table className="w-full min-w-[62rem] border-collapse text-left">
            <caption className="sr-only">Clientes cadastrados e situação do acesso à consultoria</caption>
            <thead>
              <tr className="border-b border-line-gold text-[0.6rem] uppercase tracking-[0.22em] text-smoke">
                <th scope="col" className="py-3.5 pl-4 pr-3 font-semibold">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-3.5 font-semibold">
                  Telefone
                </th>
                <th scope="col" className="px-3 py-3.5 font-semibold">
                  Cartela
                </th>
                <th scope="col" className="px-3 py-3.5 font-semibold">
                  Acesso
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-4 text-right font-semibold">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((c) => {
                const self = c.id === currentUserId;
                const phone = displayPhone(c.phone);
                const chat = waLinkFor(c.phone);
                const access = accessById.get(c.id) ?? accessStateOf(c);
                const tone = ACCESS_TONE[access.kind];
                const busy = savingId === c.id;
                return (
                  <tr key={c.id} className="transition-colors duration-300 hover:bg-ivory/[0.02]">
                    <td className="py-3 pl-4 pr-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className="group flex w-full items-center gap-3.5 text-left"
                        aria-label={`Abrir ficha de ${clientDisplayName(c)}`}
                      >
                        <span
                          className={cn(
                            'grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm font-bold transition-colors',
                            c.role === 'admin'
                              ? 'border-gold bg-gold/10 text-gold-light'
                              : access.kind === 'active'
                                ? 'border-line-gold text-gold'
                                : access.kind === 'blocked'
                                  ? 'border-danger/50 text-danger'
                                  : 'border-line text-parchment',
                            'group-hover:border-gold',
                          )}
                          aria-hidden
                        >
                          {clientInitials(c)}
                        </span>
                        <span className="min-w-0">
                          <span className="flex max-w-[18rem] items-center gap-2 text-sm font-semibold text-ivory">
                            <span className={cn('truncate transition-colors group-hover:text-gold-light', !c.full_name && 'font-normal text-mist')}>
                              {clientDisplayName(c)}
                            </span>
                            {self && (
                              <span className="shrink-0 rounded-full border border-line-gold px-2 py-0.5 text-[0.52rem] uppercase tracking-[0.2em] text-gold">
                                Você
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block max-w-[18rem] truncate text-xs text-smoke">{c.email ?? 'E-mail não informado'}</span>
                          {c.created_at && <span className="mt-0.5 block text-[0.68rem] text-smoke">Desde {formatDateBR(c.created_at)}</span>}
                        </span>
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm tabular-nums">
                      {phone && chat ? (
                        <a
                          href={chat}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-parchment transition-colors hover:text-gold-light"
                          aria-label={`Conversar com ${clientDisplayName(c)} no WhatsApp: ${phone}`}
                        >
                          {phone}
                        </a>
                      ) : (
                        <span className="text-smoke">{phone || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {c.seasonal_palette ? (
                        <span className="font-semibold text-gold-light">{c.seasonal_palette}</span>
                      ) : (
                        <span className="text-xs text-smoke">Sem leitura</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-hidden />
                        <span className={cn('text-sm font-semibold', tone.text)}>{access.label}</span>
                      </span>
                      {access.detail && <p className="mt-0.5 pl-4 text-xs text-smoke">{access.detail}</p>}
                      {c.admin_notes && (
                        <p className="mt-0.5 max-w-[16rem] truncate pl-4 text-[0.68rem] italic text-smoke" title={c.admin_notes}>
                          {c.admin_notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <IconButton label={`Abrir ficha de ${clientDisplayName(c)}`} disabled={busy} onClick={() => setSelectedId(c.id)}>
                          <ContactRound className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                        </IconButton>
                        {self ? (
                          <p className="text-right text-xs text-smoke">Sua conta</p>
                        ) : c.role === 'admin' ? (
                          <IconButton
                            label={`Remover ${clientDisplayName(c)} da administração`}
                            tone="danger"
                            disabled={busy}
                            onClick={() => setPending({ kind: 'demote', client: c })}
                          >
                            <ShieldOff className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                          </IconButton>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" disabled={busy} onClick={() => openGrant(c)}>
                              {access.kind === 'active' ? 'Estender acesso' : 'Liberar acesso'}
                            </Button>
                            {c.role === 'vip' && (
                              <DangerButton disabled={busy} onClick={() => setPending({ kind: 'revoke', client: c })}>
                                Revogar
                              </DangerButton>
                            )}
                            <IconButton
                              label={`Tornar ${clientDisplayName(c)} administrador`}
                              disabled={busy}
                              onClick={() => setPending({ kind: 'promote', client: c })}
                            >
                              <ShieldCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                            </IconButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-smoke" aria-live="polite">
          {filtered.length === clients.length
            ? `${clients.length} ${clients.length === 1 ? 'conta cadastrada' : 'contas cadastradas'}`
            : `Mostrando ${filtered.length} de ${clients.length} contas`}
          {' · '}clique no cliente para abrir a ficha · a própria conta não pode ser alterada
        </p>
      </>
    );
  }

  const selectedPlan = getPlan(grantPlan);

  return (
    <section aria-labelledby="clientes-titulo">
      <div>
        <SectionLabel numeral="III">Clientes</SectionLabel>
        <h2 id="clientes-titulo" className="mt-3 font-display text-3xl font-extrabold text-ivory sm:text-4xl">
          Fichas da <span className="text-gold-light">clientela</span>
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
          Abra a ficha para trocar o plano, ajustar a validade, bloquear e anotar observações. “Liberar acesso” registra um
          pagamento manual; Admin concede acesso total a este painel.
        </p>
      </div>

      {!loading && clients.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Buscar cliente"
              placeholder="Buscar por nome, e-mail, telefone, cartela ou observação"
            />
            <RefreshButton onClick={() => void reload()} busy={refreshing} />
          </div>
          <Segmented<AccessFilter>
            label="Filtrar por situação do acesso"
            value={filter}
            onChange={setFilter}
            options={[{ id: 'all', label: 'Todos', count: counts.all }, ...ACCESS_KINDS.map((f) => ({ ...f, count: counts[f.id] }))]}
          />
        </div>
      )}

      {error && clients.length > 0 && (
        <div className="mt-6">
          <InlineError message={error} onRetry={() => void reload()} retrying={refreshing} />
        </div>
      )}

      <div className="mt-6">{body}</div>

      <AnimatePresence>
        {selected && !pending && (
          <ClientPanel
            key={`ficha-${selected.id}`}
            client={selected}
            payments={payments}
            isSelf={selected.id === currentUserId}
            onClose={closePanel}
            onSaved={onPanelSaved}
            onGrant={() => openGrant(selected)}
            onRevoke={() => openPending({ kind: 'revoke', client: selected })}
            onPromote={() => openPending({ kind: 'promote', client: selected })}
            onDemote={() => openPending({ kind: 'demote', client: selected })}
          />
        )}

        {pending?.kind === 'grant' && (
          <ConfirmDialog
            key="liberar"
            title="Liberar acesso"
            confirmLabel="Liberar acesso"
            busy={savingId === pending.client.id}
            onConfirm={confirmPending}
            onCancel={cancelPending}
          >
            <p>
              <span className="font-semibold text-ivory">{clientDisplayName(pending.client)}</span>{' '}
              {accessStateOf(pending.client).kind === 'active'
                ? 'já tem acesso ativo: os dias escolhidos são somados ao prazo atual.'
                : 'passa a usar a leitura de colorimetria, os looks sob medida, o provador virtual e as consultorias salvas.'}
            </p>
            {pending.client.is_blocked && (
              <p className="mt-3 text-danger">Esta conta está bloqueada: o acesso só volta quando o bloqueio for removido na ficha.</p>
            )}

            <p className="label mt-6">Plano</p>
            <div role="group" aria-label="Plano" className="mt-2 flex flex-wrap gap-2">
              {GRANT_PLANS.map((p) => (
                <PillOption key={p.id} active={grantPlan === p.id} onClick={() => setGrantPlan(p.id)}>
                  {p.name} · {p.priceLabel}
                </PillOption>
              ))}
            </div>

            <p className="label mt-5">Duração</p>
            <div role="group" aria-label="Duração" className="mt-2 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <PillOption key={d.label} active={grantDays === d.days} onClick={() => setGrantDays(d.days)}>
                  {d.label}
                </PillOption>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-obsidian/60 px-4 py-3" aria-live="polite">
              <p className="text-sm font-semibold text-ivory">{grantPreview(pending.client.access_until, grantDays)}</p>
              <p className="mt-0.5 text-xs text-smoke">
                Registra um pagamento manual aprovado de {formatBRL(selectedPlan?.priceCents ?? 0)}.
              </p>
            </div>
          </ConfirmDialog>
        )}

        {pending?.kind === 'revoke' && (
          <ConfirmDialog
            key="revogar"
            title="Revogar acesso"
            confirmLabel="Revogar acesso"
            tone="danger"
            busy={savingId === pending.client.id}
            onConfirm={confirmPending}
            onCancel={cancelPending}
          >
            <p>
              <span className="font-semibold text-ivory">{clientDisplayName(pending.client)}</span> perde o acesso à consultoria
              digital imediatamente e volta a ser cliente comum.
            </p>
            <p className="mt-3">O histórico de pagamentos é mantido.</p>
          </ConfirmDialog>
        )}

        {pending?.kind === 'promote' && (
          <ConfirmDialog
            key="promover"
            title="Conceder acesso de administração"
            confirmLabel="Tornar admin"
            busy={savingId === pending.client.id}
            onConfirm={confirmPending}
            onCancel={cancelPending}
          >
            <p>
              <span className="font-semibold text-ivory">{clientDisplayName(pending.client)}</span> terá acesso total ao painel: acervo,
              pedidos, pagamentos, cupons, configurações, dados de clientes e liberação de acessos.
            </p>
            <p className="mt-3">Conceda apenas a pessoas de confiança da loja.</p>
          </ConfirmDialog>
        )}

        {pending?.kind === 'demote' && (
          <ConfirmDialog
            key="rebaixar"
            title="Remover acesso de administração"
            confirmLabel="Remover admin"
            tone="danger"
            busy={savingId === pending.client.id}
            onConfirm={confirmPending}
            onCancel={cancelPending}
          >
            <p>
              <span className="font-semibold text-ivory">{clientDisplayName(pending.client)}</span> deixará de acessar a administração e
              voltará a ser cliente comum.
            </p>
            <p className="mt-3">Se a pessoa deve continuar usando a consultoria, libere o acesso em seguida.</p>
          </ConfirmDialog>
        )}
      </AnimatePresence>
    </section>
  );
}
