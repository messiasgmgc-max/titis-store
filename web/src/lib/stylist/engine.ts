// ============================================================
// Motor do Atelier — composição determinística de looks.
// Mesma requisição → mesmos looks (semente = hash da requisição; nunca Math.random).
// Regra: somente imports relativos / "import type" (usado também fora do Next).
// ============================================================
import { PIECE_SLOTS } from '../types';
import type {
  ClimateId,
  ColorSwatch,
  ContrastLevel,
  Look,
  LookPiece,
  LooksResponse,
  OccasionId,
  PieceSlot,
  Product,
  StylePreference,
  StyleRequest,
  TimeOfDayId,
} from '../types';
import { deltaE, hexToLab, hueDistance, minDeltaE, normalizeHex } from './color';
import { OCCASIONS, getSeason } from './knowledge';
import type { SeasonProfile } from './knowledge';
import { PIECE_MODELS, TAILORING_NEUTRALS, fabricFor, hasTrait, pieceModel } from './pieces';
import type { PieceModel } from './pieces';

/** Distância mínima (CIE76) entre qualquer cor usada e as cores a evitar da estação. */
const AVOID_MIN_DELTA_E = 12;
/** Distância máxima para uma peça do catálogo substituir a peça sugerida. */
const CATALOG_MAX_DELTA_E = 22;
/** Neutros de alfaiataria só entram quando ficam a esta distância da cartela. */
const EXTENDED_NEUTRAL_MAX_DELTA_E = 22;
const MAX_PIECES = 5;

type ConceptId = 'assinatura' | 'contemporaneo' | 'declaracao';
const CONCEPTS: ConceptId[] = ['assinatura', 'contemporaneo', 'declaracao'];

// ------------------------------------------------------------
// Utilidades determinísticas
// ------------------------------------------------------------

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** FNV-1a 32 bits. */
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Ruído determinístico 0..1 para uma chave — independente da ordem de avaliação. */
function noise(seed: number, key: string): number {
  let t = (seed ^ hashString(key)) >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pickFrom<T>(list: readonly T[], seed: number, key: string): T {
  return list[Math.floor(noise(seed, key) * list.length) % list.length];
}

function requestKey(req: StyleRequest): string {
  return [
    req.skinTone,
    req.subtone,
    req.contrast,
    req.occasion,
    req.timeOfDay,
    req.climate,
    req.style,
    req.gender ?? '',
    req.bodyType ?? '',
    req.weightKg ?? '',
    req.heightCm ?? '',
    normalizeText(req.customVenue ?? ''),
  ].join('|');
}

const lower = (text: string) => text.toLocaleLowerCase('pt-BR');
const capitalize = (text: string) => (text ? text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1) : text);

// ------------------------------------------------------------
// Leitura do local descrito pelo cliente
// ------------------------------------------------------------

export interface VenueReading {
  occasion: OccasionId | null;
  formalityDelta: number;
  climateHint: ClimateId | null;
  keywords: string[];
}

interface VenueRule {
  occasion: OccasionId | null;
  delta: number;
  climate: ClimateId | null;
  priority: number;
  terms: string[];
  /** Reforço de formalidade além da própria ocasião (ex.: black tie). */
  boost?: boolean;
}

const VENUE_RULES: VenueRule[] = [
  { occasion: 'festa', delta: 0.5, climate: null, priority: 7, boost: true, terms: ['black tie', 'gala', 'traje a rigor', 'smoking', 'passeio completo'] },
  {
    occasion: 'festa',
    delta: 1,
    climate: null,
    priority: 6,
    terms: ['casamento', 'igreja', 'gala', 'formatura', 'black tie', 'cerimonia', 'batizado', 'noivado', 'bodas', 'baile', 'debutante', 'recepcao'],
  },
  {
    occasion: 'trabalho',
    delta: 0,
    climate: null,
    priority: 5,
    terms: ['reuniao', 'entrevista', 'escritorio', 'apresentacao', 'conselho', 'congresso', 'palestra', 'audiencia', 'tribunal', 'corporativo', 'negocios', 'diretoria', 'assembleia'],
  },
  {
    occasion: 'jantar',
    delta: 0,
    climate: null,
    priority: 4,
    terms: ['vinicola', 'restaurante', 'jantar', 'degustacao', 'teatro', 'opera', 'bistro', 'encontro romantico'],
  },
  {
    occasion: 'esporte',
    delta: 0,
    climate: null,
    priority: 3,
    terms: ['clube', 'hipica', 'golfe', 'golf', 'regata', 'polo', 'iate', 'veleiro', 'turfe', 'jockey', 'haras'],
  },
  {
    occasion: 'barzinho',
    delta: 0,
    climate: null,
    priority: 2,
    terms: ['bar', 'balada', 'show', 'lounge', 'boteco', 'pub', 'happy hour', 'rooftop', 'festival', 'boate'],
  },
  {
    occasion: 'casual',
    delta: -1,
    climate: 'quente',
    priority: 1,
    terms: ['praia', 'piscina', 'pe na areia', 'beira mar', 'beira-mar', 'sitio', 'churrasco', 'resort', 'litoral'],
  },
  { occasion: 'casual', delta: -0.5, climate: null, priority: 0, terms: ['fazenda', 'parque', 'piquenique', 'passeio', 'feira', 'shopping', 'cinema'] },
];

