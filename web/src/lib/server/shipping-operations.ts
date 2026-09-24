// ============================================================
// OPERAÇÕES DE FRETE, ETIQUETAS E DESPACHO DE PEDIDOS
// Utilizado tanto por rotas REST /api/admin/orders/* quanto por Server Actions
// ============================================================
import { createServiceSupabase } from '@/lib/server/mercadopago';
import { SuperFreteService } from '@/lib/server/superfrete';
import { MelhorEnvioService } from '@/lib/server/melhorenvio';
import { NotificationService } from '@/lib/server/notifications';
import { EmailService } from '@/lib/server/email';
import { WebPushService } from '@/lib/server/webpush';
import { getShippingSettingsFresh } from '@/lib/server/settings';

export interface GenerateLabelResponse {
  success: boolean;
  labelUrl?: string;
  trackingCode?: string;
  carrier?: string;
  message?: string;
  error?: string;
}

export interface DispatchOrderResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Emite a etiqueta oficial de frete (SuperFrete ou Melhor Envio)
 */
export async function generateShippingLabelForOrder(
  orderId: string,
  serviceId?: string
): Promise<GenerateLabelResponse> {
  try {
    if (!orderId) {
      return { success: false, error: 'ID do pedido é obrigatório.' };
    }

    const service = createServiceSupabase();

    // 1. Busca dados do pedido no Supabase
    const { data: order, error } = await service
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return { success: false, error: `Pedido #${orderId} não encontrado no banco de dados.` };
    }

    const addr = order.shipping_address as Record<string, any> | null;
    if (!addr || (!addr.street && !addr.logradouro) || !addr.cep) {
      return {
        success: false,
        error: 'O pedido não possui endereço de entrega completo (rua/CEP) para gerar a etiqueta.',
      };
    }

    // 2. Monta a lista de produtos
    const itemsList = Array.isArray(order.items) ? order.items : [];
    const products = itemsList.map((i: any) => ({
      name: i.name || 'Vestuário Masculino',
      quantity: Number(i.quantity) || 1,
      unitaryValue: i.priceCents ? i.priceCents / 100 : 150,
    }));

    // 3. Lê credenciais atualizadas de frete
    const shippingConfig = await getShippingSettingsFresh().catch(() => null);
    const provider = shippingConfig?.provider || (process.env.FRETE_PROVIDER || 'superfrete').toLowerCase();
    const hasSuperFrete = Boolean((shippingConfig?.superfrete_token || process.env.SUPERFRETE_TOKEN || '').trim());
    const hasMelhorEnvio = Boolean((shippingConfig?.melhorenvio_token || process.env.MELHORENVIO_TOKEN || '').trim());

    if (!hasSuperFrete && !hasMelhorEnvio) {
      return {
        success: false,
        error: 'Nenhuma chave de API de frete (SuperFrete ou Melhor Envio) configurada. Acesse a aba Configurações no painel e cadastre sua chave.',
      };
    }

    const labelInput = {
      orderId: order.id,
      serviceId: serviceId || order.shipping_service_id || '1',
      to: {
        name: order.customer_name || 'Cliente',
        phone: order.customer_phone || '31999999999',
        email: order.customer_email || 'pedidos@titisstore.com.br',
        document: order.customer_cpf || '00000000000',
        address: addr.street || addr.logradouro || 'Rua Principal',
        number: addr.number || addr.numero || 'SN',
        complement: addr.complement || addr.complemento || '',
        neighborhood: addr.neighborhood || addr.bairro || 'Centro',
        city: addr.city || addr.cidade || 'Belo Horizonte',
        state: addr.state || addr.estado || 'MG',
        postalCode: String(addr.cep).replace(/\D/g, ''),
      },
      products: products.length > 0 ? products : [{ name: 'Vestuário Masculino', quantity: 1, unitaryValue: 200 }],
    };

    let result;
    if (provider === 'melhorenvio' || (!hasSuperFrete && hasMelhorEnvio)) {
      result = await MelhorEnvioService.generateLabel(labelInput);
    } else {
      result = await SuperFreteService.generateShippingLabel(labelInput);
    }

    if (!result.success) {
      return { success: false, error: result.error || 'Erro ao gerar etiqueta no gateway de frete.' };
    }

    const tracking = result.trackingCode || 'Rastreio em emissão';
    const carrier = result.carrier || 'Correios / Jadlog';

    // 4. Atualiza o pedido no Supabase
    await service
      .from('orders')
      .update({
        shipping_label_url: result.labelUrl || null,
        tracking_code: tracking,
        tracking_carrier: carrier,
        melhor_envio_order_id: (result as any).superfreteOrderId || (result as any).melhorEnvioOrderId || null,
        dispatched_at: new Date().toISOString(),
        status: 'concluido',
      })
      .eq('id', order.id);

    // 5. Notificações WhatsApp, E-mail e WebPush
    if (order.customer_phone && tracking) {
      NotificationService.sendOrderNotification({
        phone: order.customer_phone,
        customerName: order.customer_name || 'Cliente',
        orderId: order.id,
        amountCents: order.total_cents || 0,
        type: 'ORDER_DISPATCHED',
        trackingCode: tracking,
        trackingCarrier: carrier,
      }).catch((e) => console.error('[GenerateLabel] Erro WhatsApp:', e));
    }

    if (order.customer_email && tracking) {
      EmailService.sendOrderDispatched({
        orderId: order.id,
        customerName: order.customer_name || 'Cliente',
        customerEmail: order.customer_email,
        trackingCode: tracking,
        trackingCarrier: carrier,
      }).catch((e) => console.error('[GenerateLabel] Erro E-mail:', e));
    }

    WebPushService.sendOrderLabelNotification({
      orderId: order.id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      userId: order.user_id,
      trackingCode: tracking,
      carrier,
      labelUrl: result.labelUrl,
    }).catch((e) => console.error('[GenerateLabel] Erro Web Push:', e));

    return {
      success: true,
      labelUrl: result.labelUrl,
      trackingCode: tracking,
      carrier,
      message: 'Etiqueta gerada com sucesso e notificações enviadas ao cliente!',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generateShippingLabelForOrder] Erro inesperado:', err);
    return { success: false, error: msg || 'Erro ao gerar etiqueta de frete.' };
  }
}

