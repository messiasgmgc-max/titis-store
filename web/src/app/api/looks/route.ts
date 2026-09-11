// POST /api/looks — compõe três looks para o contexto do cliente.
// IA (Gemini, depois Groq) quando configurada; o motor do Atelier é a garantia determinística.
import { getActiveCatalog } from '@/lib/server/catalog';
import { generateGeminiJson, geminiConfigured } from '@/lib/server/gemini';
import { groqChat, groqConfigured } from '@/lib/server/groq';
import {
  AiError,
  HttpError,
  TEN_MINUTES,
  clampInt,
  cleanText,
  clientIp,
  enforceRateLimit,
  errorResponse,
  isRecord,
  jsonOk,
  normalizeHex,
  parseJsonLoose,
  rateLimit,
  readJson,
} from '@/lib/server/http';
import { deltaE } from '@/lib/stylist/color';
import { describeContext, generateLooks, interpretVenue, scoreHarmony, targetFormality } from '@/lib/stylist/engine';
import {
  CLIMATES,
  CONTRASTS,
  OCCASIONS,
  STYLES,
  SUBTONES,
  TIMES_OF_DAY,
  getSeason,
  isContrast,
  isSkinToneId,
  isSubtone,
  skinToneName,
  type SeasonProfile,
} from '@/lib/stylist/knowledge';
import {
  PIECE_SLOTS,
  type ColorSwatch,
  type Look,
  type LookPiece,
  type LooksResponse,
  type PieceSlot,
  type Product,
  type StyleRequest,
} from '@/lib/types';

export const maxDuration = 45;

/** Orçamento total das chamadas de IA (o cliente espera até 40 s). */
const AI_BUDGET_MS = 32_000;
/** Distância CIE76 abaixo da qual uma cor é considerada "a mesma" de uma cor a evitar. */
const AVOID_DELTA_E = 10;
/** Slots próximos do rosto, onde as cores a evitar são vetadas. */
const FACE_SLOTS: PieceSlot[] = ['sobreposicao', 'superior'];

// ------------------------------------------------------------
// Validação da requisição
// ------------------------------------------------------------

function pick<T extends string>(value: unknown, ids: readonly T[]): T | null {
  return typeof value === 'string' && (ids as readonly string[]).includes(value) ? (value as T) : null;
}

function parseStyleRequest(body: Record<string, unknown>): StyleRequest {
  const skinTone = isSkinToneId(body.skinTone) ? body.skinTone : null;
  const subtone = isSubtone(body.subtone) ? body.subtone : null;
  const contrast = isContrast(body.contrast) ? body.contrast : null;
  const occasion = pick(body.occasion, OCCASIONS.map((o) => o.id));
  const timeOfDay = pick(body.timeOfDay, TIMES_OF_DAY.map((t) => t.id));
  const climate = pick(body.climate, CLIMATES.map((c) => c.id));
  const style = pick(body.style, STYLES.map((s) => s.id));
  if (!skinTone || !subtone || !contrast || !occasion || !timeOfDay || !climate || !style) {
    throw new HttpError(400, 'bad_request', 'Preferências incompletas. Revise tom de pele, ocasião, horário, clima e estilo.');
  }

  let customVenue: string | undefined;
  if (body.customVenue !== undefined && body.customVenue !== null) {
    if (typeof body.customVenue !== 'string') throw new HttpError(400, 'bad_request', 'Descrição do local inválida.');
    const venue = body.customVenue.replace(/\s+/g, ' ').trim();
    if (venue.length > 200) throw new HttpError(400, 'bad_request', 'Descreva o local em até 200 caracteres.');
    if (venue) customVenue = venue;
  }

  return { skinTone, subtone, contrast, occasion, timeOfDay, climate, style, ...(customVenue ? { customVenue } : {}) };
}

// ------------------------------------------------------------
// Prompt
// ------------------------------------------------------------

