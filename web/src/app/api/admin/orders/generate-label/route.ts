// ============================================================
// POST /api/admin/orders/generate-label
// Gera etiqueta oficial no Melhor Envio (PDF), salva rastreio e notifica cliente
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabase } from '@/lib/server/mercadopago';
import { SuperFreteService } from '@/lib/server/superfrete';
import { MelhorEnvioService } from '@/lib/server/melhorenvio';
import { NotificationService } from '@/lib/server/notifications';
import { EmailService } from '@/lib/server/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, serviceId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId obrigatório.' }, { status: 400 });
    }

    const service = createServiceSupabase();

    // Busca dados completos do pedido
    const { data: order, error } = await service
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    const addr = order.shipping_address;
    if (!addr || !addr.street || !addr.cep) {
      return NextResponse.json(
        { error: 'Pedido não possui endereço de entrega completo para gerar etiqueta.' },
        { status: 400 }
      );
    }

    // Monta itens
    const itemsList = Array.isArray(order.items) ? order.items : [];
    const products = itemsList.map((i: any) => ({
      name: i.name || 'Vestuário Masculino',
      quantity: Number(i.quantity) || 1,
      unitaryValue: i.priceCents ? i.priceCents / 100 : 150,
    }));

    const provider = (process.env.FRETE_PROVIDER || 'superfrete').toLowerCase();
    const hasSuperFrete = Boolean((process.env.SUPERFRETE_TOKEN ?? '').trim());
    const hasMelhorEnvio = Boolean((process.env.MELHORENVIO_TOKEN ?? '').trim());

    const labelInput = {
      orderId: order.id,
      serviceId: serviceId || order.shipping_service_id || '1',
      to: {
        name: order.customer_name || 'Cliente',
        phone: order.customer_phone || '31999999999',
        email: order.customer_email || 'cliente@exemplo.com',
        document: order.customer_cpf || '00000000000',
        address: addr.street,
        number: addr.number || 'SN',
        complement: addr.complement,
        neighborhood: addr.neighborhood || 'Centro',
        city: addr.city || 'Belo Horizonte',
        state: addr.state || 'MG',
        postalCode: addr.cep,
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
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const tracking = result.trackingCode || 'Rastreio em emissão';
    const carrier = result.carrier || 'Correios / Jadlog';

    // Atualiza o pedido no Supabase
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

    // Dispara WhatsApp para o cliente
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

    // Dispara E-mail para o cliente
    if (order.customer_email && tracking) {
      EmailService.sendOrderDispatched({
        orderId: order.id,
        customerName: order.customer_name || 'Cliente',
        customerEmail: order.customer_email,
        trackingCode: tracking,
        trackingCarrier: carrier,
      }).catch((e) => console.error('[GenerateLabel] Erro E-mail:', e));
    }

    return NextResponse.json({
      success: true,
      labelUrl: result.labelUrl,
      trackingCode: tracking,
      carrier,
      message: 'Etiqueta gerada com sucesso e notificações enviadas ao cliente!',
    });
  } catch (err: any) {
    console.error('[api/admin/orders/generate-label] Erro interno:', err);
    return NextResponse.json({ error: 'Erro ao gerar etiqueta de frete.' }, { status: 500 });
  }
}
