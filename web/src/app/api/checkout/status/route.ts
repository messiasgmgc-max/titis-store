// ============================================================
// GET /api/checkout/status?orderId=TITIS-...
// Consulta em tempo real o status de pagamento de um pedido da loja.
// Inclui verificação de contingência diretamente na API do Mercado Pago
// se o pedido continuar pendente (evita que falhas no webhook travem o cliente).
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import {
  createServiceSupabase,
  getPayment,
  isMercadoPagoConfigured,
  MercadoPagoError,
} from '@/lib/server/mercadopago';
import { applyPaymentResult } from '@/lib/server/payments';

export const dynamic = 'force-dynamic';

// Cache em memória na instância para evitar chamadas excessivas ao MP (throttle de 10s por pedido)
const mpLookupThrottle = new Map<string, number>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId || !orderId.trim()) {
      return NextResponse.json({ error: 'orderId obrigatório.' }, { status: 400 });
    }

    const cleanOrderId = orderId.trim();
    const service = createServiceSupabase();

    const { data: order, error } = await service
      .from('orders')
      .select('*')
      .eq('id', cleanOrderId)
      .maybeSingle();

    if (error) {
      console.warn('[api/checkout/status] Erro na consulta do pedido:', error.message);
      return NextResponse.json({ error: 'Erro ao consultar pedido.' }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    // Se já estiver pago, retorna imediatamente sem tocar no Mercado Pago
    if (order.status === 'paid') {
      return NextResponse.json({
        id: order.id,
        status: 'paid',
        isPaid: true,
      });
    }

    // Se estiver pendente e possuir payment_provider_id (ou puder ser checado), consulta o MP como fallback
    const isPending = order.status === 'novo' || order.status === 'pending';
    const providerPaymentId = order.payment_provider_id;

    if (isPending && providerPaymentId && (await isMercadoPagoConfigured())) {
      const lastCheck = mpLookupThrottle.get(cleanOrderId) || 0;
      const now = Date.now();

      // Throttle: só consulta a API do Mercado Pago se passaram pelo menos 10 segundos desde a última checagem
      if (now - lastCheck > 10_000) {
        mpLookupThrottle.set(cleanOrderId, now);

        try {
          const mpPayment = await getPayment(providerPaymentId);

          if (mpPayment && mpPayment.status) {
            const outcome = await applyPaymentResult(service, {
              order,
              mpPayment,
              source: 'status_polling',
            });

            if (outcome.status === 'paid') {
              return NextResponse.json({
                id: order.id,
                status: 'paid',
                isPaid: true,
              });
            }

            return NextResponse.json({
              id: order.id,
              status: outcome.status,
              isPaid: outcome.status === 'paid',
            });
          }
        } catch (mpErr) {
          if (mpErr instanceof MercadoPagoError && mpErr.status === 404) {
            console.warn(`[api/checkout/status] Pagamento ${providerPaymentId} não encontrado no MP.`);
          } else {
            console.warn('[api/checkout/status] Aviso ao consultar MP como contingência:', mpErr);
          }
        }
      }
    }

    // Retorna payload seguro (apenas status e flag isPaid, sem dados sensíveis)
    return NextResponse.json({
      id: order.id,
      status: order.status,
      isPaid: order.status === 'paid',
    });
  } catch (err: any) {
    console.error('[api/checkout/status] Erro interno:', err);
    return NextResponse.json({ error: 'Erro ao processar consulta.' }, { status: 500 });
  }
}

