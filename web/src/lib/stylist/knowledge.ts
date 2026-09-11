// ============================================================
// Base de conhecimento do Atelier — colorimetria e contexto.
// Matriz 4 profundidades de pele × 3 subtons = as 12 estações cromáticas.
// Regra: somente imports relativos (usado também fora do Next).
// ============================================================
import type {
  ClimateId,
  ColorSwatch,
  ContrastLevel,
  OccasionId,
  PieceSlot,
  SkinToneId,
  StylePreference,
  Subtone,
  TimeOfDayId,
} from '../types';

const c = (name: string, hex: string): ColorSwatch => ({ name, hex });

export interface SkinToneInfo {
  id: SkinToneId;
  name: string;
  subtitle: string;
  image: string;
  description: string;
}

export const SKIN_TONES: SkinToneInfo[] = [
  {
    id: 'clara',
    name: 'Clara',
    subtitle: 'Alta refletividade de luz',
    image: '/skin_clara.jpg',
    description: 'Pele que ruboriza com facilidade e reflete muita luz. Contraste bem dosado evita o aspecto apagado.',
  },
  {
    id: 'morena',
    name: 'Morena Dourada',
    subtitle: 'Brilho solar, pigmento médio',
    image: '/skin_morena.jpg',
    description: 'Pele que bronzeia com facilidade e tem luminosidade natural. Tons terrosos e profundos ganham vida.',
  },
  {
    id: 'parda',
    name: 'Parda',
    subtitle: 'Pigmento médio-profundo',
    image: '/skin_parda.jpg',
    description: 'Pele de profundidade média a alta, versátil entre cores intensas e neutros elegantes.',
  },
  {
    id: 'negra',
    name: 'Negra Profunda',
    subtitle: 'Riqueza de pigmento e luz',
    image: '/skin_negra.jpg',
    description: 'Pele de alta profundidade que sustenta cores puras, joias e contrastes marcantes com naturalidade.',
  },
];

export const SUBTONES: { id: Subtone; name: string; hint: string }[] = [
  { id: 'frio', name: 'Frio', hint: 'Veias azuladas, prata valoriza, fundo rosado' },
  { id: 'neutro', name: 'Neutro', hint: 'Veias entre verde e azul, ouro e prata funcionam' },
  { id: 'quente', name: 'Quente', hint: 'Veias esverdeadas, ouro valoriza, fundo dourado' },
];

export const CONTRASTS: { id: ContrastLevel; name: string; hint: string }[] = [
  { id: 'alto', name: 'Alto', hint: 'Cabelo/barba bem mais escuros que a pele' },
  { id: 'medio', name: 'Médio', hint: 'Diferença moderada entre cabelo e pele' },
  { id: 'baixo', name: 'Baixo', hint: 'Cabelo, olhos e pele em tons próximos' },
];

export interface SeasonProfile {
  name: string;
  family: 'Primavera' | 'Verão' | 'Outono' | 'Inverno';
  palette: ColorSwatch[]; // cores de destaque que valorizam o rosto
  neutrals: ColorSwatch[]; // base para calças, sapatos e sobreposições
  avoid: ColorSwatch[];
  metals: 'ouro' | 'prata' | 'ambos';
  note: string;
}

