// ============================================================
// POST /api/admin/orders/update-address
// Atualiza o endereço de entrega e dados do destinatário de um pedido
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/server/mercadopago';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId, shippingAddress, customer } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId obrigatório.' }, { status: 400 });
    }

    if (!shippingAddress) {
      return NextResponse.json({ error: 'shippingAddress obrigatório.' }, { status: 400 });
    }

    let cleanCep = String(shippingAddress.cep || '').replace(/\D/g, '');
    if (cleanCep.length === 7) {
      cleanCep = cleanCep.padStart(8, '0');
    }

    const normalizedAddress = {
      ...shippingAddress,
      cep: cleanCep,
    };

    const updateData: Record<string, any> = {
      shipping_address: normalizedAddress,
      updated_at: new Date().toISOString(),
    };

    if (customer?.name) updateData.customer_name = customer.name.trim();
    if (customer?.phone) updateData.customer_phone = customer.phone.trim();
    if (customer?.email) updateData.customer_email = customer.email.trim();
    if (customer?.cpf) updateData.customer_cpf = customer.cpf.trim();

    const service = createServiceSupabase();
    const { data, error } = await service
      .from('orders')
      .update(updateData)
      .eq('id', orderId.trim())
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[api/admin/orders/update-address] Erro no Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/admin/orders/update-address] Erro interno:', err);
    return NextResponse.json({ error: msg || 'Erro ao atualizar endereço do pedido.' }, { status: 500 });
  }
}
