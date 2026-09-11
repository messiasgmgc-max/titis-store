'use client';

import { PauseCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { cn, whatsappLink } from '@/lib/format';
import { useSession } from '@/providers/SessionProvider';
import { PLAN_TAB_PATH } from '@/lib/auth-redirect';
import { EYEBROW } from './shared';

/** Acesso pausado pelo Titi: em vez de vender, orienta a conversar. */
export function BlockedNotice({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { profile } = useSession();
  const lines = [
    "Olá, Titi! Meu acesso à consultoria da Titi's Store aparece como pausado. Pode me ajudar?",
    profile?.full_name ? `Nome: ${profile.full_name}` : null,
    profile?.email ? `E-mail da conta: ${profile.email}` : null,
  ].filter(Boolean);

  return (
    <div
      role="status"
      className={cn('panel relative overflow-hidden rounded-3xl border-danger/30', compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8', className)}
    >
      <div className={cn('flex gap-4', compact ? 'flex-col' : 'flex-col md:flex-row md:items-center md:justify-between md:gap-10')}>
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-danger/40 text-danger">
            <PauseCircle className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={cn(EYEBROW, 'text-danger')}>Acesso pausado</p>
            <p className="mt-2 text-xl font-extrabold leading-tight tracking-[-0.02em] text-ivory">
              Seu acesso está pausado. Fale com o Titi.
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
              A consultoria foi pausada manualmente na sua conta. Antes de contratar ou renovar qualquer plano, combine
              com o Titi pelo WhatsApp: uma conversa rápida resolve.
            </p>
          </div>
        </div>
        <div className={cn('flex flex-col gap-3', compact ? 'sm:flex-row' : 'shrink-0 self-start md:self-auto')}>
          <Button href={whatsappLink(lines.join('\n'))} external className={compact ? 'w-full sm:w-auto' : undefined}>
            <WhatsAppIcon className="h-4 w-4" />
            Falar com o Titi
          </Button>
          {!compact && (
            <Button href={PLAN_TAB_PATH} variant="ghost">
              Ver minha conta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
