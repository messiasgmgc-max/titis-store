// ============================================================
// SERVIÇO DE NOTIFICAÇÕES PUSH INSTANTÂNEAS (NTFY.SH)
// Disparo em tempo real para compras, vendas, Pix e assinaturas
// Funciona no celular (App ntfy para iOS e Android) e navegador
// ============================================================
import { getNotificationsSettingsFresh } from './settings';

export interface NtfySalePayload {
  orderId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  amountCents: number;
  totalCents?: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'cancelled';
  items?: Array<{
    name: string;
    quantity?: number;
    priceCents?: number;
    size?: string;
    color?: string;
  }>;
  shippingService?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface NtfyPlanPayload {
  orderId?: string;
  planId: string;
  planName: string;
  amountCents: number;
  customerName?: string | null;
  customerEmail?: string | null;
}

export interface NtfyConfig {
  enabled?: boolean;
  serverUrl?: string;
  topic?: string;
  token?: string;
}

/**
 * Obtém a configuração do ntfy priorizando o Supabase (public.settings)
 */
async function getNtfyConfig(): Promise<{
  enabled: boolean;
  serverUrl: string;
  topic: string;
  token: string;
}> {
  try {
    const notif = await getNotificationsSettingsFresh().catch(() => null);
    const serverUrl = (notif?.ntfy_server_url || process.env.NTFY_SERVER_URL || 'https://ntfy.sh').replace(/\/+$/, '');
    const topic = (notif?.ntfy_topic || process.env.NTFY_TOPIC || 'titis-store-vendas').trim();
    const token = (notif?.ntfy_token || process.env.NTFY_TOKEN || '').trim();
    const enabled = notif ? notif.ntfy_enabled !== false : process.env.NTFY_ENABLED !== 'false';

    return { enabled, serverUrl, topic, token };
  } catch {
    return {
      enabled: true,
      serverUrl: 'https://ntfy.sh',
      topic: 'titis-store-vendas',
      token: '',
    };
  }
}

/**
 * Envia uma notificação direta ao ntfy.sh
 */
export async function sendNtfyMessage(options: {
  title: string;
  message: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
  tags?: string[];
  clickUrl?: string;
  config?: NtfyConfig;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const activeConfig = options.config
      ? {
          enabled: options.config.enabled ?? true,
          serverUrl: (options.config.serverUrl || 'https://ntfy.sh').replace(/\/+$/, ''),
          topic: (options.config.topic || 'titis-store-vendas').trim(),
          token: (options.config.token || '').trim(),
        }
      : await getNtfyConfig();

    if (!activeConfig.enabled) {
      return { success: true };
    }

    if (!activeConfig.topic) {
      return { success: false, error: 'Tópico do ntfy não configurado.' };
    }

    const endpoint = `${activeConfig.serverUrl}/${encodeURIComponent(activeConfig.topic)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      Title: options.title,
      Priority: options.priority || 'default',
    };

    if (options.tags && options.tags.length > 0) {
      headers['Tags'] = options.tags.join(',');
    }

    if (options.clickUrl) {
      headers['Click'] = options.clickUrl;
    }

    if (activeConfig.token) {
      headers['Authorization'] = `Bearer ${activeConfig.token}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      body: options.message,
      headers,
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { success: false, error: `ntfy HTTP ${res.status}: ${errText.slice(0, 100)}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Dispara notificação push de compra / venda da loja
 */
export async function sendNtfySaleNotification(payload: NtfySalePayload): Promise<void> {
  try {
    const amountBrl = (payload.amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const isPaid = payload.status === 'paid';
    const isCancelled = payload.status === 'cancelled';

    let title = '';
    let tags: string[] = [];
    let priority: 'default' | 'high' | 'urgent' = 'high';

    if (isPaid) {
      title = `💰 VENDA APROVADA: ${amountBrl}`;
      tags = ['moneybag', 'tada', 'white_check_mark'];
      priority = 'urgent';
    } else if (isCancelled) {
      title = `❌ Pedido Cancelado #${payload.orderId.slice(-6)}`;
      tags = ['warning', 'x'];
      priority = 'default';
    } else {
      const method = payload.paymentMethod.toLowerCase() === 'pix' ? 'Pix Gerado' : 'Cartão Pendente';
      title = `🛒 Novo Pedido (${method}): ${amountBrl}`;
      tags = ['shopping_cart', 'hourglass_flowing_sand'];
      priority = 'high';
    }

    const lines: string[] = [
      `Pedido: #${payload.orderId}`,
      `Valor: ${amountBrl}`,
      `Cliente: ${payload.customerName}`,
    ];

    if (payload.customerPhone) {
      lines.push(`WhatsApp: ${payload.customerPhone}`);
    }
    if (payload.customerEmail) {
      lines.push(`E-mail: ${payload.customerEmail}`);
    }

    if (payload.city && payload.state) {
      lines.push(`Destino: ${payload.city}/${payload.state}`);
    }

    if (payload.items && payload.items.length > 0) {
      lines.push('');
      lines.push('Itens comprados:');
      for (const item of payload.items) {
        const qty = item.quantity || 1;
        const sizeInfo = item.size ? ` (Tam: ${item.size})` : '';
        const colorInfo = item.color ? ` [${item.color}]` : '';
        lines.push(`• ${qty}x ${item.name}${sizeInfo}${colorInfo}`);
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.titisstore.com.br';
    const clickUrl = `${baseUrl.replace(/\/+$/, '')}/admin`;

    await sendNtfyMessage({
      title,
      message: lines.join('\n'),
      priority,
      tags,
      clickUrl,
    });
  } catch (err) {
    console.error('[NtfyService] Erro ao disparar notificação de venda:', err);
  }
}

/**
 * Dispara notificação push quando um plano de consultoria é assinado
 */
export async function sendNtfyPlanNotification(payload: NtfyPlanPayload): Promise<void> {
  try {
    const amountBrl = (payload.amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const title = `👔 NOVA ASSINATURA: ${payload.planName}`;
    const tags = ['gem', 'sparkles', 'briefcase'];

    const lines = [
      `Plano: ${payload.planName}`,
      `Valor: ${amountBrl}`,
    ];

    if (payload.customerName) lines.push(`Cliente: ${payload.customerName}`);
    if (payload.customerEmail) lines.push(`E-mail: ${payload.customerEmail}`);
    if (payload.orderId) lines.push(`ID: #${payload.orderId}`);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.titisstore.com.br';

    await sendNtfyMessage({
      title,
      message: lines.join('\n'),
      priority: 'urgent',
      tags,
      clickUrl: `${baseUrl.replace(/\/+$/, '')}/admin`,
    });
  } catch (err) {
    console.error('[NtfyService] Erro ao disparar notificação de plano:', err);
  }
}

/**
 * Testa a conexão enviando uma notificação de teste para o tópico informado
 */
export async function testNtfyConnection(config: {
  serverUrl?: string;
  topic?: string;
  token?: string;
}): Promise<{ success: boolean; message: string }> {
  const topic = (config.topic || 'titis-store-vendas').trim();
  if (!topic) {
    return { success: false, message: 'Informe o nome do tópico para testar.' };
  }

  const result = await sendNtfyMessage({
    title: '👑 Titi\'s Store — Teste de Notificação',
    message: `Parabéns! Sua loja está configurada para enviar alertas instantâneos de compras e vendas para este aparelho.\n\nTópico ativo: ${topic}\nData/Hora: ${new Date().toLocaleTimeString('pt-BR')}`,
    priority: 'high',
    tags: ['bell', 'tada', 'white_check_mark'],
    config: {
      enabled: true,
      serverUrl: config.serverUrl,
      topic,
      token: config.token,
    },
  });

  if (result.success) {
    return {
      success: true,
      message: `Notificação de teste enviada com sucesso para o tópico "${topic}"! Verifique seu app ntfy.`,
    };
  }

  return {
    success: false,
    message: `Falha ao enviar notificação: ${result.error || 'Erro desconhecido'}`,
  };
}
