// ============================================================
// Configurações do site (tabela public.settings) — formato, padrões e leitura
// tolerante. Isomórfico: usado pelo painel admin (navegador) e por
// src/lib/server/settings.ts (servidor). Os padrões vêm de site.ts e .env,
// e qualquer alteração no painel salva diretamente no Supabase.
// ============================================================
import { CHECKOUT_PROVIDER, CLUB_PLANS, SITE } from './site';
import type { CheckoutProvider, PlanId } from './types';

export type SettingKey = 'whatsapp' | 'checkout' | 'plans' | 'announcement' | 'shipping' | 'payments' | 'notifications';
export const SETTING_KEYS: SettingKey[] = ['whatsapp', 'checkout', 'plans', 'announcement', 'shipping', 'payments', 'notifications'];

export interface PlanSetting {
  /** Valor cobrado; null = sob consulta (sem checkout). */
  price_cents: number | null;
  /** Dias liberados por pagamento; null = não libera acesso digital. */
  access_days: number | null;
  /** Aparece no site e pode ser comprado. */
  active: boolean;
}

export interface ShippingSetting {
  provider: 'superfrete' | 'melhorenvio';
  superfrete_token: string;
  superfrete_sandbox: boolean;
  superfrete_origin_cep: string;
  melhorenvio_token: string;
  melhorenvio_sandbox: boolean;
  melhorenvio_origin_cep: string;
}

export interface PaymentsSetting {
  mercadopago_access_token: string;
  mercadopago_public_key: string;
  mercadopago_webhook_secret: string;
  mercadopago_sandbox: boolean;
}

export interface NotificationsSetting {
  evolution_api_url: string;
  evolution_api_key: string;
  evolution_instance_name: string;
  // ntfy.sh (Alertas push instantâneos de compras e vendas)
  ntfy_enabled: boolean;
  ntfy_server_url: string;
  ntfy_topic: string;
  ntfy_token: string;
}

export interface SiteSettings {
  whatsapp: { number: string };
  checkout: { provider: CheckoutProvider };
  plans: Record<PlanId, PlanSetting>;
  announcement: { text: string; active: boolean };
  shipping: ShippingSetting;
  payments: PaymentsSetting;
  notifications: NotificationsSetting;
}

/** Linha de public.settings como o painel a lê. */
export interface SettingRow {
  key: SettingKey;
  value: Record<string, unknown>;
  updated_at: string | null;
}

