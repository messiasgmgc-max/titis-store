import { Check } from 'lucide-react';
import { CHECKOUT_PROVIDER, type ClubPlan } from '@/lib/site';
import { cn } from '@/lib/format';
import { EYEBROW, perDayLabel } from './shared';

/** Resumo do plano escolhido na página de assinatura. */
export function PlanSummary({ plan, className }: { plan: ClubPlan; className?: string }) {
  const perDay = perDayLabel(plan);
  const digital = plan.accessDays !== null;
  const online = CHECKOUT_PROVIDER === 'mercadopago' && plan.priceCents !== null;

  const details: { label: string; value: string }[] = digital
    ? [
        { label: 'Acesso', value: `${plan.accessDays} dias na sua conta` },
        {
          label: 'Pagamento',
          value: online ? 'Pix ou cartão pelo Mercado Pago' : 'Combinado com o Titi pelo WhatsApp',
        },
        {
          label: 'Liberação',
          value: online ? 'Automática após a confirmação do pagamento' : 'Assim que o Titi confirmar o pagamento',
        },
      ]
    : [
        { label: 'Formato', value: 'Sessão individual com o Titi' },
        { label: 'Agendamento', value: 'Pelo WhatsApp, sem precisar de conta' },
      ];

  return (
    <section aria-labelledby="plan-summary-title" className={cn('rounded-3xl border border-line bg-surface p-6 sm:p-8', className)}>
      <p className={EYEBROW}>{plan.kicker}</p>
      <h2 id="plan-summary-title" className="mt-3 text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] text-ivory">
        {plan.name}
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist">{plan.description}</p>

      <div className="mt-7 border-y border-line py-6">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[clamp(2.6rem,6vw,3.6rem)] font-extrabold leading-none tracking-[-0.04em] text-ivory tabular-nums">
            {plan.priceLabel}
          </span>
          <span className="text-base text-mist">{plan.cadence}</span>
        </p>
        {perDay && <p className="mt-3 text-sm font-semibold text-gold-light">equivale a {perDay} por dia</p>}
      </div>

      <ul className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-[0.95rem] leading-snug text-parchment">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
              <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <dl className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {details.map((d) => (
          <div key={d.label} className="bg-coal px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-smoke">{d.label}</dt>
            <dd className="mt-1 text-sm leading-snug text-ivory">{d.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
