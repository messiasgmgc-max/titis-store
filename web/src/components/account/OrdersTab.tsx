'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ColorDot } from '@/components/ui/Swatch';
import { WhatsAppIcon } from '@/components/ui/icons';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatBRL, formatDateBR, whatsappLink } from '@/lib/format';
import type { OrderRow, OrderStatus } from '@/lib/types';
import { PushNotificationCard } from '@/components/notifications/PushNotificationCard';
import { useConsultingLink } from './PlanStatusCard';
import { SkeletonList, StatePanel, TabIntro } from './shared';

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; orders: OrderRow[] };

const STATUS: Record<OrderStatus, { label: string; dot: string; text: string }> = {
  novo: { label: 'Recebido', dot: 'bg-parchment', text: 'text-parchment' },
  pending: { label: 'Aguardando Pagamento', dot: 'bg-amber-400', text: 'text-amber-400' },
  paid: { label: 'Pago', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  em_atendimento: { label: 'Em Preparação', dot: 'bg-gold', text: 'text-gold-light' },
  concluido: { label: 'Enviado / Concluído', dot: 'bg-success', text: 'text-success' },
  cancelado: { label: 'Cancelado', dot: 'bg-danger', text: 'text-danger' },
};

const FLOW: OrderStatus[] = ['novo', 'em_atendimento', 'concluido'];

function isStatus(v: unknown): v is OrderStatus {
  return (
    v === 'novo' ||
    v === 'pending' ||
    v === 'paid' ||
    v === 'em_atendimento' ||
    v === 'concluido' ||
    v === 'cancelado'
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]', s.text)}>
      <span className="relative flex h-2 w-2">
        {status === 'em_atendimento' && (
          <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', s.dot)} aria-hidden />
        )}
        <span className={cn('relative h-2 w-2 rounded-full', s.dot)} aria-hidden />
      </span>
      {s.label}
    </span>
  );
}

/** Progresso do atendimento em pesponto: Recebido → Em atendimento → Concluído. */
function StatusTrack({ status }: { status: OrderStatus }) {
  if (status === 'cancelado') return null;
  const current = FLOW.indexOf(status);
  return (
    <ol className="flex items-center" aria-label="Etapas do pedido">
      {FLOW.map((step, i) => (
        <li key={step} className="flex items-center">
          {i > 0 && <span className={cn('h-px w-8 sm:w-12', i <= current ? 'bg-gold' : 'stitch opacity-40')} aria-hidden />}
          <span
            className={cn('h-2 w-2 rotate-45 border', i <= current ? 'border-gold bg-gold' : 'border-line-gold bg-transparent')}
            title={STATUS[step].label}
            aria-hidden
          />
          <span className="sr-only">
            {STATUS[step].label}
            {i <= current ? ' (etapa alcançada)' : ''}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function OrdersTab({ userId, email }: { userId: string; email?: string | null }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const consulting = useConsultingLink();

  useEffect(() => {
    let active = true;
    let query = supabase.from('orders').select('*');
    if (email) {
      query = query.or(`user_id.eq.${userId},customer_email.eq.${email}`);
    } else {
      query = query.eq('user_id', userId);
    }

    query
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({ status: 'error' });
          return;
        }
        const orders = ((data ?? []) as OrderRow[]).map((o) => ({
          ...o,
          items: Array.isArray(o.items) ? o.items : [],
          status: isStatus(o.status) ? o.status : 'novo',
        }));
        setState({ status: 'ready', orders });
      });
    return () => {
      active = false;
    };
  }, [userId, email, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  const intro = (
    <TabIntro
      numeral="IV"
      eyebrow="Pedidos"
      title={
        <>
          Seu histórico de <span className="text-gold-light">encomendas</span>
        </>
      }
      lead="Preços, tamanhos e prazos são confirmados no atendimento. Retome qualquer pedido pelo WhatsApp."
    />
  );

  return (
    <section aria-label="Pedidos" className="space-y-10">
      {intro}

      <PushNotificationCard />

      {state.status === 'loading' && <SkeletonList label="Carregando pedidos" />}

      {state.status === 'error' && (
        <StatePanel
          tone="error"
          title="Não foi possível carregar agora."
          actions={
            <Button variant="ghost" size="sm" onClick={retry}>
              Tentar novamente
            </Button>
          }
        >
          Verifique sua conexão e tente de novo em instantes.
        </StatePanel>
      )}

      {state.status === 'ready' && state.orders.length === 0 && (
        <StatePanel
          title={
            <>
              Nenhum pedido <span className="text-foil">por aqui</span>
            </>
          }
          actions={
            <>
              <Button href="/colecao">Explorar a loja</Button>
              <Button href={consulting.href} variant="outline">
                Montar um look
              </Button>
            </>
          }
        >
          Quando você enviar a sacola pelo WhatsApp com a conta conectada, o pedido aparece aqui com o andamento do
          atendimento.
        </StatePanel>
      )}

      {state.status === 'ready' && state.orders.length > 0 && (
        <ul className="space-y-4">
          {state.orders.map((order) => {
            const ref = order.id.slice(0, 8);
            const units = order.items.reduce((n, i) => n + (i.quantity || 1), 0);
            const shown = order.items.slice(0, 3);
            const hidden = order.items.length - shown.length;
            return (
              <li key={order.id}>
                <article className="panel group relative rounded-3xl p-6 transition-colors duration-500 hover:border-line-gold sm:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <h3 className="text-sm font-bold uppercase tabular-nums tracking-[0.12em] text-ivory">Pedido #{ref}</h3>
                        <time dateTime={order.created_at} className="text-xs text-smoke">
                          {formatDateBR(order.created_at)}
                        </time>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <StatusBadge status={order.status} />
                        <StatusTrack status={order.status} />
                      </div>

                      {order.items.length > 0 ? (
                        <ul className="mt-6 space-y-2.5">
                          {shown.map((item) => (
                            <li key={item.key} className="flex items-center gap-3 text-sm text-parchment">
                              <ColorDot hex={item.hex || '#6f6b63'} size={10} />
                              <span className="min-w-0 truncate">
                                <span className="text-mist">{item.quantity}×</span> {item.name}
                                {item.size && <span className="text-smoke"> · {item.size}</span>}
                              </span>
                            </li>
                          ))}
                          {hidden > 0 && (
                            <li className="pl-[22px] text-xs text-smoke">
                              + {hidden} {hidden === 1 ? 'item' : 'itens'}
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="mt-6 text-sm text-smoke">Pedido sem itens registrados.</p>
                      )}
                    </div>

                    <div className="flex flex-row items-end justify-between gap-6 border-t border-line pt-5 lg:min-w-[220px] lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                      <div className="lg:text-right">
                        <p className="kicker text-[0.6rem]">
                          Total · {units} {units === 1 ? 'peça' : 'peças'}
                        </p>
                        <p className="mt-1.5 text-[1.75rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-ivory">
                          {formatBRL(order.total_cents)}
                        </p>
                      </div>
                      <a
                        href={whatsappLink(`Olá! Gostaria de retomar o Pedido #${ref}.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-luxe shrink-0 text-gold-light"
                      >
                        <WhatsAppIcon className="h-3.5 w-3.5" />
                        Retomar no WhatsApp
                      </a>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
