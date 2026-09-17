// ============================================================
// Configuração da marca — edite aqui textos, contatos, planos e preços.
// ============================================================
import type { CheckoutProvider, PlanId } from './types';

export const SITE = {
  name: "Titi's Store",
  legalName: "Titi's Store",
  tagline: 'Consultoria de Imagem Masculina Online',
  established: 2023,
  description:
    'Consultoria de imagem masculina online: descubra sua cartela de cores, receba looks montados para cada ocasião e compre as peças certas com atendimento direto do Titi.',
  whatsapp: '5531996000213',
  whatsappDisplay: '+55 31 99600-0213',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
} as const;

/**
 * Como a compra dos planos é concluída.
 * 'whatsapp' (padrão): o cliente fala com o Titi e o acesso é liberado no painel admin.
 * 'mercadopago': checkout Pix/cartão com liberação automática (exige variáveis do servidor).
 */
export const CHECKOUT_PROVIDER: CheckoutProvider =
  process.env.NEXT_PUBLIC_CHECKOUT_PROVIDER === 'whatsapp' ? 'whatsapp' : 'mercadopago';

export const NAV_LINKS = [
  { label: 'Como funciona', href: '/#como-funciona' },
  { label: 'Planos', href: '/#planos' },
  { label: 'Loja', href: '/colecao' },
  { label: 'Dúvidas', href: '/#duvidas' },
] as const;

/** Página do app de consultoria (área paga). */
export const CONSULTING_PATH = '/consultoria';

/** Tecidos e ofícios (usado em detalhes decorativos). */
export const ATELIER_WORDS = [
  'Lã fria Super 120s',
  'Cashmere',
  'Linho irlandês',
  'Algodão egípcio',
  'Colorimetria',
  'Veludo cotelê',
  'Visagismo',
  'Seda pura',
  'Alfaiataria sob medida',
  'Couro nappa',
] as const;

export interface ClubPlan {
  id: PlanId;
  kicker: string;
  name: string;
  priceLabel: string;
  /** Valor cobrado no checkout; null = sob consulta (sem checkout). */
  priceCents: number | null;
  cadence: string;
  /** Dias de acesso liberados por pagamento; null = não libera acesso digital. */
  accessDays: number | null;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  whatsappText: string;
}

export const CLUB_PLANS: ClubPlan[] = [
  {
    id: 'passe',
    kicker: 'Para começar',
    name: 'Passe Digital',
    priceLabel: 'R$ 29,90',
    priceCents: 2990,
    cadence: '30 dias de acesso',
    accessDays: 30,
    description: 'Descubra sua cartela e monte os looks do próximo compromisso com precisão.',
    features: [
      'Leitura de colorimetria por foto',
      'Sua cartela completa: cores, neutros e o que evitar',
      'Looks montados por ocasião, horário e clima',
      'Provador virtual com o seu rosto',
    ],
    cta: 'Quero o Passe Digital',
    whatsappText: "Olá, Titi! Quero ativar o *Passe Digital (R$ 29,90 · 30 dias)* da Titi's Store.",
  },
  {
    id: 'clube',
    kicker: 'Mais escolhido',
    name: "Clube Titi's Store",
    priceLabel: 'R$ 49,90',
    priceCents: 4990,
    cadence: 'por mês',
    accessDays: 30,
    description: 'Consultoria contínua com o Titi ao seu lado a cada evento, compra e dúvida.',
    features: [
      'Tudo do Passe Digital, sem limite de uso',
      'Linha direta com o Titi no WhatsApp',
      'Acervo com todos os seus looks salvos',
      'Curadoria de peças da loja para a sua cartela',
    ],
    cta: 'Entrar para o Clube',
    featured: true,
    whatsappText: "Olá, Titi! Quero assinar o *Clube Titi's Store (R$ 49,90/mês)*.",
  },
  {
    id: 'presencial',
    kicker: 'Atendimento exclusivo',
    name: 'Consultoria Presencial',
    priceLabel: 'Sob consulta',
    priceCents: null,
    cadence: 'sessão individual',
    accessDays: null,
    description: 'Uma sessão com o Titi para renovar o guarda-roupa do zero.',
    features: ['Análise do seu armário', 'Personal shopper dedicado', 'Plano de compras por prioridade'],
    cta: 'Agendar sessão',
    whatsappText: "Olá, Titi! Gostaria de agendar uma *Consultoria Presencial*.",
  },
];

export function getPlan(id: string | null | undefined): ClubPlan | undefined {
  return CLUB_PLANS.find((p) => p.id === id);
}
