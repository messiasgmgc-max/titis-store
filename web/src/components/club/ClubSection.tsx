'use client';

import { useRef, useSyncExternalStore, type PointerEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { CLUB_PLANS, SITE, type ClubPlan } from '@/lib/site';
import { cn, whatsappLink } from '@/lib/format';
import { useSession } from '@/providers/SessionProvider';
import { Button } from '@/components/ui/Button';
import { Medallion } from '@/components/ui/Logo';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { WhatsAppIcon } from '@/components/ui/icons';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** Metal escovado escuro: brilho de canto, fios finos repetidos e base obsidian. */
const METAL_FACE = [
  'radial-gradient(130% 100% at 0% 0%, rgb(245 241 234 / 0.09), transparent 50%)',
  'radial-gradient(90% 80% at 100% 100%, rgb(212 175 55 / 0.07), transparent 60%)',
  'repeating-linear-gradient(90deg, rgb(245 241 234 / 0.028) 0 1px, transparent 1px 3px)',
  'repeating-linear-gradient(90deg, rgb(11 12 16 / 0.35) 0 1px, transparent 1px 4px)',
  'linear-gradient(155deg, var(--color-surface-2) 0%, var(--color-coal) 42%, var(--color-surface-2) 68%, var(--color-obsidian) 100%)',
].join(', ');

/** Escovado sobre a folha de ouro do cartão da casa. */
const FOIL_BRUSH = [
  'radial-gradient(120% 90% at 10% 0%, rgb(245 241 234 / 0.3), transparent 45%)',
  'repeating-linear-gradient(90deg, rgb(11 12 16 / 0.05) 0 1px, transparent 1px 3px)',
  'repeating-linear-gradient(90deg, rgb(245 241 234 / 0.07) 0 1px, transparent 1px 5px)',
].join(', ');

function subscribePointer(onChange: () => void) {
  const mq = window.matchMedia(FINE_POINTER);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function useFinePointer(): boolean {
  return useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false,
  );
}

export function ClubSection() {
  const { isVip } = useSession();

  if (isVip) return <MemberBand />;

  return (
    <section id="clube" className="relative isolate overflow-hidden border-t border-line py-24 sm:py-32">
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/3"
      />

      <div className="container-luxe">
        <Reveal>
          <SectionHeading
            align="center"
            numeral="IV"
            eyebrow="O Clube"
            title={
              <>
                Três formas de <em className="italic text-foil">ser atendido</em>.
              </>
            }
            lead="Da primeira leitura de cores ao guarda-roupa renovado: escolha o nível de acompanhamento e fale direto com o Titi."
          />
        </Reveal>

        <ol className="mx-auto mt-16 grid max-w-md gap-20 sm:mt-24 lg:max-w-none lg:grid-cols-3 lg:gap-8 xl:gap-12">
          {CLUB_PLANS.map((plan, i) => (
            <Reveal
              key={plan.id}
              as="li"
              delay={i * 0.12}
              className={cn('flex', plan.featured && 'order-first lg:order-none')}
            >
              <PlanCard plan={plan} numeral={ROMAN[i] ?? String(i + 1)} />
            </Reveal>
          ))}
        </ol>

        <p className="mx-auto mt-20 max-w-xl text-center text-xs leading-relaxed text-smoke">
          Ativação dos planos e agendamento de sessões feitos diretamente pelo WhatsApp{' '}
          <span className="whitespace-nowrap text-mist">{SITE.whatsappDisplay}</span>.
        </p>
      </div>
    </section>
  );
}

/** Faixa discreta para quem já é membro. */
function MemberBand() {
  return (
    <section id="clube" aria-label="Clube Titi's" className="relative border-y border-line-gold bg-coal">
      <span aria-hidden className="stitch absolute inset-x-0 top-1.5 opacity-40" />
      <span aria-hidden className="stitch absolute inset-x-0 bottom-1.5 opacity-40" />
      <div className="container-luxe flex flex-col items-center gap-4 py-7 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <Medallion size={40} />
          <p className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="font-caps text-sm tracking-[0.24em] text-gold-light">Membro do Clube Titi&apos;s</span>
            <span aria-hidden className="hidden text-smoke sm:inline">
              ·
            </span>
            <span className="text-sm text-mist">acesso completo ativo</span>
          </p>
        </div>
        <Link href="/dashboard" className="link-luxe">
          Minha área
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

function PlanCard({ plan, numeral }: { plan: ClubPlan; numeral: string }) {
  const featured = plan.featured === true;

  return (
    <article className="flex w-full flex-col">
      <div className="relative">
        <div aria-hidden className="absolute inset-x-[12%] -bottom-6 h-10 bg-obsidian/90 blur-2xl" />
        <div className={cn('relative', featured && 'motion-safe:animate-float')}>
          <TiltCard>
            <CardFace plan={plan} numeral={numeral} featured={featured} />
            {featured && <HouseLabel />}
          </TiltCard>
        </div>
      </div>

      <div className="mt-12 flex flex-1 flex-col">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <Price label={plan.priceLabel} />
          <span className="kicker">{plan.cadence}</span>
        </p>
        <p className="mt-4 leading-relaxed text-mist">{plan.description}</p>

        <div aria-hidden className="stitch mt-7" />

        <ul className="mt-7 space-y-3.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3.5 text-sm leading-relaxed text-parchment">
              <span aria-hidden className="stitch mt-[0.7rem] w-5 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-9">
          <Button variant={featured ? 'gold' : 'outline'} href={whatsappLink(plan.whatsappText)} external className="w-full">
            <WhatsAppIcon className="h-4 w-4" />
            {plan.cta}
          </Button>
        </div>
      </div>
    </article>
  );
}

function Price({ label }: { label: string }) {
  const match = /^R\$\s*(.+)$/.exec(label.trim());
  if (!match) {
    return <span className="font-display text-[2.5rem] italic leading-none text-ivory">{label}</span>;
  }
  return (
    <span className="font-display leading-none text-ivory">
      <span className="mr-1.5 align-top text-xl text-gold-light">R$</span>
      <span className="text-[3.4rem] tabular-nums">{match[1]}</span>
    </span>
  );
}

/** Inclinação 3D sutil que segue o ponteiro — apenas mouse e sem "reduzir movimento". */
function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const finePointer = useFinePointer();
  const reduceMotion = useReducedMotion();
  const enabled = finePointer && !reduceMotion;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 160, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);
  const glareX = useTransform(px, (v) => `${Math.round(v * 100)}%`);
  const glareY = useTransform(py, (v) => `${Math.round(v * 100)}%`);
  const glare = useMotionTemplate`radial-gradient(110% 110% at ${glareX} ${glareY}, rgb(245 241 234 / 0.24), transparent 45%)`;
  const glareOpacity = useSpring(0, { stiffness: 120, damping: 22 });

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType !== 'mouse' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
    glareOpacity.set(1);
  };

  const handleLeave = () => {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  };

  return (
    <div ref={ref} className="relative [perspective:1100px]" onPointerMove={handleMove} onPointerLeave={handleLeave}>
      <motion.div className="relative [transform-style:preserve-3d]" style={enabled ? { rotateX, rotateY } : undefined}>
        {children}
        {enabled && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-[2px] mix-blend-soft-light"
            style={{ backgroundImage: glare, opacity: glareOpacity }}
          />
        )}
      </motion.div>
    </div>
  );
}

