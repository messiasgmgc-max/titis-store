// ============================================================
// SERVIÇO DE NOTIFICAÇÕES WHATSAPP (EVOLUTION API)
// Titi's Store (E-commerce) & Consultoria de Imagem
// ============================================================

import { getNotificationsSettingsFresh } from './settings';

export type NotificationType =
  | 'PIX_GENERATED'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_DISPATCHED'
  | 'ORDER_CANCELLED'
  | 'CONSULTING_ACCESS_GRANTED';

export interface OrderNotificationPayload {
  phone: string;
  customerName: string;
  orderId: string;
  amountCents: number;
  type: NotificationType;
  pixCode?: string;
  trackingCode?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  planName?: string;
}

export class NotificationService {
  /** Obtém a configuração da Evolution API priorizando public.settings no Supabase e caindo para process.env */
  private static async getConfig(): Promise<{ apiUrl: string; apiKey: string; instance: string }> {
    const notif = await getNotificationsSettingsFresh().catch(() => null);
    const apiUrl = (notif?.evolution_api_url || process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
    const apiKey = (notif?.evolution_api_key || process.env.EVOLUTION_API_KEY || '').trim();
    const instance = (notif?.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || 'titis-store').trim();
    return { apiUrl, apiKey, instance };
  }

  /** Formata o número brasileiro para o padrão internacional DDI+DDD+Número */
  private static formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return '';
    return clean.startsWith('55') ? clean : `55${clean}`;
  }

  /** Dispara mensagem de WhatsApp formatada via Evolution API */
  static async sendOrderNotification(payload: OrderNotificationPayload): Promise<boolean> {
    const { apiUrl, apiKey, instance } = await this.getConfig();

    if (!apiUrl || !apiKey) {
      console.log('[NotificationService] Evolution API não configurada; mensagem em log:', {
        to: payload.phone,
        type: payload.type,
        orderId: payload.orderId,
      });
      return false;
    }

    const formattedPhone = this.formatPhone(payload.phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      console.warn('[NotificationService] Telefone inválido para envio:', payload.phone);
      return false;
    }

    const amountBrl = (payload.amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    let messageText = '';

    switch (payload.type) {
      case 'PIX_GENERATED':
        messageText =
          `👑 *Titi's Store — Pedido #${payload.orderId}*\n\n` +
          `Olá, *${payload.customerName}*!\n` +
          `Seu pedido foi registrado em nossa alfaiataria no valor de *${amountBrl}*.\n\n` +
          `Copie a chave Pix abaixo e pague pelo app do seu banco:\n\n` +
          `\`\`\`${payload.pixCode || ''}\`\`\`\n\n` +
          `Assim que o pagamento for concluído, você receberá a confirmação imediatamente aqui pelo WhatsApp!`;
        break;

      case 'PAYMENT_CONFIRMED':
        messageText =
          `👑 *Titi's Store — Pagamento Confirmado!*\n\n` +
          `Olá, *${payload.customerName}*!\n` +
          `Recebemos a confirmação do seu pedido *#${payload.orderId}* no valor de *${amountBrl}*.\n\n` +
          `Nossa equipe de alfaiataria já iniciou a preparação cuidadosa das suas peças. Assim que o pacote for despachado, enviaremos seu código de rastreamento!`;
        break;

      case 'ORDER_DISPATCHED':
        const carrier = payload.trackingCarrier || 'Correios';
        const tracking = payload.trackingCode || 'Disponível em breve';
        const link =
          payload.trackingUrl ||
          `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(tracking)}`;

        messageText =
          `📦 *Titi's Store — Pedido Despachado!*\n\n` +
          `Olá, *${payload.customerName}*!\n` +
          `Suas peças do pedido *#${payload.orderId}* já estão a caminho via *${carrier}*!\n\n` +
          `🔍 *Código de rastreio:* \`${tracking}\`\n` +
          `🔗 *Acompanhar entrega:* ${link}\n\n` +
          `Qualquer dúvida sobre a entrega, estamos à disposição aqui neste canal!`;
        break;

      case 'ORDER_CANCELLED':
        messageText =
          `👑 *Titi's Store — Atualização de Pedido*\n\n` +
          `Olá, *${payload.customerName}*.\n` +
          `Informamos que o pedido *#${payload.orderId}* foi cancelado. Se você efetuou o pagamento ou precisa de suporte, responda a esta mensagem.`;
        break;

      case 'CONSULTING_ACCESS_GRANTED':
        const consultorUrl = process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br';
        messageText =
          `👑 *Consultoria Titi's Store — Acesso VIP Liberado!*\n\n` +
          `Olá, *${payload.customerName}*!\n` +
          `Seu plano *${payload.planName || 'VIP'}* foi ativado com sucesso!\n\n` +
          `Você já pode acessar seu Atelier Digital, fazer seu diagnóstico cromático e compor seus looks com inteligência artificial:\n` +
          `🔗 ${consultorUrl}/consultoria\n\n` +
          `Seja bem-vindo ao mais alto padrão de imagem e estilo masculino!`;
        break;

      default:
        messageText = `👑 *Titi's Store*\n\nOlá, *${payload.customerName}*! Seu pedido *#${payload.orderId}* foi atualizado.`;
    }

    try {
      const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: messageText,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        console.warn(`[NotificationService] Falha Evolution API (${response.status}) para ${formattedPhone}:`, errBody);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[NotificationService] Erro na requisição para Evolution API:', err);
      return false;
    }
  }
}
