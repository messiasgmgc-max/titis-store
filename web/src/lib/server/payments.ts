// ============================================================
// Liberação de acesso a partir de um pagamento aprovado — somente servidor.
// Usado pelo webhook do Mercado Pago e pelo checkout com cupom de 100%.
// Idempotente: a linha de public.payments é "reivindicada" (applied_at) de
// forma atômica antes de tocar no perfil; o cupom só é consumido uma vez.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlan } from '@/lib/site';
import type { PaymentStatus, PlanId } from '@/lib/types';

const DAY_MS = 86_400_000;

export interface PaymentRecord {
  id: string;
  user_id: string;
  plan: PlanId;
  amount_cents: number;
  discount_cents: number;
  coupon_code: string | null;
  status: PaymentStatus;
  provider_payment_id: string | null;
  applied_at: string | null;
}

export const PAYMENT_COLUMNS =
  'id, user_id, plan, amount_cents, discount_cents, coupon_code, status, provider_payment_id, applied_at';

/**
 * Libera o acesso uma única vez: reivindica o pagamento (applied_at nulo → agora)
 * de forma atômica, estende o perfil e registra o uso do cupom. Se o perfil
 * falhar, desfaz a marca para que a notificação possa ser reprocessada.
 */
export async function applyPaymentAccess(db: SupabaseClient, row: PaymentRecord): Promise<'applied' | 'already'> {
  const plan = getPlan(row.plan);
  if (!plan || plan.accessDays === null) return 'already';

  const { data: claimed, error: claimError } = await db
    .from('payments')
    .update({ applied_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('applied_at', null)
    .select('id');
  if (claimError) throw new Error(`marcar applied_at: ${claimError.message}`);
  if (!claimed || claimed.length === 0) return 'already';

  try {
    const result = await grantConsultingAccess(db, {
      userId: row.user_id,
      planId: plan.id,
      amountCents: row.amount_cents,
      paymentProviderId: row.provider_payment_id,
    });
    if (!result.success) throw new Error('perfil inexistente ou falha ao aplicar acesso');
  } catch (err) {
    await db
      .from('payments')
      .update({ applied_at: null })
      .eq('id', row.id)
      .then(undefined, () => undefined);
    throw err;
  }

  // Uso do cupom: só depois do acesso aplicado (e apenas nesta primeira vez).
  // Uma falha aqui não desfaz a liberação — fica registrada no log.
  if (row.coupon_code) {
    const { error: redeemError } = await db.rpc('redeem_coupon', { p_code: row.coupon_code });
    if (redeemError) {
      console.error(`[payments] cupom ${row.coupon_code} não contabilizado no pagamento ${row.id} — ${redeemError.message.slice(0, 200)}`);
    }
  }
  return 'applied';
}

export interface GrantAccessParams {
  userId?: string | null;
  email?: string | null;
  planId: PlanId;
  amountCents?: number;
  paymentProviderId?: string | null;
}

/**
 * Libera o acesso de consultoria VIP a um usuário a partir do seu ID ou e-mail.
 * Atualiza role para 'vip' (ou preserva 'admin'), estende access_until acumulando se já houver vigência,
 * desbloqueia is_blocked e sincroniza a tabela payments.
 */
export async function grantConsultingAccess(
  db: SupabaseClient,
  params: GrantAccessParams
): Promise<{ success: boolean; accessUntil: string | null; profileId: string | null }> {
  const plan = getPlan(params.planId);
  if (!plan || plan.accessDays === null) {
    return { success: false, accessUntil: null, profileId: null };
  }

  let profile: { id: string; role: string; access_until: string | null; is_blocked?: boolean } | null = null;

  if (params.userId) {
    const { data, error } = await db
      .from('profiles')
      .select('id, role, access_until, is_blocked')
      .eq('id', params.userId)
      .maybeSingle();
    if (data && !error) profile = data as any;
  }

  if (!profile && params.email) {
    const cleanEmail = params.email.trim().toLowerCase();
    const { data, error } = await db
      .from('profiles')
      .select('id, role, access_until, is_blocked')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (data && !error) profile = data as any;
  }

  if (!profile) {
    console.warn('[grantConsultingAccess] Perfil não encontrado para:', params.userId, params.email);
    return { success: false, accessUntil: null, profileId: null };
  }

  const isAdmin = profile.role === 'admin';
  const currentUntil = profile.access_until ? new Date(profile.access_until).getTime() : 0;

  let accessUntil: string | null;
  if (profile.role === 'vip' && !profile.access_until) {
    accessUntil = null; // VIP permanente permanece sem prazo
  } else {
    const base = Math.max(Date.now(), currentUntil && currentUntil > Date.now() ? currentUntil : Date.now());
    accessUntil = new Date(base + plan.accessDays * DAY_MS).toISOString();
  }

  const { error: updateError } = await db
    .from('profiles')
    .update({
      ...(isAdmin ? {} : { role: 'vip' }),
      plan: plan.id,
      access_until: accessUntil,
      is_blocked: false,
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('[grantConsultingAccess] Erro ao atualizar perfil:', updateError.message);
    throw new Error(`atualizar perfil: ${updateError.message}`);
  }

  // Sincroniza payments para garantir histórico
  try {
    const nowIso = new Date().toISOString();
    if (params.paymentProviderId) {
      const { data: existingPayment } = await db
        .from('payments')
        .select('id, status, applied_at')
        .eq('provider_payment_id', params.paymentProviderId)
        .maybeSingle();

      if (existingPayment) {
        await db
          .from('payments')
          .update({ status: 'approved', applied_at: nowIso })
          .eq('id', existingPayment.id);
      } else {
        await db.from('payments').insert({
          user_id: profile.id,
          plan: plan.id,
          amount_cents: params.amountCents || plan.priceCents || 0,
          provider: 'mercadopago',
          provider_payment_id: params.paymentProviderId,
          status: 'approved',
          applied_at: nowIso,
        });
      }
    }
  } catch (err: any) {
    console.warn('[grantConsultingAccess] Aviso ao sincronizar payments:', err?.message);
  }

  return { success: true, accessUntil, profileId: profile.id };
}

// ============================================================
// Processamento centralizado e unificado de pagamentos Mercado Pago
// Usado por: Webhook, Polling (/api/checkout/status), Cron e Admin
// ============================================================

export type PaymentApplySource = 'webhook' | 'status_polling' | 'cron_reconciliation' | 'admin_manual';

export interface ApplyPaymentResultParams {
  order: {
    id: string;
    user_id?: string | null;
    status: string;
    total_cents: number;
    paid_at?: string | null;
    customer_name?: string | null;
    customer_email?: string | null;
    customer_phone?: string | null;
    shipping_address?: any;
    shipping_service_name?: string | null;
    items?: any;
    notes?: string | null;
    payment_provider_id?: string | null;
  };
  mpPayment: {
    id: string;
    status: string;
    status_detail?: string | null;
    external_reference?: string | null;
    transaction_amount?: number | null;
    currency_id?: string | null;
    date_approved?: string | null;
    date_created?: string | null;
    metadata?: Record<string, unknown>;
  };
  source: PaymentApplySource;
}

export interface ApplyPaymentOutcome {
  success: boolean;
  status: string;
  action: 'paid_transition' | 'already_processed' | 'status_updated' | 'mismatch_ignored' | 'dispute_alerted' | 'no_change';
  reason?: string;
  orderId: string;
}

/**
 * Registra o evento na tabela de auditoria public.payment_events (se existir).
 * Não lança erro se a tabela ainda não tiver sido criada no Supabase.
 */
async function logPaymentEvent(
  db: SupabaseClient,
  params: {
    paymentId: string;
    orderId: string;
    previousStatus: string;
    newStatus: string;
    source: PaymentApplySource;
    amountCents?: number;
    currency?: string;
    payloadSnapshot: any;
    errorMessage?: string;
  }
) {
  try {
    await db.from('payment_events').insert({
      payment_id: params.paymentId,
      order_id: params.orderId,
      previous_status: params.previousStatus,
      new_status: params.newStatus,
      source: params.source,
      amount_cents: params.amountCents,
      currency: params.currency || 'BRL',
      payload_snapshot: params.payloadSnapshot,
      error_message: params.errorMessage || null,
    });
  } catch (err: any) {
    // Ignora silenciosamente se a tabela ainda não foi criada no banco
    console.warn('[logPaymentEvent] Aviso ao salvar auditoria:', err?.message);
  }
}

/**
 * Aplica de forma ATÔMICA e IDEMPOTENTE o resultado de um pagamento do Mercado Pago em um pedido.
 *
 * Regras essenciais:
 * 1. Validações rigorosas antes de marcar como pago: status approved, external_reference bate com order.id,
 *    transaction_amount bate com total_cents, moeda BRL.
 * 2. UPDATE atômico com WHERE status IN ('novo', 'pending') RETURNING *.
 *    Apenas a requisição que receber o pedido de volta dispara os efeitos colaterais (WhatsApp, E-mail, ntfy).
 * 3. Nunca retrocede pedidos em status 'em_atendimento', 'concluido' ou 'cancelado'.
 * 4. Se um pedido em status avançado estiver sem paid_at e o MP estiver approved, preenche apenas paid_at.
 * 5. Se MP vier como refunded/charged_back em pedido já pago: NÃO retrocede o status, apenas registra alerta ntfy urgente e log.
 * 6. Se MP vier como rejected/cancelled/expired em pedido pendente: atualiza para 'cancelado'.
 */
export async function applyPaymentResult(
  db: SupabaseClient,
  params: ApplyPaymentResultParams
): Promise<ApplyPaymentOutcome> {
  const { order, mpPayment, source } = params;
  const paymentId = String(mpPayment.id);
  const mpStatus = String(mpPayment.status || '').toLowerCase();
  const currentStatus = order.status;

  // Importações dinâmicas para evitar dependências circulares com serviços de notificação
  const { NotificationService } = await import('@/lib/server/notifications');
  const { EmailService } = await import('@/lib/server/email');
  const { sendNtfySaleNotification, sendNtfyMessage } = await import('@/lib/server/ntfy');

  // ------------------------------------------------------------
  // A. Tratamento de Reversão / Chargeback em pedido já pago
  // ------------------------------------------------------------
  if (mpStatus === 'refunded' || mpStatus === 'charged_back') {
    if (['paid', 'em_atendimento', 'concluido'].includes(currentStatus)) {
      console.warn(`[applyPaymentResult] ALERTA DE CHARGEBACK/REEMBOLSO: Pedido ${order.id} (MP ${paymentId})`);
      
      await logPaymentEvent(db, {
        paymentId,
        orderId: order.id,
        previousStatus: currentStatus,
        newStatus: mpStatus,
        source,
        amountCents: order.total_cents,
        payloadSnapshot: mpPayment,
      });

      // Dispara alerta urgente para o lojista via ntfy
      await sendNtfyMessage({
        title: `⚠️ ALERTA: ${mpStatus === 'refunded' ? 'REEMBOLSO' : 'CHARGEBACK'} DETECTADO!`,
        message: `Pedido #${order.id}\nValor: R$ ${(order.total_cents / 100).toFixed(2)}\nCliente: ${order.customer_name || 'N/A'}\nStatus no Mercado Pago: ${mpStatus}.\nO status do pedido foi mantido como '${currentStatus}' para análise manual da equipe.`,
        priority: 'urgent',
        tags: ['rotating_light', 'warning', 'money_with_wings'],
      }).catch(() => undefined);

      return {
        success: true,
        status: currentStatus,
        action: 'dispute_alerted',
        reason: `Pagamento ${mpStatus}. Alerta disparado para equipe e status preservado.`,
        orderId: order.id,
      };
    }
  }

  // ------------------------------------------------------------
  // B. Tratamento de Cancelamento / Rejeição / Expirado em pedido pendente
  // ------------------------------------------------------------
  if (['rejected', 'cancelled', 'expired'].includes(mpStatus)) {
    if (['novo', 'pending'].includes(currentStatus)) {
      await db
        .from('orders')
        .update({ status: 'cancelado' })
        .eq('id', order.id)
        .in('status', ['novo', 'pending']);

      await logPaymentEvent(db, {
        paymentId,
        orderId: order.id,
        previousStatus: currentStatus,
        newStatus: 'cancelado',
        source,
        payloadSnapshot: mpPayment,
      });

      return {
        success: true,
        status: 'cancelado',
        action: 'status_updated',
        reason: `Pedido cancelado conforme status '${mpStatus}' do Mercado Pago.`,
        orderId: order.id,
      };
    }
    return {
      success: true,
      status: currentStatus,
      action: 'no_change',
      orderId: order.id,
    };
  }

  // ------------------------------------------------------------
  // C. Tratamento de Pagamento Aprovado (approved)
  // ------------------------------------------------------------
  if (mpStatus === 'approved') {
    // 1. Validação de Integridade e Segurança
    const externalRef = mpPayment.external_reference?.trim();
    if (externalRef && externalRef !== order.id) {
      const msg = `external_reference divergente: MP='${externalRef}' vs Order='${order.id}'`;
      console.error(`[applyPaymentResult] ${msg}`);
      await sendNtfyMessage({
        title: `🚨 DIVERGÊNCIA DE PAGAMENTO: #${order.id}`,
        message: `${msg}\nPagamento MP: ${paymentId}`,
        priority: 'urgent',
        tags: ['skull', 'warning'],
      }).catch(() => undefined);

      await logPaymentEvent(db, {
        paymentId,
        orderId: order.id,
        previousStatus: currentStatus,
        newStatus: currentStatus,
        source,
        payloadSnapshot: mpPayment,
        errorMessage: msg,
      });

      return { success: false, status: currentStatus, action: 'mismatch_ignored', reason: msg, orderId: order.id };
    }

    if (mpPayment.currency_id && mpPayment.currency_id !== 'BRL') {
      const msg = `Moeda não autorizada: '${mpPayment.currency_id}'. Esperado 'BRL'.`;
      console.error(`[applyPaymentResult] ${msg}`);
      return { success: false, status: currentStatus, action: 'mismatch_ignored', reason: msg, orderId: order.id };
    }

    const paidCents =
      typeof mpPayment.transaction_amount === 'number'
        ? Math.round(mpPayment.transaction_amount * 100)
        : null;

    if (paidCents !== null && paidCents !== order.total_cents) {
      const msg = `Valor pago divergente do pedido: MP R$ ${(paidCents / 100).toFixed(2)} vs Pedido R$ ${(order.total_cents / 100).toFixed(2)}`;
      console.error(`[applyPaymentResult] ${msg}`);
      await sendNtfyMessage({
        title: `🚨 VALOR DIVERGENTE NO PEDIDO: #${order.id}`,
        message: `${msg}\nPagamento MP: ${paymentId}. Pedido NÃO foi aprovado automaticamente.`,
        priority: 'urgent',
        tags: ['warning', 'moneybag'],
      }).catch(() => undefined);

      await logPaymentEvent(db, {
        paymentId,
        orderId: order.id,
        previousStatus: currentStatus,
        newStatus: currentStatus,
        source,
        payloadSnapshot: mpPayment,
        errorMessage: msg,
      });

      return { success: false, status: currentStatus, action: 'mismatch_ignored', reason: msg, orderId: order.id };
    }

    // 2. Transição ATÔMICA para status 'paid'
    const approvalDateIso = mpPayment.date_approved || new Date().toISOString();

    const { data: updatedRows, error: updateError } = await db
      .from('orders')
      .update({
        status: 'paid',
        paid_at: approvalDateIso,
        payment_provider_id: paymentId,
      })
      .eq('id', order.id)
      .in('status', ['novo', 'pending'])
      .select('*');

    if (updateError) {
      console.error(`[applyPaymentResult] Erro ao atualizar pedido ${order.id}:`, updateError.message);
      throw new Error(`Falha ao atualizar pedido: ${updateError.message}`);
    }

    // Se nenhuma linha foi retornada, o pedido já não estava em ('novo', 'pending')
    if (!updatedRows || updatedRows.length === 0) {
      // Se já estava pago ou avançado, mas com paid_at nulo, preenche apenas a data de aprovação
      if (!order.paid_at && ['paid', 'em_atendimento', 'concluido'].includes(currentStatus)) {
        await db
          .from('orders')
          .update({ paid_at: approvalDateIso, payment_provider_id: paymentId })
          .eq('id', order.id)
          .is('paid_at', null);
      }

      return {
        success: true,
        status: currentStatus,
        action: 'already_processed',
        reason: `Pedido ${order.id} já estava no status '${currentStatus}'. Notificações não duplicadas.`,
        orderId: order.id,
      };
    }

    const updatedOrder = updatedRows[0];

    // Registra evento de pagamento aprovado na tabela de auditoria
    await logPaymentEvent(db, {
      paymentId,
      orderId: order.id,
      previousStatus: currentStatus,
      newStatus: 'paid',
      source,
      amountCents: order.total_cents,
      payloadSnapshot: mpPayment,
    });

    // ------------------------------------------------------------
    // 3. EFEITOS COLATERAIS (Somente quem ganhou a corrida atômica)
    // ------------------------------------------------------------

    // A) Verifica se é pedido de plano da consultoria
    const isPlanOrder =
      order.id.includes('-PLAN-') ||
      (order.notes && order.notes.includes('Plano')) ||
      (Array.isArray(order.items) &&
        order.items.some(
          (i: any) =>
            i?.planId ||
            (typeof i?.name === 'string' &&
              (i.name.toLowerCase().includes('assinatura') ||
                i.name.toLowerCase().includes('consultoria') ||
                i.name.toLowerCase().includes('passe') ||
                i.name.toLowerCase().includes('clube')))
        ));

    if (isPlanOrder) {
      let planId: PlanId = 'passe';
      const items = Array.isArray(order.items) ? order.items : [];
      const planItem = items.find((i: any) => i?.planId || i?.name);
      if (planItem?.planId === 'clube' || planItem?.name?.toLowerCase().includes('clube')) {
        planId = 'clube';
      }

      await grantConsultingAccess(db, {
        userId: order.user_id,
        email: order.customer_email,
        planId,
        amountCents: order.total_cents || 0,
        paymentProviderId: paymentId,
      }).catch((e) => console.error('[applyPaymentResult] Erro grantConsultingAccess:', e));

      const planInfo = getPlan(planId);
      const planName = planInfo?.name || 'Clube VIP';
      const customerName = order.customer_name || 'Cliente VIP';

      if (order.customer_phone) {
        NotificationService.sendOrderNotification({
          phone: order.customer_phone,
          customerName,
          orderId: order.id,
          amountCents: order.total_cents || 0,
          type: 'CONSULTING_ACCESS_GRANTED',
          planName,
        }).catch((e) => console.error('[applyPaymentResult] Erro WhatsApp Consultoria:', e));
      }

      if (order.customer_email) {
        EmailService.sendConsultingAccessGranted({
          customerName,
          customerEmail: order.customer_email,
          planName,
        }).catch((e) => console.error('[applyPaymentResult] Erro E-mail Consultoria:', e));
      }
    } else {
      // B) Pedido físico da loja:
      if (order.customer_phone) {
        NotificationService.sendOrderNotification({
          phone: order.customer_phone,
          customerName: order.customer_name || 'Cliente',
          orderId: order.id,
          amountCents: order.total_cents || 0,
          type: 'PAYMENT_CONFIRMED',
        }).catch((e) => console.error('[applyPaymentResult] Erro WhatsApp:', e));
      }

      if (order.customer_email) {
        EmailService.sendOrderPaymentConfirmed({
          orderId: order.id,
          customerName: order.customer_name || 'Cliente',
          customerEmail: order.customer_email,
          amountCents: order.total_cents || 0,
          items: order.items || [],
          shippingAddress: order.shipping_address,
        }).catch((e) => console.error('[applyPaymentResult] Erro E-mail:', e));
      }

      NotificationService.sendMerchantOrderApprovedNotification({
        orderId: order.id,
        totalCents: order.total_cents || 0,
        customerName: order.customer_name || 'Cliente',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        paymentMethod: (order as any).payment_method || 'Mercado Pago',
        shippingService: (order as any).shipping_service_name,
        shippingCity: (order.shipping_address as any)?.city,
        shippingState: (order.shipping_address as any)?.state,
        items: (order.items as any) || [],
      }).catch((e) => console.error('[applyPaymentResult] Erro notificação WhatsApp lojista:', e));

      sendNtfySaleNotification({
        orderId: order.id,
        totalCents: order.total_cents || 0,
        amountCents: order.total_cents || 0,
        paymentMethod: 'mercadopago',
        status: 'paid',
        customerName: order.customer_name || 'Cliente',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        shippingService: updatedOrder.shipping_service_name,
        city: (order.shipping_address as any)?.city,
        state: (order.shipping_address as any)?.state,
        items: (order.items as any) || [],
      }).catch((e) => console.error('[applyPaymentResult] Erro ntfy:', e));
    }

    return {
      success: true,
      status: 'paid',
      action: 'paid_transition',
      orderId: order.id,
    };
  }

  // Demais status (pending, in_process, etc.)
  return {
    success: true,
    status: currentStatus,
    action: 'no_change',
    orderId: order.id,
  };
}


