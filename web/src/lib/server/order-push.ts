import 'server-only';
import { createOrderServiceSupabase as createServiceSupabase } from './order-center-db';

export interface PushSettings {
  enabled: boolean;
  recipient_user_id: string | null;
  user_key: string;
  app_token: string;
  device: string;
}

export async function getOrderPushSettings(): Promise<PushSettings> {
  const { data, error } = await createServiceSupabase().from('order_push_settings').select('*').eq('id', true).single();
  if (error) throw new Error('Configuração de avisos indisponível. Verifique a migração do banco.');
  return data as PushSettings;
}

export function orderPushUrl(orderId: string): string {
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.titisstore.com.br');
  if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') throw new Error('Configure uma URL HTTPS para a loja.');
  return new URL(`/pedidos?pedido=${encodeURIComponent(orderId)}`, origin.origin).href;
}

export async function sendOrderPush(settings: PushSettings, message: string, url: string) {
  if (!settings.app_token || !settings.user_key) return { success: false, error: 'Credenciais do Pushover ausentes.' };
  try {
    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: settings.app_token, user: settings.user_key, device: settings.device || undefined,
        title: 'Titi’s Store · Pedidos', message, url, url_title: 'Abrir pedido', priority: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    const result = await res.json().catch(() => null);
    // Não devolve corpo da resposta ou credenciais para logs / navegador.
    return res.ok && result?.status === 1
      ? { success: true }
      : { success: false, error: `Pushover recusou o envio (HTTP ${res.status}). Verifique as credenciais e a cota.` };
  } catch {
    return { success: false, error: 'Sem confirmação do Pushover. Nova tentativa em cinco minutos.' };
  }
}

export async function processOrderPush() {
  const db = createServiceSupabase();
  const settings = await getOrderPushSettings();
  if (!settings.enabled) return { sent: 0, failed: 0, enabled: false };
  if (!settings.app_token || !settings.user_key) throw new Error('Configure as credenciais do Pushover.');
  const { data: jobs, error } = await db.rpc('claim_order_push', { p_limit: 5 });
  if (error) throw new Error('Não foi possível reservar os avisos pendentes.');
  let sent = 0, failed = 0;
  for (const job of jobs || []) {
    // Releitura imediatamente antes do envio: abrir/cancelar durante a reserva interrompe o aviso.
    const [{ data: current, error: readError }, { data: order, error: orderError }] = await Promise.all([
      db.from('order_push_reminders').select('viewed_at').eq('order_id', job.order_id).single(),
      db.from('orders').select('id, status, dispatched_at').eq('id', job.order_id).single(),
    ]);
    if (readError || orderError) throw new Error('Falha ao verificar o pedido antes do envio.');
    if (current.viewed_at || !order || ['cancelado', 'concluido'].includes(order.status) || order.dispatched_at) continue;
    const result = await sendOrderPush(settings,
      `${job.sent_count ? 'Lembrete: pedido ainda não visualizado' : 'Novo pedido recebido'} · #${order.id}. Abra os detalhes para verificar o pagamento e a entrega.`,
      orderPushUrl(order.id));
    const now = Date.now();
    const { error: saveError } = await db.from('order_push_reminders').update({
      next_send_at: new Date(now + (result.success ? 3600000 : 300000)).toISOString(),
      ...(result.success ? { last_sent_at: new Date(now).toISOString(), sent_count: job.sent_count + 1 } : {}),
      last_error: result.success ? null : result.error, lease_id: null, locked_until: null,
    }).eq('order_id', job.order_id).eq('lease_id', job.lease_id);
    if (saveError) throw new Error('Envio processado, mas houve falha ao registrar o resultado.');
    if (result.success) sent++; else failed++;
  }
  return { sent, failed, enabled: true };
}
