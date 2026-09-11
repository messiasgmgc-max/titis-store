// ============================================================
// Biblioteca de peças masculinas do Atelier — modelos genéricos por slot.
// Cada modelo descreve faixa de formalidade, climas, estilos, tecidos e regras de cor.
// Regra: somente imports relativos / "import type" (usado também fora do Next).
// ============================================================
import type { ClimateId, ColorSwatch, PieceSlot, StylePreference } from '../types';

/** Temperatura de uma cor fixa (couro, metal): filtrada conforme os metais da estação. */
export type SwatchTemperature = 'fria' | 'quente' | 'neutra';

export interface FixedSwatch extends ColorSwatch {
  temperature: SwatchTemperature;
}

/**
 * Traços usados pelo motor para montar e descrever looks:
 * - paleto: sobreposição estruturada que aceita lenço de bolso
 * - terno: pode formar costume (paletó e calça no mesmo tecido e cor)
 * - colarinho: parte de cima que aceita gravata
 * - textura: peça de textura marcante (veludo, camurça, tricô, linho)
 * - misto: transita entre formal e casual (look contemporâneo)
 * - classico: leitura clássica e segura
 * - noite / dia: horário em que a peça brilha
 * - gala: reservado a eventos de alta formalidade
 * - camada: peça de camada extra para o frio
 */
export type PieceTrait =
  | 'paleto'
  | 'terno'
  | 'colarinho'
  | 'textura'
  | 'misto'
  | 'classico'
  | 'noite'
  | 'dia'
  | 'gala'
  | 'camada'
  | 'couro'
  | 'metal'
  | 'gravata'
  | 'lenco'
  | 'cinto'
  | 'relogio';

export interface PieceModel {
  id: string;
  slot: PieceSlot;
  name: string;
  /** Faixa de formalidade 1 (descontraído) … 5 (black tie). */
  formality: [number, number];
  climates: ClimateId[];
  styles: StylePreference[];
  /** Tecidos possíveis por clima (o primeiro é o preferido). */
  fabrics: Partial<Record<ClimateId, string[]>>;
  /** true = aceita cor de destaque da cartela; false = apenas neutros. */
  accent: boolean;
  /** Cores fixas do material (couro, metal). Quando presentes, substituem a cartela. */
  fixedColors?: FixedSwatch[];
  /** Faixa de luminosidade L* aceitável para a cor da peça. */
  lightness?: [number, number];
  traits: PieceTrait[];
}

const fx = (name: string, hex: string, temperature: SwatchTemperature): FixedSwatch => ({ name, hex, temperature });

const ALL_CLIMATES: ClimateId[] = ['frio', 'ameno', 'quente'];
const ALL_STYLES: StylePreference[] = ['classico', 'contemporaneo', 'ousado'];

// Couros e materiais recorrentes
const LEATHER = {
  preto: fx('Couro Preto', '#141414', 'fria'),
  cafe: fx('Couro Café', '#3B2A22', 'quente'),
  tabaco: fx('Couro Tabaco', '#5C4033', 'quente'),
  conhaque: fx('Couro Conhaque', '#7A4A2A', 'quente'),
  borgonha: fx('Couro Borgonha', '#4A1F27', 'neutra'),
  grafite: fx('Couro Grafite', '#34363B', 'fria'),
  marinho: fx('Couro Marinho', '#1E2638', 'fria'),
};
const SUEDE = {
  tabaco: fx('Camurça Tabaco', '#6B4A33', 'quente'),
  areia: fx('Camurça Areia', '#B79F7E', 'quente'),
  cafe: fx('Camurça Café', '#4A362B', 'quente'),
  cinza: fx('Camurça Cinza', '#6E6F73', 'fria'),
  marinho: fx('Camurça Marinho', '#27314A', 'fria'),
};

