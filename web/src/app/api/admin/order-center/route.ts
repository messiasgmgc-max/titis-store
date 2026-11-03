import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/supabase-server';
import { createOrderServiceSupabase as createServiceSupabase } from '@/lib/server/order-center-db';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  let db;
  try { db = createServiceSupabase(); } catch { return NextResponse.json({ error: 'Configure a chave de serviço do Supabase no servidor.' }, { status: 503 }); }
  const id = new URL(req.url).searchParams.get('pedido');
  let query = db.from('orders').select('*');
  if (id) query = query.eq('id', id);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(id ? 1 : 500);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os pedidos.' }, { status: 503 });
  return NextResponse.json({ orders: data || [] }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const body = await req.json().catch(() => null);
  if (typeof body?.orderId !== 'string' || body.orderId.length > 200) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  let db;
  try { db = createServiceSupabase(); } catch { return NextResponse.json({ error: 'Configure a chave de serviço do Supabase no servidor.' }, { status: 503 }); }
  // O identificador veio da tela, mas a existência é sempre verificada no servidor.
  const { data: order, error: readError } = await db.from('orders').select('id').eq('id', body.orderId).maybeSingle();
  if (readError || !order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  const { data, error } = await db.from('order_push_reminders').update({ viewed_at: new Date().toISOString() })
    .eq('order_id', body.orderId).eq('recipient_user_id', admin.user.id).is('viewed_at', null).select('order_id');
  if (error) return NextResponse.json({ error: 'Pedido aberto, mas não foi possível interromper os lembretes. Tente novamente.' }, { status: 503 });
  return NextResponse.json({ success: true, acknowledged: !!data?.length });
}
