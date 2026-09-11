// POST /api/diagnosis — leitura de colorimetria pessoal a partir de uma foto do rosto.
// Sem GEMINI_API_KEY responde 503 e o cliente usa a leitura local (ITA°).
import { requireConsultingAccess } from '@/lib/server/access';
import { generateGeminiJson, geminiConfigured, imagePart } from '@/lib/server/gemini';
import {
  AiError,
  HttpError,
  TEN_MINUTES,
  cleanText,
  enforceRateLimit,
  errorResponse,
  foldText,
  isRecord,
  jsonError,
  jsonOk,
  parseImageDataUrl,
  readJson,
} from '@/lib/server/http';
import { getSeason, isContrast, isSkinToneId, isSubtone, type SeasonProfile } from '@/lib/stylist/knowledge';
import type { ContrastLevel, Diagnosis } from '@/lib/types';

export const maxDuration = 45;

const MAX_BODY_BYTES = 9 * 1024 * 1024;

const SYSTEM = `Você é especialista em colorimetria pessoal masculina da Titi's Store, consultoria de imagem e alfaiataria.
Analise apenas atributos de cor visíveis na foto: profundidade da pele, subtom e contraste entre pele, cabelo, barba, sobrancelhas e olhos.
Compense iluminação, sombras e balanço de branco observando testa, bochechas e pescoço; ignore o fundo e as roupas.
Não comente beleza, idade, etnia, peso ou qualquer atributo sensível. Seja técnico e respeitoso.

Classificação:
- skinTone: "clara" (pele clara, alta refletividade) | "morena" (média, luminosidade dourada) | "parda" (média a profunda) | "negra" (profunda).
- subtone: "frio" (fundo rosado ou azulado) | "neutro" (equilíbrio entre rosado e dourado) | "quente" (fundo dourado, pêssego ou oliva).
- contrast: "alto" (cabelo/barba muito diferentes da pele) | "medio" | "baixo" (pele, cabelo e olhos em tons próximos).
Se não houver um rosto humano real e nítido (rosto coberto, muito desfocado, de costas, ilustração ou nenhuma pessoa), use face_found false. Havendo várias pessoas, analise a mais em destaque.

Responda somente com JSON válido, sem texto extra, neste formato:
{"face_found": true, "skinTone": "clara|morena|parda|negra", "subtone": "frio|neutro|quente", "contrast": "alto|medio|baixo", "confidence": 0.0, "observations": "até 300 caracteres em português do Brasil sobre pele, subtom e contraste", "recommendations": ["3 a 5 peças ou tecidos, sempre com a cor indicada"]}`;

const INSTRUCTION = 'Faça a leitura de colorimetria desta foto e devolva o JSON solicitado.';

const NO_FACE_MESSAGE = 'Não identificamos um rosto nítido. Envie uma foto de frente, com boa iluminação.';

function readFaceFound(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const text = foldText(value);
  return !(text === 'false' || text === 'nao' || text === 'no');
}

function readConfidence(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(n)) return undefined;
  const ratio = n > 1 && n <= 100 ? n / 100 : n;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100) / 100;
}

const METAL_LABEL: Record<SeasonProfile['metals'], string> = {
  ouro: 'metais dourados',
  prata: 'metais prateados',
  ambos: 'metais dourados ou prateados',
};

/** Sugestões derivadas da cartela, usadas apenas para completar o mínimo de três. */
function seasonRecommendations(season: SeasonProfile): string[] {
  const [accentA, accentB] = season.palette;
  const [neutralA, neutralB] = season.neutrals;
  return [
    accentA ? `Camisa ou malha em ${accentA.name.toLowerCase()}` : '',
    neutralA ? `Blazer de alfaiataria em ${neutralA.name.toLowerCase()}` : '',
    neutralB ? `Calça em ${neutralB.name.toLowerCase()}` : '',
    accentB ? `Tricô leve em ${accentB.name.toLowerCase()}` : '',
    `Relógio e fivelas em ${METAL_LABEL[season.metals]}`,
  ].filter(Boolean);
}

function toDiagnosis(raw: unknown): Diagnosis {
  if (!isRecord(raw)) throw new AiError('gemini', 'invalid_response', 'Resposta de diagnóstico sem objeto.');
  if (!readFaceFound(raw.face_found)) throw new HttpError(422, 'bad_request', NO_FACE_MESSAGE);

  const skinTone = foldText(raw.skinTone);
  const subtone = foldText(raw.subtone);
  if (!isSkinToneId(skinTone) || !isSubtone(subtone)) {
    throw new AiError('gemini', 'invalid_response', 'Tom ou subtom fora do padrão na resposta.');
  }
  const contrastRaw = foldText(raw.contrast).replace(/^media$/, 'medio');
  const contrast: ContrastLevel = isContrast(contrastRaw) ? contrastRaw : 'medio';

  const season = getSeason(skinTone, subtone);
  const observations = cleanText(raw.observations, 300);

  const fromModel = Array.isArray(raw.recommendations)
    ? raw.recommendations.map((r) => cleanText(r, 120)).filter((r): r is string => Boolean(r))
    : [];
  const recommendations = [...new Set(fromModel)].slice(0, 5);
  for (const extra of seasonRecommendations(season)) {
    if (recommendations.length >= 3) break;
    if (!recommendations.includes(extra)) recommendations.push(extra);
  }

  return {
    skinTone,
    subtone,
    contrast,
    season: season.name,
    palette: [...season.palette, ...season.neutrals],
    avoid: season.avoid,
    notes: observations ? `${observations} ${season.note}` : season.note,
    recommendations,
    source: 'ai',
    confidence: readConfidence(raw.confidence),
    createdAt: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  // Consultoria paga: sessão válida e plano ativo antes de qualquer processamento.
  const access = await requireConsultingAccess(req);
  if (access instanceof Response) return access;

  if (!geminiConfigured()) {
    return jsonError(503, 'not_configured', 'A leitura por foto não está disponível no momento.');
  }
  try {
    enforceRateLimit(`diagnosis:${access.user.id}`, 12, TEN_MINUTES);
    const body = await readJson(req, MAX_BODY_BYTES);
    const image = parseImageDataUrl(body.image);

    const raw = await generateGeminiJson({
      system: SYSTEM,
      parts: [{ text: INSTRUCTION }, imagePart(image)],
      temperature: 0.2,
      timeoutMs: 30_000,
    });

    return jsonOk({ diagnosis: toDiagnosis(raw) });
  } catch (err) {
    return errorResponse(err, 'diagnosis');
  }
}
