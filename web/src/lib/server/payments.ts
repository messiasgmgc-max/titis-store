// ============================================================
// Liberação de acesso a partir de um pagamento aprovado — somente servidor.
// Usado pelo webhook do Mercado Pago e pelo checkout com cupom de 100%.
// Idempotente: a linha de public.payments é "reivindicada" (applied_at) de
// forma atômica antes de tocar no perfil; o cupom só é consumido uma vez.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPlan } from '@/lib/site';
import type { PaymentStatus, PlanId } from '@/lib/types';

const DAY_MS = 86_400_000;

export interface PaymentRecord {
  id: string;
  user_id: string;
  plan: PlanId;
  amount_cents: number;
  discount_cents: number;
  coupon_code: string | null;
  status: PaymentStatus;
  provider_payment_id: string | null;
  applied_at: string | null;
}

export const PAYMENT_COLUMNS =
  'id, user_id, plan, amount_cents, discount_cents, coupon_code, status, provider_payment_id, applied_at';

/**
 * Libera o acesso uma única vez: reivindica o pagamento (applied_at nulo → agora)
 * de forma atômica, estende o perfil e registra o uso do cupom. Se o perfil
 * falhar, desfaz a marca para que a notificação possa ser reprocessada.
 */
export async function applyPaymentAccess(db: SupabaseClient, row: PaymentRecord): Promise<'applied' | 'already'> {
  const plan = getPlan(row.plan);
  if (!plan || plan.accessDays === null) return 'already';

  const { data: claimed, error: claimError } = await db
    .from('payments')
    .update({ applied_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('applied_at', null)
    .select('id');
  if (claimError) throw new Error(`marcar applied_at: ${claimError.message}`);
  if (!claimed || claimed.length === 0) return 'already';

  try {
    const result = await grantConsultingAccess(db, {
      userId: row.user_id,
      planId: plan.id,
      amountCents: row.amount_cents,
      paymentProviderId: row.provider_payment_id,
    });
    if (!result.success) throw new Error('perfil inexistente ou falha ao aplicar acesso');
  } catch (err) {
    await db
      .from('payments')
      .update({ applied_at: null })
      .eq('id', row.id)
      .then(undefined, () => undefined);
    throw err;
  }

  // Uso do cupom: só depois do acesso aplicado (e apenas nesta primeira vez).
  // Uma falha aqui não desfaz a liberação — fica registrada no log.
  if (row.coupon_code) {
    const { error: redeemError } = await db.rpc('redeem_coupon', { p_code: row.coupon_code });
    if (redeemError) {
      console.error(`[payments] cupom ${row.coupon_code} não contabilizado no pagamento ${row.id} — ${redeemError.message.slice(0, 200)}`);
    }
  }
  return 'applied';
}

export interface GrantAccessParams {
  userId?: string | null;
  email?: string | null;
  planId: PlanId;
  amountCents?: number;
  paymentProviderId?: string | null;
}

/**
 * Libera o acesso de consultoria VIP a um usuário a partir do seu ID ou e-mail.
 * Atualiza role para 'vip' (ou preserva 'admin'), estende access_until acumulando se já houver vigência,
 * desbloqueia is_blocked e sincroniza a tabela payments.
 */
export async function grantConsultingAccess(
  db: SupabaseClient,
  params: GrantAccessParams
): Promise<{ success: boolean; accessUntil: string | null; profileId: string | null }> {
  const plan = getPlan(params.planId);
  if (!plan || plan.accessDays === null) {
    return { success: false, accessUntil: null, profileId: null };
  }

  let profile: { id: string; role: string; access_until: string | null; is_blocked?: boolean } | null = null;

  if (params.userId) {
    const { data, error } = await db
      .from('profiles')
      .select('id, role, access_until, is_blocked')
      .eq('id', params.userId)
      .maybeSingle();
    if (data && !error) profile = data as any;
  }

  if (!profile && params.email) {
    const cleanEmail = params.email.trim().toLowerCase();
    const { data, error } = await db
      .from('profiles')
      .select('id, role, access_until, is_blocked')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (data && !error) profile = data as any;
  }

  if (!profile) {
    console.warn('[grantConsultingAccess] Perfil não encontrado para:', params.userId, params.email);
    return { success: false, accessUntil: null, profileId: null };
  }

  const isAdmin = profile.role === 'admin';
  const currentUntil = profile.access_until ? new Date(profile.access_until).getTime() : 0;

  let accessUntil: string | null;
  if (profile.role === 'vip' && !profile.access_until) {
    accessUntil = null; // VIP permanente permanece sem prazo
  } else {
    const base = Math.max(Date.now(), currentUntil && currentUntil > Date.now() ? currentUntil : Date.now());
    accessUntil = new Date(base + plan.accessDays * DAY_MS).toISOString();
  }

  const { error: updateError } = await db
    .from('profiles')
    .update({
      ...(isAdmin ? {} : { role: 'vip' }),
      plan: plan.id,
      access_until: accessUntil,
      is_blocked: false,
    })
    .eq('id', profile.id);

  if (updateError) {
    console.error('[grantConsultingAccess] Erro ao atualizar perfil:', updateError.message);
    throw new Error(`atualizar perfil: ${updateError.message}`);
  }

  // Sincroniza payments para garantir histórico
  try {
    const nowIso = new Date().toISOString();
    if (params.paymentProviderId) {
      const { data: existingPayment } = await db
        .from('payments')
        .select('id, status, applied_at')
        .eq('provider_payment_id', params.paymentProviderId)
        .maybeSingle();

      if (existingPayment) {
        await db
          .from('payments')
          .update({ status: 'approved', applied_at: nowIso })
          .eq('id', existingPayment.id);
      } else {
        await db.from('payments').insert({
          user_id: profile.id,
          plan: plan.id,
          amount_cents: params.amountCents || plan.priceCents || 0,
          provider: 'mercadopago',
          provider_payment_id: params.paymentProviderId,
          status: 'approved',
          applied_at: nowIso,
        });
      }
    }
  } catch (err: any) {
    console.warn('[grantConsultingAccess] Aviso ao sincronizar payments:', err?.message);
  }

  return { success: true, accessUntil, profileId: profile.id };
}

