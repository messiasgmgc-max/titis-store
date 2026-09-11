'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/providers/SessionProvider';
import { cn } from '@/lib/format';

/** Relê o perfil para buscar a liberação do acesso (confirmação do Titi ou webhook do pagamento). */
export function RefreshAccessButton({
  className,
  variant = 'outline',
  size = 'md',
  align = 'left',
}: {
  className?: string;
  variant?: 'gold' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
}) {
  const { refreshProfile, hasAccess, user } = useSession();
  const [pending, setPending] = useState(false);
  const [checked, setChecked] = useState(false);

  const onClick = async () => {
    if (pending) return;
    setPending(true);
    try {
      await refreshProfile();
      setChecked(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-3', align === 'center' ? 'items-center text-center' : 'items-start', className)}>
      <Button variant={variant} size={size} loading={pending} onClick={() => void onClick()} disabled={!user}>
        {!pending && <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
        Atualizar acesso
      </Button>
      <p aria-live="polite" className="min-h-[1.25rem] text-xs leading-relaxed text-mist">
        {checked && !pending
          ? hasAccess
            ? 'Acesso liberado na sua conta.'
            : 'Ainda não há liberação na sua conta. Se você já pagou, aguarde a confirmação e tente de novo em instantes.'
          : null}
      </p>
    </div>
  );
}
