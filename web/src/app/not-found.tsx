import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Button } from '@/components/ui/Button';
import { RotatingSeal } from '@/components/ui/Logo';

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="conteudo" className="relative overflow-hidden">
        <section className="container-luxe relative flex min-h-[90dvh] flex-col items-center justify-center pb-20 pt-32 text-center">
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-display text-[clamp(11rem,36vw,25rem)] font-extrabold leading-none tracking-[-0.05em] text-ivory/[0.03]"
            aria-hidden
          >
            404
          </span>

          <span className="relative grid place-items-center">
            <span className="glow-gold absolute h-72 w-72" aria-hidden />
            <RotatingSeal size={168} id="nao-encontrada" text="FORA DO ACERVO · TITI'S STORE · " />
          </span>

          <div className="relative mt-12 flex items-center gap-4">
            <span className="numeral text-sm">CDIV</span>
            <span className="stitch w-10" aria-hidden />
            <span className="eyebrow">Página não encontrada</span>
          </div>

          <h1 className="relative mt-6 max-w-3xl font-display text-[clamp(2.1rem,5.4vw,4rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ivory">
            Esta peça não está no <span className="text-foil">acervo</span>.
          </h1>
          <p className="relative mt-6 max-w-lg text-base leading-relaxed text-mist md:text-lg">
            O endereço pode ter mudado ou a página saiu da vitrine. Volte ao início ou siga direto para a loja.
          </p>

          <div className="relative mt-10 flex flex-wrap justify-center gap-3">
            <Button href="/">Voltar ao início</Button>
            <Button href="/colecao" variant="outline">
              Ver a loja
            </Button>
          </div>

          <div className="tape relative mt-16 w-full max-w-md opacity-40" aria-hidden />
        </section>
      </main>
      <Footer />
    </>
  );
}
