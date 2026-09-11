'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Inbox, SearchX, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ColorDot } from '@/components/ui/Swatch';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatBRL, formatDateBR } from '@/lib/format';
import type { OrderRow, OrderStatus } from '@/lib/types';
import {
  EmptyState,
  ErrorState,
  InlineError,
  LoadingRows,
  RefreshButton,
  SearchField,
  Segmented,
  SectionLabel,
  SelectBox,
  Thumb,
} from './AdminUI';
import { ORDER_STATUSES, describeError, displayPhone, formatTimeBR, normalizeSearch, waLinkFor } from './admin-utils';
import type { Resource } from './useAdminData';

type StatusFilter = 'all' | OrderStatus;

const STATUS_TONE: Record<OrderStatus, { bar: string; text: string }> = {
  novo: { bar: 'bg-gold', text: 'text-gold-light' },
  em_atendimento: { bar: 'bg-gold-dark', text: 'text-gold' },
  concluido: { bar: 'bg-success', text: 'text-success' },
  cancelado: { bar: 'bg-smoke', text: 'text-smoke' },
};

const statusLabel = (id: OrderStatus) => ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

function itemCount(order: OrderRow): number {
  return order.items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Pedidos enviados pela sacola: status, itens, contato e observações. */
export function OrdersBoard({ resource }: { resource: Resource<OrderRow> }) {
  const { data: orders, loading, refreshing, error, reload, setData } = resource;
  const { toast } = useUI();

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = { all: orders.length, novo: 0, em_atendimento: 0, concluido: 0, cancelado: 0 };
    orders.forEach((o) => {
      base[o.status] += 1;
    });
    return base;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    const digits = query.replace(/\D/g, '');
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false;
      if (!q) return true;
      if (normalizeSearch(o.customer_name).includes(q)) return true;
      if (o.id.toLowerCase().startsWith(q)) return true;
      return digits.length >= 3 && (o.customer_phone ?? '').replace(/\D/g, '').includes(digits);
    });
  }, [orders, filter, query]);

  const toggleItems = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const changeStatus = async (order: OrderRow, next: OrderStatus) => {
    if (next === order.status) return;
    const previous = order.status;
    setSaving((prev) => ({ ...prev, [order.id]: true }));
    setData((list) => list.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    try {
      const { data, error: updateError } = await supabase.from('orders').update({ status: next }).eq('id', order.id).select('id');
      if (updateError) throw updateError;
      if (!data || data.length === 0) {
        throw new Error('Nenhuma alteração foi aplicada. Confirme que sua conta tem papel de administração.');
      }
      toast(`Pedido de ${firstName(order.customer_name)} marcado como “${statusLabel(next)}”.`, 'success');
      await reload();
    } catch (err) {
      setData((list) => list.map((o) => (o.id === order.id ? { ...o, status: previous } : o)));
      toast(describeError(err, 'Não foi possível atualizar o pedido.'), 'error');
    } finally {
      setSaving((prev) => {
        const copy = { ...prev };
        delete copy[order.id];
        return copy;
      });
    }
  };

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingRows rows={4} label="Carregando os pedidos" />;
  } else if (error && orders.length === 0) {
    body = <ErrorState message={error} onRetry={() => void reload()} retrying={refreshing} />;
  } else if (orders.length === 0) {
    body = (
      <EmptyState icon={Inbox} title="Nenhum pedido por enquanto">
        Quando um cliente finalizar a sacola pelo WhatsApp, o pedido aparece aqui com itens, contato e observações.
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    body = (
      <EmptyState
        icon={SearchX}
        title="Nenhum pedido encontrado"
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
        Ajuste a busca ou o status para ver outros pedidos.
      </EmptyState>
    );
  } else {
    body = (
      <ul className="space-y-3">
        {filtered.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            open={Boolean(expanded[order.id])}
            saving={Boolean(saving[order.id])}
            onToggle={() => toggleItems(order.id)}
            onStatusChange={(next) => void changeStatus(order, next)}
          />
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby="pedidos-titulo">
      <div>
        <SectionLabel numeral="II">Pedidos</SectionLabel>
        <h2 id="pedidos-titulo" className="mt-3 font-display text-3xl text-ivory sm:text-4xl">
          Livro de <em className="italic text-gold-light">encomendas</em>
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist">
          Pedidos enviados pela sacola do site. O atendimento continua pelo WhatsApp; atualize o status para manter a ficha em dia.
        </p>
      </div>

      {!loading && orders.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <SearchField
              value={query}
              onChange={setQuery}
              label="Buscar pedido"
              placeholder="Buscar por cliente, telefone ou número"
            />
            <RefreshButton onClick={() => void reload()} busy={refreshing} />
          </div>
          <Segmented<StatusFilter>
            label="Filtrar pedidos por status"
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: 'Todos', count: counts.all },
              ...ORDER_STATUSES.map((s) => ({ id: s.id, label: s.plural, count: counts[s.id] })),
            ]}
          />
        </div>
      )}

      {error && orders.length > 0 && (
        <div className="mt-6">
          <InlineError message={error} onRetry={() => void reload()} retrying={refreshing} />
        </div>
      )}

      <div className="mt-6">{body}</div>
    </section>
  );
}

