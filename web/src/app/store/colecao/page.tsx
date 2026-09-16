import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Collection } from '@/components/collection/Collection';
import { Eyebrow } from '@/components/home/Heading';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Loja',
  description: `Peças masculinas da ${SITE.name} com curadoria do Titi. Veja a coleção e faça seu pedido pelo WhatsApp.`,
};

export default function CollectionPage() {
  return (
    <>
      <Header />
      <main id="conteudo" className="pt-[72px] lg:pt-[88px]">
        <div className="container-luxe flex flex-col gap-8 pb-12 pt-10 sm:pt-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow>Loja Titi&apos;s Store</Eyebrow>
            <h1 className="mt-4 text-[clamp(2.4rem,5.4vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-ivory">
              Peças escolhidas <span className="text-foil">pelo Titi.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-mist md:text-lg">
              Veja a coleção e faça seu pedido pelo WhatsApp, com atendimento direto.
            </p>
          </div>

          <div className="panel flex max-w-md flex-col gap-3 rounded-3xl p-6">
            <p className="text-[15px] leading-relaxed text-parchment">
              Não sabe o que combina com você? A consultoria mostra suas cores e monta os looks com peças da loja.
            </p>
            <Link
              href="/#planos"
              className="group inline-flex items-center gap-2 text-[15px] font-semibold text-gold-light transition-colors duration-300 hover:text-ivory"
            >
              Conhecer os planos
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                strokeWidth={2}
                aria-hidden
              />
            </Link>
          </div>
        </div>

        <Collection />
      </main>
      <Footer />
    </>
  );
}
