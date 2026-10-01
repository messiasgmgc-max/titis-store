'use server';

// ============================================================
// SERVER ACTIONS ADMINISTRATIVAS (Resilientes contra 404 de rotas HTTP)
// ============================================================
import { testNtfyConnection } from '@/lib/server/ntfy';

export async function getAdminEnvStatusAction() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dusavcbgomdosfjodups.supabase.co').trim();
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '').trim();

  const mpToken = (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MP_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    process.env.MERCADOPAGO_TOKEN ||
    ''
  ).trim();
  const mpPubKey = (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || process.env.MERCADOPAGO_PUBLIC_KEY || '').trim();
  const mpWebhookSecret = (process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim();
  const mpSandbox = process.env.MERCADOPAGO_SANDBOX === 'true' || mpToken.startsWith('TEST-');

  const freteProvider = (process.env.FRETE_PROVIDER || 'superfrete').toLowerCase() === 'melhorenvio' ? 'melhorenvio' : 'superfrete';
  const sfToken = (process.env.SUPERFRETE_TOKEN || '').trim();
  const sfOriginCep = (process.env.SUPERFRETE_ORIGIN_CEP || '30130000').replace(/\D/g, '');
  const sfSandbox = process.env.SUPERFRETE_SANDBOX === 'true';

  const meToken = (process.env.MELHORENVIO_TOKEN || '').trim();
  const meOriginCep = (process.env.MELHORENVIO_ORIGIN_CEP || '30130000').replace(/\D/g, '');
  const meSandbox = process.env.MELHORENVIO_SANDBOX === 'true';

  const evoUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
  const evoKey = (process.env.EVOLUTION_API_KEY || '').trim();
  const evoInstance = (process.env.EVOLUTION_INSTANCE_NAME || 'titis-store').trim();

  const ntfyEnabled = process.env.NTFY_ENABLED !== 'false';
  const ntfyUrl = (process.env.NTFY_SERVER_URL || 'https://ntfy.sh').replace(/\/+$/, '');
  const ntfyTopic = (process.env.NTFY_TOPIC || 'titis-store-vendas').trim();
  const ntfyToken = (process.env.NTFY_TOKEN || '').trim();

  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const emailFrom = (process.env.EMAIL_FROM || "Titi's Store <pedidos@titisstore.com.br>").trim();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.titisstore.com.br').trim();
  const consultorUrl = (process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br').trim();
  const checkoutProvider = (process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER || 'mercadopago').trim();

  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const groqKey = (process.env.GROQ_API_KEY || '').trim();

  const sqlContent = `-- =============================================================================
-- TITI'S STORE & CONSULTOR — ATUALIZAÇÃO DIRETA DE PUBLIC.SETTINGS NO SUPABASE
-- Gerado automaticamente a partir das credenciais ativas no servidor Vercel
-- Execute este script no SQL Editor do Supabase para sincronizar todas as chaves
-- =============================================================================

-- 1. Garante a estrutura da tabela public.settings
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Habilita RLS e permissões de leitura pública e gestão administrativa
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de settings" ON public.settings;
CREATE POLICY "Permitir leitura publica de settings"
  ON public.settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Permitir atualizacao de settings por usuarios autenticados" ON public.settings;
CREATE POLICY "Permitir atualizacao de settings por usuarios autenticados"
  ON public.settings FOR ALL
  USING (auth.role() = 'authenticated');

-- 3. Insere ou atualiza as chaves de Frete, Pagamento, WhatsApp, ntfy.sh e Checkout
INSERT INTO public.settings (key, value, updated_at)
VALUES
  ('shipping', jsonb_build_object(
    'provider', '${freteProvider}',
    'superfrete_token', '${sfToken.replace(/'/g, "''")}',
    'superfrete_sandbox', ${sfSandbox ? 'true' : 'false'},
    'superfrete_origin_cep', '${sfOriginCep}',
    'melhorenvio_token', '${meToken.replace(/'/g, "''")}',
    'melhorenvio_sandbox', ${meSandbox ? 'true' : 'false'},
    'melhorenvio_origin_cep', '${meOriginCep}'
  ), NOW()),

  ('payments', jsonb_build_object(
    'mercadopago_access_token', '${mpToken.replace(/'/g, "''")}',
    'mercadopago_public_key', '${mpPubKey.replace(/'/g, "''")}',
    'mercadopago_webhook_secret', '${mpWebhookSecret.replace(/'/g, "''")}',
    'mercadopago_sandbox', ${mpSandbox ? 'true' : 'false'}
  ), NOW()),

  ('notifications', jsonb_build_object(
    'evolution_api_url', '${evoUrl.replace(/'/g, "''")}',
    'evolution_api_key', '${evoKey.replace(/'/g, "''")}',
    'evolution_instance_name', '${evoInstance.replace(/'/g, "''")}',
    'ntfy_enabled', ${ntfyEnabled ? 'true' : 'false'},
    'ntfy_server_url', '${ntfyUrl.replace(/'/g, "''")}',
    'ntfy_topic', '${ntfyTopic.replace(/'/g, "''")}',
    'ntfy_token', '${ntfyToken.replace(/'/g, "''")}'
  ), NOW()),

  ('whatsapp', jsonb_build_object(
    'number', '5531996000213'
  ), NOW()),

  ('checkout', jsonb_build_object(
    'provider', '${checkoutProvider === 'whatsapp' ? 'whatsapp' : 'mercadopago'}'
  ), NOW())

ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

-- 4. Confirmação dos registros salvos
SELECT key, value, updated_at FROM public.settings;
`;

  const rawEnvContent = `# =============================================================================
# TITI'S STORE & CONSULTOR — VARIÁVEIS DE AMBIENTE (.ENV)
# Recuperado da memória do servidor Vercel
# =============================================================================

# 1. BANCO DE DADOS & AUTENTICAÇÃO (SUPABASE)
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey || 'sb_publishable_YH8NQJfUpbnItrGmVYFtJQ_DDXgZDPh'}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# 2. CHECKOUT TRANSPARENTE, PIX & CARTÃO (MERCADO PAGO)
MERCADOPAGO_ACCESS_TOKEN=${mpToken}
MERCADOPAGO_PUBLIC_KEY=${mpPubKey}
MERCADOPAGO_WEBHOOK_SECRET=${mpWebhookSecret}
MERCADOPAGO_SANDBOX=${mpSandbox}

# 3. CÁLCULO DE FRETE & ETIQUETAS DOS CORREIOS / JADLOG (SUPERFRETE & MELHOR ENVIO)
FRETE_PROVIDER=${freteProvider}
SUPERFRETE_TOKEN=${sfToken}
SUPERFRETE_ORIGIN_CEP=${sfOriginCep}
SUPERFRETE_SANDBOX=${sfSandbox}
MELHORENVIO_TOKEN=${meToken}
MELHORENVIO_ORIGIN_CEP=${meOriginCep}
MELHORENVIO_SANDBOX=${meSandbox}

# 4. DISPAROS DE WHATSAPP (EVOLUTION API) & ALERTAS PUSH NO CELULAR (NTFY.SH)
EVOLUTION_API_URL=${evoUrl}
EVOLUTION_API_KEY=${evoKey}
EVOLUTION_INSTANCE_NAME=${evoInstance}
NTFY_ENABLED=${ntfyEnabled}
NTFY_SERVER_URL=${ntfyUrl}
NTFY_TOPIC=${ntfyTopic}
NTFY_TOKEN=${ntfyToken}

# 5. DISPARO DE E-MAILS & NEWSLETTER (RESEND)
RESEND_API_KEY=${resendKey}
EMAIL_FROM="${emailFrom}"

# 6. DOMÍNIOS & CONFIGURAÇÃO
NEXT_PUBLIC_SITE_URL=${siteUrl}
NEXT_PUBLIC_CONSULTOR_URL=${consultorUrl}
NEXT_PUBLIC_CONSULTOR_DOMAIN=consultor.titisstore.com.br
NEXT_PUBLIC_CHECKOUT_PROVIDER=${checkoutProvider}

# 7. INTELIGÊNCIA ARTIFICIAL (GEMINI & GROQ)
GEMINI_API_KEY=${geminiKey}
GROQ_API_KEY=${groqKey}
`;

  return {
    success: true,
    sqlScript: sqlContent,
    envFile: rawEnvContent,
    unmaskedValues: {
      shipping: {
        provider: freteProvider,
        superfrete_token: sfToken,
        superfrete_sandbox: sfSandbox,
        superfrete_origin_cep: sfOriginCep,
        melhorenvio_token: meToken,
        melhorenvio_sandbox: meSandbox,
        melhorenvio_origin_cep: meOriginCep,
      },
      payments: {
        mercadopago_access_token: mpToken,
        mercadopago_public_key: mpPubKey,
        mercadopago_webhook_secret: mpWebhookSecret,
        mercadopago_sandbox: mpSandbox,
      },
      notifications: {
        evolution_api_url: evoUrl,
        evolution_api_key: evoKey,
        evolution_instance_name: evoInstance,
        ntfy_enabled: ntfyEnabled,
        ntfy_server_url: ntfyUrl,
        ntfy_topic: ntfyTopic,
        ntfy_token: ntfyToken,
      },
    },
  };
}

export async function testNtfyAction(config: { serverUrl?: string; topic?: string; token?: string }) {
  return await testNtfyConnection(config);
}

export async function generateShippingLabelAction(orderId: string, serviceId?: string, clientOrder?: any) {
  const { generateShippingLabelForOrder } = await import('@/lib/server/shipping-operations');
  return await generateShippingLabelForOrder(orderId, serviceId, clientOrder);
}

export async function dispatchOrderAction(
  orderId: string,
  trackingCode: string,
  trackingCarrier?: string,
  trackingUrl?: string,
  clientOrder?: any
) {
  const { dispatchOrderManually } = await import('@/lib/server/shipping-operations');
  return await dispatchOrderManually(orderId, trackingCode, trackingCarrier, trackingUrl, clientOrder);
}

export async function updateOrderAddressAction(
  orderId: string,
  shippingAddress: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
  },
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    cpf?: string;
  }
) {
  const { createServiceSupabase } = await import('@/lib/server/mercadopago');
  const service = createServiceSupabase();

  let cleanCep = String(shippingAddress.cep || '').replace(/\D/g, '');
  if (cleanCep.length === 7) {
    cleanCep = cleanCep.padStart(8, '0');
  }

  const normalizedAddress = {
    ...shippingAddress,
    cep: cleanCep,
  };

  const updateData: Record<string, any> = {
    shipping_address: normalizedAddress,
    updated_at: new Date().toISOString(),
  };

  if (customer?.name) updateData.customer_name = customer.name.trim();
  if (customer?.phone) updateData.customer_phone = customer.phone.trim();
  if (customer?.email) updateData.customer_email = customer.email.trim();
  if (customer?.cpf) updateData.customer_cpf = customer.cpf.trim();

  const { data, error } = await service
    .from('orders')
    .update(updateData)
    .eq('id', orderId.trim())
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('[updateOrderAddressAction] Erro no Supabase:', error);
    return { success: false, error: error.message };
  }

  return { success: true, order: data };
}

