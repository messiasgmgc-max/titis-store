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
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('role, access_until')
      .eq('id', row.user_id)
      .maybeSingle();
    if (profileError) throw new Error(`ler perfil: ${profileError.message}`);
    if (!profile) throw new Error('perfil inexistente');

    const current = profile as { role?: unknown; access_until?: unknown };
    const isAdmin = current.role === 'admin';
    const currentUntil = typeof current.access_until === 'string' ? current.access_until : null;

    // VIP sem prazo continua sem prazo; nos demais casos soma a partir do maior entre agora e o prazo atual.
    let accessUntil: string | null;
    if (current.role === 'vip' && currentUntil === null) {
      accessUntil = null;
    } else {
      const base = Math.max(Date.now(), currentUntil ? new Date(currentUntil).getTime() || 0 : 0);
      accessUntil = new Date(base + plan.accessDays * DAY_MS).toISOString();
    }

    const { error: updateError } = await db
      .from('profiles')
      .update({ ...(isAdmin ? {} : { role: 'vip' }), plan: plan.id, access_until: accessUntil })
      .eq('id', row.user_id);
    if (updateError) throw new Error(`atualizar perfil: ${updateError.message}`);
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
