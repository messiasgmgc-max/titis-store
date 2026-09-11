// Utilitários do painel administrativo (somente navegador): erros, Storage, formatos e leitura do banco.
import { supabase } from '@/lib/supabaseClient';
import { ApiRequestError } from '@/lib/api';
import { fileToBlob } from '@/lib/image';
import { formatDateBR, formatPhoneBR, slugify } from '@/lib/format';
import { normalizeProduct, slotForCategory, sortProducts } from '@/lib/products';
import { OCCASIONS, isSkinToneId } from '@/lib/stylist/knowledge';
import { hasConsultingAccess } from '@/lib/access';
import { getPlan } from '@/lib/site';
import {
  PIECE_SLOTS,
  PRODUCT_CATEGORIES,
  type CartItem,
  type ClimateId,
  type OccasionId,
  type OrderRow,
  type OrderStatus,
  type PaymentRow,
  type PaymentStatus,
  type PieceSlot,
  type PlanId,
  type Product,
  type ProductCategory,
  type ProductVisionSuggestion,
  type Profile,
  type Role,
  type SkinToneId,
} from '@/lib/types';

export const PRODUCT_BUCKET = 'products';
export const MAX_GALLERY = 6;
export const MAX_PRICE_CENTS = 999_999_999;

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;

export const FORMALITY_LABELS = ['Descontraído', 'Casual refinado', 'Esporte fino', 'Social', 'Black tie'] as const;

export const ORDER_STATUSES: { id: OrderStatus; label: string; plural: string }[] = [
  { id: 'novo', label: 'Novo', plural: 'Novos' },
  { id: 'em_atendimento', label: 'Em atendimento', plural: 'Em atendimento' },
  { id: 'concluido', label: 'Concluído', plural: 'Concluídos' },
  { id: 'cancelado', label: 'Cancelado', plural: 'Cancelados' },
];

export const ROLE_OPTIONS: { id: Role; label: string; plural: string }[] = [
  { id: 'client', label: 'Cliente', plural: 'Clientes' },
  { id: 'vip', label: 'VIP', plural: 'VIP' },
  { id: 'admin', label: 'Admin', plural: 'Admin' },
];

export type ClientProfile = Pick<
  Profile,
  'id' | 'full_name' | 'email' | 'phone' | 'role' | 'seasonal_palette' | 'plan' | 'access_until' | 'created_at'
>;

/** Linha de public.payments vista pelo painel (applied_at = acesso já liberado). */
export type AdminPayment = PaymentRow & { applied_at: string | null };

export const PAYMENT_STATUSES: { id: PaymentStatus; label: string; plural: string }[] = [
  { id: 'approved', label: 'Aprovado', plural: 'Aprovados' },
  { id: 'pending', label: 'Pendente', plural: 'Pendentes' },
  { id: 'rejected', label: 'Recusado', plural: 'Recusados' },
  { id: 'cancelled', label: 'Cancelado', plural: 'Cancelados' },
  { id: 'refunded', label: 'Estornado', plural: 'Estornados' },
];

export const PAYMENT_PROVIDERS: Record<AdminPayment['provider'], string> = {
  mercadopago: 'Mercado Pago',
  whatsapp: 'WhatsApp',
  manual: 'Manual',
};

// ------------------------------------------------------------
// Acesso à consultoria digital
// ------------------------------------------------------------
export type AccessKind = 'admin' | 'active' | 'expired' | 'none';

export interface AccessState {
  kind: AccessKind;
  label: string;
  detail: string | null;
}

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const shortDateYear = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** "dd/mm" no ano corrente; "dd/mm/aaaa" nos demais. */
export function formatShortDateBR(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return (date.getFullYear() === now.getFullYear() ? shortDate : shortDateYear).format(date);
}

