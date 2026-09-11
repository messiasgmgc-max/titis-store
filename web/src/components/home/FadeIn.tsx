'use client';

import { motion } from 'framer-motion';

/**
 * Entrada ao rolar. Parte de opacidade parcial, então o conteúdo continua
 * legível antes da hidratação ou se a animação não disparar.
 * Com `rise`, o bloco entra deitado em perspectiva e se levanta até o lugar.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  as = 'div',
  rise = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'li';
  rise?: boolean;
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={rise ? { opacity: 0.35, y: 46, rotateX: 22 } : { opacity: 0.5, y: 14 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: rise ? 0.95 : 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      style={rise ? { transformPerspective: 1200, transformOrigin: '50% 0%' } : undefined}
    >
      {children}
    </Component>
  );
}
