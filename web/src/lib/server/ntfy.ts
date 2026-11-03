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
    priceCents?: number | null;
    size?: string | null;
    color?: string | null;
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
 * Interface extensível para múltiplos canais de notificação
 * (ntfy, Web Push, WhatsApp Evolution, etc.)
 */
export interface NotificationChannelProvider {
  id: string;
  name: string;
  isEnabled(): Promise<boolean>;
  sendSale(payload: NtfySalePayload): Promise<{ success: boolean; error?: string }>;
}

/**
 * Envia uma notificação direta ao ntfy.sh com 1 retry simples e timeout de 6s
 */
export async function sendNtfyMessage(options: {
  title: string;
  message: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent';
  tags?: string[];
  clickUrl?: string;
  config?: NtfyConfig;
}): Promise<{ success: boolean; error?: string }> {
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

  let endpoint = activeConfig.serverUrl;
  try {
    endpoint = new URL(activeConfig.serverUrl).origin;
  } catch {
    endpoint = 'https://ntfy.sh';
  }

  const priorityMap: Record<string, number> = {
    min: 1,
    low: 2,
    default: 3,
    high: 4,
    urgent: 5,
  };

  const numPriority = options.priority ? (priorityMap[options.priority] ?? 3) : 3;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (activeConfig.token) {
    headers['Authorization'] = `Bearer ${activeConfig.token}`;
  }

  const payload: Record<string, unknown> = {
    topic: activeConfig.topic,
    title: options.title,
    message: options.message,
    priority: numPriority,
    tags: options.tags || [],
  };

  if (options.clickUrl) {
    payload.click = options.clickUrl;
  }

  // Executa envio com 1 retry simples em caso de falha de rede
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        if (attempt === 1) continue;
        return { success: false, error: `ntfy HTTP ${res.status}: ${errText.slice(0, 100)}` };
      }

      return { success: true };
    } catch (err: unknown) {
      if (attempt === 1) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[sendNtfyMessage] Falha final ao enviar ntfy:', msg);
      return { success: false, error: msg };
    }
  }

  return { success: false, error: 'Falha desconhecida no envio ntfy.' };
}

/**
 * Dispara notificação push de compra / venda da loja
 * Sem PII sensível (sem CPF, sem telefone completo, sem endereço de rua).
 * Apenas primeiro nome, itens, valores, cidade/UF e link para o admin.
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
      title = `💰 Pagamento Confirmado #${payload.orderId.slice(-6)}: ${amountBrl}`;
      tags = ['moneybag', 'tada', 'white_check_mark'];
      priority = 'urgent';
    } else if (isCancelled) {
      title = `❌ Pedido Cancelado #${payload.orderId.slice(-6)}`;
      tags = ['warning', 'x'];
      priority = 'default';
    } else {
      const isPix = payload.paymentMethod.toLowerCase() === 'pix';
      title = isPix
        ? `🛒 Novo Pedido #${payload.orderId.slice(-6)} (Aguardando Pix): ${amountBrl}`
        : `🛒 Novo Pedido #${payload.orderId.slice(-6)} (Cartão Pendente): ${amountBrl}`;
      tags = ['shopping_cart', 'hourglass_flowing_sand'];
      priority = 'high';
    }

    const firstName = payload.customerName?.trim().split(/\s+/)[0] || 'Cliente';
    const lines: string[] = [
      `Pedido: #${payload.orderId}`,
      `Total: ${amountBrl}`,
      `Cliente: ${firstName}`,
    ];

    if (payload.city && payload.state) {
      lines.push(`Destino: ${payload.city}/${payload.state}`);
    }

    if (payload.shippingService) {
      lines.push(`Envio: ${payload.shippingService}`);
    }

    if (payload.items && payload.items.length > 0) {
      lines.push('');
      lines.push('Itens do pedido:');
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
