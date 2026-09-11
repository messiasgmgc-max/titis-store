// POST /api/webhooks/mercadopago — notificações de pagamento do Mercado Pago.
// Valida a assinatura, consulta o pagamento na API, atualiza public.payments e,
// quando aprovado com valor pago >= valor final da linha (já com desconto),
// libera o acesso em public.profiles e registra o uso do cupom — uma única vez.
import { getPlan } from '@/lib/site';
import { isRecord, jsonError, jsonOk, readJson } from '@/lib/server/http';
import {
  MercadoPagoError,
  createServiceSupabase,
  getPayment,
  mercadoPagoConfigured,
  verifyWebhookSignature,
  type MercadoPagoPayment,
} from '@/lib/server/mercadopago';
import { PAYMENT_COLUMNS, applyPaymentAccess, type PaymentRecord } from '@/lib/server/payments';
import type { PaymentStatus } from '@/lib/types';

export const maxDuration = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ServiceClient = ReturnType<typeof createServiceSupabase>;

/** Status do Mercado Pago → status interno. */
function mapStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      // pending, authorized, in_process, in_mediation
      return 'pending';
  }
}

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function ignored(reason: string): Response {
  return jsonOk({ received: true, ignored: reason });
}

function toRecord(row: unknown): PaymentRecord {
  const r = (row ?? {}) as Record<string, unknown>;
  return {
    ...(r as unknown as PaymentRecord),
    discount_cents: typeof r.discount_cents === 'number' ? r.discount_cents : 0,
    coupon_code: typeof r.coupon_code === 'string' && r.coupon_code ? r.coupon_code : null,
  };
}

/** Localiza a linha de public.payments correspondente ao pagamento do Mercado Pago. */
async function findPaymentRow(db: ServiceClient, payment: MercadoPagoPayment): Promise<PaymentRecord | null> {
  if (payment.external_reference && UUID_RE.test(payment.external_reference)) {
    const { data, error } = await db
      .from('payments')
      .select(PAYMENT_COLUMNS)
      .eq('id', payment.external_reference)
      .maybeSingle();
    if (error) throw new Error(`payments por external_reference: ${error.message}`);
    if (data) return toRecord(data);
  }

  const { data: byProvider, error: providerError } = await db
    .from('payments')
    .select(PAYMENT_COLUMNS)
    .eq('provider_payment_id', payment.id)
    .maybeSingle();
  if (providerError) throw new Error(`payments por provider_payment_id: ${providerError.message}`);
  if (byProvider) return toRecord(byProvider);

  const userId = text(payment.metadata.user_id);
  const plan = getPlan(text(payment.metadata.plan));
  if (!userId || !UUID_RE.test(userId) || !plan || plan.priceCents === null) return null;

  const { data: pending, error: pendingError } = await db
    .from('payments')
    .select(PAYMENT_COLUMNS)
    .eq('user_id', userId)
    .eq('plan', plan.id)
    .eq('provider', 'mercadopago')
    .is('provider_payment_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pendingError) throw new Error(`payments por metadata: ${pendingError.message}`);
  if (pending) return toRecord(pending);

  // Nenhuma linha (ex.: removida): registra a partir dos metadados que o próprio servidor enviou.
  // Sem a linha original não há como recuperar o desconto: exige o valor cheio do plano.
  const { data: created, error: insertError } = await db
    .from('payments')
    .insert({
      user_id: userId,
      plan: plan.id,
      amount_cents: plan.priceCents,
      provider: 'mercadopago',
      provider_payment_id: payment.id,
      status: 'pending',
    })
    .select(PAYMENT_COLUMNS)
    .single();
  if (insertError) throw new Error(`payments (novo registro): ${insertError.message}`);
  return toRecord(created);
}

export async function POST(req: Request) {
  const url = new URL(req.url);

  let body: Record<string, unknown> = {};
  try {
    body = await readJson(req, 64 * 1024);
  } catch {
    // Notificações no formato antigo (IPN) podem vir sem corpo: seguem pelos parâmetros da URL.
  }

  const action = text(body.action);
  const type =
    text(body.type) ??
    text(body.topic) ??
    url.searchParams.get('type') ??
    url.searchParams.get('topic') ??
    (action?.startsWith('payment.') ? 'payment' : null);
  if (type !== 'payment') return ignored('evento sem relação com pagamentos');

  const dataId =
    url.searchParams.get('data.id') ??
    (isRecord(body.data) ? text(body.data.id) : null) ??
    url.searchParams.get('id');
  if (!dataId || !/^\d{1,24}$/.test(dataId)) {
    return jsonError(400, 'bad_request', 'Notificação sem identificador de pagamento.');
  }

  if (!mercadoPagoConfigured()) {
    return jsonError(503, 'not_configured', 'Pagamento online não configurado.');
  }

  if (!verifyWebhookSignature(req, dataId)) {
    console.warn(`[webhook/mercadopago] assinatura inválida para o pagamento ${dataId}`);
    return jsonError(401, 'unauthorized', 'Assinatura inválida.');
  }

  try {
    let payment: MercadoPagoPayment;
    try {
      payment = await getPayment(dataId);
    } catch (err) {
      if (err instanceof MercadoPagoError && err.status === 404) return ignored('pagamento não encontrado');
      throw err;
    }

    const db = createServiceSupabase();
    const row = await findPaymentRow(db, payment);
    if (!row) {
      console.warn(`[webhook/mercadopago] pagamento ${payment.id} sem registro correspondente`);
      return ignored('pagamento sem registro correspondente');
    }

    const mapped = mapStatus(payment.status);
    // Notificações podem chegar fora de ordem: um "pending" atrasado não rebaixa um pagamento aprovado.
    const status: PaymentStatus = row.status === 'approved' && mapped === 'pending' ? 'approved' : mapped;
    const { error: updateError } = await db
      .from('payments')
      .update({ status, provider_payment_id: payment.id })
      .eq('id', row.id);
    if (updateError) throw new Error(`atualizar pagamento: ${updateError.message}`);

    if (status === 'approved' && !row.applied_at) {
      // amount_cents já é o valor final (com desconto do cupom).
      const paidCents = payment.transaction_amount === null ? null : Math.round(payment.transaction_amount * 100);
      if (payment.currency_id !== 'BRL' || paidCents === null || paidCents < row.amount_cents) {
        console.warn(
          `[webhook/mercadopago] pagamento ${payment.id} aprovado com valor divergente (${paidCents ?? '?'} ${payment.currency_id ?? '?'} < ${row.amount_cents}); acesso não liberado`,
        );
        return jsonOk({ received: true, status, applied: false });
      }
      const result = await applyPaymentAccess(db, row);
      return jsonOk({ received: true, status, applied: result === 'applied' });
    }

    return jsonOk({ received: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[webhook/mercadopago] falha ao processar ${dataId} — ${message.slice(0, 300)}`);
    // 500 faz o Mercado Pago tentar novamente mais tarde.
    return jsonError(500, 'internal', 'Falha ao processar a notificação.');
  }
}