export const SEASON_MATRIX: Record<SkinToneId, Record<Subtone, SeasonProfile>> = {
  clara: {
    frio: {
      name: 'Verão Claro',
      family: 'Verão',
      palette: [c('Azul Céu Acinzentado', '#8FA9C4'), c('Lavanda Fumê', '#9C95B8'), c('Rosa Antigo', '#B98A8E'), c('Verde Sálvia', '#94AE9C')],
      neutrals: [c('Azul Marinho Suave', '#34495E'), c('Cinza Pérola', '#C9CDD2'), c('Cinza Médio', '#7F868E'), c('Branco Gelo', '#F2F4F7')],
      avoid: [c('Laranja', '#E07B39'), c('Mostarda', '#C9A227'), c('Preto Absoluto', '#050505')],
      metals: 'prata',
      note: 'Sua pele pede suavidade fria: azuis acinzentados e cinzas claros iluminam o rosto sem endurecer os traços.',
    },
    neutro: {
      name: 'Verão Suave',
      family: 'Verão',
      palette: [c('Azul Aço', '#4F6D8A'), c('Vinho Rosado', '#7B3F4E'), c('Verde Oliva Suave', '#7D8471'), c('Malva', '#8E7383')],
      neutrals: [c('Cinza Médio', '#8A8D91'), c('Taupe', '#8B7D72'), c('Off-White', '#EFEBE3'), c('Marinho Acinzentado', '#3A4A5C')],
      avoid: [c('Laranja Vivo', '#FF6A13'), c('Amarelo Limão', '#E3E36B'), c('Preto Absoluto', '#050505')],
      metals: 'ambos',
      note: 'Cores esfumaçadas e de média intensidade criam harmonia; combinações tom sobre tom parecem naturalmente caras.',
    },
    quente: {
      name: 'Primavera Clara',
      family: 'Primavera',
      palette: [c('Camel Claro', '#C8A27A'), c('Turquesa Suave', '#5FA8A0'), c('Pêssego', '#E3AE94'), c('Verde Menta Quente', '#9CC5A1')],
      neutrals: [c('Marfim', '#F4EBD9'), c('Areia', '#D8C7A8'), c('Marinho Quente', '#2F4A6D'), c('Caramelo Claro', '#B98A5E')],
      avoid: [c('Preto Absoluto', '#050505'), c('Cinza Chumbo', '#3D3F42'), c('Bordô Escuro', '#4A0E1A')],
      metals: 'ouro',
      note: 'Leveza e calor: marfim, camel e azuis aquecidos trazem frescor e deixam a pele com aspecto saudável.',
    },
  },
  morena: {
    frio: {
      name: 'Verão Frio',
      family: 'Verão',
      palette: [c('Azul Petróleo', '#1F4E5F'), c('Ameixa', '#5B3A57'), c('Verde Pinho', '#2F4F4F'), c('Azul Real Suave', '#35508A')],
      neutrals: [c('Azul Marinho', '#1B2A4A'), c('Cinza Grafite', '#2C3539'), c('Branco Gelo', '#F2F4F7'), c('Cinza Chumbo', '#4A4E55')],
      avoid: [c('Laranja Queimado', '#CC5500'), c('Mostarda', '#C9A227'), c('Bege Amarelado', '#E3D3A4')],
      metals: 'prata',
      note: 'Profundidade média com fundo frio: marinho, petróleo e ameixa desenham o rosto com elegância discreta.',
    },
    neutro: {
      name: 'Outono Suave',
      family: 'Outono',
      palette: [c('Oliva', '#6B6B47'), c('Terracota Suave', '#A8674C'), c('Azul Jeans Escuro', '#3E5871'), c('Musgo', '#5E6B4E')],
      neutrals: [c('Camel', '#B08A5A'), c('Cinza Taupe', '#857A6E'), c('Areia', '#D8C7A8'), c('Café', '#4E3B31')],
      avoid: [c('Branco Óptico', '#FFFFFF'), c('Rosa Choque', '#E0218A'), c('Preto Absoluto', '#050505')],
      metals: 'ambos',
      note: 'Neutros terrosos e texturas naturais — camel, oliva e café — criam uma presença sofisticada e acessível.',
    },
    quente: {
      name: 'Primavera Quente',
      family: 'Primavera',
      palette: [c('Terracota', '#A0522D'), c('Verde Oliva', '#556B2F'), c('Petróleo Quente', '#1F5F5B'), c('Dourado', '#D4AF37')],
      neutrals: [c('Champagne', '#E6D7C3'), c('Caramelo', '#A86B32'), c('Marrom Tabaco', '#5C4033'), c('Marinho', '#1B2A4A')],
      avoid: [c('Cinza Pálido', '#D3D3D3'), c('Rosa Bebê', '#F4C2C2'), c('Azul Gelo', '#D6E6F2')],
      metals: 'ouro',
      note: 'Tons quentes e terrosos conversam com o dourado natural da sua pele e acendem o rosto.',
    },
  },
  parda: {
    frio: {
      name: 'Inverno Frio',
      family: 'Inverno',
      palette: [c('Azul Royal', '#1F3F99'), c('Verde Esmeralda', '#0F5C45'), c('Vinho', '#58111A'), c('Ametista', '#4E2A5E')],
      neutrals: [c('Preto Obsidian', '#0B0C10'), c('Branco Óptico', '#F7F7F7'), c('Cinza Carvão', '#36393F'), c('Marinho Profundo', '#141E33')],
      avoid: [c('Laranja', '#E07B39'), c('Camel', '#B08A5A'), c('Bege', '#D8C7A8')],
      metals: 'prata',
      note: 'Cores puras e frias com base preta ou branca: o contraste nítido deixa sua imagem marcante e limpa.',
    },
    neutro: {
      name: 'Primavera Brilhante',
      family: 'Primavera',
      palette: [c('Azul Cobalto', '#0047AB'), c('Verde Garrafa', '#1E5B3A'), c('Coral Queimado', '#C8553D'), c('Caramelo Premium', '#8B4513')],
      neutrals: [c('Branco Névoa', '#F4F4F2'), c('Marinho', '#1B2A4A'), c('Preto Obsidian', '#0B0C10'), c('Cinza Chumbo', '#44474D')],
      avoid: [c('Cinza Opaco', '#9A9A9A'), c('Bege Acinzentado', '#CFC6B8'), c('Lavanda Pálida', '#D8CFE8')],
      metals: 'ambos',
      note: 'Você sustenta cor com intensidade: um ponto vibrante sobre neutro escuro cria uma elegância magnética.',
    },
    quente: {
      name: 'Outono Quente',
      family: 'Outono',
      palette: [c('Caramelo Premium', '#8B4513'), c('Oliva Militar', '#4B5320'), c('Mostarda', '#C9A227'), c('Tijolo', '#9C4A2F')],
      neutrals: [c('Creme', '#EFE3C8'), c('Chocolate', '#4E342E'), c('Camel', '#B08A5A'), c('Verde Musgo Escuro', '#2F3A24')],
      avoid: [c('Azul Gelo', '#D6E6F2'), c('Rosa Claro', '#F4C2C2'), c('Cinza Frio', '#A7B0B8')],
      metals: 'ouro',
      note: 'Riqueza de outono: caramelo, oliva e tijolo aquecem a pele e trazem um ar solar e confiante.',
    },
  },
  negra: {
    frio: {
      name: 'Inverno Profundo',
      family: 'Inverno',
      palette: [c('Bordô Imperial', '#58111A'), c('Azul Real', '#002D72'), c('Verde Botânico', '#0F382C'), c('Ametista', '#5B2C6F')],
      neutrals: [c('Branco Marfim', '#FAF7F0'), c('Preto Obsidian', '#0B0C10'), c('Cinza Carvão', '#2E3036'), c('Marinho Noturno', '#10182B')],
      avoid: [c('Cinza Opaco', '#4F4F4F'), c('Marrom Acinzentado', '#6F6259'), c('Bege Pálido', '#E8DCC8')],
      metals: 'prata',
      note: 'Tons de joia e o branco marfim criam um efeito esculpido: é a pele que mais sustenta alfaiataria intensa.',
    },
    neutro: {
      name: 'Inverno Brilhante',
      family: 'Inverno',
      palette: [c('Azul Cobalto', '#0047AB'), c('Esmeralda', '#046B4A'), c('Magenta Escuro', '#7A1F4B'), c('Dourado Nobre', '#D4AF37')],
      neutrals: [c('Branco Óptico', '#FFFFFF'), c('Preto Obsidian', '#0B0C10'), c('Cinza Prata', '#B8BCC2'), c('Marinho', '#1B2A4A')],
      avoid: [c('Marrom Opaco', '#6F4E37'), c('Oliva Apagado', '#7D7A5A'), c('Bege', '#D8C7A8')],
      metals: 'ambos',
      note: 'Brilho e pureza de cor: branco óptico, cobalto e esmeralda iluminam a pele com impacto imediato.',
    },
    quente: {
      name: 'Outono Profundo',
      family: 'Outono',
      palette: [c('Dourado Nobre', '#D4AF37'), c('Verde Musgo', '#3B4A2A'), c('Laranja Queimado', '#B5541E'), c('Mostarda', '#C9A227')],
      neutrals: [c('Creme Marfim', '#F3E9D2'), c('Marrom Café', '#3E2723'), c('Caramelo', '#8B5A2B'), c('Preto Obsidian', '#0B0C10')],
      avoid: [c('Cinza Pastel', '#C9CDD2'), c('Rosa Bebê', '#F4C2C2'), c('Azul Bebê', '#BFD7EA')],
      metals: 'ouro',
      note: 'Profundidade quente: dourado, musgo e café formam a cartela mais nobre para a sua pele.',
    },
  },
};

