// POST /api/webhooks/mercadopago — notificações de pagamento do Mercado Pago.
// Valida a assinatura, consulta o pagamento na API, atualiza public.payments / public.orders,
// libera o acesso e envia notificações automáticas no WhatsApp (Evolution) e E-mail.
import { getPlan } from '@/lib/site';
import { isRecord, jsonError, jsonOk, readJson } from '@/lib/server/http';
import {
  MercadoPagoError,
  createServiceSupabase,
  getPayment,
  getMercadoPagoConfig,
  isMercadoPagoConfigured,
  verifyWebhookSignature,
  type MercadoPagoPayment,
} from '@/lib/server/mercadopago';
import {
  PAYMENT_COLUMNS,
  applyPaymentAccess,
  grantConsultingAccess,
  applyPaymentResult,
  type PaymentRecord,
} from '@/lib/server/payments';
import { NotificationService } from '@/lib/server/notifications';
import { EmailService } from '@/lib/server/email';
import { sendNtfySaleNotification, sendNtfyPlanNotification } from '@/lib/server/ntfy';
import type { PaymentStatus, PlanId } from '@/lib/types';

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

/**
 * Handler unificado para notificações GET e POST do Mercado Pago.
 */
async function handleWebhookNotification(req: Request) {
  const url = new URL(req.url);

  let body: Record<string, unknown> = {};
  if (req.method === 'POST') {
    try {
      body = await readJson(req, 64 * 1024);
    } catch {
      // Notificações IPN ou testes sem JSON
    }
  }

  const action = text(body.action);
  const type =
    text(body.type) ??
    text(body.topic) ??
    url.searchParams.get('type') ??
    url.searchParams.get('topic') ??
    (action?.startsWith('payment.') ? 'payment' : null);

  // Ping de teste ou evento não relacionado
  if (type !== 'payment') {
    return ignored('evento sem relação com pagamentos');
  }

  const dataId =
    url.searchParams.get('data.id') ??
    (isRecord(body.data) ? text(body.data.id) : null) ??
    url.searchParams.get('id');

  if (!dataId || !/^\d{1,24}$/.test(dataId)) {
    // 200 OK para o Mercado Pago não retentar notificações sem ID válido
    return ignored('notificacao_sem_identificador_valido');
  }

  if (!(await isMercadoPagoConfigured())) {
    return jsonError(503, 'not_configured', 'Pagamento online não configurado.');
  }

  // Validação de assinatura: se x-signature estiver presente E houver webhookSecret
  const hasSignatureHeader = Boolean(req.headers.get('x-signature'));
  const { webhookSecret } = await getMercadoPagoConfig();
  if (hasSignatureHeader && webhookSecret) {
    const isValid = await verifyWebhookSignature(req, dataId);
    if (!isValid) {
      console.warn(`[webhook/mercadopago] Assinatura x-signature inválida para o pagamento ${dataId}`);
      return jsonError(401, 'unauthorized', 'Assinatura inválida.');
    }
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

    // ------------------------------------------------------------
    // 1. Tratamento de pedidos da Loja e Consultoria (public.orders)
    // ------------------------------------------------------------
    if (payment.external_reference && payment.external_reference.startsWith('TITIS-')) {
      const { data: order } = await db
        .from('orders')
        .select('*')
        .eq('id', payment.external_reference)
        .maybeSingle();

      if (order) {
        const result = await applyPaymentResult(db, {
          order,
          mpPayment: payment,
          source: 'webhook',
        });
        return jsonOk({ received: true, ...result });
      }
    }

    // ------------------------------------------------------------
    // 2. Tratamento de planos da Consultoria (payments table)
    // ------------------------------------------------------------
    const row = await findPaymentRow(db, payment);
    if (!row) {
      console.warn(`[webhook/mercadopago] pagamento ${payment.id} sem registro correspondente`);
      return ignored('pagamento sem registro correspondente');
    }

    const mapped = mapStatus(payment.status);
    const status: PaymentStatus = row.status === 'approved' && mapped === 'pending' ? 'approved' : mapped;
    const { error: updateError } = await db
      .from('payments')
      .update({ status, provider_payment_id: payment.id })
      .eq('id', row.id);
    if (updateError) throw new Error(`atualizar pagamento: ${updateError.message}`);

    if (status === 'approved' && !row.applied_at) {
      const paidCents = payment.transaction_amount === null ? null : Math.round(payment.transaction_amount * 100);
      if (payment.currency_id !== 'BRL' || paidCents === null || paidCents < row.amount_cents) {
        console.warn(
          `[webhook/mercadopago] pagamento ${payment.id} aprovado com valor divergente (${paidCents ?? '?'} ${payment.currency_id ?? '?'} < ${row.amount_cents}); acesso não liberado`,
        );
        return jsonOk({ received: true, status, applied: false });
      }

      const result = await applyPaymentAccess(db, row);

      // Busca dados do perfil do cliente
      const { data: userProfile } = await db
        .from('profiles')
        .select('full_name, email, phone, cpf')
        .eq('id', row.user_id)
        .maybeSingle();

      const planInfo = getPlan(row.plan);
      const planName = planInfo?.name || 'Clube VIP';
      const customerName = userProfile?.full_name || 'Cliente VIP';
      const customerPhone = userProfile?.phone;
      const customerEmail = userProfile?.email;

      // Sincroniza em public.orders para aparecer no painel de admin!
      const syncOrderId = `TITIS-PLAN-${row.id.slice(0, 8).toUpperCase()}`;
      await db
        .from('orders')
        .upsert(
          {
            id: syncOrderId,
            user_id: row.user_id,
            total_cents: row.amount_cents,
            status: 'paid',
            channel: 'mercadopago',
            payment_method: 'mercadopago',
            payment_provider_id: payment.id,
            customer_name: customerName,
            customer_email: customerEmail || null,
            customer_phone: customerPhone || null,
            customer_cpf: userProfile?.cpf || null,
            shipping_address: { type: 'digital', plan: planName },
            shipping_service_name: 'Acesso Digital Imediato',
            shipping_price_cents: 0,
            items: [
              {
                name: `Assinatura Consultoria · ${planName}`,
                priceCents: row.amount_cents,
                quantity: 1,
                detail: planInfo?.cadence || '30 dias de acesso',
                planId: row.plan,
              },
            ],
            notes: `Assinatura Consultoria: ${planName} (${row.plan})`,
            paid_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .then(undefined, (err) => console.warn('[Webhook MP] Erro ao sincronizar orders:', err?.message));

      if (customerPhone) {
        NotificationService.sendOrderNotification({
          phone: customerPhone,
          customerName,
          orderId: row.id,
          amountCents: row.amount_cents,
          type: 'CONSULTING_ACCESS_GRANTED',
          planName,
        }).catch((e) => console.error('[Webhook MP Consultor] Erro WhatsApp:', e));
      }

      // Notificação push no celular via ntfy.sh para o administrador
      sendNtfyPlanNotification({
        orderId: syncOrderId,
        planId: row.plan,
        planName,
        amountCents: row.amount_cents,
        customerName,
        customerEmail,
      }).catch((e) => console.error('[Webhook MP Consultor] Erro ntfy plano:', e));

      // Notificação instantânea no WhatsApp do Lojista via Evolution API
      NotificationService.sendMerchantOrderApprovedNotification({
        orderId: syncOrderId,
        totalCents: row.amount_cents,
        customerName,
        customerEmail,
        customerPhone,
        paymentMethod: 'Mercado Pago',
        shippingService: 'Acesso Digital Imediato',
        items: [
          {
            name: `Assinatura Consultoria · ${planName}`,
            quantity: 1,
            priceCents: row.amount_cents,
          },
        ],
      }).catch((e) => console.error('[Webhook MP Consultor] Erro WhatsApp lojista:', e));

      if (customerEmail) {
        EmailService.sendConsultingAccessGranted({
          customerName,
          customerEmail,
          planName,
        }).catch((e) => console.error('[Webhook MP Consultor] Erro E-mail:', e));
      }

      return jsonOk({ received: true, status, applied: result === 'applied' });
    }

    return jsonOk({ received: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[webhook/mercadopago] falha ao processar ${dataId} — ${message.slice(0, 300)}`);
    return jsonError(500, 'internal', 'Falha ao processar a notificação.');
  }
}

export async function POST(req: Request) {
  return handleWebhookNotification(req);
}

export async function GET(req: Request) {
  return handleWebhookNotification(req);
}

