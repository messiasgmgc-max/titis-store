'use client';

import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const PHRASES = [
  'Lendo a sua estação…',
  'Ajustando a formalidade ao horário…',
  'Separando peças do acervo…',
  'Conferindo o contraste…',
];

const EASE = [0.22, 1, 0.36, 1] as const;
const SEAM_START = 48;
const SEAM_END = 592;
const CYCLE = 3.2;

/** Estado de composição: uma costura sendo pespontada por uma agulha dourada. */
export function ComposingState({ seasonName }: { seasonName?: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % PHRASES.length), 1500);
    return () => window.clearInterval(timer);
  }, []);

  const seamWidth = SEAM_END - SEAM_START;
  const loop = { duration: CYCLE, ease: 'easeInOut' as const, repeat: Infinity, repeatDelay: 0.35 };

  return (
    <div className="panel relative overflow-hidden px-6 py-14 sm:px-12 sm:py-20" role="status" aria-live="polite">
      <span className="sr-only">Compondo seus looks. Aguarde alguns instantes.</span>
      <div className="glow-gold pointer-events-none absolute left-1/2 top-1/3 h-72 w-[36rem] max-w-full -translate-x-1/2" aria-hidden />

      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="flex items-center gap-4" aria-hidden>
          <span className="numeral text-xs">III</span>
          <span className="stitch w-10" />
          <span className="eyebrow">Na mesa de corte</span>
        </div>

        <svg viewBox="0 0 640 170" className="mt-10 w-full max-w-xl overflow-visible" aria-hidden>
          <defs>
            <pattern id={`${id}-weave`} width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M0 6 L6 0" className="stroke-gold/10" strokeWidth="1" />
            </pattern>
            <linearGradient id={`${id}-needle`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#aa7c11" />
              <stop offset="0.5" stopColor="#f5d77f" />
              <stop offset="1" stopColor="#d4af37" />
            </linearGradient>
            <clipPath id={`${id}-sewn`}>
              {reduce ? (
                <rect x={SEAM_START} y="60" width={seamWidth} height="40" />
              ) : (
                <motion.rect
                  x={SEAM_START}
                  y="60"
                  height="40"
                  initial={{ width: 0 }}
                  animate={{ width: [0, seamWidth] }}
                  transition={loop}
                />
              )}
            </clipPath>
          </defs>

          {/* Duas partes do tecido prestes a serem unidas */}
          <rect x="20" y="22" width="600" height="56" className="fill-surface-2" />
          <rect x="20" y="22" width="600" height="56" fill={`url(#${id}-weave)`} />
          <rect x="20" y="82" width="600" height="56" className="fill-surface-2" />
          <rect x="20" y="82" width="600" height="56" fill={`url(#${id}-weave)`} />
          <line x1="20" x2="620" y1="80" y2="80" className="stroke-obsidian" strokeWidth="4" />

          {/* Linha-guia de giz e o pesponto já costurado */}
          <line x1={SEAM_START} x2={SEAM_END} y1="80" y2="80" className="stroke-ivory/10" strokeWidth="1" strokeDasharray="2 6" />
          <g clipPath={`url(#${id}-sewn)`}>
            <line
              x1={SEAM_START}
              x2={SEAM_END}
              y1="80"
              y2="80"
              className="stroke-gold-light"
              strokeWidth="2"
              strokeDasharray="12 8"
              strokeLinecap="round"
            />
          </g>

          {/* Agulha com linha */}
          <motion.g
            initial={{ x: reduce ? SEAM_END : SEAM_START }}
            animate={reduce ? { x: SEAM_END } : { x: [SEAM_START, SEAM_END] }}
            transition={reduce ? { duration: 0 } : loop}
          >
            <motion.g
              animate={reduce ? { y: 0 } : { y: [0, 9, 0] }}
              transition={reduce ? { duration: 0 } : { duration: 0.42, repeat: Infinity, ease: 'easeInOut' }}
            >
              <g transform="translate(0 80) rotate(-22)">
                <path d="M0 -30 C -26 -64, -74 -18, -124 -52" fill="none" className="stroke-gold/50" strokeWidth="1" />
                <path d="M0 -44 L2 8 L0 18 L-2 8 Z" fill={`url(#${id}-needle)`} />
                <ellipse cx="0" cy="-34" rx="0.8" ry="3.4" className="fill-obsidian" />
              </g>
            </motion.g>
          </motion.g>
        </svg>

        <div className="tape mt-2 w-full max-w-xl opacity-50" aria-hidden />

        <div className="mt-10 min-h-[2.75rem] sm:min-h-[3rem]" aria-hidden>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="font-display text-2xl italic text-parchment sm:text-3xl"
            >
              {PHRASES[index]}
            </motion.p>
          </AnimatePresence>
        </div>

        {seasonName && (
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-smoke">
            Cartela <span className="text-gold">{seasonName}</span>
          </p>
        )}
      </div>
    </div>
  );
}
