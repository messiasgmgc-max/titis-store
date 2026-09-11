import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { LoginRedirectForm } from '@/components/auth/AuthForm';
import { WhatsAppIcon } from '@/components/ui/icons';
import { whatsappLink } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Entrar',
  description: "Acesse sua conta na Titi's Store: cartela de cores, looks do Atelier e histórico de pedidos.",
  robots: { index: false, follow: true },
};

/** Estrutura do formulário enquanto os parâmetros da URL são lidos no navegador. */
function FormFallback() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="grid grid-cols-2 border-b border-line pb-3.5">
        <span className="mx-auto h-2.5 w-14 bg-line" />
        <span className="mx-auto h-2.5 w-20 bg-line" />
      </div>
      <div className="mt-7 space-y-5">
        <div>
          <span className="block h-2 w-12 bg-line" />
          <span className="mt-3 block h-12 w-full border border-line" />
        </div>
        <div>
          <span className="block h-2 w-10 bg-line" />
          <span className="mt-3 block h-12 w-full border border-line" />
        </div>
        <span className="block h-12 w-full bg-gold/20" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <Header />
      <main id="conteudo" className="relative overflow-hidden">
        <div aria-hidden className="glow-gold pointer-events-none absolute -right-40 top-24 h-[560px] w-[560px]" />

        <div className="container-luxe relative grid gap-12 pb-20 pt-28 sm:pt-32 lg:grid-cols-12 lg:gap-16 lg:pb-28 lg:pt-36">
          {/* Coluna editorial */}
          <section aria-label="Titi's Store" className="order-2 lg:order-1 lg:col-span-6">
            <figure className="frame relative aspect-[4/5] w-full overflow-hidden bg-coal sm:aspect-[16/11] lg:aspect-auto lg:h-full lg:min-h-[640px]">
              <Image
                src="/skin_clara.jpg"
                alt="Cliente de terno azul-marinho em fundo escuro"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="img-editorial object-cover object-[center_22%]"
              />
              <div aria-hidden className="absolute inset-0 bg-linear-to-t from-obsidian via-obsidian/35 to-obsidian/10" />
              <span
                aria-hidden
                className="vertical-text absolute right-7 top-8 z-[3] font-caps text-[0.6rem] tracking-[0.5em] text-gold/70"
              >
                Atelier · Est. 2023
              </span>
              <figcaption className="absolute inset-x-0 bottom-0 z-[3] p-8 sm:p-10">
                <div className="flex items-center gap-4">
                  <span className="numeral text-xs">I</span>
                  <span className="stitch w-10" aria-hidden />
                  <span className="eyebrow">Consultoria de imagem</span>
                </div>
                <p className="mt-5 max-w-md font-display text-[clamp(2rem,3.6vw,3.1rem)] leading-[1.04] text-ivory">
                  A elegância começa pela <em className="italic text-foil">precisão</em>.
                </p>
                <div className="tape mt-8 opacity-50" aria-hidden />
              </figcaption>
            </figure>
          </section>

          {/* Coluna do formulário */}
          <section aria-labelledby="login-title" className="order-1 flex flex-col justify-center lg:order-2 lg:col-span-6">
            <div className="mx-auto w-full max-w-md">
              <div className="flex items-center gap-4">
                <span className="stitch w-10" aria-hidden />
                <span className="eyebrow">Área do cliente</span>
              </div>
              <h1 id="login-title" className="mt-6 font-display text-[clamp(2.5rem,5vw,3.9rem)] leading-[1.02] text-ivory">
                Entre no <em className="italic text-foil">Atelier</em>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-mist">
                Acesse sua cartela de cores, os looks salvos e o histórico dos seus pedidos.
              </p>

              <div className="panel relative mt-10 p-6 sm:p-8">
                <Suspense fallback={<FormFallback />}>
                  <LoginRedirectForm />
                </Suspense>
              </div>

              <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-mist">
                Prefere atendimento direto?
                <a
                  href={whatsappLink("Olá, Titi! Preciso de ajuda com a minha conta no site da Titi's Store.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-luxe text-gold-light"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  Falar com o Titi
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
