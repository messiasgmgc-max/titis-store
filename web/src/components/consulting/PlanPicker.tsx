'use client';

import { useId } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { CHECKOUT_PROVIDER, CLUB_PLANS, type ClubPlan } from '@/lib/site';
import type { PlanId } from '@/lib/types';
import { cn } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { EYEBROW, perDayLabel } from './shared';

interface PlanPickerProps {
  plans?: ClubPlan[];
  /** 'cards': cartões com botão de compra · 'compact': troca de plano (rádio). */
  variant?: 'cards' | 'compact';
  selectedId?: PlanId;
  onSelect?: (plan: ClubPlan) => void;
  onChoose?: (plan: ClubPlan) => void;
  busyPlanId?: PlanId | null;
  className?: string;
}

/** O plano segue para o WhatsApp (modo WhatsApp ou presencial)? */
export function planGoesToWhatsapp(plan: ClubPlan): boolean {
  return CHECKOUT_PROVIDER !== 'mercadopago' || plan.priceCents === null;
}

export function PlanPicker({ variant = 'cards', ...props }: PlanPickerProps) {
  return variant === 'compact' ? <PlanSwitcher {...props} /> : <PlanCards {...props} />;
}

function PlanCards({ plans = CLUB_PLANS, onChoose, busyPlanId, className }: Omit<PlanPickerProps, 'variant'>) {
  const busy = !!busyPlanId;
  return (
    <ul className={cn('grid gap-4 lg:grid-cols-3', className)}>
      {plans.map((plan) => {
        const featured = plan.featured === true;
        const perDay = perDayLabel(plan);
        const whatsapp = planGoesToWhatsapp(plan);
        return (
          <li
            key={plan.id}
            className={cn(
              'relative flex flex-col rounded-3xl border p-6 sm:p-7',
              featured ? 'border-line-gold bg-gold/[0.05]' : 'border-line bg-surface',
              featured && 'order-first lg:order-none',
            )}
          >
            <p className={EYEBROW}>{plan.kicker}</p>
            <h3 className="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ivory">{plan.name}</h3>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-[2.1rem] font-extrabold leading-none tracking-[-0.03em] text-ivory tabular-nums">
                {plan.priceLabel}
              </span>
              <span className="text-sm text-mist">{plan.cadence}</span>
            </p>
            {perDay && <p className="mt-2 text-xs font-semibold text-gold-light">equivale a {perDay} por dia</p>}
            <p className="mt-4 text-sm leading-relaxed text-mist">{plan.description}</p>

            <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm leading-snug text-parchment">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={2} aria-hidden />
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-7">
              <Button
                variant={featured ? 'gold' : 'outline'}
                className="w-full whitespace-normal"
                loading={busyPlanId === plan.id}
                disabled={busy && busyPlanId !== plan.id}
                onClick={() => onChoose?.(plan)}
              >
                {busyPlanId !== plan.id &&
                  (whatsapp ? (
                    <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  ))}
                {plan.cta}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PlanSwitcher({ plans = CLUB_PLANS, selectedId, onSelect, className }: Omit<PlanPickerProps, 'variant'>) {
  const name = useId();
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={cn(EYEBROW, 'mb-3')}>Trocar de plano</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {plans.map((plan) => {
          const active = plan.id === selectedId;
          return (
            <label key={plan.id} data-active={active} className="option flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3.5 focus-within:border-gold">
              <input
                type="radio"
                name={name}
                value={plan.id}
                checked={active}
                onChange={() => onSelect?.(plan)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors',
                  active ? 'border-gold' : 'border-ivory/30',
                )}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight text-ivory">{plan.name}</span>
                <span className="mt-1 block text-xs text-mist">
                  <span className="font-semibold text-gold-light">{plan.priceLabel}</span> · {plan.cadence}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
