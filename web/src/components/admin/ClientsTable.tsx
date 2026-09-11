'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SearchX, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatDateBR } from '@/lib/format';
import type { Role } from '@/lib/types';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  InlineError,
  LoadingRows,
  RefreshButton,
  SearchField,
  Segmented,
  SectionLabel,
  SelectBox,
} from './AdminUI';
import { ROLE_OPTIONS, describeError, displayPhone, normalizeSearch, waLinkFor, type ClientProfile } from './admin-utils';
import type { Resource } from './useAdminData';

type RoleFilter = 'all' | Role;

interface PendingRole {
  client: ClientProfile;
  next: Role;
}

const roleLabel = (id: Role) => ROLE_OPTIONS.find((r) => r.id === id)?.label ?? id;

function displayName(c: ClientProfile): string {
  return c.full_name || c.email?.split('@')[0] || 'Cliente sem nome';
}

function initials(c: ClientProfile): string {
  const source = c.full_name || c.email || '';
  const parts = source
    .replace(/@.*/, '')
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '').slice(0, 2);
  return letters.toUpperCase() || 'T';
}

/** Clientes cadastrados e nível de acesso (Cliente, VIP, Admin). */
export function ClientsTable({ resource, currentUserId }: { resource: Resource<ClientProfile>; currentUserId: string }) {
  const { data: clients, loading, refreshing, error, reload, setData } = resource;
  const { toast } = useUI();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [pending, setPending] = useState<PendingRole | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const savingRef = useRef(false);

  const counts = useMemo(() => {
    const base: Record<RoleFilter, number> = { all: clients.length, client: 0, vip: 0, admin: 0 };
    clients.forEach((c) => {
      base[c.role] += 1;
    });
    return base;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    const digits = query.replace(/\D/g, '');
    return clients.filter((c) => {
      if (filter !== 'all' && c.role !== filter) return false;
      if (!q) return true;
      if (normalizeSearch(`${c.full_name ?? ''} ${c.email ?? ''} ${c.seasonal_palette ?? ''}`).includes(q)) return true;
      return digits.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(digits);
    });
  }, [clients, filter, query]);

  const applyRole = async (client: ClientProfile, next: Role) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSavingId(client.id);
    try {
      const { data, error: updateError } = await supabase.from('profiles').update({ role: next }).eq('id', client.id).select('id');
      if (updateError) throw updateError;
      if (!data || data.length === 0) {
        throw new Error('Nenhuma alteração foi aplicada. Confirme que sua conta tem papel de administração.');
      }
      setData((list) => list.map((c) => (c.id === client.id ? { ...c, role: next } : c)));
      toast(`${displayName(client)} agora tem acesso de ${roleLabel(next)}.`, 'success');
      savingRef.current = false;
      setPending(null);
      await reload();
    } catch (err) {
      toast(describeError(err, 'Não foi possível alterar o papel.'), 'error');
    } finally {
      savingRef.current = false;
      setSavingId(null);
    }
  };

  const requestRole = (client: ClientProfile, next: Role) => {
    if (client.id === currentUserId || next === client.role) return;
    if (next === 'admin' || client.role === 'admin') setPending({ client, next });
    else void applyRole(client, next);
  };

  const cancelPending = useCallback(() => {
    if (!savingRef.current) setPending(null);
  }, []);

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingRows rows={5} label="Carregando os clientes" />;
  } else if (error && clients.length === 0) {
    body = <ErrorState message={error} onRetry={() => void reload()} retrying={refreshing} />;
  } else if (clients.length === 0) {
    body = (
      <EmptyState icon={Users} title="Nenhuma conta cadastrada">
        As contas criadas no site aparecem aqui, com contato, cartela e nível de acesso.
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
        Ajuste a busca ou o filtro de papel.
      </EmptyState>
    );
  } else {
    body = (
      <>
        <div className="overflow-x-auto border border-line bg-surface/40">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <caption className="sr-only">Clientes cadastrados</caption>
            <thead>
              <tr className="border-b border-line-gold text-[0.6rem] uppercase tracking-[0.22em] text-smoke">
                <th scope="col" className="py-3.5 pl-4 pr-3 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Telefone
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Cartela
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Desde
                </th>
                <th scope="col" className="py-3.5 pl-3 pr-4 font-medium">
                  Papel
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((c) => {
                const self = c.id === currentUserId;
                const phone = displayPhone(c.phone);
                const chat = waLinkFor(c.phone);
                return (
                  <tr key={c.id} className="transition-colors duration-300 hover:bg-ivory/[0.02]">
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-3.5">
                        <span
                          className={cn(
                            'grid h-10 w-10 shrink-0 place-items-center rounded-full border font-display text-base',
                            c.role === 'admin'
                              ? 'border-gold bg-gold/10 text-gold-light'
                              : c.role === 'vip'
                                ? 'border-line-gold text-gold'
                                : 'border-line text-parchment',
                          )}
                          aria-hidden
                        >
                          {initials(c)}
                        </span>
                        <div className="min-w-0">
                          <p className="flex max-w-[18rem] items-center gap-2 text-sm text-ivory">
                            <span className={cn('truncate', !c.full_name && 'italic text-mist')}>{displayName(c)}</span>
                            {self && (
                              <span className="shrink-0 border border-line-gold px-1.5 py-0.5 text-[0.52rem] uppercase tracking-[0.2em] text-gold">
                                Você
                              </span>
                            )}
                          </p>
                          {c.email ? (
                            <a
                              href={`mailto:${c.email}`}
                              className="mt-0.5 block max-w-[18rem] truncate text-xs text-smoke transition-colors hover:text-gold-light"
                            >
                              {c.email}
                            </a>
                          ) : (
                            <p className="mt-0.5 text-xs text-smoke">E-mail não informado</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm tabular-nums">
                      {phone && chat ? (
                        <a
                          href={chat}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-parchment transition-colors hover:text-gold-light"
                          aria-label={`Conversar com ${displayName(c)} no WhatsApp: ${phone}`}
                        >
                          {phone}
                        </a>
                      ) : (
                        <span className="text-smoke">{phone || '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      {c.seasonal_palette ? (
                        <span className="font-display text-base italic text-gold-light">{c.seasonal_palette}</span>
                      ) : (
                        <span className="text-xs text-smoke">Sem leitura</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-mist">
                      {c.created_at ? formatDateBR(c.created_at) : '—'}
                    </td>
                    <td className="py-3 pl-3 pr-4">
                      <SelectBox
                        value={c.role}
                        onChange={(e) => requestRole(c, e.target.value as Role)}
                        disabled={self || savingId === c.id}
                        aria-label={self ? 'Seu papel (não pode ser alterado por você)' : `Papel de ${displayName(c)}`}
                        title={self ? 'Você não pode alterar o próprio papel' : undefined}
                        className="w-36"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </SelectBox>
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
          {' · '}o próprio papel não pode ser alterado
        </p>
      </>
    );
  }

  const promoting = pending?.next === 'admin';

  return (
    <section aria-labelledby="clientes-titulo">
      <div>
        <SectionLabel numeral="III">Clientes</SectionLabel>
        <h2 id="clientes-titulo" className="mt-3 font-display text-3xl text-ivory sm:text-4xl">
          Fichas da <em className="italic text-gold-light">clientela</em>
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist">
          VIP libera a experiência completa do Clube; Admin concede acesso total a este painel.
        </p>
      </div>

      {!loading && clients.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Buscar cliente"
              placeholder="Buscar por nome, e-mail, telefone ou cartela"
            />
            <RefreshButton onClick={() => void reload()} busy={refreshing} />
          </div>
          <Segmented<RoleFilter>
            label="Filtrar por papel"
            value={filter}
            onChange={setFilter}
            options={[{ id: 'all', label: 'Todos', count: counts.all }, ...ROLE_OPTIONS.map((r) => ({ id: r.id, label: r.plural, count: counts[r.id] }))]}
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
        {pending && (
          <ConfirmDialog
            key="papel"
            title={promoting ? 'Conceder acesso de administração' : 'Remover acesso de administração'}
            confirmLabel={promoting ? 'Tornar admin' : `Alterar para ${roleLabel(pending.next)}`}
            tone={promoting ? 'gold' : 'danger'}
            busy={savingId === pending.client.id}
            onConfirm={() => void applyRole(pending.client, pending.next)}
            onCancel={cancelPending}
          >
            {promoting ? (
              <>
                <p>
                  <span className="text-ivory">{displayName(pending.client)}</span> terá acesso total ao painel: acervo, pedidos,
                  dados de clientes e alteração de papéis.
                </p>
                <p className="mt-3">Conceda apenas a pessoas de confiança da loja.</p>
              </>
            ) : (
              <p>
                <span className="text-ivory">{displayName(pending.client)}</span> deixará de acessar a administração e passará a ter
                acesso de {roleLabel(pending.next)}.
              </p>
            )}
          </ConfirmDialog>
        )}
      </AnimatePresence>
    </section>
  );
}