/** Padrões = valores em site.ts e fallback para variáveis de ambiente */
export function defaultSettings(): SiteSettings {
  const plans = {} as Record<PlanId, PlanSetting>;
  for (const plan of CLUB_PLANS) {
    plans[plan.id] = { price_cents: plan.priceCents, access_days: plan.accessDays, active: true };
  }

  const freteProvider = (process.env.FRETE_PROVIDER || 'superfrete').toLowerCase() === 'melhorenvio' ? 'melhorenvio' : 'superfrete';

  return {
    whatsapp: { number: SITE.whatsapp },
    checkout: { provider: CHECKOUT_PROVIDER },
    plans,
    announcement: { text: '', active: false },
    shipping: {
      provider: freteProvider,
      superfrete_token: (process.env.SUPERFRETE_TOKEN ?? '').trim(),
      superfrete_sandbox: process.env.SUPERFRETE_SANDBOX === 'true',
      superfrete_origin_cep: (process.env.SUPERFRETE_ORIGIN_CEP ?? '30130000').replace(/\D/g, ''),
      melhorenvio_token: (process.env.MELHORENVIO_TOKEN ?? '').trim(),
      melhorenvio_sandbox: process.env.MELHORENVIO_SANDBOX === 'true',
      melhorenvio_origin_cep: (process.env.MELHORENVIO_ORIGIN_CEP ?? '30130000').replace(/\D/g, ''),
    },
    payments: {
      mercadopago_access_token: (process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || '').trim(),
      mercadopago_public_key: (process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '').trim(),
      mercadopago_webhook_secret: (process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim(),
      mercadopago_sandbox: process.env.MERCADOPAGO_SANDBOX === 'true',
    },
    notifications: {
      evolution_api_url: (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, ''),
      evolution_api_key: (process.env.EVOLUTION_API_KEY || '').trim(),
      evolution_instance_name: process.env.EVOLUTION_INSTANCE_NAME || 'titis-store',
      ntfy_enabled: process.env.NTFY_ENABLED !== 'false',
      ntfy_server_url: (process.env.NTFY_SERVER_URL || 'https://ntfy.sh').replace(/\/+$/, ''),
      ntfy_topic: (process.env.NTFY_TOPIC || 'titis-store-vendas').trim(),
      ntfy_token: (process.env.NTFY_TOKEN || '').trim(),
    },
  };
}

const PLAN_IDS: PlanId[] = ['passe', 'clube', 'presencial'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function intOrNull(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const n = Math.round(value);
  return n < min || n > max ? undefined : n;
}

/** Só dígitos, com DDI (10 a 15 dígitos, padrão E.164 sem "+"). */
export function normalizeWhatsappNumber(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

function parsePlan(raw: unknown, fallback: PlanSetting): PlanSetting {
  if (!isRecord(raw)) return fallback;
  const price = intOrNull(raw.price_cents, 0, 999_999_999);
  const days = intOrNull(raw.access_days, 1, 3660);
  return {
    price_cents: price === undefined ? fallback.price_cents : price,
    access_days: days === undefined ? fallback.access_days : days,
    active: typeof raw.active === 'boolean' ? raw.active : fallback.active,
  };
}

/**
 * Monta as configurações a partir das linhas do banco, campo a campo, caindo
 * nos padrões para tudo que estiver ausente ou fora do formato.
 */
export function parseSettings(rows: Array<{ key: string; value: unknown }>): SiteSettings {
  const base = defaultSettings();
  const byKey = new Map<string, unknown>();
  rows.forEach((r) => byKey.set(r.key, r.value));

  const whatsapp = byKey.get('whatsapp');
  if (isRecord(whatsapp) && typeof whatsapp.number === 'string') {
    const number = normalizeWhatsappNumber(whatsapp.number);
    if (number) base.whatsapp.number = number;
  }

  const checkout = byKey.get('checkout');
  if (isRecord(checkout) && (checkout.provider === 'whatsapp' || checkout.provider === 'mercadopago')) {
    base.checkout.provider = checkout.provider;
  }

  const plans = byKey.get('plans');
  if (isRecord(plans)) {
    for (const id of PLAN_IDS) base.plans[id] = parsePlan(plans[id], base.plans[id]);
  }

  const announcement = byKey.get('announcement');
  if (isRecord(announcement)) {
    if (typeof announcement.text === 'string') base.announcement.text = announcement.text.trim().slice(0, 280);
    if (typeof announcement.active === 'boolean') base.announcement.active = announcement.active;
  }

  const shipping = byKey.get('shipping');
  if (isRecord(shipping)) {
    if (shipping.provider === 'superfrete' || shipping.provider === 'melhorenvio') {
      base.shipping.provider = shipping.provider;
    }
    if (typeof shipping.superfrete_token === 'string') base.shipping.superfrete_token = shipping.superfrete_token.trim();
    if (typeof shipping.superfrete_sandbox === 'boolean') base.shipping.superfrete_sandbox = shipping.superfrete_sandbox;
    if (typeof shipping.superfrete_origin_cep === 'string') {
      const clean = shipping.superfrete_origin_cep.replace(/\D/g, '');
      if (clean) base.shipping.superfrete_origin_cep = clean;
    }
    if (typeof shipping.melhorenvio_token === 'string') base.shipping.melhorenvio_token = shipping.melhorenvio_token.trim();
    if (typeof shipping.melhorenvio_sandbox === 'boolean') base.shipping.melhorenvio_sandbox = shipping.melhorenvio_sandbox;
    if (typeof shipping.melhorenvio_origin_cep === 'string') {
      const clean = shipping.melhorenvio_origin_cep.replace(/\D/g, '');
      if (clean) base.shipping.melhorenvio_origin_cep = clean;
    }
  }

  const payments = byKey.get('payments');
  if (isRecord(payments)) {
    if (typeof payments.mercadopago_access_token === 'string') base.payments.mercadopago_access_token = payments.mercadopago_access_token.trim();
    if (typeof payments.mercadopago_public_key === 'string') base.payments.mercadopago_public_key = payments.mercadopago_public_key.trim();
    if (typeof payments.mercadopago_webhook_secret === 'string') base.payments.mercadopago_webhook_secret = payments.mercadopago_webhook_secret.trim();
    if (typeof payments.mercadopago_sandbox === 'boolean') base.payments.mercadopago_sandbox = payments.mercadopago_sandbox;
  }

  const notifications = byKey.get('notifications');
  if (isRecord(notifications)) {
    if (typeof notifications.evolution_api_url === 'string') base.notifications.evolution_api_url = notifications.evolution_api_url.trim();
    if (typeof notifications.evolution_api_key === 'string') base.notifications.evolution_api_key = notifications.evolution_api_key.trim();
    if (typeof notifications.evolution_instance_name === 'string') base.notifications.evolution_instance_name = notifications.evolution_instance_name.trim();
    if (typeof notifications.ntfy_enabled === 'boolean') base.notifications.ntfy_enabled = notifications.ntfy_enabled;
    if (typeof notifications.ntfy_server_url === 'string') base.notifications.ntfy_server_url = notifications.ntfy_server_url.trim().replace(/\/+$/, '');
    if (typeof notifications.ntfy_topic === 'string') base.notifications.ntfy_topic = notifications.ntfy_topic.trim();
    if (typeof notifications.ntfy_token === 'string') base.notifications.ntfy_token = notifications.ntfy_token.trim();
  }

  return base;
}

/** Converte cada chave para o JSON gravado em public.settings.value. */
export function settingsToRows(settings: SiteSettings): Array<{ key: SettingKey; value: Record<string, unknown> }> {
  return [
    { key: 'whatsapp', value: { number: settings.whatsapp.number } },
    { key: 'checkout', value: { provider: settings.checkout.provider } },
    {
      key: 'plans',
      value: Object.fromEntries(
        PLAN_IDS.map((id) => {
          const p = settings.plans[id];
          return [id, id === 'presencial' ? { active: p.active } : { price_cents: p.price_cents, access_days: p.access_days, active: p.active }];
        }),
      ),
    },
    { key: 'announcement', value: { text: settings.announcement.text, active: settings.announcement.active } },
    {
      key: 'shipping',
      value: {
        provider: settings.shipping.provider,
        superfrete_token: settings.shipping.superfrete_token,
        superfrete_sandbox: settings.shipping.superfrete_sandbox,
        superfrete_origin_cep: settings.shipping.superfrete_origin_cep,
        melhorenvio_token: settings.shipping.melhorenvio_token,
        melhorenvio_sandbox: settings.shipping.melhorenvio_sandbox,
        melhorenvio_origin_cep: settings.shipping.melhorenvio_origin_cep,
      },
    },
    {
      key: 'payments',
      value: {
        mercadopago_access_token: settings.payments.mercadopago_access_token,
        mercadopago_public_key: settings.payments.mercadopago_public_key,
        mercadopago_webhook_secret: settings.payments.mercadopago_webhook_secret,
        mercadopago_sandbox: settings.payments.mercadopago_sandbox,
      },
    },
    {
      key: 'notifications',
      value: {
        evolution_api_url: settings.notifications.evolution_api_url,
        evolution_api_key: settings.notifications.evolution_api_key,
        evolution_instance_name: settings.notifications.evolution_instance_name,
        ntfy_enabled: settings.notifications.ntfy_enabled,
        ntfy_server_url: settings.notifications.ntfy_server_url,
        ntfy_topic: settings.notifications.ntfy_topic,
        ntfy_token: settings.notifications.ntfy_token,
      },
    },
  ];
}

/** Rótulo "R$ 29,90" a partir de centavos (sem Intl no servidor de borda). */
export function priceLabelFromCents(cents: number | null): string {
  if (cents === null) return 'Sob consulta';
  const reais = Math.floor(cents / 100);
  const centavos = String(cents % 100).padStart(2, '0');
  return `R$ ${reais.toLocaleString('pt-BR')},${centavos}`;
}
