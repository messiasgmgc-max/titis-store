'use client';

import { useCallback, useState } from 'react';
import { ApiRequestError } from '@/lib/api';
import { beginPlanPurchase, planWhatsappText, type PurchaseOptions } from '@/lib/checkout';
import { CHECKOUT_PROVIDER, type ClubPlan } from '@/lib/site';
import { whatsappLink } from '@/lib/format';
import type { PlanId } from '@/lib/types';
import { useSession } from '@/providers/SessionProvider';

export type PurchaseState =
  | { status: 'idle' }
  | { status: 'loading'; planId: PlanId }
  | { status: 'whatsapp'; planId: PlanId; url: string }
  | { status: 'needs_account'; planId: PlanId }
  | { status: 'error'; planId: PlanId; message: string; whatsappUrl: string };

function checkoutErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.code === 'not_configured') return 'O pagamento on-line está indisponível no momento.';
    if (err.code === 'unauthorized' || err.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
    if (err.message) return err.message;
  }
  return 'Não foi possível abrir o pagamento agora.';
}

/**
 * Fluxo de compra de um plano: Mercado Pago (redireciona) ou WhatsApp (nova aba + confirmação).
 * A aba do WhatsApp é aberta de forma síncrona no clique, antes de qualquer await,
 * para não ser bloqueada pelo navegador.
 */
export function usePlanPurchase() {
  const { accessToken, profile } = useSession();
  const [state, setState] = useState<PurchaseState>({ status: 'idle' });

  const purchase = useCallback(
    async (plan: ClubPlan, opts?: { accessToken?: string | null } & PurchaseOptions) => {
      const token = opts?.accessToken ?? accessToken;
      const options: PurchaseOptions = { coupon: opts?.coupon ?? null, upgrade: opts?.upgrade ?? false };
      const needsAccount = plan.accessDays !== null && !token;
      const goesToWhatsapp = !needsAccount && (CHECKOUT_PROVIDER !== 'mercadopago' || plan.priceCents === null);

      const tab = goesToWhatsapp ? window.open('', '_blank') : null;
      if (tab) tab.opener = null;

      setState({ status: 'loading', planId: plan.id });
      try {
        const next = await beginPlanPurchase(plan, { accessToken: token, profile, ...options });
        if (next.kind === 'redirect') {
          tab?.close();
          window.location.href = next.url;
          return;
        }
        if (next.kind === 'needs_account') {
          tab?.close();
          setState({ status: 'needs_account', planId: plan.id });
          return;
        }
        if (tab && !tab.closed) tab.location.href = next.url;
        else window.location.href = next.url;
        setState({ status: 'whatsapp', planId: plan.id, url: next.url });
      } catch (err) {
        tab?.close();
        setState({
          status: 'error',
          planId: plan.id,
          message: checkoutErrorMessage(err),
          whatsappUrl: whatsappLink(planWhatsappText(plan, profile, options)),
        });
      }
    },
    [accessToken, profile],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, purchase, reset };
}
