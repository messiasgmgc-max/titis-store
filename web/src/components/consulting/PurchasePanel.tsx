'use client';

import { useState } from 'react';
import { ArrowRight, BadgeCheck, CircleAlert, CircleCheck, Hourglass, ShieldCheck } from 'lucide-react';
import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { planWhatsappText } from '@/lib/checkout';
import { CHECKOUT_PROVIDER, CONSULTING_PATH, type ClubPlan } from '@/lib/site';
import { cn, whatsappLink } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/providers/SessionProvider';
import { PurchaseFeedback } from './PurchaseFeedback';
import { RefreshAccessButton } from './RefreshAccess';
import { usePlanPurchase } from './usePlanPurchase';
import { EYEBROW, formatAccessDate, type ReturnStatus } from './shared';

const HELP_TEXT = 'Olá, Titi! Tenho uma dúvida sobre os planos da consultoria.';

const RETURN_COPY: Record<ReturnStatus, { title: string; text: string; icon: typeof CircleCheck; tone: string }> = {
  approved: {
    title: 'Pagamento aprovado',
    text: 'Estamos liberando o acesso na sua conta. Costuma levar poucos segundos: toque em Atualizar acesso.',
    icon: CircleCheck,
    tone: 'border-success/35 bg-success/[0.06] text-success',
  },
  pending: {
    title: 'Pagamento em processamento',
    text: 'Alguns meios de pagamento levam alguns minutos para compensar. Assim que o Mercado Pago confirmar, o acesso é liberado na sua conta.',
    icon: Hourglass,
    tone: 'border-line-gold bg-gold/[0.05] text-gold',
  },
  failure: {
    title: 'O pagamento não foi concluído',
    text: 'O Mercado Pago não confirmou a cobrança. Tente de novo abaixo ou finalize com o Titi pelo WhatsApp.',
    icon: CircleAlert,
    tone: 'border-danger/35 bg-danger/[0.05] text-danger',
  },
};

