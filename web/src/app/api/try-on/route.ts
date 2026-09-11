// POST /api/try-on — provador virtual: retrato editorial do cliente vestindo o look escolhido.
import { requireConsultingAccess } from '@/lib/server/access';
import { getActiveCatalog } from '@/lib/server/catalog';
import { generateGeminiImage, geminiConfigured } from '@/lib/server/gemini';
import {
  AiError,
  HttpError,
  TEN_MINUTES,
  cleanText,
  enforceRateLimit,
  errorResponse,
  isRecord,
  jsonError,
  jsonOk,
  normalizeHex,
  parseImageDataUrl,
  readJson,
  type ImageMime,
  type InlineImage,
} from '@/lib/server/http';
import { isSkinToneId } from '@/lib/stylist/knowledge';
import { PIECE_SLOTS, type LookPiece, type PieceSlot, type Product, type SkinToneId, type TryOnResponse } from '@/lib/types';

export const maxDuration = 60;

const MAX_BODY_BYTES = 9 * 1024 * 1024;
const MAX_REFERENCE_BYTES = 2 * 1024 * 1024;
const REFERENCE_TIMEOUT_MS = 6_000;
/** Tempo total disponível para a geração (maxDuration menos margem de resposta). */
const GENERATION_BUDGET_MS = 55_000;

const SKIN_EN: Record<SkinToneId, string> = {
  clara: 'fair',
  morena: 'warm golden medium',
  parda: 'medium-deep brown',
  negra: 'deep brown',
};

const SLOT_EN: Record<PieceSlot, string> = {
  sobreposicao: 'Outer layer',
  superior: 'Top',
  inferior: 'Trousers',
  calcado: 'Shoes (may fall outside the frame)',
  acessorio: 'Accessory',
};

interface TryOnLook {
  title: string;
  pieces: LookPiece[];
}

function parseLook(value: unknown): TryOnLook {
  if (!isRecord(value) || !Array.isArray(value.pieces)) {
    throw new HttpError(400, 'bad_request', 'Escolha um look para experimentar.');
  }
  const pieces: LookPiece[] = [];
  for (const entry of value.pieces.slice(0, 8)) {
    if (!isRecord(entry)) continue;
    const slot = typeof entry.slot === 'string' && (PIECE_SLOTS as string[]).includes(entry.slot) ? (entry.slot as PieceSlot) : null;
    const name = cleanText(entry.name, 80);
    if (!slot || !name) continue;
    const fabric = cleanText(entry.fabric, 60);
    pieces.push({
      slot,
      name,
      color: cleanText(entry.color, 40) ?? '',
      hex: normalizeHex(entry.hex) ?? '',
      ...(fabric ? { fabric } : {}),
      productId: typeof entry.productId === 'string' ? entry.productId.slice(0, 80) : null,
    });
  }
  if (pieces.length === 0) throw new HttpError(400, 'bad_request', 'O look precisa ter ao menos uma peça.');
  return { title: cleanText(value.title, 80) ?? 'Look da consultoria', pieces };
}

const REFERENCE_MIME = new Set<string>(['image/jpeg', 'image/png', 'image/webp']);

