// ============================================================
// Configurações do site (tabela public.settings) — formato, padrões e leitura
// tolerante. Isomórfico: usado pelo painel admin (navegador) e por
// src/lib/server/settings.ts (servidor). Os padrões vêm de site.ts, então o site
// continua igual enquanto o painel não salvar nada.
// ============================================================
import { CHECKOUT_PROVIDER, CLUB_PLANS, SITE } from './site';
import type { CheckoutProvider, PlanId } from './types';

export type SettingKey = 'whatsapp' | 'checkout' | 'plans' | 'announcement';
export const SETTING_KEYS: SettingKey[] = ['whatsapp', 'checkout', 'plans', 'announcement'];

export interface PlanSetting {
  /** Valor cobrado; null = sob consulta (sem checkout). */
  price_cents: number | null;
  /** Dias liberados por pagamento; null = não libera acesso digital. */
  access_days: number | null;
  /** Aparece no site e pode ser comprado. */
  active: boolean;
}

export interface SiteSettings {
  whatsapp: { number: string };
  checkout: { provider: CheckoutProvider };
  plans: Record<PlanId, PlanSetting>;
  announcement: { text: string; active: boolean };
}

/** Linha de public.settings como o painel a lê. */
export interface SettingRow {
  key: SettingKey;
  value: Record<string, unknown>;
  updated_at: string | null;
}

/** Padrões = valores hoje fixos em site.ts (fonte única enquanto a home não lê settings). */
export function defaultSettings(): SiteSettings {
  const plans = {} as Record<PlanId, PlanSetting>;
  for (const plan of CLUB_PLANS) {
    plans[plan.id] = { price_cents: plan.priceCents, access_days: plan.accessDays, active: true };
  }
  return {
    whatsapp: { number: SITE.whatsapp },
    checkout: { provider: CHECKOUT_PROVIDER },
    plans,
    announcement: { text: '', active: false },
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
  ];
}

/** Rótulo "R$ 29,90" a partir de centavos (sem Intl no servidor de borda). */
export function priceLabelFromCents(cents: number | null): string {
  if (cents === null) return 'Sob consulta';
  const reais = Math.floor(cents / 100);
  const centavos = String(cents % 100).padStart(2, '0');
  return `R$ ${reais.toLocaleString('pt-BR')},${centavos}`;
}
