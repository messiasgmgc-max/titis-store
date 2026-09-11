'use client';

import { CircleAlert, CircleCheck, RefreshCw } from 'lucide-react';
import type { ClubPlan } from '@/lib/site';
import { CONSULTING_PATH } from '@/lib/site';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { cn } from '@/lib/format';
import type { PurchaseState } from './usePlanPurchase';

/** Retorno do fluxo de compra: pedido enviado pelo WhatsApp, erro do checkout ou conta exigida. */
export function PurchaseFeedback({
  state,
  plan,
  onRetry,
  showConsultingLink = true,
  className,
}: {
  state: PurchaseState;
  plan: ClubPlan;
  onRetry?: () => void;
  showConsultingLink?: boolean;
  className?: string;
}) {
  if (state.status === 'whatsapp') {
    const digital = plan.accessDays !== null;
    return (
      <div role="status" className={cn('rounded-2xl border border-line-gold bg-gold/[0.05] p-5 sm:p-6', className)}>
        <p className="flex items-center gap-2.5 text-lg font-extrabold tracking-[-0.02em] text-ivory">
          <CircleCheck className="h-5 w-5 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
          {digital ? 'Pedido de ativação enviado' : 'Conversa aberta com o Titi'}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-parchment">
          {digital
            ? 'Finalize o pagamento com o Titi no WhatsApp; assim que ele confirmar, seu acesso é liberado na sua conta.'
            : 'Combine com o Titi no WhatsApp a data e os detalhes da sua sessão presencial.'}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button variant="outline" href={state.url} external>
            <WhatsAppIcon className="h-4 w-4" />
            Abrir WhatsApp de novo
          </Button>
          {digital && showConsultingLink && <Button href={CONSULTING_PATH}>Ir para minha consultoria</Button>}
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className={cn('rounded-2xl border border-danger/35 bg-danger/[0.05] p-5 sm:p-6', className)}>
        <p className="flex items-start gap-2.5 text-sm font-semibold leading-snug text-danger">
          <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {state.message}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          Você pode tentar de novo ou finalizar com o Titi pelo WhatsApp; o acesso é liberado na mesma conta.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Tentar novamente
            </Button>
          )}
          <Button href={state.whatsappUrl} external>
            <WhatsAppIcon className="h-4 w-4" />
            Finalizar pelo WhatsApp
          </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'needs_account') {
    return (
      <p role="alert" className={cn('flex items-start gap-2.5 rounded-2xl border border-line-gold p-4 text-sm text-parchment', className)}>
        <CircleAlert className="mt-px h-4 w-4 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
        Entre na sua conta para ativar o plano: o acesso é liberado nela.
      </p>
    );
  }

  return null;
}