/** Baixa a foto de um produto do catálogo (https, até 2 MB). Falhas são ignoradas. */
async function fetchReference(url: string): Promise<InlineImage | null> {
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:') return null;
    const res = await fetch(target, {
      headers: { Accept: 'image/jpeg,image/png,image/webp' },
      signal: AbortSignal.timeout(REFERENCE_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!res.ok || !res.body) return null;
    const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const declared = Number(res.headers.get('content-length'));
    if (!REFERENCE_MIME.has(mime) || (Number.isFinite(declared) && declared > MAX_REFERENCE_BYTES)) {
      await res.body.cancel().catch(() => undefined);
      return null;
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REFERENCE_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
    return { mimeType: mime as ImageMime, data: Buffer.concat(chunks).toString('base64') };
  } catch {
    return null;
  }
}

/** Até duas fotos de peças do catálogo presentes no look, priorizando as mais visíveis. */
async function productReferences(pieces: LookPiece[]): Promise<Array<{ name: string; image: InlineImage }>> {
  if (!pieces.some((p) => p.productId)) return [];
  const catalog = await getActiveCatalog();
  const byId = new Map(catalog.map((p) => [p.id, p]));

  const candidates = pieces
    .map((piece) => ({ piece, product: piece.productId ? byId.get(piece.productId) : undefined }))
    .filter((c): c is { piece: LookPiece; product: Product & { image_url: string } } =>
      Boolean(c.product?.image_url?.startsWith('https://')),
    )
    .sort((a, b) => PIECE_SLOTS.indexOf(a.piece.slot) - PIECE_SLOTS.indexOf(b.piece.slot))
    .slice(0, 2);

  const images = await Promise.all(candidates.map((c) => fetchReference(c.product.image_url)));
  return candidates.flatMap((c, i) => {
    const image = images[i];
    return image ? [{ name: c.piece.name, image }] : [];
  });
}

function buildPrompt(look: TryOnLook, skinTone: SkinToneId, referenceNames: string[]): string {
  const pieces = look.pieces
    .map((p) => {
      const color = p.color ? `, color ${p.color}${p.hex ? ` (${p.hex})` : ''}` : p.hex ? `, color ${p.hex}` : '';
      return `- ${SLOT_EN[p.slot]}: ${p.name}${color}${p.fabric ? `, fabric: ${p.fabric}` : ''}`;
    })
    .join('\n');

  const references = referenceNames.map(
    (name, i) =>
      `Reference image ${i + 2} shows the actual store garment "${name}": match its cut, color and texture exactly, and ignore any person, mannequin or background in that image.`,
  );

  return [
    'Create a photorealistic editorial menswear photograph in portrait orientation (3:4 aspect ratio).',
    '',
    `IDENTITY: the man in reference image 1 is the subject. Preserve his exact facial identity: face shape, eyes, nose, lips, ears, hairline, hairstyle and facial hair, and his natural ${SKIN_EN[skinTone]} skin tone and undertone. Do not beautify, reshape, lighten or darken his skin, and do not change his apparent age. Keep glasses only if he already wears them.`,
    '',
    `OUTFIT "${look.title}" (garment names are in Brazilian Portuguese). He wears exactly these pieces and nothing else:`,
    pieces,
    ...references,
    '',
    'FRAMING: half-body portrait from the head to the upper thighs, slight three-quarter turn, confident and relaxed posture, natural hands with five fingers (for example, one hand resting in a trouser pocket).',
    'SET AND LIGHT: deep obsidian-black studio background, soft key light that reveals the true skin tone, warm golden rim light outlining the shoulders and hair, subtle film grain, shallow depth of field, 85mm lens, luxury tailoring magazine aesthetic.',
    'QUALITY: realistic fabric texture and drape, precise tailored fit, correct anatomy.',
    'Strictly no text, letters, logos, watermarks, brand marks, borders or additional people.',
  ].join('\n');
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  // Consultoria paga: sessão válida e plano ativo antes de gerar a imagem.
  const access = await requireConsultingAccess(req);
  if (access instanceof Response) return access;

  if (!geminiConfigured()) {
    return jsonError(503, 'not_configured', 'O provador virtual não está disponível no momento.');
  }
  try {
    enforceRateLimit(`try-on:${access.user.id}`, 6, TEN_MINUTES);

    const body = await readJson(req, MAX_BODY_BYTES);
    const face = parseImageDataUrl(body.face);
    if (!isSkinToneId(body.skinTone)) throw new HttpError(400, 'bad_request', 'Tom de pele inválido.');
    const skinTone: SkinToneId = body.skinTone;
    const look = parseLook(body.look);

    const references = await productReferences(look.pieces);
    const prompt = buildPrompt(
      look,
      skinTone,
      references.map((r) => r.name),
    );

    const image = await generateGeminiImage({
      prompt,
      images: [face, ...references.map((r) => r.image)],
      aspectRatio: '3:4',
      timeoutMs: Math.max(15_000, GENERATION_BUDGET_MS - (Date.now() - startedAt)),
    });

    return jsonOk<TryOnResponse>({ image: `data:${image.mimeType};base64,${image.data}` });
  } catch (err) {
    if (err instanceof AiError && err.kind === 'blocked') {
      console.warn(`[api/try-on] geração bloqueada — ${err.message}`);
      return jsonError(
        422,
        'bad_request',
        'Não foi possível gerar a prova com esta foto. Use uma imagem do rosto de frente, bem iluminada e sem outras pessoas.',
      );
    }
    if (err instanceof AiError && err.kind === 'invalid_response') {
      console.warn(`[api/try-on] sem imagem — ${err.message}`);
      return jsonError(502, 'upstream', 'O provador não conseguiu gerar a imagem agora. Tente novamente em instantes.');
    }
    return errorResponse(err, 'try-on');
  }
}
