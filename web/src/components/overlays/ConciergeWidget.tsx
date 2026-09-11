'use client';

import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ArrowUp, RotateCcw, X } from 'lucide-react';
import { Medallion } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useUI } from '@/providers/UIProvider';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useSession } from '@/providers/SessionProvider';
import { sendConcierge } from '@/lib/api';
import { whatsappLink } from '@/lib/format';
import { CONSULTING_PATH } from '@/lib/site';
import type { ChatMessage } from '@/lib/types';

const STORAGE_KEY = 'titis:concierge:v1';
const HISTORY_LIMIT = 12;
const STORED_LIMIT = 40;
const MAX_CHARS = 1000;
const EASE = [0.22, 1, 0.36, 1] as const;

const PLANS_PATH = '/assinar?plano=clube';

const SUGGESTIONS = [
  'Como funciona a consultoria?',
  'Qual plano escolher?',
  'Que sapato usar com calça cinza?',
  'Traje para casamento à tarde',
];

// ---------------------------------------------------------------------------
// Histórico (sessionStorage)
// ---------------------------------------------------------------------------
function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
}

function readHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isChatMessage).slice(-STORED_LIMIT) : [];
  } catch {
    return [];
  }
}

/** Últimas mensagens, sempre começando por uma pergunta do cliente. */
function historyForRequest(messages: ChatMessage[]): ChatMessage[] {
  const recent = messages.slice(-HISTORY_LIMIT);
  while (recent.length > 1 && recent[0].role === 'assistant') recent.shift();
  return recent;
}

// ---------------------------------------------------------------------------
// Renderização segura do texto do assistente (sem HTML injetado)
// ---------------------------------------------------------------------------
type ParagraphBlock = { kind: 'p'; lines: string[] };
type ListBlock = { kind: 'ul' | 'ol'; items: string[] };
type Block = ParagraphBlock | ListBlock;

