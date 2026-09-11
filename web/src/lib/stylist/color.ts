// ============================================================
// Ciência de cor do Atelier — sRGB (D65) ⇄ CIELAB e distância ΔE (CIE76).
// Regra: somente imports relativos / "import type" (usado também fora do Next).
// ============================================================
import type { ColorSwatch } from '../types';

export type Lab = [number, number, number];
export type Rgb = [number, number, number];

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Normaliza "#abc", "abc" ou "#AABBCC" para "#aabbcc". Retorna null se inválido. */
export function normalizeHex(hex: string | null | undefined): string | null {
  if (typeof hex !== 'string') return null;
  const match = HEX_RE.exec(hex.trim());
  if (!match) return null;
  const body =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : match[1];
  return `#${body.toLowerCase()}`;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value.trim());
}

export function hexToRgb(hex: string): Rgb {
  const n = normalizeHex(hex) ?? '#000000';
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const part = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

// --- sRGB ⇄ linear -------------------------------------------------------
const toLinear = (channel: number) => {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const toGamma = (linear: number) => {
  const v = clamp(linear, 0, 1);
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return clamp(Math.round(c * 255), 0, 255);
};

// --- XYZ ⇄ Lab (branco de referência D65, observador 2°) -----------------
const XN = 0.95047;
const YN = 1;
const ZN = 1.08883;
const EPSILON = 216 / 24389;
const KAPPA = 24389 / 27;

const labF = (t: number) => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const labFInv = (t: number) => {
  const t3 = t * t * t;
  return t3 > EPSILON ? t3 : (116 * t - 16) / KAPPA;
};

/** Converte um pixel sRGB (0–255) em CIELAB. */
export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  const fx = labF(X / XN);
  const fy = labF(Y / YN);
  const fz = labF(Z / ZN);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Converte CIELAB em sRGB (valores fora do gamut são recortados). */
export function labToRgb([L, a, b]: Lab): Rgb {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const X = labFInv(fx) * XN;
  const Y = (L > KAPPA * EPSILON ? fy * fy * fy : L / KAPPA) * YN;
  const Z = labFInv(fz) * ZN;
  const R = X * 3.2404542 - Y * 1.5371385 - Z * 0.4985314;
  const G = -X * 0.969266 + Y * 1.8760108 + Z * 0.041556;
  const B = X * 0.0556434 - Y * 0.2040259 + Z * 1.0572252;
  return [toGamma(R), toGamma(G), toGamma(B)];
}

const LAB_CACHE = new Map<string, Lab>();

/** Hex → CIELAB [L*, a*, b*]. Hex inválido é tratado como preto. */
export function hexToLab(hex: string): Lab {
  const key = normalizeHex(hex) ?? '#000000';
  const cached = LAB_CACHE.get(key);
  if (cached) return cached;
  const [r, g, b] = hexToRgb(key);
  const lab = rgbToLab(r, g, b);
  if (LAB_CACHE.size > 1024) LAB_CACHE.clear();
  LAB_CACHE.set(key, lab);
  return lab;
}

export function labToHex(lab: Lab): string {
  return rgbToHex(labToRgb(lab));
}

export function deltaELab(a: Lab, b: Lab): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Distância perceptual CIE76 entre duas cores hex. */
export function deltaE(hexA: string, hexB: string): number {
  return deltaELab(hexToLab(hexA), hexToLab(hexB));
}

/** Amostra mais próxima (menor ΔE) de uma lista. */
export function closestSwatch<T extends ColorSwatch>(
  hex: string,
  swatches: readonly T[],
): { swatch: T; distance: number } | null {
  let best: { swatch: T; distance: number } | null = null;
  for (const swatch of swatches) {
    if (!isHexColor(swatch.hex)) continue;
    const distance = deltaE(hex, swatch.hex);
    if (!best || distance < best.distance) best = { swatch, distance };
  }
  return best;
}

/** Menor ΔE entre a cor e uma lista (Infinity se a lista estiver vazia). */
export function minDeltaE(hex: string, swatches: readonly ColorSwatch[]): number {
  return closestSwatch(hex, swatches)?.distance ?? Number.POSITIVE_INFINITY;
}

/** Luminosidade L* (0 = preto, 100 = branco). */
export function lightness(hex: string): number {
  return hexToLab(hex)[0];
}

/** Croma (saturação perceptual) C*ab. */
export function chroma(hex: string): number {
  const [, a, b] = hexToLab(hex);
  return Math.hypot(a, b);
}

/** Ângulo de matiz h°ab em graus (0–360). */
export function hueAngle(hex: string): number {
  const [, a, b] = hexToLab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

/** Distância angular entre dois matizes (0–180). */
export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

/** Ajusta luminosidade e croma no espaço Lab, preservando o matiz. */
export function adjustColor(hex: string, options: { lightness?: number; chromaScale?: number }): string {
  const [L, a, b] = hexToLab(hex);
  const scale = options.chromaScale ?? 1;
  const nextL = clamp(options.lightness ?? L, 0, 100);
  return labToHex([nextL, a * scale, b * scale]);
}
