'use server';

// ============================================================
// SERVER ACTIONS ADMINISTRATIVAS (Resilientes contra 404 de rotas HTTP)
// ============================================================
import { testWooCommerceConnection, type WooCommerceSyncResult } from '@/lib/server/woocommerce';
import type { WooCommerceSetting } from '@/lib/settings';

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

  const wcUrl = (process.env.WOOCOMMERCE_URL || '').replace(/\/+$/, '');
  const wcKey = (process.env.WOOCOMMERCE_CONSUMER_KEY || '').trim();
  const wcSecret = (process.env.WOOCOMMERCE_CONSUMER_SECRET || '').trim();
  const wcEnabled = process.env.WOOCOMMERCE_ENABLED === 'true';

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

-- 3. Insere ou atualiza as chaves de Frete, Pagamento, WhatsApp, WooCommerce e Checkout
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
    'evolution_instance_name', '${evoInstance.replace(/'/g, "''")}'
  ), NOW()),

  ('woocommerce', jsonb_build_object(
    'enabled', ${wcEnabled ? 'true' : 'false'},
    'store_url', '${wcUrl.replace(/'/g, "''")}',
    'consumer_key', '${wcKey.replace(/'/g, "''")}',
    'consumer_secret', '${wcSecret.replace(/'/g, "''")}',
    'sync_orders', true,
    'sync_stock', false
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

# 4. DISPAROS DE WHATSAPP (EVOLUTION API)
EVOLUTION_API_URL=${evoUrl}
EVOLUTION_API_KEY=${evoKey}
EVOLUTION_INSTANCE_NAME=${evoInstance}

# 5. DISPARO DE E-MAILS & NEWSLETTER (RESEND)
RESEND_API_KEY=${resendKey}
EMAIL_FROM="${emailFrom}"

# 6. DOMÍNIOS & CONFIGURAÇÃO
NEXT_PUBLIC_SITE_URL=${siteUrl}
NEXT_PUBLIC_CONSULTOR_URL=${consultorUrl}
NEXT_PUBLIC_CONSULTOR_DOMAIN=consultor.titisstore.com.br
NEXT_PUBLIC_CHECKOUT_PROVIDER=${checkoutProvider}

# 7. INTEGRAÇÃO WOOCOMMERCE & APP DE VENDAS
WOOCOMMERCE_ENABLED=${wcEnabled}
WOOCOMMERCE_URL=${wcUrl}
WOOCOMMERCE_CONSUMER_KEY=${wcKey}
WOOCOMMERCE_CONSUMER_SECRET=${wcSecret}

# 8. INTELIGÊNCIA ARTIFICIAL (GEMINI & GROQ)
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
      },
      woocommerce: {
        enabled: wcEnabled,
        store_url: wcUrl,
        consumer_key: wcKey,
        consumer_secret: wcSecret,
        sync_orders: true,
        sync_stock: false,
      },
    },
  };
}

export async function testWooCommerceAction(config: Partial<WooCommerceSetting>) {
  return await testWooCommerceConnection(config);
}
