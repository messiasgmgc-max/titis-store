import type { Metadata } from 'next';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { ResetPasswordPanel } from '@/components/auth/AuthForm';
import { Medallion } from '@/components/ui/Logo';

export const metadata: Metadata = {
  title: 'Redefinir senha',
  description: "Crie uma nova senha para a sua conta na Titi's Store.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <main id="conteudo" className="relative overflow-hidden">
        <div aria-hidden className="glow-gold pointer-events-none absolute left-1/2 top-16 h-[520px] w-[640px] -translate-x-1/2" />

        <div className="container-luxe relative flex flex-col items-center pb-24 pt-32 sm:pt-36 lg:pb-32">
          <Medallion size={64} />
          <div className="mt-8 flex items-center gap-4">
            <span className="stitch w-10" aria-hidden />
            <span className="eyebrow">Segurança da conta</span>
            <span className="stitch w-10" aria-hidden />
          </div>
          <h1 className="mt-5 text-center font-display text-[clamp(2.1rem,4.2vw,3.1rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ivory">
            Redefinir <span className="text-foil">senha</span>
          </h1>
          <p className="mt-4 max-w-md text-center text-base leading-relaxed text-mist">
            Crie uma nova senha para voltar à sua conta.
          </p>

          <div className="panel relative mt-10 w-full max-w-md p-6 sm:p-8">
            <div className="tape absolute inset-x-0 top-0 opacity-25" aria-hidden />
            <div className="pt-3">
              <ResetPasswordPanel />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
