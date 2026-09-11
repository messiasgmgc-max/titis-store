// Utilidades compartilhadas da área paga (consultoria, assinatura e travas dos overlays).
import { ApiRequestError } from '@/lib/api';
import { CLUB_PLANS, getPlan, type ClubPlan } from '@/lib/site';
import { formatBRL } from '@/lib/format';
import type { PlanId } from '@/lib/types';

/** Sobretítulo padrão da nova tipografia. */
export const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-gold';

/** Título de página/app: forte e compacto. */
export const APP_TITLE = 'font-display font-extrabold tracking-[-0.03em] text-ivory';

/** Link para a página de assinatura com o plano indicado (presencial e vazio caem no clube). */
export function plansHref(plan?: PlanId | null): string {
  const id: PlanId = plan === 'passe' ? 'passe' : 'clube';
  return `/assinar?plano=${id}`;
}

/** Plano da URL; inválido ou ausente vira o Clube. */
export function resolvePlan(id: string | null | undefined): ClubPlan {
  return getPlan(id) ?? getPlan('clube') ?? CLUB_PLANS[0];
}

/** "R$ 1,66" — valor diário equivalente (null quando não há preço ou prazo). */
export function perDayLabel(plan: ClubPlan): string | null {
  if (plan.priceCents === null || !plan.accessDays) return null;
  return formatBRL(Math.round(plan.priceCents / plan.accessDays));
}

/** dd/mm a partir de uma data ISO. */
export function formatAccessDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
}

/** 401 (sem login) ou 402 (sem plano): o recurso pago foi recusado pelo servidor. */
export function isConsultingLockError(err: unknown): err is ApiRequestError {
  return (
    err instanceof ApiRequestError &&
    (err.code === 'payment_required' || err.code === 'unauthorized' || err.status === 401 || err.status === 402)
  );
}

export function lockReason(err: ApiRequestError): 'unauthorized' | 'payment_required' {
  return err.code === 'unauthorized' || err.status === 401 ? 'unauthorized' : 'payment_required';
}

export function lockToastMessage(reason: 'unauthorized' | 'payment_required'): string {
  return reason === 'unauthorized'
    ? 'Entre na sua conta para usar a consultoria.'
    : 'Este recurso faz parte da consultoria. Ative um plano para continuar.';
}

export type ReturnStatus = 'approved' | 'pending' | 'failure';

/** Retorno do Mercado Pago (?status= ou ?collection_status=). */
export function parseReturnStatus(status: string | null, collectionStatus: string | null): ReturnStatus | null {
  const raw = (status || collectionStatus || '').toLowerCase();
  if (!raw) return null;
  if (raw === 'approved' || raw === 'success') return 'approved';
  if (raw === 'pending' || raw === 'in_process' || raw === 'in_mediation') return 'pending';
  return 'failure';
}
