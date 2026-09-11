import { Camera, MessageCircle, Palette, ScanFace, Shirt } from 'lucide-react';
import { cn } from '@/lib/format';

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;

export const CONSULTING_BENEFITS: { title: string; description: string; icon: IconType }[] = [
  {
    title: 'Leitura por foto',
    description: 'Uma selfie revela pele, subtom e contraste do seu rosto.',
    icon: Camera,
  },
  {
    title: 'Cartela completa',
    description: 'Cores que valorizam, neutros de base e o que evitar perto do rosto.',
    icon: Palette,
  },
  {
    title: 'Looks por ocasião',
    description: 'Três looks por contexto, montados com peças da loja.',
    icon: Shirt,
  },
  {
    title: 'Provador virtual',
    description: 'Veja o look com o seu rosto antes de comprar as peças.',
    icon: ScanFace,
  },
  {
    title: 'Linha direta com o Titi',
    description: 'Curadoria e dúvidas pelo WhatsApp, no Clube.',
    icon: MessageCircle,
  },
];

/** Lista do que a consultoria libera. */
export function BenefitList({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <ul className={cn('grid gap-px overflow-hidden border border-line bg-line', className)}>
      {CONSULTING_BENEFITS.map(({ title, description, icon: Icon }) => (
        <li key={title} className={cn('flex items-start gap-4 bg-surface', compact ? 'px-4 py-3.5' : 'px-5 py-4')}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-gold text-gold">
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.95rem] font-bold leading-snug text-ivory">{title}</span>
            <span className="mt-0.5 block text-sm leading-snug text-mist">{description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