const BULLET = /^[-•*–]\s+(.+)$/;
const NUMBERED = /^\d{1,2}[.)]\s+(.+)$/;

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      if (current) blocks.push(current);
      current = null;
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    const item = bullet?.[1] ?? numbered?.[1];

    if (item !== undefined) {
      const kind: ListBlock['kind'] = bullet ? 'ul' : 'ol';
      if (current && current.kind === kind) {
        current.items.push(item);
      } else {
        if (current) blocks.push(current);
        current = { kind, items: [item] };
      }
      continue;
    }

    const content = line.replace(/^#{1,6}\s+/, '');
    if (current && current.kind === 'p') {
      current.lines.push(content);
    } else {
      if (current) blocks.push(current);
      current = { kind: 'p', lines: [content] };
    }
  }

  if (current) blocks.push(current);
  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*\n]+?\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return <Fragment key={index}>{part.replace(/\*+|`+/g, '')}</Fragment>;
    });
}

function RichText({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2.5 [&_strong]:font-semibold [&_strong]:text-gold-light">
      {blocks.map((block, i) => {
        if (block.kind === 'p') {
          return (
            <p key={i}>
              {block.lines.map((line, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {renderInline(line)}
                </Fragment>
              ))}
            </p>
          );
        }
        if (block.kind === 'ol') {
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-[0.8em] marker:text-gold">
              {block.items.map((entry, j) => (
                <li key={j} className="pl-1">
                  {renderInline(entry)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={i} className="space-y-1.5 pl-4">
            {block.items.map((entry, j) => (
              <li
                key={j}
                className="relative before:absolute before:-left-4 before:top-[0.72em] before:h-px before:w-2 before:bg-gold"
              >
                {renderInline(entry)}
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}

function AssistantBubble({ text, footnote }: { text: string; footnote?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="max-w-[92%] border-l border-gold/45 bg-surface-2 px-4 py-3 text-[0.9rem] leading-relaxed text-ivory"
    >
      <RichText text={text} />
      {footnote && <p className="mt-3 border-t border-line pt-2.5 text-[0.7rem] leading-snug text-smoke">{footnote}</p>}
    </motion.div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex justify-end"
    >
      <p className="max-w-[85%] whitespace-pre-wrap break-words border border-gold/45 px-4 py-2.5 text-[0.9rem] leading-relaxed text-parchment">
        {text}
      </p>
    </motion.div>
  );
}

/** Pré-venda: convida para os planos (ou abre a consultoria de quem já tem acesso). */
function planCta(hasAccess: boolean) {
  return hasAccess
    ? {
        href: CONSULTING_PATH,
        kicker: 'Seu plano está ativo',
        title: 'Sua consultoria já está liberada.',
        text: 'Cartela, looks por ocasião e provador virtual te esperam.',
        strip: 'Plano ativo',
        action: 'Abrir minha consultoria',
      }
    : {
        href: PLANS_PATH,
        kicker: 'Consultoria com o Titi',
        title: 'Quer sua cartela e looks montados pelo Titi?',
        text: 'Leitura de cores por foto, looks para cada ocasião e provador virtual com o seu rosto.',
        strip: 'Cartela e looks montados pelo Titi',
        action: 'Ver planos',
      };
}

function PlanCard({ hasAccess, onNavigate }: { hasAccess: boolean; onNavigate: () => void }) {
  const cta = planCta(hasAccess);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
      className="relative max-w-[92%] overflow-hidden border border-line-gold bg-gold/[0.05] px-4 py-4"
    >
      <span aria-hidden className="glow-gold pointer-events-none absolute -right-10 -top-12 h-32 w-32" />
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">{cta.kicker}</p>
      <p className="relative mt-2 font-display text-[1.05rem] font-bold leading-[1.2] tracking-[-0.02em] text-ivory">
        {cta.title}
      </p>
      <p className="relative mt-1.5 text-xs leading-relaxed text-mist">{cta.text}</p>
      <Button size="sm" href={cta.href} onClick={onNavigate} className="relative mt-4">
        {cta.action}
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </Button>
    </motion.div>
  );
}

function PlanStrip({ hasAccess, onNavigate }: { hasAccess: boolean; onNavigate: () => void }) {
  const cta = planCta(hasAccess);
  return (
    <Link
      href={cta.href}
      onClick={onNavigate}
      className="group mb-3 flex items-center justify-between gap-3 border-b border-line-gold/60 pb-2.5 text-xs text-mist transition-colors hover:text-parchment"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
        <span className="truncate font-medium">{cta.strip}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-light">
        {cta.action}
        <ArrowRight
          className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden
        />
      </span>
    </Link>
  );
}

function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="O concierge está escrevendo"
      className="flex w-fit items-center gap-1.5 border-l border-gold/45 bg-surface-2 px-4 py-4"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-gold"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------
export function ConciergeWidget() {
  const { overlay, conciergeOpen, setConciergeOpen } = useUI();
  const { diagnosis } = useDiagnosis();
  const { hasAccess } = useSession();
  // O painel só aparece após interação, então ler o sessionStorage aqui não altera o HTML hidratado.
  const [messages, setMessages] = useState<ChatMessage[]>(readHistory);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const titleId = useId();
  const inputId = useId();
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const wasOpenRef = useRef(false);

  const close = useCallback(() => setConciergeOpen(false), [setConciergeOpen]);

  // Persistência da conversa nesta aba.
  useEffect(() => {
    try {
      if (messages.length) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-STORED_LIMIT)));
      else window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* armazenamento indisponível */
    }
  }, [messages]);

  // Foco ao abrir, ESC para fechar e retorno do foco ao lançador.
  useEffect(() => {
    if (!conciergeOpen) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        launcherRef.current?.focus({ preventScroll: true });
      }
      return;
    }
    wasOpenRef.current = true;
    const timer = window.setTimeout(() => {
      if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true });
      else panelRef.current?.focus({ preventScroll: true });
    }, 180);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
    };
  }, [conciergeOpen, close]);

  // Mantém a última mensagem visível.
  useEffect(() => {
    if (!conciergeOpen) return;
    const el = logRef.current;
    if (!el) return;
    const frame = window.requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
    return () => window.cancelAnimationFrame(frame);
  }, [conciergeOpen, messages.length, pending, failed]);

  const request = useCallback(
    async (history: ChatMessage[]) => {
      requestRef.current += 1;
      const requestId = requestRef.current;
      setPending(true);
      setFailed(false);
      try {
        const response = await sendConcierge({
          messages: historyForRequest(history),
          diagnosis: diagnosis
            ? {
                skinTone: diagnosis.skinTone,
                subtone: diagnosis.subtone,
                season: diagnosis.season,
                palette: diagnosis.palette,
              }
            : null,
        });
        if (requestId !== requestRef.current) return;
        const reply = response.reply?.trim();
        if (!reply) throw new Error('Resposta vazia');
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } catch {
        if (requestId === requestRef.current) setFailed(true);
      } finally {
        if (requestId === requestRef.current) setPending(false);
      }
    },
    [diagnosis],
  );

  function resetTextareaHeight() {
    if (inputRef.current) inputRef.current.style.height = '';
  }

  function send(text: string) {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || pending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setDraft('');
    resetTextareaHeight();
    void request(next);
  }

  function retry() {
    if (!pending && messages.length > 0) void request(messages);
  }

  function reset() {
    requestRef.current += 1;
    setMessages([]);
    setPending(false);
    setFailed(false);
    setDraft('');
    resetTextareaHeight();
    inputRef.current?.focus({ preventScroll: true });
  }

  function onDraftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }

  function onDraftKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(draft);
    }
  }

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const lastQuestion = [...messages].reverse().find((m) => m.role === 'user')?.content;
  const whatsappHref = whatsappLink(
    lastQuestion
      ? `Olá, Titi! Vim pelo concierge do site e gostaria de ajuda com: ${lastQuestion}`
      : 'Olá, Titi! Vim pelo concierge do site e gostaria de uma orientação de estilo.',
  );
  const welcome = diagnosis
    ? `Boas-vindas à Titi's Store. Sua estação é **${diagnosis.season}**. Posso sugerir combinações com a sua cartela.`
    : "Boas-vindas à Titi's Store. Tiro dúvidas de estilo, trajes para cada ocasião e explico como funciona a consultoria com o Titi.";
  const showLauncher = !conciergeOpen && !overlay;

  return (
    <>
      <AnimatePresence>
        {showLauncher && (
          <motion.div
            key="concierge-launcher"
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="fixed bottom-5 right-5 z-[60] sm:bottom-7 sm:right-7"
          >
            <button
              ref={launcherRef}
              type="button"
              onClick={() => setConciergeOpen(true)}
              aria-haspopup="dialog"
              aria-label="Abrir o assistente de estilo da Titi's Store"
              className="group relative flex items-center rounded-full"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 translate-x-2 items-center gap-2 whitespace-nowrap border border-line-gold bg-surface py-2 pl-2.5 pr-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light opacity-0 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.85)] transition-all duration-500 ease-[var(--ease-couture)] group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:flex"
              >
                <span className="h-1.5 w-1.5 rounded-full border border-gold/70" />
                Assistente de estilo
              </span>
              <span className="relative grid place-items-center">
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full border border-gold/60"
                  initial={{ scale: 1, opacity: 0.55 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeOut' }}
                />
                <Medallion
                  size={56}
                  className="transition-transform duration-700 ease-[var(--ease-couture)] group-hover:rotate-[8deg]"
                />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {conciergeOpen && (
          <motion.div
            key="concierge-scrim"
            aria-hidden
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[64] bg-obsidian/70 backdrop-blur-[2px] sm:hidden"
          />
        )}
        {conciergeOpen && (
          <motion.section
            key="concierge-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="fixed inset-x-0 bottom-0 z-[65] flex h-[min(86dvh,640px)] w-full flex-col border-t border-line-gold bg-surface text-ivory shadow-[0_-30px_80px_-30px_rgba(0,0,0,0.9)] outline-none sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(620px,calc(100dvh-7rem))] sm:w-[min(400px,calc(100vw-2rem))] sm:border"
          >
            <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 bg-line sm:hidden" />

            <header className="relative flex shrink-0 items-center gap-3.5 px-5 pb-4 pt-3 sm:pt-4">
              <Medallion size={42} />
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-display text-[1.15rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-ivory">
                  Titi&apos;s Store
                </h2>
                <p className="mt-0.5 truncate text-xs text-mist">Assistente de estilo · a qualquer hora</p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar concierge"
                className="-mr-2 grid h-10 w-10 place-items-center text-mist transition-colors hover:text-gold-light"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <span aria-hidden className="stitch absolute inset-x-5 bottom-0" />
            </header>

            <div
              ref={logRef}
              role="log"
              aria-live="polite"
              aria-label="Conversa com o concierge"
              className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5"
            >
              <AssistantBubble
                text={welcome}
                footnote="Respostas automáticas, processadas por inteligência artificial. Para pedidos e medidas, fale com o Titi."
              />
              <PlanCard hasAccess={hasAccess} onNavigate={close} />
              {messages.map((message, index) =>
                message.role === 'user' ? (
                  <UserBubble key={index} text={message.content} />
                ) : (
                  <AssistantBubble key={index} text={message.content} />
                ),
              )}
              {pending && <TypingIndicator />}
              {failed && !pending && (
                <div className="max-w-[92%] border-l border-danger/50 bg-surface-2 px-4 py-3.5">
                  <p className="text-[0.9rem] leading-relaxed text-parchment">
                    Estou com instabilidade agora. Se preferir, fale direto com o Titi.
                  </p>
                  <div className="mt-3.5 flex flex-wrap items-center gap-4">
                    <Button size="sm" href={whatsappHref} external>
                      <WhatsAppIcon className="h-3.5 w-3.5" />
                      Falar com o Titi
                    </Button>
                    <button
                      type="button"
                      onClick={retry}
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mist transition-colors hover:text-gold-light"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-line px-5 pb-4 pt-3">
              <PlanStrip hasAccess={hasAccess} onNavigate={close} />
              {!hasUserMessages && (
                <div role="group" aria-label="Sugestões de perguntas" className="no-scrollbar -mx-5 mb-3 flex gap-2 overflow-x-auto px-5">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      disabled={pending}
                      className="shrink-0 border border-line bg-ivory/[0.02] px-3 py-2 text-xs text-parchment transition-colors duration-300 hover:border-line-gold hover:text-gold-light disabled:opacity-40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(draft);
                }}
                className="flex items-end gap-1.5 border border-line bg-ivory/[0.02] transition-colors duration-300 focus-within:border-gold/60"
              >
                <label htmlFor={inputId} className="sr-only">
                  Mensagem para o concierge
                </label>
                <textarea
                  ref={inputRef}
                  id={inputId}
                  rows={1}
                  value={draft}
                  onChange={onDraftChange}
                  onKeyDown={onDraftKeyDown}
                  maxLength={MAX_CHARS}
                  enterKeyHint="send"
                  placeholder="Escreva sua dúvida de estilo…"
                  className="max-h-36 min-h-[2.9rem] flex-1 resize-none bg-transparent px-3.5 py-3 text-sm leading-relaxed text-ivory placeholder:text-smoke focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || pending}
                  aria-label="Enviar mensagem"
                  className="m-1.5 grid h-9 w-9 shrink-0 place-items-center bg-gold text-obsidian transition-[background-color,opacity] duration-300 hover:bg-gold-light disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2} />
                </button>
              </form>

              <div className="mt-2.5 flex min-h-5 items-center justify-between gap-3 text-[0.66rem] text-smoke">
                {messages.length === 0 ? (
                  <span className="hidden sm:inline">Enter envia · Shift + Enter quebra a linha</span>
                ) : (
                  <button
                    type="button"
                    onClick={reset}
                    className="ml-auto inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] transition-colors hover:text-gold-light"
                  >
                    <RotateCcw className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                    Reiniciar conversa
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