const CLIMATE_TERMS: { climate: ClimateId; terms: string[] }[] = [
  { climate: 'frio', terms: ['serra', 'montanha', 'inverno', 'frio', 'neve', 'gramado', 'campos do jordao', 'monte verde', 'friozinho'] },
  { climate: 'quente', terms: ['calor', 'verao', 'sol forte', 'tropical', 'nordeste'] },
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function containsTerm(text: string, term: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}s?($|[^a-z0-9])`).test(text);
}

interface VenueAnalysis {
  reading: VenueReading;
  rules: VenueRule[];
}

function analyzeVenue(text: string): VenueAnalysis {
  const normalized = normalizeText(text ?? '');
  const empty: VenueReading = { occasion: null, formalityDelta: 0, climateHint: null, keywords: [] };
  if (!normalized) return { reading: empty, rules: [] };

  const keywords: string[] = [];
  const rules: VenueRule[] = [];
  let best: VenueRule | null = null;
  let delta = 0;
  let ruleClimate: ClimateId | null = null;

  for (const rule of VENUE_RULES) {
    const matched = rule.terms.filter((term) => containsTerm(normalized, term));
    if (matched.length === 0) continue;
    for (const term of matched) if (!keywords.includes(term)) keywords.push(term);
    rules.push(rule);
    delta += rule.delta;
    if (!best || rule.priority > best.priority) best = rule;
    if (rule.climate && !ruleClimate) ruleClimate = rule.climate;
  }

  let climateHint: ClimateId | null = null;
  for (const group of CLIMATE_TERMS) {
    const matched = group.terms.filter((term) => containsTerm(normalized, term));
    if (matched.length === 0) continue;
    for (const term of matched) if (!keywords.includes(term)) keywords.push(term);
    if (!climateHint) climateHint = group.climate;
  }

  return {
    reading: {
      occasion: best?.occasion ?? null,
      formalityDelta: clamp(delta, -1.5, 1.5),
      climateHint: climateHint ?? ruleClimate,
      keywords,
    },
    rules,
  };
}

/** Interpreta o texto livre do local (sem sensibilidade a acentos). */
export function interpretVenue(text: string): VenueReading {
  return analyzeVenue(text).reading;
}

function venueFor(req: StyleRequest): VenueAnalysis | null {
  const text = req.customVenue?.trim();
  return text ? analyzeVenue(text) : null;
}

function effectiveOccasion(req: StyleRequest, venue: VenueAnalysis | null): OccasionId {
  if (req.occasion !== 'outro') return req.occasion;
  return venue?.reading.occasion ?? 'outro';
}

// ------------------------------------------------------------
// Formalidade e contexto
// ------------------------------------------------------------

function occasionRange(occasion: OccasionId): [number, number] {
  return OCCASIONS.find((o) => o.id === occasion)?.formality ?? [2, 4];
}

/** Formalidade alvo (1..5, uma casa decimal). */
export function targetFormality(req: StyleRequest): number {
  const venue = venueFor(req);
  const occasion = effectiveOccasion(req, venue);
  const [min, max] = occasionRange(occasion);
  let target = (min + max) / 2;
  if (venue) {
    // Palavras que só confirmam a ocasião já estão na faixa dela; o que sobra ajusta a formalidade
    // (ex.: "casamento" = festa sem ajuste; "casamento pé na areia" = festa −1).
    const implied = venue.rules.filter((r) => r.occasion === occasion && !r.boost).reduce((sum, r) => sum + r.delta, 0);
    target += clamp(venue.reading.formalityDelta - implied, -1.5, 1.5);
  }
  if (req.timeOfDay === 'noite' && (occasion === 'jantar' || occasion === 'festa')) target += 0.5;
  if (req.timeOfDay === 'manha') target -= 0.3;
  if (req.style === 'classico') target += 0.3;
  else if (req.style === 'ousado') target -= 0.2;
  return round1(clamp(clamp(target, min - 1, max + 0.5), 1, 5));
}

const OCCASION_PHRASE: Record<OccasionId, string> = {
  trabalho: 'compromisso executivo',
  casual: 'dia casual refinado',
  barzinho: 'happy hour',
  jantar: 'jantar especial',
  festa: 'casamento ou gala',
  esporte: 'evento de esporte fino',
  outro: 'ocasião especial',
};
const TIME_PHRASE: Record<TimeOfDayId, string> = { manha: 'pela manhã', tarde: 'à tarde', noite: 'à noite' };
const CLIMATE_WORD: Record<ClimateId, string> = { frio: 'frio', ameno: 'ameno', quente: 'quente' };
const CONTRAST_WORD: Record<ContrastLevel, string> = { alto: 'alto', medio: 'médio', baixo: 'baixo' };

function occasionPhrase(req: StyleRequest): string {
  const venue = req.customVenue?.replace(/\s+/g, ' ').trim();
  if (venue) return lower(venue.length > 42 ? `${venue.slice(0, 40).trim()}…` : venue);
  return OCCASION_PHRASE[req.occasion] ?? OCCASION_PHRASE.outro;
}

/** Frase curta do contexto interpretado, ex.: "Outono Quente · contraste alto · jantar especial à noite, clima ameno". */
export function describeContext(req: StyleRequest): string {
  const season = getSeason(req.skinTone, req.subtone);
  const contrast = CONTRAST_WORD[req.contrast] ?? 'médio';
  const time = TIME_PHRASE[req.timeOfDay] ?? '';
  const climate = CLIMATE_WORD[req.climate] ?? 'ameno';
  return `${season.name} · contraste ${contrast} · ${occasionPhrase(req)} ${time}, clima ${climate}`.replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------
// Harmonia
// ------------------------------------------------------------

/** Aderência das cores à cartela da estação (inteiro 60..98). */
export function scoreHarmony(pieces: { hex: string }[], req: StyleRequest): number {
  const season = getSeason(req.skinTone, req.subtone);
  const cartela = [...season.palette, ...season.neutrals];
  const hexes = pieces.map((p) => normalizeHex(p.hex)).filter((h): h is string => Boolean(h));
  if (hexes.length === 0) return 60;

  let closeness = 0;
  let avoidPenalty = 0;
  for (const hex of hexes) {
    const d = minDeltaE(hex, cartela);
    closeness += clamp(1 - Math.max(0, d - 4) / 36, 0, 1);
    const a = minDeltaE(hex, season.avoid);
    if (a < AVOID_MIN_DELTA_E) avoidPenalty += 12;
    else if (a < 20) avoidPenalty += (20 - a) * 0.8;
  }
  let score = 60 + (38 * closeness) / hexes.length - avoidPenalty;

  const ls = hexes.map((h) => hexToLab(h)[0]);
  const range = Math.max(...ls) - Math.min(...ls);
  if (req.contrast === 'alto' && range < 40) score -= (40 - range) * 0.25;
  if (req.contrast === 'medio') score -= Math.max(0, 18 - range) * 0.25 + Math.max(0, range - 75) * 0.25;
  if (req.contrast === 'baixo' && range > 55) score -= (range - 55) * 0.25;

  return Math.round(clamp(score, 60, 98));
}

// ------------------------------------------------------------
// Opções de cor
// ------------------------------------------------------------

interface ColorOption {
  name: string;
  hex: string;
  L: number;
  C: number;
  h: number;
  accent: boolean;
  fixed: boolean;
  /** Distância à cartela (palette + neutros). */
  cartela: number;
  /** Há produto do catálogo compatível nesta cor. */
  inCatalog: boolean;
}

interface Ctx {
  req: StyleRequest;
  season: SeasonProfile;
  seed: number;
  occasion: OccasionId;
  target: number;
  cartela: ColorSwatch[];
  accents: ColorOption[];
  neutrals: ColorOption[];
  catalog: Product[];
}

function isSafe(hex: string, season: SeasonProfile): boolean {
  return season.avoid.every((a) => deltaE(a.hex, hex) >= AVOID_MIN_DELTA_E);
}

function makeOption(swatch: ColorSwatch, accent: boolean, fixed: boolean, cartela: ColorSwatch[]): ColorOption | null {
  const hex = normalizeHex(swatch.hex);
  if (!hex) return null;
  const [L, a, b] = hexToLab(hex);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return {
    name: swatch.name,
    hex,
    L,
    C: Math.hypot(a, b),
    h: h < 0 ? h + 360 : h,
    accent,
    fixed,
    cartela: minDeltaE(hex, cartela),
    inCatalog: false,
  };
}

function buildContext(req: StyleRequest, catalog: Product[]): Ctx {
  const season = getSeason(req.skinTone, req.subtone);
  const cartela = [...season.palette, ...season.neutrals];
  const venue = venueFor(req);

  const accents = season.palette
    .filter((c) => isSafe(c.hex, season))
    .map((c) => makeOption(c, true, false, cartela))
    .filter((o): o is ColorOption => o !== null);

  const neutrals: ColorOption[] = [];
  const pushNeutral = (swatch: ColorSwatch) => {
    if (!isSafe(swatch.hex, season)) return;
    if (neutrals.some((n) => deltaE(n.hex, swatch.hex) < 7) || accents.some((n) => deltaE(n.hex, swatch.hex) < 7)) return;
    const option = makeOption(swatch, false, false, cartela);
    if (option) neutrals.push(option);
  };
  season.neutrals.forEach(pushNeutral);
  for (const swatch of TAILORING_NEUTRALS) {
    if (minDeltaE(swatch.hex, cartela) <= EXTENDED_NEUTRAL_MAX_DELTA_E) pushNeutral(swatch);
  }

  const activeCatalog = catalog.filter((p) => p && p.is_active !== false && normalizeHex(p.hex_color));

  return {
    req,
    season,
    seed: hashString(requestKey(req)),
    occasion: effectiveOccasion(req, venue),
    target: targetFormality(req),
    cartela,
    accents: accents.length ? accents : neutrals.slice(0, 2).map((n) => ({ ...n, accent: true })),
    neutrals,
    catalog: activeCatalog,
  };
}

// ------------------------------------------------------------
// Catálogo
// ------------------------------------------------------------

const FAMILY_PATTERNS: [string, RegExp][] = [
  ['smoking', /\b(smoking|tuxedo)\b/],
  ['paleto', /\b(blazer|paleto|costume|terno)\b/],
  ['casaco', /\b(sobretudo|casaco|trench|capote|parka|peacoat)\b/],
  ['jaqueta', /\b(jaqueta|bomber|overshirt|jacket)\b/],
  ['cardiga', /\b(cardiga|cardigan)\b/],
  ['camisa', /\bcamisa\b/],
  ['malha', /\b(polo|gola alta|trico|sueter|sweater|pulover|camiseta|tshirt|t-shirt|malha|henley)\b/],
  ['jeans', /\b(jeans|denim)\b/],
  ['bermuda', /\bbermuda\b/],
  ['chino', /\bchino\b/],
  ['calca', /\b(calca|pantalona)\b/],
  ['bota', /\b(bota|boot|chelsea|botina|coturno)\b/],
  ['tenis', /\b(tenis|sneaker)\b/],
  ['sapato', /\b(sapato|oxford|derby|loafer|mocassim|brogue|monk)\b/],
  ['gravata', /\b(gravata|borboleta)\b/],
  ['lenco', /\b(lenco)\b/],
  ['relogio', /\brelogio\b/],
  ['cinto', /\bcinto\b/],
];

const MODEL_FAMILIES: Record<string, string[]> = {
  'paleto-la-fria': ['paleto'],
  'paleto-tropical': ['paleto'],
  'blazer-linho': ['paleto'],
  'blazer-desestruturado': ['paleto'],
  'blazer-veludo': ['paleto', 'smoking'],
  smoking: ['smoking', 'paleto'],
  sobretudo: ['casaco'],
  'jaqueta-camurca': ['jaqueta'],
  overshirt: ['jaqueta', 'camisa'],
  'cardiga-trico': ['cardiga', 'malha'],
  'camisa-social': ['camisa'],
  'camisa-smoking': ['camisa'],
  'camisa-oxford': ['camisa'],
  'camisa-linho': ['camisa'],
  'camisa-seda': ['camisa'],
  'polo-trico': ['malha'],
  'gola-alta': ['malha'],
  'trico-careca': ['malha'],
  'camiseta-pima': ['malha'],
  'calca-alfaiataria': ['calca'],
  'calca-smoking': ['calca', 'smoking'],
  'calca-pregas': ['calca'],
  chino: ['chino', 'calca'],
  'calca-linho': ['calca'],
  'jeans-escuro': ['jeans'],
  'bermuda-alfaiataria': ['bermuda'],
  oxford: ['sapato'],
  'oxford-verniz': ['sapato'],
  derby: ['sapato'],
  loafer: ['sapato'],
  'mocassim-camurca': ['sapato'],
  'chelsea-boot': ['bota'],
  'tenis-couro': ['tenis'],
  'gravata-seda': ['gravata'],
  'gravata-trico': ['gravata'],
  'gravata-borboleta': ['gravata'],
  'lenco-bolso': ['lenco'],
  'relogio-couro': ['relogio'],
  'relogio-aco': ['relogio'],
  'relogio-dourado': ['relogio'],
  'cinto-couro': ['cinto'],
};

const PRODUCT_FAMILY_CACHE = new Map<string, string[]>();

function productFamilies(product: Product): string[] {
  const key = `${product.id}|${product.name}`;
  const cached = PRODUCT_FAMILY_CACHE.get(key);
  if (cached) return cached;
  const text = normalizeText(product.name);
  const families = FAMILY_PATTERNS.filter(([, re]) => re.test(text)).map(([family]) => family);
  if (PRODUCT_FAMILY_CACHE.size > 512) PRODUCT_FAMILY_CACHE.clear();
  PRODUCT_FAMILY_CACHE.set(key, families);
  return families;
}

/** Produto ativo compatível com o modelo sugerido (sem considerar a cor). */
function productFitsModel(product: Product, model: PieceModel, formality: number, ctx: Ctx): boolean {
  if (product.slot !== model.slot) return false;
  const hex = normalizeHex(product.hex_color);
  if (!hex || !isSafe(hex, ctx.season)) return false;
  const productFormality = typeof product.formality === 'number' ? product.formality : 3;
  if (Math.abs(productFormality - formality) > 1) return false;
  if (product.occasions.length > 0 && ctx.occasion !== 'outro' && !product.occasions.includes(ctx.occasion)) return false;
  if (product.climates.length > 0 && !product.climates.includes(ctx.req.climate)) return false;
  if (product.skin_tones.length > 0 && !product.skin_tones.includes(ctx.req.skinTone)) return false;
  const families = productFamilies(product);
  if (families.length === 0) return true;
  const wanted = MODEL_FAMILIES[model.id] ?? [];
  return wanted.length === 0 || families.some((f) => wanted.includes(f));
}

function catalogMatches(model: PieceModel, hex: string, formality: number, ctx: Ctx): Product[] {
  return ctx.catalog
    .filter((p) => productFitsModel(p, model, formality, ctx))
    .map((p) => ({ p, d: deltaE(normalizeHex(p.hex_color) as string, hex) }))
    .filter((x) => x.d <= CATALOG_MAX_DELTA_E)
    .sort((a, b) => a.d - b.d || a.p.sort_order - b.p.sort_order)
    .map((x) => x.p);
}

// ------------------------------------------------------------
// Opções de cor por modelo
// ------------------------------------------------------------

function temperatureAllowed(temperature: 'fria' | 'quente' | 'neutra', season: SeasonProfile): boolean {
  if (season.metals === 'prata') return temperature !== 'quente';
  if (season.metals === 'ouro') return temperature !== 'fria';
  return true;
}

function optionsFor(
  model: PieceModel,
  formality: number,
  ctx: Ctx,
  override?: { pool?: ColorOption[]; lightness?: [number, number] },
): ColorOption[] {
  const { season, cartela } = ctx;
  let options: ColorOption[];

  if (model.fixedColors && !override?.pool) {
    const safe = model.fixedColors.filter((c) => isSafe(c.hex, season));
    const tempered = safe.filter((c) => temperatureAllowed(c.temperature, season));
    let chosen = tempered.length ? tempered : safe;
    if (chosen.length === 0) {
      chosen = [...model.fixedColors].sort((a, b) => minDeltaE(b.hex, season.avoid) - minDeltaE(a.hex, season.avoid)).slice(0, 1);
    }
    options = chosen.map((c) => makeOption(c, false, true, cartela)).filter((o): o is ColorOption => o !== null);
  } else {
    const pool = override?.pool ?? (model.accent ? [...ctx.accents, ...ctx.neutrals] : ctx.neutrals);
    const [lo, hi] = override?.lightness ?? model.lightness ?? [0, 100];
    const inRange = pool.filter((o) => o.L >= lo && o.L <= hi);
    if (inRange.length > 0) {
      options = inRange.map((o) => ({ ...o }));
    } else {
      const distance = (o: ColorOption) => (o.L < lo ? lo - o.L : o.L > hi ? o.L - hi : 0);
      options = [...pool].sort((a, b) => distance(a) - distance(b)).slice(0, 3).map((o) => ({ ...o }));
    }
  }

  // Cores de peças do acervo entram como opções quando respeitam a cartela.
  if (!override?.pool) {
    const [lo, hi] = model.lightness ?? [0, 100];
    for (const product of ctx.catalog) {
      if (!productFitsModel(product, model, formality, ctx)) continue;
      const hex = normalizeHex(product.hex_color) as string;
      if (options.some((o) => deltaE(o.hex, hex) < 4)) continue;
      const option = makeOption({ name: product.color_name?.trim() || 'Cor da peça', hex }, false, Boolean(model.fixedColors), cartela);
      if (!option) continue;
      if (!model.fixedColors && (option.cartela > CATALOG_MAX_DELTA_E || option.L < lo - 8 || option.L > hi + 8)) continue;
      const isAccent = minDeltaE(hex, ctx.season.palette) < minDeltaE(hex, ctx.season.neutrals) && option.C > 18;
      if (isAccent && !model.accent) continue;
      option.accent = isAccent;
      options.push(option);
    }
  }

  for (const option of options) option.inCatalog = catalogMatches(model, option.hex, formality, ctx).length > 0;
  return options;
}

// ------------------------------------------------------------
// Seleção de modelos
// ------------------------------------------------------------

interface ModelFilter {
  (model: PieceModel): boolean;
}

function selectModel(
  slot: PieceSlot,
  formality: number,
  ctx: Ctx,
  concept: ConceptId,
  usedModels: Set<string>,
  filter: ModelFilter = () => true,
  bonus: (model: PieceModel) => number = () => 0,
): PieceModel | null {
  const { req, seed } = ctx;
  const evaluate = (maxGap: number) => {
    let best: PieceModel | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const model of PIECE_MODELS) {
      if (model.slot !== slot || model.traits.includes('gala')) continue;
      if (!model.climates.includes(req.climate) || !filter(model)) continue;
      const [lo, hi] = model.formality;
      const gap = formality < lo ? lo - formality : formality > hi ? formality - hi : 0;
      if (gap > maxGap) continue;

      let score = -gap * 9;
      score += model.styles.includes(req.style) ? 3 : -4;
      if (concept === 'assinatura') score += (hasTrait(model, 'classico') ? 4 : 0) - (hasTrait(model, 'textura') ? 1 : 0);
      if (concept === 'contemporaneo') score += (hasTrait(model, 'misto') ? 5 : 0) - (hasTrait(model, 'classico') ? 1 : 0);
      if (concept === 'declaracao') score += (hasTrait(model, 'textura') ? 5 : 0) + (model.accent ? 2 : 0);
      if (req.timeOfDay === 'noite') score += hasTrait(model, 'noite') ? 2 : hasTrait(model, 'dia') ? -2 : 0;
      else score += hasTrait(model, 'dia') ? 1.5 : 0;
      if (req.climate === 'frio' && hasTrait(model, 'camada')) score += 2.5;
      if (usedModels.has(model.id)) score -= 6;
      score += bonus(model);
      score += noise(seed, `model|${concept}|${model.id}`) * 3;

      if (score > bestScore) {
        bestScore = score;
        best = model;
      }
    }
    return best;
  };
  return evaluate(1) ?? evaluate(2.5);
}

function wantsOverlay(formality: number, concept: ConceptId, climate: ClimateId): boolean {
  if (climate === 'frio') return true;
  if (climate === 'ameno') return formality >= 3.5 || (concept !== 'assinatura' && formality >= 2.2);
  return formality >= 4 || (concept === 'declaracao' && formality >= 3);
}

function conceptFormality(concept: ConceptId, ctx: Ctx): number {
  const t = ctx.target;
  if (concept === 'assinatura') return t;
  if (concept === 'contemporaneo') return round1(clamp(t >= 2.5 ? t - 0.7 : t + 0.6, 1, 5));
  return round1(clamp(t - (ctx.req.style === 'ousado' ? 0.3 : 0.1), 1, 5));
}

// ------------------------------------------------------------
// Composição
// ------------------------------------------------------------

interface Slotted {
  model: PieceModel;
  color: ColorOption;
  fabric: string;
  name?: string;
  /** Repete a cor final da sobreposição (costume, calça de smoking, gravata-borboleta). */
  follow?: boolean;
}

interface Draft {
  concept: ConceptId;
  formality: number;
  layer: Slotted | null; // camada extra (sobretudo sobre paletó)
  overlay: Slotted | null;
  top: Slotted;
  bottom: Slotted;
  shoe: Slotted;
  accessories: Slotted[];
  gala: boolean;
}

interface Plan {
  overlay: PieceModel | null;
  top: PieceModel;
  bottom: PieceModel;
  shoe: PieceModel;
  accessories: PieceModel[];
  layer: PieceModel | null;
  gala: boolean;
  costume: boolean;
  overlayName?: string;
  overlayFabric?: string;
}

function planModels(concept: ConceptId, formality: number, ctx: Ctx, usedModels: Set<string>): Plan | null {
  const { req, season } = ctx;
  const F = formality;
  const gala = concept !== 'contemporaneo' && F >= 4.8 && req.timeOfDay === 'noite' && ctx.occasion === 'festa';

  if (gala) {
    const overlay = pieceModel('smoking');
    const top = pieceModel('camisa-smoking');
    const bottom = pieceModel('calca-smoking');
    const shoe = pieceModel('oxford-verniz');
    const bow = pieceModel('gravata-borboleta');
    if (!overlay || !top || !bottom || !shoe || !bow) return null;
    return {
      overlay,
      top,
      bottom,
      shoe,
      accessories: [bow],
      layer: null,
      gala: true,
      costume: concept === 'assinatura',
      overlayName: concept === 'declaracao' ? 'Smoking de veludo com lapela de cetim' : undefined,
      overlayFabric: concept === 'declaracao' ? 'Veludo de algodão com lapela de cetim' : undefined,
    };
  }

  const overlay = wantsOverlay(F, concept, req.climate)
    ? selectModel('sobreposicao', F, ctx, concept, usedModels, (m) => m.id !== 'sobretudo' || req.climate === 'frio', (m) => {
        // Com formalidade alta, o paletó estruturado é o esperado.
        if (F >= 3.8 && concept !== 'declaracao') return hasTrait(m, 'paleto') ? 4 : -3;
        if (req.climate === 'quente') return m.id === 'blazer-linho' ? 3 : 0;
        return 0;
      })
    : null;

  const overlayIsJacket = hasTrait(overlay, 'paleto');
  const top = selectModel('superior', F, ctx, concept, usedModels, () => true, (m) => {
    let b = 0;
    if (overlayIsJacket && F >= 3.8 && concept === 'assinatura') b += hasTrait(m, 'colarinho') ? 5 : -2;
    if (!overlay && F >= 3.5) b += hasTrait(m, 'colarinho') ? 2 : 0;
    if (overlay?.id === 'cardiga-trico' || overlay?.id === 'jaqueta-camurca') b += m.id === 'camiseta-pima' || m.id === 'camisa-oxford' ? 2 : 0;
    return b;
  });
  if (!top) return null;

  const costumeWanted = concept === 'assinatura' && F >= 4 && hasTrait(overlay, 'terno');
  const bottom = selectModel('inferior', F, ctx, concept, usedModels, () => true, (m) => {
    let b = 0;
    if (costumeWanted) b += hasTrait(m, 'terno') ? 8 : -4;
    if (overlay?.id === 'blazer-linho' && m.id === 'calca-linho') b += 2;
    return b;
  });
  if (!bottom) return null;
  const costume = costumeWanted && hasTrait(bottom, 'terno');

  const shoe = selectModel('calcado', F, ctx, concept, usedModels, () => true, (m) => {
    if (bottom.id === 'jeans-escuro') return m.id === 'chelsea-boot' || m.id === 'tenis-couro' ? 2 : 0;
    if (bottom.id === 'bermuda-alfaiataria') return m.id === 'mocassim-camurca' || m.id === 'tenis-couro' ? 3 : -2;
    return 0;
  });
  if (!shoe) return null;

  // Camada extra no frio: se nada aquece de verdade, entra o sobretudo (ou troca-se o tricô).
  let layer: PieceModel | null = null;
  let finalTop = top;
  if (req.climate === 'frio' && !hasTrait(overlay, 'camada') && !hasTrait(top, 'camada')) {
    const coat = pieceModel('sobretudo');
    if (overlay && F >= 3.5 && coat) {
      layer = coat;
    } else {
      const warmTop = selectModel('superior', F, ctx, concept, usedModels, (m) => hasTrait(m, 'camada'));
      if (warmTop) finalTop = warmTop;
    }
  }

  // Acessórios
  const accessories: PieceModel[] = [];
  const room = MAX_PIECES - 3 - (overlay ? 1 : 0) - (layer ? 1 : 0);
  if (room > 0) {
    const candidates: PieceModel[] = [];
    const formalOccasion = ctx.occasion === 'trabalho' || ctx.occasion === 'festa' || ctx.occasion === 'jantar' || ctx.occasion === 'outro';
    if (hasTrait(finalTop, 'colarinho') && F >= 3.8 && (formalOccasion || F >= 4.3)) {
      const tie = pieceModel(concept === 'assinatura' || F >= 4.5 ? 'gravata-seda' : 'gravata-trico');
      if (tie) candidates.push(tie);
    }
    const hasTie = candidates.length > 0;
    if (overlayIsJacket && F >= 3.3 && (concept === 'declaracao' || (concept === 'assinatura' && F >= 4.4) || (!hasTie && concept === 'contemporaneo' && F >= 3.5))) {
      const handkerchief = pieceModel('lenco-bolso');
      if (handkerchief) candidates.push(handkerchief);
    }
    const metal = season.metals === 'ambos' ? (concept === 'declaracao' ? 'ouro' : 'prata') : season.metals;
    const dressWatch = F >= 3.8 || (concept === 'assinatura' && F >= 3);
    const watch = pieceModel(dressWatch ? 'relogio-couro' : metal === 'ouro' ? 'relogio-dourado' : 'relogio-aco');
    if (watch) candidates.push(watch);
    if (!overlay && F <= 3.6 && bottom.id !== 'bermuda-alfaiataria') {
      const belt = pieceModel('cinto-couro');
      if (belt) candidates.push(belt);
    }
    accessories.push(...candidates.slice(0, Math.min(2, room)));
  }

  return { overlay, top: finalTop, bottom, shoe, accessories, layer, gala: false, costume };
}

interface MainColors {
  overlay: ColorOption | null;
  top: ColorOption;
  bottom: ColorOption;
}

function contrastPenalty(diff: number, contrast: ContrastLevel): number {
  if (contrast === 'alto') return Math.max(0, 42 - diff);
  if (contrast === 'baixo') return Math.max(0, diff - 24);
  return Math.max(0, 18 - diff) + Math.max(0, diff - 46);
}

function closeness(option: ColorOption): number {
  const value = clamp(1 - option.cartela / 40, 0, 1) * 100;
  return option.fixed ? Math.max(value, 60) : value;
}

function scoreMain(colors: MainColors, concept: ConceptId, F: number, ctx: Ctx, previous: Draft[], gala: boolean): number {
  const { req, seed } = ctx;
  const { overlay, top, bottom } = colors;
  const frame = overlay ?? bottom;
  const mains = overlay ? [overlay, top, bottom] : [top, bottom];

  const core = mains.reduce((sum, o) => sum + closeness(o), 0) / mains.length;
  let score = core * (concept === 'assinatura' ? 0.7 : 0.45);
  // Camisa de smoking é branca ou quase: nada de cor no peitilho.
  if (gala) score -= top.C * 1.5;

  // Contraste pessoal: rosto (parte de cima) × moldura (sobreposição ou calça)
  const diff = Math.abs(top.L - frame.L);
  score -= contrastPenalty(diff, req.contrast) * 0.8;
  if (deltaE(top.hex, frame.hex) < 10) score -= 20;
  if (overlay && deltaE(top.hex, bottom.hex) < 8) score -= 6;

  // Horário
  const baseL = overlay ? (overlay.L + bottom.L) / 2 : bottom.L;
  if (req.timeOfDay === 'noite') score -= Math.max(0, baseL - 38) * 0.5;
  else if (req.timeOfDay === 'manha') score -= Math.max(0, 40 - baseL) * 0.25 + Math.max(0, 60 - top.L) * 0.1;
  else score -= Math.max(0, baseL - 72) * 0.2;

  // Clima
  const meanL = mains.reduce((s, o) => s + o.L, 0) / mains.length;
  if (req.climate === 'quente') score -= Math.max(0, 38 - meanL) * 0.2;
  if (req.climate === 'frio') score -= Math.max(0, meanL - 65) * 0.15;

  // Formalidade
  if (F >= 4) {
    score -= Math.max(0, bottom.L - 45) * 0.4;
    if (overlay) score -= Math.max(0, overlay.L - 50) * 0.4;
    score -= Math.max(0, top.C - 25) * (concept === 'declaracao' ? 0.1 : 0.3);
  }

  // Conceito
  const accentCount = mains.filter((o) => o.accent).length;
  if (concept === 'assinatura') {
    score -= Math.max(0, accentCount - 1) * 10;
    score -= Math.max(0, top.C - 30) * 0.3;
    if (overlay && F >= 3.5 && top.L > 70 && overlay.L < 40) score += 4;
  } else if (concept === 'contemporaneo') {
    const tonal = top.C >= 6 && frame.C >= 6;
    if (tonal) score += Math.max(0, 35 - hueDistance(top.h, frame.h)) * 0.35;
    else if (top.C < 6 && frame.C < 6) score -= 6;
    else score -= 3;
    score -= Math.max(0, accentCount - 1) * 4;
  } else {
    const hero = overlay && overlay.accent ? overlay : top;
    if (hero.accent) score += hero.C * 0.35 + 6;
    else score -= 14;
    score -= Math.max(0, accentCount - 2) * 6;
  }

  // Variação entre os três looks
  for (const prev of previous) {
    if (deltaE(prev.top.color.hex, top.hex) < 8) score -= 14;
    if (prev.overlay && overlay && deltaE(prev.overlay.color.hex, overlay.hex) < 8) score -= 10;
    if (deltaE(prev.bottom.color.hex, bottom.hex) < 8) score -= 5;
  }

  // Peças do acervo
  for (const o of mains) if (o.inCatalog) score += 5;

  score += noise(seed, `color|${concept}|${overlay?.hex ?? '-'}|${top.hex}|${bottom.hex}`) * 6;
  return score;
}

function chooseBest<T>(items: T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const s = score(item);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
}

function closestOption(target: string, options: ColorOption[]): ColorOption | null {
  return chooseBest(options, (o) => -deltaE(o.hex, target));
}

function composeDraft(concept: ConceptId, ctx: Ctx, previous: Draft[], usedModels: Set<string>): Draft | null {
  const { req, seed, season } = ctx;
  const F = conceptFormality(concept, ctx);
  const plan = planModels(concept, F, ctx, usedModels);
  if (!plan) return null;

  const fabricPick = Math.floor(noise(seed, `fabric|${concept}`) * 4);
  const slot = (model: PieceModel, color: ColorOption, name?: string, fabric?: string): Slotted => ({
    model,
    color,
    fabric: fabric ?? fabricFor(model, req.climate, fabricPick),
    ...(name ? { name } : {}),
  });

  // --- Cores principais -------------------------------------------------
  let overlayOptions: (ColorOption | null)[] = [null];
  if (plan.overlay) {
    const galaVelvet = plan.gala && concept === 'declaracao';
    overlayOptions = galaVelvet
      ? optionsFor(plan.overlay, F, ctx, { pool: [...ctx.accents, ...ctx.neutrals], lightness: [4, 38] })
      : optionsFor(plan.overlay, F, ctx);
  }
  const topOptions = optionsFor(plan.top, F, ctx);
  const bottomFollowsOverlay = Boolean(plan.overlay) && (plan.costume || (plan.gala && concept !== 'declaracao'));
  const bottomOptions = plan.gala && concept === 'declaracao' ? optionsFor(plan.bottom, F, ctx, { pool: ctx.neutrals, lightness: [4, 28] }) : optionsFor(plan.bottom, F, ctx);

  let best: MainColors | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const overlay of overlayOptions) {
    for (const top of topOptions) {
      const bottoms = bottomFollowsOverlay && overlay ? [overlay] : bottomOptions;
      for (const bottom of bottoms) {
        const candidate: MainColors = { overlay, top, bottom };
        const s = scoreMain(candidate, concept, F, ctx, previous, plan.gala);
        if (s > bestScore) {
          bestScore = s;
          best = candidate;
        }
      }
    }
  }
  if (!best) return null;
  const main = best;

  // --- Calçado ----------------------------------------------------------
  const shoeColor = chooseBest(optionsFor(plan.shoe, F, ctx), (o) => {
    let s = 0;
    if (F >= 3.5) s -= Math.max(0, o.L - main.bottom.L - 8) * 0.5;
    if (F >= 4.5) s -= Math.max(0, o.L - 25) * 0.3;
    if (req.timeOfDay === 'noite') s -= Math.max(0, o.L - 35) * 0.3;
    if (concept === 'declaracao') s += o.C * 0.12;
    if (concept === 'contemporaneo' && main.bottom.C >= 6 && o.C >= 6) s += Math.max(0, 40 - hueDistance(o.h, main.bottom.h)) * 0.1;
    if (deltaE(o.hex, main.bottom.hex) < 6 && F < 4) s -= 3;
    for (const prev of previous) if (deltaE(prev.shoe.color.hex, o.hex) < 6) s -= 5;
    if (o.inCatalog) s += 4;
    return s + noise(seed, `shoe|${concept}|${o.hex}`) * 4;
  });
  if (!shoeColor) return null;

  // --- Camada extra -----------------------------------------------------
  let layer: Slotted | null = null;
  if (plan.layer && main.overlay) {
    const overlayColor = main.overlay;
    const coatColor = chooseBest(optionsFor(plan.layer, F, ctx), (o) => {
      let s = closeness(o) * 0.3;
      if (deltaE(o.hex, overlayColor.hex) < 10) s -= 15;
      if (deltaE(o.hex, main.top.hex) < 12) s -= 15;
      if (req.timeOfDay === 'noite') s -= Math.max(0, o.L - 40) * 0.3;
      if (o.inCatalog) s += 4;
      return s + noise(seed, `layer|${concept}|${o.hex}`) * 4;
    });
    if (coatColor) layer = slot(plan.layer, coatColor);
  }

  // --- Acessórios -------------------------------------------------------
  const accessories: Slotted[] = [];
  const metal = season.metals === 'ambos' ? (concept === 'declaracao' ? 'ouro' : 'prata') : season.metals;
  let tieColor: ColorOption | null = null;
  for (const model of plan.accessories) {
    if (model.id === 'gravata-borboleta') {
      const followsOverlay = concept !== 'declaracao' && Boolean(main.overlay);
      const color = followsOverlay ? main.overlay : chooseBest(ctx.neutrals, (o) => -o.L);
      if (color) {
        tieColor = color;
        accessories.push({ ...slot(model, color), follow: followsOverlay });
      }
    } else if (model.id === 'gravata-seda' || model.id === 'gravata-trico') {
      const color = chooseBest(optionsFor(model, F, ctx), (o) => {
        let s = 0;
        if (deltaE(o.hex, main.top.hex) < 20) s -= 15;
        s -= Math.max(0, o.L - main.top.L + 15) * 0.3;
        if (main.overlay && deltaE(o.hex, main.overlay.hex) < 8) s -= 6;
        if (concept === 'assinatura') s += (o.accent ? 3 : 0) - Math.max(0, o.C - 35) * 0.2;
        if (concept === 'contemporaneo') {
          const ref = main.overlay ?? main.top;
          if (o.C >= 6 && ref.C >= 6 && hueDistance(o.h, ref.h) < 35) s += 6;
        }
        if (concept === 'declaracao') s += o.C * 0.3 + (o.accent ? 6 : 0);
        if (req.timeOfDay === 'noite') s -= Math.max(0, o.L - 45) * 0.2;
        return s + noise(seed, `tie|${concept}|${o.hex}`) * 5;
      });
      if (color) {
        tieColor = color;
        accessories.push(slot(model, color));
      }
    } else if (model.id === 'lenco-bolso') {
      const color = chooseBest(optionsFor(model, F, ctx), (o) => {
        let s = 0;
        if (tieColor && deltaE(o.hex, tieColor.hex) < 20) s -= 20;
        if (main.overlay && deltaE(o.hex, main.overlay.hex) < 15) s -= 12;
        if (concept === 'assinatura' || plan.gala) s += o.L > 80 ? 8 : 0;
        if (concept === 'declaracao' && !plan.gala) s += (o.accent ? 4 : 0) + o.C * 0.25;
        if (concept === 'contemporaneo' && o.C >= 6 && main.top.C >= 6 && hueDistance(o.h, main.top.h) < 35) s += 5;
        return s + noise(seed, `lenco|${concept}|${o.hex}`) * 5;
      });
      if (color) accessories.push(slot(model, color));
    } else if (model.id === 'relogio-couro') {
      const color = closestOption(shoeColor.hex, optionsFor(model, F, ctx));
      if (color) {
        const base = fabricFor(model, req.climate, fabricPick);
        accessories.push(slot(model, color, undefined, `${base} com caixa ${metal === 'ouro' ? 'dourada' : 'de aço'}`));
      }
    } else if (model.id === 'cinto-couro') {
      const color = closestOption(shoeColor.hex, optionsFor(model, F, ctx));
      if (color) accessories.push(slot(model, color));
    } else {
      const color = optionsFor(model, F, ctx)[0];
      if (color) accessories.push(slot(model, color));
    }
  }

  const fabricFromPlan = plan.overlayFabric;
  return {
    concept,
    formality: F,
    gala: plan.gala,
    layer,
    overlay: plan.overlay && main.overlay ? slot(plan.overlay, main.overlay, plan.overlayName, fabricFromPlan) : null,
    top: slot(plan.top, main.top),
    bottom: { ...slot(plan.bottom, main.bottom), follow: bottomFollowsOverlay },
    shoe: slot(plan.shoe, shoeColor),
    accessories,
  };
}

// ------------------------------------------------------------
// Texto: títulos, taglines, argumentos e dicas
// ------------------------------------------------------------

function shortColor(name: string): string {
  const words = name
    .replace(/^(Couro|Camurça)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 2).join(' ');
}

const TITLE_TEMPLATES: Record<ConceptId, string[]> = {
  assinatura: ['{A} & {B}', '{A} e {B} sob Medida', 'Clássico em {A}', '{A} de Assinatura'],
  contemporaneo: ['Tom sobre Tom em {A}', 'Gradação de {A}', '{A} em Camadas', 'Estudo em {A} e {B}'],
  declaracao: [],
};

/** Contemporâneo sem harmonia tonal real não pode prometer "tom sobre tom". */
const CONTEMPORARY_MIXED_TITLES = ['{A} em Camadas', 'Estudo em {A} e {B}', '{A} com {B}', '{A} Descontraído'];

function isTonal(draft: Draft): boolean {
  const frame = draft.overlay?.color ?? draft.bottom.color;
  return draft.top.color.C >= 6 && frame.C >= 6 && hueDistance(draft.top.color.h, frame.h) < 35;
}

const DECLARATION_TITLES: Record<TimeOfDayId, string[]> = {
  manha: ['Manhã em {A}', '{A} ao Sol', '{A} em Primeira Luz'],
  tarde: ['{A} ao Entardecer', 'Tarde em {A}', '{A} em Luz Dourada'],
  noite: ['{A} Noturno', 'Noite em {A}', '{A} à Meia-Luz'],
};

const TAGLINES: Record<ConceptId, string[]> = {
  assinatura: [
    'A escolha certeira: proporção limpa e cores que trabalham a seu favor.',
    'Sobriedade com intenção — nada sobra, nada falta.',
    'O ponto de equilíbrio entre respeito ao evento e presença própria.',
    'Linhas atemporais, calibradas para a sua cartela.',
  ],
  contemporaneo: [
    'Alfaiataria com respiro: estrutura onde importa, leveza no resto.',
    'Tons vizinhos em camadas, para uma elegância sem esforço aparente.',
    'Formal na medida, descontraído no detalhe.',
    'A mistura precisa entre o clássico e o cotidiano.',
  ],
  declaracao: [
    'Uma cor da sua cartela assume o protagonismo.',
    'Textura e cor para quem entra e é lembrado.',
    'Personalidade calibrada: ousadia dentro da sua estação.',
    'Presença marcante, sem sair do tom certo.',
  ],
};

const CONTRAST_PHRASE: Record<ContrastLevel, string> = {
  alto: 'o contraste marcado entre claro e escuro acompanha a nitidez dos seus traços',
  medio: 'a diferença moderada de valores emoldura o rosto sem endurecê-lo',
  baixo: 'os valores próximos preservam a suavidade natural entre pele, cabelo e olhos',
};

const FABRIC_PHRASE: Record<ClimateId, string> = {
  frio: 'encorpados e uma camada a mais para o frio',
  ameno: 'de peso médio para o clima ameno',
  quente: 'leves e respiráveis para o calor',
};

interface TipRule {
  text: string | ((d: Draft, ctx: Ctx) => string);
  when: (d: Draft, ctx: Ctx) => boolean;
}

const ids = (d: Draft): string[] =>
  [d.layer, d.overlay, d.top, d.bottom, d.shoe, ...d.accessories].filter((s): s is Slotted => Boolean(s)).map((s) => s.model.id);
const has = (d: Draft, id: string) => ids(d).includes(id);
const hasAny = (d: Draft, list: string[]) => list.some((id) => has(d, id));
const hasJacket = (d: Draft) => hasTrait(d.overlay?.model, 'paleto');
const hasTie = (d: Draft) => hasAny(d, ['gravata-seda', 'gravata-trico']);
const hasDressShoe = (d: Draft) => hasAny(d, ['oxford', 'oxford-verniz', 'derby']);

const TIPS: TipRule[] = [
  { text: 'O punho da camisa deve aparecer de 1 a 1,5 cm além da manga do paletó.', when: (d) => hasJacket(d) && hasTrait(d.top.model, 'colarinho') },
  { text: 'Paletó de dois botões: feche só o de cima — o último botão fica sempre aberto.', when: (d) => hasJacket(d) && !d.gala },
  { text: 'A costura do ombro do paletó termina exatamente onde termina o seu ombro, sem sobra nem repuxo.', when: hasJacket },
  { text: 'A manga do paletó termina no osso do punho, deixando o gesto livre e limpo.', when: hasJacket },
  { text: 'Barra sem quebra ou com meia quebra: o tecido apenas toca o peito do pé.', when: (d) => hasAny(d, ['calca-alfaiataria', 'calca-pregas', 'calca-smoking']) },
  { text: 'O cinto acompanha o tom e o acabamento do sapato — couro liso com couro liso, camurça com couro fosco.', when: (d) => has(d, 'cinto-couro') || (hasDressShoe(d) && !d.gala) },
  { text: 'O lenço de bolso conversa com a gravata, mas nunca repete o mesmo tecido e a mesma cor.', when: (d) => hasTie(d) && has(d, 'lenco-bolso') },
  { text: 'Sem gravata, o lenço de bolso ganha dobra reta e discreta, no máximo um dedo acima do bolso.', when: (d) => has(d, 'lenco-bolso') && !hasTie(d) && !d.gala },
  { text: 'A ponta da gravata deve tocar a fivela do cinto — nem acima, nem abaixo.', when: hasTie },
  { text: 'A largura da gravata acompanha a largura da lapela: lapela estreita, gravata estreita.', when: (d) => hasTie(d) && hasJacket(d) },
  { text: 'A meia acompanha a calça, não o sapato, e deve cobrir a canela quando você se senta.', when: hasDressShoe },
  {
    text: 'Com loafer ou mocassim no calor, a meia invisível mantém o tornozelo limpo.',
    when: (d, ctx) => hasAny(d, ['loafer', 'mocassim-camurca']) && ctx.req.climate === 'quente',
  },
  {
    text: 'Loafer fora do calor pede meia fina no tom da calça, para a linha da perna seguir contínua.',
    when: (d, ctx) => has(d, 'loafer') && ctx.req.climate !== 'quente',
  },
  { text: 'Linho amassa, e isso faz parte do charme: passe a vapor, nunca com ferro muito quente.', when: (d) => hasAny(d, ['blazer-linho', 'camisa-linho', 'calca-linho']) },
  { text: 'Gola alta sob paletó pede malha fina, para a gola não disputar espaço com a lapela.', when: (d) => has(d, 'gola-alta') && hasJacket(d) },
  { text: 'O sobretudo precisa cobrir todo o paletó: comprimento mínimo até o meio da coxa.', when: (d) => has(d, 'sobretudo') },
  { text: 'No smoking, o cetim da lapela, o galão da calça e a gravata-borboleta devem ter o mesmo brilho.', when: (d) => d.gala },
  { text: 'Camurça pede escova de cerdas macias e impermeabilizante antes do primeiro uso.', when: (d) => hasAny(d, ['jaqueta-camurca', 'mocassim-camurca']) },
  { text: 'Chelsea boot com calça de barra estreita e sem quebra, para o elástico lateral aparecer limpo.', when: (d) => has(d, 'chelsea-boot') },
  { text: 'Tênis de couro com alfaiataria só funciona impecável: solado fino e couro sempre limpo.', when: (d) => has(d, 'tenis-couro') },
  { text: 'Cardigã: feche apenas os botões centrais, com comprimento que cubra o cós da calça.', when: (d) => has(d, 'cardiga-trico') },
  { text: 'Camiseta sob sobreposição pede gola firme, que não ceda, e malha que não marque o corpo.', when: (d) => has(d, 'camiseta-pima') && Boolean(d.overlay) },
  { text: 'Polo de tricô fica mais alinhada por dentro da calça quando o cinto está à vista.', when: (d) => has(d, 'polo-trico') },
  { text: 'O relógio deve ser fino o bastante para o punho da camisa deslizar sobre ele.', when: (d) => hasAny(d, ['relogio-couro', 'relogio-aco', 'relogio-dourado']) && hasTrait(d.top.model, 'colarinho') },
  {
    text: (d, ctx) => {
      const metal = ctx.season.metals === 'ambos' ? (d.concept === 'declaracao' ? 'dourado' : 'prateado') : ctx.season.metals === 'ouro' ? 'dourado' : 'prateado';
      return `Metais em sintonia: fivela do cinto, caixa do relógio e abotoaduras no mesmo tom ${metal}.`;
    },
    when: (d) => hasAny(d, ['relogio-aco', 'relogio-dourado', 'cinto-couro']),
  },
  { text: 'Jeans ao lado de peças de alfaiataria pede lavagem escura e uniforme, sem puídos.', when: (d) => has(d, 'jeans-escuro') },
  { text: 'Chino ajustado no quadril e levemente afunilado na barra alonga a silhueta.', when: (d) => has(d, 'chino') },
  { text: 'Calça de pregas se usa na cintura natural: é o que mantém as pregas retas e a perna longa.', when: (d) => has(d, 'calca-pregas') },
  { text: 'Bermuda de alfaiataria termina logo acima do joelho, com barra discreta.', when: (d) => has(d, 'bermuda-alfaiataria') },
  { text: 'Com a camisa por fora, a barra não deve passar do meio do zíper da calça.', when: (d) => hasAny(d, ['camisa-linho', 'camisa-seda']) && !d.overlay },
  { text: 'Veludo absorve a luz: combine com superfícies lisas para a textura ser a protagonista.', when: (d) => has(d, 'blazer-veludo') || (d.gala && d.concept === 'declaracao') },
  { text: 'Oxford com costume, derby com peças mais descontraídas: o fechamento do sapato define a formalidade.', when: (d) => hasAny(d, ['oxford', 'derby']) },
];

const FALLBACK_TIP = 'Ajuste antes de tudo: uma peça simples, bem ajustada, vale mais do que uma peça nobre fora de medida.';

function chooseTip(draft: Draft, ctx: Ctx, usedTips: Set<string>): string {
  const texts = TIPS.filter((t) => t.when(draft, ctx)).map((t) => (typeof t.text === 'string' ? t.text : t.text(draft, ctx)));
  const fresh = texts.filter((t) => !usedTips.has(t));
  if (fresh.length === 0) return usedTips.has(FALLBACK_TIP) && texts.length ? texts[0] : FALLBACK_TIP;
  return pickFrom(fresh, ctx.seed, `tip|${draft.concept}`);
}

function fillTemplate(template: string, a: string, b: string): string {
  return template.replace('{A}', a).replace('{B}', b);
}

function buildTitle(draft: Draft, pieces: LookPiece[], ctx: Ctx, usedTitles: Set<string>): string {
  const { seed, req } = ctx;
  const bySlot = (slotId: PieceSlot) => pieces.find((p) => p.slot === slotId);
  const topName = shortColor(bySlot('superior')?.color || draft.top.color.name);
  const frameName = shortColor((draft.overlay ? pieces.filter((p) => p.slot === 'sobreposicao').pop()?.color : bySlot('inferior')?.color) || draft.bottom.color.name);

  let a: string;
  let b: string;
  let templates: string[];
  if (draft.concept === 'assinatura') {
    a = frameName;
    b = topName;
    templates = TITLE_TEMPLATES.assinatura;
  } else if (draft.concept === 'contemporaneo') {
    a = topName;
    b = frameName;
    templates = isTonal(draft) ? TITLE_TEMPLATES.contemporaneo : CONTEMPORARY_MIXED_TITLES;
  } else {
    const heroIsOverlay = Boolean(draft.overlay && draft.overlay.color.accent);
    a = heroIsOverlay ? frameName : topName;
    b = heroIsOverlay ? topName : frameName;
    templates = DECLARATION_TITLES[req.timeOfDay] ?? DECLARATION_TITLES.tarde;
  }
  if (lower(a) === lower(b)) templates = templates.filter((t) => !t.includes('{B}'));
  if (templates.length === 0) templates = [`${draft.concept === 'declaracao' ? 'Declaração' : 'Assinatura'} em {A}`];

  const start = Math.floor(noise(seed, `title|${draft.concept}`) * templates.length);
  for (let i = 0; i < templates.length; i++) {
    const title = fillTemplate(templates[(start + i) % templates.length], a, b);
    if (title.length <= 40 && !usedTitles.has(lower(title))) return title;
  }
  return fillTemplate(templates[start % templates.length], a, b).slice(0, 40).trim();
}

function buildRationale(draft: Draft, pieces: LookPiece[], ctx: Ctx): string {
  const { season, req } = ctx;
  const topPiece = pieces.find((p) => p.slot === 'superior');
  const overlayPiece = pieces.filter((p) => p.slot === 'sobreposicao').pop();
  const bottomPiece = pieces.find((p) => p.slot === 'inferior');
  const top = lower(topPiece?.color || draft.top.color.name);
  const frame = lower((draft.overlay ? overlayPiece?.color : bottomPiece?.color) || draft.bottom.color.name);
  const contrast = CONTRAST_PHRASE[req.contrast];
  const context = `Formalidade ${Math.round(clamp(draft.formality, 1, 5))} de 5 para ${occasionPhrase(req)} ${TIME_PHRASE[req.timeOfDay]}, com tecidos ${FABRIC_PHRASE[req.climate]}.`;

  if (draft.concept === 'assinatura') {
    return `${capitalize(frame)} com ${top} perto do rosto seguem a cartela ${season.name}, e ${contrast}. ${context}`;
  }
  if (draft.concept === 'contemporaneo') {
    return isTonal(draft)
      ? `O tom sobre tom entre ${top} e ${frame} suaviza a estrutura sem sair da cartela ${season.name}; ${contrast}. ${context}`
      : `${capitalize(top)} com ${frame} mistura estrutura e conforto dentro da cartela ${season.name}; ${contrast}. ${context}`;
  }
  const heroOverlay = Boolean(draft.overlay && draft.overlay.color.accent);
  const hero = heroOverlay ? frame : top;
  const heroIsAccent = heroOverlay || draft.top.color.accent;
  return heroIsAccent
    ? `${capitalize(hero)} é uma das cores de destaque da estação ${season.name} e assume o protagonismo ${heroOverlay ? 'na sobreposição' : 'perto do rosto'}; ${contrast}. ${context}`
    : `A textura assume o protagonismo em neutros da cartela ${season.name}; ${contrast}. ${context}`;
}

// ------------------------------------------------------------
// Montagem final
// ------------------------------------------------------------

function toPieces(draft: Draft, ctx: Ctx, usedProducts: Map<string, number>): LookPiece[] {
  const entries = [draft.layer, draft.overlay, draft.top, draft.bottom, draft.shoe, ...draft.accessories].filter(
    (s): s is Slotted => Boolean(s),
  );
  const takenInLook = new Set<string>();
  const pieces: LookPiece[] = [];
  let overlayPiece: LookPiece | null = null;

  for (const entry of entries) {
    // Costume e smoking: a peça acompanha a cor final da sobreposição (que pode vir do catálogo).
    const followed = entry.follow && overlayPiece ? { name: overlayPiece.color, hex: overlayPiece.hex } : null;
    const targetHex = followed?.hex ?? entry.color.hex;
    const matches = catalogMatches(entry.model, targetHex, draft.formality, ctx).filter(
      (p) => !takenInLook.has(p.id) && (!followed || deltaE(normalizeHex(p.hex_color) as string, targetHex) <= 6),
    );
    // Prefere peças ainda não usadas em outro look; repete apenas se não houver alternativa.
    const fresh = matches.filter((p) => !usedProducts.has(p.id));
    const product = fresh[0] ?? matches.find((p) => (usedProducts.get(p.id) ?? 0) < 2) ?? null;

    let piece: LookPiece;
    if (product) {
      takenInLook.add(product.id);
      usedProducts.set(product.id, (usedProducts.get(product.id) ?? 0) + 1);
      const hex = normalizeHex(product.hex_color) as string;
      piece = {
        slot: entry.model.slot,
        name: product.name,
        color: product.color_name?.trim() || followed?.name || entry.color.name,
        hex,
        ...(product.fabric?.trim() ? { fabric: product.fabric.trim() } : entry.fabric ? { fabric: entry.fabric } : {}),
        productId: product.id,
      };
    } else {
      piece = {
        slot: entry.model.slot,
        name: entry.name ?? entry.model.name,
        color: followed?.name ?? entry.color.name,
        hex: followed?.hex ?? entry.color.hex,
        ...(entry.fabric ? { fabric: entry.fabric } : {}),
        productId: null,
      };
    }
    pieces.push(piece);
    if (entry === draft.overlay) overlayPiece = piece;
  }

  return pieces
    .map((piece, index) => ({ piece, index }))
    .sort((a, b) => PIECE_SLOTS.indexOf(a.piece.slot) - PIECE_SLOTS.indexOf(b.piece.slot) || a.index - b.index)
    .map((x) => x.piece);
}

function paletteOf(pieces: LookPiece[]): ColorSwatch[] {
  const out: ColorSwatch[] = [];
  for (const piece of pieces) {
    if (out.some((c) => deltaE(c.hex, piece.hex) < 3)) continue;
    out.push({ name: piece.color || piece.name, hex: piece.hex });
    if (out.length === 5) break;
  }
  return out;
}

const VALID_TONES = ['clara', 'morena', 'parda', 'negra'];
const VALID_SUBTONES = ['frio', 'neutro', 'quente'];
const VALID_CONTRASTS = ['alto', 'medio', 'baixo'];
const VALID_TIMES = ['manha', 'tarde', 'noite'];
const VALID_CLIMATES = ['frio', 'ameno', 'quente'];
const VALID_STYLES = ['classico', 'contemporaneo', 'ousado'];

function sanitize(req: StyleRequest): StyleRequest {
  const occasionIds = OCCASIONS.map((o) => o.id as string);
  return {
    skinTone: VALID_TONES.includes(req.skinTone) ? req.skinTone : 'morena',
    subtone: VALID_SUBTONES.includes(req.subtone) ? req.subtone : 'neutro',
    contrast: VALID_CONTRASTS.includes(req.contrast) ? req.contrast : 'medio',
    occasion: occasionIds.includes(req.occasion) ? req.occasion : 'outro',
    timeOfDay: VALID_TIMES.includes(req.timeOfDay) ? req.timeOfDay : 'tarde',
    climate: VALID_CLIMATES.includes(req.climate) ? req.climate : 'ameno',
    style: (VALID_STYLES.includes(req.style) ? req.style : 'contemporaneo') as StylePreference,
    ...(typeof req.customVenue === 'string' && req.customVenue.trim() ? { customVenue: req.customVenue.trim().slice(0, 200) } : {}),
    ...(req.weightKg ? { weightKg: req.weightKg } : {}),
    ...(req.heightCm ? { heightCm: req.heightCm } : {}),
    ...(req.age ? { age: req.age } : {}),
    ...(req.gender ? { gender: req.gender } : {}),
    ...(req.bodyType ? { bodyType: req.bodyType } : {}),
  };
}

/** Compõe três looks (Assinatura, Contemporâneo, Declaração) — puro e determinístico. */
export function generateLooks(request: StyleRequest, catalog: Product[]): LooksResponse {
  const req = sanitize(request);
  const ctx = buildContext(req, Array.isArray(catalog) ? catalog : []);
  const drafts: Draft[] = [];
  const usedModels = new Set<string>();

  for (const concept of CONCEPTS) {
    const draft = composeDraft(concept, ctx, drafts, usedModels);
    if (!draft) continue;
    drafts.push(draft);
    for (const s of [draft.layer, draft.overlay, draft.top, draft.bottom, draft.shoe]) if (s) usedModels.add(s.model.id);
  }

  const usedProducts = new Map<string, number>();
  const usedTitles = new Set<string>();
  const usedTips = new Set<string>();
  const keyHex = ctx.seed.toString(36);

  const looks: Look[] = drafts.map((draft) => {
    const pieces = toPieces(draft, ctx, usedProducts);
    const title = buildTitle(draft, pieces, ctx, usedTitles);
    usedTitles.add(lower(title));
    const tip = chooseTip(draft, ctx, usedTips);
    usedTips.add(tip);
    return {
      id: `atelier-${keyHex}-${draft.concept}`,
      title,
      tagline: pickFrom(
        draft.concept === 'contemporaneo' && !isTonal(draft) ? TAGLINES.contemporaneo.filter((t) => !t.startsWith('Tons vizinhos')) : TAGLINES[draft.concept],
        ctx.seed,
        `tagline|${draft.concept}`,
      ),
      rationale: buildRationale(draft, pieces, ctx),
      formality: Math.round(clamp(draft.formality, 1, 5)),
      harmony: scoreHarmony(pieces, req),
      palette: paletteOf(pieces),
      pieces,
      tip,
      source: 'atelier',
    };
  });

  return { looks, source: 'atelier', summary: describeContext(req) };
}
