'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CONSULTING_PATH } from '@/lib/site';
import { useSession } from '@/providers/SessionProvider';
import { DEFAULT_PLAN_HREF } from './links';

/** CTA principal: leva à compra do Clube ou, para quem já tem acesso, à consultoria. */
export function ConsultingCta({
  size = 'lg',
  className,
  label = 'Quero minha consultoria',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}) {
  const { hasAccess } = useSession();
  return (
    <Button href={hasAccess ? CONSULTING_PATH : DEFAULT_PLAN_HREF} size={size} className={className}>
      {hasAccess ? 'Abrir minha consultoria' : label}
      <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
    </Button>
  );
}
