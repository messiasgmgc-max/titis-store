'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, RotateCcw, Ruler, ScanFace, Sparkles, User } from 'lucide-react';
import type { BodyType, ContrastLevel, Diagnosis, Gender, SkinToneId, Subtone } from '@/lib/types';
import {
  BODY_TYPES,
  CONTRASTS,
  SKIN_TONES,
  SUBTONES,
  estimateSizes,
  getSeason,
  type SeasonProfile,
} from '@/lib/stylist/knowledge';
import { Button } from '@/components/ui/Button';
import { ColorDot, Swatch } from '@/components/ui/Swatch';
import { cn } from '@/lib/format';

const EASE = [0.22, 1, 0.36, 1] as const;
const ROMAN = ['I', 'II', 'III', 'IV'];

const METALS: Record<SeasonProfile['metals'], { label: string; dots: string[] }> = {
  ouro: { label: 'Ouro', dots: ['#D4AF37'] },
  prata: { label: 'Prata', dots: ['#C0C4CA'] },
  ambos: { label: 'Ouro e prata', dots: ['#D4AF37', '#C0C4CA'] },
};

/** Nome da estação com a segunda palavra em folha de ouro ("Outono Quente"). */
export function SeasonName({ name }: { name: string }) {
  const [first, ...rest] = name.trim().split(/\s+/);
  if (rest.length === 0) return <>{first}</>;
  return (
    <>
      {first} <span className="text-foil">{rest.join(' ')}</span>
    </>
  );
}

interface StepToneProps {
  tone: SkinToneId;
  subtone: Subtone;
  contrast: ContrastLevel;
  onToneChange: (tone: SkinToneId) => void;
  onSubtoneChange: (subtone: Subtone) => void;
  onContrastChange: (contrast: ContrastLevel) => void;
  weightKg: number | null;
  heightCm: number | null;
  age: number | null;
  gender: Gender;
  bodyType: BodyType;
  onWeightChange: (w: number | null) => void;
  onHeightChange: (h: number | null) => void;
  onAgeChange: (a: number | null) => void;
  onGenderChange: (g: Gender) => void;
  onBodyTypeChange: (b: BodyType) => void;
  diagnosis: Diagnosis | null;
  onScan: () => void;
  onRestorePhoto: () => void;
  onContinue: () => void;
}

