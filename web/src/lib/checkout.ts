// Início da compra de um plano: WhatsApp (padrão) ou Mercado Pago (quando ativado).
import { CHECKOUT_PROVIDER, type ClubPlan } from './site';
import { whatsappLink } from './format';
import { startCheckout } from './api';
import type { CouponQuote, Profile } from './types';

export interface PurchaseOptions {
  /** Código do cupom já validado em /api/coupon-quote (opcional). */
  coupon?: string | null;
  /** Pedido de upgrade do Passe para o Clube — muda o texto da mensagem. */
  upgrade?: boolean;
}

/** Mensagem do WhatsApp com os dados da conta, para o Titi liberar o acesso certo. */
export function planWhatsappText(
  plan: ClubPlan,
  profile: Pick<Profile, 'full_name' | 'email'> | null,
  opts: PurchaseOptions = {},
): string {
  const lines: string[] = [];
  lines.push(
    opts.upgrade && plan.id === 'clube'
      ? `Olá, Titi! Quero fazer *upgrade para o ${plan.name} (${plan.priceLabel} ${plan.cadence})*.`
      : plan.whatsappText,
  );
  const code = opts.coupon?.trim().toUpperCase();
  if (code) lines.push(`Cupom: ${code}`);
  if (profile?.email) {
    if (profile.full_name) lines.push(`Nome: ${profile.full_name}`);
    lines.push(`E-mail da conta: ${profile.email}`);
  }
  return lines.join('\n');
}

export type CheckoutStart =
  | { kind: 'redirect'; url: string; quote?: CouponQuote }
  | { kind: 'whatsapp'; url: string }
  | { kind: 'needs_account' };

/**
 * Decide o próximo passo da compra.
 * - Planos com acesso digital exigem conta (o acesso é liberado nela).
 * - Presencial e o modo WhatsApp abrem a conversa com a mensagem pronta.
 */
export async function beginPlanPurchase(
  plan: ClubPlan,
  ctx: { accessToken: string | null; profile: Pick<Profile, 'full_name' | 'email'> | null } & PurchaseOptions,
): Promise<CheckoutStart> {
  if (plan.accessDays !== null && !ctx.accessToken) return { kind: 'needs_account' };

  if (CHECKOUT_PROVIDER === 'mercadopago' && plan.priceCents !== null && ctx.accessToken) {
    const { url, quote } = await startCheckout(plan.id, ctx.accessToken, ctx.coupon);
    return { kind: 'redirect', url, quote };
  }

  return { kind: 'whatsapp', url: whatsappLink(planWhatsappText(plan, ctx.profile, ctx)) };
}
