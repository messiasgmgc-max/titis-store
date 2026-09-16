// ============================================================
// POST /api/checkout/transparent — Checkout Transparente (Pix e Cartão)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceSupabase,
  createTransparentPayment,
  mercadoPagoConfigured,
  MercadoPagoError,
} from '@/lib/server/mercadopago';
import { NotificationService } from '@/lib/server/notifications';

function siteOrigin(req: Request): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (/^https?:\/\/[^\s/]+/i.test(configured)) return configured;
  return new URL(req.url).origin;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amountCents,
      paymentMethod,
      payer,
      items,
      shipping,
      cardToken,
      paymentMethodId,
      installments,
    } = body;

    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Valor total inválido.' }, { status: 400 });
    }

    if (!payer?.email || !payer?.cpf || !payer?.firstName) {
      return NextResponse.json({ error: 'Dados do comprador incompletos.' }, { status: 400 });
    }

    if (!mercadoPagoConfigured()) {
      return NextResponse.json(
        { error: 'Pagamento online temporariamente indisponível. Finalize pelo WhatsApp.' },
        { status: 503 }
      );
    }

    const orderId = `TITIS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const service = createServiceSupabase();

    // 1. Cria o pagamento transparente no Mercado Pago
    const result = await createTransparentPayment({
      orderId,
      amountCents,
      paymentMethod,
      payer,
      cardToken,
      paymentMethodId,
      installments,
      origin: siteOrigin(req),
    });

    // 2. Registra o pedido no Supabase
    await service
      .from('orders')
      .insert({
        id: orderId,
        total_cents: amountCents,
        status: result.status === 'approved' ? 'paid' : 'pending',
        payment_method: paymentMethod,
        payment_provider_id: result.id,
        customer_name: `${payer.firstName} ${payer.lastName || ''}`.trim(),
        customer_email: payer.email,
        customer_phone: payer.phone || null,
        customer_cpf: payer.cpf.replace(/\D/g, ''),
        shipping_address: shipping || null,
        items: items || [],
      })
      .then(undefined, (err) => {
        console.warn('[api/checkout/transparent] Falha ao gravar pedido em orders:', err?.message);
      });

    // 3. Dispara notificação via WhatsApp se for Pix gerado
    if (paymentMethod === 'pix' && payer.phone && result.qrCode) {
      NotificationService.sendOrderNotification({
        phone: payer.phone,
        customerName: payer.firstName,
        orderId,
        amountCents,
        type: 'PIX_GENERATED',
        pixCode: result.qrCode,
      }).catch((err) => console.error(err));
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
