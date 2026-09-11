'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Bookmark, BookmarkCheck, RotateCcw } from 'lucide-react';
import type { LooksResponse, Product, StyleRequest } from '@/lib/types';
import {
  CONTRASTS,
  SLOT_LABELS,
  SUBTONES,
  climateTitle,
  occasionTitle,
  skinToneName,
  styleTitle,
  timeTitle,
} from '@/lib/stylist/knowledge';
import { describeContext } from '@/lib/stylist/engine';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { whatsappLink } from '@/lib/format';
import { LookCard } from './LookCard';
import { SeasonName } from './StepTone';

const EASE = [0.22, 1, 0.36, 1] as const;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

interface StepLooksProps {
  result: LooksResponse;
  request: StyleRequest;
  seasonName: string;
  products: Product[];
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onAdjust: () => void;
  onRestart: () => void;
}

/** Resumo textual dos looks para o WhatsApp do Titi. */
export function buildLooksMessage(result: LooksResponse, request: StyleRequest, seasonName: string, products: Product[]) {
  const subtone = SUBTONES.find((s) => s.id === request.subtone)?.name ?? request.subtone;
  const contrast = CONTRASTS.find((c) => c.id === request.contrast)?.name ?? request.contrast;
  const lines = [
    "Olá, Titi! Montei meus looks na consultoria online da Titi's Store e gostaria da sua curadoria.",
    '',
    `*Cartela:* ${seasonName} (pele ${skinToneName(request.skinTone).toLowerCase()}, subtom ${subtone.toLowerCase()}, contraste ${contrast.toLowerCase()})`,
    `*Contexto:* ${occasionTitle(request.occasion)} · ${timeTitle(request.timeOfDay)} · clima ${climateTitle(request.climate).toLowerCase()} · estilo ${styleTitle(request.style).toLowerCase()}`,
  ];
  if (request.customVenue) lines.push(`*Local:* ${request.customVenue}`);
  result.looks.forEach((look, i) => {
    lines.push('', `*${ROMAN[i] ?? i + 1}. ${look.title}*`);
    look.pieces.forEach((p) => {
      const inStore = p.productId && products.some((prod) => prod.id === p.productId);
      lines.push(`• ${SLOT_LABELS[p.slot]}: ${p.name} (${p.color})${inStore ? ' — do acervo' : ''}`);
    });
  });
  lines.push('', 'Pode me ajudar a finalizar?');
  return lines.join('\n');
}

export function StepLooks({ result, request, seasonName, products, saving, saved, onSave, onAdjust, onRestart }: StepLooksProps) {
  const summary = result.summary?.trim() || describeContext(request);
  const whatsappHref = whatsappLink(buildLooksMessage(result, request, seasonName, products));

  const context: { label: string; value: string }[] = [
    { label: 'Ocasião', value: occasionTitle(request.occasion) },
    ...(request.customVenue ? [{ label: 'Local', value: request.customVenue }] : []),
    { label: 'Horário', value: timeTitle(request.timeOfDay) },
    { label: 'Clima', value: climateTitle(request.climate) },
    { label: 'Estilo', value: styleTitle(request.style) },
  ];

  return (
    <div>
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
        <div className="lg:col-span-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
            {result.looks.length === 1 ? 'Uma proposta' : `${result.looks.length === 3 ? 'Três' : result.looks.length} propostas`}
            <span className="mx-3 text-smoke">·</span>
            <span className="text-sm font-bold normal-case tracking-normal text-parchment">
              <SeasonName name={seasonName} />
            </span>
          </p>
          <p className="mt-4 text-[clamp(1.4rem,2.6vw,2rem)] font-extrabold leading-tight tracking-[-0.03em] text-ivory">{summary}</p>
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs">
            {context.map((c) => (
              <div key={c.label} className="flex items-baseline gap-2">
                <dt className="uppercase tracking-[0.2em] text-smoke">{c.label}</dt>
                <dd className="text-parchment">{c.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:col-span-4 lg:flex-col lg:items-end">
          {saved ? (
            <span className="btn btn-outline pointer-events-none border-success/50 text-success" role="status">
              <BookmarkCheck className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Salvo no seu acervo
            </span>
          ) : (
            <Button variant="outline" onClick={onSave} loading={saving}>
              {!saving && <Bookmark className="h-4 w-4" strokeWidth={1.5} aria-hidden />}
              Salvar no meu acervo
            </Button>
          )}
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="link-luxe text-gold-light">
            <WhatsAppIcon className="h-4 w-4" />
            Enviar ao Titi
          </a>
        </div>
      </div>

      {result.looks.length > 0 ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {result.looks.map((look, i) => (
            <motion.div
              key={look.id || i}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.1 + i * 0.12, ease: EASE }}
              className="h-full"
            >
              <LookCard look={look} index={i} products={products} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="panel mt-12 px-6 py-14 text-center">
          <p className="text-2xl font-extrabold tracking-[-0.03em] text-ivory">Nenhuma combinação para este contexto.</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-mist">Ajuste a ocasião ou o clima e componha novamente.</p>
        </div>
      )}

      <div className="mt-14 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <button type="button" onClick={onAdjust} className="link-luxe text-mist hover:text-ivory">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Ajustar contexto
          </button>
          <button type="button" onClick={onRestart} className="link-luxe text-mist hover:text-ivory">
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Nova leitura
          </button>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-smoke">
          Peças marcadas como <span className="text-gold">No acervo</span> abrem em detalhe e seguem direto para a sacola.
        </p>
      </div>
    </div>
  );
}
