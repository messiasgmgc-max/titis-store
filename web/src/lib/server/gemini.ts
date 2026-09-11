// ============================================================
// Cliente Gemini (Google Generative Language API) — somente servidor.
// Cadeia de modelos com fallback, prazos via AbortController e
// tratamento de bloqueios de segurança. Nunca registra chaves nem base64.
// ============================================================
import { AiError, parseJsonLoose, type InlineImage } from './http';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const DEFAULT_TEXT_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
const DEFAULT_IMAGE_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

const TEXT_TIMEOUT_MS = 30_000;
const IMAGE_TIMEOUT_MS = 55_000;

/** Modelo que respondeu 404/"not found" fica de fora por algumas horas (por instância). */
const UNAVAILABLE_TTL_MS = 6 * 60 * 60 * 1000;
const unavailableUntil = new Map<string, number>();

function apiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function geminiConfigured(): boolean {
  return apiKey() !== null;
}

function requireKey(): string {
  const key = apiKey();
  if (!key) throw new AiError('gemini', 'not_configured', 'GEMINI_API_KEY ausente.');
  return key;
}

function envList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Modelos da variável de ambiente primeiro, depois os padrões; ignora os marcados como indisponíveis. */
function modelChain(envValue: string | undefined, defaults: string[]): string[] {
  const all = [...new Set([...envList(envValue), ...defaults])];
  const now = Date.now();
  const available = all.filter((m) => (unavailableUntil.get(m) ?? 0) <= now);
  return available.length ? available : all;
}

function markUnavailable(model: string) {
  unavailableUntil.set(model, Date.now() + UNAVAILABLE_TTL_MS);
}

// ------------------------------------------------------------
// Tipos da API
// ------------------------------------------------------------

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GeneratedImage {
  mimeType: string;
  data: string; // base64
}

interface ResponsePart {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: ResponsePart[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
}

interface RawResult {
  status: number;
  json: unknown;
}

export function imagePart(image: InlineImage): GeminiPart {
  return { inlineData: { mimeType: image.mimeType, data: image.data } };
}

// ------------------------------------------------------------
// Transporte
// ------------------------------------------------------------

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

async function postJson(url: string, body: unknown, key: string, deadline: number): Promise<RawResult> {
  const remaining = deadline - Date.now();
  if (remaining < 500) throw new AiError('gemini', 'timeout', 'Prazo esgotado antes da chamada ao Gemini.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } catch (err) {
    if (isAbortError(err)) throw new AiError('gemini', 'timeout', 'Tempo de resposta do Gemini excedido.');
    throw new AiError('gemini', 'upstream', 'Falha de rede ao chamar o Gemini.');
  } finally {
    clearTimeout(timer);
  }
}

function apiErrorMessage(json: unknown): string {
  if (typeof json === 'object' && json !== null && 'error' in json) {
    const error = (json as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === 'string') return error.message.slice(0, 240);
  }
  return '';
}

const MODEL_UNAVAILABLE_RE =
  /not found|not supported|unsupported|is not available|no longer available|does not exist|deprecated|decommissioned|retired/i;

function isModelUnavailable(status: number, message: string): boolean {
  return status === 404 || (status === 400 && MODEL_UNAVAILABLE_RE.test(message));
}

function isAuthFailure(status: number, message: string): boolean {
  return status === 401 || status === 403 || /api key/i.test(message);
}

/** Classifica uma resposta de erro: `skip` = vale tentar o próximo modelo. */
function classifyFailure(model: string, raw: RawResult, lenient: boolean): { skip: boolean; error: AiError } {
  const message = apiErrorMessage(raw.json) || `HTTP ${raw.status}`;
  if (isAuthFailure(raw.status, message)) {
    return { skip: false, error: new AiError('gemini', 'upstream', `Credencial recusada: ${message}`, raw.status) };
  }
  if (isModelUnavailable(raw.status, message)) {
    markUnavailable(model);
    console.warn(`[gemini] modelo ${model} indisponível (${raw.status}); tentando o próximo.`);
    return { skip: true, error: new AiError('gemini', 'upstream', `${model}: ${message}`, raw.status) };
  }
  if (raw.status === 429) {
    return { skip: true, error: new AiError('gemini', 'rate_limited', `${model}: cota excedida.`, raw.status) };
  }
  if (raw.status >= 500 || lenient) {
    return { skip: true, error: new AiError('gemini', 'upstream', `${model}: ${message}`, raw.status) };
  }
  return { skip: false, error: new AiError('gemini', 'upstream', `${model}: ${message}`, raw.status) };
}

const BLOCK_FINISH_RE = /SAFETY|PROHIBITED|BLOCKLIST|SPII/i;

function assertNotBlocked(data: GenerateContentResponse) {
  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) throw new AiError('gemini', 'blocked', `Solicitação bloqueada (${blockReason}).`);
  const finish = data.candidates?.[0]?.finishReason;
  if (finish && BLOCK_FINISH_RE.test(finish)) throw new AiError('gemini', 'blocked', `Resposta bloqueada (${finish}).`);
}

