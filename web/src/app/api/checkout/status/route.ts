// ============================================================
// GET /api/checkout/status?orderId=TITIS-...
// Consulta em tempo real o status de pagamento de um pedido da loja
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/server/mercadopago';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId || !orderId.trim()) {
      return NextResponse.json({ error: 'orderId obrigatório.' }, { status: 400 });
    }

    const service = createServiceSupabase();

    const { data: order, error } = await service
      .from('orders')
      .select('id, status, paid_at, total_cents')
      .eq('id', orderId.trim())
      .maybeSingle();

    if (error) {
      console.warn('[api/checkout/status] Erro na consulta:', error.message);
      return NextResponse.json({ error: 'Erro ao consultar pedido.' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      isPaid: order.status === 'paid',
      paidAt: order.paid_at,
      totalCents: order.total_cents,
    });
  } catch (err: any) {
    console.error('[api/checkout/status] Erro interno:', err);
    return NextResponse.json({ error: 'Erro ao processar consulta.' }, { status: 500 });
  }
}
