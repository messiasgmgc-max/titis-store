'use client';

import { useMemo, useState } from 'react';
import { Receipt, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, formatBRL, formatDateBR } from '@/lib/format';
import { getPlan } from '@/lib/site';
import type { PaymentStatus } from '@/lib/types';
import {
  EmptyState,
  ErrorState,
  InlineError,
  LoadingRows,
  RefreshButton,
  SearchField,
  Segmented,
  SectionLabel,
} from './AdminUI';
import {
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  formatTimeBR,
  normalizeSearch,
  type AdminPayment,
  type ClientProfile,
} from './admin-utils';
import type { Resource } from './useAdminData';

type StatusFilter = 'all' | PaymentStatus;

const STATUS_TONE: Record<PaymentStatus, { dot: string; text: string }> = {
  approved: { dot: 'bg-success', text: 'text-success' },
  pending: { dot: 'bg-gold', text: 'text-gold-light' },
  rejected: { dot: 'bg-danger', text: 'text-danger' },
  cancelled: { dot: 'bg-smoke', text: 'text-mist' },
  refunded: { dot: 'bg-danger', text: 'text-danger' },
};

const statusLabel = (id: PaymentStatus) => PAYMENT_STATUSES.find((s) => s.id === id)?.label ?? id;

/** Pagamentos dos planos: Mercado Pago, WhatsApp e liberações manuais do painel. */
export function PaymentsBoard({ resource, clients }: { resource: Resource<AdminPayment>; clients: ClientProfile[] }) {
  const { data: payments, loading, refreshing, error, reload } = resource;

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      all: payments.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      cancelled: 0,
      refunded: 0,
    };
    payments.forEach((p) => {
      base[p.status] += 1;
    });
    return base;
  }, [payments]);

  const approvedTotal = useMemo(
    () => payments.filter((p) => p.status === 'approved').reduce((sum, p) => sum + p.amount_cents, 0),
    [payments],
  );

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return payments.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false;
      if (!q) return true;
      const client = clientById.get(p.user_id);
      const haystack = normalizeSearch(
        `${client?.full_name ?? ''} ${client?.email ?? ''} ${getPlan(p.plan)?.name ?? p.plan} ${p.provider_payment_id ?? ''}`,
      );
      return haystack.includes(q) || p.id.toLowerCase().startsWith(q);
    });
  }, [payments, filter, query, clientById]);

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingRows rows={4} label="Carregando os pagamentos" />;
  } else if (error && payments.length === 0) {
    body = <ErrorState message={error} onRetry={() => void reload()} retrying={refreshing} />;
  } else if (payments.length === 0) {
    body = (
      <EmptyState icon={Receipt} title="Nenhum pagamento registrado">
        As liberações feitas na aba Clientes e as compras pelo Mercado Pago aparecem aqui, com plano, valor e status.
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Nenhum pagamento encontrado"
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
        Ajuste a busca ou o status para ver outros pagamentos.
      </EmptyState>
    );
  } else {
    body = (
      <>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface/40">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <caption className="sr-only">Pagamentos de planos</caption>
            <thead>
              <tr className="border-b border-line-gold text-[0.6rem] uppercase tracking-[0.22em] text-smoke">
                <th scope="col" className="py-3.5 pl-4 pr-3 font-semibold">
                  Data
                </th>
                <th scope="col" className="px-3 py-3.5 font-semibold">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-3.5 font-semibold">
                  Plano
                </th>
                <th scope="col" className="px-3 py-3.5 text-right font-semibold">
                  Valor
                </th>
                <th scope="col" className="px-3 py-3.5 font-semibold">
                  Provedor
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-4 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((p) => {
                const client = clientById.get(p.user_id);
                const name = client?.full_name || client?.email?.split('@')[0] || 'Conta não encontrada';
                const tone = STATUS_TONE[p.status];
                return (
                  <tr key={p.id} className={cn('transition-colors duration-300 hover:bg-ivory/[0.02]', p.status === 'cancelled' && 'opacity-75')}>
                    <td className="whitespace-nowrap py-3 pl-4 pr-3">
                      <p className="text-sm font-semibold text-ivory">{p.created_at ? formatDateBR(p.created_at) : '—'}</p>
                      <p className="mt-0.5 text-xs tabular-nums text-smoke">
                        {p.created_at && `${formatTimeBR(p.created_at)} · `}Nº {p.id.replace(/-/g, '').slice(0, 6).toUpperCase()}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className={cn('max-w-[16rem] truncate text-sm', client ? 'font-semibold text-ivory' : 'text-mist')}>{name}</p>
                      <p className="mt-0.5 max-w-[16rem] truncate text-xs text-smoke">{client?.email ?? p.user_id.slice(0, 8)}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-parchment">{getPlan(p.plan)?.name ?? p.plan}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-semibold tabular-nums text-ivory">
                      {formatBRL(p.amount_cents)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-parchment">{PAYMENT_PROVIDERS[p.provider]}</p>
                      {p.provider_payment_id && (
                        <p className="mt-0.5 max-w-[10rem] truncate text-xs tabular-nums text-smoke" title={p.provider_payment_id}>
                          #{p.provider_payment_id}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-3 pl-3 pr-4">
                      <span className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.dot)} aria-hidden />
                        <span className={cn('text-sm font-semibold', tone.text)}>{statusLabel(p.status)}</span>
                      </span>
                      {p.status === 'approved' && (
                        <p className="mt-0.5 pl-4 text-xs text-smoke">
                          {p.applied_at ? `Acesso liberado ${formatDateBR(p.applied_at)}` : 'Acesso não liberado'}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-smoke" aria-live="polite">
          {filtered.length === payments.length
            ? `${payments.length} ${payments.length === 1 ? 'pagamento' : 'pagamentos'}`
            : `Mostrando ${filtered.length} de ${payments.length} pagamentos`}
          {' · '}total aprovado {formatBRL(approvedTotal)}
        </p>
      </>
    );
  }

  return (
    <section aria-labelledby="pagamentos-titulo">
      <div>
        <SectionLabel numeral="IV">Pagamentos</SectionLabel>
        <h2 id="pagamentos-titulo" className="mt-3 font-display text-3xl font-extrabold text-ivory sm:text-4xl">
          Livro de <span className="text-gold-light">pagamentos</span>
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
          Compras dos planos da consultoria. Pagamentos do Mercado Pago são atualizados automaticamente; liberações manuais entram
          como aprovadas.
        </p>
      </div>

      {!loading && payments.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Buscar pagamento"
              placeholder="Buscar por cliente, e-mail, plano ou número"
            />
            <RefreshButton onClick={() => void reload()} busy={refreshing} />
          </div>
          <Segmented<StatusFilter>
            label="Filtrar pagamentos por status"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'Todos', count: counts.all },
              ...PAYMENT_STATUSES.map((s) => ({ id: s.id, label: s.plural, count: counts[s.id] })),
            ]}
          />
        </div>
      )}

      {error && payments.length > 0 && (
        <div className="mt-6">
          <InlineError message={error} onRetry={() => void reload()} retrying={refreshing} />
        </div>
      )}

      <div className="mt-6">{body}</div>
    </section>
  );
}
