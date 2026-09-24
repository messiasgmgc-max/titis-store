// ============================================================
// POST /api/admin/orders/dispatch
// Atualiza o pedido como despachado e envia rastreamento por WhatsApp e E-mail
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { dispatchOrderManually } from '@/lib/server/shipping-operations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, trackingCode, trackingCarrier, trackingUrl } = body;

    if (!orderId || !trackingCode) {
      return NextResponse.json({ error: 'orderId e trackingCode são obrigatórios.' }, { status: 400 });
    }

    const result = await dispatchOrderManually(orderId, trackingCode, trackingCarrier, trackingUrl);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/admin/orders/dispatch] Erro interno:', err);
    return NextResponse.json({ error: msg || 'Falha ao despachar pedido.' }, { status: 500 });
  }
}
