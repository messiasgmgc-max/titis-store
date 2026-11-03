'use client';

import React, { useState, useEffect, useRef, use } from 'react';
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
  Ruler,
  Share2,
  Copy,
  ChevronRight,
  Info,
  Weight,
  User,
} from 'lucide-react';
import { useCatalog } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';
import { getInstallmentTeaser } from '@/lib/installments';
import { buildProductPath, resolveProductFromPath, getCategorySlug } from '@/lib/products';
import { useCart } from '@/providers/CartProvider';
import { useUI } from '@/providers/UIProvider';
import { useSession } from '@/providers/SessionProvider';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProductReviewsSection } from '@/components/store/ProductReviewsSection';

interface ProductPageProps {
  params: Promise<{ slug: string; category?: string }>;
}

export default function ProductDetailPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { products, loading } = useCatalog();
  const { add } = useCart();
  const { openOverlay } = useUI();

  // Localiza produto e variante inicial por slug/categoria composta
  const resolvedRoute = React.useMemo(() => {
    return resolveProductFromPath(products, resolvedParams.slug, resolvedParams.category);
  }, [products, resolvedParams.slug, resolvedParams.category]);

  const product = resolvedRoute?.product || products.find(
    (p) => (p.slug && p.slug === resolvedParams.slug) || p.id === resolvedParams.slug
  );

  const { profile } = useSession();
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('base');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState<boolean>(false);

  // Provador Virtual / Calculadora de Tamanho por Altura e Peso
  const [calcHeight, setCalcHeight] = useState<string>(() => (profile?.height_cm ? String(profile.height_cm) : ''));
  const [calcWeight, setCalcWeight] = useState<string>(() => (profile?.weight_kg ? String(profile.weight_kg) : ''));
  const isInitialized = useRef<boolean>(false);

  // Sincroniza dados biométricos do perfil se o usuário fizer login depois
  useEffect(() => {
    if (profile?.height_cm && !calcHeight) setCalcHeight(String(profile.height_cm));
    if (profile?.weight_kg && !calcWeight) setCalcWeight(String(profile.weight_kg));
  }, [profile?.height_cm, profile?.weight_kg]);

  // Sincroniza estado inicial com a variante e tamanho detectados na URL
  useEffect(() => {
    if (resolvedRoute && !isInitialized.current) {
      setSelectedVariantId(resolvedRoute.selectedVariantId);
      setSelectedSize(resolvedRoute.selectedSize);
      isInitialized.current = true;
    }
  }, [resolvedRoute]);

  const allVariants = React.useMemo(() => {
    if (!product) return [];
    const list = [];
    if (product.color_name || product.hex_color || product.image_url) {
      list.push({
        id: 'base',
        color_name: product.color_name || 'Única',
        hex_color: product.hex_color || '#181b24',
        image_url: product.image_url,
        gallery: product.gallery || [],
        sizes: product.sizes && product.sizes.length > 0 ? product.sizes : ['P', 'M', 'G', 'GG'],
        price_cents: product.price_cents,
        sku: null as string | null,
      });
    }
    if (product.variants && Array.isArray(product.variants)) {
      for (const v of product.variants) {
        if (v && (v.color_name || v.hex_color || v.image_url)) {
          list.push({
            id: v.id || v.color_name || `var-${list.length}`,
            color_name: v.color_name || 'Variação',
            hex_color: v.hex_color || '#181b24',
            image_url: v.image_url || product.image_url,
            gallery: v.gallery && v.gallery.length > 0 ? v.gallery : product.gallery || [],
            sizes: v.sizes && v.sizes.length > 0 ? v.sizes : (product.sizes && product.sizes.length > 0 ? product.sizes : ['P', 'M', 'G', 'GG']),
            price_cents: typeof v.price_cents === 'number' ? v.price_cents : product.price_cents,
            sku: v.sku || null,
          });
        }
      }
    }
    return list;
  }, [product]);

  const activeVariant = allVariants.find((v) => v.id === selectedVariantId) || allVariants[0];
  const sizes = activeVariant?.sizes && activeVariant.sizes.length > 0 ? activeVariant.sizes : (product?.sizes && product.sizes.length > 0 ? product.sizes : ['P', 'M', 'G', 'GG']);
  const priceCents = typeof activeVariant?.price_cents === 'number' ? activeVariant.price_cents : product?.price_cents;
  const activeColor = activeVariant?.color_name || product?.color_name || 'Única';
  const activeHex = activeVariant?.hex_color || product?.hex_color || '#181b24';

  // Cálculo do tamanho recomendado baseado na altura e peso informados
  const recommendedSize = React.useMemo(() => {
    const h = Number(calcHeight);
    const w = Number(calcWeight);
    if (!h || !w || h < 140 || h > 220 || w < 40 || w > 160) return null;

    // 1. Prioriza regras customizadas cadastradas pelo admin para este produto
    if (product?.size_recommendations && product.size_recommendations.length > 0) {
      for (const rec of product.size_recommendations) {
        if (!sizes.includes(rec.size)) continue;
        const minH = rec.min_height_cm ?? 0;
        const maxH = rec.max_height_cm ?? 300;
        const minW = rec.min_weight_kg ?? 0;
        const maxW = rec.max_weight_kg ?? 300;
        if (h >= minH && h <= maxH && w >= minW && w <= maxW) {
          return { size: rec.size, note: rec.description || null, custom: true };
        }
      }
      // Se não encontrou no intervalo estrito, busca o mais próximo euclidiano normalizado
      let bestSize: string | null = null;
      let minDistance = Number.POSITIVE_INFINITY;
      let bestNote: string | null = null;

      for (const rec of product.size_recommendations) {
        if (!sizes.includes(rec.size)) continue;
        const midH = ((rec.min_height_cm ?? 170) + (rec.max_height_cm ?? 170)) / 2;
        const midW = ((rec.min_weight_kg ?? 75) + (rec.max_weight_kg ?? 75)) / 2;
        // Distância ponderada (altura e peso com pesos similares em escala de desvio)
        const dist = Math.pow((h - midH) / 10, 2) + Math.pow((w - midW) / 5, 2);
        if (dist < minDistance) {
          minDistance = dist;
          bestSize = rec.size;
          bestNote = rec.description || null;
        }
      }
      if (bestSize) return { size: bestSize, note: bestNote, custom: true };
    }

    // 2. Tabela de referência clássica de alfaiataria / moda masculina
    // Alfaiataria numérica (38-56)
    const isNumericSizes = sizes.some((s) => /^\d{2}$/.test(s.trim()));
    if (isNumericSizes) {
      let num = 40;
      if (w < 62) num = 38;
      else if (w < 70) num = 40;
      else if (w < 78) num = 42;
      else if (w < 86) num = 44;
      else if (w < 94) num = 46;
      else if (w < 102) num = 48;
      else if (w < 110) num = 50;
      else if (w < 118) num = 52;
      else num = 54;
      const str = String(num);
      const match = sizes.find((s) => s.trim() === str) || sizes[0];
      return { size: match, note: 'Baseado na proporção de tórax e cintura clássica', custom: false };
    }

    // Letras (PP, P, M, G, GG, XGG)
    let letter = 'M';
    if (w < 63 || (h < 168 && w < 68)) letter = 'P';
    else if (w < 78) letter = 'M';
    else if (w < 92) letter = 'G';
    else letter = 'GG';

    // Ajusta para altura alta com peso intermediário
    if (h >= 185 && letter === 'M') letter = 'G';
    if (h >= 190 && letter === 'G') letter = 'GG';

    const match = sizes.find((s) => s.toUpperCase() === letter) || sizes[0];
    return { size: match, note: 'Recomendação baseada em caimento anatômico padrão', custom: false };
  }, [calcHeight, calcWeight, product?.size_recommendations, sizes]);

  // Atualiza a URL dinamicamente (/categoria/slug-cor-tamanho) sem recarregar a página ao trocar variação
  useEffect(() => {
    if (!product || !isInitialized.current || typeof window === 'undefined') return;

    const newPath = buildProductPath(product, {
      colorName: activeColor,
      size: selectedSize,
    });

    if (window.location.pathname !== newPath) {
      window.history.replaceState(null, '', newPath);
    }

    document.title = `${product.name} (${activeColor}, ${selectedSize}) | Titi's Store`;
  }, [product, activeColor, selectedSize]);

  // Compartilhamento da URL exata com variação e tamanho
  const handleShare = async () => {
    if (typeof window === 'undefined' || !product) return;
    const currentUrl = window.location.href;
    const shareText = `Olha essa peça na Titi's Store: ${product.name} (${activeColor}, Tam ${selectedSize})`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} | Titi's Store`,
          text: `${shareText}\n\nConfira os detalhes:`,
          url: currentUrl,
        });
        return;
      } catch {
        // Fallback para cópia
      }
    }

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // ignore
    }
  };

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

  const gallery = [activeVariant?.image_url || product.image_url, ...(activeVariant?.gallery?.length ? activeVariant.gallery : product.gallery || [])].filter(Boolean) as string[];
  const finalGallery = gallery.length > 0 ? gallery : ['/produtos/calca-alfaiataria-regulador-cinza-grafite.jpg'];

  const currentImg = activeImage || finalGallery[0];
  const price = priceCents ? formatBRL(priceCents) : 'Sob consulta';

  const handleAddToCart = () => {
    add({
      productId: product.id,
      variantId: activeVariant?.id || null,
      sku: activeVariant?.sku || null,
      name: product.name,
      detail: product.category,
      color: activeColor,
      hex: activeHex,
      image: activeVariant?.image_url || product.image_url,
      size: selectedSize,
      priceCents: priceCents ?? 0,
      quantity,
    });
    openOverlay({ type: 'bag' });
  };

  const handleBuyNow = () => {
    add({
      productId: product.id,
      variantId: activeVariant?.id || null,
      sku: activeVariant?.sku || null,
      name: product.name,
      detail: product.category,
      color: activeColor,
      hex: activeHex,
      image: activeVariant?.image_url || product.image_url,
      size: selectedSize,
      priceCents: priceCents ?? 0,
      quantity,
    });
    router.push('/checkout');
  };

  return (
    <main id="conteudo" className="min-h-screen bg-obsidian text-ivory pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div className="container-luxe">
          
          {/* Navegação de retorno & Breadcrumbs */}
          <nav aria-label="Breadcrumbs" className="mb-8 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mist">
            <Link
              href="/colecao"
              className="inline-flex items-center gap-1.5 text-mist hover:text-gold transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Coleção</span>
            </Link>
            <span className="text-line">/</span>
            <Link
              href={`/colecao?categoria=${encodeURIComponent(product.category)}`}
              className="text-mist hover:text-gold transition-colors"
            >
              {product.category}
            </Link>
            <span className="text-line">/</span>
            <span className="text-ivory font-bold truncate max-w-[200px] sm:max-w-none">
              {product.name}
            </span>
          </nav>

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
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gold">
                    {product.category}
                  </p>

                  {/* Botões de Compartilhar & WhatsApp */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface/80 text-mist hover:text-gold hover:border-gold/50 text-[11px] font-semibold transition-all shadow-sm active:scale-95"
                      title="Compartilhar link desta variação"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Link copiado!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-3.5 w-3.5 text-gold" />
                          <span>Compartilhar</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Olha essa peça na Titi's Store: ${product.name} (${activeColor}, Tam ${selectedSize})\n\nConfira os detalhes:\n${typeof window !== 'undefined' ? window.location.href : ''}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold transition-all shadow-sm active:scale-95"
                      title="Compartilhar no WhatsApp"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

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

              {/* Seletor de Cores / Variações */}
              {allVariants.length > 1 && (
                <div className="border-t border-line pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-parchment">
                      Cor: <span className="text-gold font-bold ml-1">{activeColor}</span>
                    </label>
                    <span className="text-[11px] text-mist">{allVariants.length} opções de cores</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {allVariants.map((v) => {
                      const isSelected = (activeVariant?.id ?? 'base') === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariantId(v.id);
                            setActiveImage(null);
                            if (v.sizes && v.sizes.length > 0 && !v.sizes.includes(selectedSize)) {
                              setSelectedSize(v.sizes[0]);
                            }
                          }}
                          className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
                            isSelected
                              ? 'border-gold bg-gold/15 text-gold-light ring-1 ring-gold shadow-md shadow-gold/20'
                              : 'border-line bg-surface text-ivory hover:border-gold/50'
                          }`}
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-white/20 shadow-inner shrink-0"
                            style={{ backgroundColor: v.hex_color }}
                          />
                          <span>{v.color_name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seletor de Tamanhos & Provador Virtual por Altura e Peso */}
              <div className="border-t border-line pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-parchment">
                      Tamanho:
                    </label>
                    {product.mold && (
                      <span className="rounded-full bg-gold/10 border border-line-gold px-2.5 py-0.5 text-[10px] font-semibold text-gold-light">
                        Molde {product.mold}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="text-[11px] text-gold hover:text-gold-light transition-colors flex items-center gap-1 font-medium"
                  >
                    <Ruler className="h-3 w-3" />
                    <span>Tabela e Guia de Medidas</span>
                  </button>
                </div>

                {/* Grade de Tamanhos */}
                <div className="flex flex-wrap gap-2.5">
                  {sizes.map((s) => {
                    const isSelected = selectedSize === s;
                    const isRec = recommendedSize?.size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`relative h-11 min-w-11 px-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-gold text-obsidian shadow-lg shadow-gold/20 ring-1 ring-gold'
                            : 'bg-surface border border-line text-ivory hover:border-gold/50'
                        } ${isRec && !isSelected ? 'border-gold/60 text-gold-light' : ''}`}
                      >
                        <span>{s}</span>
                        {isRec && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${
                              isSelected ? 'bg-obsidian text-gold' : 'bg-gold/20 text-gold'
                            }`}
                          >
                            Ideal
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Provador Virtual / Calculadora de Altura e Peso */}
                <div className="rounded-2xl border border-line/80 bg-surface/40 p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gold" />
                      <span className="text-xs font-bold text-ivory uppercase tracking-wider">
                        Qual é o seu tamanho ideal?
                      </span>
                    </div>
                    {recommendedSize && (
                      <span className="text-[11px] font-bold text-gold-light bg-gold/15 border border-line-gold px-2.5 py-0.5 rounded-full">
                        Recomendado: Tam {recommendedSize.size}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-smoke leading-snug">
                    Informe sua altura e peso para recomendação personalizada de acordo com o molde desta peça:
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-mist block mb-1">
                        Sua Altura (cm)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={calcHeight}
                        onChange={(e) => setCalcHeight(e.target.value)}
                        placeholder="Ex: 178"
                        className="field py-1.5 text-xs text-center tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-semibold text-mist block mb-1">
                        Seu Peso (kg)
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={calcWeight}
                        onChange={(e) => setCalcWeight(e.target.value)}
                        placeholder="Ex: 75"
                        className="field py-1.5 text-xs text-center tabular-nums"
                      />
                    </div>
                  </div>

                  {recommendedSize ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-line/60">
                      <div className="text-[11px] text-mist flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>
                          Para seu biotipo, o <strong className="text-ivory font-bold">tamanho {recommendedSize.size}</strong> é o mais recomendado.
                        </span>
                      </div>
                      {selectedSize !== recommendedSize.size && (
                        <button
                          type="button"
                          onClick={() => setSelectedSize(recommendedSize.size)}
                          className="text-[11px] text-gold font-bold underline hover:text-gold-light transition-colors self-start sm:self-auto shrink-0"
                        >
                          Selecionar {recommendedSize.size} agora
                        </button>
                      )}
                    </div>
                  ) : (
                    calcHeight && calcWeight && (
                      <p className="text-[10px] text-mist italic">
                        Preencha valores válidos (ex: 175 cm e 74 kg).
                      </p>
                    )
                  )}
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

        {/* Modal de Guia de Medidas & Tabela de Caimento do Molde */}
        {isSizeGuideOpen && (
          <Modal
            title="Tabela de Medidas & Recomendações"
            showTitle
            onClose={() => setIsSizeGuideOpen(false)}
            size="lg"
          >
            <div className="space-y-6 p-6 sm:p-8 text-ivory">
              <div className="border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <Ruler className="h-5 w-5 text-gold" />
                  <h3 className="text-base font-bold uppercase tracking-wider text-ivory">
                    {product.name}
                  </h3>
                </div>
                {product.mold && (
                  <p className="mt-1 text-xs text-gold">
                    Molde / Modelagem da Peça: <strong>{product.mold}</strong>
                  </p>
                )}
                <p className="mt-1 text-xs text-mist">
                  Confira as faixas de altura e peso recomendadas para cada tamanho da peça.
                </p>
              </div>

              {/* Tabela de Recomendações */}
              <div className="overflow-x-auto rounded-xl border border-line bg-surface/60">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-surface text-mist uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 font-bold text-parchment">Tamanho</th>
                      <th className="px-4 py-3 font-bold text-parchment">Faixa de Altura</th>
                      <th className="px-4 py-3 font-bold text-parchment">Faixa de Peso</th>
                      <th className="px-4 py-3 font-bold text-parchment">Caimento / Dica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {sizes.map((s) => {
                      const rec = product.size_recommendations?.find((r) => r.size === s);
                      const isRec = recommendedSize?.size === s;
                      return (
                        <tr
                          key={s}
                          className={`transition-colors ${
                            isRec ? 'bg-gold/10 font-medium' : 'hover:bg-surface-2/40'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 font-bold text-gold">
                              {s}
                              {isRec && (
                                <span className="rounded bg-gold px-1.5 py-0.5 text-[9px] uppercase font-black text-obsidian">
                                  Seu Perfil
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-mist tabular-nums">
                            {rec?.min_height_cm && rec?.max_height_cm
                              ? `${rec.min_height_cm} cm a ${rec.max_height_cm} cm`
                              : rec?.min_height_cm
                              ? `A partir de ${rec.min_height_cm} cm`
                              : rec?.max_height_cm
                              ? `Até ${rec.max_height_cm} cm`
                              : 'Conforme tabela padrão'}
                          </td>
                          <td className="px-4 py-3 text-mist tabular-nums">
                            {rec?.min_weight_kg && rec?.max_weight_kg
                              ? `${rec.min_weight_kg} kg a ${rec.max_weight_kg} kg`
                              : rec?.min_weight_kg
                              ? `A partir de ${rec.min_weight_kg} kg`
                              : rec?.max_weight_kg
                              ? `Até ${rec.max_weight_kg} kg`
                              : 'Conforme tabela padrão'}
                          </td>
                          <td className="px-4 py-3 text-smoke">
                            {rec?.description || 'Caimento alinhado ao molde da peça'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-line-gold/30 bg-gold/5 p-4 text-xs text-mist space-y-1.5">
                <p className="font-bold text-gold-light flex items-center gap-1.5">
                  <Info className="h-4 w-4 shrink-0 text-gold" />
                  Dúvidas sobre o tamanho?
                </p>
                <p>
                  Nossa equipe de consultoria de imagem está pronta para orientar seu tamanho ideal ou ajustes sob medida via WhatsApp.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="gold" size="sm" onClick={() => setIsSizeGuideOpen(false)}>
                  Entendi, fechar
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </main>
  );
}
