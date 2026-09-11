'use client';

import Link from 'next/link';
import { ArrowRight, Check, PauseCircle, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useSession } from '@/providers/SessionProvider';
import { accessDaysLeft } from '@/lib/access';
import { PLAN_TAB_PATH } from '@/lib/auth-redirect';
import { CLUB_PLANS, CONSULTING_PATH, getPlan } from '@/lib/site';
import { cn, whatsappLink } from '@/lib/format';
import { shortDate } from './shared';

/** Página de compra padrão (plano mais escolhido). */
export const PLANS_PATH = '/assinar?plano=clube';

const BENEFITS = ['Cartela de cores por foto', 'Looks montados por ocasião', 'Provador virtual com o seu rosto'] as const;
const RENEW_WARNING_DAYS = 7;
const BLOCKED_TEXT = "Olá, Titi! Meu acesso à consultoria da Titi's Store aparece como pausado. Pode me ajudar?";

/** Destino dos atalhos de consultoria: o app com acesso ativo, os planos sem ele. */
export function useConsultingLink(): { href: string; hasAccess: boolean } {
  const { hasAccess } = useSession();
  return { href: hasAccess ? CONSULTING_PATH : PLANS_PATH, hasAccess };
}

/** Status do plano de consultoria no topo da conta. `onManage` abre a aba "Meu plano". */
export function PlanStatusCard({ className, onManage }: { className?: string; onManage?: () => void }) {
  const { profile, hasAccess, accessUntil, accessState } = useSession();
  const plan = getPlan(profile?.plan);
  const until = shortDate(accessUntil);
  const startingPrice = CLUB_PLANS.find((p) => p.priceCents !== null)?.priceLabel ?? null;

  const manageProps = onManage ? { onClick: onManage } : { href: PLAN_TAB_PATH };

  if (accessState === 'blocked') {
    return (
      <section
        aria-label="Status do plano"
        role="status"
        className={cn('panel relative overflow-hidden rounded-3xl border-danger/30 p-6 sm:p-8', className)}
      >
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-danger/40 text-danger">
              <PauseCircle className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-danger">Acesso pausado</p>
              <h2 className="mt-2 font-display text-[clamp(1.35rem,2.6vw,1.9rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-ivory">
                Seu acesso está pausado. Fale com o Titi.
              </h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-mist">
                A consultoria foi pausada manualmente. Uma conversa rápida resolve.
              </p>
            </div>
          </div>
          <Button href={whatsappLink(BLOCKED_TEXT)} external className="shrink-0 self-start md:self-auto">
            <WhatsAppIcon className="h-4 w-4" />
            Falar com o Titi
          </Button>
        </div>
      </section>
    );
  }

  if (hasAccess) {
    const daysLeft = accessDaysLeft(profile);
    const renewSoon = daysLeft !== null && daysLeft <= RENEW_WARNING_DAYS;
    return (
      <section
        aria-label="Status do plano"
        className={cn('panel-gold frame relative overflow-hidden rounded-3xl p-6 sm:p-8 before:rounded-2xl', className)}
      >
        <span className="glow-gold pointer-events-none absolute -right-20 -top-24 h-64 w-64" aria-hidden />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              Consultoria liberada
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.35rem,2.6vw,1.9rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-ivory">
              {plan ? (
                <>
                  Plano <span className="text-foil">{plan.name}</span>
                </>
              ) : (
                'Acesso à consultoria'
              )}{' '}
              {until && accessState !== 'admin' ? (
                <>
                  ativo até <span className="tabular-nums">{until}</span>
                </>
              ) : (
                'ativo, sem prazo'
              )}
            </h2>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-mist">
              Cartela, looks por ocasião e provador virtual liberados para você.
            </p>
            {renewSoon && (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-gold-light">
                {daysLeft === 0 ? 'Seu acesso termina hoje.' : `Faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'} de acesso.`}
                <Link href={`/assinar?plano=${plan?.id ?? 'clube'}`} className="link-luxe text-gold-light">
                  Renovar
                </Link>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-3 self-start sm:flex-row md:self-auto">
            <Button variant="outline" {...manageProps}>
              <Settings2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              Gerenciar plano
            </Button>
            <Button href={CONSULTING_PATH}>
              Abrir minha consultoria
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const expiredOn = accessState === 'expired' ? until : null;

  return (
    <section aria-label="Status do plano" className={cn('panel relative overflow-hidden rounded-3xl p-6 sm:p-8', className)}>
      <span className="stitch absolute inset-x-6 top-3" aria-hidden />
      <div className="relative flex flex-col gap-7 pt-2 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Consultoria online</p>
          <h2 className="mt-3 font-display text-[clamp(1.35rem,2.6vw,1.9rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-ivory">
            {expiredOn ? (
              <>
                Seu plano <span className="text-foil">expirou</span>
              </>
            ) : (
              <>
                Você ainda não tem um plano <span className="text-foil">ativo</span>
              </>
            )}
          </h2>
          {expiredOn && (
            <p className="mt-2 text-sm text-mist">
              Seu último plano{plan ? ` (${plan.name})` : ''} terminou em <span className="tabular-nums">{expiredOn}</span>.
            </p>
          )}
          <ul className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm font-medium text-parchment">
                <Check className="h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={2} aria-hidden />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
          <Button {...manageProps}>
            {expiredOn ? 'Renovar plano' : 'Ver planos'}
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </Button>
          {startingPrice && (
            <p className="text-xs text-smoke">
              A partir de <span className="font-extrabold tabular-nums text-parchment">{startingPrice}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
