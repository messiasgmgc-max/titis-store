// POST /api/coupon-quote — calcula o desconto de um cupom para um plano.
// Corpo: { plan: 'passe' | 'clube', code: string }
// Resposta: { quote: { code, originalCents, discountCents, finalCents } }
//   400 bad_request: plano sem checkout, código inválido, cupom inexistente/inativo/expirado/esgotado.
// Não exige login: chama public.quote_coupon() (SECURITY DEFINER) com a chave anon,
// que devolve apenas o resultado do cálculo — nunca a lista de cupons.
import { getPlan } from '@/lib/site';
import { TEN_MINUTES, clientIp, enforceRateLimit, errorResponse, jsonError, jsonOk, readJson } from '@/lib/server/http';
import { quoteCoupon, readCouponCode } from '@/lib/server/coupons';
import { createServerSupabase } from '@/lib/server/supabase-server';
import type { CouponQuote } from '@/lib/types';

export const maxDuration = 15;

export async function POST(req: Request) {
  try {
    enforceRateLimit(`coupon-quote:${clientIp(req)}`, 30, TEN_MINUTES);

    const body = await readJson(req, 2 * 1024);
    const plan = getPlan(typeof body.plan === 'string' ? body.plan : null);
    if (!plan || plan.priceCents === null || plan.priceCents <= 0 || plan.accessDays === null) {
      return jsonError(400, 'bad_request', 'Este plano não aceita cupom.');
    }

    const code = readCouponCode(body.code);
    if (!code) return jsonError(400, 'bad_request', 'Informe o código do cupom.');

    const result = await quoteCoupon(createServerSupabase(), code, plan.id, plan.priceCents);
    if (!result.ok) return jsonError(400, 'bad_request', result.message);

    return jsonOk<{ quote: CouponQuote }>({ quote: result.quote });
  } catch (err) {
    return errorResponse(err, 'coupon-quote');
  }
}
