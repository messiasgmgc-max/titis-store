'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Tilt3D } from '@/components/ui/Tilt3D';
import { cn } from '@/lib/format';

/** Palco 3D do celular: entra girando, flutua e acompanha o ponteiro. */
export function PhoneStage({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={cn('relative', className)}
      initial={reduceMotion ? false : { opacity: 0, rotateY: -28, rotateX: 10, z: -120 }}
      animate={{ opacity: 1, rotateY: 0, rotateX: 0, z: 0 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1400 }}
    >
      <div className="animate-float motion-reduce:animate-none">
        {/* O reflexo fica dentro da tela do celular (PhoneMockup), não no bloco inteiro. */}
        <Tilt3D max={11} lift={20} glare={false}>
          {children}
        </Tilt3D>
      </div>
    </motion.div>
  );
}