/** Situação do acesso para a tabela de clientes (mesma regra de src/lib/access.ts). */
export function accessStateOf(c: Pick<ClientProfile, 'role' | 'plan' | 'access_until'>, now: Date = new Date()): AccessState {
  const planName = getPlan(c.plan)?.name ?? null;
  if (c.role === 'admin') return { kind: 'admin', label: 'Admin', detail: 'Acesso total' };
  if (hasConsultingAccess(c, now)) {
    return c.access_until
      ? { kind: 'active', label: `Ativo até ${formatShortDateBR(c.access_until, now)}`, detail: planName }
      : { kind: 'active', label: 'Ativo · sem prazo', detail: planName };
  }
  if (c.access_until && (c.role === 'vip' || c.plan)) {
    return {
      kind: 'expired',
      label: 'Expirado',
      detail: `Desde ${formatShortDateBR(c.access_until, now)}${planName ? ` · ${planName}` : ''}`,
    };
  }
  return { kind: 'none', label: 'Sem plano', detail: c.role === 'client' && planName ? `Último: ${planName}` : null };
}

/** Prazo resultante de uma liberação: greatest(agora, prazo atual) + dias (espelha grant_consulting_access). */
export function grantPreview(currentUntil: string | null, days: number | null): string {
  if (days === null) return 'Sem prazo';
  const current = currentUntil ? new Date(currentUntil).getTime() : Number.NaN;
  const base = Math.max(Date.now(), Number.isFinite(current) ? current : 0);
  return `Até ${formatDateBR(new Date(base + days * 86_400_000).toISOString())}`;
}

export type ImageSet = Pick<Product, 'image_url' | 'gallery'>;

/** Colunas gravadas pelo painel (id e carimbos de data ficam a cargo do banco). */
export type ProductPayload = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'season_compatibility'> & {
  season_compatibility?: string[];
};

// ------------------------------------------------------------
// Erros
// ------------------------------------------------------------
interface ErrorLike {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  statusCode?: unknown;
}

function errorParts(err: unknown) {
  if (!err || typeof err !== 'object') return { message: typeof err === 'string' ? err : '', code: '', statusCode: '', text: '' };
  const e = err as ErrorLike;
  const message = typeof e.message === 'string' ? e.message : '';
  const code = typeof e.code === 'string' ? e.code : '';
  const statusCode = e.statusCode === undefined || e.statusCode === null ? '' : String(e.statusCode);
  const details = typeof e.details === 'string' ? e.details : '';
  return { message, code, statusCode, text: `${message} ${details}`.toLowerCase() };
}

const BUCKET_MISSING = "Execute o SQL do Supabase para criar o bucket 'products'.";

/** Traduz erros do Supabase/rotas internas em mensagens claras para a administração. */
export function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiRequestError) return err.message || fallback;
  const { message, code, statusCode, text } = errorParts(err);

  if (/bucket not found/.test(text)) return BUCKET_MISSING;
  if (/failed to fetch|networkerror|load failed|network request failed/.test(text)) {
    return 'Falha de conexão com o Supabase. Verifique sua internet e tente novamente.';
  }
  if (code === 'PGRST301' || code === 'PGRST303' || /jwt expired|invalid jwt/.test(text)) {
    return 'Sua sessão expirou. Entre novamente para continuar.';
  }
  if (code === '42501' || statusCode === '403' || /row-level security|permission denied/.test(text)) {
    return 'Permissão negada pelo banco. Confirme que sua conta tem papel de administração e que o SQL do Supabase foi executado.';
  }
  if (code === 'PGRST202' || /could not find the function/.test(text)) {
    return 'Função não encontrada no banco. Execute novamente o SQL do Supabase (supabase/schema.sql).';
  }
  if (code === '42P01' || code === 'PGRST205' || /relation .* does not exist|could not find the table/.test(text)) {
    return 'Tabela não encontrada. Execute o SQL do Supabase (supabase/schema.sql).';
  }
  if (code === '42703' || code === 'PGRST204' || /column .* does not exist|could not find the .* column/.test(text)) {
    return 'O banco está desatualizado (coluna ausente). Execute novamente o SQL do Supabase.';
  }
  if (code === '23505') return 'Já existe um registro com esses dados.';
  if (code === '23514') return 'Um dos valores não é aceito pelo banco. Revise os campos.';
  if (code === '22P02') return 'Formato de dado inválido. Revise os campos.';
  if (statusCode === '413' || /payload too large|maximum allowed size/.test(text)) {
    return 'A imagem excede o limite de tamanho do Storage.';
  }
  if (/mime type/.test(text)) return "Formato de imagem não permitido pelo bucket 'products'.";
  return message || fallback;
}

