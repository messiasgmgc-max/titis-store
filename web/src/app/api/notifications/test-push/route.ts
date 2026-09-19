// ============================================================
// API: /api/notifications/test-push
// Dispara notificação de teste simulando emissão de etiqueta
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { WebPushService, PushPayload } from '@/lib/server/webpush';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { subscription, type, orderId, trackingCode, carrier } = body;

    const testOrderId = orderId || 'TST-' + Math.floor(100000 + Math.random() * 900000);
    const testTracking = trackingCode || 'BR' + Math.floor(100000000 + Math.random() * 900000000) + 'BR';
    const testCarrier = carrier || 'Correios Sedex';

    const payload: PushPayload = {
      title: `📦 Etiqueta Gerada! Pedido #${testOrderId.slice(0, 8)}`,
      body: `Suas peças de alfaiataria foram embaladas e a etiqueta foi emitida via ${testCarrier}. Código de rastreio: ${testTracking}`,
      icon: '/titislogo.jpeg',
      badge: '/titislogo.jpeg',
      tag: `order-${testOrderId}`,
      url: `/dashboard?aba=pedidos`,
      orderId: testOrderId,
      trackingCode: testTracking,
      actions: [
        { action: 'track', title: '🔍 Rastrear Envio' },
        { action: 'open', title: '📦 Ver Pedido' },
      ],
    };

    // Se o cliente enviou a inscrição direta na requisição, envia para ela
    if (subscription && subscription.endpoint) {
      const result = await WebPushService.sendToSubscription(subscription, payload);
      return NextResponse.json({
        success: result.success,
        type: 'direct',
        orderId: testOrderId,
        trackingCode: testTracking,
        carrier: testCarrier,
        result,
      });
    }

    // Caso contrário, faz broadcast para todas as inscrições registradas
    const broadcastResult = await WebPushService.sendBroadcast(payload);
    return NextResponse.json({
      success: broadcastResult.sentCount > 0 || broadcastResult.totalFound === 0,
      type: 'broadcast',
      orderId: testOrderId,
      trackingCode: testTracking,
      carrier: testCarrier,
      sentCount: broadcastResult.sentCount,
      totalFound: broadcastResult.totalFound,
    });
  } catch (err: any) {
    console.error('[API Test Push] Erro ao disparar notificação de teste:', err);
    return NextResponse.json({ error: 'Erro ao enviar notificação de teste push.' }, { status: 500 });
  }
}
