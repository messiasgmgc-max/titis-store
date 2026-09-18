'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarClock, PauseCircle, Receipt, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { PlanPicker } from '@/components/consulting/PlanPicker';
import { RefreshAccessButton } from '@/components/consulting/RefreshAccess';
import { accessDaysLeft } from '@/lib/access';
import { cn, formatBRL, formatDateBR, whatsappLink } from '@/lib/format';
import { CLUB_PLANS, CONSULTING_PATH, getPlan, type ClubPlan } from '@/lib/site';
import { supabase } from '@/lib/supabaseClient';
import type { PaymentRow, PaymentStatus } from '@/lib/types';
import { useSession } from '@/providers/SessionProvider';
import { SkeletonList, StatePanel, TabIntro, Tag, shortDate } from './shared';

type PaymentsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; payments: PaymentRow[] };

const PLANS_PATH = '/assinar?plano=clube';
const UPGRADE_PATH = '/assinar?plano=clube&upgrade=1';
const DEFAULT_PERIOD_DAYS = 30;

const STATUS: Record<PaymentStatus, { label: string; dot: string; text: string }> = {
  pending: { label: 'Aguardando pagamento', dot: 'bg-gold', text: 'text-gold-light' },
  approved: { label: 'Aprovado', dot: 'bg-success', text: 'text-success' },
  rejected: { label: 'Recusado', dot: 'bg-danger', text: 'text-danger' },
  cancelled: { label: 'Cancelado', dot: 'bg-smoke', text: 'text-mist' },
  refunded: { label: 'Estornado', dot: 'bg-parchment', text: 'text-parchment' },
};

const PROVIDER: Record<PaymentRow['provider'], string> = {
  whatsapp: 'WhatsApp',
  mercadopago: 'Mercado Pago',
  manual: 'Liberado pelo Titi',
};

function isPaymentStatus(v: unknown): v is PaymentStatus {
  return v === 'pending' || v === 'approved' || v === 'rejected' || v === 'cancelled' || v === 'refunded';
}

function planHref(id: ClubPlan['id']): string {
  return `/assinar?plano=${id}`;
}

function daysLabel(days: number): string {
  if (days <= 0) return 'termina hoje';
  if (days === 1) return 'falta 1 dia';
  return `faltam ${days} dias`;
}

/** Fração do período já usada (0..1) a partir da validade e da duração do plano. */
function periodProgress(accessUntil: string, periodDays: number, now = new Date()): number {
  const end = new Date(accessUntil).getTime();
  if (Number.isNaN(end)) return 0;
  const start = end - periodDays * 86_400_000;
  const total = end - start;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start) / total));
}

function StatusPill({ tone, children }: { tone: 'success' | 'gold' | 'danger' | 'mist'; children: React.ReactNode }) {
  const styles = {
    success: 'border-success/35 text-success',
    gold: 'border-line-gold text-gold-light',
    danger: 'border-danger/35 text-danger',
    mist: 'border-line text-mist',
  } as const;
  const dot = { success: 'bg-success', gold: 'bg-gold', danger: 'bg-danger', mist: 'bg-smoke' } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        styles[tone],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dot[tone])} aria-hidden />
      {children}
    </span>
  );
}

function PaymentBadge({ status }: { status: PaymentStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em]', s.text)}>
      <span className="relative flex h-2 w-2">
        {status === 'pending' && <span className={cn('absolute inset-0 animate-ping rounded-full opacity-60', s.dot)} aria-hidden />}
        <span className={cn('relative h-2 w-2 rounded-full', s.dot)} aria-hidden />
      </span>
      {s.label}
    </span>
  );
}