function extractText(data: GenerateContentResponse): string {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((p) => typeof p.text === 'string' && !p.thought)
    .map((p) => p.text)
    .join('')
    .trim();
}

const modelUrl = (model: string) => `${API_BASE}/models/${encodeURIComponent(model)}:generateContent`;

// ------------------------------------------------------------
// Texto e JSON
// ------------------------------------------------------------

interface TextCall {
  system?: string;
  contents: Array<{ role: 'user' | 'model'; parts: GeminiPart[] }>;
  generationConfig: Record<string, unknown>;
  timeoutMs: number;
}

async function generateTextInternal({ system, contents, generationConfig, timeoutMs }: TextCall): Promise<string> {
  const key = requireKey();
  const deadline = Date.now() + timeoutMs;
  const body = {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig,
  };

  let lastError: AiError | null = null;
  for (const model of modelChain(process.env.GEMINI_TEXT_MODEL, DEFAULT_TEXT_MODELS)) {
    const raw = await postJson(modelUrl(model), body, key, deadline);
    if (raw.status < 200 || raw.status >= 300) {
      const failure = classifyFailure(model, raw, false);
      if (!failure.skip) throw failure.error;
      lastError = failure.error;
      continue;
    }
    const data = (raw.json ?? {}) as GenerateContentResponse;
    assertNotBlocked(data);
    const text = extractText(data);
    if (text) return text;
    lastError = new AiError('gemini', 'invalid_response', `${model} devolveu uma resposta vazia.`);
  }
  throw lastError ?? new AiError('gemini', 'upstream', 'Nenhum modelo Gemini disponível.');
}

/** Gera JSON estruturado. O resultado deve ser validado pelo chamador. */
export async function generateGeminiJson<T = unknown>(opts: {
  system: string;
  parts: GeminiPart[];
  temperature?: number;
  timeoutMs?: number;
}): Promise<T> {
  const text = await generateTextInternal({
    system: opts.system,
    contents: [{ role: 'user', parts: opts.parts }],
    generationConfig: { temperature: opts.temperature ?? 0.4, responseMimeType: 'application/json' },
    timeoutMs: opts.timeoutMs ?? TEXT_TIMEOUT_MS,
  });
  const parsed = parseJsonLoose(text);
  if (parsed === undefined) throw new AiError('gemini', 'invalid_response', 'O Gemini não devolveu JSON válido.');
  return parsed as T;
}

