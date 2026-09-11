import type { PlanId } from '@/lib/types';

/** Rota de compra de um plano. */
export function planHref(id: PlanId): string {
  return `/assinar?plano=${id}`;
}

/** Plano sugerido nos CTAs principais. */
export const DEFAULT_PLAN_HREF = planHref('clube');

export const DOUBT_TEXT = 'Olá, Titi! Vim pelo site e tenho uma dúvida sobre a consultoria online.';
