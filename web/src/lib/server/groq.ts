// ============================================================
// Cliente Groq (API compatível com OpenAI) — somente servidor.
// ============================================================
import { AiError } from './http';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

function apiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || null;
}

export function groqConfigured(): boolean {
  return apiKey() !== null;
}

function modelChain(): string[] {
  const fromEnv = (process.env.GROQ_MODEL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...fromEnv, ...DEFAULT_MODELS])];
}

export interface GroqMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
  error?: { message?: string; code?: string };
}

const isReasoningModel = (model: string) => model.startsWith('openai/gpt-oss');

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
}

async function post(body: Record<string, unknown>, key: string, deadline: number): Promise<{ status: number; json: ChatCompletion | null }> {
  const remaining = deadline - Date.now();
  if (remaining < 500) throw new AiError('groq', 'timeout', 'Prazo esgotado antes da chamada ao Groq.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as ChatCompletion | null;
    return { status: res.status, json };
  } catch (err) {
    if (isAbortError(err)) throw new AiError('groq', 'timeout', 'Tempo de resposta do Groq excedido.');
    throw new AiError('groq', 'upstream', 'Falha de rede ao chamar o Groq.');
  } finally {
    clearTimeout(timer);
  }
}

/** Chat com fallback de modelo. Com `json: true`, pede `response_format: json_object` (o prompt deve citar JSON). */
export async function groqChat(opts: {
  system: string;
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const key = apiKey();
  if (!key) throw new AiError('groq', 'not_configured', 'GROQ_API_KEY ausente.');
  const deadline = Date.now() + (opts.timeoutMs ?? 20_000);
  const maxTokens = opts.maxTokens ?? 700;

  let lastError: AiError | null = null;
  for (const model of modelChain()) {
    const reasoning = isReasoningModel(model);
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: 'system', content: opts.system }, ...opts.messages],
      temperature: opts.temperature ?? 0.6,
      // Nos modelos de raciocínio os tokens de pensamento também contam no limite.
      max_completion_tokens: reasoning ? maxTokens + 768 : maxTokens,
      ...(reasoning ? { reasoning_effort: 'low' } : {}),
      ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
    };

    let { status, json } = await post(body, key, deadline);
    let message = json?.error?.message?.slice(0, 240) ?? '';

    // Parâmetro opcional recusado por este modelo: repete sem ele.
    if (status === 400 && /reasoning_effort|response_format|json_object/i.test(message)) {
      delete body.reasoning_effort;
      delete body.response_format;
      ({ status, json } = await post(body, key, deadline));
      message = json?.error?.message?.slice(0, 240) ?? '';
    }

    if (status === 401 || status === 403) {
      throw new AiError('groq', 'upstream', `Credencial recusada: ${message || `HTTP ${status}`}`, status);
    }
    if (status < 200 || status >= 300) {
      const kind = status === 429 ? 'rate_limited' : 'upstream';
      if (status === 404 || /decommissioned|not found|does not exist|not supported/i.test(message)) {
        console.warn(`[groq] modelo ${model} indisponível (${status}); tentando o próximo.`);
      }
      lastError = new AiError('groq', kind, `${model}: ${message || `HTTP ${status}`}`, status);
      continue;
    }

    const content = json?.choices?.[0]?.message?.content?.trim();
    if (content) return content;
    lastError = new AiError('groq', 'invalid_response', `${model} devolveu uma resposta vazia.`);
  }
  throw lastError ?? new AiError('groq', 'upstream', 'Nenhum modelo Groq disponível.');
}
