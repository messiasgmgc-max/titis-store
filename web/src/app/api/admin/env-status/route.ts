// ============================================================
// GET /api/admin/env-status — Diagnóstico e Template de Variáveis de Ambiente
// Permite auditar rapidamente quais chaves estão ativas na Vercel / Coolify
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

function maskKey(val?: string | null): string {
  if (!val) return 'NÃO CONFIGURADO';
  const clean = val.trim();
  if (clean.length <= 8) return '********';
  return `${clean.substring(0, 4)}...${clean.substring(clean.length - 4)}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format'); // 'raw' retorna texto puro para copiar

  const envs = {
    // 1. Supabase
    NEXT_PUBLIC_SUPABASE_URL: {
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      preview: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dusavcbgomdosfjodups.supabase.co (padrão)',
      required: true,
      category: 'Supabase',
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      preview: maskKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_...'),
      required: true,
      category: 'Supabase',
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      preview: maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY),
      required: true,
      category: 'Supabase',
    },

    // 2. Mercado Pago
    MERCADOPAGO_ACCESS_TOKEN: {
      configured: Boolean(
        process.env.MERCADOPAGO_ACCESS_TOKEN ||
        process.env.MP_ACCESS_TOKEN ||
        process.env.MERCADO_PAGO_ACCESS_TOKEN ||
        process.env.MERCADOPAGO_TOKEN
      ),
      preview: maskKey(
        process.env.MERCADOPAGO_ACCESS_TOKEN ||
        process.env.MP_ACCESS_TOKEN ||
        process.env.MERCADO_PAGO_ACCESS_TOKEN ||
        process.env.MERCADOPAGO_TOKEN
      ),
      required: true,
      category: 'Mercado Pago',
    },
    MERCADOPAGO_PUBLIC_KEY: {
      configured: Boolean(process.env.MERCADOPAGO_PUBLIC_KEY),
      preview: maskKey(process.env.MERCADOPAGO_PUBLIC_KEY),
      required: true,
      category: 'Mercado Pago',
    },
    MERCADOPAGO_WEBHOOK_SECRET: {
      configured: Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET),
      preview: maskKey(process.env.MERCADOPAGO_WEBHOOK_SECRET),
      required: false,
      category: 'Mercado Pago',
    },

    // 3. SuperFrete (Envios, Correios e Jadlog)
    FRETE_PROVIDER: {
      configured: Boolean(process.env.FRETE_PROVIDER),
      preview: process.env.FRETE_PROVIDER || 'superfrete',
      required: true,
      category: 'Logística',
    },
    SUPERFRETE_TOKEN: {
      configured: Boolean(process.env.SUPERFRETE_TOKEN),
      preview: maskKey(process.env.SUPERFRETE_TOKEN),
      required: true,
      category: 'Logística',
    },
    SUPERFRETE_ORIGIN_CEP: {
      configured: Boolean(process.env.SUPERFRETE_ORIGIN_CEP),
      preview: process.env.SUPERFRETE_ORIGIN_CEP || '30130000 (MG)',
      required: true,
      category: 'Logística',
    },
    SUPERFRETE_SANDBOX: {
      configured: Boolean(process.env.SUPERFRETE_SANDBOX),
      preview: process.env.SUPERFRETE_SANDBOX || 'false',
      required: false,
      category: 'Logística',
    },

    // 4. WhatsApp (Evolution API)
    EVOLUTION_API_URL: {
      configured: Boolean(process.env.EVOLUTION_API_URL),
      preview: process.env.EVOLUTION_API_URL ? maskKey(process.env.EVOLUTION_API_URL) : 'NÃO CONFIGURADO',
      required: false,
      category: 'WhatsApp',
    },
    EVOLUTION_API_KEY: {
      configured: Boolean(process.env.EVOLUTION_API_KEY),
      preview: maskKey(process.env.EVOLUTION_API_KEY),
      required: false,
      category: 'WhatsApp',
    },
    EVOLUTION_INSTANCE_NAME: {
      configured: Boolean(process.env.EVOLUTION_INSTANCE_NAME),
      preview: process.env.EVOLUTION_INSTANCE_NAME || 'titis-store',
      required: false,
      category: 'WhatsApp',
    },

    // 5. E-mails (Resend)
    RESEND_API_KEY: {
      configured: Boolean(process.env.RESEND_API_KEY),
      preview: maskKey(process.env.RESEND_API_KEY),
      required: false,
      category: 'Email',
    },
    EMAIL_FROM: {
      configured: Boolean(process.env.EMAIL_FROM),
      preview: process.env.EMAIL_FROM || "Titi's Store <pedidos@titisstore.com.br>",
      required: false,
      category: 'Email',
    },

    // 6. Domínios
    NEXT_PUBLIC_SITE_URL: {
      configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      preview: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.titisstore.com.br',
      required: true,
      category: 'Domínios',
    },
    NEXT_PUBLIC_CONSULTOR_URL: {
      configured: Boolean(process.env.NEXT_PUBLIC_CONSULTOR_URL),
      preview: process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br',
      required: true,
      category: 'Domínios',
    },
    NEXT_PUBLIC_CHECKOUT_PROVIDER: {
      configured: true,
      preview: process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER || 'mercadopago',
      required: true,
      category: 'Checkout',
    },

    // 7. Inteligência Artificial
    GEMINI_API_KEY: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      preview: maskKey(process.env.GEMINI_API_KEY),
      required: false,
      category: 'IA',
    },
  };

  const rawEnvContent = `# =============================================================================
# TITI'S STORE & CONSULTOR — VARIÁVEIS DE AMBIENTE COMPLETAS
# Compatível com Vercel (.env) e Coolify (.env)
# =============================================================================

# 1. BANCO DE DADOS & AUTENTICAÇÃO (SUPABASE)
NEXT_PUBLIC_SUPABASE_URL=https://dusavcbgomdosfjodups.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YH8NQJfUpbnItrGmVYFtJQ_DDXgZDPh
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_secreta_aqui

# 2. CHECKOUT TRANSPARENTE, PIX & CARTÃO (MERCADO PAGO)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu_access_token_aqui
MERCADOPAGO_PUBLIC_KEY=APP_USR-sua_public_key_aqui
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui

# 3. CÁLCULO DE FRETE & ETIQUETAS DOS CORREIOS / JADLOG (SUPERFRETE)
FRETE_PROVIDER=superfrete
SUPERFRETE_TOKEN=seu_token_superfrete_aqui
SUPERFRETE_ORIGIN_CEP=30130000
SUPERFRETE_SANDBOX=false

# 4. DISPAROS DE WHATSAPP (EVOLUTION API)
EVOLUTION_API_URL=https://api.suaevolution.com.br
EVOLUTION_API_KEY=sua_chave_evolution
EVOLUTION_INSTANCE_NAME=titis-store

# 5. DISPARO DE E-MAILS & NEWSLETTER (RESEND)
RESEND_API_KEY=re_sua_chave_resend_aqui
EMAIL_FROM="Titi's Store <pedidos@titisstore.com.br>"

# 6. DOMÍNIOS & CONFIGURAÇÃO
NEXT_PUBLIC_SITE_URL=https://www.titisstore.com.br
NEXT_PUBLIC_CONSULTOR_URL=https://consultor.titisstore.com.br
NEXT_PUBLIC_CONSULTOR_DOMAIN=consultor.titisstore.com.br
NEXT_PUBLIC_CHECKOUT_PROVIDER=mercadopago

# 7. IA CONSULTOR DE ESTILO & VISÃO COMPUTACIONAL (OPCIONAL)
GEMINI_API_KEY=sua_chave_gemini_aqui
GROQ_API_KEY=sua_chave_groq_aqui
`;

  if (format === 'raw' || format === 'text') {
    return new NextResponse(rawEnvContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  const missingRequired = Object.entries(envs)
    .filter(([_, meta]) => meta.required && !meta.configured)
    .map(([key]) => key);

  return NextResponse.json({
    status: missingRequired.length === 0 ? 'healthy' : 'pending_configuration',
    missingRequired,
    variables: envs,
    exportHelp: {
      rawUrl: '/api/admin/env-status?format=raw',
      instructions: 'Acesse ?format=raw para obter o arquivo .env pronto para copiar e colar na Vercel ou Coolify.',
    },
  });
}
