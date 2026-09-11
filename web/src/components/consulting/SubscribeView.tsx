'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PlanPicker } from './PlanPicker';
import { PlanSummary } from './PlanSummary';
import { PurchasePanel } from './PurchasePanel';
import { APP_TITLE, EYEBROW, parseReturnStatus, resolvePlan } from './shared';

/** /assinar?plano=<id> — lê a URL (envolver em <Suspense>). */
export function SubscribeView() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = resolvePlan(params.get('plano'));
  const returnStatus = parseReturnStatus(params.get('status'), params.get('collection_status'));
  const digital = plan.accessDays !== null;

  return (
    <div className="container-luxe relative py-10 sm:py-14 lg:py-16">
      <div aria-hidden className="glow-gold pointer-events-none absolute -right-40 top-0 h-[480px] w-[480px]" />

      <Link
        href="/#planos"
        className="relative inline-flex items-center gap-2 text-sm font-semibold text-mist transition-colors hover:text-gold-light"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        Ver todos os planos
      </Link>

      <header className="relative mt-6 max-w-2xl">
        <p className={EYEBROW}>{digital ? 'Assinatura' : 'Atendimento presencial'}</p>
        <h1 className={`${APP_TITLE} mt-4 text-[clamp(2rem,4.4vw,3.1rem)] leading-[1.04]`}>
          {digital ? (
            <>
              Ative sua <span className="text-foil">consultoria</span>
            </>
          ) : (
            <>
              Agende sua <span className="text-foil">sessão</span>
            </>
          )}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-mist">
          {digital
            ? 'Confira o plano, escolha como pagar e comece a usar sua leitura, sua cartela e seus looks.'
            : 'Uma sessão individual com o Titi para renovar o guarda-roupa, combinada direto pelo WhatsApp.'}
        </p>
      </header>

      <div className="relative mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-6 lg:col-span-7">
          <PlanSummary plan={plan} />
          <PlanPicker
            variant="compact"
            selectedId={plan.id}
            onSelect={(next) => router.replace(`/assinar?plano=${next.id}`, { scroll: false })}
          />
        </div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[112px]">
            <PurchasePanel key={plan.id} plan={plan} returnStatus={returnStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}
