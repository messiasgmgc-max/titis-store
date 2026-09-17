// ============================================================
// Contratos de domínio — Titi's Store
// Regra: este arquivo não importa nada com alias "@/" (é usado também em scripts Node).
// Linhas do banco usam snake_case idêntico às colunas do Supabase (ver supabase/schema.sql).
// ============================================================

export type SkinToneId = 'clara' | 'morena' | 'parda' | 'negra';
export type Subtone = 'frio' | 'neutro' | 'quente';
export type ContrastLevel = 'alto' | 'medio' | 'baixo';
export type OccasionId = 'trabalho' | 'casual' | 'barzinho' | 'jantar' | 'festa' | 'esporte' | 'outro';
export type TimeOfDayId = 'manha' | 'tarde' | 'noite';
export type ClimateId = 'frio' | 'ameno' | 'quente';
export type StylePreference = 'classico' | 'contemporaneo' | 'ousado';
export type Role = 'client' | 'vip' | 'admin';
/** Planos pagos da consultoria. 'presencial' é agendado pelo WhatsApp (sem checkout). */
export type PlanId = 'passe' | 'clube' | 'presencial';
export type CheckoutProvider = 'whatsapp' | 'mercadopago';

/** Posição da peça no corpo — usada para montar looks. */
export type PieceSlot = 'sobreposicao' | 'superior' | 'inferior' | 'calcado' | 'acessorio';
export const PIECE_SLOTS: PieceSlot[] = ['sobreposicao', 'superior', 'inferior', 'calcado', 'acessorio'];

export const PRODUCT_CATEGORIES = [
  'Alfaiataria',
  'Camisaria',
  'Malharia',
  'Calças',
  'Calçados',
  'Acessórios',
] as const;
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface ColorSwatch {
  name: string;
  hex: string;
}

// ------------------------------------------------------------
// Catálogo (tabela public.products)
// ------------------------------------------------------------
export interface Product {
  id: string;
  slug: string | null;
  name: string;
  category: string; // ProductCategory na prática; string para tolerar dados antigos
  slot: PieceSlot;
  description: string | null;
  fabric: string | null;
  color_name: string | null;
  hex_color: string | null;
  image_url: string | null;
  gallery: string[];
  price_cents: number | null; // null = "sob consulta"
  sizes: string[];
  skin_tones: SkinToneId[]; // [] = combina com todos
  occasions: OccasionId[]; // [] = qualquer ocasião
  climates: ClimateId[]; // [] = qualquer clima
  formality: number; // 1 (descontraído) … 5 (black tie)
  season_compatibility: string[]; // nomes das estações cromáticas
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// ------------------------------------------------------------
// Diagnóstico de colorimetria e biometria
// ------------------------------------------------------------
export type Gender = 'masculino' | 'feminino' | 'outro';
export type BodyType = 'atletico' | 'trapezio' | 'mesomorfo' | 'ectomorfo' | 'endomorfo' | 'oval' | 'retangular';

export interface Diagnosis {
  skinTone: SkinToneId;
  subtone: Subtone;
  contrast: ContrastLevel;
  season: string; // ex.: "Outono Quente"
  palette: ColorSwatch[]; // cores que valorizam
  avoid: ColorSwatch[]; // cores a evitar perto do rosto
  notes: string; // parecer técnico em PT-BR
  recommendations: string[]; // peças/tecidos sugeridos
  source: 'ai' | 'local' | 'manual';
  confidence?: number; // 0..1
  ita?: number; // ângulo ITA° (leitura local)
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  gender?: Gender;
  bodyType?: BodyType;
  createdAt: string; // ISO
}

// ------------------------------------------------------------
// Atelier (geração de looks)
// ------------------------------------------------------------
export interface StyleRequest {
  skinTone: SkinToneId;
  subtone: Subtone;
  contrast: ContrastLevel;
  occasion: OccasionId;
  customVenue?: string;
  timeOfDay: TimeOfDayId;
  climate: ClimateId;
  style: StylePreference;
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  gender?: Gender;
  bodyType?: BodyType;
}

export interface LookPiece {
  slot: PieceSlot;
  name: string;
  color: string;
  hex: string;
  fabric?: string;
  productId?: string | null; // produto do catálogo correspondente, se houver
}

export interface Look {
  id: string;
  title: string;
  tagline: string;
  rationale: string; // por que funciona para esta pessoa/contexto
  formality: number; // 1..5
  harmony: number; // 0..100 — aderência da paleta ao tom/subtom/contraste
  palette: ColorSwatch[];
  pieces: LookPiece[];
  tip: string; // detalhe de alfaiate
  source: 'ai' | 'atelier';
}

export interface LooksResponse {
  looks: Look[];
  source: 'ai' | 'atelier';
  summary: string; // frase curta descrevendo o contexto interpretado
}

// ------------------------------------------------------------
// Sacola / pedidos
// ------------------------------------------------------------
export interface CartItem {
  key: string; // identificador único da linha
  productId: string | null;
  name: string;
  detail: string; // categoria ou "Peça do look X"
  color: string;
  hex: string;
  image: string | null;
  size: string | null;
  priceCents: number | null;
  quantity: number;
  lookTitle?: string | null;
}

export type OrderStatus = 'novo' | 'em_atendimento' | 'concluido' | 'cancelado' | 'pending' | 'paid';

export interface OrderRow {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email?: string | null;
  customer_cpf?: string | null;
  payment_method?: string | null;
  payment_provider_id?: string | null;
  shipping_address?: any | null;
  tracking_code?: string | null;
  tracking_carrier?: string | null;
  tracking_url?: string | null;
  shipping_label_url?: string | null;
  shipping_service_name?: string | null;
  shipping_price_cents?: number | null;
  melhor_envio_order_id?: string | null;
  notes: string | null;
  items: CartItem[];
  total_cents: number | null;
  status: OrderStatus;
  channel: 'whatsapp' | 'online' | 'mercadopago';
  created_at: string;
  updated_at?: string;
  paid_at?: string | null;
  dispatched_at?: string | null;
}

// ------------------------------------------------------------
// Perfis e consultorias
// ------------------------------------------------------------
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  avatar_url: string | null;
  preferred_skin_tone: string | null; // SkinToneId (dados antigos podem ter texto livre)
  skin_subtone: Subtone | null;
  contrast_level: ContrastLevel | null;
  seasonal_palette: string | null;
  preferred_style: StylePreference | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  gender?: Gender | null;
  body_type?: BodyType | null;
  /** Último plano contratado. */
  plan: PlanId | null;
  /** Fim do acesso VIP (null com role 'vip' = sem prazo). */
  access_until: string | null;
  /** Bloqueio manual pelo admin: derruba o acesso mesmo com plano vigente. */
  is_blocked: boolean;
  /** Observações internas do admin sobre o cliente (não aparecem para ele). */
  admin_notes: string | null;
  created_at?: string;
  updated_at?: string | null;
}

