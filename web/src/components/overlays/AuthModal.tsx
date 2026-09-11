'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Medallion } from '@/components/ui/Logo';
import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { useUI } from '@/providers/UIProvider';

const COPY: Record<AuthMode, { plain: string; accent: string; lead: string }> = {
  login: {
    plain: 'Entrar na',
    accent: 'sua conta',
    lead: 'Seu plano, sua cartela, seus looks e seus pedidos reunidos em um só lugar.',
  },
  register: {
    plain: 'Criar sua',
    accent: 'conta',
    lead: 'Guarde a leitura de cores e os looks montados na consultoria.',
  },
  forgot: {
    plain: 'Redefinir',
    accent: 'senha',
    lead: 'Enviaremos um link seguro para o seu e-mail.',
  },
};

/** Páginas em que o usuário deve continuar após entrar (compra e app da consultoria). */
const STAY_ON = /^\/(assinar|consultoria)(\/|$)/;

export function AuthModal({ mode = 'login', onClose }: { mode?: 'login' | 'register'; onClose: () => void }) {
  const { toast } = useUI();
  const router = useRouter();
  const pathname = usePathname();
  const [current, setCurrent] = useState<AuthMode>(mode);
  const copy = COPY[current];

  // Em /assinar e /consultoria o fluxo continua na própria página (com o plano da URL);
  // no resto do site, cada um cai no seu lugar. O modal só monta no navegador.
  const [next] = useState<string | null>(() =>
    STAY_ON.test(pathname) ? `${pathname}${typeof window !== 'undefined' ? window.location.search : ''}` : null,
  );

  return (
    <Modal onClose={onClose} title={`${copy.plain} ${copy.accent}`} size="sm">
      <div className="relative px-6 pb-8 pt-12 sm:px-10 sm:pb-10">
        <div aria-hidden className="glow-gold pointer-events-none absolute left-1/2 top-2 h-52 w-72 -translate-x-1/2" />

        <div className="relative flex flex-col items-center text-center">
          <Medallion size={76} />
          <span className="eyebrow mt-6">Titi&apos;s Store</span>
          <p aria-hidden className="mt-3 font-display text-[1.8rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-ivory">
            {copy.plain} <span className="text-foil">{copy.accent}</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist">{copy.lead}</p>
          <div className="stitch mt-7 w-full" aria-hidden />
        </div>

        <AuthForm
          className="relative mt-7"
          initialMode={mode}
          next={next}
          onModeChange={setCurrent}
          autoFocus
          onSuccess={(destination) => {
            toast("Boas-vindas à Titi's Store.", 'success');
            onClose();
            router.push(destination);
          }}
        />
      </div>
    </Modal>
  );
}
