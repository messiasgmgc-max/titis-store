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
  /** Em telas de toque, inclina pelo giroscópio do aparelho (padrão: ligado). */
  gyro?: boolean;
}

interface OrientationEventCtor {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

/** Interpolação suave entre o valor atual e o alvo. */
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

/**
 * Inclina o conteúdo em 3D. No computador acompanha o ponteiro; no celular acompanha
 * a inclinação do aparelho (giroscópio), sempre em relação à posição em que ele foi
 * pego. Filhos com `translateZ` ganham profundidade real. Desligado com "reduzir movimento".
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
  gyro = true,
}: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  // Ponteiro (mouse/trackpad)
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

  // Giroscópio (telas de toque)
  useEffect(() => {
    const el = ref.current;
    if (!el || !gyro || reduceMotion) return;
    if (window.matchMedia('(pointer: fine)').matches || !('DeviceOrientationEvent' in window)) return;

    let baseline: { beta: number; gamma: number } | null = null;
    let target = { rx: 0, ry: 0 };
    let current = { rx: 0, ry: 0 };
    let frame = 0;
    let running = false;
    let visible = true;

    const tick = () => {
      current = { rx: lerp(current.rx, target.rx, 0.12), ry: lerp(current.ry, target.ry, 0.12) };
      el.style.transform = `perspective(${perspective}px) rotateY(${current.ry.toFixed(2)}deg) rotateX(${current.rx.toFixed(2)}deg)`;
      // O reflexo segue a inclinação, como se a luz viesse de cima.
      el.style.setProperty('--gx', `${(50 + (current.ry / max) * 35).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(50 - (current.rx / max) * 35).toFixed(1)}%`);
      const settled = Math.abs(current.rx - target.rx) < 0.05 && Math.abs(current.ry - target.ry) < 0.05;
      if (settled && !visible) {
        running = false;
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(tick);
    };

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      // Ponto de partida: a inclinação em que o aparelho está quando a leitura começa.
      if (!baseline) baseline = { beta: event.beta, gamma: event.gamma };
      const dGamma = clamp(event.gamma - baseline.gamma, 30); // esquerda/direita
      const dBeta = clamp(event.beta - baseline.beta, 30); // frente/trás
      target = { ry: (dGamma / 30) * max, rx: (-dBeta / 30) * max * 0.75 };
      start();
    };

    // Só anima enquanto o elemento estiver na tela.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else target = { rx: 0, ry: 0 };
    });
    observer.observe(el);

    const Ctor = window.DeviceOrientationEvent as unknown as OrientationEventCtor;
    let listening = false;
    const listen = () => {
      if (listening) return;
      listening = true;
      el.dataset.gyro = 'on';
      window.addEventListener('deviceorientation', onOrientation);
    };
    // iOS exige permissão, que só pode ser pedida a partir de um toque.
    const requestOnGesture = () => {
      Ctor.requestPermission?.()
        .then((state) => {
          if (state === 'granted') listen();
        })
        .catch(() => {});
    };
    if (typeof Ctor.requestPermission === 'function') {
      window.addEventListener('touchend', requestOnGesture, { once: true, passive: true });
    } else {
      listen();
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('deviceorientation', onOrientation);
      window.removeEventListener('touchend', requestOnGesture);
      delete el.dataset.gyro;
      el.style.transform = '';
    };
  }, [gyro, max, perspective, reduceMotion]);

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
            'pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100 group-data-[gyro=on]/tilt:opacity-100',
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
