// ============================================================
// SERVIÇO DESACOPLADO DE NOTIFICAÇÃO PÓS-VENDA (EVOLUTION API / WHATSAPP)
// ============================================================

export interface OrderNotificationPayload {
  phone: string;
  customerName: string;
  orderId: string;
  amountCents: number;
  type: 'PAYMENT_CONFIRMED' | 'PIX_GENERATED' | 'DISPATCHED';
  pixCode?: string;
}

export class NotificationService {
  private static apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/+$/, '');
  private static apiKey = process.env.EVOLUTION_API_KEY;
  private static instance = process.env.EVOLUTION_INSTANCE_NAME || 'titis-store';

  /** Dispara mensagem no WhatsApp do cliente via Evolution API */
  static async sendOrderNotification(payload: OrderNotificationPayload): Promise<boolean> {
    if (!this.apiUrl || !this.apiKey) {
      console.log('[NotificationService] Evolution API não configurada; notificação em log:', {
        to: payload.phone,
        type: payload.type,
        orderId: payload.orderId,
      });
      return false;
    }

    const cleanPhone = payload.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const amountBrl = (payload.amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    let messageText = '';

    switch (payload.type) {
      case 'PAYMENT_CONFIRMED':
        messageText = `👑 *Titi's Store — Pagamento Confirmado!*\n\nOlá, *${payload.customerName}*!\nRecebemos a confirmação do pagamento do seu pedido *#${payload.orderId}* no valor de *${amountBrl}*.\n\nNossa equipe de alfaiataria já está preparando suas peças com o mais alto padrão de acabamento. Em breve você receberá o código de rastreio!`;
        break;

      case 'PIX_GENERATED':
        messageText = `👑 *Titi's Store — Pedido #${payload.orderId}*\n\nOlá, *${payload.customerName}*!\nSeu pedido foi gerado com sucesso no valor de *${amountBrl}*.\n\nCaso precise da chave Pix Copia e Cola:\n\`\`\`${payload.pixCode || ''}\`\`\``;
        break;

      case 'DISPATCHED':
        messageText = `👑 *Titi's Store — Pedido Enviado!*\n\nOlá, *${payload.customerName}*!\nSeu pedido *#${payload.orderId}* acabou de ser despachado. Prepare-se para elevar sua presença!`;
        break;
    }

    try {
      const response = await fetch(`${this.apiUrl}/message/sendText/${this.instance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: messageText,
        }),
      });

      if (!response.ok) {
        console.warn(`[NotificationService] Falha no disparo (${response.status}) para ${formattedPhone}`);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[NotificationService] Erro na requisição para Evolution API:', err);
      return false;
    }
  }
}
