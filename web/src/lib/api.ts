// Cliente tipado das rotas internas /api/* (as chaves de IA ficam só no servidor).
// Rotas da consultoria paga enviam o token da sessão; o servidor confere o plano ativo.
import { supabase } from './supabaseClient';
import type {
  ApiError,
  ChatMessage,
  CheckoutResponse,
  PlanId,
  ConciergeResponse,
  Diagnosis,
  Look,
  LooksResponse,
  ProductVisionSuggestion,
  SkinToneId,
  StyleRequest,
  TryOnResponse,
} from './types';

export class ApiRequestError extends Error {
  code: ApiError['code'];
  status: number;
  constructor(message: string, code: ApiError['code'], status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function sessionToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function post<T>(
  url: string,
  body: unknown,
  opts: { timeoutMs: number; token?: string | null; auth?: boolean },
): Promise<T> {
  if (opts.auth && !opts.token) opts = { ...opts, token: await sessionToken() };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as (T & Partial<ApiError>) | null;
    if (!res.ok || !data) {
      throw new ApiRequestError(
        data?.error || 'Não foi possível concluir a solicitação.',
        data?.code || (res.status === 503 ? 'not_configured' : 'internal'),
        res.status,
      );
    }
    return data as T;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiRequestError('O tempo de resposta excedeu o limite. Tente novamente.', 'upstream', 504);
    }
    throw new ApiRequestError('Falha de conexão. Verifique sua internet.', 'internal', 0);
  } finally {
    clearTimeout(timer);
  }
}

/** Leitura de colorimetria por IA a partir de uma foto (data URL). */
export function requestDiagnosis(image: string) {
  return post<{ diagnosis: Diagnosis }>('/api/diagnosis', { image }, { timeoutMs: 45_000, auth: true });
}

/** Composição de looks (IA quando configurada; motor do Atelier como garantia). */
export function requestLooks(request: StyleRequest) {
  return post<LooksResponse>('/api/looks', request, { timeoutMs: 40_000, auth: true });
}

/** Provador virtual: gera uma imagem editorial com o rosto do cliente vestindo o look. */
export function requestTryOn(input: {
  face: string;
  skinTone: SkinToneId;
  look: Pick<Look, 'title' | 'pieces' | 'palette'>;
}) {
  return post<TryOnResponse>('/api/try-on', input, { timeoutMs: 95_000, auth: true });
}

/** Cria o checkout do Mercado Pago para um plano e devolve a URL de pagamento. */
export function startCheckout(plan: PlanId, accessToken: string) {
  return post<CheckoutResponse>('/api/checkout', { plan }, { timeoutMs: 20_000, token: accessToken });
}

/** Concierge de estilo (chat com histórico). */
export function sendConcierge(input: {
  messages: ChatMessage[];
  diagnosis?: Pick<Diagnosis, 'skinTone' | 'subtone' | 'season' | 'palette'> | null;
}) {
  return post<ConciergeResponse>('/api/concierge', input, { timeoutMs: 30_000 });
}

/** Admin: sugere nome, categoria, cor e descrição a partir da foto do produto. */
export function analyzeProductPhoto(image: string, accessToken: string) {
  return post<{ suggestion: ProductVisionSuggestion }>(
    '/api/admin/product-vision',
    { image },
    { timeoutMs: 45_000, token: accessToken },
  );
}
