// ============================================================
// Configurações do site no servidor — lê public.settings com a chave anon
// (leitura pública por RLS) e guarda em cache por até 5 minutos.
// Nunca lança: qualquer falha devolve os padrões de site.ts e .env.
// ============================================================
import { revalidateTag, unstable_cache } from 'next/cache';
import { CLUB_PLANS, type ClubPlan } from '@/lib/site';
import { defaultSettings, parseSettings, priceLabelFromCents, type SiteSettings, type ShippingSetting, type PaymentsSetting, type NotificationsSetting } from '@/lib/settings';
import { createServerSupabase } from './supabase-server';

export const SETTINGS_CACHE_TAG = 'settings';
/** Segundos até o cache reler o banco (ISR de até 5 minutos). */
export const SETTINGS_REVALIDATE_SECONDS = 300;
const QUERY_TIMEOUT_MS = 5_000;

async function loadSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await createServerSupabase()
      .from('settings')
      .select('key, value')
      .abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS));
    if (error) throw new Error(error.message);
    return parseSettings((data ?? []) as Array<{ key: string; value: unknown }>);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[settings] usando padrões de site.ts / .env — ${message.slice(0, 200)}`);
    return defaultSettings();
  }
}

const cachedSettings = unstable_cache(loadSettings, ['site-settings'], {
  tags: [SETTINGS_CACHE_TAG],
  revalidate: SETTINGS_REVALIDATE_SECONDS,
});

/** Configurações do site (com cache). Nunca lança. */
export async function getSettings(): Promise<SiteSettings> {
  try {
    return await cachedSettings();
  } catch {
    return loadSettings();
  }
}

/** Sem cache: para rotas que precisam do valor recém-salvo (ex.: checkout, envio de etiquetas, webhooks). */
export function getSettingsFresh(): Promise<SiteSettings> {
  return loadSettings();
}

/** Obtém as configurações de frete atualizadas diretamente do banco Supabase */
export async function getShippingSettingsFresh(): Promise<ShippingSetting> {
  const settings = await getSettingsFresh();
  return settings.shipping;
}

/** Obtém as configurações de pagamento atualizadas diretamente do banco Supabase */
export async function getPaymentsSettingsFresh(): Promise<PaymentsSetting> {
  const settings = await getSettingsFresh();
  return settings.payments;
}

/** Obtém as configurações de notificações atualizadas diretamente do banco Supabase */
export async function getNotificationsSettingsFresh(): Promise<NotificationsSetting> {
  const settings = await getSettingsFresh();
  return settings.notifications;
}

/** Expira o cache das configurações na próxima requisição. */
export function revalidateSettingsCache(): void {
  revalidateTag(SETTINGS_CACHE_TAG, 'max');
}

/**
 * CLUB_PLANS de site.ts com preço, dias e visibilidade vindos do painel.
 * Planos com active = false são omitidos; textos e benefícios seguem de site.ts.
 */
export function applyPlanSettings(settings: SiteSettings, plans: ClubPlan[] = CLUB_PLANS): ClubPlan[] {
  return plans
    .filter((plan) => settings.plans[plan.id].active)
    .map((plan) => {
      const s = settings.plans[plan.id];
      if (plan.id === 'presencial') return plan;
      return {
        ...plan,
        priceCents: s.price_cents,
        priceLabel: priceLabelFromCents(s.price_cents),
        accessDays: s.access_days,
        cadence: s.access_days === null ? plan.cadence : plan.id === 'clube' ? 'por mês' : `${s.access_days} dias de acesso`,
      };
    });
}

export async function getPlansFromSettings(): Promise<ClubPlan[]> {
  return applyPlanSettings(await getSettings());
}
