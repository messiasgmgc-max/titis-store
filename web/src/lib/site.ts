// ============================================================
// Configuração da marca — edite aqui textos e contatos oficiais.
// ============================================================

export const SITE = {
  name: "Titi's Store",
  legalName: "Titi's Store",
  tagline: 'Consultoria de Imagem Masculina',
  established: 2023,
  description:
    'Consultoria de imagem masculina e alfaiataria: diagnóstico de colorimetria, looks sob medida para cada ocasião e curadoria de peças com atendimento direto pelo WhatsApp.',
  whatsapp: '5531996000213',
  whatsappDisplay: '+55 31 99600-0213',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
} as const;

export const NAV_LINKS = [
  { label: 'O Método', href: '/#metodo' },
  { label: 'Atelier', href: '/#atelier' },
  { label: 'Coleção', href: '/#colecao' },
  { label: 'Clube', href: '/#clube' },
  { label: 'Contato', href: '/#contato' },
] as const;

/** Tecidos e ofícios exibidos no letreiro (marquee). */
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
  id: string;
  kicker: string;
  name: string;
  priceLabel: string;
  cadence: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
  whatsappText: string;
}

export const CLUB_PLANS: ClubPlan[] = [
  {
    id: 'passe',
    kicker: 'Acesso essencial',
    name: 'Passe Digital',
    priceLabel: 'R$ 29,90',
    cadence: 'acesso único',
    description: 'Para descobrir sua cartela e montar os primeiros looks com precisão.',
    features: ['Leitura de colorimetria por foto', 'Cartela da sua estação cromática', 'Até 3 looks sob medida'],
    cta: 'Ativar passe',
    whatsappText: "Olá, Titi! Quero ativar o *Passe Digital (R$ 29,90)* da Titi's Store.",
  },
  {
    id: 'clube',
    kicker: 'Experiência completa',
    name: "Clube Titi's",
    priceLabel: 'R$ 49,90',
    cadence: 'por mês',
    description: 'Consultoria contínua, provador virtual e curadoria direta com o Titi.',
    features: [
      'Consultorias ilimitadas no Atelier',
      'Provador virtual com o seu rosto',
      'Linha direta no WhatsApp',
      'Acervo de looks salvo na sua conta',
    ],
    cta: 'Entrar para o clube',
    featured: true,
    whatsappText: "Olá, Titi! Quero assinar o *Clube Titi's (R$ 49,90/mês)*.",
  },
  {
    id: 'presencial',
    kicker: 'Atendimento privado',
    name: 'Consultoria Presencial',
    priceLabel: 'Sob consulta',
    cadence: 'sessão individual',
    description: 'Uma sessão com o Titi para renovar o guarda-roupa do zero.',
    features: ['Análise do seu armário', 'Personal shopper dedicado', 'Plano de compras por prioridade'],
    cta: 'Agendar sessão',
    whatsappText: "Olá, Titi! Gostaria de agendar uma *Consultoria Presencial*.",
  },
];