/** Conversa em texto livre (papéis user/model). */
export async function generateGeminiText(opts: {
  system: string;
  messages: GeminiMessage[];
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const contents = opts.messages
    .filter((m) => m.content.trim().length > 0)
    .map((m) => ({ role: m.role, parts: [{ text: m.content }] as GeminiPart[] }));
  // A conversa precisa começar pelo usuário.
  while (contents.length && contents[0].role !== 'user') contents.shift();
  if (!contents.length) throw new AiError('gemini', 'invalid_response', 'Conversa sem mensagem do usuário.');

  return generateTextInternal({
    system: opts.system,
    contents,
    generationConfig: { temperature: opts.temperature ?? 0.7 },
    timeoutMs: opts.timeoutMs ?? TEXT_TIMEOUT_MS,
  });
}

// ------------------------------------------------------------
// Imagem (Nano Banana)
// ------------------------------------------------------------

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

function validImage(mimeType: unknown, data: unknown): GeneratedImage | null {
  if (typeof data !== 'string' || data.length < 128) return null;
  const clean = data.replace(/\s+/g, '');
  if (!BASE64_RE.test(clean)) return null;
  const mime = typeof mimeType === 'string' && mimeType.startsWith('image/') ? mimeType : 'image/png';
  return { mimeType: mime, data: clean };
}

function imageFromParts(data: GenerateContentResponse): GeneratedImage | null {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  let found: GeneratedImage | null = null;
  let foundThought: GeneratedImage | null = null;
  for (const part of parts) {
    const inline = part.inlineData
      ? validImage(part.inlineData.mimeType, part.inlineData.data)
      : part.inline_data
        ? validImage(part.inline_data.mime_type, part.inline_data.data)
        : null;
    if (!inline) continue;
    // Modelos com raciocínio podem devolver rascunhos marcados como "thought": fica a última imagem final.
    if (part.thought) foundThought = inline;
    else found = inline;
  }
  return found ?? foundThought;
}

/** Procura imagens em `outputs[]` e `steps[].content[]` da Interactions API. */
function imageFromInteraction(json: unknown): GeneratedImage | null {
  let found: GeneratedImage | null = null;
  const visit = (node: unknown, depth: number) => {
    if (depth > 6 || node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, depth + 1));
      return;
    }
    const obj = node as Record<string, unknown>;
    const mime = obj.mime_type ?? obj.mimeType;
    const looksLikeImage = obj.type === 'image' || (typeof mime === 'string' && mime.startsWith('image/'));
    if (looksLikeImage && typeof obj.data === 'string') {
      const img = validImage(mime, obj.data);
      if (img) found = img;
      return;
    }
    for (const key of ['outputs', 'steps', 'content', 'output', 'parts', 'image']) {
      if (key in obj) visit(obj[key], depth + 1);
    }
  };
  visit(json, 0);
  return found;
}

/** Gera uma imagem a partir de texto + imagens de referência. */
export async function generateGeminiImage(opts: {
  prompt: string;
  images: InlineImage[];
  aspectRatio?: string;
  timeoutMs?: number;
}): Promise<GeneratedImage> {
  const key = requireKey();
  const aspectRatio = opts.aspectRatio ?? '3:4';
  const deadline = Date.now() + (opts.timeoutMs ?? IMAGE_TIMEOUT_MS);
  const models = modelChain(process.env.GEMINI_IMAGE_MODEL, DEFAULT_IMAGE_MODELS);

  const buildBody = (withImageConfig: boolean) => ({
    contents: [{ role: 'user', parts: [{ text: opts.prompt }, ...opts.images.map(imagePart)] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      ...(withImageConfig ? { imageConfig: { aspectRatio } } : {}),
    },
  });

  let lastError: AiError | null = null;
  let withImageConfig = true;

  // 1) generateContent com modalidade de imagem
  for (const model of models) {
    let raw = await postJson(modelUrl(model), buildBody(withImageConfig), key, deadline);
    if (raw.status === 400 && withImageConfig && /image_?config|aspect_?ratio/i.test(apiErrorMessage(raw.json))) {
      withImageConfig = false;
      raw = await postJson(modelUrl(model), buildBody(false), key, deadline);
    }
    if (raw.status < 200 || raw.status >= 300) {
      const failure = classifyFailure(model, raw, true);
      if (!failure.skip) throw failure.error;
      lastError = failure.error;
      continue;
    }
    const data = (raw.json ?? {}) as GenerateContentResponse;
    assertNotBlocked(data);
    const image = imageFromParts(data);
    if (image) return image;
    lastError = new AiError('gemini', 'invalid_response', `${model} não devolveu imagem.`);
  }

  // 2) Interactions API (formato de resposta de imagem explícito)
  for (const model of models) {
    if (deadline - Date.now() < 5_000) break;
    const raw = await postJson(
      `${API_BASE}/interactions`,
      {
        model,
        input: [
          { type: 'text', text: opts.prompt },
          ...opts.images.map((img) => ({ type: 'image', mime_type: img.mimeType, data: img.data })),
        ],
        response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: aspectRatio },
      },
      key,
      deadline,
    );
    if (raw.status < 200 || raw.status >= 300) {
      const message = apiErrorMessage(raw.json);
      if (/safety|blocked|prohibited/i.test(message)) {
        throw new AiError('gemini', 'blocked', `Interactions bloqueada: ${message}`, raw.status);
      }
      const failure = classifyFailure(model, raw, true);
      if (!failure.skip) throw failure.error;
      lastError = lastError ?? failure.error;
      continue;
    }
    const image = imageFromInteraction(raw.json);
    if (image) return image;
  }

  throw lastError ?? new AiError('gemini', 'invalid_response', 'Nenhuma imagem foi gerada.');
}