export function getSeason(tone: SkinToneId, subtone: Subtone): SeasonProfile {
  return SEASON_MATRIX[tone]?.[subtone] ?? SEASON_MATRIX.morena.quente;
}

export interface OccasionInfo {
  id: OccasionId;
  title: string;
  description: string;
  formality: [number, number]; // faixa 1..5
}

export const OCCASIONS: OccasionInfo[] = [
  { id: 'trabalho', title: 'Executivo', description: 'Reuniões, apresentações e rotina corporativa', formality: [3, 5] },
  { id: 'casual', title: 'Casual refinado', description: 'Dia a dia elegante, passeios e viagens', formality: [1, 2] },
  { id: 'barzinho', title: 'Happy hour', description: 'Bares, lounges e encontros descontraídos', formality: [2, 3] },
  { id: 'jantar', title: 'Jantar especial', description: 'Restaurantes, encontros e noites marcantes', formality: [3, 4] },
  { id: 'festa', title: 'Casamento & gala', description: 'Casamentos, formaturas e celebrações', formality: [4, 5] },
  { id: 'esporte', title: 'Esporte fino', description: 'Clubes, eventos ao ar livre e hípica', formality: [2, 4] },
  { id: 'outro', title: 'Outro lugar', description: 'Descreva o evento e o Atelier interpreta', formality: [2, 4] },
];

