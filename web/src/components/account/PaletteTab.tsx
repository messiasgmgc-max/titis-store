'use client';

import { RotateCcw, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Swatch } from '@/components/ui/Swatch';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';
import { formatDateBR } from '@/lib/format';
import { CONTRASTS, SUBTONES, getSeason, skinToneName } from '@/lib/stylist/knowledge';
import type { Diagnosis } from '@/lib/types';
import { SkeletonList, StatePanel, TabIntro } from './shared';

const METAL_LABEL = { ouro: 'Ouro', prata: 'Prata', ambos: 'Ouro e prata' } as const;
const METAL_FINISH = {
  ouro: 'linear-gradient(135deg, #aa7c11 0%, #f5d77f 48%, #d4af37 100%)',
  prata: 'linear-gradient(135deg, #7d828a 0%, #eceef1 48%, #a9aeb5 100%)',
} as const;

const SOURCE_LABEL: Record<Diagnosis['source'], string> = {
  ai: 'Leitura por foto',
  local: 'Leitura por foto',
  manual: 'Escolha no Atelier',
};

function MetalDot({ metal }: { metal: 'ouro' | 'prata' }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-line"
      style={{ background: METAL_FINISH[metal] }}
      aria-hidden
    />
  );
}

function SpecRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <dt className="kicker shrink-0 text-[0.62rem]">{term}</dt>
      <dd className="text-right text-[0.95rem] text-ivory">{children}</dd>
    </div>
  );
}

function SeasonTitle({ name }: { name: string }) {
  const [head, ...rest] = name.trim().split(/\s+/);
  return (
    <>
      {head}
      {rest.length > 0 && (
        <>
          {' '}
          <em className="italic text-foil">{rest.join(' ')}</em>
        </>
      )}
    </>
  );
}

export function PaletteTab() {
  const { diagnosis, ready } = useDiagnosis();
  const { openOverlay } = useUI();
  const openScanner = () => openOverlay({ type: 'scanner' });

  if (!ready) return <SkeletonList rows={2} label="Carregando sua cartela" />;

  if (!diagnosis) {
    return (
      <section aria-label="Minha cartela" className="space-y-10">
        <TabIntro numeral="I" eyebrow="Minha cartela" title={<>Sua cartela está <em className="italic text-gold-light">em branco</em></>} />
        <StatePanel
          title={
            <>
              Descubra as cores que <em className="italic text-foil">acendem</em> o seu rosto
            </>
          }
          actions={
            <>
              <Button onClick={openScanner}>
                <ScanFace className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                Leitura por foto
              </Button>
              <Button href="/#atelier" variant="outline">
                Escolher no Atelier
              </Button>
            </>
          }
        >
          <div className="mb-8 flex items-end justify-center gap-2 sm:gap-3" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="pinked block aspect-[3/4] w-10 bg-surface-2 sm:w-14"
                style={{
                  transform: `translateY(${[6, 0, -4, 0, 6][i]}px) rotate(${[-6, -3, 0, 3, 6][i]}deg)`,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgb(212 175 55 / 0.08) 0 1px, transparent 1px 5px)',
                }}
              />
            ))}
          </div>
          <p>
            Faça a leitura por foto ou indique seu tom de pele no Atelier. Sua estação cromática, as cores que
            valorizam e as que convém evitar ficam guardadas aqui.
          </p>
        </StatePanel>
      </section>
    );
  }

  const season = getSeason(diagnosis.skinTone, diagnosis.subtone);
  const paletteHex = new Set(diagnosis.palette.map((c) => c.hex.toLowerCase()));
  const neutrals = season.neutrals.filter((c) => !paletteHex.has(c.hex.toLowerCase()));
  const subtoneName = SUBTONES.find((s) => s.id === diagnosis.subtone)?.name ?? diagnosis.subtone;
  const contrastName = CONTRASTS.find((c) => c.id === diagnosis.contrast)?.name ?? diagnosis.contrast;

  return (
    <section aria-label="Minha cartela" className="space-y-10">
      <TabIntro
        numeral="I"
        eyebrow="Minha cartela"
        title={
          <>
            As cores que <em className="italic text-gold-light">vestem</em> você
          </>
        }
        lead="Use a cartela como guia: as cores de destaque ficam perto do rosto; a base neutra sustenta calças, sapatos e sobreposições."
        aside={
          <div className="flex flex-wrap gap-3">
            <Button onClick={openScanner} variant="outline" size="sm">
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              Refazer leitura
            </Button>
            <Button href="/#atelier" size="sm">
              Montar looks
            </Button>
          </div>
        }
      />

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <div className="panel-gold frame relative overflow-hidden p-8 sm:p-10">
            <span className="glow-gold pointer-events-none absolute -right-16 -top-16 h-56 w-56" aria-hidden />
            <p className="kicker relative">Estação cromática · {season.family}</p>
            <p className="relative mt-5 font-display text-[clamp(3rem,9vw,5.4rem)] leading-[0.92] text-ivory">
              <SeasonTitle name={diagnosis.season} />
            </p>
            <div className="stitch relative mt-8 w-full" aria-hidden />
            <dl className="relative mt-2 divide-y divide-line">
              <SpecRow term="Tom de pele">{skinToneName(diagnosis.skinTone)}</SpecRow>
              <SpecRow term="Subtom">{subtoneName}</SpecRow>
              <SpecRow term="Contraste">{contrastName}</SpecRow>
              <SpecRow term="Metais">
                <span className="inline-flex items-center gap-2">
                  {season.metals !== 'prata' && <MetalDot metal="ouro" />}
                  {season.metals !== 'ouro' && <MetalDot metal="prata" />}
                  {METAL_LABEL[season.metals]}
                </span>
              </SpecRow>
              <SpecRow term="Registro">
                {SOURCE_LABEL[diagnosis.source]}
                <span className="block text-xs text-smoke">{formatDateBR(diagnosis.createdAt)}</span>
              </SpecRow>
            </dl>
          </div>
        </div>

        <div className="space-y-12 lg:col-span-7">
          <div>
            <h3 className="kicker">Cores que valorizam</h3>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-7">
              {diagnosis.palette.map((c) => (
                <li key={`${c.name}-${c.hex}`}>
                  <Swatch name={c.name} hex={c.hex} size="lg" />
                </li>
              ))}
            </ul>
          </div>

          {neutrals.length > 0 && (
            <div>
              <h3 className="kicker">Base neutra</h3>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-6">
                {neutrals.map((c) => (
                  <li key={`${c.name}-${c.hex}`}>
                    <Swatch name={c.name} hex={c.hex} size="md" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.avoid.length > 0 && (
            <div>
              <h3 className="kicker">Evite perto do rosto</h3>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-6">
                {diagnosis.avoid.map((c) => (
                  <li key={`${c.name}-${c.hex}`}>
                    <Swatch name={c.name} hex={c.hex} size="md" muted />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diagnosis.notes && (
            <div className="relative border-l border-line-gold pl-6">
              <h3 className="kicker">Parecer</h3>
              <p className="mt-3 font-display text-[clamp(1.35rem,2.6vw,1.75rem)] italic leading-snug text-parchment">
                {diagnosis.notes}
              </p>
            </div>
          )}

          {diagnosis.recommendations.length > 0 && (
            <div>
              <h3 className="kicker">Peças e tecidos sugeridos</h3>
              <ul className="prose-luxe mt-4 grid gap-x-10 text-[0.95rem] text-mist sm:grid-cols-2">
                {diagnosis.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
