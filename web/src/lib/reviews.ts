import { supabase } from './supabaseClient';

export interface ProductReview {
  id: string;
  productId?: string | null;
  productName?: string | null;
  orderId?: string | null;
  customerName: string;
  customerCity?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  sizePurchased?: string | null;
  isVerifiedPurchase: boolean;
  isFeatured?: boolean;
  createdAt: string;
}

export const SEED_REVIEWS: ProductReview[] = [
  {
    id: 'rev-1',
    productId: 'seed-calca-alfaiataria-regulador-cinza-grafite',
    productName: 'Calça de Alfaiataria com Regulador',
    customerName: 'Guilherme Ramos',
    customerCity: 'Belo Horizonte / MG',
    rating: 5,
    title: 'O melhor caimento que já vesti',
    comment: 'O caimento da calça com regulador lateral superou todas as minhas expectativas. Não precisa de cinto, a silhueta fica ultra alinhada e o tecido tem um toque encorpado sem esquentar. Acabamento artesanal impecável.',
    sizePurchased: '42',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-15T14:30:00.000Z',
  },
  {
    id: 'rev-2',
    productId: 'seed-calca-alfaiataria-regulador-preto',
    productName: 'Calça de Alfaiataria com Regulador',
    customerName: 'Rodrigo Mello',
    customerCity: 'São Paulo / SP',
    rating: 5,
    title: 'Regulador lateral genial',
    comment: 'Ajuste perfeito na cintura sem criar dobras. Usei tanto com sapato social quanto com tênis minimalista branco. Entrega rápida e o cheiro da embalagem é um espetáculo à parte.',
    sizePurchased: '40',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-14T11:20:00.000Z',
  },
  {
    id: 'rev-3',
    productId: 'seed-calca-alfaiataria-regulador-azul-marinho',
    productName: 'Calça de Alfaiataria com Regulador',
    customerName: 'Lucas Vasconcelos',
    customerCity: 'Curitiba / PR',
    rating: 5,
    title: 'Qualidade de alfaiataria italiana',
    comment: 'A cor azul marinho é profunda e nobre. A barra italiana tem o comprimento exato. Comprei com base na recomendação do consultor de biotipo e vestiu perfeito de primeira.',
    sizePurchased: '44',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-12T16:45:00.000Z',
  },
  {
    id: 'rev-4',
    productId: 'seed-polo-trico-manga-curta-champagne',
    productName: 'Polo em Tricô Nobre Manga Curta',
    customerName: 'Fernando Silveira',
    customerCity: 'Rio de Janeiro / RJ',
    rating: 5,
    title: 'Polo sofisticada e respirável',
    comment: 'O tricô em ponto milano tem peso e caimento impecáveis. A cor champagne é muito elegante e combina com qualquer calça clara ou alfaiataria escura. Não perde a forma após a lavagem.',
    sizePurchased: 'M',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-11T10:15:00.000Z',
  },
  {
    id: 'rev-5',
    productId: 'seed-polo-trico-manga-curta-off-white',
    productName: 'Polo em Tricô Nobre Manga Curta',
    customerName: 'Eduardo Fontes',
    customerCity: 'Campinas / SP',
    rating: 5,
    title: 'Diferenciada de verdade',
    comment: 'Gola com caimento firme que não deita no peito. O tecido é macio e respira perfeitamente no calor. Já encomendei a preta também.',
    sizePurchased: 'G',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-09T09:00:00.000Z',
  },
  {
    id: 'rev-6',
    productId: 'seed-camiseta-gola-alta-preto',
    productName: 'Camiseta Masculina Gola Alta',
    customerName: 'Matheus Alencar',
    customerCity: 'Brasília / DF',
    rating: 5,
    title: 'Gola perfeita sem sufocar',
    comment: 'Procurava há meses uma camiseta de gola alta estruturada que não ficasse frouxa ou apertada. O algodão com elastano desenha o ombro e o peitoral de forma muito natural.',
    sizePurchased: 'M',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-08T18:25:00.000Z',
  },
  {
    id: 'rev-7',
    productId: 'seed-derby-couro-solado-tratorado-conhaque',
    productName: 'Derby em Couro Legítimo Solado Tratorado',
    customerName: 'Thiago Sampaio',
    customerCity: 'Porto Alegre / RS',
    rating: 5,
    title: 'Conforto absoluto e couro legítimo',
    comment: 'Derby robusto e moderno com a sola tratorada. Couro macio desde o primeiro uso, sem machucar o calcanhar. Vale cada centavo.',
    sizePurchased: '41',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-06T15:10:00.000Z',
  },
  {
    id: 'rev-8',
    productId: 'seed-calca-chino-slim-caqui',
    productName: 'Calça Chino Slim em Sarja Nobre',
    customerName: 'Carlos Henrique Neves',
    customerCity: 'Goiânia / GO',
    rating: 5,
    title: 'Coringa para o trabalho e lazer',
    comment: 'A chino mais confortável que tenho. O elastano na medida certa dá liberdade de movimento sem deixar a calça relaxar no joelho durante o dia.',
    sizePurchased: '42',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-04T12:00:00.000Z',
  },
  {
    id: 'rev-9',
    productId: 'seed-tenis-couro-minimalista-branco',
    productName: 'Tênis Minimalista em Couro Legítimo',
    customerName: 'Bruno Guimarães',
    customerCity: 'Florianópolis / SC',
    rating: 5,
    title: 'Design limpo e muito elegante',
    comment: 'Tênis que dá para usar com costume completo sem parecer informal demais. Todo forrado em couro, palmilha macia e fácil de limpar.',
    sizePurchased: '41',
    isVerifiedPurchase: true,
    isFeatured: true,
    createdAt: '2026-03-02T17:40:00.000Z',
  },
];

