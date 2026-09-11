// Início da compra de um plano: WhatsApp (padrão) ou Mercado Pago (quando ativado).
import { CHECKOUT_PROVIDER, type ClubPlan } from './site';
import { whatsappLink } from './format';
import { startCheckout } from './api';
import type { Profile } from './types';

/** Mensagem do WhatsApp com os dados da conta, para o Titi liberar o acesso certo. */
export function planWhatsappText(plan: ClubPlan, profile: Pick<Profile, 'full_name' | 'email'> | null): string {
  if (!profile?.email) return plan.whatsappText;
  const name = profile.full_name ? `\nNome: ${profile.full_name}` : '';
  return `${plan.whatsappText}${name}\nE-mail da conta: ${profile.email}`;
}

export type CheckoutStart =
  | { kind: 'redirect'; url: string }
  | { kind: 'whatsapp'; url: string }
  | { kind: 'needs_account' };

/**
 * Decide o próximo passo da compra.
 * - Planos com acesso digital exigem conta (o acesso é liberado nela).
 * - Presencial e o modo WhatsApp abrem a conversa com a mensagem pronta.
 */
export async function beginPlanPurchase(
  plan: ClubPlan,
  ctx: { accessToken: string | null; profile: Pick<Profile, 'full_name' | 'email'> | null },
): Promise<CheckoutStart> {
  if (plan.accessDays !== null && !ctx.accessToken) return { kind: 'needs_account' };

  if (CHECKOUT_PROVIDER === 'mercadopago' && plan.priceCents !== null && ctx.accessToken) {
    const { url } = await startCheckout(plan.id, ctx.accessToken);
    return { kind: 'redirect', url };
  }

  return { kind: 'whatsapp', url: whatsappLink(planWhatsappText(plan, ctx.profile)) };
}
