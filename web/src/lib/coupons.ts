// ============================================================
// Cupons de desconto — cálculo puro, isomórfico (navegador e servidor).
// Espelha public.quote_coupon() no SQL: arredondamento para baixo, nunca negativo,
// nunca acima do valor da compra. Regra: este arquivo não importa nada com alias "@/".
// ============================================================
import type { CouponRow, PlanId } from './types';

/** Formato aceito para o código (igual ao CHECK de public.coupons). */
export const COUPON_CODE_RE = /^[A-Z0-9_-]{3,24}$/;

/** Planos que passam pelo checkout e, portanto, aceitam cupom. */
export const COUPON_PLANS: PlanId[] = ['passe', 'clube'];

/** Caixa-alta, sem espaços internos, aparado (o que o banco guarda). */
export function normalizeCode(input: string): string {
  return input.replace(/\s+/g, '').trim().toUpperCase();
}

export function isValidCouponCode(code: string): boolean {
  return COUPON_CODE_RE.test(code);
}

export type CouponDiscount = Pick<CouponRow, 'percent_off' | 'amount_off_cents'>;

export interface CouponMath {
  discountCents: number;
  finalCents: number;
}

/**
 * Aplica o desconto de um cupom a um valor em centavos.
 * Percentual: floor(valor × pct / 100). Fixo: até o valor da compra.
 * Nunca devolve valores negativos nem desconto maior que o original.
 */
export function applyCoupon(originalCents: number, coupon: CouponDiscount): CouponMath {
  const original = Number.isFinite(originalCents) ? Math.max(0, Math.floor(originalCents)) : 0;
  let discount = 0;
  if (coupon.percent_off !== null && coupon.percent_off !== undefined) {
    const pct = Math.min(100, Math.max(0, Math.floor(coupon.percent_off)));
    discount = Math.floor((original * pct) / 100);
  } else if (coupon.amount_off_cents !== null && coupon.amount_off_cents !== undefined) {
    discount = Math.max(0, Math.floor(coupon.amount_off_cents));
  }
  discount = Math.min(discount, original);
  return { discountCents: discount, finalCents: original - discount };
}

export type CouponStatus = 'active' | 'inactive' | 'expired' | 'exhausted';

/** Situação de um cupom para listas e filtros (mesma ordem de checagem do SQL). */
export function couponStatus(
  coupon: Pick<CouponRow, 'is_active' | 'expires_at' | 'max_uses' | 'used_count'>,
  now: Date = new Date(),
): CouponStatus {
  if (!coupon.is_active) return 'inactive';
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now.getTime()) return 'expired';
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return 'exhausted';
  return 'active';
}

/** Cupom vale para o plano (lista vazia = todos os planos com checkout). */
export function couponAppliesTo(coupon: Pick<CouponRow, 'plans'>, plan: PlanId): boolean {
  if (!COUPON_PLANS.includes(plan)) return false;
  return coupon.plans.length === 0 || coupon.plans.includes(plan);
}

/**
 * Valida os campos de um cupom antes de gravar (mesmas regras dos CHECKs do banco).
 * Devolve a lista de mensagens; vazia = válido.
 */
export function validateCouponInput(input: {
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  plans: PlanId[];
  max_uses: number | null;
  expires_at: string | null;
}): string[] {
  const errors: string[] = [];
  if (!isValidCouponCode(input.code)) {
    errors.push('O código deve ter de 3 a 24 caracteres: letras, números, hífen ou sublinhado.');
  }
  const hasPercent = input.percent_off !== null;
  const hasAmount = input.amount_off_cents !== null;
  if (hasPercent === hasAmount) {
    errors.push('Escolha um tipo de desconto: percentual ou valor fixo.');
  }
  if (hasPercent && (!Number.isInteger(input.percent_off) || input.percent_off! < 1 || input.percent_off! > 100)) {
    errors.push('O percentual deve ser um número inteiro entre 1 e 100.');
  }
  if (hasAmount && (!Number.isInteger(input.amount_off_cents) || input.amount_off_cents! < 0)) {
    errors.push('O valor fixo do desconto não pode ser negativo.');
  }
  if (input.max_uses !== null && (!Number.isInteger(input.max_uses) || input.max_uses < 1)) {
    errors.push('O limite de usos deve ser um número inteiro maior que zero (ou vazio).');
  }
  if (input.expires_at !== null && Number.isNaN(new Date(input.expires_at).getTime())) {
    errors.push('A data de validade é inválida.');
  }
  if (input.plans.some((p) => !COUPON_PLANS.includes(p))) {
    errors.push('Só os planos com checkout (Passe e Clube) aceitam cupom.');
  }
  return errors;
}
