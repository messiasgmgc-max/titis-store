// ============================================================
// POST /api/admin/orders/dispatch
// Atualiza o pedido como despachado e envia rastreamento por WhatsApp e E-mail
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/server/mercadopago';
import { NotificationService } from '@/lib/server/notifications';
import { EmailService } from '@/lib/server/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, trackingCode, trackingCarrier, trackingUrl } = body;

    if (!orderId || !trackingCode) {
      return NextResponse.json({ error: 'orderId e trackingCode são obrigatórios.' }, { status: 400 });
    }

    const service = createServiceSupabase();

    // Busca o pedido no banco
    const { data: order, error } = await service
      .from('orders')
      .select('id, customer_name, customer_email, customer_phone, total_cents, status')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    // Atualiza status e dados de rastreio
    const { error: updateError } = await service
      .from('orders')
      .update({
        status: 'concluido',
        tracking_code: trackingCode.trim(),
        tracking_carrier: trackingCarrier ? trackingCarrier.trim() : 'Correios',
        tracking_url: trackingUrl ? trackingUrl.trim() : null,
        dispatched_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 1. Notificação WhatsApp (Evolution API)
    if (order.customer_phone) {
      NotificationService.sendOrderNotification({
        phone: order.customer_phone,
        customerName: order.customer_name || 'Cliente',
        orderId: order.id,
        amountCents: order.total_cents || 0,
        type: 'ORDER_DISPATCHED',
        trackingCode: trackingCode.trim(),
        trackingCarrier: trackingCarrier ? trackingCarrier.trim() : 'Correios',
        trackingUrl: trackingUrl ? trackingUrl.trim() : undefined,
      }).catch((e) => console.error('[Dispatch] Falha no WhatsApp:', e));
    }

    // 2. Notificação E-mail
    if (order.customer_email) {
      EmailService.sendOrderDispatched({
        orderId: order.id,
        customerName: order.customer_name || 'Cliente',
        customerEmail: order.customer_email,
        trackingCode: trackingCode.trim(),
        trackingCarrier: trackingCarrier ? trackingCarrier.trim() : 'Correios',
        trackingUrl: trackingUrl ? trackingUrl.trim() : undefined,
      }).catch((e) => console.error('[Dispatch] Falha no E-mail:', e));
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido despachado e notificações enviadas com sucesso.',
    });
  } catch (err: any) {
    console.error('[api/admin/orders/dispatch] Erro interno:', err);
    return NextResponse.json({ error: 'Erro ao despachar pedido.' }, { status: 500 });
  }
}
