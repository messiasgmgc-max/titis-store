// ============================================================
// INTEGRAÇÃO COM APLICATIVO / LOJA WOOCOMMERCE
// Sincronização segura de pedidos, clientes e status via REST API v3
// ============================================================
import { getWooCommerceSettingsFresh } from './settings';
import type { WooCommerceSetting } from '@/lib/settings';

export interface SyncOrderParams {
  orderId: string;
  totalCents: number;
  paymentMethod: string;
  status: 'paid' | 'pending';
  payer: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string | null;
    cpf?: string | null;
  };
  shippingAddress?: {
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;
  shippingService?: {
    name?: string;
    priceCents?: number;
  } | null;
  items: Array<{
    id?: string;
    name: string;
    priceCents?: number;
    quantity?: number;
    size?: string;
    color?: string;
    sku?: string;
  }>;
}

export interface WooCommerceSyncResult {
  success: boolean;
  skipped?: boolean;
  wcOrderId?: number;
  error?: string;
}

/**
 * Cria a autorização HTTP Basic para autenticação com a REST API do WooCommerce
 */
function getAuthHeader(consumerKey: string, consumerSecret: string): string {
  const credentials = `${consumerKey}:${consumerSecret}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Testa a conexão e as credenciais com a loja WooCommerce
 */
export async function testWooCommerceConnection(config?: Partial<WooCommerceSetting>): Promise<{
  success: boolean;
  message: string;
  storeName?: string;
}> {
  try {
    const activeConfig = config?.store_url
      ? { ...config }
      : await getWooCommerceSettingsFresh().catch(() => null);

    if (!activeConfig?.store_url || !activeConfig.consumer_key || !activeConfig.consumer_secret) {
      return {
        success: false,
        message: 'Preencha a URL da loja, Consumer Key e Consumer Secret para testar a conexão.',
      };
    }

    const cleanUrl = activeConfig.store_url.replace(/\/+$/, '');
    const auth = getAuthHeader(activeConfig.consumer_key, activeConfig.consumer_secret);

    // Faz uma requisição leve de teste para a API de produtos do WooCommerce
    const res = await fetch(`${cleanUrl}/wp-json/wc/v3/products?per_page=1`, {
      method: 'GET',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        'User-Agent': 'TitisStore/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: 'Erro de autenticação no WooCommerce. Confira se a Consumer Key e Secret têm permissão de leitura/escrita.',
      };
    }

    if (!res.ok) {
      return {
        success: false,
        message: `O WooCommerce respondeu com status HTTP ${res.status}. Confira a URL e se a REST API está ativa em WooCommerce > Configurações > Avançado > REST API.`,
      };
    }

    return {
      success: true,
      message: 'Conexão estabelecida com sucesso com a loja WooCommerce!',
    };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Não foi possível conectar ao WooCommerce: ${msg.slice(0, 150)}`,
    };
  }
}

/**
 * Sincroniza um pedido finalizado no Titi's Store para a loja/app WooCommerce
 * É totalmente idempotente e não-bloqueante: falhas são registradas sem derrubar o checkout.
 */
export async function syncOrderToWooCommerce(params: SyncOrderParams): Promise<WooCommerceSyncResult> {
  const config = await getWooCommerceSettingsFresh().catch(() => null);

  // Se a sincronização não estiver habilitada ou faltar chaves, apenas pula graciosamente
  if (!config?.enabled || !config.sync_orders || !config.store_url || !config.consumer_key || !config.consumer_secret) {
    return { success: true, skipped: true };
  }

  const cleanUrl = config.store_url.replace(/\/+$/, '');
  const auth = getAuthHeader(config.consumer_key, config.consumer_secret);

  try {
    const isPaid = params.status === 'paid';
    const shippingPrice = params.shippingService?.priceCents ? (params.shippingService.priceCents / 100).toFixed(2) : '0.00';

    // Monta o payload padronizado no esquema WooCommerce REST API v3
    const wcPayload = {
      payment_method: params.paymentMethod === 'pix' ? 'mercadopago_pix' : 'mercadopago_custom',
      payment_method_title: `Mercado Pago (${params.paymentMethod.toUpperCase()}) — Titi's Store`,
      set_paid: isPaid,
      status: isPaid ? 'processing' : 'pending',
      transaction_id: params.orderId,
      customer_note: `Pedido originado no e-commerce Titi's Store (ID: ${params.orderId})`,
      billing: {
        first_name: params.payer.firstName,
        last_name: params.payer.lastName || '',
        address_1: params.shippingAddress?.street ? `${params.shippingAddress.street}, ${params.shippingAddress.number || 'S/N'}` : 'Balcão/Atelier',
        address_2: params.shippingAddress?.complement || params.shippingAddress?.neighborhood || '',
        city: params.shippingAddress?.city || 'Betim',
        state: params.shippingAddress?.state || 'MG',
        postcode: params.shippingAddress?.cep?.replace(/\D/g, '') || '32600000',
        country: 'BR',
        email: params.payer.email,
        phone: params.payer.phone?.replace(/\D/g, '') || '',
      },
      shipping: {
        first_name: params.payer.firstName,
        last_name: params.payer.lastName || '',
        address_1: params.shippingAddress?.street ? `${params.shippingAddress.street}, ${params.shippingAddress.number || 'S/N'}` : 'Balcão/Atelier',
        address_2: params.shippingAddress?.complement || params.shippingAddress?.neighborhood || '',
        city: params.shippingAddress?.city || 'Betim',
        state: params.shippingAddress?.state || 'MG',
        postcode: params.shippingAddress?.cep?.replace(/\D/g, '') || '32600000',
        country: 'BR',
      },
      line_items: params.items.map((item) => {
        const qty = item.quantity || 1;
        const price = (item.priceCents || 0) / 100;
        return {
          name: `${item.name}${item.color ? ` - Cor: ${item.color}` : ''}${item.size ? ` - Tam: ${item.size}` : ''}`,
          quantity: qty,
          price: price.toFixed(2),
          total: (price * qty).toFixed(2),
          sku: item.sku || '',
          meta_data: [
            ...(item.size ? [{ key: 'Tamanho', value: item.size }] : []),
            ...(item.color ? [{ key: 'Cor', value: item.color }] : []),
          ],
        };
      }),
      shipping_lines: [
        {
          method_id: 'titis_shipping',
          method_title: params.shippingService?.name || 'Entrega Titi\'s Store',
          total: shippingPrice,
        },
      ],
      meta_data: [
        { key: '_titis_order_id', value: params.orderId },
        ...(params.payer.cpf ? [{ key: '_billing_cpf', value: params.payer.cpf }] : []),
      ],
    };

    const res = await fetch(`${cleanUrl}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
        'User-Agent': 'TitisStore/1.0',
      },
      body: JSON.stringify(wcPayload),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[WooCommerceSync] Falha ao enviar pedido ${params.orderId} (Status ${res.status}):`, errText.slice(0, 200));
      return {
        success: false,
        error: `WooCommerce HTTP ${res.status}: ${errText.slice(0, 100)}`,
      };
    }

    const created = await res.json();
    console.log(`[WooCommerceSync] Pedido ${params.orderId} sincronizado com sucesso no WooCommerce. ID WC: ${created.id}`);

    return {
      success: true,
      wcOrderId: created.id,
    };
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WooCommerceSync] Erro na sincronização do pedido ${params.orderId}:`, msg);
    return {
      success: false,
      error: msg,
    };
  }
}
