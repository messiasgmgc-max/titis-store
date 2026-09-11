'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useSession } from '@/providers/SessionProvider';
import { PlanPicker } from './PlanPicker';
import { PlanSummary } from './PlanSummary';
import { PurchasePanel } from './PurchasePanel';
import { APP_TITLE, EYEBROW, parseReturnStatus, resolvePlan } from './shared';

/** /assinar?plano=<id>[&upgrade=1] — lê a URL (envolver em <Suspense>). */
export function SubscribeView() {
  const params = useSearchParams();
  const router = useRouter();
  const { isBlocked, profile } = useSession();
  const plan = resolvePlan(params.get('plano'));
  const returnStatus = parseReturnStatus(params.get('status'), params.get('collection_status'));
  const digital = plan.accessDays !== null;
  // Upgrade só faz sentido do Passe para o Clube; quem já está no Clube vê a renovação normal.
  const upgrade = params.get('upgrade') === '1' && plan.id === 'clube' && profile?.plan !== 'clube';

  const copy = isBlocked
    ? {
        eyebrow: 'Acesso pausado',
        title: (
          <>
            Antes de assinar, <span className="text-foil">fale com o Titi</span>
          </>
        ),
        lead: 'Seu acesso à consultoria está pausado. O Titi resolve isso com você antes de qualquer nova cobrança.',
      }
    : upgrade
      ? {
          eyebrow: 'Upgrade',
          title: (
            <>
              Upgrade para o <span className="text-foil">Clube</span>
            </>
          ),
          lead: 'Consultoria contínua, linha direta com o Titi e acervo completo. Sua cartela e seus looks continuam na conta.',
        }
      : digital
        ? {
            eyebrow: 'Assinatura',
            title: (
              <>
                Ative sua <span className="text-foil">consultoria</span>
              </>
            ),
            lead: 'Confira o plano, escolha como pagar e comece a usar sua leitura, sua cartela e seus looks.',
          }
        : {
            eyebrow: 'Atendimento presencial',
            title: (
              <>
                Agende sua <span className="text-foil">sessão</span>
              </>
            ),
            lead: 'Uma sessão individual com o Titi para renovar o guarda-roupa, combinada direto pelo WhatsApp.',
          };

  const switchTo = (id: string) => router.replace(`/assinar?plano=${id}${upgrade && id === 'clube' ? '&upgrade=1' : ''}`, { scroll: false });

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
        <p className={EYEBROW}>{copy.eyebrow}</p>
        <h1 className={`${APP_TITLE} mt-4 text-[clamp(2rem,4.4vw,3.1rem)] leading-[1.04]`}>{copy.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-mist">{copy.lead}</p>
      </header>

      <div className="relative mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="space-y-6 lg:col-span-7">
          <PlanSummary plan={plan} />
          {!isBlocked && <PlanPicker variant="compact" selectedId={plan.id} onSelect={(next) => switchTo(next.id)} />}
        </div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-[112px]">
            <PurchasePanel key={`${plan.id}-${upgrade ? 'up' : 'std'}`} plan={plan} returnStatus={returnStatus} upgrade={upgrade} />
          </div>
        </div>
      </div>
    </div>
  );
}
