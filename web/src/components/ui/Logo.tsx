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

/** Assinatura horizontal: medalhão + nome em capitulares. */
export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link href="/" className={cn('group inline-flex items-center gap-3', className)} aria-label="Titi's Store — início">
      <Medallion size={compact ? 36 : 42} className="transition-transform duration-700 group-hover:rotate-[8deg]" />
      <span className="flex flex-col leading-none">
        <span className="font-caps text-[1.05rem] font-semibold tracking-[0.18em] text-foil sm:text-[1.15rem]">TITI&apos;S</span>
        <span className="mt-1 text-[0.56rem] font-medium tracking-[0.5em] text-mist">STORE</span>
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
        <text fill="#D4AF37" style={{ fontFamily: 'var(--font-cinzel), serif', fontSize: 13.2, letterSpacing: 3.4 }}>
          <textPath href={`#${pathId}`}>{text}</textPath>
        </text>
      </svg>
      <Medallion size={Math.round(size * 0.44)} />
    </span>
  );
}