/** Erros de configuração que fariam todas as próximas operações falharem do mesmo jeito. */
export function isSetupError(err: unknown): boolean {
  const { code, statusCode, text } = errorParts(err);
  return (
    /bucket not found|row-level security|permission denied|jwt expired/.test(text) ||
    ['42501', '42P01', 'PGRST205', '42703', 'PGRST204', 'PGRST301'].includes(code) ||
    statusCode === '403'
  );
}

// ------------------------------------------------------------
// Storage (bucket público "products")
// ------------------------------------------------------------
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Comprime a foto e envia ao bucket "products" (ano/uuid.jpg). Devolve a URL pública. */
export async function uploadProductImage(file: File): Promise<string> {
  const blob = await fileToBlob(file);
  const path = `${new Date().getFullYear()}/${randomId()}.jpg`;
  const bucket = supabase.storage.from(PRODUCT_BUCKET);
  const { error } = await bucket.upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}

function bucketPublicPrefix(): string {
  return supabase.storage.from(PRODUCT_BUCKET).getPublicUrl('__').data.publicUrl.replace(/__$/, '');
}

/** Caminho interno do arquivo quando a URL pertence ao bucket "products" deste projeto. */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = bucketPublicPrefix();
  if (!url.startsWith(prefix)) return null;
  const raw = url.slice(prefix.length).split(/[?#]/)[0];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Remove arquivos do bucket "products" (URLs de outros domínios são ignoradas). */
export async function removeBucketFiles(urls: Array<string | null | undefined>): Promise<void> {
  const paths = Array.from(new Set(urls.map(storagePathFromUrl).filter((p): p is string => Boolean(p))));
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).remove(paths);
  if (error) throw error;
}

export function productImages(p: ImageSet): string[] {
  return [p.image_url, ...p.gallery].filter((u): u is string => Boolean(u));
}

/** URLs de imagem usadas por outras peças — nunca apague um arquivo compartilhado. */
export function urlsInUse(products: Product[], exceptId?: string | null): Set<string> {
  const set = new Set<string>();
  products.forEach((p) => {
    if (p.id !== exceptId) productImages(p).forEach((u) => set.add(u));
  });
  return set;
}

/** Baixa uma imagem remota como File (para análise). Devolve null se o CORS ou a rede impedirem. */
export async function urlToFile(url: string): Promise<File | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return new File([blob], 'foto-da-peca.jpg', { type: blob.type });
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// Formatos
// ------------------------------------------------------------
/** "1.290,50" · "1290.5" · "R$ 89" → centavos. `null` = vazio (sob consulta). `undefined` = inválido. */
export function parsePriceToCents(input: string): number | null | undefined {
  const body = input.trim().replace(/^r\$\s*/i, '').replace(/\s/g, '');
  if (body === '') return null;
  if (!/^[\d.,]+$/.test(body) || !/\d/.test(body)) return undefined;

  const lastSep = Math.max(body.lastIndexOf(','), body.lastIndexOf('.'));
  let reais = body;
  let centavos = '00';
  if (lastSep !== -1) {
    const head = body.slice(0, lastSep).replace(/[.,]/g, '');
    const tail = body.slice(lastSep + 1);
    if (tail.length === 3) {
      reais = head + tail; // separador de milhar
    } else if (tail.length <= 2) {
      reais = head || '0';
      centavos = tail.padEnd(2, '0');
    } else {
      return undefined;
    }
  }
  if (!/^\d+$/.test(reais) || !/^\d{2}$/.test(centavos)) return undefined;
  const cents = Number(reais) * 100 + Number(centavos);
  if (!Number.isSafeInteger(cents) || cents > MAX_PRICE_CENTS) return undefined;
  return cents;
}

const decimalBR = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function centsToInput(cents: number | null): string {
  return cents === null ? '' : decimalBR.format(cents / 100);
}

/** Normaliza "#abc" / "1b2a4a" em "#1B2A4A". Devolve null se não for uma cor hexadecimal. */
export function normalizeHex(value: string): string | null {
  const v = value.trim().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/i.test(v)) return `#${v.toUpperCase()}`;
  if (/^[0-9a-f]{3}$/i.test(v)) {
    return `#${v
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toUpperCase()}`;
  }
  return null;
}

