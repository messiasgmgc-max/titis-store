'use server';

// ============================================================
// SERVER ACTIONS DA CENTRAL DE PEDIDOS
// Executa diretamente no servidor Next.js sem depender de fetch HTTP
// para garantir 100% de disponibilidade contra 404 de rotas API
// ============================================================
import { createOrderServiceSupabase as createServiceSupabase } from '@/lib/server/order-center-db';
import { getOrderPushSettings, orderPushUrl, sendOrderPush } from '@/lib/server/order-push';
import { createServerSupabase } from '@/lib/server/supabase-server';

async function verifyAdminToken(token: string) {
  if (!token) throw new Error('Não autorizado. Faça login novamente.');
  const client = createServerSupabase(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    throw new Error('Sua sessão expirou. Entre novamente.');
  }
  const { data: profile } = await client.from('profiles').select('role').eq('id', data.user.id).single();
  if (profile?.role !== 'admin') {
    throw new Error('Acesso exclusivo da administração.');
  }
  return data.user;
}

export async function fetchOrderCenterAction(token: string, orderId?: string | null) {
  await verifyAdminToken(token);
  let db;
  try {
    db = createServiceSupabase();
  } catch (err: any) {
    return { error: 'Configure a chave de serviço do Supabase no servidor.' };
  }

  let query = db.from('orders').select('*');
  if (orderId) {
    query = query.eq('id', orderId);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(orderId ? 1 : 500);
  if (error) {
    return { error: 'Não foi possível carregar os pedidos.' };
  }

  return { orders: data || [] };
}

export async function acknowledgeOrderViewAction(token: string, orderId: string) {
  const user = await verifyAdminToken(token);
  if (!orderId || typeof orderId !== 'string') {
    return { error: 'Pedido inválido.' };
  }

  let db;
  try {
    db = createServiceSupabase();
  } catch {
    return { error: 'Configure a chave de serviço do Supabase no servidor.' };
  }

  const { data: order, error: readError } = await db.from('orders').select('id').eq('id', orderId).maybeSingle();
  if (readError || !order) {
    return { error: 'Pedido não encontrado.' };
  }

  const { data, error } = await db
    .from('order_push_reminders')
    .update({ viewed_at: new Date().toISOString() })
    .eq('order_id', orderId)
    .eq('recipient_user_id', user.id)
    .is('viewed_at', null)
    .select('order_id');

  if (error) {
    return { error: 'Pedido aberto, mas não foi possível interromper os lembretes.' };
  }

  return { success: true, acknowledged: !!data?.length };
}

export async function getOrderPushStateAction(token: string) {
  const user = await verifyAdminToken(token);
  try {
    const s = await getOrderPushSettings();
    const db = createServiceSupabase();
    const { data: recent, error } = await db
      .from('order_push_reminders')
      .select('order_id, viewed_at, last_sent_at, sent_count, last_error')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return {
      enabled: s.enabled,
      configured: !!(s.app_token && s.user_key),
      device: s.device,
      recipientIsMe: s.recipient_user_id === user.id,
      hasRecipient: !!s.recipient_user_id,
      recent: recent || [],
    };
  } catch (err: any) {
    return { error: 'Avisos indisponíveis. Execute supabase/order_push_reminders.sql no banco.' };
  }
}

export async function saveOrderPushSettingsAction(
  token: string,
  params: { action?: string; enabled?: boolean; appToken?: string; userKey?: string; device?: string }
) {
  const user = await verifyAdminToken(token);
  try {
    const s = await getOrderPushSettings();

    if (params.action === 'test') {
      const result = await sendOrderPush(
        s,
        'Teste dos avisos da Titi’s Store. Nenhum pedido foi alterado.',
        orderPushUrl('').replace('?pedido=', '')
      );
      return result;
    }

    if (typeof params.enabled !== 'boolean') {
      return { error: 'Configuração inválida.' };
    }

    const appToken = typeof params.appToken === 'string' && params.appToken.trim() ? params.appToken.trim() : s.app_token;
    const userKey = typeof params.userKey === 'string' && params.userKey.trim() ? params.userKey.trim() : s.user_key;
    const device = typeof params.device === 'string' ? params.device.trim() : s.device;

    if (
      (appToken && !/^[a-zA-Z0-9]{30}$/.test(appToken)) ||
      (userKey && !/^[a-zA-Z0-9]{30}$/.test(userKey)) ||
      !/^[a-zA-Z0-9_-]{0,25}$/.test(device)
    ) {
      return { error: 'Confira as chaves de 30 caracteres e o nome do dispositivo.' };
    }

    if (s.recipient_user_id && s.recipient_user_id !== user.id) {
      return { error: 'Entre na conta do Titi para alterar seus avisos.' };
    }

    if (params.enabled && (!appToken || !userKey)) {
      return { error: 'Preencha as duas chaves do Pushover.' };
    }

    const { error } = await createServiceSupabase()
      .from('order_push_settings')
      .update({
        enabled: params.enabled,
        app_token: appToken,
        user_key: userKey,
        device,
        recipient_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true);

    if (error) throw error;
    return { success: true };
  } catch {
    return { error: 'Não foi possível salvar os avisos. Confira a migração do banco.' };
  }
}
