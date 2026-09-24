'use client';

import { useMemo, useState } from 'react';
import { 
  ChevronDown, 
  Inbox, 
  SearchX, 
  StickyNote, 
  Truck, 
  Mail, 
  CreditCard, 
  Send, 
  CheckCircle,
  ExternalLink,
  Printer,
  FileText,
  Loader2,
  Sparkles,
  MapPin,
  Edit2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ColorDot } from '@/components/ui/Swatch';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatBRL, formatDateBR } from '@/lib/format';
import type { OrderRow, OrderStatus } from '@/lib/types';
import { PushNotificationCard } from '@/components/notifications/PushNotificationCard';
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
import { generateShippingLabelAction, dispatchOrderAction, updateOrderAddressAction } from '@/app/admin/actions';

type StatusFilter = 'all' | OrderStatus;

const STATUS_TONE: Record<OrderStatus, { bar: string; text: string }> = {
  novo: { bar: 'bg-gold', text: 'text-gold-light' },
  pending: { bar: 'bg-amber-500', text: 'text-amber-400' },
  paid: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
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

/** Pedidos da loja e consultoria: status, itens, endereço, rastreamento e notificações */
export function OrdersBoard({ resource }: { resource: Resource<OrderRow> }) {
  const { data: orders, loading, refreshing, error, reload, setData } = resource;
  const { toast } = useUI();

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [generatingLabel, setGeneratingLabel] = useState<Record<string, boolean>>({});
  const [editingAddressOrder, setEditingAddressOrder] = useState<OrderRow | null>(null);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = { 
      all: orders.length, 
      novo: 0, 
      pending: 0,
      paid: 0,
      em_atendimento: 0, 
      concluido: 0, 
      cancelado: 0 
    };
    orders.forEach((o) => {
      if (base[o.status] !== undefined) {
        base[o.status] += 1;
      }
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
      if (o.id.toLowerCase().includes(q)) return true;
      if (o.customer_email && normalizeSearch(o.customer_email).includes(q)) return true;
      if (o.tracking_code && normalizeSearch(o.tracking_code).includes(q)) return true;
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
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({ status: next })
        .eq('id', order.id)
        .select('id');
      if (updateError) throw updateError;
      if (!data || data.length === 0) {
        throw new Error('Nenhuma alteração foi aplicada. Confirme privilégios de admin.');
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

  const handleDispatch = async (order: OrderRow, trackingCode: string, carrier: string) => {
    try {
      let data: any = null;
      try {
        data = await dispatchOrderAction(order.id, trackingCode, carrier, undefined, order);
      } catch (actionErr) {
        console.warn('[OrdersBoard] dispatchOrderAction falhou, recorrendo a HTTP:', actionErr);
        const res = await fetch('/api/admin/orders/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            trackingCode,
            trackingCarrier: carrier,
            order,
          }),
        });
        data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || `Falha ao despachar pedido (HTTP ${res.status}).`);
        }
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao despachar pedido.');
      }

      // Sincroniza diretamente no banco com a sessão ativa de admin do navegador
      try {
        await supabase
          .from('orders')
          .update({
            status: 'concluido',
            tracking_code: trackingCode.trim(),
            tracking_carrier: carrier,
            dispatched_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      } catch (syncErr) {
        console.warn('[OrdersBoard] Erro ao sincronizar despacho localmente:', syncErr);
      }

      toast('Pedido despachado! Notificações enviadas por WhatsApp, E-mail e Push.', 'success');
      await reload();
    } catch (err: any) {
      toast(err.message || 'Falha ao despachar pedido.', 'error');
    }
  };

  const handleGenerateLabel = async (order: OrderRow) => {
    const orderId = order.id;

    // 1. Verifica se é Retirada no Atelier
    let addr = order.shipping_address;
    if (typeof addr === 'string') {
      try {
        addr = JSON.parse(addr);
      } catch {
        addr = {};
      }
    }

    const isRetirada =
      order.shipping_service_id === 'retirada-betim' ||
      String(order.shipping_service_name || '').toLowerCase().includes('retirada') ||
      String(addr?.street || '').toLowerCase().includes('retirada');

    if (isRetirada) {
      toast('Este pedido é para "Retirada Presencial no Atelier". Não há emissão de etiqueta postal.', 'info');
      return;
    }

    // 2. Extrai e valida o CEP antes de chamar a transportadora
    const rawCep = addr?.cep || addr?.postal_code || addr?.postalCode || addr?.zip || '';
    let cleanDest = String(rawCep).replace(/\D/g, '');
    if (cleanDest.length === 7) cleanDest = cleanDest.padStart(8, '0');

    if (!cleanDest || cleanDest.length !== 8) {
      toast(`O CEP de entrega cadastrado ("${rawCep || 'vazio'}") é inválido. A transportadora exige 8 dígitos. Abrindo editor de endereço...`, 'error');
      setEditingAddressOrder(order);
      return;
    }

    const street = addr?.street || addr?.logradouro || addr?.endereco || '';
    if (!street) {
      toast('O endereço de entrega está sem rua/logradouro. Preencha o endereço.', 'error');
      setEditingAddressOrder(order);
      return;
    }

    setGeneratingLabel((prev) => ({ ...prev, [orderId]: true }));
    try {
      toast('Conectando ao SuperFrete e emitindo etiqueta oficial...', 'info');
      let data: any = null;
      try {
        data = await generateShippingLabelAction(orderId, order.shipping_service_id || undefined, order);
      } catch (actionErr) {
        console.warn('[OrdersBoard] generateShippingLabelAction falhou, recorrendo a HTTP:', actionErr);
        const res = await fetch('/api/admin/orders/generate-label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, order }),
        });
        data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || `Falha ao emitir etiqueta (HTTP ${res.status}).`);
        }
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao emitir etiqueta.');
      }

      // Sincroniza diretamente no banco com a sessão ativa de admin do navegador
      try {
        await supabase
          .from('orders')
          .update({
            shipping_label_url: data.labelUrl || null,
            tracking_code: data.trackingCode || null,
            tracking_carrier: data.carrier || null,
            status: 'concluido',
            dispatched_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      } catch (syncErr) {
        console.warn('[OrdersBoard] Erro ao sincronizar etiqueta localmente:', syncErr);
      }

      toast(`Etiqueta gerada! Rastreio: ${data.trackingCode}. Notificações enviadas!`, 'success');
      await reload();
      if (data.labelUrl) {
        window.open(data.labelUrl, '_blank');
      }
    } catch (err: any) {
      toast(err.message || 'Falha ao emitir etiqueta.', 'error');
    } finally {
      setGeneratingLabel((prev) => {
        const copy = { ...prev };
        delete copy[orderId];
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
        Quando um cliente finalizar compras pelo checkout ou WhatsApp, os pedidos aparecerão aqui.
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
              setFilter('all');
              setQuery('');
            }}
          >
            Limpar filtros
          </Button>
        }
      >
        Tente buscar com outros termos ou altere o status selecionado.
      </EmptyState>
    );
  } else {
    body = (
      <ul className="divide-y divide-line">
        {filtered.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            open={Boolean(expanded[order.id])}
            saving={Boolean(saving[order.id])}
            generatingLabel={Boolean(generatingLabel[order.id])}
            onToggle={() => toggleItems(order.id)}
            onStatusChange={(next) => void changeStatus(order, next)}
            onDispatch={(code, carrier) => handleDispatch(order, code, carrier)}
            onGenerateLabel={() => handleGenerateLabel(order)}
            onEditAddress={() => setEditingAddressOrder(order)}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <SectionLabel numeral="IV">Vendas & Pedidos</SectionLabel>
          <h2 className="mt-1 font-display text-2xl text-ivory">Quadro de Pedidos</h2>
        </div>
        <RefreshButton onClick={() => void reload()} busy={refreshing} />
      </div>

      {error && orders.length > 0 && (
        <InlineError message={error} onRetry={() => void reload()} retrying={refreshing} />
      )}

      <PushNotificationCard />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Filtro de pedidos"
          value={filter}
          onChange={(v) => setFilter(v as StatusFilter)}
          options={[
            { id: 'all', label: `Todos (${counts.all})` },
            { id: 'pending', label: `Aguardando (${counts.pending})` },
            { id: 'paid', label: `Pagos (${counts.paid})` },
            { id: 'em_atendimento', label: `Preparação (${counts.em_atendimento})` },
            { id: 'concluido', label: `Enviados (${counts.concluido})` },
            { id: 'cancelado', label: `Cancelados (${counts.cancelado})` },
          ]}
        />
        <div className="w-full sm:w-64">
          <SearchField 
            label="Buscar pedidos"
            value={query} 
            onChange={setQuery} 
            placeholder="Buscar por cliente, id, rastreio..." 
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface/30">{body}</div>

      {editingAddressOrder && (
        <EditAddressModal
          order={editingAddressOrder}
          onClose={() => setEditingAddressOrder(null)}
          onSaved={(updated) => {
            setData((list) => list.map((o) => (o.id === updated.id ? updated : o)));
            setEditingAddressOrder(null);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------
function OrderCard({
  order,
  open,
  saving,
  generatingLabel,
  onToggle,
  onStatusChange,
  onDispatch,
  onGenerateLabel,
  onEditAddress,
}: {
  order: OrderRow;
  open: boolean;
  saving: boolean;
  generatingLabel: boolean;
  onToggle: () => void;
  onStatusChange: (next: OrderStatus) => void;
  onDispatch: (code: string, carrier: string) => Promise<void>;
  onGenerateLabel: () => Promise<void>;
  onEditAddress: () => void;
}) {
  const tone = STATUS_TONE[order.status] || STATUS_TONE.novo;
  const pieces = itemCount(order);
  const hasUnpriced = order.items.some((i) => i.priceCents === null);
  const phone = displayPhone(order.customer_phone);
  const dateLabel = order.created_at ? formatDateBR(order.created_at) : 'Data não registrada';
  const timeLabel = order.created_at ? formatTimeBR(order.created_at) : '';

  const addressObj = useMemo(() => {
    if (!order.shipping_address) return null;
    if (typeof order.shipping_address === 'string') {
      try {
        return JSON.parse(order.shipping_address);
      } catch {
        return null;
      }
    }
    return order.shipping_address;
  }, [order.shipping_address]);

  const isRetirada =
    order.shipping_service_id === 'retirada-betim' ||
    String(order.shipping_service_name || '').toLowerCase().includes('retirada') ||
    String(addressObj?.street || '').toLowerCase().includes('retirada');

  const isPlan =
    order.id.includes('-PLAN-') ||
    (order.channel as string) === 'consultor' ||
    Boolean(order.notes && order.notes.includes('Plano')) ||
    order.items.some(
      (i) =>
        i.name.toLowerCase().includes('assinatura') ||
        i.name.toLowerCase().includes('consultoria') ||
        i.name.toLowerCase().includes('passe') ||
        i.name.toLowerCase().includes('clube')
    );

  const [showDispatchInput, setShowDispatchInput] = useState(false);
  const [trackingInput, setTrackingInput] = useState(order.tracking_code || '');
  const [carrierInput, setCarrierInput] = useState(order.tracking_carrier || 'Correios');
  const [dispatching, setDispatching] = useState(false);

  const chatLink = waLinkFor(
    order.customer_phone,
    `Olá, ${firstName(order.customer_name)}! Aqui é da Titi's Store sobre o seu pedido #${order.id}.`,
  );
  const itemsId = `pedido-${order.id}-itens`;

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) return;
    setDispatching(true);
    try {
      await onDispatch(trackingInput.trim(), carrierInput.trim());
      setShowDispatchInput(false);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <li className={cn('relative border-b border-line bg-surface/40 transition-opacity', order.status === 'cancelado' && 'opacity-75')}>
      <span className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} aria-hidden />

      <div className="grid gap-5 px-5 py-5 sm:px-6 md:grid-cols-[10rem_minmax(0,1fr)_auto] lg:grid-cols-[10.5rem_minmax(0,1fr)_9.5rem_17.5rem] xl:grid-cols-[11rem_minmax(0,1fr)_10rem_19rem] lg:items-center">
        {/* Data e ID */}
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-display text-lg leading-tight text-ivory">{dateLabel}</p>
            {isPlan && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/40">
                Consultor
              </span>
            )}
            {order.channel === 'mercadopago' ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Mercado Pago
              </span>
            ) : (order.channel as string) === 'consultor' ? null : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gold/10 text-gold border border-line-gold">
                WhatsApp
              </span>
            )}
          </div>
          <p className="mt-1 text-xs tabular-nums text-smoke">
            {timeLabel && `${timeLabel} · `}#{order.id}
          </p>
        </div>

        {/* Cliente e Contato */}
        <div className="min-w-0 space-y-1">
          <p className="truncate text-base font-bold text-ivory">{order.customer_name}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-mist">
            {phone && (
              <a
                href={chatLink || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-gold-light transition-colors"
              >
                <WhatsAppIcon className="h-3 w-3 text-emerald-400" />
                <span>{phone}</span>
              </a>
            )}
            {order.customer_email && (
              <span className="inline-flex items-center gap-1 text-smoke">
                <Mail className="h-3 w-3" />
                <span>{order.customer_email}</span>
              </span>
            )}
            {order.customer_cpf && (
              <span className="text-smoke">CPF: {order.customer_cpf}</span>
            )}
          </div>
        </div>

        {/* Total e Pagamento */}
        <div className="md:text-right lg:text-left">
          <p className="text-[0.6rem] uppercase tracking-[0.22em] text-smoke">Total</p>
          <p className="mt-1 font-display text-2xl leading-none tabular-nums text-gold">
            {order.total_cents === null ? <span className="italic text-mist">Sob consulta</span> : formatBRL(order.total_cents)}
          </p>
          {order.payment_method && (
            <p className="mt-1 text-[11px] text-smoke uppercase tracking-wider">
              {order.payment_method === 'pix' ? 'Pix Instantâneo' : 'Cartão de Crédito'}
            </p>
          )}
          {order.shipping_service_name && (
            <p className="text-[10px] text-mist">
              Frete: {order.shipping_service_name}
            </p>
          )}
        </div>

        {/* Status e Ações */}
        <div className="flex flex-col gap-2.5 md:col-span-3 md:flex-row md:items-center md:justify-between lg:col-span-1 lg:flex-col lg:items-stretch">
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', tone.bar)} aria-hidden />
            <SelectBox
              value={order.status}
              onChange={(e) => onStatusChange(e.target.value as OrderStatus)}
              disabled={saving}
              className="flex-1 md:w-52 md:flex-none lg:w-full text-xs"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </SelectBox>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center lg:flex-col lg:items-stretch">
            {/* Ação de Etiqueta SuperFrete / Correios ou Acesso Digital / Retirada */}
            {isPlan ? (
              <span className="inline-flex h-8 items-center justify-center gap-1.5 px-3 bg-purple-500/10 border border-purple-500/25 text-purple-300 rounded-full text-xs font-semibold tracking-wide shrink-0 w-full md:w-auto lg:w-full">
                <CheckCircle className="h-3.5 w-3.5 text-purple-400" />
                <span className="truncate">Acesso Digital</span>
              </span>
            ) : isRetirada ? (
              <span className="inline-flex h-8 items-center justify-center gap-1.5 px-3 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-full text-xs font-semibold tracking-wide shrink-0 w-full md:w-auto lg:w-full" title="Retirada no Atelier em Betim/MG">
                <Truck className="h-3.5 w-3.5 text-amber-400" />
                <span className="truncate">Retirada no Atelier</span>
              </span>
            ) : order.shipping_label_url ? (
              <a
                href={order.shipping_label_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold h-8 justify-center px-3 text-xs tracking-wider gap-1.5 shadow-md shadow-gold/20 shrink-0 w-full md:w-auto lg:w-full"
              >
                <Printer className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Imprimir Etiqueta</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={onGenerateLabel}
                disabled={generatingLabel}
                className="btn btn-gold h-8 justify-center px-3 text-xs tracking-wider gap-1.5 shadow-md shadow-gold/15 shrink-0 w-full md:w-auto lg:w-full"
              >
                {generatingLabel ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{generatingLabel ? 'Emitindo...' : 'Gerar Etiqueta'}</span>
              </button>
            )}

            {/* Ações Secundárias: WhatsApp e Despacho */}
            <div
              className={cn(
                'grid gap-2 shrink-0',
                chatLink
                  ? 'grid-cols-2 md:flex md:items-center lg:grid lg:grid-cols-2'
                  : 'grid-cols-1 md:flex md:items-center lg:grid lg:grid-cols-1',
              )}
            >
              {chatLink && (
                <a
                  href={chatLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline h-8 justify-center px-2.5 text-xs tracking-wider gap-1.5 shrink-0 w-full md:w-auto lg:w-full"
                  title="Conversar no WhatsApp"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="truncate">WhatsApp</span>
                </a>
              )}

              {!order.tracking_code ? (
                <button
                  type="button"
                  onClick={() => setShowDispatchInput(!showDispatchInput)}
                  className={cn(
                    'btn btn-outline h-8 justify-center px-2.5 text-xs tracking-wider gap-1.5 shrink-0 transition-all w-full md:w-auto lg:w-full',
                    showDispatchInput && 'border-gold text-gold bg-gold/10',
                  )}
                  title="Inserir rastreio manual"
                >
                  <Truck className="h-3.5 w-3.5 shrink-0 text-gold" />
                  <span className="truncate">Manual</span>
                </button>
              ) : (
                <span className="inline-flex h-8 items-center justify-center gap-1.5 px-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold tracking-wider shrink-0 w-full md:w-auto lg:w-full">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Despachado</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL DE DESPACHO MANUAL */}
      {showDispatchInput && (
        <form
          onSubmit={handleDispatchSubmit}
          className="border-t border-line bg-surface-2/90 px-5 py-4 sm:px-6 flex flex-wrap items-center gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-parchment shrink-0">
            <Truck className="h-4 w-4 text-gold shrink-0" />
            <span>Despachar Manualmente:</span>
          </div>

          <input
            type="text"
            required
            placeholder="Código de rastreio (ex: AA123456789BR)"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            className="min-w-[200px] flex-1 bg-obsidian border border-line rounded-lg px-3 py-2 text-xs text-ivory font-mono placeholder:text-smoke focus:border-gold outline-none transition-colors"
          />

          <input
            type="text"
            placeholder="Transportadora (Correios, etc)"
            value={carrierInput}
            onChange={(e) => setCarrierInput(e.target.value)}
            className="w-full sm:w-44 bg-obsidian border border-line rounded-lg px-3 py-2 text-xs text-ivory placeholder:text-smoke focus:border-gold outline-none transition-colors"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto justify-end">
            <button
              type="button"
              onClick={() => setShowDispatchInput(false)}
              className="btn btn-ghost h-8 px-3 text-xs text-smoke hover:text-parchment shrink-0"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={dispatching}
              className="btn btn-gold h-8 px-4 gap-1.5 text-xs font-bold uppercase tracking-wider shadow-md shadow-gold/20 shrink-0"
            >
              {dispatching ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{dispatching ? 'Enviando...' : 'Confirmar Envio'}</span>
            </button>
          </div>
        </form>
      )}

      {/* RASTREIO CONFIRMADO */}
      {order.tracking_code && (
        <div className="border-t border-line bg-surface/30 px-5 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-gold" />
            <span className="text-mist font-semibold">Rastreamento ({order.tracking_carrier || 'Correios'}):</span>
            <span className="font-mono font-bold text-ivory bg-obsidian px-2 py-0.5 rounded border border-line">
              {order.tracking_code}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {order.shipping_label_url && (
              <a
                href={order.shipping_label_url}
                target="_blank"
                rel="noreferrer"
                className="text-gold font-bold hover:underline inline-flex items-center gap-1"
              >
                <Printer className="h-3 w-3" />
                <span>Ver Etiqueta Impressa</span>
              </a>
            )}
            <a
              href={
                order.tracking_url ||
                `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(order.tracking_code)}`
              }
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:underline inline-flex items-center gap-1 font-bold"
            >
              <span>Acompanhar nos Correios</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* ENDEREÇO DE ENTREGA OU ACESSO DIGITAL */}
      {addressObj ? (
        <div className="border-t border-line bg-surface/20 px-5 py-3 sm:px-6 text-xs text-mist flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 items-start flex-1 min-w-[200px]">
            <Truck className="h-4 w-4 text-gold shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-parchment">Endereço de Entrega: </span>
              {addressObj.street ? `${addressObj.street}, ${addressObj.number || 'S/N'}` : 'Rua não informada'}
              {addressObj.complement ? ` (${addressObj.complement})` : ''}
              {addressObj.neighborhood ? ` - ${addressObj.neighborhood}` : ''}
              {addressObj.city ? `, ${addressObj.city}/${addressObj.state || 'MG'}` : ''}
              {addressObj.cep ? (
                <span className="font-mono ml-1 text-ivory">· CEP {addressObj.cep}</span>
              ) : (
                <span className="text-amber-400 font-bold ml-1">· CEP NÃO INFORMADO</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onEditAddress}
            className="btn btn-outline h-7 px-2.5 text-[11px] gap-1 text-gold hover:text-gold-light border-gold/40 hover:border-gold ml-auto shrink-0"
            title="Editar endereço ou CEP para transportadora"
          >
            <Edit2 className="h-3 w-3" />
            <span>Editar Endereço</span>
          </button>
        </div>
      ) : !isPlan && !isRetirada ? (
        <div className="border-t border-line bg-amber-500/5 px-5 py-3 sm:px-6 text-xs text-amber-300 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 items-center">
            <Truck className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Endereço de entrega não cadastrado neste pedido.</span>
          </div>
          <button
            type="button"
            onClick={onEditAddress}
            className="btn btn-gold h-7 px-2.5 text-[11px] gap-1 ml-auto shrink-0"
          >
            <MapPin className="h-3 w-3" />
            <span>Cadastrar Endereço</span>
          </button>
        </div>
      ) : null}

      {isPlan && (
        <div className="border-t border-line bg-purple-500/5 px-5 py-2.5 sm:px-6 text-xs text-purple-300 flex gap-2 items-center">
          <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
          <span>Plano de Consultoria Online · Acesso liberado no sistema para o comprador</span>
        </div>
      )}

      {order.notes && (
        <div className="flex gap-3 border-t border-line px-5 py-3.5 sm:px-6">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
          <p className="whitespace-pre-line text-sm leading-relaxed text-parchment">
            <span className="sr-only">Observações: </span>
            {order.notes}
          </p>
        </div>
      )}

      {/* ITENS DO PEDIDO */}
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
              <caption className="sr-only">Itens do pedido #{order.id}</caption>
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
                          <p className="max-w-[16rem] truncate text-ivory font-semibold">{item.name}</p>
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
                    <td className="px-3 py-2.5 text-center tabular-nums text-parchment font-bold">{item.quantity}</td>
                    <td className="whitespace-nowrap py-2.5 pl-3 pr-5 text-right tabular-nums sm:pr-6">
                      {item.priceCents === null ? (
                        <span className="italic text-mist">Sob consulta</span>
                      ) : (
                        <>
                          <span className="text-gold font-bold">{formatBRL(item.priceCents * item.quantity)}</span>
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

// ------------------------------------------------------------
// MODAL DE EDIÇÃO DE ENDEREÇO E DESTINATÁRIO DO PEDIDO
// ------------------------------------------------------------
interface EditAddressModalProps {
  order: OrderRow;
  onClose: () => void;
  onSaved: (updatedOrder: OrderRow) => void;
}

function EditAddressModal({ order, onClose, onSaved }: EditAddressModalProps) {
  const { toast } = useUI();

  let initialAddr: Record<string, any> = {};
  if (typeof order.shipping_address === 'string') {
    try {
      initialAddr = JSON.parse(order.shipping_address);
    } catch {
      initialAddr = {};
    }
  } else if (order.shipping_address && typeof order.shipping_address === 'object') {
    initialAddr = order.shipping_address;
  }

  const [name, setName] = useState(order.customer_name || initialAddr.name || '');
  const [phone, setPhone] = useState(order.customer_phone || initialAddr.phone || '');
  const [email, setEmail] = useState(order.customer_email || initialAddr.email || '');
  const [cpf, setCpf] = useState(order.customer_cpf || initialAddr.document || initialAddr.cpf || '');

  const [cep, setCep] = useState(
    initialAddr.cep || initialAddr.postal_code || initialAddr.postalCode || initialAddr.zip || ''
  );
  const [street, setStreet] = useState(
    initialAddr.street || initialAddr.logradouro || initialAddr.rua || ''
  );
  const [number, setNumber] = useState(
    initialAddr.number || initialAddr.numero || ''
  );
  const [complement, setComplement] = useState(
    initialAddr.complement || initialAddr.complemento || ''
  );
  const [neighborhood, setNeighborhood] = useState(
    initialAddr.neighborhood || initialAddr.bairro || ''
  );
  const [city, setCity] = useState(
    initialAddr.city || initialAddr.cidade || ''
  );
  const [state, setState] = useState(
    initialAddr.state || initialAddr.uf || 'MG'
  );

  const [searchingCep, setSearchingCep] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCepSearch = async (cepInput: string) => {
    const clean = cepInput.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setStreet(data.logradouro);
          if (data.bairro) setNeighborhood(data.bairro);
          if (data.localidade) setCity(data.localidade);
          if (data.uf) setState(data.uf);
          toast('Endereço autocompletado pelo CEP via ViaCEP!', 'success');
        } else {
          toast('CEP não encontrado na base dos Correios.', 'error');
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar ViaCEP:', e);
    } finally {
      setSearchingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 7) cleanCep = cleanCep.padStart(8, '0');

    if (cleanCep.length !== 8) {
      toast('O CEP deve conter exatamente 8 dígitos válidos.', 'error');
      return;
    }

    if (!street.trim()) {
      toast('O logradouro/rua é obrigatório.', 'error');
      return;
    }

    if (!city.trim() || !state.trim()) {
      toast('Cidade e Estado são obrigatórios.', 'error');
      return;
    }

    setSaving(true);
    const shippingAddress = {
      street: street.trim(),
      number: number.trim() || 'S/N',
      complement: complement.trim(),
      neighborhood: neighborhood.trim() || 'Centro',
      city: city.trim(),
      state: state.trim().toUpperCase().slice(0, 2),
      cep: cleanCep,
    };

    const customer = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      cpf: cpf.trim() || undefined,
    };

    try {
      let resData: any = null;
      try {
        resData = await updateOrderAddressAction(order.id, shippingAddress, customer);
      } catch (actionErr) {
        console.warn('updateOrderAddressAction falhou, tentando API route:', actionErr);
        const res = await fetch('/api/admin/orders/update-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            shippingAddress,
            customer,
          }),
        });
        resData = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(resData?.error || `Falha ao salvar endereço (HTTP ${res.status}).`);
        }
      }

      if (!resData?.success) {
        throw new Error(resData?.error || 'Falha ao salvar endereço.');
      }

      // Sincroniza diretamente no Supabase com a sessão do navegador
      try {
        await supabase
          .from('orders')
          .update({
            shipping_address: shippingAddress,
            customer_name: customer.name || order.customer_name,
            customer_phone: customer.phone || order.customer_phone,
            customer_email: customer.email || order.customer_email,
            customer_cpf: customer.cpf || order.customer_cpf,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);
      } catch (clientSyncErr) {
        console.warn('Erro ao atualizar Supabase pelo cliente:', clientSyncErr);
      }

      const updatedOrder: OrderRow = {
        ...order,
        customer_name: customer.name || order.customer_name,
        customer_phone: customer.phone || order.customer_phone,
        customer_email: customer.email || order.customer_email,
        customer_cpf: customer.cpf || order.customer_cpf,
        shipping_address: shippingAddress,
      };

      onSaved(updatedOrder);
      toast('Endereço e dados do pedido salvos com sucesso!', 'success');
      onClose();
    } catch (err: any) {
      toast(err.message || 'Erro ao salvar alterações no endereço.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Editar Endereço · Pedido #${order.id}`} showTitle onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5 p-6">
        <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-xs text-parchment leading-relaxed flex items-start gap-3">
          <Truck className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gold">Validação para SuperFrete e Correios</p>
            <p className="text-smoke mt-0.5">
              Certifique-se de que o CEP contenha exatamente 8 dígitos numéricos válidos e o nome possua nome e sobrenome. A transportadora recusa etiquetas com CEP incompleto ou inexistente nos Correios.
            </p>
          </div>
        </div>

        {/* Dados do Destinatário */}
        <div>
          <h4 className="text-xs uppercase font-bold tracking-wider text-mist mb-3">1. Dados do Destinatário</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-mist font-semibold mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-mist font-semibold mb-1">CPF (para declaração de conteúdo)</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-mist font-semibold mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(31) 99999-9999"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>
            <div>
              <label className="block text-mist font-semibold mb-1">E-mail do Cliente</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>
          </div>
        </div>

        {/* Endereço de Entrega */}
        <div className="border-t border-line pt-4">
          <h4 className="text-xs uppercase font-bold tracking-wider text-mist mb-3">2. Endereço de Entrega</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-mist font-semibold mb-1">CEP (8 dígitos) *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={cep}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCep(val);
                    const clean = val.replace(/\D/g, '');
                    if (clean.length === 8) {
                      handleCepSearch(clean);
                    }
                  }}
                  onBlur={() => handleCepSearch(cep)}
                  placeholder="00000-000"
                  className="w-full bg-obsidian border border-line rounded-lg pl-3 pr-8 py-2 text-ivory font-mono placeholder:text-smoke focus:border-gold outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleCepSearch(cep)}
                  disabled={searchingCep}
                  className="absolute right-2 top-2.5 text-smoke hover:text-gold transition-colors"
                  title="Buscar dados no ViaCEP"
                >
                  {searchingCep ? <Loader2 className="h-4 w-4 animate-spin text-gold" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-mist font-semibold mb-1">Rua / Logradouro *</label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Ex: Av. Afonso Pena"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-mist font-semibold mb-1">Número *</label>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="100 ou S/N"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-mist font-semibold mb-1">Complemento</label>
              <input
                type="text"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apto 101, Bloco B"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-mist font-semibold mb-1">Bairro *</label>
              <input
                type="text"
                required
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Centro"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-mist font-semibold mb-1">Cidade *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Belo Horizonte"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-mist font-semibold mb-1">Estado (UF) *</label>
              <input
                type="text"
                required
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="MG"
                className="w-full bg-obsidian border border-line rounded-lg px-3 py-2 text-ivory uppercase font-bold placeholder:text-smoke focus:border-gold outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="gold" size="sm" disabled={saving} className="gap-1.5 shadow-md shadow-gold/20 font-bold uppercase tracking-wider">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            <span>{saving ? 'Salvando...' : 'Salvar Endereço'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}

