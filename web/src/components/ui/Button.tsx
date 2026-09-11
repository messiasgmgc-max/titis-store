import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/format';

type Variant = 'gold' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface CommonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

type AsButton = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string;
    /** Abre em nova aba (links externos, WhatsApp). */
    external?: boolean;
  };

const variantClass: Record<Variant, string> = {
  gold: 'btn-gold',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
};

const sizeClass: Record<Size, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

/** Botão da marca: retangular, caixa-alta espaçada, acabamento em folha de ouro. */
export function Button(props: AsButton | AsLink) {
  const { variant = 'gold', size = 'md', loading = false, className, children } = props;
  const classes = cn('btn', variantClass[variant], sizeClass[size], className);
  const content = (
    <>
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </>
  );

  if (typeof props.href === 'string') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { href, external, variant: _v, size: _s, loading: _l, className: _c, children: _ch, ...rest } = props as AsLink;
    if (external || href.startsWith('http')) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { variant: _v, size: _s, loading: _l, className: _c, children: _ch, type, disabled, ...rest } = props as AsButton;
  return (
    <button type={type ?? 'button'} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...rest}>
      {content}
    </button>
  );
}
