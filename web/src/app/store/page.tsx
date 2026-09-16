'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag, ShieldCheck, Sparkles, Truck, RefreshCw, Star } from 'lucide-react';
import { useCatalog } from '@/lib/catalog';
import { formatBRL } from '@/lib/format';
import { useCart } from '@/providers/CartProvider';
import { useUI } from '@/providers/UIProvider';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Button } from '@/components/ui/Button';
import { Tilt3D } from '@/components/ui/Tilt3D';

const CATEGORIES = [
  { name: 'Alfaiataria', slug: 'alfaiataria', image: '/skin_morena_model.jpg', desc: 'Blazers, costumes e paletós sob medida' },
  { name: 'Camisaria', slug: 'camisa', image: '/skin_clara_model.jpg', desc: 'Algodão egípcio e cortes impecáveis' },
  { name: 'Calças', slug: 'calca', image: '/skin_parda_model.jpg', desc: 'Alfaiataria clássica e sarja nobre' },
  { name: 'Calçados', slug: 'calcado', image: '/skin_negra_model.jpg', desc: 'Couro nobre e design italiano' },
];

export default function StoreHomePage() {
  const { products, loading } = useCatalog();
  const { add } = useCart();
  const { openOverlay } = useUI();

  const featuredProducts = products.filter((p) => p.is_featured || p.price_cents !== null).slice(0, 8);

  return (
    <>
      <Header />
      <main id="conteudo" className="min-h-screen bg-obsidian text-ivory">
        
        {/* HERO DA LOJA */}
        <section className="relative isolate overflow-hidden border-b border-line pt-28 pb-20 sm:pt-36 sm:pb-28">
          <div
            aria-hidden
            className="glow-gold pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-25"
          />
          <div className="container-luxe">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
              
              <div className="space-y-6 lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-line-gold bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-gold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Loja Oficial Titi&apos;s Store</span>
                </div>
                
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-ivory">
                  Alta Alfaiataria e <br />
                  <span className="text-foil">Presença Inconfundível.</span>
                </h1>

                <p className="max-w-xl text-base leading-relaxed text-mist sm:text-lg">
                  Peças selecionadas à mão pelo Titi com tecidos nobres, caimento sob medida e 
                  harmonia estética para o homem contemporâneo.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button href="/colecao" variant="gold" size="lg" className="shadow-lg shadow-gold/20">
                    <ShoppingBag className="h-4 w-4" />
                    <span>Ver Coleção Completa</span>
                  </Button>
                  <a
                    href={process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br'}
                    className="btn btn-outline btn-lg flex items-center gap-2"
                  >
                    <span>Descobrir Minha Cartela</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-line pt-8 text-xs text-mist">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gold" />
                    <span>Envio para todo o Brasil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-gold" />
                    <span>Checkout Transparente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-gold" />
                    <span>Troca Facilitada</span>
                  </div>
                </div>
              </div>

              {/* Destaque Visual */}
              <div className="lg:col-span-5">
                <Tilt3D max={12} lift={16} perspective={900} className="w-full">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-line-gold bg-surface shadow-2xl">
                    <Image
                      src="/skin_morena_model.jpg"
                      alt="Destaque Coleção Titi's Store"
                      fill
                      priority
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />
                    <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-line-gold/40 bg-surface/90 p-4 backdrop-blur-md">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gold">Coleção Signature</p>
                      <h3 className="mt-1 text-base font-bold text-ivory">Costume Lã Fria Super 120s Slim</h3>
                      <p className="mt-1 text-xs text-mist">Acabamento alfaiataria tradicional com botões em madrepérola.</p>
                    </div>
                  </div>
                </Tilt3D>
              </div>

            </div>
          </div>
        </section>

        {/* CATEGORIAS EM DESTAQUE */}
        <section className="border-b border-line py-16 sm:py-24">
          <div className="container-luxe">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end mb-10">
              <div>
                <p className="eyebrow">Navegue por Categoria</p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl text-ivory">
                  O Guarda-Roupa do <span className="text-foil">Homem de Sucesso</span>
                </h2>
              </div>
              <Link href="/colecao" className="link-luxe flex items-center gap-1.5 text-xs text-gold">
                <span>Ver todas as peças</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/colecao?categoria=${cat.name}`}
                  className="group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl border border-line p-5 transition-all duration-300 hover:border-gold/50"
                >
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
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

        {/* VITRINE DE PRODUTOS */}
        <section className="py-16 sm:py-24">
          <div className="container-luxe">
            <div className="mb-10 text-center">
              <p className="eyebrow">Curadoria Exclusiva</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-4xl text-ivory">
                Destaques da <span className="text-foil">Nossa Loja</span>
              </h2>
              <p className="mt-3 text-sm text-mist max-w-lg mx-auto">
                Modelagens precisas pensadas para transmitir autoridade e elegância em qualquer ambiente.
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
                          src={product.image_url || '/skin_morena_model.jpg'}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {product.is_featured && (
                          <span className="absolute top-2.5 left-2.5 rounded-full bg-foil px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-obsidian">
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
                        <p className="mt-1.5 text-base font-extrabold text-gold">{price}</p>
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

      </main>
      <Footer />
    </>
  );
}
