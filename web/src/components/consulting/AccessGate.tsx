'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AuthForm } from '@/components/auth/AuthForm';
import { BenefitList } from './Benefits';
import { APP_TITLE, EYEBROW, plansHref } from './shared';
import { CLUB_PLANS, CONSULTING_PATH } from '@/lib/site';

/** Plano de entrada (menor preço com acesso digital). */
const entry = CLUB_PLANS.filter((p) => p.priceCents !== null && p.accessDays !== null).sort(
  (a, b) => (a.priceCents ?? 0) - (b.priceCents ?? 0),
)[0];

/** Visitante sem login: entrar (ou criar conta) ao lado do que a consultoria libera. */
export function AccessGate() {
  return (
    <div className="container-luxe relative py-12 sm:py-16 lg:py-20">
      <div aria-hidden className="glow-gold pointer-events-none absolute -right-32 top-10 h-[420px] w-[420px]" />

      <div className="relative grid gap-10 lg:grid-cols-12 lg:gap-14">
        <section aria-labelledby="gate-title" className="lg:col-span-6 xl:col-span-5">
          <p className={EYEBROW}>Minha consultoria</p>
          <h1 id="gate-title" className={`${APP_TITLE} mt-4 text-[clamp(2rem,4.2vw,3rem)] leading-[1.05]`}>
            Entre para acessar sua <span className="text-foil">consultoria</span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-mist">
            Sua cartela, seus looks e o provador ficam guardados na sua conta.
          </p>

          <div className="panel mt-8 rounded-3xl p-6 sm:p-8">
            {/* Quem entra por aqui continua na consultoria (com acesso, abre o app; sem, vê os planos). */}
            <AuthForm initialMode="login" next={CONSULTING_PATH} />
          </div>
        </section>

        <aside aria-labelledby="gate-benefits" className="lg:col-span-6 lg:col-start-7 xl:col-span-6 xl:col-start-7">
          <p id="gate-benefits" className={EYEBROW}>
            O que o plano libera
          </p>
          <BenefitList className="mt-4" />
          <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            {entry && (
              <p className="text-sm text-mist">
                A partir de {entry.priceLabel} por {entry.accessDays} dias de acesso.
              </p>
            )}
            <Link
              href={plansHref('clube')}
              className="inline-flex items-center gap-2 text-sm font-bold text-gold-light transition-colors hover:text-ivory"
            >
              Ainda não tem plano? Ver planos
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
