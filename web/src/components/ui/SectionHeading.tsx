import { cn } from '@/lib/format';

interface SectionHeadingProps {
  /** Numeral romano do capítulo (ex.: "II"). */
  numeral?: string;
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
  as?: 'h1' | 'h2';
}

/** Cabeçalho de capítulo editorial: numeral · pesponto · sobretítulo, título em Urbanist pesada e linha fina. */
export function SectionHeading({ numeral, eyebrow, title, lead, align = 'left', className, as = 'h2' }: SectionHeadingProps) {
  const Heading = as;
  const centered = align === 'center';
  return (
    <header className={cn('max-w-3xl', centered && 'mx-auto text-center', className)}>
      <div className={cn('flex items-center gap-4', centered && 'justify-center')}>
        {numeral && <span className="numeral text-xs font-semibold tracking-[0.16em]">{numeral}</span>}
        {numeral && <span className="stitch w-10" aria-hidden />}
        <span className="eyebrow font-semibold tracking-[0.16em]">{eyebrow}</span>
      </div>
      <Heading className="mt-5 font-display text-[clamp(1.95rem,4.3vw,3.6rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-ivory">
        {title}
      </Heading>
      {lead && (
        <p className={cn('mt-6 max-w-2xl text-base leading-relaxed text-mist md:text-lg', centered && 'mx-auto')}>{lead}</p>
      )}
    </header>
  );
}
