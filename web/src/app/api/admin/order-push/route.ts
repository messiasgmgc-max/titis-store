import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/supabase-server';
import { createOrderServiceSupabase as createServiceSupabase } from '@/lib/server/order-center-db';
import { getOrderPushSettings, orderPushUrl, sendOrderPush } from '@/lib/server/order-push';

export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  try {
    const s = await getOrderPushSettings();
    const db = createServiceSupabase();
    const { data: recent, error } = await db.from('order_push_reminders')
      .select('order_id, viewed_at, last_sent_at, sent_count, last_error').order('created_at', { ascending: false }).limit(10);
    if (error) throw error;
    return reply({ enabled: s.enabled, configured: !!(s.app_token && s.user_key), device: s.device,
      recipientIsMe: s.recipient_user_id === admin.user.id, hasRecipient: !!s.recipient_user_id, recent });
  } catch { return reply({ error: 'Avisos indisponíveis. Execute supabase/order_push_reminders.sql no banco.' }, 503); }
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  try {
    const body = await req.json();
    const s = await getOrderPushSettings();
    if (body.action === 'test') {
      const result = await sendOrderPush(s, 'Teste dos avisos da Titi’s Store. Nenhum pedido foi alterado.', orderPushUrl('').replace('?pedido=', ''));
      return reply(result, result.success ? 200 : 502);
    }
    if (typeof body.enabled !== 'boolean') return reply({ error: 'Configuração inválida.' }, 400);
    const appToken = typeof body.appToken === 'string' && body.appToken.trim() ? body.appToken.trim() : s.app_token;
    const userKey = typeof body.userKey === 'string' && body.userKey.trim() ? body.userKey.trim() : s.user_key;
    const device = typeof body.device === 'string' ? body.device.trim() : s.device;
    if ((appToken && !/^[a-zA-Z0-9]{30}$/.test(appToken)) || (userKey && !/^[a-zA-Z0-9]{30}$/.test(userKey)) || !/^[a-zA-Z0-9_-]{0,25}$/.test(device)) {
      return reply({ error: 'Confira as chaves de 30 caracteres e o nome do dispositivo.' }, 400);
    }
    // Vinculação explícita à conta do destinatário; não transfere confirmações para outro administrador.
    if (s.recipient_user_id && s.recipient_user_id !== admin.user.id) return reply({ error: 'Entre na conta do Titi para alterar seus avisos.' }, 403);
    if (body.enabled && (!appToken || !userKey)) return reply({ error: 'Preencha as duas chaves do Pushover.' }, 400);
    const { error } = await createServiceSupabase().from('order_push_settings').update({ enabled: body.enabled,
      app_token: appToken, user_key: userKey, device, recipient_user_id: admin.user.id, updated_at: new Date().toISOString(),
    }).eq('id', true);
    if (error) throw error;
    return reply({ success: true });
  } catch { return reply({ error: 'Não foi possível salvar os avisos. Confira a migração do banco.' }, 503); }
}