const SYSTEM = `Você é o stylist-chefe do Atelier da Titi's Store, consultoria de imagem masculina e alfaiataria.
Compõe looks completos, elegantes e usáveis, com domínio de colorimetria (12 estações), proporção, formalidade e tecidos.
Escreve em português do Brasil, com tom sofisticado, conciso e confiante. Nunca cita marcas, preços ou disponibilidade.
Responde somente com JSON válido.`;

const swatches = (list: ColorSwatch[]) => list.map((c) => `${c.name} ${c.hex}`).join(', ');
const labelOf = <T extends { id: string; title?: string; name?: string }>(list: T[], id: string) => {
  const item = list.find((x) => x.id === id);
  return item?.title ?? item?.name ?? id;
};

function catalogForPrompt(req: StyleRequest, catalog: Product[]) {
  const suitable = catalog.filter((p) => p.skin_tones.length === 0 || p.skin_tones.includes(req.skinTone));
  return (suitable.length >= 4 ? suitable : catalog).slice(0, 40).map((p) => ({
    id: p.id,
    name: p.name,
    slot: p.slot,
    color: p.color_name,
    hex: p.hex_color,
    fabric: p.fabric,
    formality: p.formality,
    occasions: p.occasions,
    climates: p.climates,
  }));
}

function venueLine(req: StyleRequest): string | null {
  if (!req.customVenue) return null;
  const hint = interpretVenue(req.customVenue);
  const details = [
    hint.occasion ? `ocasião provável ${labelOf(OCCASIONS, hint.occasion)}` : '',
    hint.formalityDelta ? `ajuste de formalidade ${hint.formalityDelta > 0 ? '+' : ''}${hint.formalityDelta}` : '',
    hint.climateHint ? `clima ${labelOf(CLIMATES, hint.climateHint)}` : '',
    hint.keywords.length ? `palavras-chave: ${hint.keywords.slice(0, 6).join(', ')}` : '',
  ].filter(Boolean);
  return `- Local descrito pelo cliente: "${req.customVenue}"${details.length ? ` (leitura: ${details.join('; ')})` : ''}`;
}

