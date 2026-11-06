// ============================================================
// POST /api/checkout/transparent — Checkout Transparente (Pix e Cartão)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceSupabase,
  createTransparentPayment,
  isMercadoPagoConfigured,
  MercadoPagoError,
} from '@/lib/server/mercadopago';
import { NotificationService } from '@/lib/server/notifications';
import { EmailService } from '@/lib/server/email';
import { sendNtfySaleNotification } from '@/lib/server/ntfy';
import { validateAndCalculateCheckout } from '@/lib/server/checkout-validation';
import { isValidDocument } from '@/lib/format';

function siteOrigin(req: Request): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (/^https?:\/\/[^\s/]+/i.test(configured)) return configured;
  return new URL(req.url).origin;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      amountCents,
      paymentMethod,
      payer,
      items,
      shipping,
      shippingService,
      cardToken,
      card,
      paymentMethodId,
      installments,
    } = body;

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Valor total inválido.' }, { status: 400 });
    }

    if (!payer?.email || !payer?.cpf || !payer?.firstName) {
      return NextResponse.json(
        { error: 'Dados do comprador incompletos (nome, e-mail e CPF são obrigatórios).' },
        { status: 400 }
      );
    }

    const cleanCpf = String(payer.cpf).replace(/\D/g, '');
    if (!isValidDocument(cleanCpf)) {
      return NextResponse.json(
        { error: 'O CPF informado é inválido. Por favor, confira os números digitados (o CPF deve possuir dígitos verificadores válidos).' },
        { status: 400 }
      );
    }

    if (card?.cardholderCpf) {
      const cleanCardholderCpf = String(card.cardholderCpf).replace(/\D/g, '');
      if (!isValidDocument(cleanCardholderCpf)) {
        return NextResponse.json(
          { error: 'O CPF do titular do cartão é inválido. Por favor, confira os números digitados.' },
          { status: 400 }
        );
      }
    }

    if (!(await isMercadoPagoConfigured())) {
      return NextResponse.json(
        {
          error:
            'Chave do Mercado Pago não configurada no Supabase ou Vercel. Configure suas chaves no painel Admin > Configurações.',
        },
        { status: 503 }
      );
    }

    const service = createServiceSupabase();

    // Recálculo e validação estrita no servidor (segurança contra manipulação de preço/itens no cliente)
    const validated = await validateAndCalculateCheckout(
      service,
      items || [],
      shippingService,
      shipping
    );

    const orderId = `TITIS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // 1. Cria o pagamento transparente no Mercado Pago
    const result = await createTransparentPayment({
      orderId,
      amountCents: validated.totalCents,
      paymentMethod,
      payer,
      cardToken,
      card,
      paymentMethodId,
      installments,
      origin: siteOrigin(req),
    });

    const isApproved = result.status === 'approved';

    // 2. Registra o pedido no Supabase
    await service
      .from('orders')
      .insert({
        id: orderId,
        user_id: userId || null,
        total_cents: validated.totalCents,
        status: isApproved ? 'paid' : 'pending',
        channel: 'mercadopago',
        payment_method: paymentMethod,
        payment_provider_id: result.id,
        customer_name: `${payer.firstName} ${payer.lastName || ''}`.trim(),
        customer_email: payer.email,
        customer_phone: payer.phone || null,
        customer_cpf: payer.cpf.replace(/\D/g, ''),
        shipping_address: shipping || null,
        shipping_service_id: validated.shippingService.id || null,
        shipping_service_name: validated.shippingService.name || null,
        shipping_price_cents: validated.shippingService.priceCents || 0,
        shipping_delivery_days: validated.shippingService.deliveryDays || null,
        items: validated.items || [],
        paid_at: isApproved ? new Date().toISOString() : null,
      })
      .then(undefined, (err) => {
        console.warn('[api/checkout/transparent] Falha ao gravar pedido em orders:', err?.message);
      });

    // Notificação push instantânea via ntfy para o lojista (aguardando envio para não ser morta pela Vercel)
    try {
      await sendNtfySaleNotification({
        orderId,
        totalCents: validated.totalCents,
        amountCents: validated.totalCents,
        paymentMethod,
        status: isApproved ? 'paid' : 'pending',
        customerName: `${payer.firstName} ${payer.lastName || ''}`.trim(),
        customerEmail: payer.email,
        customerPhone: payer.phone,
        shippingService: validated.shippingService.name,
        city: (shipping as any)?.city,
        state: (shipping as any)?.state,
        items: validated.items || [],
      });
    } catch (ntfyErr) {
      console.error('[Ntfy checkout api route]', ntfyErr);
    }

    // 3. Notificações automáticas (WhatsApp + E-mail)
    if (paymentMethod === 'pix') {
      // Disparo WhatsApp
      if (payer.phone && result.qrCode) {
        NotificationService.sendOrderNotification({
          phone: payer.phone,
          customerName: payer.firstName,
          orderId,
          amountCents,
          type: 'PIX_GENERATED',
          pixCode: result.qrCode,
        }).catch((err) => console.error('[NotificationService Pix WhatsApp]', err));
      }

      // Disparo E-mail
      if (payer.email) {
        EmailService.sendOrderPixGenerated({
          orderId,
          customerName: payer.firstName,
          customerEmail: payer.email,
          amountCents,
          items: items || [],
          pixCode: result.qrCode || undefined,
        }).catch((err) => console.error('[EmailService Pix]', err));
      }
    } else if (isApproved) {
      // Cartão aprovado na hora
      if (payer.phone) {
        NotificationService.sendOrderNotification({
          phone: payer.phone,
          customerName: payer.firstName,
          orderId,
          amountCents,
          type: 'PAYMENT_CONFIRMED',
        }).catch((err) => console.error('[NotificationService Card WhatsApp]', err));
      }

      if (payer.email) {
        EmailService.sendOrderPaymentConfirmed({
          orderId,
          customerName: payer.firstName,
          customerEmail: payer.email,
          amountCents,
          items: items || [],
          shippingAddress: shipping,
        }).catch((err) => console.error('[EmailService Card]', err));
      }

      // Notifica o lojista via WhatsApp (Evolution API)
      NotificationService.sendMerchantOrderApprovedNotification({
        orderId,
        customerName: [payer.firstName, payer.lastName].filter(Boolean).join(' ') || payer.firstName,
        customerEmail: payer.email,
        customerPhone: payer.phone,
        totalCents: amountCents,
        paymentMethod: 'credit_card',
        items: items || [],
        shippingService: shipping?.service,
        shippingCity: shipping?.city,
        shippingState: shipping?.state,
      }).catch((err) => console.error('[NotificationService Merchant Card WhatsApp]', err));
    }

    return NextResponse.json({
      orderId,
      id: result.id,
      status: result.status,
      statusDetail: result.statusDetail,
      qrCodeBase64: result.qrCodeBase64,
      qrCode: result.qrCode,
      ticketUrl: result.ticketUrl,
    });
  } catch (err: any) {
    if (err instanceof MercadoPagoError) {
      console.error(`[api/checkout/transparent] MP (${err.status}):`, err.message);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[api/checkout/transparent] Erro interno:', err);
    return NextResponse.json({ error: 'Erro ao processar transação.' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/checkout/transparent',
    mercadoPagoConfigured: await isMercadoPagoConfigured(),
    timestamp: new Date().toISOString(),
  });
}