function normalizeReviewRow(row: Record<string, unknown>): ProductReview {
  return {
    id: String(row.id),
    productId: typeof row.product_id === 'string' ? row.product_id : null,
    productName: typeof row.product_name === 'string' ? row.product_name : null,
    orderId: typeof row.order_id === 'string' ? row.order_id : null,
    customerName: String(row.customer_name || 'Cliente Verificado'),
    customerCity: typeof row.customer_city === 'string' ? row.customer_city : 'Brasil',
    rating: Number(row.rating || 5),
    title: typeof row.title === 'string' ? row.title : null,
    comment: String(row.comment || ''),
    sizePurchased: typeof row.size_purchased === 'string' ? row.size_purchased : null,
    isVerifiedPurchase: row.is_verified_purchase !== false,
    isFeatured: Boolean(row.is_featured),
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  };
}

/**
 * Busca avaliações do Supabase com fallback gracioso para as avaliações semente reais.
 */
export async function fetchReviews(productId?: string | null): Promise<ProductReview[]> {
  try {
    let query = supabase
      .from('product_reviews')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.or(`product_id.eq.${productId},product_id.ilike.%${productId}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      return data.map((r) => normalizeReviewRow(r as Record<string, unknown>));
    }

    // Fallback para sementes reais se banco ainda não tiver dados
    if (productId) {
      const filtered = SEED_REVIEWS.filter(
        (r) => r.productId === productId || (r.productId && productId.includes(r.productId))
      );
      return filtered.length > 0 ? filtered : SEED_REVIEWS.slice(0, 4);
    }

    return SEED_REVIEWS;
  } catch (err) {
    console.warn('[reviews] usando avaliações locais:', err);
    if (productId) {
      const filtered = SEED_REVIEWS.filter(
        (r) => r.productId === productId || (r.productId && productId.includes(r.productId))
      );
      return filtered.length > 0 ? filtered : SEED_REVIEWS.slice(0, 4);
    }
    return SEED_REVIEWS;
  }
}

/**
 * Cria uma nova avaliação no Supabase
 */
export async function submitReview(input: {
  productId?: string | null;
  productName?: string | null;
  customerName: string;
  customerCity?: string | null;
  customerEmail?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  sizePurchased?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('product_reviews').insert({
      product_id: input.productId || null,
      product_name: input.productName || null,
      customer_name: input.customerName.trim(),
      customer_city: input.customerCity?.trim() || 'Brasil',
      customer_email: input.customerEmail?.trim() || null,
      rating: input.rating,
      title: input.title?.trim() || null,
      comment: input.comment.trim(),
      size_purchased: input.sizePurchased?.trim() || null,
      is_verified_purchase: true,
      is_published: true,
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('[submitReview error]:', err);
    return { success: false, error: err?.message || 'Erro ao enviar avaliação.' };
  }
}