/** Face do cartão de membro na proporção de um cartão real (1,586:1). */
function CardFace({ plan, numeral, featured }: { plan: ClubPlan; numeral: string; featured: boolean }) {
  return (
    <div
      className={cn(
        'relative aspect-[1.586/1] w-full overflow-hidden rounded-[2px] border',
        featured
          ? 'bg-foil border-gold-light/60 text-obsidian shadow-[0_40px_80px_-40px_rgb(212_175_55/0.55),inset_0_1px_0_rgb(245_241_234/0.5)]'
          : 'border-line text-ivory shadow-[0_40px_70px_-40px_rgb(0_0_0/0.95),inset_0_1px_0_rgb(245_241_234/0.07)]',
      )}
      style={featured ? undefined : { backgroundImage: METAL_FACE }}
    >
      {featured && <span aria-hidden className="absolute inset-0" style={{ backgroundImage: FOIL_BRUSH }} />}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-2.5 border sm:inset-3',
          featured ? 'border-obsidian/15' : 'border-ivory/[0.06]',
        )}
      />

      <div className="relative flex h-full flex-col justify-between p-[6.5%]">
        <div className="flex items-start justify-between gap-4">
          <Medallion
            size={44}
            ring={!featured}
            className={featured ? 'shadow-[0_0_0_1px_rgb(11_12_16/0.35),0_6px_16px_-6px_rgb(11_12_16/0.5)]' : undefined}
          />
          <span
            aria-hidden
            className={cn(
              'pt-1 font-caps text-[0.56rem] font-semibold tracking-[0.42em]',
              featured ? 'text-obsidian/70' : 'text-gold/80',
            )}
          >
            TITI&apos;S STORE
          </span>
        </div>

        <CardChip featured={featured} />

        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h3
              className={cn(
                'font-caps text-base font-semibold leading-tight tracking-[0.14em] sm:text-lg',
                featured ? 'text-obsidian' : 'text-foil',
              )}
            >
              {plan.name}
            </h3>
            <p
              className={cn(
                'mt-1.5 text-[0.6rem] font-medium uppercase tracking-[0.26em]',
                featured ? 'text-obsidian/70' : 'text-mist',
              )}
            >
              {plan.kicker}
            </p>
          </div>
          <span
            aria-hidden
            className={cn('shrink-0 font-caps text-sm tracking-[0.2em]', featured ? 'text-obsidian/60' : 'text-gold/70')}
          >
            Nº {numeral}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Contato gravado do cartão, desenhado em CSS. */
function CardChip({ featured }: { featured: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block h-[26px] w-[34px] overflow-hidden rounded-[2px]',
        featured ? 'bg-obsidian/10 ring-1 ring-obsidian/25' : 'bg-foil opacity-80',
      )}
    >
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-obsidian/35" />
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-obsidian/35" />
      <span className="absolute inset-[6px] rounded-[1px] border border-obsidian/30" />
    </span>
  );
}

/** Etiqueta tecida, pespontada, costurada sobre o cartão da casa. */
function HouseLabel() {
  return (
    <span
      className="absolute -top-3.5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap border border-gold/60 bg-obsidian px-4 py-1.5 font-caps text-[0.6rem] tracking-[0.3em] text-gold-light shadow-[0_10px_24px_-12px_rgb(0_0_0/0.9)] outline-1 -outline-offset-4 outline-gold/40 outline-dashed"
      style={{ transform: 'translateZ(28px)' }}
    >
      Escolha da casa
    </span>
  );
}
