// POST /api/checkout — cria o pagamento de um plano no Mercado Pago e devolve a URL do checkout.
// Ativo apenas com MERCADOPAGO_ACCESS_TOKEN e SUPABASE_SERVICE_ROLE_KEY; sem eles responde 503
// e o site segue com a compra pelo WhatsApp.
import { getPlan } from '@/lib/site';
import {
  TEN_MINUTES,
  clientIp,
  enforceRateLimit,
  errorResponse,
  jsonError,
  jsonOk,
  readJson,
} from '@/lib/server/http';
import {
  MercadoPagoError,
  createPreference,
  createServiceSupabase,
  mercadoPagoConfigured,
} from '@/lib/server/mercadopago';
import { bearerToken, createServerSupabase } from '@/lib/server/supabase-server';
import type { CheckoutResponse } from '@/lib/types';

export const maxDuration = 30;

function siteOrigin(req: Request): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (/^https?:\/\/[^\s/]+/i.test(configured)) return configured;
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  try {
    enforceRateLimit(`checkout:${clientIp(req)}`, 20, TEN_MINUTES);

    const token = bearerToken(req);
    if (!token) return jsonError(401, 'unauthorized', 'Entre na sua conta para assinar um plano.');

    const { data: auth, error: authError } = await createServerSupabase(token).auth.getUser(token);
    if (authError || !auth.user) return jsonError(401, 'unauthorized', 'Sua sessão expirou. Entre novamente.');
    const user = auth.user;

    enforceRateLimit(`checkout-user:${user.id}`, 6, TEN_MINUTES);

    const body = await readJson(req, 4 * 1024);
    const plan = getPlan(typeof body.plan === 'string' ? body.plan : null);
    if (!plan || plan.priceCents === null || plan.priceCents <= 0 || plan.accessDays === null) {
      return jsonError(400, 'bad_request', 'Este plano não está disponível para pagamento online.');
    }

    if (!mercadoPagoConfigured()) {
      return jsonError(503, 'not_configured', 'Pagamento online indisponível. Finalize pelo WhatsApp.');
    }

    const service = createServiceSupabase();
    const { data: row, error: insertError } = await service
      .from('payments')
      .insert({
        user_id: user.id,
        plan: plan.id,
        amount_cents: plan.priceCents,
        provider: 'mercadopago',
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !row) {
      console.error(`[api/checkout] não foi possível registrar o pagamento — ${insertError?.message.slice(0, 200) ?? 'sem linha'}`);
      return jsonError(502, 'upstream', 'Não foi possível iniciar o pagamento agora. Tente novamente em instantes.');
    }
    const paymentId = String((row as { id: unknown }).id);

    try {
      const preference = await createPreference({
        plan,
        user: { id: user.id, email: user.email },
        origin: siteOrigin(req),
        externalReference: paymentId,
      });
      return jsonOk<CheckoutResponse>({ provider: 'mercadopago', url: preference.url });
    } catch (err) {
      // A linha pendente não terá pagamento associado: marca como cancelada.
      await service
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId)
        .then(undefined, () => undefined);
      if (err instanceof MercadoPagoError) {
        console.error(`[api/checkout] Mercado Pago (${err.status}) — ${err.message}`);
        return jsonError(502, 'upstream', 'Não foi possível abrir o checkout agora. Tente novamente ou finalize pelo WhatsApp.');
      }
      throw err;
    }
  } catch (err) {
    return errorResponse(err, 'checkout');
  }
}