export async function createManualPdvSaleAction(input: import('@/lib/types').PdvSaleInput) {
  const { createServiceSupabase } = await import('@/lib/server/mercadopago');
  const service = createServiceSupabase();

  if (!input.items || input.items.length === 0) {
    return { success: false, error: 'Selecione ao menos um produto para lançar a venda.' };
  }

  const cleanPhone = (input.customerPhone || '').replace(/\D/g, '');
  const orderId = `TITIS-PDV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  let totalCostCents = 0;
  let totalChargedCents = 0;

  const cartItems = input.items.map((item, idx) => {
    const qty = Math.max(1, item.quantity || 1);
    const unitCost = Math.max(0, item.unitCostCents || 0);
    const unitCharged = Math.max(0, item.unitChargedCents || 0);

    const itemTotalCost = unitCost * qty;
    const itemTotalCharged = unitCharged * qty;
    const itemProfit = itemTotalCharged - itemTotalCost;
    const itemMargin = itemTotalCharged > 0 ? (itemProfit / itemTotalCharged) * 100 : 0;

    totalCostCents += itemTotalCost;
    totalChargedCents += itemTotalCharged;

    return {
      key: `pdv-item-${idx}-${Date.now()}`,
      productId: item.productId || null,
      name: item.name || 'Peça Alfaiataria',
      detail: `Venda Externa · ${input.channelLocation || 'PDV'}`,
      color: item.color || '',
      hex: '',
      image: item.image || null,
      size: item.size || null,
      priceCents: unitCharged,
      quantity: qty,
      costCents: unitCost,
      profitCents: itemProfit,
      marginPercent: Math.round(itemMargin * 10) / 10,
    };
  });

  const grossProfitCents = totalChargedCents - totalCostCents;
  const marginPercent = totalChargedCents > 0 ? (grossProfitCents / totalChargedCents) * 100 : 0;

  const paymentMethodLabel =
    input.paymentMethod === 'pix' ? 'Pix Instantâneo' :
    input.paymentMethod === 'debito' ? 'Cartão de Débito' :
    input.paymentMethod === 'credito' ? (input.installments && input.installments > 1 ? `Cartão de Crédito (${input.installments}x)` : 'Cartão de Crédito à Vista') :
    'Dinheiro em Espécie';

  const notesFormatted = [
    `[PDV / VENDA EXTERNA · ${input.channelLocation || 'Balcão'}]`,
    `Pagamento: ${paymentMethodLabel}`,
    `Custo Mercadorias: ${(totalCostCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    `Valor Cobrado: ${(totalChargedCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    `Lucro Bruto: ${(grossProfitCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${marginPercent.toFixed(1)}%)`,
    input.notes ? `Observações: ${input.notes}` : null,
  ].filter(Boolean).join('\n');

  const insertData = {
    id: orderId,
    customer_name: (input.customerName || 'Cliente Balcão').trim(),
    customer_phone: cleanPhone || null,
    customer_cpf: (input.customerCpf || '').replace(/\D/g, '') || null,
    payment_method: input.paymentMethod,
    channel: 'pdv' as const,
    status: 'concluido' as const,
    total_cents: totalChargedCents,
    paid_at: new Date().toISOString(),
    dispatched_at: new Date().toISOString(),
    shipping_service_name: `Venda Externa (${input.channelLocation || 'Balcão'})`,
    shipping_price_cents: 0,
    shipping_address: {
      type: 'pdv',
      location: input.channelLocation || 'Ateliê Betim',
      total_cost_cents: totalCostCents,
      total_charged_cents: totalChargedCents,
      gross_profit_cents: grossProfitCents,
      margin_percent: Math.round(marginPercent * 10) / 10,
    },
    items: cartItems,
    notes: notesFormatted,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await service
    .from('orders')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    console.error('[createManualPdvSaleAction] Erro ao gravar pedido PDV:', error);
    return { success: false, error: `Falha ao salvar venda PDV: ${error.message}`, message: `Falha ao salvar venda PDV: ${error.message}` };
  }

  // Notificação para o cliente via WhatsApp se solicitado
  if (input.notifyCustomerWhatsApp && cleanPhone) {
    const formattedBrl = (totalChargedCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const itemsText = cartItems.map(i => `• ${i.quantity}x ${i.name}${i.size ? ` (Tam: ${i.size})` : ''}`).join('\n');

    const customerMsg =
      `👑 *TITI'S STORE — COMPROVANTE DE COMPRA* ✨\n\n` +
      `Olá, *${input.customerName || 'Cliente'}*!\n` +
      `Agradecemos pela preferência em nosso atendimento presencial.\n\n` +
      `🧾 *Comprovante:* \`#${orderId}\`\n` +
      `💳 *Forma de Pagamento:* ${paymentMethodLabel}\n` +
      `💰 *Total Pago:* *${formattedBrl}*\n\n` +
      `🛍️ *Peças Adquiridas:*\n${itemsText}\n\n` +
      `Ficamos muito felizes em vestir você com excelência e sofisticação!`;

    try {
      const notifSettings = await import('@/lib/server/settings').then(m => m.getNotificationsSettingsFresh()).catch(() => null);
      const apiUrl = (notifSettings?.evolution_api_url || process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
      const apiKey = (notifSettings?.evolution_api_key || process.env.EVOLUTION_API_KEY || '').trim();
      const instance = (notifSettings?.evolution_instance_name || process.env.EVOLUTION_INSTANCE_NAME || 'titis-store').trim();

      if (apiUrl && apiKey) {
        const phoneWithDdi = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        await fetch(`${apiUrl}/message/sendText/${instance}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: apiKey },
          body: JSON.stringify({ number: phoneWithDdi, text: customerMsg }),
        }).catch(err => console.warn('[createManualPdvSaleAction] Erro envio recibo WhatsApp:', err));
      }
    } catch (e) {
      console.warn('[createManualPdvSaleAction] Aviso no envio do recibo WhatsApp:', e);
    }
  }

  return { success: true, orderId, orderNumber: orderId, order: data, message: `Venda ${orderId} lançada com sucesso!` };
}

export async function cancelPdvSaleAction(orderId: string) {
  const { createServiceSupabase } = await import('@/lib/server/mercadopago');
  const service = createServiceSupabase();

  const { data, error } = await service
    .from('orders')
    .update({ status: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', orderId.trim())
    .select('*')
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message, message: error.message };
  }
  return { success: true, order: data, message: 'Venda externa cancelada com sucesso.' };
}

export async function testMerchantWhatsAppNotificationAction(customPhone?: string) {
  const { NotificationService } = await import('@/lib/server/notifications');
  const res = await NotificationService.sendMerchantOrderApprovedNotification({
    orderId: `TITIS-${Math.floor(1000 + Math.random() * 9000)}-APROVADO`,
    totalCents: 48900,
    customerName: 'Rodrigo Guimarães (Demonstração)',
    customerPhone: '31998765432',
    customerEmail: 'rodrigo.guimaraes@exemplo.com.br',
    paymentMethod: 'pix',
    shippingService: 'Correios SEDEX Express',
    shippingCity: 'Belo Horizonte',
    shippingState: 'MG',
    channel: 'online',
    items: [
      { name: 'Costume Alfaiataria Super 120s Chumbo', quantity: 1, size: '50', color: 'Cinza Chumbo', priceCents: 38900 },
      { name: 'Camisa Maquinetada Egípcia Clássica', quantity: 1, size: 'M', color: 'Branca', priceCents: 10000 },
    ],
  }, customPhone);

  return {
    success: res.success,
    message: res.success
      ? `Notificação enviada com sucesso no WhatsApp (${res.phoneUsed || 'Lojista'})!`
      : `Falha ao enviar notificação: ${res.error || 'Erro desconhecido'}`,
    phoneUsed: res.phoneUsed,
    error: res.error,
  };
}


