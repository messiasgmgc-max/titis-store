'use client';

import { LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/providers/SessionProvider';
import { useUI } from '@/providers/UIProvider';
import { plansHref, EYEBROW } from './shared';

/** Bloqueio curto para recursos pagos dentro de modais (leitura por foto, provador). */
export function ConsultingLock({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  const { user, profile } = useSession();
  const { openOverlay } = useUI();

  return (
    <div className="flex flex-col items-center px-6 pb-10 pt-6 text-center sm:px-10">
      <span className="grid h-14 w-14 place-items-center rounded-full border border-line-gold bg-gold/[0.06] text-gold">
        <LockKeyhole className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <p className={`${EYEBROW} mt-6`}>Consultoria</p>
      <p className="mt-3 max-w-md text-[1.6rem] font-extrabold leading-tight tracking-[-0.03em] text-ivory">{title}</p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-mist">{description}</p>
      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
        <Button href={plansHref(profile?.plan)} onClick={onClose} className="w-full" data-autofocus>
          Ver planos
        </Button>
        {!user && (
          <Button variant="ghost" className="w-full" onClick={() => openOverlay({ type: 'auth', mode: 'login' })}>
            Já tenho plano: entrar
          </Button>
        )}
      </div>
    </div>
  );
}
