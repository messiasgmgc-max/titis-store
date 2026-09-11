// ============================================================
// Cotação de cupom no servidor — chama public.quote_coupon() (SECURITY DEFINER,
// liberada para anon) e devolve um resultado tipado. O desconto é sempre
// calculado pelo banco: o navegador nunca envia valores.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidCouponCode, normalizeCode } from '@/lib/coupons';
import type { CouponQuote, PlanId } from '@/lib/types';
import { HttpError } from './http';

export type CouponQuoteResult = { ok: true; quote: CouponQuote } | { ok: false; message: string };

const INVALID_CODE = 'Código de cupom inválido.';

/**
 * Normaliza e valida o formato do código enviado pelo cliente.
 * Devolve null quando o campo veio vazio (sem cupom); lança 400 quando o formato é inválido.
 */
export function readCouponCode(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new HttpError(400, 'bad_request', INVALID_CODE);
  const code = normalizeCode(value);
  if (!code) return null;
  if (!isValidCouponCode(code)) throw new HttpError(400, 'bad_request', INVALID_CODE);
  return code;
}

/** Cota o cupom para um plano e valor. Lança Error (502 na rota) se o banco falhar. */
export async function quoteCoupon(
  client: SupabaseClient,
  code: string,
  plan: PlanId,
  amountCents: number,
): Promise<CouponQuoteResult> {
  const { data, error } = await client.rpc('quote_coupon', { p_code: code, p_plan: plan, p_amount_cents: amountCents });
  if (error) {
    // Banco ainda sem a função (SQL não aplicado): responde como cupom indisponível, sem erro 500.
    const missing = error.code === '42883' || error.code === 'PGRST202' || /quote_coupon/.test(error.message);
    if (missing) return { ok: false, message: 'Os cupons ainda não estão disponíveis. Fale com o Titi pelo WhatsApp.' };
    throw new Error();
  }

  const r = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const message = typeof r.message === 'string' && r.message ? r.message : 'Cupom não encontrado ou inativo.';
  if (r.ok !== true) return { ok: false, message };

  const discount = typeof r.discount_cents === 'number' ? Math.max(0, Math.floor(r.discount_cents)) : 0;
  const finalCents = typeof r.final_cents === 'number' ? Math.max(0, Math.floor(r.final_cents)) : amountCents - discount;
  return {
    ok: true,
    quote: {
      code: typeof r.code === 'string' && r.code ? r.code : code,
      originalCents: amountCents,
      discountCents: Math.min(discount, amountCents),
      finalCents: Math.min(finalCents, amountCents),
    },
  };
}