/** Histórico de pagamentos do titular (public.payments). */
function PaymentHistory({ userId }: { userId: string }) {
  const [state, setState] = useState<PaymentsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({ status: 'error' });
          return;
        }
        const payments = ((data ?? []) as Partial<PaymentRow>[]).map(
          (p): PaymentRow => ({
            id: String(p.id ?? ''),
            user_id: String(p.user_id ?? userId),
            plan: (p.plan as PaymentRow['plan']) ?? 'passe',
            amount_cents: Number(p.amount_cents ?? 0),
            discount_cents: Number(p.discount_cents ?? 0),
            coupon_code: p.coupon_code ?? null,
            provider: (p.provider as PaymentRow['provider']) ?? 'manual',
            provider_payment_id: p.provider_payment_id ?? null,
            status: isPaymentStatus(p.status) ? p.status : 'pending',
            created_at: p.created_at ?? new Date().toISOString(),
            updated_at: p.updated_at,
          }),
        );
        setState({ status: 'ready', payments });
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  };

  return (
    <section aria-labelledby="historico-pagamentos" className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-gold text-gold">
          <Receipt className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <h3 id="historico-pagamentos" className="text-lg font-extrabold leading-tight tracking-[-0.02em] text-ivory">
            Histórico de pagamentos
          </h3>
          <p className="mt-0.5 text-sm text-mist">Cada ativação, renovação ou upgrade registrado na sua conta.</p>
        </div>
      </div>

      {state.status === 'loading' && <SkeletonList rows={2} label="Carregando pagamentos" />}

      {state.status === 'error' && (
        <StatePanel
          tone="error"
          title="Não foi possível carregar os pagamentos."
          actions={
            <Button variant="ghost" size="sm" onClick={retry}>
              Tentar novamente
            </Button>
          }
        >
          Verifique sua conexão e tente de novo em instantes.
        </StatePanel>
      )}

      {state.status === 'ready' && state.payments.length === 0 && (
        <StatePanel
          title={
            <>
              Nenhum pagamento <span className="text-foil">registrado</span>
            </>
          }
        >
          Quando você ativar um plano, a cobrança aparece aqui com a data, o valor e a forma de pagamento.
        </StatePanel>
      )}

      {state.status === 'ready' && state.payments.length > 0 && (
        <ul className="space-y-3">
          {state.payments.map((payment) => {
            const plan = getPlan(payment.plan);
            const original = payment.amount_cents + payment.discount_cents;
            return (
              <li key={payment.id}>
                <article className="panel rounded-3xl p-5 transition-colors duration-500 hover:border-line-gold sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <h4 className="text-base font-extrabold leading-tight tracking-[-0.02em] text-ivory">
                          {plan?.name ?? payment.plan}
                        </h4>
                        <time dateTime={payment.created_at} className="text-xs text-smoke">
                          {formatDateBR(payment.created_at)}
                        </time>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <PaymentBadge status={payment.status} />
                        <Tag>{PROVIDER[payment.provider] ?? payment.provider}</Tag>
                        {payment.coupon_code && <Tag className="border-line-gold text-gold-light">Cupom {payment.coupon_code}</Tag>}
                      </div>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="text-[1.5rem] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-ivory">
                        {formatBRL(payment.amount_cents)}
                      </p>
                      {payment.discount_cents > 0 && (
                        <p className="mt-1.5 text-xs text-mist">
                          <span className="tabular-nums line-through">{formatBRL(original)}</span>
                          <span className="ml-2 font-semibold text-gold-light">−{formatBRL(payment.discount_cents)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Aba "Meu plano": situação do acesso, renovar/upgrade/trocar/pausar e histórico de pagamentos. */
export function PlanTab({ userId }: { userId: string }) {
  const router = useRouter();
  const { profile, accessState, accessUntil } = useSession();
  const [switching, setSwitching] = useState(false);

  const plan = getPlan(profile?.plan);
  const until = shortDate(accessUntil);
  const daysLeft = accessState === 'active' ? accessDaysLeft(profile) : null;
  const periodDays = plan?.accessDays ?? DEFAULT_PERIOD_DAYS;
  const progress = accessState === 'active' && accessUntil ? periodProgress(accessUntil, periodDays) : null;
  const endingSoon = daysLeft !== null && daysLeft <= 7;
  const canUpgrade = plan?.id === 'passe';
  const startingPrice = CLUB_PLANS.find((p) => p.priceCents !== null)?.priceLabel ?? null;

  const accountLines = [profile?.full_name ? `Nome: ${profile.full_name}` : null, profile?.email ? `E-mail da conta: ${profile.email}` : null]
    .filter(Boolean)
    .join('\n');
  const pauseText = `Olá, Titi! Gostaria de pausar ou cancelar meu plano${plan ? ` (${plan.name})` : ''} da Titi's Store.${
    accountLines ? `\n${accountLines}` : ''
  }`;
  const blockedText = `Olá, Titi! Meu acesso à consultoria da Titi's Store aparece como pausado. Pode me ajudar?${
    accountLines ? `\n${accountLines}` : ''
  }`;

  const intro = {
    admin: { title: <>Acesso da <span className="text-gold-light">equipe</span></>, lead: 'Sua conta de administração tem a consultoria liberada sem prazo.' },
    active: { title: <>Seu plano está <span className="text-gold-light">ativo</span></>, lead: 'Acompanhe a validade, renove quando quiser e faça upgrade para o Clube sem perder nada.' },
    expired: { title: <>Seu plano <span className="text-gold-light">expirou</span></>, lead: 'Renove para voltar a usar a leitura por foto, a cartela e os looks montados para você.' },
    blocked: { title: <>Seu acesso está <span className="text-gold-light">pausado</span></>, lead: 'Fale com o Titi para entender o motivo e reativar a sua consultoria.' },
    none: { title: <>Escolha seu <span className="text-gold-light">plano</span></>, lead: 'Ative a consultoria online e comece pela leitura da sua cartela de cores.' },
  }[accessState];

  return (
    <section aria-label="Meu plano" className="space-y-12">
      <TabIntro
        numeral="I"
        eyebrow="Meu plano"
        title={intro.title}
        lead={intro.lead}
        aside={
          accessState === 'active' || accessState === 'admin' ? (
            <Button href={CONSULTING_PATH} size="sm">
              Abrir minha consultoria
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </Button>
          ) : undefined
        }
      />

      {/* Situação atual ---------------------------------------------------- */}
      {accessState === 'blocked' && (
        <div role="status" className="panel relative overflow-hidden rounded-3xl border-danger/30 p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-danger/40 text-danger">
                <PauseCircle className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <p className="text-xl font-extrabold leading-tight tracking-[-0.02em] text-ivory">
                  Seu acesso está pausado. Fale com o Titi.
                </p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
                  {plan ? `Seu plano ${plan.name} continua registrado na conta, ` : 'Sua conta continua registrada, '}
                  mas a consultoria foi pausada manualmente. O Titi resolve isso com você em uma conversa rápida.
                </p>
              </div>
            </div>
            <Button href={whatsappLink(blockedText)} external className="shrink-0 self-start md:self-auto">
              <WhatsAppIcon className="h-4 w-4" />
              Falar com o Titi
            </Button>
          </div>
        </div>
      )}

      {(accessState === 'active' || accessState === 'admin' || accessState === 'expired') && (
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl p-6 sm:p-8',
            accessState === 'expired' ? 'panel' : 'panel-gold',
          )}
        >
          <span className="glow-gold pointer-events-none absolute -right-24 -top-28 h-72 w-72" aria-hidden />
          <div className="relative grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3">
                {accessState === 'expired' ? (
                  <StatusPill tone="danger">Expirado</StatusPill>
                ) : accessState === 'admin' ? (
                  <StatusPill tone="gold">Equipe</StatusPill>
                ) : (
                  <StatusPill tone="success">Ativo</StatusPill>
                )}
                {plan && <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{plan.kicker}</span>}
              </div>
              <h3 className="mt-4 font-display text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ivory">
                {plan ? plan.name : accessState === 'admin' ? 'Acesso completo' : 'Consultoria online'}
              </h3>
              {plan && (
                <p className="mt-2 text-sm text-mist">
                  <span className="font-semibold tabular-nums text-parchment">{plan.priceLabel}</span> · {plan.cadence}
                </p>
              )}

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-line bg-obsidian/40 px-4 py-3.5">
                  <dt className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-smoke">
                    <CalendarClock className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} aria-hidden />
                    Validade
                  </dt>
                  <dd className="mt-1.5 text-sm font-semibold text-ivory">
                    {accessState === 'admin' || !until
                      ? 'Sem prazo'
                      : accessState === 'expired'
                        ? `Terminou em ${until}`
                        : `Até ${until}`}
                  </dd>
                </div>
                <div className="rounded-2xl border border-line bg-obsidian/40 px-4 py-3.5">
                  <dt className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-smoke">
                    <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} aria-hidden />
                    Situação
                  </dt>
                  <dd className={cn('mt-1.5 text-sm font-semibold', endingSoon ? 'text-gold-light' : 'text-ivory')}>
                    {accessState === 'admin'
                      ? 'Liberação permanente'
                      : accessState === 'expired'
                        ? 'Renove para voltar a usar'
                        : daysLeft === null
                          ? 'Acesso liberado'
                          : daysLabel(daysLeft)}
                  </dd>
                </div>
              </dl>

              {progress !== null && (
                <div className="mt-6">
                  <div className="flex items-baseline justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-smoke">
                    <span>Período de {periodDays} dias</span>
                    <span className="tabular-nums text-mist">{Math.round(progress * 100)}% usado</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Período do plano"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-obsidian/60 ring-1 ring-line"
                  >
                    <span
                      className={cn(
                        'block h-full rounded-full transition-[width] duration-1000 ease-[var(--ease-couture)]',
                        endingSoon ? 'bg-gold-light' : 'bg-gold',
                      )}
                      style={{ width: `${Math.max(2, progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {accessState === 'admin' ? (
              <div className="flex flex-col gap-3 lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Administração</p>
                <p className="text-xs text-mist leading-relaxed">
                  Sua conta possui credenciais de administrador com acesso total, ilimitado e vitalício a todas as ferramentas do site.
                </p>
                <Button href="/admin" variant="gold" className="w-full mt-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Abrir Painel Admin
                </Button>
                <Button href="/admin?aba=pedidos" variant="outline" className="w-full">
                  Ver Pedidos dos Clientes
                </Button>
                <Button href="/admin?aba=produtos" variant="outline" className="w-full">
                  Gerenciar Produtos e Fotos
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Gerenciar</p>
                {plan && plan.accessDays !== null ? (
                  <Button href={planHref(plan.id)} className="w-full whitespace-normal">
                    <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    {accessState === 'expired' ? `Renovar o ${plan.name}` : 'Renovar'}
                  </Button>
                ) : (
                  <Button href={PLANS_PATH} className="w-full whitespace-normal">
                    Ver planos
                    <ArrowRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </Button>
                )}
                {canUpgrade && (
                  <Button href={UPGRADE_PATH} variant="outline" className="w-full whitespace-normal">
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                    Fazer upgrade para o Clube
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="w-full"
                  aria-expanded={switching}
                  aria-controls="trocar-plano"
                  onClick={() => setSwitching((v) => !v)}
                >
                  {switching ? 'Fechar troca de plano' : 'Trocar de plano'}
                </Button>
                <a
                  href={whatsappLink(pauseText)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 self-start text-xs font-semibold text-mist underline-offset-4 transition-colors hover:text-ivory hover:underline"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  Cancelar ou pausar pelo WhatsApp
                </a>
              </div>
            )}
          </div>

          {switching && accessState !== 'admin' && (
            <div id="trocar-plano" className="relative mt-8 border-t border-line pt-6">
              <PlanPicker
                variant="compact"
                selectedId={plan?.id}
                onSelect={(next) => router.push(next.id === 'clube' && canUpgrade ? UPGRADE_PATH : planHref(next.id))}
              />
              <p className="mt-3 text-xs text-smoke">Você confere o valor e conclui a troca na página de assinatura.</p>
            </div>
          )}
        </div>
      )}

      {accessState === 'none' && (
        <div className="space-y-8">
          <div className="panel relative overflow-hidden rounded-3xl p-6 sm:p-8">
            <span className="stitch absolute inset-x-6 top-3" aria-hidden />
            <div className="relative flex flex-col gap-6 pt-2 md:flex-row md:items-center md:justify-between md:gap-10">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-line-gold text-gold">
                  <BadgeCheck className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </span>
                <div>
                  <p className="text-xl font-extrabold leading-tight tracking-[-0.02em] text-ivory">Nenhum plano ativo na sua conta</p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
                    Escolha abaixo como quer começar. O acesso é liberado nesta conta assim que o pagamento for confirmado.
                    {startingPrice && (
                      <>
                        {' '}
                        A partir de <span className="font-extrabold tabular-nums text-parchment">{startingPrice}</span>.
                      </>
                    )}
                  </p>
                </div>
              </div>
              <RefreshAccessButton size="sm" className="shrink-0 md:items-end md:text-right" />
            </div>
          </div>
          <PlanPicker onChoose={(next) => router.push(planHref(next.id))} />
        </div>
      )}

      {accessState !== 'admin' && <PaymentHistory userId={userId} />}
    </section>
  );
}
