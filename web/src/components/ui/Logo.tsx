import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/format';

const LOGO_SRC = '/titislogo.jpeg';

/**
 * Medalhão "T" recortado da logo oficial (titislogo.jpeg).
 * O recorte enquadra apenas o medalhão — a arte original não é alterada.
 */
export function Medallion({ size = 44, className, ring = true }: { size?: number; className?: string; ring?: boolean }) {
  return (
    <span
      className={cn(
        'relative inline-block shrink-0 overflow-hidden rounded-full bg-obsidian',
        ring && 'shadow-[0_0_0_1px_rgba(212,175,55,0.45),0_8px_24px_-10px_rgba(212,175,55,0.45)]',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC}
        alt=""
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{ width: '254%', height: '254%', left: '-77.3%', top: '-19.7%' }}
      />
    </span>
  );
}

const COIN_IMG_STYLE = { width: '254%', height: '254%', left: '-77.3%', top: '-19.7%' } as const;

/**
 * Medalhão como moeda de ouro em 3D, com espessura e verso.
 * `hover`: dá voltas ao passar o ponteiro. `spin`: gira devagar o tempo todo.
 */
export function Coin({
  size = 56,
  mode = 'hover',
  className,
}: {
  size?: number;
  mode?: 'hover' | 'spin';
  className?: string;
}) {
  const face =
    'absolute inset-0 overflow-hidden rounded-full bg-obsidian backface-hidden shadow-[0_0_0_1px_rgba(212,175,55,0.55)]';
  return (
    <span
      className={cn('group/coin relative inline-block [perspective:900px]', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className={cn(
          'relative block h-full w-full transform-3d',
          mode === 'spin'
            ? 'animate-coin-spin motion-reduce:animate-none'
            : 'transition-transform duration-[1300ms] ease-[var(--ease-couture)] group-hover/coin:[transform:rotateY(540deg)] motion-reduce:transition-none',
        )}
      >
        <span
          className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,#aa7c11,#f5d77f,#aa7c11)] shadow-[0_0_0_4px_#aa7c11,0_30px_50px_-20px_rgba(212,175,55,0.45)]"
          style={{ transform: 'translateZ(-4px)' }}
        />
        <span className={face}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" draggable={false} className="absolute max-w-none select-none" style={COIN_IMG_STYLE} />
        </span>
        <span className={face} style={{ transform: 'rotateY(180deg)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="" draggable={false} className="absolute max-w-none select-none" style={COIN_IMG_STYLE} />
        </span>
      </span>
    </span>
  );
}

/** Logo completa (medalhão + TITI'S STORE) com bordas esfumadas no obsidian. */
export function LogoFull({ size = 220, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <span
      className={cn('relative block', className)}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: 'radial-gradient(closest-side, #000 72%, transparent)',
        maskImage: 'radial-gradient(closest-side, #000 72%, transparent)',
      }}
    >
      <Image src={LOGO_SRC} alt="Titi's Store" fill sizes={`${size}px`} priority={priority} className="object-contain" />
    </span>
  );
}

/** Assinatura horizontal: medalhão + nome em Urbanist (TITI'S extrabold dourado, STORE espaçado). */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn('group inline-flex items-center gap-3', className)} aria-label="Titi's Store — início">
      <Medallion size={compact ? 36 : 42} className="transition-transform duration-700 group-hover:rotate-[8deg]" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.15rem] font-extrabold tracking-[0.02em] text-foil sm:text-[1.25rem]">TITI&apos;S</span>
        <span className="mt-1 text-[0.56rem] font-semibold tracking-[0.42em] text-mist">STORE</span>
      </span>
    </Link>
  );
}

/** Selo giratório com texto em círculo e medalhão ao centro. */
export function RotatingSeal({
  size = 150,
  text = "TITI'S STORE · CONSULTORIA DE IMAGEM · EST. 2023 · ",
  id = 'seal',
  className,
}: {
  size?: number;
  text?: string;
  id?: string;
  className?: string;
}) {
  const pathId = `${id}-circle`;
  return (
    <span className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-spin-slow">
        <defs>
          <path id={pathId} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <circle cx="100" cy="100" r="97" fill="rgba(11,12,16,0.72)" stroke="rgba(212,175,55,0.35)" strokeWidth="1" />
        <text
          fill="#D4AF37"
          style={{ fontFamily: 'var(--font-urbanist), sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: 2.6 }}
        >
          <textPath href={`#${pathId}`}>{text}</textPath>
        </text>
      </svg>
      <Medallion size={Math.round(size * 0.44)} />
    </span>
  );
}
