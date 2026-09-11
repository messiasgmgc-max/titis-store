// ============================================================
// Utilitários HTTP das rotas /api/* — somente servidor.
// Erros padronizados, leitura segura de JSON, imagens em data URL
// e limitação de requisições em memória (best-effort por instância).
// ============================================================
import type { ApiError } from '@/lib/types';

type ErrorCode = ApiError['code'];

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** Erro de requisição que a rota converte diretamente em resposta JSON. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly headers?: Record<string, string>;

  constructor(status: number, code: ErrorCode, message: string, headers?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export type AiErrorKind = 'not_configured' | 'blocked' | 'timeout' | 'rate_limited' | 'upstream' | 'invalid_response';

/** Falha de um provedor de IA (Gemini/Groq). A mensagem nunca contém chaves nem base64. */
export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly provider: 'gemini' | 'groq';
  readonly status?: number;

  constructor(provider: 'gemini' | 'groq', kind: AiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AiError';
    this.provider = provider;
    this.kind = kind;
    this.status = status;
  }
}

export function jsonError(status: number, code: ErrorCode, message: string, headers?: Record<string, string>): Response {
  const body: ApiError = { error: message, code };
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status, headers: NO_STORE });
}

/** Converte qualquer erro lançado na rota em uma resposta amigável (sem vazar detalhes internos). */
export function errorResponse(err: unknown, scope: string): Response {
  if (err instanceof HttpError) return jsonError(err.status, err.code, err.message, err.headers);
  if (err instanceof AiError) {
    console.error(`[api/${scope}] ${err.provider}:${err.kind}${err.status ? ` (${err.status})` : ''} — ${err.message}`);
    switch (err.kind) {
      case 'not_configured':
        return jsonError(503, 'not_configured', 'Este recurso ainda não está disponível.');
      case 'blocked':
        return jsonError(422, 'bad_request', 'Não foi possível processar esta imagem. Tente outra foto, de frente e bem iluminada.');
      case 'timeout':
        return jsonError(504, 'upstream', 'O tempo de resposta excedeu o limite. Tente novamente em instantes.');
      case 'rate_limited':
        return jsonError(429, 'rate_limited', 'Muitas solicitações no momento. Aguarde alguns instantes e tente de novo.');
      default:
        return jsonError(502, 'upstream', 'Não foi possível concluir agora. Tente novamente em instantes.');
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[api/${scope}] erro inesperado — ${message.slice(0, 300)}`);
  return jsonError(500, 'internal', 'Algo saiu do previsto. Tente novamente.');
}

// ------------------------------------------------------------
// Corpo JSON
// ------------------------------------------------------------

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Lê o corpo como JSON com limite de bytes (verifica Content-Length e o fluxo real).
 * Exige um objeto na raiz. Lança HttpError 400/413.
 */
export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError(413, 'bad_request', 'O conteúdo enviado é grande demais.');
  }
  if (!req.body) throw new HttpError(400, 'bad_request', 'Corpo da requisição ausente.');

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new HttpError(413, 'bad_request', 'O conteúdo enviado é grande demais.');
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, 'bad_request', 'Não foi possível ler a requisição.');
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'bad_request', 'JSON inválido.');
  }
  if (!isRecord(parsed)) throw new HttpError(400, 'bad_request', 'Formato de requisição inválido.');
  return parsed;
}

// ------------------------------------------------------------
// Imagens (data URL base64)
// ------------------------------------------------------------

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface InlineImage {
  mimeType: ImageMime;
  data: string; // base64 puro, sem prefixo
}

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const DATA_URL_RE = /^data:(image\/(?:jpeg|jpg|png|webp));base64,/i;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Bytes decodificados aproximados de uma string base64. */
export function base64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** Valida um data URL de imagem JPEG/PNG/WEBP. Lança HttpError 400/413. */
export function parseImageDataUrl(value: unknown, maxBytes = MAX_IMAGE_BYTES): InlineImage {
  if (typeof value !== 'string' || value.length === 0) {
    throw new HttpError(400, 'bad_request', 'Envie uma foto válida.');
  }
  const match = DATA_URL_RE.exec(value.slice(0, 40));
  if (!match) throw new HttpError(400, 'bad_request', 'Formato de imagem não suportado. Use JPG, PNG ou WEBP.');

  const data = value.slice(match[0].length).replace(/\s+/g, '');
  if (data.length < 64 || data.length % 4 !== 0 || !BASE64_RE.test(data)) {
    throw new HttpError(400, 'bad_request', 'A imagem enviada está corrompida.');
  }
  if (base64Bytes(data) > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new HttpError(413, 'bad_request', `A imagem é grande demais (limite de ${mb} MB).`);
  }

  const raw = match[1].toLowerCase();
  const mimeType: ImageMime = raw === 'image/jpg' ? 'image/jpeg' : (raw as ImageMime);
  return { mimeType, data };
}

// ------------------------------------------------------------
// Validação de texto e cores
// ------------------------------------------------------------

/** Minúsculas sem acentos, para comparar enums e detectar intenções ("Médio" → "medio"). */
export function foldText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/** String aparada e limitada; `null` se não for texto ou estiver vazia. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Normaliza #RGB/#RRGGBB (com ou sem #) para #RRGGBB maiúsculo; `null` se inválido. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`;
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toUpperCase()}`;
  }
  return null;
}

/** Primeiro objeto `{...}` balanceado dentro de um texto (respeita strings e escapes). */
function extractFirstObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Interpreta JSON devolvido por modelos de linguagem: remove cercas de código
 * e, se necessário, extrai o primeiro objeto. `undefined` quando não há JSON válido.
 */
export function parseJsonLoose(text: string): unknown {
  let cleaned = text.trim();
  const fence = /```(?:json|JSON)?\s*([\s\S]*?)```/.exec(cleaned);
  if (fence) cleaned = fence[1].trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const candidate = extractFirstObject(cleaned) ?? extractFirstObject(text);
    if (!candidate) return undefined;
    try {
      return JSON.parse(candidate);
    } catch {
      return undefined;
    }
  }
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// ------------------------------------------------------------
// Limitação de requisições (janela fixa, em memória)
// ------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Conta uma requisição para `key`. Best-effort: cada instância serverless tem sua própria memória. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;

  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), retryAfterSec };
}

/** Aplica o limite por IP (ou chave informada) e lança HttpError 429 quando excedido. */
export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const result = rateLimit(key, limit, windowMs);
  if (!result.allowed) {
    const minutes = Math.ceil(result.retryAfterSec / 60);
    throw new HttpError(
      429,
      'rate_limited',
      `Você atingiu o limite de solicitações. Tente novamente em ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}.`,
      { 'Retry-After': String(result.retryAfterSec) },
    );
  }
}

/** IP do cliente a partir dos cabeçalhos do proxy (Vercel/Nginx). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  const ip = first || req.headers.get('x-real-ip')?.trim() || 'anon';
  return ip.slice(0, 64);
}

export const TEN_MINUTES = 10 * 60 * 1000;
