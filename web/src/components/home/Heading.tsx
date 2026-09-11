import { cn } from '@/lib/format';

/** Sobretítulo padrão: caixa-alta pequena em ouro. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-[0.18em] text-gold', className)}>{children}</p>
  );
}

interface SectionTitleProps {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: 'left' | 'center';
  id?: string;
  as?: 'h1' | 'h2';
  className?: string;
}

/** Cabeçalho de seção: sobretítulo, título extrabold e texto de apoio. */
export function SectionTitle({ eyebrow, title, lead, align = 'left', id, as = 'h2', className }: SectionTitleProps) {
  const Heading = as;
  const centered = align === 'center';
  return (
    <header className={cn('max-w-2xl', centered && 'mx-auto text-center', className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Heading
        id={id}
        className="mt-4 text-[clamp(2rem,4.4vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.03em] text-ivory"
      >
        {title}
      </Heading>
      {lead && (
        <p className={cn('mt-5 max-w-xl text-base leading-relaxed text-mist md:text-lg', centered && 'mx-auto')}>
          {lead}
        </p>
      )}
    </header>
  );
}
