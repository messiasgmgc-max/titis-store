// POST /api/admin/product-vision — sugere o cadastro de uma peça a partir da foto (somente administradores).
import { slotForCategory } from '@/lib/products';
import { generateGeminiJson, geminiConfigured, imagePart } from '@/lib/server/gemini';
import {
  AiError,
  TEN_MINUTES,
  clampInt,
  cleanText,
  enforceRateLimit,
  errorResponse,
  foldText,
  isRecord,
  jsonError,
  jsonOk,
  normalizeHex,
  parseImageDataUrl,
  readJson,
} from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/supabase-server';
import { closestSwatch } from '@/lib/stylist/color';
import { CLIMATES, OCCASIONS, SEASON_MATRIX, isSkinToneId } from '@/lib/stylist/knowledge';
import {
  PIECE_SLOTS,
  PRODUCT_CATEGORIES,
  type ClimateId,
  type ColorSwatch,
  type OccasionId,
  type PieceSlot,
  type ProductCategory,
  type ProductVisionSuggestion,
  type SkinToneId,
} from '@/lib/types';

export const maxDuration = 45;

const MAX_BODY_BYTES = 9 * 1024 * 1024;

const OCCASION_IDS: OccasionId[] = OCCASIONS.map((o) => o.id);
const CLIMATE_IDS: ClimateId[] = CLIMATES.map((c) => c.id);

const SYSTEM = `Você é curador de moda masculina da Titi's Store, loja de alfaiataria e consultoria de imagem.
Recebe a foto de uma peça e sugere o cadastro dela no catálogo. Se a foto mostrar um look completo ou uma pessoa, descreva a peça principal (a mais em destaque).
Não cite marcas, logotipos nem pessoas. Use português do Brasil, com vocabulário elegante e objetivo.

Campos:
- name: nome comercial curto e refinado (até 60 caracteres), ex.: "Blazer Linho Italiano".
- category: exatamente um de ${PRODUCT_CATEGORIES.map((c) => `"${c}"`).join(', ')}.
- slot: exatamente um de "sobreposicao" (blazer, paletó, jaqueta, casaco), "superior" (camisa, polo, malha, camiseta), "inferior" (calça, bermuda), "calcado", "acessorio".
- color_name: nome da cor em português (ex.: "Azul Marinho", "Cinza Grafite").
- hex_color: cor dominante do tecido no formato #RRGGBB (ignore o fundo e sombras fortes).
- fabric: tecido aparente (ex.: "Lã fria", "Linho", "Algodão pima"); se incerto, o mais provável.
- description: 1 ou 2 frases (até 300 caracteres) sobre corte, textura e uso.
- formality: inteiro de 1 (descontraído) a 5 (black tie).
- skin_tones: tons de pele que a cor valoriza entre "clara", "morena", "parda", "negra" ([] se for neutra e combinar com todos).
- occasions: entre ${OCCASION_IDS.filter((id) => id !== 'outro')
  .map((id) => `"${id}"`)
  .join(', ')}.
- climates: entre ${CLIMATE_IDS.map((id) => `"${id}"`).join(', ')}, conforme o peso do tecido ([] se servir para qualquer clima).

Responda somente com JSON válido neste formato:
{"name": "", "category": "", "slot": "", "color_name": "", "hex_color": "#000000", "fabric": "", "description": "", "formality": 3, "skin_tones": [], "occasions": [], "climates": []}`;

const INSTRUCTION = 'Analise a peça desta foto e devolva o JSON do cadastro.';

const CATEGORY_SYNONYMS: Array<[RegExp, ProductCategory]> = [
  [/alfaiat|blazer|palet|terno|costume|smoking|colete|casaco|sobretudo|jaqueta/, 'Alfaiataria'],
  [/camisaria|camisa\b/, 'Camisaria'],
  [/malha|trico|sueter|cardig|polo|camiseta|moletom/, 'Malharia'],
  [/calca|bermuda|chino|jeans|pantal/, 'Calças'],
  [/calcad|sapato|tenis|bota|loafer|mocassim|oxford|derby|sandal/, 'Calçados'],
  [/acessor|relogio|cinto|gravata|lenco|carteira|oculos|abotoadura|chapeu|meia/, 'Acessórios'],
];

