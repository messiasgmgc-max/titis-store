'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ShoppingBag, 
  ShieldCheck, 
  Sparkles, 
  Truck, 
  RefreshCw, 
  Star, 
  Check, 
  CheckCircle,
  Award,
  ChevronRight
} from 'lucide-react';
import { useCatalog } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';
import { getInstallmentTeaser } from '@/lib/installments';
import { fetchReviews, type ProductReview, SEED_REVIEWS } from '@/lib/reviews';
import { useCart } from '@/providers/CartProvider';
import { useUI } from '@/providers/UIProvider';
import { Button } from '@/components/ui/Button';
import { Tilt3D } from '@/components/ui/Tilt3D';
import { FeaturedCarousel3D } from '@/components/store/FeaturedCarousel3D';

const CATEGORIES = [
  {
    name: 'Alfaiataria',
    slug: 'Alfaiataria',
    image: '/produtos/calca-alfaiataria-regulador-cinza-grafite.jpg',
    desc: 'Calças com regulador lateral em metal, cós limpo e corte sob medida',
  },
  {
    name: 'Polos & Malharia',
    slug: 'Malharia',
    image: '/produtos/polo-trico-off-white.jpg',
    desc: 'Polos em tricô artesanal encorpado e caimento refinado',
  },
  {
    name: 'Camisaria & Gola Alta',
    slug: 'Camisaria',
    image: '/produtos/camiseta-gola-alta-preto.jpg',
    desc: 'Modelagem slim em algodão com elastano que modela o tórax',
  },
  {
    name: 'Calçados',
    slug: 'Calçados',
    image: '/produtos/derby-couro-solado-tratorado-conhaque.jpg',
    desc: 'Derby conhaque, loafers em camurça e tênis em couro legítimo',
  },
];

