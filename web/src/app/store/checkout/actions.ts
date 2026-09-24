'use server';

import {
  createTransparentPayment,
  mercadoPagoConfigured,
  createServiceSupabase,
  MercadoPagoError,
} from '@/lib/server/mercadopago';
import { NotificationService } from '@/lib/server/notifications';
import { EmailService } from '@/lib/server/email';
import { sendNtfySaleNotification } from '@/lib/server/ntfy';

export interface ProcessCheckoutPayload {
  userId?: string | null;
  amountCents: number;
  paymentMethod: 'pix' | 'credit_card';
  payer: {
    firstName: string;
    lastName: string;
    email: string;
    cpf: string;
    phone?: string;
  };
  shipping: Record<string, unknown>;
  shippingService: {
    id: string;
    name: string;
    priceCents: number;
    deliveryDays: number;
  };
  items: Array<{
    name: string;
    priceCents?: number;
    quantity: number;
    size?: string;
    color?: string;
  }>;
  card?: {
    cardNumber: string;
    cardHolder: string;
    cardExpiry: string;
    cardCvv: string;
    cardholderCpf?: string;
  };
  cardToken?: string;
  paymentMethodId?: string;
  installments?: number;
  origin?: string;
}

export interface ProcessCheckoutResponse {
  success: boolean;
  error?: string;
  data?: {
    orderId: string;
    id: string;
    status: string;
    statusDetail: string | null;
    qrCodeBase64?: string | null;
    qrCode?: string | null;
    ticketUrl?: string | null;
  };
}

export async function processTransparentCheckoutAction(
  data: ProcessCheckoutPayload
): Promise<ProcessCheckoutResponse> {
  try {
    if (!data.amountCents || data.amountCents <= 0) {
      return { success: false, error: 'Valor total inválido.' };
    }
    if (!data.payer?.email || !data.payer?.cpf || !data.payer?.firstName) {
      return { success: false, error: 'Dados do comprador incompletos.' };
    }
    if (!mercadoPagoConfigured()) {
      return {
        success: false,
        error:
          'Chave do Mercado Pago (MERCADOPAGO_ACCESS_TOKEN) não detectada no servidor da Vercel. Verifique as variáveis de ambiente e o deploy.',
      };
    }

    const orderId = `TITIS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const service = createServiceSupabase();

    const result = await createTransparentPayment({
      orderId,
      amountCents: data.amountCents,
      paymentMethod: data.paymentMethod,
      payer: data.payer,
      cardToken: data.cardToken,
      card: data.card,
      paymentMethodId: data.paymentMethodId,
      installments: data.installments,
      origin: data.origin || 'https://www.titisstore.com.br',
    });

    const isApproved = result.status === 'approved';

    await service
      .from('orders')
      .insert({
        id: orderId,
        user_id: data.userId || null,
        total_cents: data.amountCents,
        status: isApproved ? 'paid' : 'pending',
        channel: 'mercadopago',
        payment_method: data.paymentMethod,
        payment_provider_id: result.id,
        customer_name: `${data.payer.firstName} ${data.payer.lastName || ''}`.trim(),
        customer_email: data.payer.email,
        customer_phone: data.payer.phone || null,
        customer_cpf: data.payer.cpf.replace(/\D/g, ''),
        shipping_address: data.shipping || null,
        shipping_service_id: data.shippingService?.id || null,
        shipping_service_name: data.shippingService?.name || null,
        shipping_price_cents: data.shippingService?.priceCents || 0,
        shipping_delivery_days: data.shippingService?.deliveryDays || null,
        items: data.items || [],
        paid_at: isApproved ? new Date().toISOString() : null,
      })
      .then(undefined, (err) => {
        console.warn('[actions/checkout] Falha ao gravar pedido em orders:', err?.message);
      });

    // Notificação push instantânea via ntfy.sh para o lojista
    sendNtfySaleNotification({
      orderId,
      totalCents: data.amountCents,
      amountCents: data.amountCents,
      paymentMethod: data.paymentMethod,
      status: isApproved ? 'paid' : 'pending',
      customerName: `${data.payer.firstName} ${data.payer.lastName || ''}`.trim(),
      customerEmail: data.payer.email,
      customerPhone: data.payer.phone,
      shippingService: data.shippingService?.name,
      city: (data.shipping as any)?.city,
      state: (data.shipping as any)?.state,
      items: data.items || [],
    }).catch((err) => console.error('[Ntfy checkout action]', err));

    if (data.paymentMethod === 'pix') {
      if (data.payer.phone && result.qrCode) {
        NotificationService.sendOrderNotification({
          phone: data.payer.phone,
          customerName: data.payer.firstName,
          orderId,
          amountCents: data.amountCents,
          type: 'PIX_GENERATED',
          pixCode: result.qrCode,
        }).catch((err) => console.error('[NotificationService Pix]', err));
      }
      if (data.payer.email) {
        EmailService.sendOrderPixGenerated({
          orderId,
          customerName: data.payer.firstName,
          customerEmail: data.payer.email,
          amountCents: data.amountCents,
          items: data.items || [],
          pixCode: result.qrCode || undefined,
        }).catch((err) => console.error('[EmailService Pix]', err));
      }
    } else if (isApproved) {
      if (data.payer.phone) {
        NotificationService.sendOrderNotification({
          phone: data.payer.phone,
          customerName: data.payer.firstName,
          orderId,
          amountCents: data.amountCents,
          type: 'PAYMENT_CONFIRMED',
        }).catch((err) => console.error('[NotificationService Card]', err));
      }
      if (data.payer.email) {
        EmailService.sendOrderPaymentConfirmed({
          orderId,
          customerName: data.payer.firstName,
          customerEmail: data.payer.email,
          amountCents: data.amountCents,
          items: data.items || [],
          shippingAddress: data.shipping,
        }).catch((err) => console.error('[EmailService Card]', err));
      }
    }

    return {
      success: true,
      data: {
        orderId,
        id: result.id,
        status: result.status,
        statusDetail: result.statusDetail,
        qrCodeBase64: result.qrCodeBase64,
        qrCode: result.qrCode,
        ticketUrl: result.ticketUrl,
      },
    };
  } catch (err: any) {
    if (err instanceof MercadoPagoError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err?.message || 'Erro ao processar transação.' };
  }
}
