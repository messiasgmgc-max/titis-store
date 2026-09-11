import Image from 'next/image';
import { Medallion } from '@/components/ui/Logo';
import { ColorDot, Swatch } from '@/components/ui/Swatch';
import { SEED_PRODUCTS } from '@/lib/catalog-seed';
import { cn } from '@/lib/format';
import { generateLooks } from '@/lib/stylist/engine';
import { getSeason } from '@/lib/stylist/knowledge';
import type { StyleRequest } from '@/lib/types';
import { PhoneStage } from './PhoneStage';

/** Cartões que flutuam na frente do celular (profundidade real no palco 3D). */
const FLOAT_CARD =
  'absolute hidden rounded-xl border border-line-gold bg-surface-2 px-3.5 py-2.5 text-xs font-bold text-ivory shadow-[0_24px_40px_-20px_rgb(0_0_0/0.9)] md:block';

/** Pedido de exemplo: o resultado abaixo é gerado pelo mesmo motor usado no app. */
const EXAMPLE_REQUEST: StyleRequest = {
  skinTone: 'parda',
  subtone: 'quente',
  contrast: 'medio',
  occasion: 'jantar',
  timeOfDay: 'noite',
  climate: 'ameno',
  style: 'contemporaneo',
};

const METAL_LABEL = { ouro: 'Ouro', prata: 'Prata', ambos: 'Ouro e prata' } as const;

const LABEL = 'text-[9px] font-semibold uppercase tracking-[0.16em]';

/** Celular desenhado em CSS com um resultado de exemplo da consultoria. */
export function PhoneMockup({ className }: { className?: string }) {
  const season = getSeason(EXAMPLE_REQUEST.skinTone, EXAMPLE_REQUEST.subtone);
  const look = generateLooks(EXAMPLE_REQUEST, SEED_PRODUCTS).looks[0];
  const pieces = look ? look.pieces.slice(0, 4) : [];

  return (
    <PhoneStage className={cn('mx-auto w-full max-w-[330px]', className)}>
    <figure className="relative transform-3d">
      <div aria-hidden className="glow-gold pointer-events-none absolute -inset-[20%] -z-10" />

      <span aria-hidden className={cn(FLOAT_CARD, 'right-0 top-24 lg:-right-16')} style={{ transform: 'translateZ(70px)' }}>
        Cartela pronta <span className="text-gold-light">na hora</span>
      </span>
      <span aria-hidden className={cn(FLOAT_CARD, 'bottom-32 left-0 lg:-left-20')} style={{ transform: 'translateZ(90px)' }}>
        <span className="text-gold-light">3 looks</span> para o jantar
      </span>

      <div className="rounded-[2.75rem] border border-line-gold bg-coal p-[9px] shadow-[0_50px_100px_-45px_rgb(0_0_0/0.95)]">
        <div className="relative overflow-hidden rounded-[2.2rem] border border-line bg-obsidian">
          {/* Barra de status */}
          <div aria-hidden className="flex h-9 items-center justify-between px-6 text-[10px] font-semibold text-mist">
            <span>9:41</span>
            <span className="h-[22px] w-[86px] rounded-full bg-black" />
            <span className="flex items-center gap-1">
              <span className="h-2 w-0.5 rounded-full bg-mist/70" />
              <span className="h-2.5 w-0.5 rounded-full bg-mist/70" />
              <span className="ml-1 h-2.5 w-5 rounded-[3px] border border-mist/70" />
            </span>
          </div>

          <div className="px-4 pb-5 pt-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Medallion size={22} ring={false} />
                <span className="text-[12px] font-bold text-ivory">Sua consultoria</span>
              </span>
              <span className={cn(LABEL, 'rounded-full border border-line-gold px-2 py-0.5 text-gold-light')}>
                Exemplo
              </span>
            </div>

            {/* Estação */}
            <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
              <Image
                src="/skin_parda.jpg"
                alt=""
                width={112}
                height={112}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className={cn(LABEL, 'text-gold')}>Sua estação</p>
                <p className="mt-1 text-[1.35rem] font-extrabold leading-none tracking-[-0.03em] text-ivory">
                  {season.name}
                </p>
                <p className="mt-1.5 truncate text-[10px] text-mist">Pele parda · subtom quente · contraste médio</p>
              </div>
            </div>

            {/* Cartela */}
            <p className={cn(LABEL, 'mt-4 text-smoke')}>Cores que valorizam</p>
            <div className="mt-2 flex justify-between gap-2">
              {season.palette.map((color) => (
                <Swatch key={color.hex} name={color.name} hex={color.hex} size="sm" showLabel={false} flip />
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line px-2.5 py-2">
                <p className="text-[10px] text-smoke">Neutros</p>
                <div className="mt-1.5 flex gap-1">
                  {season.neutrals.map((color) => (
                    <ColorDot key={color.hex} hex={color.hex} size={14} />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-line px-2.5 py-2">
                <p className="text-[10px] text-smoke">Evitar</p>
                <div className="mt-1.5 flex gap-1 opacity-70">
                  {season.avoid.map((color) => (
                    <ColorDot key={color.hex} hex={color.hex} size={14} />
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-mist">
              Metais: <span className="font-semibold text-gold-light">{METAL_LABEL[season.metals]}</span>
            </p>

            {/* Look */}
            {look && (
              <div className="mt-3.5 rounded-2xl border border-line-gold bg-surface-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(LABEL, 'text-gold')}>Jantar · noite</p>
                  <p className="text-[9px] font-semibold text-gold-light">{look.harmony}% de harmonia</p>
                </div>
                <p className="mt-1.5 text-[13px] font-bold leading-snug text-ivory">{look.title}</p>
                <ul className="mt-2.5 space-y-1.5">
                  {pieces.map((piece) => (
                    <li key={piece.slot} className="flex min-w-0 items-center gap-2 text-[10.5px]">
                      <ColorDot hex={piece.hex} size={10} />
                      <span className="min-w-0 truncate text-parchment">{piece.name}</span>
                      <span className="ml-auto shrink-0 text-smoke">{piece.color}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div
              aria-hidden
              className="mt-3.5 flex h-9 items-center justify-center rounded-full bg-foil text-[10px] font-bold uppercase tracking-[0.08em] text-obsidian"
            >
              Ver no provador virtual
            </div>
          </div>
        </div>
      </div>

      <figcaption className="mt-4 text-center text-[11px] font-medium text-smoke">
        Exemplo de resultado do app de consultoria
      </figcaption>
    </figure>
    </PhoneStage>
  );
}
