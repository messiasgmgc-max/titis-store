// ============================================================
// /api/admin/orders/reconcile
// Rota de reconciliação de pagamentos com o Mercado Pago.
// Pode ser acionada via Vercel Cron (Bearer CRON_SECRET) ou
// pelo painel administrativo (usuário com role 'admin').
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
export const maxDuration = 60;

/**
 * Autentica se a chamada vem do Vercel Cron (Authorization: Bearer <CRON_SECRET>)
 * ou de um administrador autenticado via requireAdmin.
 */
async function authorize(req: NextRequest): Promise<{ authorized: boolean; reason?: string }> {
  const authHeader = req.headers.get('authorization') || '';
  const cronSecret = (process.env.CRON_SECRET || '').trim();

  if (cronSecret && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token === cronSecret) {
      return { authorized: true, reason: 'cron' };
    }
  }

  // Verifica se a requisição tem token Bearer de um usuário admin do Supabase
  try {
    const { requireAdmin } = await import('@/lib/server/supabase-server');
    const adminOrResponse = await requireAdmin(req);
    if ('user' in adminOrResponse) {
      return { authorized: true, reason: 'admin' };
    }
  } catch {
    // sessão inválida ou sem header
  }

  // Se não foi autenticado por Bearer, mas está sendo chamado internamente pelo app (cookies de sessão)
  return { authorized: false, reason: 'forbidden' };
}

export async function POST(req: NextRequest) {
  const auth = await authorize(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }

  if (!(await isMercadoPagoConfigured())) {
    return NextResponse.json({ error: 'Mercado Pago não configurado.' }, { status: 503 });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { searchParams } = new URL(req.url);
    const orderId = body.orderId || searchParams.get('orderId');
    const paymentId = body.paymentId || searchParams.get('paymentId');

    const service = createServiceSupabase();
    const source = auth.reason === 'cron' ? 'cron_reconciliation' : 'admin_manual';

    // ------------------------------------------------------------
    // 1. Reconciliação de um pedido específico
    // ------------------------------------------------------------
    if (orderId) {
      const { data: order, error } = await service
        .from('orders')
        .select('*')
        .eq('id', String(orderId).trim())
        .maybeSingle();

      if (error || !order) {
        return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
      }

      const lookupId = paymentId || order.payment_provider_id;
      if (!lookupId) {
        return NextResponse.json(
          { error: 'Pedido sem payment_provider_id associado para consulta no Mercado Pago.' },
          { status: 400 }
        );
      }

      const mpPayment = await getPayment(String(lookupId));
      const outcome = await applyPaymentResult(service, {
        order,
        mpPayment,
        source,
      });

      return NextResponse.json({
        success: true,
        orderId: order.id,
        outcome,
      });
    }

    // ------------------------------------------------------------
    // 2. Reconciliação em lote (Cron ou Varredura Admin de pedidos pendentes)
    // ------------------------------------------------------------
    // Busca pedidos das últimas 48 horas que estão 'novo' ou 'pending' e possuem payment_provider_id
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: pendingOrders, error: listError } = await service
      .from('orders')
      .select('*')
      .in('status', ['novo', 'pending'])
      .not('payment_provider_id', 'is', null)
      .gte('created_at', twoDaysAgo)
      .order('created_at', { ascending: false })
      .limit(30);

    if (listError) {
      throw new Error(`Erro ao listar pedidos pendentes: ${listError.message}`);
    }

    const results: any[] = [];

    for (const order of pendingOrders || []) {
      if (!order.payment_provider_id) continue;
      try {
        const mpPayment = await getPayment(order.payment_provider_id);
        const outcome = await applyPaymentResult(service, {
          order,
          mpPayment,
          source,
        });
        results.push({ orderId: order.id, action: outcome.action, status: outcome.status });
      } catch (err: any) {
        results.push({ orderId: order.id, error: err?.message || 'Falha ao consultar MP' });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      details: results,
    });
  } catch (err: any) {
    console.error('[reconcile] Erro na reconciliação:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Permite acionar por GET caso o scheduler do cron envie GET
  return POST(req);
}