export function clampFormality(value: unknown): number {
  const n = typeof value === 'number' ? Math.round(value) : Number.NaN;
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
}

export function withSlugSuffix(slug: string): string {
  return `${slug.slice(0, 73)}-${randomId().replace(/-/g, '').slice(0, 5)}`;
}

/** slugify(nome) com sufixo curto quando o endereço já estiver em uso. */
export function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slugify(name) || 'peca';
  if (!taken.has(base)) return base;
  for (let i = 0; i < 8; i += 1) {
    const candidate = withSlugSuffix(base);
    if (!taken.has(candidate)) return candidate;
  }
  return `${base.slice(0, 60)}-${randomId().replace(/-/g, '').slice(0, 12)}`;
}

/** Nome legível a partir do arquivo ("blazer_marinho-01.jpg" → "Blazer marinho 01"). */
export function nameFromFile(fileName: string): string {
  const base = fileName
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/^(whatsapp image|captura de tela|screenshot|imagem|image|photo|foto|img|dscn?|pxl)(?=[\s_\-.\d]|$)/i, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const hasWord = base.split(' ').some((w) => /^[a-zà-öø-ÿ]{3,}$/i.test(w));
  if (!hasWord) return 'Peça sem nome';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function formatTimeBR(iso: string): string {
  try {
    return timeFormat.format(new Date(iso));
  } catch {
    return '';
  }
}

/** Dígitos para wa.me: acrescenta 55 quando o número não traz o código do país. */
export function phoneDigitsBR(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
}

export function waLinkFor(phone: string | null | undefined, text?: string): string | null {
  const digits = phoneDigitsBR(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function displayPhone(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  const local = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  return formatPhoneBR(local);
}

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// ------------------------------------------------------------
// Sugestão da análise de foto
// ------------------------------------------------------------
const OCCASION_IDS = new Set<string>(OCCASIONS.filter((o) => o.id !== 'outro').map((o) => o.id));
const CLIMATE_IDS = new Set<string>(['frio', 'ameno', 'quente']);

export interface CleanSuggestion {
  name: string;
  category: ProductCategory;
  slot: PieceSlot;
  color_name: string;
  hex_color: string | null;
  fabric: string;
  description: string;
  formality: number;
  skin_tones: SkinToneId[];
  occasions: OccasionId[];
  climates: ClimateId[];
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Valida o retorno da análise antes de usá-lo no formulário ou no banco. */
export function sanitizeSuggestion(raw: Partial<ProductVisionSuggestion> | null | undefined): CleanSuggestion {
  const s = raw ?? {};
  const category = (PRODUCT_CATEGORIES as readonly string[]).includes(String(s.category))
    ? (s.category as ProductCategory)
    : PRODUCT_CATEGORIES[0];
  const slot = PIECE_SLOTS.includes(s.slot as PieceSlot) ? (s.slot as PieceSlot) : slotForCategory(category);
  return {
    name: text(s.name, 120),
    category,
    slot,
    color_name: text(s.color_name, 60),
    hex_color: typeof s.hex_color === 'string' ? normalizeHex(s.hex_color) : null,
    fabric: text(s.fabric, 80),
    description: text(s.description, 600),
    formality: clampFormality(s.formality),
    skin_tones: Array.from(new Set(list(s.skin_tones).filter(isSkinToneId))),
    occasions: Array.from(new Set(list(s.occasions).filter((o): o is OccasionId => OCCASION_IDS.has(String(o))))),
    climates: Array.from(new Set(list(s.climates).filter((c): c is ClimateId => CLIMATE_IDS.has(String(c))))),
  };
}

// ------------------------------------------------------------
// Leitura do banco
// ------------------------------------------------------------
export async function fetchAdminProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select('*').limit(1000);
  if (error) throw error;
  return sortProducts((data ?? []).map((row) => normalizeProduct(row as Record<string, unknown>)));
}

const ORDER_STATUS_IDS = new Set<string>(ORDER_STATUSES.map((s) => s.id));

function normalizeCartItem(raw: unknown, index: number): CartItem {
  const i = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    key: str(i.key) || `item-${index}`,
    productId: typeof i.productId === 'string' ? i.productId : null,
    name: str(i.name) || 'Peça',
    detail: str(i.detail),
    color: str(i.color),
    hex: str(i.hex),
    image: typeof i.image === 'string' && i.image ? i.image : null,
    size: typeof i.size === 'string' && i.size ? i.size : null,
    priceCents: typeof i.priceCents === 'number' ? i.priceCents : null,
    quantity: typeof i.quantity === 'number' && i.quantity > 0 ? Math.round(i.quantity) : 1,
    lookTitle: typeof i.lookTitle === 'string' && i.lookTitle ? i.lookTitle : null,
  };
}

export function normalizeOrder(row: Record<string, unknown>): OrderRow {
  const name = typeof row.customer_name === 'string' ? row.customer_name.trim() : '';
  const notes = typeof row.notes === 'string' ? row.notes.trim() : '';
  return {
    id: String(row.id),
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    customer_name: name || 'Cliente sem nome',
    customer_phone: typeof row.customer_phone === 'string' && row.customer_phone ? row.customer_phone : null,
    notes: notes || null,
    items: Array.isArray(row.items) ? row.items.map(normalizeCartItem) : [],
    total_cents: typeof row.total_cents === 'number' ? row.total_cents : null,
    status: ORDER_STATUS_IDS.has(String(row.status)) ? (row.status as OrderStatus) : 'novo',
    channel: 'whatsapp',
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

export async function fetchAdminOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => normalizeOrder(row as Record<string, unknown>));
}

const ROLE_IDS = new Set<string>(['client', 'vip', 'admin']);
const PLAN_IDS = new Set<string>(['passe', 'clube', 'presencial']);

function normalizeClient(row: Record<string, unknown>): ClientProfile {
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    id: String(row.id),
    full_name: str(row.full_name),
    email: str(row.email),
    phone: str(row.phone),
    role: ROLE_IDS.has(String(row.role)) ? (row.role as Role) : 'client',
    seasonal_palette: str(row.seasonal_palette),
    plan: PLAN_IDS.has(String(row.plan)) ? (row.plan as PlanId) : null,
    access_until: str(row.access_until),
    created_at: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

const PAYMENT_STATUS_IDS = new Set<string>(PAYMENT_STATUSES.map((s) => s.id));

function normalizePayment(row: Record<string, unknown>): AdminPayment {
  const provider = String(row.provider);
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    plan: PLAN_IDS.has(String(row.plan)) ? (row.plan as PlanId) : 'passe',
    amount_cents: typeof row.amount_cents === 'number' ? row.amount_cents : 0,
    provider: provider === 'mercadopago' || provider === 'whatsapp' ? provider : 'manual',
    provider_payment_id: typeof row.provider_payment_id === 'string' && row.provider_payment_id ? row.provider_payment_id : null,
    status: PAYMENT_STATUS_IDS.has(String(row.status)) ? (row.status as PaymentStatus) : 'pending',
    applied_at: typeof row.applied_at === 'string' && row.applied_at ? row.applied_at : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  };
}

export async function fetchAdminPayments(): Promise<AdminPayment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, user_id, plan, amount_cents, provider, provider_payment_id, status, applied_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => normalizePayment(row as Record<string, unknown>));
}

export async function fetchAdminProfiles(): Promise<ClientProfile[]> {
  const primary = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, seasonal_palette, plan, access_until, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  let rows: unknown[] | null = primary.data;
  let error = primary.error;

  // Bancos antigos sem e-mail/created_at em profiles: lê o que existir.
  if (error && (error.code === '42703' || error.code === 'PGRST204')) {
    const fallback = await supabase.from('profiles').select('*').limit(1000);
    rows = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;
  return (rows ?? []).map((row) => normalizeClient(row as Record<string, unknown>));
}
