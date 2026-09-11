'use client';

import { useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Coffee,
  Flag,
  Gem,
  Leaf,
  MapPin,
  Martini,
  MoonStar,
  Scissors,
  Snowflake,
  Sun,
  Sunrise,
  ThermometerSun,
  UtensilsCrossed,
} from 'lucide-react';
import type { ClimateId, OccasionId, StylePreference, TimeOfDayId } from '@/lib/types';
import { CLIMATES, OCCASIONS, STYLES, TIMES_OF_DAY, climateTitle } from '@/lib/stylist/knowledge';
import { interpretVenue } from '@/lib/stylist/engine';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/format';

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;

const OCCASION_ICONS: Record<OccasionId, IconType> = {
  trabalho: BriefcaseBusiness,
  casual: Coffee,
  barzinho: Martini,
  jantar: UtensilsCrossed,
  festa: Gem,
  esporte: Flag,
  outro: MapPin,
};

const TIME_ICONS: Record<TimeOfDayId, IconType> = { manha: Sunrise, tarde: Sun, noite: MoonStar };
const CLIMATE_ICONS: Record<ClimateId, IconType> = { frio: Snowflake, ameno: Leaf, quente: ThermometerSun };
const ROMAN = ['I', 'II', 'III'];
const VENUE_MIN = 3;

interface StepContextProps {
  occasion: OccasionId;
  customVenue: string;
  timeOfDay: TimeOfDayId;
  climate: ClimateId;
  style: StylePreference;
  onOccasionChange: (id: OccasionId) => void;
  onVenueChange: (value: string) => void;
  onTimeChange: (id: TimeOfDayId) => void;
  onClimateChange: (id: ClimateId) => void;
  onStyleChange: (id: StylePreference) => void;
  onBack: () => void;
  onCompose: () => void;
  composing: boolean;
}

