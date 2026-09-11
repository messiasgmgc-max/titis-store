'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { PRODUCT_CATEGORIES, type Diagnosis, type Product } from '@/lib/types';
import { useCatalog } from '@/lib/catalog';
import { cn, whatsappLink } from '@/lib/format';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ColorDot, Swatch } from '@/components/ui/Swatch';
import { WhatsAppIcon } from '@/components/ui/icons';
import { ProductCard, paletteFit, toneMatches } from './ProductCard';

const ALL = '__all__';
const EASE = [0.22, 1, 0.36, 1] as const;
const GRID =
  'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-14';
const CATEGORY_ORDER: readonly string[] = PRODUCT_CATEGORIES;
const CURATION_TEXT = 'Olá, Titi! Gostaria de uma curadoria de peças da coleção para mim.';

const listVariants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Categorias presentes no catálogo, na ordem oficial da loja. */
function orderCategories(products: Product[]): string[] {
  const present = Array.from(new Set(products.map((p) => p.category.trim()).filter(Boolean)));
  return present.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a);
    const ib = CATEGORY_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'pt-BR');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/**
 * Monta a vitrine. Com a cartela ativa, filtra pelo tom de pele e ordena pela menor
 * distância cromática; sem ela, a primeira peça em destaque abre a grade como capa.
 */
function arrange(
  products: Product[],
  category: string,
  diagnosis: Diagnosis | null,
): { list: Product[]; leadId: string | null } {
  const inCategory = category === ALL ? products : products.filter((p) => p.category.trim() === category);

  if (diagnosis) {
    const ranked = inCategory
      .filter((p) => toneMatches(p, diagnosis))
      .map((p, order) => {
        const fit = paletteFit(p, diagnosis);
        const score = fit ? fit.distance + (fit.nearAvoid ? 1000 : 0) : Number.POSITIVE_INFINITY;
        return { p, score, order };
      })
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .map((r) => r.p);
    return { list: ranked, leadId: null };
  }

  const featured = inCategory.find((p) => p.is_featured);
  if (!featured || inCategory.length < 3) return { list: inCategory, leadId: null };
  return { list: [featured, ...inCategory.filter((p) => p.id !== featured.id)], leadId: featured.id };
}

