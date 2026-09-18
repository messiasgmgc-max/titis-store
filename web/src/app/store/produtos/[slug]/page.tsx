'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  Check, 
  Sparkles, 
  CreditCard,
  Ruler
} from 'lucide-react';
import { useCatalog } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';
import { getInstallmentTeaser } from '@/lib/installments';
import { useCart } from '@/providers/CartProvider';
import { useUI } from '@/providers/UIProvider';
import { Button } from '@/components/ui/Button';
import { ProductReviewsSection } from '@/components/store/ProductReviewsSection';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { products, loading } = useCatalog();
  const { add } = useCart();
  const { openOverlay } = useUI();

  // Localiza produto por slug ou por ID
  const product = products.find(
    (p) => (p.slug && p.slug === resolvedParams.slug) || p.id === resolvedParams.slug
  );

  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-obsidian text-ivory flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs uppercase tracking-widest text-mist">Carregando detalhes da peça...</p>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-[70vh] bg-obsidian text-ivory flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold text-ivory">Produto não encontrado</h1>
        <p className="mt-2 text-sm text-mist">Esta peça pode ter sido esgotada ou movida.</p>
        <Button href="/colecao" variant="gold" className="mt-6">
          Voltar para a Coleção
        </Button>
      </main>
    );
  }

  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ['P', 'M', 'G', 'GG'];
  const gallery = product.gallery && product.gallery.length > 0 
    ? [product.image_url, ...product.gallery].filter(Boolean) as string[]
    : [product.image_url || '/produtos/calca-alfaiataria-regulador-cinza-grafite.jpg'];

  const currentImg = activeImage || gallery[0];
  const price = product.price_cents ? formatBRL(product.price_cents) : 'Sob consulta';

  const handleAddToCart = () => {
    add({
      productId: product.id,
      name: product.name,
      detail: product.category,
      color: product.color_name ?? 'Padrão',
      hex: product.hex_color ?? '#181b24',
      image: product.image_url,
      size: selectedSize,
      priceCents: product.price_cents ?? 0,
      quantity,
    });
    openOverlay({ type: 'bag' });
  };

  const handleBuyNow = () => {
    add({
      productId: product.id,
      name: product.name,
      detail: product.category,
      color: product.color_name ?? 'Padrão',
      hex: product.hex_color ?? '#181b24',
      image: product.image_url,
      size: selectedSize,
      priceCents: product.price_cents ?? 0,
      quantity,
    });
    router.push('/checkout');
  };

  return (
    <main id="conteudo" className="min-h-screen bg-obsidian text-ivory pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div className="container-luxe">
          
          {/* Navegação de retorno */}
          <div className="mb-8">
            <Link
              href="/colecao"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mist hover:text-gold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para Coleção</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            
            {/* GALERIA DE FOTOS */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl">
                <Image
                  src={currentImg}
                  alt={product.name}
                  fill
                  priority
                  className="object-cover"
                />
                {product.is_featured && (
                  <span className="absolute top-4 left-4 rounded-full bg-foil px-3 py-1 text-xs font-bold uppercase tracking-wider text-obsidian shadow-md">
                    Destaque
                  </span>
                )}
              </div>

              {gallery.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {gallery.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(img)}
                      className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border transition-all ${
                        currentImg === img ? 'border-gold ring-1 ring-gold' : 'border-line opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image src={img} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DETALHES & AÇÕES */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gold">
                  {product.category}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ivory sm:text-4xl">
                  {product.name}
                </h1>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-2xl font-black text-foil sm:text-3xl">
                    {price}
                  </span>
                  {product.price_cents && (
                    <span className="text-xs text-gold font-medium">
                      {getInstallmentTeaser(product.price_cents)}{' '}
                      <span className="text-mist font-normal">· ou até 12x no cartão</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Seletor de Tamanhos */}
              <div className="border-t border-line pt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-parchment">
                    Selecione o Tamanho:
                  </label>
                  <span className="text-[11px] text-gold flex items-center gap-1">
                    <Ruler className="h-3 w-3" />
                    <span>Guia de Medidas</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`h-11 min-w-11 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        selectedSize === s
                          ? 'bg-gold text-obsidian shadow-lg shadow-gold/20'
                          : 'bg-surface border border-line text-ivory hover:border-gold/50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Quantidade & Botões */}
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <div className="flex items-center rounded-xl border border-line bg-surface px-3">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-2 py-2 text-base text-mist hover:text-ivory"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-ivory">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-2 py-2 text-base text-mist hover:text-ivory"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-3.5 rounded-xl border border-line-gold bg-surface text-gold font-bold text-xs uppercase tracking-wider hover:bg-gold/10 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Adicionar à Sacola</span>
                  </button>
                </div>

                <button
                  onClick={handleBuyNow}
                  className="w-full py-4 rounded-xl bg-gold-gradient text-obsidian font-black text-xs uppercase tracking-wider shadow-xl shadow-gold/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="h-4 w-4 text-obsidian" />
                  <span>Comprar Agora</span>
                </button>
              </div>

              {/* Informações da Peça */}
              <div className="border-t border-line pt-6 space-y-4 text-xs text-mist leading-relaxed">
                {product.description && (
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-parchment mb-1">Descrição</h4>
                    <p>{product.description}</p>
                  </div>
                )}
                {product.fabric && (
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-parchment mb-1">Tecido & Composição</h4>
                    <p>{product.fabric}</p>
                  </div>
                )}
              </div>

              {/* Selos de Garantia */}
              <div className="rounded-2xl border border-line bg-surface/40 p-4 space-y-2.5 text-xs text-mist">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-gold shrink-0" />
                  <span>Pagamento 100% seguro pelo Mercado Pago</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck className="h-4 w-4 text-gold shrink-0" />
                  <span>Envio com rastreio para todo o Brasil</span>
                </div>
              </div>

            </div>

          </div>

          {/* Seção de Avaliações Reais */}
          <ProductReviewsSection productId={product.id} productName={product.name} />
        </div>
      </main>
  );
}
