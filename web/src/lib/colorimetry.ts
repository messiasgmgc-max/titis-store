// ============================================================
// Colorimetria local (somente navegador) — leitura estimada pela cor da pele na foto.
// Usa o ângulo tipológico individual (ITA°) em CIELAB; não envia a imagem a lugar algum.
// ============================================================
import type { ContrastLevel, Diagnosis, SkinToneId, Subtone } from './types';
import { rgbToLab } from './stylist/color';
import type { Lab } from './stylist/color';
import { getSeason } from './stylist/knowledge';
import type { SeasonProfile } from './stylist/knowledge';
import { loadImage } from './image';

const MAX_SIDE = 320;
/** Região elíptica central onde o rosto costuma estar em fotos de frente. */
const FACE = { cx: 0.5, cy: 0.45, rx: 0.2, ry: 0.26 };
/** Faixa superior da foto (cabelo) usada para estimar o contraste. */
const HAIR = { y0: 0.05, y1: 0.2, x0: 0.25, x1: 0.75 };
const MIN_SKIN_RATIO = 0.04;

const NOT_ENOUGH_SKIN = 'Não encontramos pele suficiente na foto. Use uma foto de rosto, de frente, com boa luz natural.';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Pixel de pele pelo intervalo clássico em YCbCr, com brilho razoável. */
function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  if (y < 35 || y > 245) return false;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

/** Média robusta: descarta 10% das amostras em cada extremo de L*. */
function robustMean(samples: Lab[]): Lab {
  const sorted = [...samples].sort((a, b) => a[0] - b[0]);
  const lo = Math.floor(sorted.length * 0.1);
  const hi = Math.max(lo + 1, Math.ceil(sorted.length * 0.9));
  const slice = sorted.slice(lo, hi);
  const sum = slice.reduce<Lab>((acc, s) => [acc[0] + s[0], acc[1] + s[1], acc[2] + s[2]], [0, 0, 0]);
  return [sum[0] / slice.length, sum[1] / slice.length, sum[2] / slice.length];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = clamp(Math.floor((sorted.length - 1) * p), 0, sorted.length - 1);
  return sorted[index];
}

function toneFromIta(ita: number): SkinToneId {
  if (ita > 41) return 'clara';
  if (ita > 28) return 'morena';
  if (ita > 10) return 'parda';
  return 'negra';
}

/**
 * Subtom pelo ângulo de matiz h°ab da pele. É uma estimativa: a luz ambiente
 * (lâmpadas quentes, sombra azulada) desloca o matiz e pode alterar a leitura.
 */
function subtoneFromHue(hue: number): Subtone {
  if (hue >= 58) return 'quente';
  if (hue <= 49) return 'frio';
  return 'neutro';
}

function contrastFrom(skinL: number, hairL: number): ContrastLevel {
  if (!Number.isFinite(hairL)) return 'medio';
  const diff = skinL - hairL;
  if (diff > 45) return 'alto';
  if (diff >= 25) return 'medio';
  return 'baixo';
}

function recommendationsFor(season: SeasonProfile): string[] {
  const accent = (i: number) => (season.palette[i]?.name ?? season.palette[0]?.name ?? 'cor da cartela').toLocaleLowerCase('pt-BR');
  const neutral = (i: number) => (season.neutrals[i]?.name ?? season.neutrals[0]?.name ?? 'neutro').toLocaleLowerCase('pt-BR');
  const metals =
    season.metals === 'prata'
      ? 'Relógio, fivelas e abotoaduras em aço ou prata'
      : season.metals === 'ouro'
        ? 'Relógio, fivelas e abotoaduras em tons dourados'
        : 'Metais dourados ou prateados — escolha um só por look';

  switch (season.family) {
    case 'Inverno':
      return [
        `Camisa em ${neutral(1)} sob paletó em ${neutral(3)}, com acabamento liso`,
        `Tricô ou gola alta de merino em ${accent(0)}`,
        `Gravata de seda em ${accent(2)} para ocasiões formais`,
        metals,
      ];
    case 'Verão':
      return [
        `Camisas de algodão com toque macio em ${accent(0)}`,
        `Blazer em ${neutral(0)} com textura discreta`,
        `Linho e tricô tom sobre tom, em ${accent(1)} e ${neutral(1)}`,
        metals,
      ];
    case 'Outono':
      return [
        `Tricô, camurça e flanela em ${accent(0)}`,
        `Blazer ou jaqueta em ${neutral(0)} com calça em ${neutral(1)}`,
        `Detalhes em ${accent(1)} com couro café`,
        metals,
      ];
    default:
      return [
        `Linho e algodão em ${neutral(0)} e ${accent(0)}`,
        `Polo de tricô em ${accent(1)}`,
        `Blazer desestruturado em ${neutral(2)} com calça clara`,
        metals,
      ];
  }
}

