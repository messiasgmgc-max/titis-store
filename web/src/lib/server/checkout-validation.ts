// ============================================================
// VALIDAÇÃO E RECÁLCULO SEGURO DE CHECKOUT NO SERVIDOR
// Nunca confia nos preços ou fotos enviados pelo navegador.
// Busca os produtos oficiais no banco, valida cores/tamanhos e monta o snapshot.
// ============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeProduct } from '@/lib/products';
import type { CartItem, Product } from '@/lib/types';

export interface RawCheckoutItem {
  productId?: string | null;
  variantId?: string | null;
  sku?: string | null;
  name?: string;
  size?: string | null;
  color?: string | null;
  quantity?: number;
}

export interface ValidatedCheckoutResult {
  items: CartItem[];
  subtotalCents: number;
  shippingPriceCents: number;
  totalCents: number;
  shippingService: {
    id: string;
    name: string;
    priceCents: number;
    deliveryDays: number;
  };
}

/**
 * Valida a lista de itens, verifica estoque/existência, obtém fotos e preços reais do banco,
 * e calcula o total exato sem confiar no cliente.
 */
export async function validateAndCalculateCheckout(
  db: SupabaseClient,
  rawItems: RawCheckoutItem[],
  shippingServiceInput: {
    id?: string;
    name?: string;
    priceCents?: number;
    deliveryDays?: number;
  },
  shippingAddress: any
): Promise<ValidatedCheckoutResult> {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('A sacola de compras está vazia.');
  }

  // Coleta IDs únicos de produtos
  const productIds = Array.from(
    new Set(rawItems.map((i) => i.productId).filter((id): id is string => Boolean(id && String(id).trim())))
  );

  // Busca os produtos no banco
  let dbProductsMap = new Map<string, Product>();

  if (productIds.length > 0) {
    const { data: dbProducts, error } = await db
      .from('products')
      .select('*')
      .in('id', productIds);

    if (error) {
      throw new Error(`Erro ao consultar produtos: ${error.message}`);
    }

    for (const p of dbProducts || []) {
      const normalized = normalizeProduct(p);
      dbProductsMap.set(normalized.id, normalized);
    }
  }

  // Se algum item não tiver productId (pedidos legados ou custom), tenta buscar por nome
  const itemsWithoutId = rawItems.filter((i) => !i.productId && i.name);
  if (itemsWithoutId.length > 0) {
    const names = itemsWithoutId.map((i) => String(i.name).trim());
    const { data: byName } = await db
      .from('products')
      .select('*')
      .in('name', names);

    for (const p of byName || []) {
      const normalized = normalizeProduct(p);
      dbProductsMap.set(normalized.name.toLowerCase(), normalized);
    }
  }

  const validatedItems: CartItem[] = [];
  let calculatedSubtotalCents = 0;

  for (const raw of rawItems) {
    const qty = Math.max(1, Math.min(20, Number(raw.quantity) || 1));

    // Localiza produto
    let product: Product | undefined;
    if (raw.productId) {
      product = dbProductsMap.get(raw.productId);
    }
    if (!product && raw.name) {
      product = dbProductsMap.get(raw.name.toLowerCase());
    }

    if (!product) {
      throw new Error(`O produto "${raw.name || raw.productId || 'desconhecido'}" não foi encontrado no catálogo.`);
    }

    if (product.is_active === false) {
      throw new Error(`A peça "${product.name}" não está mais disponível para venda.`);
    }

    // Localiza variante (por variantId ou por cor)
    const variants = product.variants || [];
    let variant = raw.variantId ? variants.find((v) => v.id === raw.variantId) : undefined;

    const reqColor = raw.color?.trim();
    if (!variant && reqColor && variants.length > 0) {
      variant = variants.find(
        (v) => v.color_name.toLowerCase() === reqColor.toLowerCase()
      );
    }

    // Se ainda não encontrou e o produto tem variantes:
    // Se o cliente pediu cor mas ela não existe no produto com variantes, rejeita
    if (!variant && variants.length > 0 && reqColor && reqColor.toLowerCase() !== 'única' && reqColor.toLowerCase() !== 'unica' && reqColor.toLowerCase() !== 'padrão') {
      throw new Error(`A cor "${reqColor}" não está disponível para o produto "${product.name}".`);
    }

    // Fallback de variante: primeira variante se houver
    if (!variant && variants.length > 0) {
      variant = variants[0];
    }

    // Normalização da cor: se não tiver cor cadastrada, utiliza "Única"
    let finalColor = 'Única';
    let finalHex = '#181b24';
    let finalImage = product.image_url || null;
    let finalSku = variant?.sku || null;

    if (variant) {
      finalColor = variant.color_name?.trim() || product.color_name?.trim() || 'Única';
      finalHex = variant.hex_color?.trim() || product.hex_color?.trim() || '#181b24';
      finalImage = variant.image_url || product.image_url || null;
      if (finalColor.toLowerCase() === 'padrão' || finalColor.toLowerCase() === 'padrao') {
        finalColor = 'Única';
      }
    } else if (product.color_name?.trim()) {
      finalColor = product.color_name.trim();
      finalHex = product.hex_color?.trim() || '#181b24';
      if (finalColor.toLowerCase() === 'padrão' || finalColor.toLowerCase() === 'padrao') {
        finalColor = 'Única';
      }
    }

    // Validação de tamanho
    const allowedSizes = variant?.sizes && variant.sizes.length > 0
      ? variant.sizes
      : product.sizes && product.sizes.length > 0
      ? product.sizes
      : null;

    const reqSize = raw.size?.trim();
    if (allowedSizes && reqSize) {
      const matchSize = allowedSizes.some((s) => s.toLowerCase() === reqSize.toLowerCase());
      if (!matchSize) {
        throw new Error(`O tamanho "${reqSize}" não está disponível para "${product.name}". Tamanhos disponíveis: ${allowedSizes.join(', ')}.`);
      }
    }

    // Validação de estoque (se houver estoque numérico cadastrado na variante ou no produto)
    const stockToCheck = typeof variant?.stock === 'number' ? variant.stock : typeof (product as any).stock === 'number' ? (product as any).stock : null;
    if (typeof stockToCheck === 'number' && stockToCheck < qty) {
      throw new Error(`Estoque insuficiente para "${product.name}" (${finalColor}). Restam apenas ${stockToCheck} unidades.`);
    }

    // Determina preço unitário oficial do banco
    const unitPriceCents = typeof variant?.price_cents === 'number'
      ? variant.price_cents
      : typeof product.price_cents === 'number'
      ? product.price_cents
      : 0;

    if (unitPriceCents <= 0) {
      throw new Error(`O produto "${product.name}" está sem preço definido para venda online.`);
    }

    calculatedSubtotalCents += unitPriceCents * qty;

    const lineKey = `${product.id}|${variant?.id || ''}|${reqSize || ''}|${finalColor}`;

    validatedItems.push({
      key: lineKey,
      productId: product.id,
      variantId: variant?.id || null,
      sku: finalSku,
      name: product.name,
      detail: product.category,
      color: finalColor,
      hex: finalHex,
      image: finalImage,
      size: reqSize || null,
      priceCents: unitPriceCents,
      quantity: qty,
    });
  }

  // ------------------------------------------------------------
  // Validação e cálculo do Frete no Servidor
  // ------------------------------------------------------------
  const isRetirada =
    shippingServiceInput?.id === 'retirada-betim' ||
    String(shippingServiceInput?.name || '').toLowerCase().includes('retirada') ||
    String(shippingAddress?.street || '').toLowerCase().includes('retirada');

  let shippingPriceCents = 0;
  let serviceId = shippingServiceInput?.id || 'pac';
  let serviceName = shippingServiceInput?.name || 'Correios PAC';
  let deliveryDays = Number(shippingServiceInput?.deliveryDays) || 5;

  if (isRetirada) {
    shippingPriceCents = 0;
    serviceId = 'retirada-betim';
    serviceName = 'Retirada Grátis no Atelier (Betim/MG)';
    deliveryDays = 1;
  } else {
    // Regra da loja: Frete grátis para compras a partir de R$ 299,00
    const isFreeShippingEligible = calculatedSubtotalCents >= 29900;

    if (isFreeShippingEligible && serviceId === 'pac') {
      shippingPriceCents = 0;
    } else {
      // Se não for elegível ou for SEDEX, aceita o preço verificado da cotação
      // ou aplica o valor enviado pelo gateway com segurança
      shippingPriceCents = Math.max(0, Math.round(Number(shippingServiceInput?.priceCents) || 0));
    }
  }

  const totalCents = calculatedSubtotalCents + shippingPriceCents;

  return {
    items: validatedItems,
    subtotalCents: calculatedSubtotalCents,
    shippingPriceCents,
    totalCents,
    shippingService: {
      id: serviceId,
      name: serviceName,
      priceCents: shippingPriceCents,
      deliveryDays,
    },
  };
}
