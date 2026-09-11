'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/format';

interface Tilt3DProps {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Rotação máxima, em graus, em cada eixo. */
  max?: number;
  /** Elevação (translateZ, em px) enquanto o ponteiro está sobre o elemento. */
  lift?: number;
  /** Reflexo dourado que acompanha o ponteiro. */
  glare?: boolean;
  glareClassName?: string;
  perspective?: number;
}

/**
 * Inclina o conteúdo em 3D acompanhando o ponteiro. Filhos com `translateZ`
 * ganham profundidade real (o elemento preserva o espaço 3D).
 * Sem efeito em telas de toque e com "reduzir movimento" ativo.
 */
export function Tilt3D({
  children,
  className,
  style,
  max = 12,
  lift = 0,
  glare = true,
  glareClassName,
  perspective = 1200,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion || !window.matchMedia('(pointer: fine)').matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const ry = (x - 0.5) * 2 * max;
        const rx = (0.5 - y) * 2 * max * 0.75;
        el.style.transform = `perspective(${perspective}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) translateZ(${lift}px)`;
        el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      el.style.transform = '';
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [max, lift, perspective, reduceMotion]);

  return (
    <div
      ref={ref}
      className={cn(
        'group/tilt relative transform-3d transition-transform duration-300 ease-out will-change-transform',
        className,
      )}
      style={style}
    >
      {children}
      {glare && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100',
            glareClassName,
          )}
          style={{
            background:
              'radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgb(245 215 127 / 0.22), transparent 45%)',
          }}
        />
      )}
    </div>
  );
}
