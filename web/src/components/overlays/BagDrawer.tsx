'use client';

import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Medallion } from '@/components/ui/Logo';
import { ColorDot } from '@/components/ui/Swatch';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useCart } from '@/providers/CartProvider';
import { useSession } from '@/providers/SessionProvider';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatBRL, formatPhoneBR, whatsappLink } from '@/lib/format';
import { SITE } from '@/lib/site';
import type { CartItem, OrderRow } from '@/lib/types';

const EASE = [0.22, 1, 0.36, 1] as const;
const MAX_QUANTITY = 20;
const INSERT_TIMEOUT_MS = 4000;

type NewOrder = Omit<OrderRow, 'created_at' | 'updated_at'>;

/** UUID v4 — usa randomUUID quando disponível (contextos seguros). */
function newOrderId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Normaliza telefones salvos com DDI (+55) para a máscara nacional. */
function nationalPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  return formatPhoneBR(digits);
}

function lineTotal(item: CartItem): string {
  return item.priceCents === null ? 'Sob consulta' : formatBRL(item.priceCents * item.quantity);
}

function buildOrderMessage(input: {
  id: string;
  items: CartItem[];
  subtotalCents: number;
  hasUnpriced: boolean;
  name: string;
  phone: string;
  notes: string;
}): string {
  const lines = input.items.map((item, index) => {
    const parts = [item.name];
    if (item.size) parts.push(`Tam. ${item.size}`);
    if (item.color) parts.push(item.color);
    parts.push(`${item.quantity}×`);
    parts.push(lineTotal(item));
    return `${index + 1}. ${parts.join(' — ')}`;
  });

  const subtotal =
    input.subtotalCents > 0
      ? `${formatBRL(input.subtotalCents)}${input.hasUnpriced ? ' + itens sob consulta' : ''}`
      : 'Sob consulta';

  return [
    'Olá, Titi! Gostaria de finalizar este pedido:',
    '',
    ...lines,
    '',
    `*Subtotal:* ${subtotal}`,
    '',
    `*Nome:* ${input.name}`,
    `*WhatsApp:* ${input.phone}`,
    ...(input.notes ? [`*Observações:* ${input.notes}`] : []),
    '',
    `Pedido #${input.id.slice(0, 8)}`,
  ].join('\n');
}

/** Registra o pedido sem bloquear o envio (anônimos podem inserir, mas não ler). */
async function saveOrder(order: NewOrder): Promise<void> {
  try {
    const insert = supabase
      .from('orders')
      .insert(order)
      .then(({ error }) => {
        if (error) console.warn('[pedido] não foi possível registrar o pedido:', error.message);
      });
    await Promise.race([insert, new Promise<void>((resolve) => setTimeout(resolve, INSERT_TIMEOUT_MS))]);
  } catch (err) {
    console.warn('[pedido] falha ao registrar o pedido:', err);
  }
}

function Thumbnail({ item }: { item: CartItem }) {
  const [failed, setFailed] = useState(false);

  if (item.image && !failed) {
    return (
      <span className="relative block h-28 w-[5.25rem] shrink-0 overflow-hidden rounded-2xl bg-coal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="img-editorial h-full w-full object-cover"
        />
        <span aria-hidden className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-line" />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="pinked relative block h-28 w-[5.25rem] shrink-0 overflow-hidden rounded-t-xl"
      style={{ backgroundColor: item.hex || '#181b24' }}
    >
      <span
        className="absolute inset-0 opacity-[0.16] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, #000 0 1px, transparent 1px 3px)',
        }}
      />
      <span className="absolute inset-x-0 top-0 h-px bg-ivory/25" />
    </span>
  );
}