export default function StoreHomePage() {
  const { products, loading } = useCatalog();
  const { add } = useCart();
  const { openOverlay } = useUI();
  const [reviews, setReviews] = useState<ProductReview[]>(SEED_REVIEWS.slice(0, 6));

  useEffect(() => {
    fetchReviews().then((data) => {
      if (data && data.length > 0) setReviews(data.slice(0, 6));
    });
  }, []);

  // Peças em destaque para o Carrossel 3D do Hero
  const featuredLeads = products.filter((p) => p.is_featured && p.image_url);
  const heroCarouselProducts = featuredLeads.length > 0 
    ? featuredLeads 
    : products.filter((p) => p.image_url).slice(0, 6);

  const featuredProducts = products.filter((p) => p.is_featured || p.price_cents !== null).slice(0, 8);
  const consultorUrl = process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br';

  return (
    <main id="conteudo" className="min-h-screen bg-obsidian text-ivory">
      
      {/* 1. HERO PRINCIPAL DA LOJA */}
      <section className="relative isolate overflow-hidden border-b border-line pt-28 pb-20 sm:pt-36 sm:pb-32">
        <div
          aria-hidden
          className="glow-gold pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-20"
        />
        
        <div className="container-luxe">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            
            {/* Texto de Apresentação */}
            <div className="space-y-6 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-line-gold bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold">
                <Award className="h-3.5 w-3.5" />
                <span>Nova Coleção Heritage 2026</span>
              </div>
              
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-ivory">
                Alta Alfaiataria Masculina. <br />
                <span className="text-foil">Corte Preciso e Presença.</span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-mist sm:text-lg">
                Vestuário masculino premium desenvolvido com matérias-primas nobres, silhueta contemporânea 
                e atenção milimétrica aos detalhes da alfaiataria tradicional.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button href="/colecao" variant="gold" size="lg" className="shadow-xl shadow-gold/25">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Explorar Coleção</span>
                </Button>
                <Link
                  href="/colecao?ordem=mais-vendidos"
                  className="btn btn-outline btn-lg"
                >
                  <span>Mais Vendidos</span>
                </Link>
              </div>

              {/* Vantagens Imediatas */}
              <div className="grid grid-cols-3 gap-4 border-t border-line pt-8 text-xs text-mist">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-gold shrink-0" />
                  <span>Envio para todo o Brasil</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-gold shrink-0" />
                  <span>Pagamento Seguro Mercado Pago</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-gold shrink-0" />
                  <span>Primeira Troca Grátis</span>
                </div>
              </div>
            </div>

            {/* Carrossel 3D Interativo de Peças Destaque */}
            <div className="lg:col-span-5">
              <FeaturedCarousel3D products={heroCarouselProducts} />
            </div>

          </div>
        </div>
      </section>

      {/* 2. CATEGORIAS PRINCIPAIS */}
      <section className="border-b border-line py-16 sm:py-24">
        <div className="container-luxe">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="eyebrow">Departamentos da Loja</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-4xl text-ivory">
                Compre por <span className="text-foil">Categoria</span>
              </h2>
            </div>
            <Link href="/colecao" className="link-luxe flex items-center gap-1.5 text-xs text-gold font-bold">
              <span>Ver catálogo completo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={`/colecao?categoria=${cat.slug}`}
                className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl border border-line p-5 transition-all duration-300 hover:border-gold/50 hover:shadow-xl hover:shadow-gold/5"
              >
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
                <div className="relative z-10">
                  <h3 className="text-lg font-bold text-ivory group-hover:text-gold-light transition-colors">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-mist line-clamp-2">{cat.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. VITRINE DE PRODUTOS / MAIS VENDIDOS */}
      <section className="py-16 sm:py-24 border-b border-line">
        <div className="container-luxe">
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <p className="eyebrow">Seleção Oficial</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-4xl text-ivory">
              Mais Vendidos da <span className="text-foil">Coleção</span>
            </h2>
            <p className="mt-3 text-sm text-mist">
              Roupas masculinas com acabamento artesanal, modelagem refinada e tecidos selecionados para conforto e durabilidade.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 sm:gap-6 lg:gap-8">
            {featuredProducts.map((product) => {
              const price = product.price_cents ? formatBRL(product.price_cents) : 'Sob consulta';
              const productUrl = `/produtos/${product.slug || product.id}`;
              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-line bg-surface/60 p-4 transition-all duration-300 hover:border-gold/40 hover:shadow-xl hover:shadow-gold/5"
                >
                  <div>
                    <Link href={productUrl} className="relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-surface">
                      <Image
                        src={product.image_url || '/produtos/calca-alfaiataria-regulador-cinza-grafite.jpg'}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {product.is_featured && (
                        <span className="absolute top-2.5 left-2.5 rounded-full bg-foil px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-obsidian shadow-md">
                          Destaque
                        </span>
                      )}
                    </Link>

                    <div className="mt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-mist">
                        {product.category}
                      </p>
                      <Link href={productUrl} className="mt-1 block text-sm font-bold text-ivory hover:text-gold-light line-clamp-1">
                        {product.name}
                      </Link>
                      <div className="mt-1.5 flex flex-col gap-0.5">
                        <p className="text-base font-extrabold text-gold">{price}</p>
                        {product.price_cents && (
                          <p className="text-[11px] text-mist font-medium">
                            {getInstallmentTeaser(product.price_cents)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line/60">
                    <button
                      onClick={() => {
                        add({
                          productId: product.id,
                          name: product.name,
                          detail: product.category,
                          color: product.color_name ?? 'Padrão',
                          hex: product.hex_color ?? '#181b24',
                          image: product.image_url,
                          size: product.sizes?.[0] ?? 'M',
                          priceCents: product.price_cents ?? 0,
                          quantity: 1,
                        });
                        openOverlay({ type: 'bag' });
                      }}
                      className="w-full py-2.5 rounded-full bg-surface border border-line-gold/50 text-gold-light text-xs font-bold uppercase tracking-wider hover:bg-gold hover:text-obsidian transition-all flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>Adicionar à Sacola</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Button href="/colecao" variant="outline" size="lg">
              <span>Ver Todos os Produtos ({products.length})</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* 4. DESTAQUE EDITORIAL DE ALFAIATARIA */}
      <section className="py-20 sm:py-28 bg-surface-2 border-b border-line">
        <div className="container-luxe">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            
            <div className="lg:col-span-6 relative aspect-square sm:aspect-[4/3] rounded-3xl overflow-hidden border border-line-gold/30 shadow-2xl">
              <Image
                src="/hero_titis_style.jpg"
                alt="Detalhe da Alfaiataria Titi's Store"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 via-transparent to-transparent" />
            </div>

            <div className="lg:col-span-6 space-y-6 lg:pl-6">
              <span className="eyebrow">Padrão de Excelência</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ivory">
                Tecidos Nobres e <br />
                <span className="text-foil">Acabamento Impecável.</span>
              </h2>
              <p className="text-sm sm:text-base text-mist leading-relaxed">
                Nossas peças são confeccionadas com linhos puros, algodões egípcios de fibra longa e lãs frias Super 120s. 
                O resultado é um caimento estruturado que acompanha a movimentação natural do corpo sem perder o alinhamento.
              </p>

              <ul className="space-y-3 text-xs sm:text-sm text-parchment">
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Costuras reforçadas e forros acetinados de alto toque</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Botões em madrepérola e zíperes metálicos de alta durabilidade</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span>Corte e modelagem testados para valorizar a postura</span>
                </li>
              </ul>

              <div className="pt-2">
                <Button href="/colecao" variant="gold">
                  <span>Conhecer a Coleção</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. CHAMADA DISCRETA PARA O CONSULTOR DE IMAGEM */}
      <section className="py-16 sm:py-20 border-b border-line bg-obsidian">
        <div className="container-luxe">
          <div className="rounded-3xl border border-line-gold/40 bg-surface/80 p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Serviço Exclusivo</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-ivory">
                Dúvidas sobre quais cores favorecem seu tom de pele?
              </h3>
              <p className="text-xs sm:text-sm text-mist leading-relaxed">
                Acesse nosso <strong>Consultor de Imagem Digital</strong> para descobrir sua cartela de colorimetria e receber sugestões sob medida para cada evento.
              </p>
            </div>

            <a
              href={consultorUrl}
              className="btn btn-gold btn-lg shrink-0 flex items-center gap-2 shadow-xl shadow-gold/20"
            >
              <span>Acessar Consultoria Digital</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 6. AVALIAÇÕES DE CLIENTES */}
      <section className="py-16 sm:py-24 border-b border-line">
        <div className="container-luxe">
          <div className="mb-12 text-center max-w-md mx-auto">
            <p className="eyebrow">Depoimentos Verificados</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl text-ivory">
              A Opinião de Quem <span className="text-foil">Veste Titi&apos;s Store</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl border border-line bg-surface/60 p-6 space-y-4 flex flex-col justify-between hover:border-gold/30 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 text-gold">
                      {[...Array(5)].map((_, idx) => (
                        <Star
                          key={idx}
                          className={`h-4 w-4 ${
                            idx < rev.rating ? 'fill-gold text-gold' : 'text-line'
                          }`}
                        />
                      ))}
                    </div>
                    {rev.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <CheckCircle className="h-3 w-3" />
                        <span>Compra Verificada</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-mist leading-relaxed italic">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>

                <div className="border-t border-line/60 pt-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-ivory">{rev.customerName}</h4>
                    <p className="text-[10px] text-mist">{rev.customerCity}</p>
                  </div>
                  {rev.productName && (
                    <span className="text-[10px] text-gold font-semibold uppercase line-clamp-1 max-w-[140px] text-right">
                      {rev.productName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
