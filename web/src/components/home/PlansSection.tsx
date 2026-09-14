import { Check, CreditCard, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tilt3D } from '@/components/ui/Tilt3D';
import { WhatsAppIcon } from '@/components/ui/icons';
import { cn, formatBRL, whatsappLink } from '@/lib/format';
import { CHECKOUT_PROVIDER, CLUB_PLANS, type ClubPlan } from '@/lib/site';
import { FadeIn } from './FadeIn';
import { SectionTitle } from './Heading';
import { planHref } from './links';

type TrustIcon = React.ComponentType<{ className?: string }>;

const TRUST: { icon: TrustIcon; text: string }[] =
  CHECKOUT_PROVIDER === 'mercadopago'
    ? [
        { icon: ShieldCheck, text: 'Pagamento seguro pelo Mercado Pago' },
        { icon: CreditCard, text: 'Pix ou cartão' },
        { icon: WhatsAppIcon, text: 'Atendimento pelo WhatsApp' },
      ]
    : [
        { icon: WhatsAppIcon, text: 'Ativação feita pelo WhatsApp, direto com o Titi' },
        { icon: UserRound, text: 'Acesso liberado na sua conta' },
        { icon: ShieldCheck, text: '100% online, pelo celular' },
      ];

/** Valor diário arredondado para baixo (ex.: R$ 49,90 em 30 dias = R$ 1,66). */
function perDay(cents: number, days: number): string {
  return formatBRL(Math.floor(cents / days));
}

function PlanCard({ plan, index }: { plan: ClubPlan; index: number }) {
  const featured = Boolean(plan.featured);
  const byWhatsapp = plan.priceCents === null;
  const href = byWhatsapp ? whatsappLink(plan.whatsappText) : planHref(plan.id);

  return (
    <FadeIn as="li" rise delay={index * 0.08} className={cn('flex', featured && 'order-first lg:order-none')}>
      <Tilt3D
        max={18}
        lift={24}
        perspective={750}
        className={cn(
          'flex w-full flex-col rounded-[1.75rem] p-7 sm:p-8',
          featured ? 'panel-gold shadow-[0_40px_90px_-45px_rgb(212_175_55/0.45)] lg:px-9 lg:py-12' : 'panel',
        )}
      >
        {featured && (
          <span
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foil px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-obsidian"
            style={{ transform: 'translateX(-50%) translateZ(80px)' }}
          >
            Mais escolhido
          </span>
        )}

        <div style={{ transform: 'translateZ(30px)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
            {featured ? 'Acompanhamento mensal' : plan.kicker}
          </p>
          <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.02em] text-ivory">{plan.name}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-mist">{plan.description}</p>
        </div>

        <div className="mt-7 border-t border-line pt-6" style={{ transform: 'translateZ(60px)' }}>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={cn(
              'font-extrabold leading-none tracking-[-0.035em]',
              byWhatsapp ? 'text-[2rem] text-ivory' : 'text-[3rem]',
              !byWhatsapp && (featured ? 'text-foil' : 'text-ivory'),
            )}
          >
            {plan.priceLabel}
          </span>
          <span className="text-sm text-mist">{plan.cadence}</span>
        </p>
        {featured && plan.priceCents !== null && plan.accessDays !== null && (
          <p className="mt-2 text-sm font-semibold text-gold-light">
            Equivale a {perDay(plan.priceCents, plan.accessDays)} por dia
          </p>
        )}
          {byWhatsapp && <p className="mt-2 text-sm text-mist">Valor combinado com o Titi</p>}
        </div>

        <ul className="mt-6 flex-1 space-y-3" style={{ transform: 'translateZ(20px)' }}>
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-3 text-[15px] leading-snug text-parchment">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" strokeWidth={2.2} aria-hidden />
              {feature}
            </li>
          ))}
        </ul>

        <Button
          href={href}
          external={byWhatsapp}
          variant={featured ? 'gold' : 'outline'}
          size={featured ? 'lg' : 'md'}
          className="mt-8 w-full"
          style={{ transform: 'translateZ(40px)' }}
        >
          {byWhatsapp && <WhatsAppIcon className="h-4 w-4" />}
          {plan.cta}
        </Button>
      </Tilt3D>
    </FadeIn>
  );
}

export function PlansSection() {
  return (
    <section
      id="planos"
      data-hide-mobile-cta
      aria-labelledby="planos-title"
      className="relative isolate overflow-hidden border-t border-line py-20 sm:py-28"
    >
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2"
      />
      <div className="container-luxe">
        <SectionTitle
          id="planos-title"
          align="center"
          eyebrow="Planos"
          title={
            <>
              Escolha como quer <span className="text-foil">ser atendido.</span>
            </>
          }
          lead="Comece pelo Passe Digital ou tenha o Titi ao seu lado todo mês no Clube."
        />

        <ul className="mx-auto mt-16 grid max-w-md gap-8 [perspective:1600px] lg:max-w-none lg:grid-cols-3 lg:items-center lg:gap-5 xl:gap-7">
          {CLUB_PLANS.map((plan, index) => (
            <PlanCard key={plan.id} plan={plan} index={index} />
          ))}
        </ul>

        <ul className="mt-10 flex flex-col items-center justify-center gap-x-8 gap-y-3 text-sm text-mist sm:flex-row sm:flex-wrap">
          {TRUST.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gold" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