/** Cupom de desconto (tabela public.coupons), aplicado no checkout. */
export interface CouponRow {
  id: string;
  code: string; // sempre em caixa-alta
  description: string | null;
  percent_off: number | null; // 1..100
  amount_off_cents: number | null;
  plans: PlanId[]; // [] = todos os planos com checkout
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CouponQuote {
  code: string;
  originalCents: number;
  discountCents: number;
  finalCents: number;
}

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';

/** Tabela public.payments — preenchida pelo webhook do Mercado Pago ou manualmente pelo admin. */
export interface PaymentRow {
  id: string;
  user_id: string;
  plan: PlanId;
  amount_cents: number;
  /** Desconto aplicado (cupom ou manual); amount_cents já é o valor final. */
  discount_cents: number;
  coupon_code: string | null;
  provider: CheckoutProvider | 'manual';
  provider_payment_id: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at?: string;
}

export interface CheckoutResponse {
  provider: 'mercadopago';
  url: string;
  quote?: CouponQuote;
}

export interface ConsultationRow {
  id: string;
  user_id: string;
  title: string | null;
  skin_tone: string;
  skin_subtone: Subtone | null;
  contrast_level: ContrastLevel | null;
  seasonal_palette: string | null;
  occasion: string;
  custom_venue: string | null;
  time_of_day: string;
  climate: string;
  style_preference: StylePreference | null;
  results: Look[];
  source: 'ai' | 'atelier';
  created_at: string;
}

// ------------------------------------------------------------
// Concierge (chat)
// ------------------------------------------------------------
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConciergeResponse {
  reply: string;
  source: 'groq' | 'gemini' | 'local';
}

export interface TryOnResponse {
  image: string; // data URL
}

export interface ProductVisionSuggestion {
  name: string;
  category: ProductCategory;
  slot: PieceSlot;
  color_name: string;
  hex_color: string;
  fabric: string;
  description: string;
  formality: number;
  skin_tones: SkinToneId[];
  occasions: OccasionId[];
  climates: ClimateId[];
}

/** Formato padrão de erro devolvido pelas rotas /api/*. */
export interface ApiError {
  error: string;
  code:
    | 'not_configured'
    | 'bad_request'
    | 'unauthorized'
    | 'forbidden'
    | 'payment_required'
    | 'upstream'
    | 'rate_limited'
    | 'internal';
}
