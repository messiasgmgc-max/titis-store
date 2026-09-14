'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Tilt3D } from '@/components/ui/Tilt3D';
import { cn } from '@/lib/format';

/** Palco 3D do celular: entra girando, flutua e acompanha o ponteiro/giroscópio com alta intensidade. */
export function PhoneStage({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={cn('relative', className)}
      initial={reduceMotion ? false : { opacity: 0, rotateY: -32, rotateX: 14, z: -150 }}
      animate={{ opacity: 1, rotateY: 0, rotateX: 0, z: 0 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 1000 }}
    >
      <div className="animate-float motion-reduce:animate-none">
        <Tilt3D max={28} lift={32} perspective={650} glare={true}>
          {children}
        </Tilt3D>
      </div>
    </motion.div>
  );
}