// ------------------------------------------------------------
// Cartão do pedido
// ------------------------------------------------------------
function OrderCard({
  order,
  open,
  saving,
  onToggle,
  onStatusChange,
}: {
  order: OrderRow;
  open: boolean;
  saving: boolean;
  onToggle: () => void;
  onStatusChange: (next: OrderStatus) => void;
}) {
  const tone = STATUS_TONE[order.status];
  const pieces = itemCount(order);
  const hasUnpriced = order.items.some((i) => i.priceCents === null);
  const phone = displayPhone(order.customer_phone);
  const dateLabel = order.created_at ? formatDateBR(order.created_at) : 'Data não registrada';
  const timeLabel = order.created_at ? formatTimeBR(order.created_at) : '';
  const number = order.id.replace(/-/g, '').slice(0, 6).toUpperCase();
  const chatLink = waLinkFor(
    order.customer_phone,
    `Olá, ${firstName(order.customer_name)}! Aqui é da Titi's Store, sobre o seu pedido nº ${number}${
      order.created_at ? ` de ${dateLabel}` : ''
    }.`,
  );
  const itemsId = `pedido-${order.id}-itens`;

  return (
    <li className={cn('relative border border-line bg-surface/40 transition-opacity', order.status === 'cancelado' && 'opacity-75')}>
      <span className={cn('absolute inset-y-0 left-0 w-0.5', tone.bar)} aria-hidden />

      <div className="grid gap-5 px-5 py-5 sm:px-6 md:grid-cols-[9.5rem_minmax(0,1fr)_auto] lg:grid-cols-[10rem_minmax(0,1fr)_10rem_15rem] lg:items-center">
        {/* Data */}
        <div>
          <p className="font-display text-xl leading-tight text-ivory">{dateLabel}</p>
          <p className="mt-1 text-xs tabular-nums text-smoke">
            {timeLabel && `${timeLabel} · `}Nº {number}
          </p>
        </div>

        {/* Cliente */}
        <div className="min-w-0">
          <p className="truncate text-base text-ivory">{order.customer_name}</p>
          {phone && chatLink ? (
            <a
              href={chatLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm tabular-nums text-mist transition-colors hover:text-gold-light"
            >
              {phone}
            </a>
          ) : (
            <p className="mt-1 text-sm text-smoke">{phone || 'Telefone não informado'}</p>
          )}
          {order.user_id && <p className="mt-1 text-[0.6rem] uppercase tracking-[0.2em] text-smoke">Cliente com conta</p>}
        </div>

        {/* Total */}
        <div className="md:text-right lg:text-left">
          <p className="text-[0.6rem] uppercase tracking-[0.22em] text-smoke">Total</p>
          <p className="mt-1 font-display text-2xl leading-none tabular-nums text-ivory">
            {order.total_cents === null ? <span className="italic text-mist">Sob consulta</span> : formatBRL(order.total_cents)}
          </p>
          {order.total_cents !== null && hasUnpriced && <p className="mt-1 text-xs text-smoke">+ itens sob consulta</p>}
        </div>

        {/* Status e contato */}
        <div className="flex flex-col gap-2.5 md:col-span-3 md:flex-row md:items-center md:justify-between lg:col-span-1 lg:flex-col lg:items-stretch">
          <div className="flex items-center gap-3">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.bar)} aria-hidden />
            <SelectBox
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
              disabled={saving}
              aria-label={`Status do pedido de ${order.customer_name}`}
              className="flex-1 md:w-52 md:flex-none lg:w-auto lg:flex-1"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </SelectBox>
          </div>
          {chatLink ? (
            <a
              href={chatLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              aria-label={`Abrir conversa com ${order.customer_name} no WhatsApp`}
            >
              <WhatsAppIcon className="h-3.5 w-3.5" />
              Abrir conversa
            </a>
          ) : (
            <span className="btn btn-ghost btn-sm pointer-events-none opacity-40" aria-disabled="true">
              Sem telefone
            </span>
          )}
        </div>
      </div>

      {order.notes && (
        <div className="flex gap-3 border-t border-line px-5 py-3.5 sm:px-6">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
          <p className="whitespace-pre-line text-sm leading-relaxed text-parchment">
            <span className="sr-only">Observações: </span>
            {order.notes}
          </p>
        </div>
      )}

      <div className="border-t border-line">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={itemsId}
          disabled={order.items.length === 0}
          className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-[0.64rem] font-medium uppercase tracking-[0.2em] text-mist transition-colors hover:text-gold-light disabled:cursor-default disabled:hover:text-mist sm:px-6"
        >
          <span>
            {order.items.length === 0 ? 'Pedido sem itens registrados' : `${pieces} ${pieces === 1 ? 'peça' : 'peças'}`}
            {order.items.length > 0 && <span className="ml-2 text-smoke">{open ? 'Ocultar itens' : 'Ver itens'}</span>}
          </span>
          {order.items.length > 0 && (
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-300', open && 'rotate-180 text-gold')}
              strokeWidth={1.5}
              aria-hidden
            />
          )}
        </button>

        {open && order.items.length > 0 && (
          <div id={itemsId} className="overflow-x-auto border-t border-line bg-coal/50">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <caption className="sr-only">Itens do pedido de {order.customer_name}</caption>
              <thead>
                <tr className="text-[0.58rem] uppercase tracking-[0.22em] text-smoke">
                  <th scope="col" className="py-2.5 pl-5 pr-3 font-medium sm:pl-6">
                    Peça
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Tamanho
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-medium">
                    Cor
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center font-medium">
                    Qtd.
                  </th>
                  <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-medium sm:pr-6">
                    Preço
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {order.items.map((item) => (
                  <tr key={item.key}>
                    <td className="py-2.5 pl-5 pr-3 sm:pl-6">
                      <div className="flex items-center gap-3">
                        <Thumb src={item.image} alt={item.name} className="h-12 w-9" />
                        <div className="min-w-0">
                          <p className="max-w-[16rem] truncate text-ivory">{item.name}</p>
                          <p className="max-w-[16rem] truncate text-xs text-smoke">
                            {item.lookTitle ? `Look “${item.lookTitle}”` : item.detail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-parchment">{item.size ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {item.color || item.hex ? (
                        <span className="flex items-center gap-2 text-parchment">
                          {/^#[0-9a-f]{3,6}$/i.test(item.hex) && <ColorDot hex={item.hex} size={10} />}
                          {item.color || item.hex}
                        </span>
                      ) : (
                        <span className="text-smoke">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-parchment">{item.quantity}</td>
                    <td className="whitespace-nowrap py-2.5 pl-3 pr-5 text-right tabular-nums sm:pr-6">
                      {item.priceCents === null ? (
                        <span className="italic text-mist">Sob consulta</span>
                      ) : (
                        <>
                          <span className="text-ivory">{formatBRL(item.priceCents * item.quantity)}</span>
                          {item.quantity > 1 && (
                            <span className="block text-xs text-smoke">{formatBRL(item.priceCents)} cada</span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </li>
  );
}
