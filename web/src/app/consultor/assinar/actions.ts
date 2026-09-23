'use server';

import {
  createTransparentPayment,
  mercadoPagoConfigured,
  createServiceSupabase,
  MercadoPagoError,
  type CardDetails,
} from '@/lib/server/mercadopago';
import { grantConsultingAccess } from '@/lib/server/payments';
import { quoteCoupon, readCouponCode } from '@/lib/server/coupons';
import { NotificationService } from '@/lib/server/notifications';
import { EmailService } from '@/lib/server/email';
import { getPlan } from '@/lib/site';
import { isValidDocument } from '@/lib/format';
import type { PlanId } from '@/lib/types';

export interface ProcessPlanPaymentPayload {
  userId?: string | null;
  planId: PlanId;
  couponCode?: string | null;
  paymentMethod: 'pix' | 'credit_card';
  payer: {
    firstName: string;
    lastName: string;
    email: string;
    cpf: string;
    phone?: string;
  };
  card?: CardDetails;
  cardToken?: string;
  paymentMethodId?: string;
  installments?: number;
  origin?: string;
}

export interface ProcessPlanPaymentResponse {
  success: boolean;
  error?: string;
  data?: {
    orderId: string;
    id?: string;
    status: string;
    isApproved: boolean;
    qrCodeBase64?: string | null;
    qrCode?: string | null;
    ticketUrl?: string | null;
    planName: string;
  };
}

