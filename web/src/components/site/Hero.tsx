'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RotatingSeal } from '@/components/ui/Logo';
import { SITE } from '@/lib/site';

const EASE = [0.22, 1, 0.36, 1] as const;

const FACTS = [
  { value: '12', label: 'estações cromáticas' },
  { value: '3', label: 'etapas até o seu look' },
  { value: '1:1', label: 'atendimento pelo WhatsApp' },
] as const;

/** Linha do título revelada por máscara (desliza de baixo para cima). */
function RevealLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="-mb-[0.16em] block overflow-hidden pb-[0.16em] pr-[0.1em]">
      <motion.span
        className="block"
        initial={{ y: '108%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1.15, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['-6%', '8%']);
  const sealY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 140]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[max(640px,100svh)] flex-col overflow-hidden pt-[72px] lg:pt-[88px]"
    >
      {/* Luz dourada muito sutil */}
      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { y: glowY }}
        className="glow-gold pointer-events-none absolute -right-[18%] -top-[12%] -z-10 aspect-square w-[80vw] max-w-[980px] opacity-80"
      />
      <div
        aria-hidden
        className="glow-gold pointer-events-none absolute -bottom-[30%] -left-[20%] -z-10 aspect-square w-[60vw] max-w-[720px] opacity-40"
      />

      {/* Texto vertical na borda */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 hidden flex-col items-center justify-center gap-5 lg:flex xl:left-6"
      >
        <span className="stitch-v h-16 opacity-60" />
        <span className="vertical-text whitespace-nowrap text-[0.58rem] font-medium uppercase tracking-[0.46em] text-smoke">
          Est. {SITE.established} — Alfaiataria &amp; Imagem
        </span>
        <span className="stitch-v h-16 opacity-60" />
      </div>

      <div className="container-luxe grid flex-1 items-center gap-14 pb-12 pt-10 sm:pt-14 lg:grid-cols-12 lg:gap-8 lg:py-8">
        {/* Texto */}
        <div className="relative z-10 lg:col-span-7 lg:pr-4">
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.1 }}
          >
            <span aria-hidden className="stitch w-10 shrink-0" />
            <p className="eyebrow tracking-[0.24em] sm:tracking-[0.34em]">
              Consultoria de Imagem Masculina · Est. {SITE.established}
            </p>
          </motion.div>

          <h1
            id="hero-title"
            className="mt-7 font-display text-[clamp(2.6rem,12.5vw,5rem)] font-medium leading-[0.95] tracking-[-0.015em] text-ivory lg:text-[clamp(4.5rem,7vw,6.5rem)]"
          >
            <RevealLine delay={0.2}>A elegância</RevealLine>
            <RevealLine delay={0.32}>
              que chega <em className="pr-[0.08em] italic text-foil">antes</em>
            </RevealLine>
            <RevealLine delay={0.44}>de você.</RevealLine>
          </h1>

          <motion.p
            className="mt-8 max-w-xl text-base leading-relaxed text-mist sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
          >
            Colorimetria, alfaiataria e curadoria para que cada escolha — da reunião ao casamento — diga quem você é.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-wrap items-center gap-x-9 gap-y-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85, ease: EASE }}
          >
            <Button href="/#atelier" size="lg">
              Descobrir minha cartela
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </Button>
            <Link href="/#colecao" className="link-luxe">
              Ver a coleção
            </Link>
          </motion.div>
        </div>

        {/* Imagem */}
        <div className="relative lg:col-span-5 lg:pl-6 xl:pl-10">
          <figure className="relative">
            <motion.div
              className="frame relative aspect-[4/5] overflow-hidden bg-surface sm:aspect-[4/3] lg:aspect-auto lg:h-[min(62svh,640px)]"
              initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
              transition={{ duration: 1.4, delay: 0.25, ease: EASE }}
            >
              <motion.div className="absolute inset-x-0 -top-[12%] h-[124%]" style={reduceMotion ? undefined : { y: imageY }}>
                <motion.div
                  className="relative h-full w-full"
                  initial={{ scale: 1.12 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 2.2, delay: 0.25, ease: EASE }}
                >
                  <Image
                    src="/hero_titis_style.jpg"
                    alt="Closet de alfaiataria com ternos, gravatas e sapatos em prateleiras iluminadas em dourado"
                    fill
                    preload
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="img-editorial object-cover object-[60%_50%]"
                  />
                </motion.div>
              </motion.div>
              <div
                aria-hidden
                className="absolute inset-0 z-[1] bg-linear-to-t from-obsidian/70 via-obsidian/5 to-transparent"
              />
              <span
                aria-hidden
                className="absolute right-6 top-6 z-[3] font-caps text-[0.58rem] tracking-[0.34em] text-parchment/80"
              >
                Nº 01
              </span>
            </motion.div>
            <figcaption className="mt-4 flex items-center justify-end gap-3 text-[0.6rem] font-medium uppercase tracking-[0.28em] text-smoke">
              <span aria-hidden className="stitch w-8" />
              Alfaiataria &amp; acessórios
            </figcaption>
          </figure>

          <motion.div
            aria-hidden
            className="absolute -bottom-6 -left-2 z-10 origin-bottom-left scale-[0.7] sm:scale-90 lg:-bottom-4 lg:-left-6 lg:scale-100 xl:-left-4"
            style={reduceMotion ? undefined : { y: sealY }}
            initial={{ opacity: 0, rotate: -30 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ duration: 1.4, delay: 0.9, ease: EASE }}
          >
            <RotatingSeal size={140} id="hero-seal" />
          </motion.div>
        </div>
      </div>

      {/* Faixa de fatos */}
      <div className="container-luxe relative pb-8">
        <div aria-hidden className="tape opacity-45" />
        <ul className="mt-4 grid grid-cols-3 divide-x divide-line">
          {FACTS.map((fact, index) => (
            <motion.li
              key={fact.label}
              className="flex flex-col gap-2 px-3 first:pl-0 last:pr-0 sm:flex-row sm:items-baseline sm:gap-4 sm:px-8"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 1 + index * 0.12, ease: EASE }}
            >
              <span className="font-display text-[1.9rem] leading-none text-gold-light sm:text-[2.4rem]">{fact.value}</span>
              <span className="text-[0.6rem] font-medium uppercase leading-snug tracking-[0.16em] text-mist sm:text-[0.66rem] sm:tracking-[0.22em]">
                {fact.label}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