export function BagDrawer({ onClose }: { onClose: () => void }) {
  const { items, count, subtotalCents, hasUnpriced, setQuantity, remove, clear } = useCart();
  const { user, profile } = useSession();
  const { toast } = useUI();
  const uid = useId();
  const formId = `${uid}-checkout`;

  // null = campo ainda não editado (usa os dados do perfil).
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [sending, setSending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const nameValue = name ?? profile?.full_name ?? '';
  const phoneValue = phone ?? (profile?.phone ? nationalPhone(profile.phone) : '');
  const empty = items.length === 0;
  const subtotalLabel = subtotalCents > 0 ? formatBRL(subtotalCents) : hasUnpriced ? 'Sob consulta' : formatBRL(0);

  async function finalize(win: Window | null, customerName: string, digits: string) {
    setSending(true);
    const id = newOrderId();
    const customerPhone = formatPhoneBR(digits);
    const cleanNotes = notes.trim();
    const snapshot = items;

    await saveOrder({
      id,
      user_id: user?.id ?? null,
      customer_name: customerName,
      customer_phone: customerPhone,
      notes: cleanNotes || null,
      items: snapshot,
      total_cents: subtotalCents || null,
      status: 'novo',
      channel: 'whatsapp',
    });

    const link = whatsappLink(
      buildOrderMessage({
        id,
        items: snapshot,
        subtotalCents,
        hasUnpriced,
        name: customerName,
        phone: customerPhone,
        notes: cleanNotes,
      }),
    );

    const popupAvailable = Boolean(win && !win.closed);
    if (popupAvailable && win) win.location.href = link;

    clear();
    setSending(false);
    toast('Pedido enviado. Continue a conversa no WhatsApp.', 'success');
    onClose();

    // Janela bloqueada pelo navegador: segue na mesma aba (após salvar a sacola vazia).
    if (!popupAvailable) window.setTimeout(() => window.location.assign(link), 160);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || empty) return;

    const customerName = nameValue.trim();
    const digits = phoneValue.replace(/\D/g, '');
    const nextErrors: { name?: string; phone?: string } = {};
    if (customerName.length < 2) nextErrors.name = 'Informe seu nome.';
    if (digits.length < 10) nextErrors.phone = 'Informe um WhatsApp com DDD.';
    setErrors(nextErrors);
    if (nextErrors.name) {
      nameRef.current?.focus();
      return;
    }
    if (nextErrors.phone) {
      phoneRef.current?.focus();
      return;
    }

    // Abre a aba ainda no gesto do clique para não ser bloqueada.
    const win = window.open('', '_blank');
    if (win) {
      try {
        win.opener = null;
        win.document.title = 'Abrindo o WhatsApp…';
      } catch {
        /* janela já navegou */
      }
    }
    void finalize(win, customerName, digits);
  }

  return (
    <Modal variant="drawer" title="Sua sacola" showTitle onClose={onClose}>
      <div className="flex flex-1 flex-col">
        <div className="px-6 sm:px-8">
          <p className="kicker mt-2" aria-live="polite">
            {empty ? 'Nenhuma peça' : `${count} ${count === 1 ? 'peça selecionada' : 'peças selecionadas'}`}
          </p>
          <div className="tape mt-5 rounded-full opacity-30" aria-hidden />
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20 pt-14 text-center">
            <Medallion size={72} />
            <span className="stitch mt-8 w-16" aria-hidden />
            <p className="mt-8 font-display text-[1.7rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-ivory">
              Sua sacola está <span className="text-foil">vazia</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist">
              As peças da loja e dos looks da consultoria que você escolher aparecem aqui.
            </p>
            <Button href="/colecao" onClick={onClose} className="mt-9">
              Explorar a loja
            </Button>
          </div>
        ) : (
          <>
            <ul className="mt-5 space-y-3 px-6 sm:px-8" aria-label="Peças na sacola">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.li
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 28 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="flex gap-4 rounded-2xl border border-line bg-ivory/[0.015] p-3.5 transition-colors duration-500 hover:border-ivory/15 sm:p-4"
                  >
                    <Thumbnail item={item} />

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {item.detail && (
                            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-smoke">
                              {item.detail}
                            </p>
                          )}
                          <h3 className="mt-1 font-display text-[1.1rem] font-bold leading-[1.15] tracking-[-0.02em] text-ivory">
                            {item.name}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(item.key)}
                          aria-label={`Remover ${item.name} da sacola`}
                          className="-mr-2 -mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-smoke transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>

                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mist">
                        {item.size && (
                          <span>
                            Tam. <span className="text-parchment">{item.size}</span>
                          </span>
                        )}
                        {item.color && (
                          <span className="inline-flex items-center gap-1.5">
                            <ColorDot hex={item.hex} size={10} />
                            {item.color}
                          </span>
                        )}
                      </p>

                      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                        <div
                          role="group"
                          aria-label={`Quantidade de ${item.name}`}
                          className="inline-flex h-9 items-stretch rounded-full border border-line bg-ivory/[0.02] p-0.5"
                        >
                          <button
                            type="button"
                            onClick={() => setQuantity(item.key, item.quantity - 1)}
                            aria-label={item.quantity === 1 ? `Remover ${item.name}` : 'Diminuir quantidade'}
                            className="grid w-8 place-items-center rounded-full text-mist transition-colors hover:bg-ivory/[0.06] hover:text-gold-light"
                          >
                            <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                          <span className="grid min-w-8 place-items-center px-1.5 text-sm tabular-nums text-ivory">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(item.key, item.quantity + 1)}
                            disabled={item.quantity >= MAX_QUANTITY}
                            aria-label="Aumentar quantidade"
                            className="grid w-8 place-items-center rounded-full text-mist transition-colors hover:bg-ivory/[0.06] hover:text-gold-light disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                        <p
                          className={cn(
                            'text-right leading-none',
                            item.priceCents === null
                              ? 'text-sm font-semibold text-mist'
                              : 'text-lg font-extrabold tabular-nums text-gold-light',
                          )}
                        >
                          {lineTotal(item)}
                        </p>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <form
              id={formId}
              noValidate
              onSubmit={handleSubmit}
              className="mx-6 mb-8 mt-7 border-t border-line pt-7 sm:mx-8"
              aria-labelledby={`${uid}-checkout-title`}
            >
              <div className="flex items-center gap-3">
                <span className="stitch w-8" aria-hidden />
                <h3 id={`${uid}-checkout-title`} className="eyebrow">
                  Dados para o atendimento
                </h3>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor={`${uid}-name`} className="label">
                    Nome
                  </label>
                  <input
                    ref={nameRef}
                    id={`${uid}-name`}
                    className={cn('field', errors.name && 'border-danger/60')}
                    value={nameValue}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={120}
                    placeholder="Seu nome"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? `${uid}-name-error` : undefined}
                  />
                  {errors.name && (
                    <p id={`${uid}-name-error`} className="mt-1.5 text-xs text-danger">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${uid}-phone`} className="label">
                    WhatsApp
                  </label>
                  <input
                    ref={phoneRef}
                    id={`${uid}-phone`}
                    type="tel"
                    inputMode="tel"
                    className={cn('field', errors.phone && 'border-danger/60')}
                    value={phoneValue}
                    onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                    autoComplete="tel-national"
                    placeholder="(31) 99999-9999"
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={errors.phone ? `${uid}-phone-error` : undefined}
                  />
                  {errors.phone && (
                    <p id={`${uid}-phone-error`} className="mt-1.5 text-xs text-danger">
                      {errors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor={`${uid}-notes`} className="label">
                    Observações
                  </label>
                  <textarea
                    id={`${uid}-notes`}
                    className="field min-h-[5.5rem] resize-y"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={600}
                    rows={3}
                    placeholder="Tamanhos, ajustes, data do evento…"
                  />
                </div>
              </div>
            </form>

            <div className="sticky bottom-0 z-10 mt-auto border-t border-line-gold bg-surface px-6 pb-6 pt-5 shadow-[0_-18px_40px_-24px_rgba(0,0,0,0.9)] sm:px-8">
              <div className="flex items-baseline justify-between gap-4">
                <span className="kicker">Subtotal</span>
                <span className="text-[1.6rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-ivory">
                  {subtotalLabel}
                </span>
              </div>
              {hasUnpriced && (
                <p className="mt-2 text-right text-xs text-mist">Itens sob consulta serão orçados no atendimento</p>
              )}
              <Button type="submit" form={formId} loading={sending} className="mt-5 w-full">
                {!sending && <WhatsAppIcon className="h-4 w-4" />}
                Finalizar pelo WhatsApp
              </Button>
              <p className="mt-3 text-center text-[0.68rem] tracking-wide text-smoke">
                Atendimento oficial · {SITE.whatsappDisplay}
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