const CATEGORY_BY_SLOT: Record<PieceSlot, ProductCategory> = {
  sobreposicao: 'Alfaiataria',
  superior: 'Camisaria',
  inferior: 'Calças',
  calcado: 'Calçados',
  acessorio: 'Acessórios',
};

function readSlot(value: unknown): PieceSlot | null {
  const text = foldText(value).replace(/[^a-z]/g, '');
  return (PIECE_SLOTS as string[]).includes(text) ? (text as PieceSlot) : null;
}

function readCategory(value: unknown, slot: PieceSlot | null): ProductCategory | null {
  const text = foldText(value);
  const exact = PRODUCT_CATEGORIES.find((c) => foldText(c) === text);
  if (exact) return exact;
  if (text) {
    for (const [pattern, category] of CATEGORY_SYNONYMS) if (pattern.test(text)) return category;
  }
  return slot ? CATEGORY_BY_SLOT[slot] : null;
}

function uniqueValid<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const item of value) {
    const text = foldText(item);
    const match = allowed.find((id) => id === text);
    if (match && !out.includes(match)) out.push(match);
  }
  return out;
}

const SKIN_TONE_IDS: SkinToneId[] = ['clara', 'morena', 'parda', 'negra'].filter(isSkinToneId);

/** Cores nomeadas da base de conhecimento, para nomear um hex que veio sem nome. */
const NAMED_COLORS: ColorSwatch[] = Object.values(SEASON_MATRIX).flatMap((bySubtone) =>
  Object.values(bySubtone).flatMap((season) => [...season.palette, ...season.neutrals, ...season.avoid]),
);

function toSuggestion(raw: unknown): ProductVisionSuggestion {
  if (!isRecord(raw)) throw new AiError('gemini', 'invalid_response', 'Resposta sem objeto.');

  const name = cleanText(raw.name, 80);
  const hex = normalizeHex(raw.hex_color);
  const slotFromModel = readSlot(raw.slot);
  const category = readCategory(raw.category, slotFromModel);
  if (!name || !hex || !category) {
    throw new AiError('gemini', 'invalid_response', 'Sugestão incompleta (nome, categoria ou cor).');
  }

  return {
    name,
    category,
    slot: slotFromModel ?? slotForCategory(category),
    color_name: cleanText(raw.color_name, 40) ?? closestSwatch(hex, NAMED_COLORS)?.swatch.name ?? '',
    hex_color: hex,
    fabric: cleanText(raw.fabric, 60) ?? '',
    description: cleanText(raw.description, 400) ?? '',
    formality: clampInt(raw.formality, 1, 5, 3),
    skin_tones: uniqueValid(raw.skin_tones, SKIN_TONE_IDS),
    occasions: uniqueValid(raw.occasions, OCCASION_IDS),
    climates: uniqueValid(raw.climates, CLIMATE_IDS),
  };
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if (auth instanceof Response) return auth;

    if (!geminiConfigured()) {
      return jsonError(503, 'not_configured', 'A leitura automática de fotos não está configurada no servidor.');
    }
    enforceRateLimit(`product-vision:${auth.user.id}`, 60, TEN_MINUTES);

    const body = await readJson(req, MAX_BODY_BYTES);
    const image = parseImageDataUrl(body.image);

    const raw = await generateGeminiJson({
      system: SYSTEM,
      parts: [{ text: INSTRUCTION }, imagePart(image)],
      temperature: 0.3,
      timeoutMs: 30_000,
    });
    return jsonOk({ suggestion: toSuggestion(raw) });
  } catch (err) {
    return errorResponse(err, 'admin/product-vision');
  }
}