/** Lê tom, subtom e contraste a partir de uma foto de rosto (data URL). */
export async function analyzeFaceImage(dataUrl: string): Promise<Diagnosis> {
  if (typeof document === 'undefined') throw new Error('A leitura local da foto só está disponível no navegador.');

  const img = await loadImage(dataUrl);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) throw new Error('Não foi possível ler esta imagem. Tente outra foto.');

  const ratio = Math.min(1, MAX_SIDE / Math.max(naturalW, naturalH));
  const width = Math.max(1, Math.round(naturalW * ratio));
  const height = Math.max(1, Math.round(naturalH * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Seu navegador não permitiu analisar a imagem. Tente outro navegador.');
  ctx.drawImage(img, 0, 0, width, height);

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, width, height).data;
  } catch {
    throw new Error('Não foi possível ler esta imagem. Envie uma foto salva no seu aparelho.');
  }

  // --- Pele: região elíptica central ---------------------------------
  const cx = width * FACE.cx;
  const cy = height * FACE.cy;
  const rx = Math.max(1, width * FACE.rx);
  const ry = Math.max(1, height * FACE.ry);
  const samples: Lab[] = [];
  let total = 0;

  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(height - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(width - 1, Math.ceil(cx + rx)); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      if (nx * nx + ny * ny > 1) continue;
      total++;
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 200) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (isSkinPixel(r, g, b)) samples.push(rgbToLab(r, g, b));
    }
  }

  const skinRatio = total > 0 ? samples.length / total : 0;
  if (samples.length < 12 || skinRatio < MIN_SKIN_RATIO) throw new Error(NOT_ENOUGH_SKIN);

  const [L, a, b] = robustMean(samples);
  // ITA° = atan((L* − 50) / b*) — b* muito baixo é limitado para evitar divisão instável.
  const ita = (Math.atan((L - 50) / Math.max(b, 0.5)) * 180) / Math.PI;
  const hueRaw = (Math.atan2(b, a) * 180) / Math.PI;
  const hue = hueRaw < 0 ? hueRaw + 360 : hueRaw;

  // --- Contraste: 15º percentil de L* na faixa do cabelo ---------------
  const hairL: number[] = [];
  for (let y = Math.floor(height * HAIR.y0); y < Math.ceil(height * HAIR.y1); y++) {
    for (let x = Math.floor(width * HAIR.x0); x < Math.ceil(width * HAIR.x1); x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < 200) continue;
      hairL.push(rgbToLab(pixels[i], pixels[i + 1], pixels[i + 2])[0]);
    }
  }

  const skinTone = toneFromIta(ita);
  const subtone = subtoneFromHue(hue);
  const contrast = contrastFrom(L, percentile(hairL, 0.15));
  const season = getSeason(skinTone, subtone);
  // Confiança sobe com a proporção de pele na elipse (≈45% ou mais já é uma leitura boa).
  const confidence = Math.round(clamp(skinRatio / 0.45, 0.2, 0.95) * 100) / 100;

  return {
    skinTone,
    subtone,
    contrast,
    season: season.name,
    palette: [...season.palette, ...season.neutrals],
    avoid: season.avoid,
    notes: `${season.note} Leitura estimada pela cor da pele na foto; a iluminação pode influenciar.`,
    recommendations: recommendationsFor(season),
    source: 'local',
    confidence,
    ita: Math.round(ita),
    createdAt: new Date().toISOString(),
  };
}
