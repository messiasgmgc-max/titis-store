'use client';

import { motion } from 'framer-motion';

/**
 * Entrada curta ao rolar. Parte de opacidade parcial, então o conteúdo
 * continua legível antes da hidratação ou se a animação não disparar.
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'li';
}) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={{ opacity: 0.5, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
