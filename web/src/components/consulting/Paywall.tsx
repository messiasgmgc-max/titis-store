'use client';

import { LockKeyhole } from 'lucide-react';
import { getPlan } from '@/lib/site';
import { getSeason } from '@/lib/stylist/knowledge';
import { useSession } from '@/providers/SessionProvider';
import { Swatch } from '@/components/ui/Swatch';
import { BenefitList } from './Benefits';
import { PlanPicker } from './PlanPicker';
import { PurchaseFeedback } from './PurchaseFeedback';
import { RefreshAccessButton } from './RefreshAccess';
import { usePlanPurchase } from './usePlanPurchase';
import { APP_TITLE, EYEBROW } from './shared';

/** Moldura bloqueada: conteúdo de exemplo desfocado com cadeado. */
function LockedFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="relative min-h-[15rem] overflow-hidden border border-line bg-surface">
      <div aria-hidden className="pointer-events-none select-none p-5 pt-12 opacity-60 blur-[5px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-obsidian/35 px-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-line-gold bg-obsidian/80 text-gold">
          <LockKeyhole className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </span>
        <span className="text-sm font-bold text-ivory">Liberado com o plano</span>
      </div>
      <figcaption className="absolute left-3 top-3 rounded-full border border-line-gold bg-obsidian/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
        {label}
      </figcaption>
    </figure>
  );
}

function LockedPreview() {
  const season = getSeason('morena', 'quente');
  const lookColors = [...season.neutrals.slice(0, 2), ...season.palette.slice(0, 2)];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <LockedFrame label="Exemplo · Cartela">
        <p className={EYEBROW}>Sua estação</p>
        <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-ivory">{season.name}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {season.palette.slice(0, 5).map((s) => (
            <Swatch key={s.hex + s.name} name={s.name} hex={s.hex} size="sm" showLabel={false} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {season.neutrals.slice(0, 4).map((s) => (
            <Swatch key={s.hex + s.name} name={s.name} hex={s.hex} size="sm" showLabel={false} />
          ))}
        </div>
      </LockedFrame>

      <LockedFrame label="Exemplo · Look">
        <div className="grid aspect-[4/3] grid-cols-2 gap-px bg-line">
          {lookColors.map((s) => (
            <span key={s.hex + s.name} className="block" style={{ backgroundColor: s.hex }} />
          ))}
        </div>
        <p className="mt-4 text-lg font-extrabold tracking-[-0.02em] text-ivory">Jantar à noite</p>
        <span className="mt-2 block h-2 w-3/4 rounded-full bg-ivory/15" />
        <span className="mt-2 block h-2 w-1/2 rounded-full bg-ivory/10" />
      </LockedFrame>
    </div>
  );
}

/** Logado sem plano: o que é liberado, prévia bloqueada, planos e confirmação de pagamento. */
export function Paywall() {
  const { profile } = useSession();
  const { state, purchase } = usePlanPurchase();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const activePlan = state.status !== 'idle' ? getPlan(state.planId) : undefined;

  return (
    <div className="container-luxe relative py-12 sm:py-16 lg:py-20">
      <div aria-hidden className="glow-gold pointer-events-none absolute -left-40 top-0 h-[460px] w-[460px]" />

      <header className="relative max-w-2xl">
        <p className={EYEBROW}>Minha consultoria</p>
        <h1 className={`${APP_TITLE} mt-4 text-[clamp(2rem,4.4vw,3.2rem)] leading-[1.04]`}>
          Sua consultoria está <span className="text-foil">a um passo</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-mist sm:text-lg">
          {firstName ? `${firstName}, sua conta está pronta.` : 'Sua conta está pronta.'} Ative um plano para liberar a
          leitura por foto, a sua cartela e os looks montados com peças da loja.
        </p>
      </header>

      <div className="relative mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <section aria-labelledby="paywall-benefits" className="lg:col-span-5">
          <h2 id="paywall-benefits" className={EYEBROW}>
            O que é liberado
          </h2>
          <BenefitList className="mt-4" compact />
        </section>
        <section aria-label="Prévia da consultoria" className="lg:col-span-7">
          <p className={EYEBROW}>Como fica na sua conta</p>
          <div className="mt-4">
            <LockedPreview />
          </div>
          <p className="mt-3 text-xs text-smoke">
            Imagens ilustrativas. Sua cartela e seus looks são montados a partir da sua leitura.
          </p>
        </section>
      </div>

      <section aria-labelledby="paywall-plans" className="relative mt-16">
        <h2 id="paywall-plans" className="text-2xl font-extrabold tracking-[-0.03em] text-ivory sm:text-3xl">
          Escolha seu plano
        </h2>
        <PlanPicker
          className="mt-6"
          onChoose={(plan) => void purchase(plan)}
          busyPlanId={state.status === 'loading' ? state.planId : null}
        />
        {activePlan && (
          <PurchaseFeedback
            className="mt-6"
            state={state}
            plan={activePlan}
            showConsultingLink={false}
            onRetry={() => void purchase(activePlan)}
          />
        )}
      </section>

      <section
        aria-labelledby="paywall-paid"
        className="relative mt-10 flex flex-col gap-5 border border-line-gold bg-gold/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
      >
        <div className="max-w-xl">
          <h2 id="paywall-paid" className="text-lg font-extrabold tracking-[-0.02em] text-ivory">
            Já pagou?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-mist">
            Assim que o Titi confirmar, seu acesso aparece aqui.
          </p>
        </div>
        <RefreshAccessButton className="sm:items-end sm:text-right" />
      </section>
    </div>
  );
}
