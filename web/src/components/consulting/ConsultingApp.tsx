'use client';

import { accessDaysLeft } from '@/lib/access';
import { getPlan } from '@/lib/site';
import { useSession } from '@/providers/SessionProvider';
import { Atelier } from '@/components/atelier/Atelier';
import { Button } from '@/components/ui/Button';
import { Medallion } from '@/components/ui/Logo';
import { AccessGate } from './AccessGate';
import { ConsultingLoader } from './ConsultingLoader';
import { Paywall } from './Paywall';
import { formatAccessDate, plansHref } from './shared';

function daysLeftLabel(days: number): string {
  if (days <= 0) return 'termina hoje';
  if (days === 1) return 'falta 1 dia';
  return `faltam ${days} dias`;
}

/** Faixa de status do plano no topo do app. */
function AccessStatusBar() {
  const { profile, accessUntil, isAdmin } = useSession();
  const plan = getPlan(profile?.plan);
  const daysLeft = isAdmin ? null : accessDaysLeft(profile);
  const endingSoon = daysLeft !== null && daysLeft <= 7;

  return (
    <div className="border-b border-line bg-coal">
      <div className="container-luxe flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Medallion size={40} />
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight tracking-[-0.03em] text-ivory sm:text-2xl">
              Minha consultoria
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-mist">
              <span className="font-semibold text-gold-light">
                {plan?.name ?? (isAdmin ? 'Acesso da equipe' : 'Plano ativo')}
              </span>
              <span aria-hidden className="text-smoke">
                ·
              </span>
              <span>{accessUntil && !isAdmin ? `acesso até ${formatAccessDate(accessUntil)}` : 'sem prazo'}</span>
              {endingSoon && (
                <>
                  <span aria-hidden className="text-smoke">
                    ·
                  </span>
                  <span className="font-semibold text-gold">{daysLeftLabel(daysLeft)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {endingSoon && (
            <Button size="sm" href={plansHref(profile?.plan)}>
              Renovar acesso
            </Button>
          )}
          <Button size="sm" variant="ghost" href="/dashboard?aba=looks">
            Meu acervo
          </Button>
        </div>
      </div>
    </div>
  );
}

/** /consultoria: carregando → entrar → paywall → app (Atelier). */
export function ConsultingApp() {
  const { loading, user, profile, hasAccess } = useSession();

  // Depois do login o perfil chega um instante depois da sessão: evita piscar o paywall.
  if (loading || (user && !profile)) return <ConsultingLoader />;
  if (!user) return <AccessGate />;
  if (!hasAccess) return <Paywall />;

  return (
    <>
      <AccessStatusBar />
      <Atelier />
    </>
  );
}