function Row({
  numeral,
  title,
  help,
  labelId,
  children,
}: {
  numeral: string;
  title: React.ReactNode;
  help?: string;
  labelId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-6 border-t border-line pt-8 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-14">
      <div>
        <span className="numeral text-xs" aria-hidden>
          {numeral}
        </span>
        <h3 id={labelId} className="mt-2 font-display text-2xl leading-tight text-ivory sm:text-3xl">
          {title}
        </h3>
        {help && <p className="mt-2 text-sm leading-relaxed text-mist">{help}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  icons,
}: {
  label: string;
  options: { id: T; title: string; range: string }[];
  value: T;
  onChange: (id: T) => void;
  icons: Record<T, IconType>;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <div role="group" aria-label={label} className="grid grid-cols-3 border border-line">
        {options.map((o, i) => {
          const active = o.id === value;
          const Icon: IconType = icons[o.id];
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={active}
              className={cn(
                'relative flex flex-col items-center gap-1.5 px-2 py-4 text-center transition-colors duration-500',
                i > 0 && 'border-l border-line',
                active ? 'bg-gold/[0.07] text-ivory' : 'text-mist hover:bg-ivory/[0.02] hover:text-ivory',
              )}
            >
              <Icon className={cn('h-4 w-4 transition-colors', active ? 'text-gold' : 'text-smoke')} strokeWidth={1.25} aria-hidden />
              <span className="text-[0.68rem] font-medium uppercase tracking-[0.18em]">{o.title}</span>
              <span className="text-[0.62rem] text-smoke">{o.range}</span>
              <span
                className={cn(
                  'absolute inset-x-0 bottom-0 h-px origin-center bg-gold transition-transform duration-500 ease-[var(--ease-couture)]',
                  active ? 'scale-x-100' : 'scale-x-0',
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StepContext({
  occasion,
  customVenue,
  timeOfDay,
  climate,
  style,
  onOccasionChange,
  onVenueChange,
  onTimeChange,
  onClimateChange,
  onStyleChange,
  onBack,
  onCompose,
  composing,
}: StepContextProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showVenueError, setShowVenueError] = useState(false);
  const venueId = useId();
  const venueHelpId = useId();

  const venueRequired = occasion === 'outro';
  const trimmed = customVenue.trim();
  const venueValid = !venueRequired || trimmed.length >= VENUE_MIN;
  const venueError = showVenueError && !venueValid;

  const reading = useMemo(() => (trimmed.length >= VENUE_MIN ? interpretVenue(trimmed) : null), [trimmed]);
  const climateHint = reading?.climateHint ?? null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (composing) return;
    if (!venueValid) {
      setShowVenueError(true);
      inputRef.current?.focus();
      return;
    }
    onCompose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-12">
      <Row numeral="i." title={<>A <em className="italic text-gold-light">ocasião</em></>} help="Para onde você vai? A formalidade parte daqui." labelId="atelier-occasion-label">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" role="group" aria-labelledby="atelier-occasion-label">
          {OCCASIONS.map((o) => {
            const Icon = OCCASION_ICONS[o.id];
            const active = o.id === occasion;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onOccasionChange(o.id)}
                aria-pressed={active}
                data-active={active}
                className={cn('option group flex flex-col gap-3 p-4 sm:p-5', o.id === 'outro' && 'col-span-2')}
              >
                <Icon
                  className={cn('h-5 w-5 transition-colors duration-500', active ? 'text-gold' : 'text-mist group-hover:text-parchment')}
                  strokeWidth={1.25}
                  aria-hidden
                />
                <span className="font-display text-lg leading-tight text-ivory sm:text-xl">{o.title}</span>
                <span className="text-xs leading-snug text-mist">{o.description}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <label htmlFor={venueId} className="label">
            Descreva o lugar ou evento{' '}
            {venueRequired ? <span className="text-gold">· obrigatório</span> : <span className="text-smoke">· opcional</span>}
          </label>
          <input
            ref={inputRef}
            id={venueId}
            type="text"
            className={cn('field', venueError && 'border-danger/70 focus:border-danger')}
            value={customVenue}
            maxLength={140}
            autoComplete="off"
            onChange={(e) => onVenueChange(e.target.value)}
            placeholder={
              venueRequired
                ? 'Ex.: casamento na praia ao entardecer, vinícola na serra…'
                : 'Detalhes que ajudam: praia, igreja, vinícola…'
            }
            aria-required={venueRequired}
            aria-invalid={venueError || undefined}
            aria-describedby={venueHelpId}
          />
          <div id={venueHelpId} className="mt-2 min-h-[1.25rem] text-xs" aria-live="polite">
            {venueError ? (
              <p className="text-danger">Descreva o lugar ou evento com pelo menos {VENUE_MIN} caracteres.</p>
            ) : reading && reading.keywords.length > 0 ? (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-smoke">
                <span className="uppercase tracking-[0.2em] text-gold/80">Considerado</span>
                <span className="text-mist">{reading.keywords.join(' · ')}</span>
                {climateHint && climateHint !== climate && (
                  <button
                    type="button"
                    onClick={() => onClimateChange(climateHint)}
                    className="link-luxe pb-1 text-[0.6rem] text-gold-light"
                  >
                    Usar clima {climateTitle(climateHint).toLowerCase()}
                  </button>
                )}
              </p>
            ) : null}
          </div>
        </div>
      </Row>

      <Row numeral="ii." title={<>Horário e <em className="italic text-gold-light">clima</em></>} help="Luz e temperatura mudam tecido, cor e profundidade do look.">
        <div className="grid gap-6 md:grid-cols-2">
          <Segmented label="Horário" options={TIMES_OF_DAY} value={timeOfDay} onChange={onTimeChange} icons={TIME_ICONS} />
          <Segmented label="Clima" options={CLIMATES} value={climate} onChange={onClimateChange} icons={CLIMATE_ICONS} />
        </div>
      </Row>

      <Row numeral="iii." title={<>O seu <em className="italic text-gold-light">estilo</em></>} help="Como você quer ser lembrado ao chegar." labelId="atelier-style-label">
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3" role="group" aria-labelledby="atelier-style-label">
          {STYLES.map((s, i) => {
            const active = s.id === style;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStyleChange(s.id)}
                aria-pressed={active}
                data-active={active}
                className="option flex flex-col gap-2 p-5"
              >
                <span className={cn('numeral text-[0.65rem] transition-colors', active ? 'text-gold' : 'text-smoke')} aria-hidden>
                  {ROMAN[i]}
                </span>
                <span className="font-display text-2xl leading-tight text-ivory">{s.title}</span>
                <span className="text-xs leading-snug text-mist">{s.description}</span>
              </button>
            );
          })}
        </div>
      </Row>

      <div className="flex flex-col-reverse gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onBack} className="link-luxe self-start text-mist hover:text-ivory sm:self-auto">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          Voltar à leitura
        </button>
        <Button type="submit" size="lg" loading={composing} className="w-full sm:w-auto">
          {!composing && <Scissors className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
          Compor meus looks
        </Button>
      </div>
    </form>
  );
}