function buildPrompt(req: StyleRequest, season: SeasonProfile, catalog: Product[]): string {
  const occasion = OCCASIONS.find((o) => o.id === req.occasion);
  const climate = CLIMATES.find((c) => c.id === req.climate);
  const style = STYLES.find((s) => s.id === req.style);
  const target = clampInt(targetFormality(req), 1, 5, 3);

  return [
    'CLIENTE',
    `- Pele ${skinToneName(req.skinTone)}, subtom ${labelOf(SUBTONES, req.subtone).toLowerCase()}, contraste ${labelOf(CONTRASTS, req.contrast).toLowerCase()}.`,
    `- Estação cromática: ${season.name}. Metais: ${season.metals === 'ambos' ? 'ouro ou prata' : season.metals}.`,
    `- Cores que valorizam (destaque perto do rosto): ${swatches(season.palette)}.`,
    `- Neutros de base (calças, sapatos, sobreposições): ${swatches(season.neutrals)}.`,
    `- Cores proibidas (não use em nenhuma peça): ${swatches(season.avoid)}.`,
    `- Nota da estação: ${season.note}`,
    '',
    'CONTEXTO',
    `- Ocasião: ${occasion?.title ?? req.occasion}${occasion ? ` (${occasion.description})` : ''}.`,
    venueLine(req),
    `- Horário: ${labelOf(TIMES_OF_DAY, req.timeOfDay)}. Clima: ${climate ? `${climate.title} (${climate.range})` : req.climate}.`,
    `- Estilo: ${style ? `${style.title} — ${style.description}` : req.style}.`,
    `- Formalidade alvo: ${target} de 5.`,
    '',
    'ACERVO DA LOJA (priorize estas peças quando fizerem sentido e copie o "id" exato em productId):',
    JSON.stringify(catalogForPrompt(req, catalog)),
    '',
    'REGRAS',
    '1. Crie exatamente 3 looks diferentes entre si: um mais sóbrio, um intermediário e um com mais personalidade, todos dentro do estilo pedido.',
    '2. Cada look tem de 3 a 6 peças, no máximo uma por slot, exceto "acessorio" (até 2). Slots: sobreposicao, superior, inferior, calcado, acessorio.',
    '3. Peça do acervo: productId com o id exato. Peça genérica: productId null e nome descritivo (ex.: "Camisa de linho com colarinho padre").',
    '4. hex no formato #RRGGBB coerente com o nome da cor. Nunca use as cores proibidas; perto do rosto, prefira as cores que valorizam.',
    '5. Respeite horário, clima (peso do tecido) e a formalidade alvo.',
    '6. title até 40 caracteres; tagline até 90; rationale até 280, explicando por que o look funciona para esta pessoa e este contexto; tip até 160, com um detalhe de alfaiate (caimento, barra, proporção ou textura).',
    '',
    'FORMATO',
    '{"looks":[{"title":"","tagline":"","rationale":"","tip":"","formality":3,"pieces":[{"slot":"superior","name":"","color":"","hex":"#000000","fabric":"","productId":null}]}]}',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

// ------------------------------------------------------------
// Normalização da resposta da IA
// ------------------------------------------------------------

function readSlot(value: unknown): PieceSlot | null {
  return typeof value === 'string' && (PIECE_SLOTS as string[]).includes(value) ? (value as PieceSlot) : null;
}

function normalizePieces(value: unknown, byId: Map<string, Product>, season: SeasonProfile): LookPiece[] | null {
  if (!Array.isArray(value)) return null;
  const pieces: LookPiece[] = [];
  const perSlot = new Map<PieceSlot, number>();

  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const rawId = typeof entry.productId === 'string' ? entry.productId.trim() : '';
    const modelSlot = readSlot(entry.slot);
    let product = rawId ? byId.get(rawId) : undefined;
    // Id que não corresponde ao slot indicado costuma ser engano do modelo: mantém a peça genérica.
    if (product && modelSlot && product.slot !== modelSlot) product = undefined;

    const slot = product?.slot ?? modelSlot;
    if (!slot) continue;

    const name = product?.name ?? cleanText(entry.name, 70);
    const hex = (product && normalizeHex(product.hex_color)) || normalizeHex(entry.hex);
    if (!name || !hex) continue;
    const color = (product?.color_name && cleanText(product.color_name, 40)) || cleanText(entry.color, 40) || '';
    const fabric = (product?.fabric && cleanText(product.fabric, 60)) || cleanText(entry.fabric, 60);

    const used = perSlot.get(slot) ?? 0;
    if (used >= (slot === 'acessorio' ? 2 : 1)) continue;

    // Cor a evitar perto do rosto invalida o look inteiro.
    if (FACE_SLOTS.includes(slot) && season.avoid.some((a) => deltaE(a.hex, hex) < AVOID_DELTA_E)) return null;

    perSlot.set(slot, used + 1);
    pieces.push({ slot, name, color, hex, ...(fabric ? { fabric } : {}), productId: product ? product.id : null });
    if (pieces.length === 6) break;
  }

  if (pieces.length < 3) return null;
  return pieces.sort((a, b) => PIECE_SLOTS.indexOf(a.slot) - PIECE_SLOTS.indexOf(b.slot));
}

function paletteFrom(pieces: LookPiece[]): ColorSwatch[] {
  const out: ColorSwatch[] = [];
  for (const piece of pieces) {
    if (out.some((c) => c.hex === piece.hex)) continue;
    out.push({ name: piece.color || piece.name, hex: piece.hex });
    if (out.length === 5) break;
  }
  return out;
}

function normalizeLooks(raw: unknown, req: StyleRequest, catalog: Product[], fallback: Look[]): Look[] | null {
  const list = isRecord(raw) && Array.isArray(raw.looks) ? raw.looks : Array.isArray(raw) ? raw : null;
  if (!list) return null;

  const season = getSeason(req.skinTone, req.subtone);
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const defaultFormality = clampInt(targetFormality(req), 1, 5, 3);
  const looks: Look[] = [];

  for (const item of list) {
    if (!isRecord(item)) continue;
    const title = cleanText(item.title, 60);
    const pieces = normalizePieces(item.pieces, byId, season);
    if (!title || !pieces) continue;
    if (looks.some((l) => l.title.toLowerCase() === title.toLowerCase())) continue;

    looks.push({
      id: `ai-${crypto.randomUUID().slice(0, 8)}`,
      title,
      tagline: cleanText(item.tagline, 120) ?? '',
      rationale: cleanText(item.rationale, 420) ?? '',
      formality: clampInt(item.formality, 1, 5, defaultFormality),
      harmony: clampInt(scoreHarmony(pieces, req), 0, 100, 0),
      palette: paletteFrom(pieces),
      pieces,
      tip: cleanText(item.tip, 220) ?? '',
      source: 'ai',
    });
    if (looks.length === 3) break;
  }

  if (looks.length < 2) return null;
  // Completa com o motor do Atelier se a IA entregou só dois looks válidos.
  for (const look of fallback) {
    if (looks.length >= 3) break;
    looks.push(look);
  }
  return looks;
}

async function composeWithAi(req: StyleRequest, catalog: Product[], fallback: Look[]): Promise<Look[] | null> {
  const season = getSeason(req.skinTone, req.subtone);
  const prompt = buildPrompt(req, season, catalog);
  const deadline = Date.now() + AI_BUDGET_MS;

  const providers: Array<{ name: string; run: (timeoutMs: number) => Promise<unknown> }> = [];
  if (geminiConfigured()) {
    providers.push({
      name: 'gemini',
      run: (timeoutMs) => generateGeminiJson({ system: SYSTEM, parts: [{ text: prompt }], temperature: 0.8, timeoutMs }),
    });
  }
  if (groqConfigured()) {
    providers.push({
      name: 'groq',
      run: async (timeoutMs) => {
        const text = await groqChat({
          system: SYSTEM,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          maxTokens: 2400,
          json: true,
          timeoutMs,
        });
        const parsed = parseJsonLoose(text);
        if (parsed === undefined) throw new AiError('groq', 'invalid_response', 'O Groq não devolveu JSON válido.');
        return parsed;
      },
    });
  }

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const remaining = deadline - Date.now();
    if (remaining < 6_000) break;
    // Havendo um segundo provedor, o primeiro não consome todo o orçamento.
    const timeoutMs = i === 0 && providers.length > 1 ? Math.min(remaining - 10_000, 20_000) : remaining;
    try {
      const looks = normalizeLooks(await provider.run(timeoutMs), req, catalog, fallback);
      if (looks) return looks;
      console.warn(`[api/looks] resposta de ${provider.name} descartada na validação.`);
    } catch (err) {
      const detail =
        err instanceof AiError ? `${err.kind}${err.status ? ` ${err.status}` : ''} — ${err.message}` : String(err);
      console.warn(`[api/looks] ${provider.name} falhou: ${detail.slice(0, 240)}`);
    }
  }
  return null;
}

// ------------------------------------------------------------
// Handler
// ------------------------------------------------------------

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    // Limite duro contra abuso; o limite de IA (abaixo) apenas desvia para o motor do Atelier.
    enforceRateLimit(`looks:${ip}`, 120, TEN_MINUTES);

    const body = await readJson(req, 16 * 1024);
    const request = parseStyleRequest(body);
    const catalog = await getActiveCatalog();
    const summary = describeContext(request);

    let baseline: Look[] = [];
    try {
      baseline = generateLooks(request, catalog).looks;
    } catch (err) {
      console.error(`[api/looks] motor do Atelier falhou — ${err instanceof Error ? err.message : String(err)}`);
    }

    const aiAvailable = geminiConfigured() || groqConfigured();
    if (aiAvailable && rateLimit(`looks-ai:${ip}`, 20, TEN_MINUTES).allowed) {
      const looks = await composeWithAi(request, catalog, baseline);
      if (looks) return jsonOk<LooksResponse>({ looks, source: 'ai', summary });
    }

    if (baseline.length === 0) throw new Error('Nenhum look pôde ser composto.');
    return jsonOk<LooksResponse>({ looks: baseline, source: 'atelier', summary });
  } catch (err) {
    return errorResponse(err, 'looks');
  }
}
