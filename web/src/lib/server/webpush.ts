// ============================================================
// SERVIÇO DE WEB PUSH NOTIFICATIONS (VAPID / RFC 8292)
// Notificações de Pedidos, Geração de Etiqueta e Rastreio
// Suporte: Android (Chrome/Firefox/Edge), iOS 16.4+ (PWA Safari), PC Desktop (Windows/Mac/Linux)
// ============================================================

import webpush from 'web-push';
import { createServiceSupabase } from './mercadopago';

// Chaves VAPID padrão estáveis (podem ser sobrescritas por variáveis de ambiente)
const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BM3L2eQmB-Of01uZNwIrh7ZebsM6BAUrZNSxmSRTeFPZ18vyGm7kqYL4yxRKpMmqE_bzR3OIEdYDn50sGsFfjmM';

const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'WyxLOP-8XFdJNTsObgGbjbDjFGrxNZVtexEk1aMCucI';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:contato@titisstore.com.br';

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    DEFAULT_VAPID_PUBLIC_KEY,
    DEFAULT_VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.warn('[WebPushService] Aviso ao inicializar VAPID details:', err);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  url?: string;
  orderId?: string;
  trackingCode?: string;
  actions?: Array<{ action: string; title: string }>;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SaveSubscriptionParams {
  subscription: PushSubscriptionData;
  userId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  deviceInfo?: {
    platform?: string;
    userAgent?: string;
    standalone?: boolean;
  };
}

export class WebPushService {
  /** Retorna a chave pública VAPID para ser utilizada no navegador */
  static getPublicKey(): string {
    return DEFAULT_VAPID_PUBLIC_KEY;
  }

  /** Salva ou atualiza a inscrição Push no Supabase */
  static async saveSubscription(params: SaveSubscriptionParams): Promise<{ success: boolean; id?: string; error?: string }> {
    const { subscription, userId, customerEmail, customerPhone, deviceInfo } = params;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return { success: false, error: 'Dados de inscrição push inválidos.' };
    }

    try {
      const supabase = createServiceSupabase();

      const record = {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_id: userId || null,
        customer_email: customerEmail?.trim().toLowerCase() || null,
        customer_phone: customerPhone?.replace(/\D/g, '') || null,
        device_info: deviceInfo || {},
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert(record, { onConflict: 'endpoint' })
        .select('id')
        .maybeSingle();

      if (error) {
        console.warn('[WebPushService] Aviso ao salvar inscrição no Supabase (tabela pode estar pendente):', error.message);
        return { success: true, error: error.message };
      }

      return { success: true, id: data?.id };
    } catch (err: any) {
      console.error('[WebPushService] Erro ao salvar push subscription:', err);
      return { success: false, error: err.message };
    }
  }

  /** Envia notificação direta para uma inscrição específica */
  static async sendToSubscription(
    subscription: PushSubscriptionData,
    payload: PushPayload
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      const res = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        JSON.stringify(payload)
      );

      return { success: true, statusCode: res.statusCode };
    } catch (err: any) {
      // Se a subscrição expirou ou foi cancelada no navegador (404/410)
      if (err.statusCode === 404 || err.statusCode === 410) {
        this.removeExpiredSubscription(subscription.endpoint).catch(() => null);
      }
      return { success: false, statusCode: err.statusCode, error: err.message };
    }
  }

  /** Remove inscrição expirada do banco */
  private static async removeExpiredSubscription(endpoint: string) {
    try {
      const supabase = createServiceSupabase();
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    } catch {
      // no-op
    }
  }

  /** Envia notificação de geração de etiqueta e despacho para o cliente do pedido */
  static async sendOrderLabelNotification(params: {
    orderId: string;
    customerName?: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    userId?: string | null;
    trackingCode: string;
    carrier: string;
    labelUrl?: string | null;
  }): Promise<{ sentCount: number; totalFound: number }> {
    const { orderId, customerName, customerEmail, customerPhone, userId, trackingCode, carrier } = params;

    const shortId = orderId.slice(0, 8);
    const trackingLink = `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(trackingCode)}`;

    const payload: PushPayload = {
      title: `📦 Etiqueta Gerada! Pedido #${shortId}`,
      body: `Olá ${customerName ? customerName.split(' ')[0] : 'Cliente'}! Suas peças já estão com etiqueta emitida via ${carrier}. Rastreio: ${trackingCode}`,
      icon: '/titislogo.jpeg',
      badge: '/titislogo.jpeg',
      tag: `order-${orderId}`,
      url: `/dashboard?aba=pedidos`,
      orderId,
      trackingCode,
      actions: [
        { action: 'track', title: '🔍 Rastrear Envio' },
        { action: 'open', title: '📦 Ver Pedido' },
      ],
    };

    try {
      const supabase = createServiceSupabase();
      let query = supabase.from('push_subscriptions').select('*');

      const conditions: string[] = [];
      if (userId) conditions.push(`user_id.eq.${userId}`);
      if (customerEmail) conditions.push(`customer_email.eq.${customerEmail.trim().toLowerCase()}`);
      if (customerPhone) {
        const clean = customerPhone.replace(/\D/g, '');
        if (clean) conditions.push(`customer_phone.eq.${clean}`);
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }

      const { data: subs, error } = await query;
      if (error || !subs || subs.length === 0) {
        console.log('[WebPushService] Nenhuma inscrição encontrada para o cliente do pedido, enviando para administradores/dispositivos ativos');
        // Caso não haja subscrição vinculada especificamente por e-mail, envia para todos os dispositivos instalados
        return await this.sendBroadcast(payload);
      }

      let sent = 0;
      for (const sub of subs) {
        const res = await this.sendToSubscription(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        if (res.success) sent++;
      }

      return { sentCount: sent, totalFound: subs.length };
    } catch (err) {
      console.error('[WebPushService] Erro ao enviar notificação de etiqueta:', err);
      return { sentCount: 0, totalFound: 0 };
    }
  }

  /** Envia notificação broadcast para todos os dispositivos cadastrados */
  static async sendBroadcast(payload: PushPayload): Promise<{ sentCount: number; totalFound: number }> {
    try {
      const supabase = createServiceSupabase();
      const { data: subs, error } = await supabase.from('push_subscriptions').select('*');

      if (error || !subs || subs.length === 0) {
        return { sentCount: 0, totalFound: 0 };
      }

      let sent = 0;
      for (const sub of subs) {
        const res = await this.sendToSubscription(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        if (res.success) sent++;
      }

      return { sentCount: sent, totalFound: subs.length };
    } catch (err) {
      console.error('[WebPushService] Erro no broadcast push:', err);
      return { sentCount: 0, totalFound: 0 };
    }
  }
}