function ReturnNotice({ status, hasAccess }: { status: ReturnStatus; hasAccess: boolean }) {
  const released = status !== 'failure' && hasAccess;
  const copy = RETURN_COPY[status];
  const Icon = released ? BadgeCheck : copy.icon;
  return (
    <div role="status" className={cn('border p-5', released ? RETURN_COPY.approved.tone : copy.tone)}>
      <p className="flex items-center gap-2.5 text-base font-extrabold tracking-[-0.02em] text-ivory">
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
        {released ? 'Acesso liberado' : copy.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-parchment">
        {released ? 'Tudo pronto: sua consultoria já está disponível na sua conta.' : copy.text}
      </p>
      {status !== 'failure' && (
        <div className="mt-4">
          {released ? (
            <Button href={CONSULTING_PATH} className="w-full">
              Ir para minha consultoria
            </Button>
          ) : (
            <RefreshAccessButton size="sm" />
          )}
        </div>
      )}
    </div>
  );
}

function ActiveNotice({ accessUntil, isAdmin }: { accessUntil: string | null; isAdmin: boolean }) {
  return (
    <div className="border border-success/35 bg-success/[0.06] p-5">
      <p className="flex items-center gap-2.5 text-base font-extrabold tracking-[-0.02em] text-ivory">
        <BadgeCheck className="h-5 w-5 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
        Seu plano está ativo
      </p>
      <p className="mt-1.5 text-sm text-mist">
        {accessUntil && !isAdmin ? `Acesso até ${formatAccessDate(accessUntil)}.` : 'Acesso sem prazo.'}
      </p>
      <Button href={CONSULTING_PATH} className="mt-4 w-full">
        Ir para minha consultoria
      </Button>
    </div>
  );
}

function PanelLoading() {
  return (
    <div aria-hidden className="animate-pulse space-y-4">
      <span className="block h-2.5 w-24 bg-line" />
      <span className="block h-3 w-full bg-line" />
      <span className="block h-3 w-2/3 bg-line" />
      <span className="block h-12 w-full rounded-full bg-gold/20" />
    </div>
  );
}

/** Coluna de ações da assinatura: conta, pagamento, retorno do checkout e confirmação. */
export function PurchasePanel({ plan, returnStatus }: { plan: ClubPlan; returnStatus: ReturnStatus | null }) {
  const { user, profile, loading, hasAccess, accessUntil, isAdmin } = useSession();
  const { state, purchase } = usePlanPurchase();
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [justJoined, setJustJoined] = useState(false);

  const digital = plan.accessDays !== null;
  const online = CHECKOUT_PROVIDER === 'mercadopago' && plan.priceCents !== null;
  const paymentReturned = returnStatus === 'approved' || returnStatus === 'pending';

  /** Depois de criar a conta, o pagamento on-line segue direto; o WhatsApp precisa de um clique (nova aba). */
  const continueAfterAuth = async () => {
    setJustJoined(true);
    if (!online || authMode !== 'register') return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    if (token) void purchase(plan, { accessToken: token });
  };

  let body: React.ReactNode;

  if (!digital) {
    body = (
      <div>
        <p className={EYEBROW}>Agendamento</p>
        <p className="mt-3 text-sm leading-relaxed text-parchment">
          A consultoria presencial é combinada direto com o Titi: data, local e valor. Não é preciso criar conta.
        </p>
        <Button href={whatsappLink(planWhatsappText(plan, profile))} external size="lg" className="mt-6 w-full">
          <WhatsAppIcon className="h-4 w-4" />
          Agendar pelo WhatsApp
        </Button>
      </div>
    );
  } else if (loading || (user && !profile)) {
    body = <PanelLoading />;
  } else if (!user) {
    const entering = authMode === 'login';
    body = (
      <div>
        <p className={EYEBROW}>{paymentReturned || entering ? 'Entre na sua conta' : 'Passo 1 de 2'}</p>
        <p className="mt-3 text-xl font-extrabold leading-tight tracking-[-0.03em] text-ivory">
          {paymentReturned
            ? 'Entre com a conta usada no pagamento'
            : entering
              ? 'Entre para receber o acesso'
              : 'Crie sua conta para receber o acesso'}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          O plano é liberado na sua conta: é nela que ficam sua cartela e seus looks.
        </p>
        <AuthForm
          className="mt-6"
          initialMode={paymentReturned ? 'login' : 'register'}
          onModeChange={setAuthMode}
          onSuccess={() => void continueAfterAuth()}
        />
        <p className="mt-4 text-xs leading-relaxed text-smoke">
          Se pedirmos a confirmação do e-mail, confirme e volte a esta página para concluir.
        </p>
      </div>
    );
  } else if (paymentReturned) {
    body = null;
  } else {
    const loadingPurchase = state.status === 'loading';
    body = (
      <div className="space-y-6">
        {hasAccess && <ActiveNotice accessUntil={accessUntil} isAdmin={isAdmin} />}
        {justJoined && !hasAccess && (
          <p role="status" className="flex items-center gap-2.5 text-sm font-semibold text-success">
            <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Conta pronta. Falta só ativar o plano.
          </p>
        )}

        <div>
          <p className={EYEBROW}>{hasAccess ? 'Renovar ou trocar de plano' : justJoined ? 'Passo 2 de 2' : 'Pagamento'}</p>
          <p className="mt-3 text-sm leading-relaxed text-parchment">
            {online
              ? 'Você segue para o ambiente do Mercado Pago para pagar com Pix ou cartão. O acesso é liberado automaticamente na sua conta.'
              : 'Abrimos uma conversa com o Titi já com o plano e o e-mail da sua conta. Você combina o pagamento e ele libera o acesso.'}
          </p>
        </div>

        {state.status === 'whatsapp' ? (
          <PurchaseFeedback state={state} plan={plan} />
        ) : (
          <>
            <Button
              variant={hasAccess ? 'outline' : 'gold'}
              size="lg"
              className="w-full whitespace-normal"
              loading={loadingPurchase}
              onClick={() => void purchase(plan)}
            >
              {online ? (
                <>
                  Continuar para pagamento
                  {!loadingPurchase && <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                </>
              ) : (
                <>
                  {!loadingPurchase && <WhatsAppIcon className="h-4 w-4" />}
                  Finalizar pelo WhatsApp
                </>
              )}
            </Button>
            <PurchaseFeedback state={state} plan={plan} onRetry={() => void purchase(plan)} />
          </>
        )}

        {profile?.email && (
          <p className="text-xs text-smoke">
            Conta: <span className="break-all text-mist">{profile.email}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="panel p-6 sm:p-8">
      <div className="space-y-6">
        {digital && returnStatus && user && <ReturnNotice status={returnStatus} hasAccess={hasAccess} />}
        {body}
      </div>

      <div className="mt-8 space-y-4 border-t border-line pt-6">
        <p className="flex items-start gap-2.5 text-xs leading-relaxed text-mist">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
          {online
            ? "Pagamento processado pelo Mercado Pago. A Titi's Store não recebe os dados do seu cartão."
            : 'Nenhum pagamento é feito neste site: você combina direto com o Titi.'}
        </p>
        <a
          href={whatsappLink(HELP_TEXT)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gold-light transition-colors hover:text-ivory"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Dúvidas antes de assinar? Falar com o Titi
        </a>
      </div>
    </div>
  );
}
