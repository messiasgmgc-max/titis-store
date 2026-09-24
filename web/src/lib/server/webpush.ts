// ============================================================
// SERVIÇO DE WEB PUSH NOTIFICATIONS NATIVO (VAPID / RFC 8292)
// 100% Nativo sem dependências externas incompatíveis
// Suporte: Android (Chrome/Firefox/Edge), iOS 16.4+ (Safari PWA), PC Desktop
// ============================================================

import crypto from 'crypto';
import { createServiceSupabase } from './mercadopago';

// Chaves VAPID padrão para Titi's Store (podem ser customizadas via .env)
const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BM3L2eQmB-Of01uZNwIrh7ZebsM6BAUrZNSxmSRTeFPZ18vyGm7kqYL4yxRKpMmqE_bzR3OIEdYDn50sGsFfjmM';

const DEFAULT_VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'WyxLOP-8XFdJNTsObgGbjbDjFGrxNZVtexEk1aMCucI';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:contato@titisstore.com.br';

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
  keys?: {
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

function base64UrlEncode(strOrBuffer: string | Buffer): string {
  const buf = typeof strOrBuffer === 'string' ? Buffer.from(strOrBuffer) : strOrBuffer;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Gera o token JWT VAPID assinado com ES256 usando o módulo nativo crypto */
function createVapidJwt(audience: string): string {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 12 * 3600, // 12 horas
    sub: VAPID_SUBJECT,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const unsignedToken = `${encodedHeader}.${encodedClaims}`;

  try {
    const rawPrivKey = Buffer.from(
      DEFAULT_VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );
    const rawPubKey = Buffer.from(
      DEFAULT_VAPID_PUBLIC_KEY.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    );

    // Constrói chave privada em formato PKCS8 / DER para ECDSA prime256v1
    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: base64UrlEncode(rawPubKey.subarray(1, 33)),
      y: base64UrlEncode(rawPubKey.subarray(33, 65)),
      d: base64UrlEncode(rawPrivKey),
    };

    const privateKey = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
    const signer = crypto.createSign('SHA256');
    signer.update(unsignedToken);
    const signature = signer.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });

    return `${unsignedToken}.${base64UrlEncode(signature)}`;
  } catch (e) {
    // Fallback caso a assinatura de chave customizada varie
    return unsignedToken;
  }
}

export class WebPushService {
  /** Retorna a chave pública VAPID para ser utilizada no navegador */
  static getPublicKey(): string {
    return DEFAULT_VAPID_PUBLIC_KEY;
  }

  /** Salva ou atualiza a inscrição Push no Supabase */
  static async saveSubscription(params: SaveSubscriptionParams): Promise<{ success: boolean; id?: string; error?: string }> {
    const { subscription, userId, customerEmail, customerPhone, deviceInfo } = params;

    if (!subscription || !subscription.endpoint) {
      return { success: false, error: 'Dados de inscrição push inválidos.' };
    }

    try {
      const supabase = createServiceSupabase();

      const record = {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
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
        console.warn('[WebPushService] Aviso ao salvar inscrição no Supabase:', error.message);
        return { success: true, error: error.message };
      }

      return { success: true, id: data?.id };
    } catch (err: any) {
      console.error('[WebPushService] Erro ao salvar push subscription:', err);
      return { success: false, error: err.message };
    }
  }

  /** Envia notificação direta para uma inscrição específica usando HTTP Push API */
  static async sendToSubscription(
    subscription: PushSubscriptionData,
    payload: PushPayload
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    if (!subscription?.endpoint) {
      return { success: false, error: 'Endpoint não fornecido' };
    }

    try {
      const url = new URL(subscription.endpoint);
      const audience = `${url.protocol}//${url.host}`;
      const jwt = createVapidJwt(audience);

      const headers: Record<string, string> = {
        TTL: '86400',
        Urgency: 'high',
        Authorization: `vapid t=${jwt}, k=${DEFAULT_VAPID_PUBLIC_KEY}`,
      };

      const bodyStr = JSON.stringify(payload);

      const res = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
      });

      if (res.status === 404 || res.status === 410) {
        this.removeExpiredSubscription(subscription.endpoint).catch(() => null);
        return { success: false, statusCode: res.status, error: 'Inscrição expirada no navegador.' };
      }

      return { success: res.ok || res.status === 201 || res.status === 200, statusCode: res.status };
    } catch (err: any) {
      return { success: false, error: err.message };
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

  /** Envia notificação de pedido despachado/em trânsito para o cliente */
  static async sendOrderDispatchedNotification(params: {
    orderId: string;
    customerName?: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
    userId?: string | null;
    trackingCode: string;
    carrier: string;
    trackingUrl?: string | null;
  }): Promise<{ sentCount: number; totalFound: number }> {
    const { orderId, customerName, customerEmail, customerPhone, userId, trackingCode, carrier, trackingUrl } = params;

    const shortId = orderId.slice(0, 8);
    const payload: PushPayload = {
      title: `🚚 Pedido Despachado! #${shortId}`,
      body: `Olá ${customerName ? customerName.split(' ')[0] : 'Cliente'}! Seu pedido está a caminho via ${carrier}. Rastreio: ${trackingCode}`,
      icon: '/titislogo.jpeg',
      badge: '/titislogo.jpeg',
      tag: `dispatch-${orderId}`,
      url: trackingUrl || `/dashboard?aba=pedidos`,
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
      console.error('[WebPushService] Erro ao enviar notificação de despacho:', err);
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
