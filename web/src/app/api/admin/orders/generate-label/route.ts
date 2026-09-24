// ============================================================
// POST /api/admin/orders/generate-label
// Gera etiqueta oficial no SuperFrete / Melhor Envio (PDF), salva rastreio e notifica cliente
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { generateShippingLabelForOrder } from '@/lib/server/shipping-operations';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, serviceId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId obrigatório.' }, { status: 400 });
    }

    const result = await generateShippingLabelForOrder(orderId, serviceId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/admin/orders/generate-label] Erro interno:', err);
    return NextResponse.json({ error: msg || 'Erro ao gerar etiqueta de frete.' }, { status: 500 });
  }
}
