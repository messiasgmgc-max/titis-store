// ============================================================
// Mercado Pago (Checkout Pro) e Supabase com service role — somente servidor.
// Nunca importe este arquivo em componentes de cliente: ele lê segredos
// (MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY).
// ============================================================
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ClubPlan } from '@/lib/site';

const MP_API = 'https://api.mercadopago.com';
const MP_TIMEOUT_MS = 15_000;

// Mesma URL pública usada em src/lib/server/supabase-server.ts.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dusavcbgomdosfjodups.supabase.co';

function accessToken(): string {
  return (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').trim();
}

function serviceRoleKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
}

/** Checkout online pronto para uso: token do Mercado Pago e service role do Supabase presentes. */
export function mercadoPagoConfigured(): boolean {
  return Boolean(accessToken() && serviceRoleKey());
}

/** Falha na API do Mercado Pago. A mensagem nunca contém o token. */
export class MercadoPagoError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'MercadoPagoError';
    this.status = status;
  }
}

/**
 * Cliente Supabase com a service role: ignora RLS e o gatilho de privilégios.
 * Use apenas em rotas do servidor (checkout e webhook).
 */
export function createServiceSupabase(): SupabaseClient {
  const key = serviceRoleKey();
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function mpFetch(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<unknown> {
  const token = accessToken();
  if (!token) throw new MercadoPagoError('MERCADOPAGO_ACCESS_TOKEN não configurado.', 503);
  const { idempotencyKey, headers, ...rest } = init;

  let res: Response;
  try {
    res = await fetch(`${MP_API}${path}`, {
      ...rest,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
        ...headers,
      },
      signal: AbortSignal.timeout(MP_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    const timeout = err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw new MercadoPagoError(timeout ? 'Tempo esgotado ao falar com o Mercado Pago.' : 'Falha de rede com o Mercado Pago.', 504);
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message.slice(0, 160)
        : `HTTP ${res.status}`;
    throw new MercadoPagoError(`Mercado Pago recusou a requisição: ${detail}`, res.status);
  }
  return data;
}

// ------------------------------------------------------------
// Preferência de pagamento (Checkout Pro)
// ------------------------------------------------------------

export interface CreatePreferenceInput {
  plan: ClubPlan;
  user: { id: string; email?: string | null };
  /** Origem pública do site, sem barra final (ex.: https://www.titisstore.com.br). */
  origin: string;
  /** id da linha em public.payments — vira external_reference. */
  externalReference: string;
  /** Valor cobrado em centavos já com desconto; padrão = preço do plano. */
  amountCents?: number;
  /** Cupom aplicado (vai nos metadados, só para conferência no painel do MP). */
  couponCode?: string | null;
}

export interface PreferenceResult {
  id: string;
  url: string;
}

/** Cria a preferência do Checkout Pro e devolve a URL de pagamento (sandbox com token TEST-). */
export async function createPreference({
  plan,
  user,
  origin,
  externalReference,
  amountCents,
  couponCode,
}: CreatePreferenceInput): Promise<PreferenceResult> {
  const cents = amountCents ?? plan.priceCents;
  if (cents === null || cents <= 0) {
    throw new MercadoPagoError('Plano sem valor para checkout.', 400);
  }
  const base = origin.replace(/\/+$/, '');
  const back = (status: 'approved' | 'pending' | 'failure') =>
    `${base}/assinar?plano=${encodeURIComponent(plan.id)}&status=${status}`;
  // O Mercado Pago recusa auto_return e notification_url sem HTTPS público (ex.: localhost).
  const secure = base.startsWith('https://');

  const body = {
    items: [
      {
        id: plan.id,
        title: `Titi's Store · ${plan.name}`,
        quantity: 1,
        unit_price: cents / 100,
        currency_id: 'BRL',
      },
    ],
    ...(user.email ? { payer: { email: user.email } } : {}),
    external_reference: externalReference,
    metadata: { user_id: user.id, plan: plan.id, ...(couponCode ? { coupon_code: couponCode } : {}) },
    back_urls: { success: back('approved'), pending: back('pending'), failure: back('failure') },
    ...(secure ? { auto_return: 'approved', notification_url: `${base}/api/webhooks/mercadopago` } : {}),
    statement_descriptor: 'TITIS STORE',
  };

  const data = await mpFetch('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(body),
    idempotencyKey: externalReference,
  });

  const pref = (data ?? {}) as { id?: unknown; init_point?: unknown; sandbox_init_point?: unknown };
  const sandbox = accessToken().startsWith('TEST-');
  const url = sandbox
    ? (typeof pref.sandbox_init_point === 'string' && pref.sandbox_init_point) ||
      (typeof pref.init_point === 'string' && pref.init_point)
    : typeof pref.init_point === 'string' && pref.init_point;
  if (!url || typeof pref.id !== 'string') {
    throw new MercadoPagoError('Resposta do Mercado Pago sem link de pagamento.', 502);
  }
  return { id: pref.id, url };
}

// ------------------------------------------------------------
// Consulta de pagamento
// ------------------------------------------------------------

export interface MercadoPagoPayment {
  id: string;
  status: string;
  status_detail: string | null;
  external_reference: string | null;
  metadata: Record<string, unknown>;
  transaction_amount: number | null;
  currency_id: string | null;
}

/** GET /v1/payments/{id}. Lança MercadoPagoError (404 quando não existe). */
export async function getPayment(id: string): Promise<MercadoPagoPayment> {
  if (!/^\d{1,24}$/.test(id)) throw new MercadoPagoError('Identificador de pagamento inválido.', 400);
  const raw = (await mpFetch(`/v1/payments/${encodeURIComponent(id)}`, { method: 'GET' })) as Record<string, unknown> | null;
  if (!raw || (typeof raw.id !== 'number' && typeof raw.id !== 'string')) {
    throw new MercadoPagoError('Resposta de pagamento inválida.', 502);
  }
  return {
    id: String(raw.id),
    status: typeof raw.status === 'string' ? raw.status : '',
    status_detail: typeof raw.status_detail === 'string' ? raw.status_detail : null,
    external_reference: typeof raw.external_reference === 'string' && raw.external_reference ? raw.external_reference : null,
    metadata: raw.metadata && typeof raw.metadata === 'object' ? (raw.metadata as Record<string, unknown>) : {},
    transaction_amount: typeof raw.transaction_amount === 'number' ? raw.transaction_amount : null,
    currency_id: typeof raw.currency_id === 'string' ? raw.currency_id : null,
  };
}

// ------------------------------------------------------------
// Assinatura do webhook
// ------------------------------------------------------------

/**
 * Valida o cabeçalho x-signature ("ts=...,v1=...") do Mercado Pago.
 * Manifesto: `id:${dataId};request-id:${x-request-id};ts:${ts};` com HMAC-SHA256 (hex)
 * da assinatura secreta. Sem MERCADOPAGO_WEBHOOK_SECRET a notificação é sempre rejeitada.
 */
export function verifyWebhookSignature(req: Request, dataId: string): boolean {
  const secret = (process.env.MERCADOPAGO_WEBHOOK_SECRET ?? '').trim();
  if (!secret || !dataId) return false;

  const signature = req.headers.get('x-signature') ?? '';
  const requestId = (req.headers.get('x-request-id') ?? '').trim();
  if (!signature || !requestId) return false;

  let ts = '';
  let v1 = '';
  for (const part of signature.split(',')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === 'ts') ts = value;
    else if (key === 'v1') v1 = value.toLowerCase();
  }
  if (!/^\d+$/.test(ts) || !/^[0-9a-f]{64}$/.test(v1)) return false;

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

// ------------------------------------------------------------
// Pagamento Transparente (Pix com QR Code & Cartão de Crédito)
// ------------------------------------------------------------

export interface TransparentPaymentInput {
  orderId: string;
  amountCents: number;
  paymentMethod: 'pix' | 'credit_card';
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    cpf: string;
    phone?: string;
  };
  cardToken?: string;
  paymentMethodId?: string;
  installments?: number;
  origin: string;
}

export interface TransparentPaymentResult {
  id: string;
  status: string;
  statusDetail: string | null;
  qrCodeBase64?: string | null;
  qrCode?: string | null;
  ticketUrl?: string | null;
}

export async function createTransparentPayment(
  input: TransparentPaymentInput,
): Promise<TransparentPaymentResult> {
  const base = input.origin.replace(/\/+$/, '');
  const secure = base.startsWith('https://');

  const cleanCpf = input.payer.cpf.replace(/\D/g, '');

  const payload: Record<string, unknown> = {
    transaction_amount: input.amountCents / 100,
    description: `Pedido #${input.orderId} · Titi's Store`,
    payment_method_id: input.paymentMethod === 'pix' ? 'pix' : input.paymentMethodId || 'master',
    external_reference: input.orderId,
    payer: {
      email: input.payer.email,
      first_name: input.payer.firstName,
      last_name: input.payer.lastName,
      identification: {
        type: 'CPF',
        number: cleanCpf,
      },
    },
    ...(secure ? { notification_url: `${base}/api/webhooks/mercadopago` } : {}),
  };

  if (input.paymentMethod === 'credit_card' && input.cardToken) {
    payload.token = input.cardToken;
    payload.installments = Number(input.installments || 1);
  }

  const raw = (await mpFetch('/v1/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
    idempotencyKey: `${input.orderId}-${input.paymentMethod}-${Date.now()}`,
  })) as Record<string, unknown> | null;

  if (!raw || (!raw.id && !raw.status)) {
    throw new MercadoPagoError('Resposta inválida do Mercado Pago.', 502);
  }

  const pointOfInteraction = raw.point_of_interaction as Record<string, unknown> | undefined;
  const transactionData = pointOfInteraction?.transaction_data as Record<string, unknown> | undefined;

  return {
    id: String(raw.id),
    status: typeof raw.status === 'string' ? raw.status : 'pending',
    statusDetail: typeof raw.status_detail === 'string' ? raw.status_detail : null,
    qrCodeBase64: typeof transactionData?.qr_code_base64 === 'string' ? transactionData.qr_code_base64 : null,
    qrCode: typeof transactionData?.qr_code === 'string' ? transactionData.qr_code : null,
    ticketUrl: typeof transactionData?.ticket_url === 'string' ? transactionData.ticket_url : null,
  };
}

