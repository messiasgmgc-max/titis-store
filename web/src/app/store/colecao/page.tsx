import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Collection } from '@/components/collection/Collection';
import { Eyebrow } from '@/components/home/Heading';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Coleção de Alta Alfaiataria',
  description: `Peças masculinas da ${SITE.name} com curadoria do Titi. Camisas, blazers, calças e calçados com checkout transparente.`,
};

export default function CollectionPage() {
  const consultorUrl = process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br';

  return (
    <main id="conteudo" className="pt-24 sm:pt-28 pb-16">
      <div className="container-luxe flex flex-col gap-8 pb-12 pt-6 sm:pt-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Eyebrow>Coleção Oficial</Eyebrow>
          <h1 className="mt-4 text-[clamp(2.4rem,5.4vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-ivory">
            Alfaiataria Masculina <span className="text-foil">Contemporânea.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-mist md:text-lg">
            Peças com modelagem sob medida, tecidos nobres e acabamentos artesanais para todas as ocasiões.
          </p>
        </div>

        <div className="panel flex max-w-md flex-col gap-3 rounded-3xl p-6 border border-line-gold/30">
          <p className="text-xs leading-relaxed text-parchment flex items-center gap-1.5 font-semibold text-gold">
            <Sparkles className="h-4 w-4" />
            <span>Consultoria de Estilo Online</span>
          </p>
          <p className="text-xs text-mist leading-relaxed">
            Dúvidas sobre quais peças e cores favorecem seu tom de pele? Conheça nosso consultor de imagem.
          </p>
          <a
            href={consultorUrl}
            className="group inline-flex items-center gap-2 text-xs font-bold text-gold hover:text-ivory transition-colors"
          >
            <span>Acessar Consultor IA</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      <Collection />
    </main>
  );
}