/**
 * Marca um pedido como despachado e envia o código de rastreamento
 */
export async function dispatchOrderManually(
  orderId: string,
  trackingCode: string,
  trackingCarrier?: string,
  trackingUrl?: string
): Promise<DispatchOrderResponse> {
  try {
    if (!orderId || !trackingCode) {
      return { success: false, error: 'ID do pedido e código de rastreamento são obrigatórios.' };
    }

    const service = createServiceSupabase();

    const { data: order, error } = await service
      .from('orders')
      .select('id, customer_name, customer_email, customer_phone, total_cents, status')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return { success: false, error: 'Pedido não encontrado.' };
    }

    const carrier = trackingCarrier ? trackingCarrier.trim() : 'Correios';
    const { error: updateError } = await service
      .from('orders')
      .update({
        status: 'concluido',
        tracking_code: trackingCode.trim(),
        tracking_carrier: carrier,
        tracking_url: trackingUrl ? trackingUrl.trim() : null,
        dispatched_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    if (order.customer_phone) {
      NotificationService.sendOrderNotification({
        phone: order.customer_phone,
        customerName: order.customer_name || 'Cliente',
        orderId: order.id,
        amountCents: order.total_cents || 0,
        type: 'ORDER_DISPATCHED',
        trackingCode: trackingCode.trim(),
        trackingCarrier: carrier,
        trackingUrl: trackingUrl ? trackingUrl.trim() : undefined,
      }).catch((e) => console.error('[Dispatch] Falha no WhatsApp:', e));
    }

    if (order.customer_email) {
      EmailService.sendOrderDispatched({
        orderId: order.id,
        customerName: order.customer_name || 'Cliente',
        customerEmail: order.customer_email,
        trackingCode: trackingCode.trim(),
        trackingCarrier: carrier,
        trackingUrl: trackingUrl ? trackingUrl.trim() : undefined,
      }).catch((e) => console.error('[Dispatch] Falha no E-mail:', e));
    }

    WebPushService.sendOrderDispatchedNotification({
      orderId: order.id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      userId: (order as any).user_id,
      trackingCode: trackingCode.trim(),
      carrier,
      trackingUrl: trackingUrl ? trackingUrl.trim() : undefined,
    }).catch((e) => console.error('[Dispatch] Falha no Web Push:', e));

    return { success: true, message: 'Pedido despachado e notificações enviadas com sucesso!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg || 'Falha ao despachar pedido.' };
  }
}
