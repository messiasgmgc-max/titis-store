// ============================================================
// API: /api/notifications/subscribe
// GET: Retorna a chave pública VAPID
// POST: Salva / atualiza a inscrição Web Push do navegador
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { WebPushService } from '@/lib/server/webpush';

export async function GET() {
  try {
    const publicKey = WebPushService.getPublicKey();
    return NextResponse.json({ publicKey });
  } catch (err: any) {
    return NextResponse.json({ error: 'Erro ao obter chave pública VAPID' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, userId, customerEmail, customerPhone, deviceInfo } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Subscription data is required' }, { status: 400 });
    }

    const result = await WebPushService.saveSubscription({
      subscription,
      userId,
      customerEmail,
      customerPhone,
      deviceInfo,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Subscribe Push] Erro interno:', err);
    return NextResponse.json({ error: 'Erro ao processar inscrição push' }, { status: 500 });
  }
}