export function Collection() {
  const { products, loading } = useCatalog();
  const { diagnosis } = useDiagnosis();
  const { openOverlay } = useUI();
  const [category, setCategory] = useState<string>(ALL);
  const [paletteMode, setPaletteMode] = useState(false);

  const categories = useMemo(() => orderCategories(products), [products]);
  const activeCategory = categories.includes(category) ? category : ALL;
  const paletteOn = paletteMode && diagnosis !== null;
  const { list, leadId } = useMemo(
    () => arrange(products, activeCategory, paletteOn ? diagnosis : null),
    [products, activeCategory, paletteOn, diagnosis],
  );

  const showSkeleton = loading && products.length === 0;
  const count = list.length;
  const palettePreview = (diagnosis?.palette ?? []).slice(0, 5);
  const gridKey = `${activeCategory}|${paletteOn ? 'cartela' : 'livre'}`;

  const resetFilters = () => {
    setCategory(ALL);
    setPaletteMode(false);
  };

  return (
    <section id="colecao" className="relative isolate overflow-hidden border-t border-line py-24 sm:py-32">
      <div aria-hidden className="glow-gold pointer-events-none absolute -right-48 top-0 -z-10 h-[560px] w-[560px]" />
      <p
        aria-hidden
        className="vertical-text pointer-events-none absolute left-8 top-36 hidden font-caps text-[0.62rem] tracking-[0.5em] text-smoke 2xl:block"
      >
        Coleção · Titi&apos;s Store
      </p>

      <div className="container-luxe">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16">
          <Reveal>
            <SectionHeading
              numeral="III"
              eyebrow="A Coleção"
              title={
                <>
                  Peças escolhidas pela <em className="italic text-foil">medida</em>, não pela vitrine.
                </>
              }
              lead="Alfaiataria, camisaria e acessórios selecionados um a um: tecido, caimento e cor pensados para conversar entre si e com a sua cartela."
            />
          </Reveal>

          <Reveal delay={0.12}>
            <aside className="panel relative w-full p-6 sm:max-w-sm sm:p-7 lg:w-[22rem]">
              <span aria-hidden className="stitch absolute inset-x-6 top-3" />
              {diagnosis ? (
                <>
                  <p className="eyebrow mt-3">Sua cartela</p>
                  <p className="mt-3 font-display text-3xl italic leading-none text-gold-light">{diagnosis.season}</p>
                  {palettePreview.length > 0 && (
                    <div className="mt-5 flex gap-1.5" aria-hidden>
                      {palettePreview.map((s, i) => (
                        <Swatch key={`${s.hex}-${i}`} name={s.name} hex={s.hex} size="sm" showLabel={false} />
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => setPaletteMode((v) => !v)} className="link-luxe mt-6">
                    {paletteOn ? 'Ver toda a coleção' : 'Ver peças na minha cartela'}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </>
              ) : (
                <>
                  <p className="eyebrow mt-3">Sob a sua luz</p>
                  <p className="mt-4 text-sm leading-relaxed text-mist">
                    Faça a leitura de colorimetria e a coleção passa a indicar as peças que valorizam o seu tom de pele.
                  </p>
                  <button type="button" onClick={() => openOverlay({ type: 'scanner' })} className="link-luxe mt-6">
                    Descobrir minha cartela
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </>
              )}
            </aside>
          </Reveal>
        </div>

        <div className="mt-14 border-y border-line sm:mt-16">
          <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between md:gap-8">
            <div
              role="group"
              aria-label="Filtrar por categoria"
              className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0"
            >
              <button
                type="button"
                className="chip shrink-0"
                data-active={activeCategory === ALL}
                aria-pressed={activeCategory === ALL}
                onClick={() => setCategory(ALL)}
              >
                Tudo
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip shrink-0"
                  data-active={activeCategory === c}
                  aria-pressed={activeCategory === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-5 md:justify-end">
              {diagnosis && (
                <button
                  type="button"
                  className="chip shrink-0"
                  data-active={paletteOn}
                  aria-pressed={paletteOn}
                  onClick={() => setPaletteMode((v) => !v)}
                >
                  {palettePreview.length > 0 && (
                    <span className="flex -space-x-1" aria-hidden>
                      {palettePreview.slice(0, 3).map((s, i) => (
                        <ColorDot key={`${s.hex}-${i}`} hex={s.hex} size={9} />
                      ))}
                    </span>
                  )}
                  Na minha cartela
                </button>
              )}
              <p className="ml-auto shrink-0 font-caps text-[0.7rem] tracking-[0.3em] text-mist md:ml-0" aria-live="polite">
                {showSkeleton ? (
                  <span className="text-smoke">— peças</span>
                ) : (
                  <>
                    <span className="text-gold-light">{pad(count)}</span> {count === 1 ? 'peça' : 'peças'}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {paletteOn && diagnosis && (
          <p className="mt-5 text-sm leading-relaxed text-mist">
            Peças indicadas para o seu tom, da mais próxima à mais distante da cartela{' '}
            <span className="font-display text-base italic text-gold-light">{diagnosis.season}</span>.
          </p>
        )}

        <div className="mt-10 sm:mt-12">
          {showSkeleton ? (
            <CollectionSkeleton />
          ) : count === 0 ? (
            <EmptyState
              kind={products.length === 0 ? 'catalog' : paletteOn ? 'palette' : 'category'}
              categoryName={activeCategory === ALL ? null : activeCategory}
              onReset={resetFilters}
            />
          ) : (
            <motion.ul
              key={gridKey}
              className={GRID}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '0px 0px -8% 0px' }}
              variants={listVariants}
            >
              {list.map((product, i) => {
                const lead = product.id === leadId;
                return (
                  <motion.li key={product.id} variants={itemVariants} className={cn(lead && 'col-span-2 md:row-span-2')}>
                    <ProductCard product={product} index={i} lead={lead} />
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </div>
      </div>
    </section>
  );
}

function CollectionSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Carregando a coleção…</span>
      <div className={GRID} aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={cn('flex flex-col', i === 0 && 'col-span-2 md:row-span-2')}>
            <div
              className={cn(
                'panel relative overflow-hidden',
                i === 0 ? 'aspect-[4/5] md:aspect-auto md:min-h-[26rem] md:flex-1' : 'aspect-[4/5]',
              )}
            >
              <motion.span
                className="absolute inset-y-0 left-0 w-1/2 bg-linear-to-r from-transparent via-ivory/[0.05] to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '300%' }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut', delay: i * 0.15 }}
              />
            </div>
            <div className="mt-5 h-4 w-3/4 bg-surface-2" />
            <div className="mt-3 h-3 w-1/2 bg-surface-2/60" />
            <div className="mt-6 h-px w-full bg-line" />
            <div className="mt-3 h-3 w-1/4 bg-surface-2/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  kind,
  categoryName,
  onReset,
}: {
  kind: 'catalog' | 'palette' | 'category';
  categoryName: string | null;
  onReset: () => void;
}) {
  const title =
    kind === 'catalog' ? (
      <>
        Novas peças em <em className="italic text-foil">prova</em>.
      </>
    ) : kind === 'palette' ? (
      <>
        Nada aqui veste a sua <em className="italic text-foil">cartela</em> — ainda.
      </>
    ) : (
      <>
        Nenhuma peça nesta <em className="italic text-foil">seleção</em>.
      </>
    );

  const text =
    kind === 'catalog'
      ? 'A coleção está sendo atualizada. Enquanto isso, o Titi monta uma seleção pensada para você pelo WhatsApp.'
      : kind === 'palette'
        ? `Nenhuma peça${categoryName ? ` de ${categoryName}` : ''} foi indicada para o seu tom no momento. Veja a coleção completa ou peça uma curadoria direta ao Titi.`
        : 'Veja a coleção completa ou peça uma curadoria direta ao Titi.';

  return (
    <div className="panel relative mx-auto flex max-w-2xl flex-col items-center overflow-hidden px-6 pb-14 pt-16 text-center sm:px-12">
      <div aria-hidden className="tape absolute inset-x-0 top-0 opacity-50" />
      <span aria-hidden className="pinked block h-16 w-12 bg-gold-dark/40" />
      <h3 className="mt-8 font-display text-3xl leading-tight text-ivory sm:text-4xl">{title}</h3>
      <p className="mt-4 max-w-md leading-relaxed text-mist">{text}</p>
      <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
        {kind !== 'catalog' && (
          <Button variant="outline" onClick={onReset}>
            Ver toda a coleção
          </Button>
        )}
        <Button variant="ghost" href={whatsappLink(CURATION_TEXT)} external>
          <WhatsAppIcon className="h-4 w-4 text-gold" />
          Pedir curadoria
        </Button>
      </div>
    </div>
  );
}