export const TIMES_OF_DAY: { id: TimeOfDayId; title: string; range: string }[] = [
  { id: 'manha', title: 'Manhã', range: '06h – 12h' },
  { id: 'tarde', title: 'Tarde', range: '12h – 18h' },
  { id: 'noite', title: 'Noite', range: '18h em diante' },
];

export const CLIMATES: { id: ClimateId; title: string; range: string }[] = [
  { id: 'frio', title: 'Frio', range: 'abaixo de 18°C' },
  { id: 'ameno', title: 'Ameno', range: '18°C – 25°C' },
  { id: 'quente', title: 'Quente', range: 'acima de 25°C' },
];

export const STYLES: { id: StylePreference; title: string; description: string }[] = [
  { id: 'classico', title: 'Clássico', description: 'Linhas atemporais, cores sóbrias, zero excesso' },
  { id: 'contemporaneo', title: 'Contemporâneo', description: 'Alfaiataria leve, mistura de casual e formal' },
  { id: 'ousado', title: 'Ousado', description: 'Cor, textura e peças de assinatura' },
];

export const SLOT_LABELS: Record<PieceSlot, string> = {
  sobreposicao: 'Sobreposição',
  superior: 'Parte de cima',
  inferior: 'Calça',
  calcado: 'Calçado',
  acessorio: 'Acessório',
};

export const skinToneName = (id: string | null | undefined) =>
  SKIN_TONES.find((t) => t.id === id)?.name ?? (id || '—');
export const occasionTitle = (id: string | null | undefined) =>
  OCCASIONS.find((o) => o.id === id)?.title ?? (id || '—');
export const timeTitle = (id: string | null | undefined) => TIMES_OF_DAY.find((t) => t.id === id)?.title ?? (id || '—');
export const climateTitle = (id: string | null | undefined) => CLIMATES.find((t) => t.id === id)?.title ?? (id || '—');
export const styleTitle = (id: string | null | undefined) => STYLES.find((t) => t.id === id)?.title ?? (id || '—');

export function isSkinToneId(v: unknown): v is SkinToneId {
  return v === 'clara' || v === 'morena' || v === 'parda' || v === 'negra';
}
export function isSubtone(v: unknown): v is Subtone {
  return v === 'frio' || v === 'neutro' || v === 'quente';
}
export function isContrast(v: unknown): v is ContrastLevel {
  return v === 'alto' || v === 'medio' || v === 'baixo';
}