export const PIECE_MODELS: PieceModel[] = [
  // ----------------------------------------------------------
  // Sobreposição
  // ----------------------------------------------------------
  {
    id: 'paleto-la-fria',
    slot: 'sobreposicao',
    name: 'Paletó de lã fria',
    formality: [4, 5],
    climates: ['frio', 'ameno'],
    styles: ['classico', 'contemporaneo'],
    fabrics: { frio: ['Lã fria Super 120s', 'Flanela de lã'], ameno: ['Lã fria Super 120s', 'Lã fria tropical'] },
    accent: false,
    lightness: [8, 55],
    traits: ['paleto', 'terno', 'classico'],
  },
  {
    id: 'paleto-tropical',
    slot: 'sobreposicao',
    name: 'Paletó de lã tropical',
    formality: [4, 5],
    climates: ['ameno', 'quente'],
    styles: ['classico', 'contemporaneo'],
    fabrics: { quente: ['Lã tropical fresca', 'Lã e seda'], ameno: ['Lã tropical fresca'] },
    accent: false,
    lightness: [10, 70],
    traits: ['paleto', 'terno', 'classico'],
  },
  {
    id: 'blazer-linho',
    slot: 'sobreposicao',
    name: 'Blazer desestruturado de linho',
    formality: [3, 4],
    climates: ['quente', 'ameno'],
    styles: ['contemporaneo', 'ousado', 'classico'],
    fabrics: { quente: ['Linho puro', 'Linho e seda'], ameno: ['Linho e algodão'] },
    accent: true,
    lightness: [15, 85],
    traits: ['paleto', 'textura', 'misto', 'dia'],
  },
  {
    id: 'blazer-desestruturado',
    slot: 'sobreposicao',
    name: 'Blazer desestruturado de malha',
    formality: [3, 4],
    climates: ['ameno', 'frio'],
    styles: ['contemporaneo', 'ousado'],
    fabrics: { ameno: ['Jérsei de lã', 'Piquet de algodão'], frio: ['Jérsei de lã encorpado'] },
    accent: true,
    lightness: [8, 70],
    traits: ['paleto', 'misto'],
  },
  {
    id: 'blazer-veludo',
    slot: 'sobreposicao',
    name: 'Blazer de veludo cotelê fino',
    formality: [3.5, 5],
    climates: ['frio', 'ameno'],
    styles: ['ousado', 'contemporaneo'],
    fabrics: { frio: ['Veludo de algodão'], ameno: ['Veludo de algodão leve'] },
    accent: true,
    lightness: [5, 50],
    traits: ['paleto', 'textura', 'noite'],
  },
  {
    id: 'smoking',
    slot: 'sobreposicao',
    name: 'Smoking com lapela de cetim',
    formality: [5, 5],
    climates: ALL_CLIMATES,
    styles: ['classico', 'contemporaneo', 'ousado'],
    fabrics: { frio: ['Lã fria com lapela de cetim'], ameno: ['Lã fria com lapela de cetim'], quente: ['Lã tropical com lapela de cetim'] },
    accent: false,
    lightness: [4, 28],
    traits: ['paleto', 'gala', 'noite', 'classico'],
  },
  {
    id: 'sobretudo',
    slot: 'sobreposicao',
    name: 'Sobretudo de lã',
    formality: [3.5, 5],
    climates: ['frio'],
    styles: ALL_STYLES,
    fabrics: { frio: ['Lã batida', 'Lã e cashmere'] },
    accent: false,
    lightness: [8, 65],
    traits: ['camada', 'classico'],
  },
  {
    id: 'jaqueta-camurca',
    slot: 'sobreposicao',
    name: 'Jaqueta de camurça',
    formality: [2, 3],
    climates: ['ameno', 'frio'],
    styles: ['contemporaneo', 'ousado'],
    fabrics: { ameno: ['Camurça'], frio: ['Camurça forrada'] },
    accent: false,
    fixedColors: [SUEDE.tabaco, SUEDE.areia, SUEDE.cafe, SUEDE.cinza, SUEDE.marinho],
    traits: ['textura', 'misto', 'camada'],
  },
  {
    id: 'overshirt',
    slot: 'sobreposicao',
    name: 'Overshirt de sarja',
    formality: [1.5, 3],
    climates: ['ameno', 'frio'],
    styles: ['contemporaneo', 'ousado'],
    fabrics: { ameno: ['Sarja de algodão'], frio: ['Lã escovada'] },
    accent: true,
    lightness: [12, 75],
    traits: ['misto', 'camada'],
  },
  {
    id: 'cardiga-trico',
    slot: 'sobreposicao',
    name: 'Cardigã de tricô',
    formality: [2, 3.5],
    climates: ['frio', 'ameno'],
    styles: ['contemporaneo', 'classico', 'ousado'],
    fabrics: { frio: ['Lã merino', 'Cashmere'], ameno: ['Algodão e cashmere'] },
    accent: true,
    lightness: [10, 80],
    traits: ['textura', 'misto', 'camada'],
  },

  // ----------------------------------------------------------
  // Parte de cima
  // ----------------------------------------------------------
  {
    id: 'camisa-social',
    slot: 'superior',
    name: 'Camisa social de algodão egípcio',
    formality: [3, 5],
    climates: ALL_CLIMATES,
    styles: ['classico', 'contemporaneo'],
    fabrics: { frio: ['Algodão egípcio twill'], ameno: ['Algodão egípcio popeline'], quente: ['Algodão egípcio voil'] },
    accent: true,
    lightness: [62, 100],
    traits: ['colarinho', 'classico'],
  },
  {
    id: 'camisa-smoking',
    slot: 'superior',
    name: 'Camisa de smoking com peitilho',
    formality: [5, 5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Algodão egípcio piquet'], ameno: ['Algodão egípcio piquet'], quente: ['Algodão egípcio voil'] },
    accent: false,
    lightness: [85, 100],
    traits: ['colarinho', 'gala'],
  },
  {
    id: 'camisa-oxford',
    slot: 'superior',
    name: 'Camisa oxford de colarinho abotoado',
    formality: [2.5, 4],
    climates: ALL_CLIMATES,
    styles: ['classico', 'contemporaneo'],
    fabrics: { frio: ['Oxford de algodão encorpado'], ameno: ['Oxford de algodão'], quente: ['Oxford leve de algodão'] },
    accent: true,
    lightness: [55, 100],
    traits: ['colarinho', 'classico', 'dia'],
  },
  {
    id: 'camisa-linho',
    slot: 'superior',
    name: 'Camisa de linho',
    formality: [2, 3.5],
    climates: ['quente', 'ameno'],
    styles: ALL_STYLES,
    fabrics: { quente: ['Linho puro'], ameno: ['Linho e algodão'] },
    accent: true,
    lightness: [30, 100],
    traits: ['textura', 'misto', 'dia'],
  },
  {
    id: 'camisa-seda',
    slot: 'superior',
    name: 'Camisa de seda lavada',
    formality: [3, 4],
    climates: ['ameno', 'quente'],
    styles: ['ousado', 'contemporaneo'],
    fabrics: { ameno: ['Seda lavada'], quente: ['Seda e viscose'] },
    accent: true,
    lightness: [15, 90],
    traits: ['textura', 'noite'],
  },
  {
    id: 'polo-trico',
    slot: 'superior',
    name: 'Polo de tricô',
    formality: [2, 3.5],
    climates: ['ameno', 'quente'],
    styles: ['contemporaneo', 'classico', 'ousado'],
    fabrics: { ameno: ['Tricô de algodão pima'], quente: ['Tricô de linho e algodão'] },
    accent: true,
    lightness: [15, 90],
    traits: ['textura', 'misto'],
  },
  {
    id: 'gola-alta',
    slot: 'superior',
    name: 'Gola alta de merino',
    formality: [2.5, 4.5],
    climates: ['frio', 'ameno'],
    styles: ['contemporaneo', 'ousado', 'classico'],
    fabrics: { frio: ['Lã merino extrafina'], ameno: ['Merino leve'] },
    accent: true,
    lightness: [5, 85],
    traits: ['misto', 'camada', 'noite'],
  },
  {
    id: 'trico-careca',
    slot: 'superior',
    name: 'Tricô de gola careca',
    formality: [1.5, 3],
    climates: ['frio', 'ameno'],
    styles: ALL_STYLES,
    fabrics: { frio: ['Cashmere', 'Lã shetland'], ameno: ['Algodão e cashmere'] },
    accent: true,
    lightness: [10, 85],
    traits: ['textura', 'camada'],
  },
  {
    id: 'camiseta-pima',
    slot: 'superior',
    name: 'Camiseta de algodão pima',
    formality: [1, 2.5],
    climates: ['quente', 'ameno'],
    styles: ['contemporaneo', 'ousado', 'classico'],
    fabrics: { quente: ['Algodão pima'], ameno: ['Algodão pima encorpado'] },
    accent: true,
    lightness: [8, 98],
    traits: ['misto'],
  },

  // ----------------------------------------------------------
  // Calça
  // ----------------------------------------------------------
  {
    id: 'calca-alfaiataria',
    slot: 'inferior',
    name: 'Calça de alfaiataria',
    formality: [3.5, 5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Flanela de lã', 'Lã fria Super 120s'], ameno: ['Lã fria Super 120s'], quente: ['Lã tropical fresca'] },
    accent: false,
    lightness: [5, 75],
    traits: ['terno', 'classico'],
  },
  {
    id: 'calca-smoking',
    slot: 'inferior',
    name: 'Calça de smoking com galão',
    formality: [5, 5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Lã fria com galão de cetim'], ameno: ['Lã fria com galão de cetim'], quente: ['Lã tropical com galão de cetim'] },
    accent: false,
    lightness: [4, 28],
    traits: ['gala'],
  },
  {
    id: 'calca-pregas',
    slot: 'inferior',
    name: 'Calça de pregas com cós alto',
    formality: [3, 4],
    climates: ALL_CLIMATES,
    styles: ['contemporaneo', 'ousado'],
    fabrics: { frio: ['Flanela de lã'], ameno: ['Lã e viscose'], quente: ['Linho e viscose'] },
    accent: false,
    lightness: [8, 85],
    traits: ['misto'],
  },
  {
    id: 'chino',
    slot: 'inferior',
    name: 'Chino',
    formality: [2, 3.5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Sarja de algodão encorpada'], ameno: ['Sarja de algodão com elastano'], quente: ['Sarja leve de algodão'] },
    accent: false,
    lightness: [12, 85],
    traits: ['misto', 'classico'],
  },
  {
    id: 'calca-linho',
    slot: 'inferior',
    name: 'Calça de linho',
    formality: [2, 3.5],
    climates: ['quente'],
    styles: ALL_STYLES,
    fabrics: { quente: ['Linho puro', 'Linho e algodão'] },
    accent: false,
    lightness: [15, 95],
    traits: ['textura', 'dia'],
  },
  {
    id: 'jeans-escuro',
    slot: 'inferior',
    name: 'Jeans escuro',
    formality: [1, 2.5],
    climates: ['frio', 'ameno'],
    styles: ['contemporaneo', 'ousado', 'classico'],
    fabrics: { frio: ['Denim japonês 13 oz'], ameno: ['Denim com elastano'] },
    accent: false,
    fixedColors: [fx('Índigo Escuro', '#1F2A44', 'fria'), fx('Índigo Profundo', '#18203A', 'fria'), fx('Denim Preto', '#1C1D21', 'neutra')],
    traits: ['misto'],
  },
  {
    id: 'bermuda-alfaiataria',
    slot: 'inferior',
    name: 'Bermuda de alfaiataria',
    formality: [1, 2],
    climates: ['quente'],
    styles: ['contemporaneo', 'ousado'],
    fabrics: { quente: ['Linho e algodão', 'Sarja leve'] },
    accent: false,
    lightness: [15, 90],
    traits: ['misto', 'dia'],
  },

  // ----------------------------------------------------------
  // Calçado
  // ----------------------------------------------------------
  {
    id: 'oxford',
    slot: 'calcado',
    name: 'Oxford',
    formality: [4, 5],
    climates: ALL_CLIMATES,
    styles: ['classico', 'contemporaneo'],
    fabrics: { frio: ['Couro de bezerro'], ameno: ['Couro de bezerro'], quente: ['Couro de bezerro'] },
    accent: false,
    fixedColors: [LEATHER.preto, LEATHER.cafe, LEATHER.borgonha, LEATHER.marinho],
    traits: ['couro', 'classico'],
  },
  {
    id: 'oxford-verniz',
    slot: 'calcado',
    name: 'Oxford de verniz',
    formality: [5, 5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Couro envernizado'], ameno: ['Couro envernizado'], quente: ['Couro envernizado'] },
    accent: false,
    fixedColors: [LEATHER.preto, LEATHER.marinho, LEATHER.cafe],
    traits: ['couro', 'gala'],
  },
  {
    id: 'derby',
    slot: 'calcado',
    name: 'Derby',
    formality: [3, 4.5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Couro granulado'], ameno: ['Couro de bezerro'], quente: ['Couro de bezerro'] },
    accent: false,
    fixedColors: [LEATHER.cafe, LEATHER.tabaco, LEATHER.preto, LEATHER.borgonha, LEATHER.grafite],
    traits: ['couro', 'classico'],
  },
  {
    id: 'loafer',
    slot: 'calcado',
    name: 'Loafer',
    formality: [2.5, 4.5],
    climates: ['ameno', 'quente'],
    styles: ['contemporaneo', 'classico', 'ousado'],
    fabrics: { ameno: ['Couro polido'], quente: ['Couro polido'] },
    accent: false,
    fixedColors: [LEATHER.conhaque, LEATHER.cafe, LEATHER.borgonha, LEATHER.preto],
    traits: ['couro', 'misto'],
  },
  {
    id: 'mocassim-camurca',
    slot: 'calcado',
    name: 'Mocassim de camurça',
    formality: [1.5, 3],
    climates: ['ameno', 'quente'],
    styles: ['contemporaneo', 'ousado', 'classico'],
    fabrics: { ameno: ['Camurça'], quente: ['Camurça'] },
    accent: false,
    fixedColors: [SUEDE.tabaco, SUEDE.areia, SUEDE.marinho, SUEDE.cinza],
    traits: ['textura', 'misto', 'dia'],
  },
  {
    id: 'chelsea-boot',
    slot: 'calcado',
    name: 'Chelsea boot',
    formality: [2, 4],
    climates: ['frio', 'ameno'],
    styles: ['contemporaneo', 'ousado', 'classico'],
    fabrics: { frio: ['Couro de bezerro', 'Camurça'], ameno: ['Camurça', 'Couro de bezerro'] },
    accent: false,
    fixedColors: [LEATHER.cafe, SUEDE.tabaco, LEATHER.preto, SUEDE.cinza],
    traits: ['couro', 'misto', 'camada'],
  },
  {
    id: 'tenis-couro',
    slot: 'calcado',
    name: 'Tênis de couro minimalista',
    formality: [1, 2.5],
    climates: ALL_CLIMATES,
    styles: ['contemporaneo', 'ousado'],
    fabrics: { frio: ['Couro napa'], ameno: ['Couro napa'], quente: ['Couro napa perfurado'] },
    accent: false,
    fixedColors: [fx('Branco Couro', '#F1EEE7', 'neutra'), fx('Off-White Couro', '#E6DFD1', 'quente'), LEATHER.preto, fx('Cinza Névoa', '#BFC3C8', 'fria')],
    traits: ['couro', 'misto', 'dia'],
  },

  // ----------------------------------------------------------
  // Acessórios
  // ----------------------------------------------------------
  {
    id: 'gravata-seda',
    slot: 'acessorio',
    name: 'Gravata de seda',
    formality: [4, 5],
    climates: ALL_CLIMATES,
    styles: ['classico', 'contemporaneo', 'ousado'],
    fabrics: { frio: ['Seda twill'], ameno: ['Seda twill'], quente: ['Seda grenadine'] },
    accent: true,
    lightness: [8, 70],
    traits: ['gravata', 'classico'],
  },
  {
    id: 'gravata-trico',
    slot: 'acessorio',
    name: 'Gravata de tricô',
    formality: [3, 4],
    climates: ALL_CLIMATES,
    styles: ['contemporaneo', 'ousado'],
    fabrics: { frio: ['Tricô de seda'], ameno: ['Tricô de seda'], quente: ['Tricô de seda leve'] },
    accent: true,
    lightness: [8, 65],
    traits: ['gravata', 'textura', 'misto'],
  },
  {
    id: 'gravata-borboleta',
    slot: 'acessorio',
    name: 'Gravata-borboleta de seda',
    formality: [5, 5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Cetim de seda'], ameno: ['Cetim de seda'], quente: ['Cetim de seda'] },
    accent: false,
    lightness: [4, 28],
    traits: ['gravata', 'gala'],
  },
  {
    id: 'lenco-bolso',
    slot: 'acessorio',
    name: 'Lenço de bolso',
    formality: [3, 5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Seda estampada', 'Linho'], ameno: ['Linho', 'Seda'], quente: ['Linho'] },
    accent: true,
    lightness: [20, 98],
    traits: ['lenco'],
  },
  {
    id: 'relogio-couro',
    slot: 'acessorio',
    name: 'Relógio de pulseira de couro',
    formality: [2, 5],
    climates: ALL_CLIMATES,
    styles: ['classico', 'contemporaneo'],
    fabrics: { frio: ['Couro de crocodilo gravado'], ameno: ['Couro liso'], quente: ['Couro liso'] },
    accent: false,
    fixedColors: [LEATHER.cafe, LEATHER.preto, LEATHER.conhaque, LEATHER.marinho],
    traits: ['relogio', 'couro', 'classico'],
  },
  {
    id: 'relogio-aco',
    slot: 'acessorio',
    name: 'Relógio de aço escovado',
    formality: [1, 4],
    climates: ALL_CLIMATES,
    styles: ['contemporaneo', 'ousado', 'classico'],
    fabrics: { frio: ['Aço escovado'], ameno: ['Aço escovado'], quente: ['Aço escovado'] },
    accent: false,
    fixedColors: [fx('Aço Escovado', '#A9ADB3', 'fria')],
    traits: ['relogio', 'metal'],
  },
  {
    id: 'relogio-dourado',
    slot: 'acessorio',
    name: 'Relógio de caixa dourada',
    formality: [2, 5],
    climates: ALL_CLIMATES,
    styles: ['classico', 'ousado', 'contemporaneo'],
    fabrics: { frio: ['Aço com banho dourado'], ameno: ['Aço com banho dourado'], quente: ['Aço com banho dourado'] },
    accent: false,
    fixedColors: [fx('Dourado Escovado', '#B8973F', 'quente')],
    traits: ['relogio', 'metal'],
  },
  {
    id: 'cinto-couro',
    slot: 'acessorio',
    name: 'Cinto de couro',
    formality: [2, 4.5],
    climates: ALL_CLIMATES,
    styles: ALL_STYLES,
    fabrics: { frio: ['Couro de bezerro'], ameno: ['Couro de bezerro'], quente: ['Couro de bezerro'] },
    accent: false,
    fixedColors: [LEATHER.preto, LEATHER.cafe, LEATHER.tabaco, LEATHER.conhaque, LEATHER.borgonha, LEATHER.grafite, LEATHER.marinho],
    traits: ['cinto', 'couro'],
  },
];

export const pieceModel = (id: string): PieceModel | undefined => PIECE_MODELS.find((m) => m.id === id);

export const modelsForSlot = (slot: PieceSlot): PieceModel[] => PIECE_MODELS.filter((m) => m.slot === slot);

export const hasTrait = (model: PieceModel | null | undefined, trait: PieceTrait): boolean =>
  Boolean(model && model.traits.includes(trait));

/** Tecido preferido do modelo para o clima (com alternância determinística pelo índice). */
export function fabricFor(model: PieceModel, climate: ClimateId, pick = 0): string {
  const list = model.fabrics[climate] ?? model.fabrics.ameno ?? Object.values(model.fabrics).find((l) => l && l.length) ?? [];
  if (list.length === 0) return '';
  return list[Math.abs(pick) % list.length];
}

/**
 * Neutros clássicos de alfaiataria. O motor só os usa quando ficam próximos da cartela
 * da estação e longe das cores a evitar.
 */
export const TAILORING_NEUTRALS: ColorSwatch[] = [
  { name: 'Azul Marinho', hex: '#1B2A4A' },
  { name: 'Marinho Noturno', hex: '#141C2E' },
  { name: 'Cinza Grafite', hex: '#2F3337' },
  { name: 'Cinza Chumbo', hex: '#4A4E55' },
  { name: 'Cinza Médio', hex: '#7F868E' },
  { name: 'Cinza Claro', hex: '#B9BDC2' },
  { name: 'Cáqui', hex: '#A8966F' },
  { name: 'Areia', hex: '#D8C7A8' },
  { name: 'Off-White', hex: '#EFEBE3' },
  { name: 'Branco', hex: '#F7F7F5' },
  { name: 'Azul Claro', hex: '#C9D8E8' },
  { name: 'Café', hex: '#3E2B24' },
  { name: 'Marrom Tabaco', hex: '#5C4033' },
  { name: 'Verde Oliva Escuro', hex: '#3F4530' },
  { name: 'Preto', hex: '#101114' },
];