export async function processPlanPaymentAction(
  data: ProcessPlanPaymentPayload
): Promise<ProcessPlanPaymentResponse> {
  try {
    const plan = getPlan(data.planId);
    if (!plan || plan.priceCents === null || plan.accessDays === null) {
      return { success: false, error: 'Plano inválido ou indisponível para contratação online.' };
    }

    if (!data.payer?.email || !data.payer?.cpf || !data.payer?.firstName) {
      return { success: false, error: 'Por favor, preencha os dados de nome, e-mail e CPF.' };
    }

    const cleanCpf = data.payer.cpf.replace(/\D/g, '');
    if (!isValidDocument(cleanCpf)) {
      return {
        success: false,
        error: 'O CPF informado é inválido. Por favor, confira os 11 números digitados.',
      };
    }

    const service = createServiceSupabase();
    const couponCode = readCouponCode(data.couponCode);

    let amountCents = plan.priceCents;
    let discountCents = 0;

    if (couponCode) {
      const quoteRes = await quoteCoupon(service, couponCode, plan.id, plan.priceCents);
      if (!quoteRes.ok) {
        return { success: false, error: quoteRes.message };
      }
      amountCents = quoteRes.quote.finalCents;
      discountCents = quoteRes.quote.discountCents;
    }

    // Caso de Cupom 100% de desconto
    if (amountCents <= 0) {
      const orderId = `TITIS-PLAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      await service.from('orders').insert({
        id: orderId,
        user_id: data.userId || null,
        total_cents: 0,
        status: 'paid',
        channel: 'mercadopago',
        payment_method: 'cupom_100',
        customer_name: `${data.payer.firstName} ${data.payer.lastName || ''}`.trim(),
        customer_email: data.payer.email,
        customer_phone: data.payer.phone || null,
        customer_cpf: cleanCpf,
        shipping_address: { type: 'digital', plan: plan.name },
        shipping_service_name: 'Acesso Digital Imediato',
        shipping_price_cents: 0,
        items: [
          {
            name: `Assinatura Consultoria · ${plan.name}`,
            priceCents: 0,
            quantity: 1,
            detail: plan.cadence,
            planId: plan.id,
          },
        ],
        notes: `Cupom 100% (${couponCode}) · Plano: ${plan.name} (${plan.id})`,
        paid_at: new Date().toISOString(),
      });

      await service.from('payments').insert({
        user_id: data.userId || null,
        plan: plan.id,
        amount_cents: 0,
        discount_cents: discountCents,
        coupon_code: couponCode,
        provider: 'manual',
        status: 'approved',
        applied_at: new Date().toISOString(),
      });

      await grantConsultingAccess(service, {
        userId: data.userId,
        email: data.payer.email,
        planId: plan.id,
        amountCents: 0,
      });

      if (couponCode) {
        await service.rpc('redeem_coupon', { p_code: couponCode }).then(undefined, () => undefined);
      }

      return {
        success: true,
        data: {
          orderId,
          status: 'approved',
          isApproved: true,
          planName: plan.name,
        },
      };
    }

    if (!mercadoPagoConfigured()) {
      return {
        success: false,
        error:
          'Chave do Mercado Pago não configurada no servidor. Por favor, entre em contato via WhatsApp para ativar seu plano.',
      };
    }

    const orderId = `TITIS-PLAN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Cria o pagamento no Mercado Pago transparente
    const result = await createTransparentPayment({
      orderId,
      amountCents,
      paymentMethod: data.paymentMethod,
      payer: {
        firstName: data.payer.firstName.trim(),
        lastName: data.payer.lastName.trim(),
        email: data.payer.email.trim(),
        cpf: cleanCpf,
        phone: data.payer.phone?.trim(),
      },
      cardToken: data.cardToken,
      card: data.card,
      paymentMethodId: data.paymentMethodId,
      installments: data.installments,
      origin: data.origin || 'https://www.titisstore.com.br',
    });

    const isApproved = result.status === 'approved';

    // Registra pedido em public.orders
    await service
      .from('orders')
      .insert({
        id: orderId,
        user_id: data.userId || null,
        total_cents: amountCents,
        status: isApproved ? 'paid' : 'pending',
        channel: 'mercadopago',
        payment_method: data.paymentMethod,
        payment_provider_id: result.id,
        customer_name: `${data.payer.firstName} ${data.payer.lastName || ''}`.trim(),
        customer_email: data.payer.email,
        customer_phone: data.payer.phone || null,
        customer_cpf: cleanCpf,
        shipping_address: { type: 'digital', plan: plan.name },
        shipping_service_name: 'Acesso Digital Imediato',
        shipping_price_cents: 0,
        items: [
          {
            name: `Assinatura Consultoria · ${plan.name}`,
            priceCents: amountCents,
            quantity: 1,
            detail: plan.cadence,
            planId: plan.id,
          },
        ],
        notes: `Plano: ${plan.name} (${plan.id})`,
        paid_at: isApproved ? new Date().toISOString() : null,
      })
      .then(undefined, (err) => {
        console.warn('[actions/planCheckout] Falha ao gravar pedido em orders:', err?.message);
      });

    // Registra em public.payments
    await service
      .from('payments')
      .insert({
        user_id: data.userId || null,
        plan: plan.id,
        amount_cents: amountCents,
        discount_cents: discountCents,
        coupon_code: couponCode,
        provider: 'mercadopago',
        provider_payment_id: result.id,
        status: isApproved ? 'approved' : 'pending',
        applied_at: isApproved ? new Date().toISOString() : null,
      })
      .then(undefined, (err) => {
        console.warn('[actions/planCheckout] Falha ao gravar em payments:', err?.message);
      });

    // Se aprovado imediatamente (ex: Cartão de Crédito aprovado)
    if (isApproved) {
      await grantConsultingAccess(service, {
        userId: data.userId,
        email: data.payer.email,
        planId: plan.id,
        amountCents,
        paymentProviderId: result.id,
      });

      if (couponCode) {
        await service.rpc('redeem_coupon', { p_code: couponCode }).then(undefined, () => undefined);
      }

      if (data.payer.phone) {
        NotificationService.sendOrderNotification({
          phone: data.payer.phone,
          customerName: data.payer.firstName,
          orderId,
          amountCents,
          type: 'CONSULTING_ACCESS_GRANTED',
          planName: plan.name,
        }).catch((e) => console.error('[NotificationService Consultor Card]', e));
      }

      if (data.payer.email) {
        EmailService.sendConsultingAccessGranted({
          customerName: data.payer.firstName,
          customerEmail: data.payer.email,
          planName: plan.name,
        }).catch((e) => console.error('[EmailService Consultor Card]', e));
      }
    } else if (data.paymentMethod === 'pix') {
      if (data.payer.phone && result.qrCode) {
        NotificationService.sendOrderNotification({
          phone: data.payer.phone,
          customerName: data.payer.firstName,
          orderId,
          amountCents,
          type: 'PIX_GENERATED',
          pixCode: result.qrCode,
        }).catch((err) => console.error('[NotificationService Pix]', err));
      }
    }

    return {
      success: true,
      data: {
        orderId,
        id: result.id,
        status: result.status,
        isApproved,
        qrCodeBase64: result.qrCodeBase64,
        qrCode: result.qrCode,
        ticketUrl: result.ticketUrl,
        planName: plan.name,
      },
    };
  } catch (err: any) {
    if (err instanceof MercadoPagoError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err?.message || 'Erro ao processar pagamento do plano.' };
  }
}
