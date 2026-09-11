'use client';

import { useId, useState } from 'react';
import { CircleAlert, TicketPercent, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiRequestError, quoteCoupon } from '@/lib/api';
import { cn, formatBRL } from '@/lib/format';
import type { ClubPlan } from '@/lib/site';
import type { CouponQuote } from '@/lib/types';

/** Campo de cupom: valida em /api/coupon-quote e mostra o desconto antes de pagar. */
export function CouponField({
  plan,
  quote,
  onQuote,
  disabled,
  className,
}: {
  plan: ClubPlan;
  quote: CouponQuote | null;
  onQuote: (quote: CouponQuote | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    const clean = code.trim().toUpperCase();
    if (!clean || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { quote: next } = await quoteCoupon(plan.id, clean);
      onQuote(next);
      setCode('');
    } catch (err) {
      onQuote(null);
      setError(
        err instanceof ApiRequestError && err.message
          ? err.message
          : 'Não foi possível validar o cupom agora. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    onQuote(null);
    setError(null);
  }

  if (quote) {
    return (
      <div
        role="status"
        className={cn('flex items-center gap-3 rounded-2xl border border-line-gold bg-gold/[0.05] px-4 py-3', className)}
      >
        <TicketPercent className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.75} aria-hidden />
        <p className="min-w-0 flex-1 text-sm leading-snug text-parchment">
          Cupom <span className="font-extrabold tracking-[0.04em] text-gold-light">{quote.code}</span>:{' '}
          <span className="tabular-nums">−{formatBRL(quote.discountCents)}</span>
          <span aria-hidden className="mx-2 text-smoke">
            ·
          </span>
          você paga <span className="font-extrabold tabular-nums text-ivory">{formatBRL(quote.finalCents)}</span>
        </p>
        <button
          type="button"
          onClick={remove}
          disabled={disabled}
          aria-label={`Remover cupom ${quote.code}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-smoke transition-colors hover:bg-gold/10 hover:text-ivory disabled:opacity-50"
        >
          <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        Cupom <span className="normal-case tracking-normal text-smoke">· opcional</span>
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void apply();
            }
          }}
          disabled={disabled || busy}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          placeholder="CÓDIGO"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erro` : undefined}
          className={cn('field min-w-0 flex-1 rounded-2xl uppercase tracking-[0.08em]', error && 'border-danger/60')}
        />
        <Button
          variant="outline"
          size="sm"
          loading={busy}
          disabled={disabled || !code.trim()}
          onClick={() => void apply()}
          className="shrink-0 px-5"
        >
          Aplicar
        </Button>
      </div>
      <p id={`${id}-erro`} aria-live="polite" className="mt-2 min-h-[1.25rem] text-xs leading-relaxed text-danger">
        {error && (
          <span className="inline-flex items-start gap-1.5">
            <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {error}
          </span>
        )}
      </p>
    </div>
  );
}