export function StepTone({
  tone,
  subtone,
  contrast,
  onToneChange,
  onSubtoneChange,
  onContrastChange,
  weightKg,
  heightCm,
  age,
  gender,
  bodyType,
  onWeightChange,
  onHeightChange,
  onAgeChange,
  onGenderChange,
  onBodyTypeChange,
  diagnosis,
  onScan,
  onRestorePhoto,
  onContinue,
}: StepToneProps) {
  const season = getSeason(tone, subtone);
  const fromPhoto = diagnosis && diagnosis.source !== 'manual' ? diagnosis : null;
  const matchesPhoto =
    !!fromPhoto && fromPhoto.skinTone === tone && fromPhoto.subtone === subtone && fromPhoto.contrast === contrast;
  const note = matchesPhoto && fromPhoto?.notes ? fromPhoto.notes : season.note;
  const activeContrast = CONTRASTS.find((c) => c.id === contrast);
  const metal = METALS[season.metals];
  const estimated = estimateSizes(weightKg, heightCm, bodyType, gender);
  const activeBodyType = BODY_TYPES.find((b) => b.id === bodyType);

  return (
    <div className="space-y-14">
      {/* Profundidade da pele */}
      <div>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p id="atelier-tone-label" className="kicker">
              <span className="numeral mr-3 text-[0.7rem]">i.</span>Profundidade da pele
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-mist">
              Escolha o retrato mais próximo de você, ou deixe a leitura por foto indicar o caminho.
            </p>
          </div>
          <Button variant="outline" onClick={onScan} className="self-start sm:self-auto">
            <ScanFace className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Fazer leitura por foto
          </Button>
        </div>

        {fromPhoto && (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line-gold/60 bg-gold/[0.04] px-4 py-3 text-xs">
            <ScanFace className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
            {matchesPhoto ? (
              <span className="uppercase tracking-[0.2em] text-parchment">
                Leitura por foto aplicada <span className="text-gold">·</span>{' '}
                <span className="text-gold-light">{fromPhoto.season}</span>
              </span>
            ) : (
              <>
                <span className="uppercase tracking-[0.2em] text-mist">
                  Leitura por foto: <span className="text-gold-light">{fromPhoto.season}</span>
                  <span className="text-smoke"> · seleção ajustada à mão</span>
                </span>
                <button
                  type="button"
                  onClick={onRestorePhoto}
                  className="link-luxe ml-auto text-[0.62rem] text-gold-light"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                  Restaurar leitura
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" role="group" aria-labelledby="atelier-tone-label">
          {SKIN_TONES.map((t, i) => {
            const active = t.id === tone;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToneChange(t.id)}
                aria-pressed={active}
                data-active={active}
                className="option group block overflow-hidden rounded-[22px] p-0"
              >
                <span className={cn('relative block aspect-[3/4] w-full overflow-hidden rounded-[inherit] bg-coal [--frame-radius:12px]', active && 'frame')}>
                  <Image
                    src={t.image}
                    alt={`Retrato de referência: pele ${t.name.toLowerCase()}`}
                    fill
                    sizes="(min-width: 1320px) 300px, (min-width: 1024px) 23vw, 46vw"
                    className={cn(
                      'img-editorial object-cover transition-[transform,filter] duration-[1400ms] ease-[var(--ease-couture)] group-hover:scale-[1.045]',
                      !active && 'brightness-[0.82] group-hover:brightness-100',
                    )}
                  />
                  <span className="absolute inset-0 bg-linear-to-t from-obsidian via-obsidian/15 to-transparent" aria-hidden />
                  <span className="numeral absolute left-4 top-4 z-[3] text-[0.65rem]" aria-hidden>
                    {ROMAN[i]}
                  </span>
                  <span
                    className={cn(
                      'absolute right-4 top-4 z-[3] grid h-6 w-6 place-items-center rounded-full border transition-all duration-500',
                      active ? 'border-gold bg-gold text-obsidian' : 'border-ivory/30 bg-obsidian/40 text-transparent',
                    )}
                    aria-hidden
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 z-[3] p-4 sm:p-5">
                    <span className="block text-xl font-extrabold leading-tight tracking-[-0.03em] text-ivory sm:text-2xl">{t.name}</span>
                    <span className="mt-1 block text-[0.7rem] leading-snug text-mist sm:text-xs">{t.subtitle}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
        {/* Subtom e contraste */}
        <div className="space-y-12 lg:col-span-5">
          <div>
            <p id="atelier-subtone-label" className="kicker">
              <span className="numeral mr-3 text-[0.7rem]">ii.</span>Subtom
            </p>
            <p className="mt-3 text-sm leading-relaxed text-mist">Observe as veias do pulso sob luz natural.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-1" role="group" aria-labelledby="atelier-subtone-label">
              {SUBTONES.map((s) => {
                const active = s.id === subtone;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSubtoneChange(s.id)}
                    aria-pressed={active}
                    data-active={active}
                    className="option group flex items-start gap-4 rounded-[20px] px-4 py-4"
                  >
                    <span
                      className={cn(
                        'mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition-colors duration-500',
                        active ? 'border-gold' : 'border-ivory/30 group-hover:border-ivory/50',
                      )}
                      aria-hidden
                    >
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgb(212_175_55/0.6)] transition-transform duration-500 ease-[var(--ease-couture)]',
                          active ? 'scale-100' : 'scale-0',
                        )}
                      />
                    </span>
                    <span>
                      <span className="block text-xl font-bold leading-tight tracking-[-0.02em] text-ivory">{s.name}</span>
                      <span className="mt-1 block text-xs leading-snug text-mist">{s.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p id="atelier-contrast-label" className="kicker">
              <span className="numeral mr-3 text-[0.7rem]">iii.</span>Contraste
            </p>
            <div className="mt-5 flex flex-wrap gap-2" role="group" aria-labelledby="atelier-contrast-label">
              {CONTRASTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  onClick={() => onContrastChange(c.id)}
                  aria-pressed={c.id === contrast}
                  data-active={c.id === contrast}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {activeContrast && <p className="mt-3 text-xs leading-relaxed text-smoke">{activeContrast.hint}</p>}
          </div>
        </div>

        {/* Prévia viva da estação */}
        <aside className="panel-gold frame relative overflow-hidden rounded-[var(--radius-panel)] p-7 sm:p-10 lg:col-span-7" aria-live="polite">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Sua estação</span>
            <span className="kicker text-[0.62rem]">Família {season.family}</span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${season.name}-${matchesPhoto ? 'foto' : 'manual'}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <h3 className="mt-5 font-display text-[clamp(2.5rem,5vw,3.9rem)] leading-[0.98] text-ivory">
                <SeasonName name={season.name} />
              </h3>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-parchment/85 sm:text-base">{note}</p>

              <div className="mt-8">
                <p className="label">Cores de destaque</p>
                <div className="flex flex-wrap gap-3">
                  {season.palette.map((s) => (
                    <Swatch key={s.hex + s.name} name={s.name} hex={s.hex} size="md" />
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="label">Neutros de base</p>
                <div className="flex flex-wrap gap-3">
                  {season.neutrals.map((s) => (
                    <Swatch key={s.hex + s.name} name={s.name} hex={s.hex} size="md" />
                  ))}
                </div>
              </div>

              <div className="stitch my-8" aria-hidden />

              <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="label">Evitar perto do rosto</p>
                  <div className="flex flex-wrap gap-3">
                    {season.avoid.map((s) => (
                      <Swatch key={s.hex + s.name} name={s.name} hex={s.hex} size="sm" muted />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="label">Metais indicados</p>
                  <p className="flex items-center gap-2 text-sm text-ivory">
                    <span className="flex -space-x-1">
                      {metal.dots.map((hex) => (
                        <ColorDot key={hex} hex={hex} size={14} />
                      ))}
                    </span>
                    {metal.label}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </aside>
      </div>

      {/* iv. Biometria & Alfaiataria sob medida */}
      <div className="rounded-[var(--radius-panel)] border border-line bg-surface p-7 sm:p-10 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p id="atelier-bio-label" className="kicker">
              <span className="numeral mr-3 text-[0.7rem]">iv.</span>Biometria & Alfaiataria sob Medida
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
              Suas medidas anatômicas e biotipo orientam a modelagem, as proporções áureas e o cálculo exato dos tamanhos das peças no catálogo da loja.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-line-gold/60 bg-gold/[0.06] px-4 py-2 text-xs text-gold sm:self-auto">
            <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span>
              Tamanhos calculados: <strong className="font-semibold text-parchment">Camisas {estimated.top} · Calças {estimated.bottom}</strong>
            </span>
          </div>
        </div>

        {/* Linha 1: Gênero, Peso, Altura, Idade */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Gênero */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke block">Gênero</label>
            <div className="mt-2 flex rounded-2xl border border-line bg-coal/70 p-1">
              {(['masculino', 'feminino', 'outro'] as Gender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onGenderChange(g)}
                  className={cn(
                    'flex-1 rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 capitalize',
                    gender === g
                      ? 'bg-gold text-obsidian shadow-sm'
                      : 'text-mist hover:text-parchment',
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Peso */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke flex items-center justify-between">
              <span>Peso Corporal</span>
              <span className="font-mono text-xs font-bold text-gold">{weightKg ? `${weightKg} kg` : '—'}</span>
            </label>
            <div className="relative mt-2">
              <input
                type="number"
                min="40"
                max="250"
                value={weightKg ?? ''}
                onChange={(e) => onWeightChange(e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 78"
                className="w-full rounded-2xl border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder-smoke focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
              <span className="absolute right-4 top-2.5 text-xs text-smoke">kg</span>
            </div>
          </div>

          {/* Altura */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke flex items-center justify-between">
              <span>Altura</span>
              <span className="font-mono text-xs font-bold text-gold">{heightCm ? `${heightCm} cm` : '—'}</span>
            </label>
            <div className="relative mt-2">
              <input
                type="number"
                min="120"
                max="240"
                value={heightCm ?? ''}
                onChange={(e) => onHeightChange(e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 178"
                className="w-full rounded-2xl border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder-smoke focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
              <span className="absolute right-4 top-2.5 text-xs text-smoke">cm</span>
            </div>
          </div>

          {/* Idade */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke flex items-center justify-between">
              <span>Idade</span>
              <span className="font-mono text-xs font-bold text-gold">{age ? `${age} anos` : '—'}</span>
            </label>
            <div className="relative mt-2">
              <input
                type="number"
                min="14"
                max="110"
                value={age ?? ''}
                onChange={(e) => onAgeChange(e.target.value ? Number(e.target.value) : null)}
                placeholder="Ex: 30"
                className="w-full rounded-2xl border border-line bg-coal px-4 py-2.5 text-sm text-ivory placeholder-smoke focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
              <span className="absolute right-4 top-2.5 text-xs text-smoke">anos</span>
            </div>
          </div>
        </div>

        {/* Linha 2: Biotipo corporal */}
        <div className="mt-8 border-t border-line/60 pt-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-smoke">
              Biotipo Corporal & Proporção da Silhueta
            </label>
            <span className="text-xs text-smoke">Sugerido pelas medidas com ajuste livre</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {BODY_TYPES.map((b) => {
              const active = b.id === bodyType;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBodyTypeChange(b.id)}
                  aria-pressed={active}
                  data-active={active}
                  className="chip text-xs"
                >
                  {b.name}
                </button>
              );
            })}
          </div>

          {activeBodyType && (
            <div className="mt-5 rounded-2xl border border-line-gold/40 bg-gold/[0.04] p-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold uppercase tracking-wider text-gold">
                  {activeBodyType.name}
                </span>
                <span className="text-smoke">· {activeBodyType.description}</span>
              </div>
              <p className="mt-2 leading-relaxed text-parchment/90">
                <strong className="text-gold-light">Diretriz de Alfaiataria: </strong>
                {activeBodyType.tailoringAdvice}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-smoke">
          Próximo: <span className="text-mist">ocasião, horário e clima</span>
        </p>
        <Button size="lg" onClick={onContinue} className="w-full sm:w-auto">
          Continuar
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
