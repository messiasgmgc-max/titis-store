'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Medallion } from '@/components/ui/Logo';
import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { useUI } from '@/providers/UIProvider';

const COPY: Record<AuthMode, { plain: string; accent: string; lead: string }> = {
  login: {
    plain: 'Entrar no',
    accent: 'Atelier',
    lead: 'Sua cartela, seus looks e seus pedidos reunidos em um só lugar.',
  },
  register: {
    plain: 'Criar sua',
    accent: 'conta',
    lead: 'Guarde a leitura de cores e os looks montados no Atelier.',
  },
  forgot: {
    plain: 'Redefinir',
    accent: 'senha',
    lead: 'Enviaremos um link seguro para o seu e-mail.',
  },
};

export function AuthModal({ mode = 'login', onClose }: { mode?: 'login' | 'register'; onClose: () => void }) {
  const { toast } = useUI();
  const [current, setCurrent] = useState<AuthMode>(mode);
  const copy = COPY[current];

  return (
    <Modal onClose={onClose} title={`${copy.plain} ${copy.accent}`} size="sm">
      <div className="relative px-6 pb-8 pt-12 sm:px-10 sm:pb-10">
        <div aria-hidden className="glow-gold pointer-events-none absolute left-1/2 top-2 h-52 w-72 -translate-x-1/2" />

        <div className="relative flex flex-col items-center text-center">
          <Medallion size={76} />
          <span className="eyebrow mt-6">Titi&apos;s Store</span>
          <p aria-hidden className="mt-3 font-display text-[2.15rem] leading-none text-ivory">
            {copy.plain} <em className="italic text-foil">{copy.accent}</em>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist">{copy.lead}</p>
          <div className="stitch mt-7 w-full" aria-hidden />
        </div>

        <AuthForm
          className="relative mt-7"
          initialMode={mode}
          onModeChange={setCurrent}
          autoFocus
          onSuccess={() => {
            toast('Boas-vindas ao Atelier.', 'success');
            onClose();
          }}
        />
      </div>
    </Modal>
  );
}
