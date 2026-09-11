'use client';

import { useId, type ComponentType, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/format';

/*
 * Controles de formulário da marca — redondos como a Urbanist.
 * Checkbox (caixa 22px, check dourado desenhado), Radio (círculo), Switch (pílula 44×24),
 * Segmented (grupo de opções em pílula com indicador deslizante) e Select (nativo estilizado).
 * Todos acessíveis por teclado, com foco visível e rótulos associados.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

type NativeInput = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'checked' | 'size'>;

interface ChoiceProps extends NativeInput {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Rótulo visível, ao lado do controle. */
  label?: ReactNode;
  /** Linha de apoio, abaixo do rótulo. */
  description?: ReactNode;
  /** Alinhamento do controle em relação ao rótulo (útil com descrições longas). */
  align?: 'start' | 'center';
  className?: string;
}

const BOX_BASE =
  'peer absolute inset-0 m-0 cursor-pointer appearance-none border border-line-gold bg-ivory/[0.02] transition-[border-color,background-color,box-shadow] duration-300 ' +
  'checked:border-gold checked:bg-gold hover:border-gold/80 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-gold ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

function ChoiceLabel({
  id,
  label,
  description,
  disabled,
}: {
  id: string;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}) {
  if (!label && !description) return null;
  return (
    <span className={cn('min-w-0', disabled && 'opacity-50')}>
      {label && (
        <label htmlFor={id} className="block cursor-pointer text-sm leading-snug text-parchment">
          {label}
        </label>
      )}
      {description && <span className="mt-1 block text-xs leading-snug text-smoke">{description}</span>}
    </span>
  );
}

/** Caixa de seleção: 22px, cantos redondos, check dourado que se desenha ao marcar. */
export function Checkbox({ checked, onChange, label, description, align = 'start', className, id, disabled, ...rest }: ChoiceProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-checkbox`;
  return (
    <span className={cn('flex gap-3', align === 'start' ? 'items-start' : 'items-center', className)}>
      <span className={cn('relative grid h-[22px] w-[22px] shrink-0 place-items-center', align === 'start' && !!label && 'mt-px')}>
        <input
          {...rest}
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(BOX_BASE, 'rounded-lg')}
        />
        <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none relative h-3.5 w-3.5 text-obsidian">
          <path
            d="M3 8.5 6.5 12 13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              'transition-[stroke-dashoffset,opacity] duration-300 ease-[var(--ease-couture)] [stroke-dasharray:20] motion-reduce:transition-none',
              checked ? 'opacity-100 [stroke-dashoffset:0]' : 'opacity-0 [stroke-dashoffset:20]',
            )}
          />
        </svg>
      </span>
      <ChoiceLabel id={inputId} label={label} description={description} disabled={disabled} />
    </span>
  );
}

/** Botão de rádio: círculo de 22px com ponto dourado que cresce ao marcar. */
export function Radio({ checked, onChange, label, description, align = 'start', className, id, disabled, ...rest }: ChoiceProps) {
  const autoId = useId();
  const inputId = id ?? `${autoId}-radio`;
  return (
    <span className={cn('flex gap-3', align === 'start' ? 'items-start' : 'items-center', className)}>
      <span className={cn('relative grid h-[22px] w-[22px] shrink-0 place-items-center', align === 'start' && !!label && 'mt-px')}>
        <input
          {...rest}
          id={inputId}
          type="radio"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(BOX_BASE, 'rounded-full checked:bg-transparent')}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none relative h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_10px_rgb(212_175_55/0.55)] transition-transform duration-300 ease-[var(--ease-couture)] motion-reduce:transition-none',
            checked ? 'scale-100' : 'scale-0',
          )}
        />
      </span>
      <ChoiceLabel id={inputId} label={label} description={description} disabled={disabled} />
    </span>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  /** Posição do rótulo em relação à pílula. */
  labelPosition?: 'before' | 'after';
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
}

/** Interruptor: pílula 44×24 com bolinha deslizante e trilho dourado quando ligado. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  labelPosition = 'after',
  disabled,
  id,
  name,
  className,
  'aria-label': ariaLabel,
}: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? `${autoId}-switch`;
  const labelId = label ? `${switchId}-label` : undefined;
  const descId = description ? `${switchId}-desc` : undefined;

  const control = (
    <button
      id={switchId}
      type="button"
      role="switch"
      name={name}
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={labelId}
      aria-describedby={descId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border p-[2px] transition-[background-color,border-color,box-shadow] duration-300',
        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-gold',
        'disabled:cursor-not-allowed disabled:opacity-40',
        checked
          ? 'border-gold bg-foil shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]'
          : 'border-line bg-ivory/[0.05] hover:border-ivory/25',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'block h-[18px] w-[18px] rounded-full shadow-[0_2px_6px_rgb(0_0_0/0.45)] transition-[transform,background-color] duration-300 ease-[var(--ease-couture)] motion-reduce:transition-none',
          checked ? 'translate-x-5 bg-obsidian' : 'translate-x-0 bg-mist',
        )}
      />
    </button>
  );

  if (!label && !description) return <span className={cn('inline-flex', className)}>{control}</span>;

  const text = (
    <span className={cn('min-w-0', disabled && 'opacity-50')}>
      {label && (
        <span
          id={labelId}
          onClick={() => !disabled && onChange(!checked)}
          className="block cursor-pointer text-sm leading-snug text-parchment"
        >
          {label}
        </span>
      )}
      {description && (
        <span id={descId} className="mt-1 block text-xs leading-snug text-smoke">
          {description}
        </span>
      )}
    </span>
  );

  return (
    <span className={cn('flex items-start gap-3', labelPosition === 'before' && 'justify-between', className)}>
      {labelPosition === 'before' && text}
      <span className={cn('shrink-0', !!label && 'mt-px')}>{control}</span>
      {labelPosition === 'after' && text}
    </span>
  );
}

type IconType = ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;

export interface SegmentedOption<T extends string> {
  id: T;
  label: ReactNode;
  /** Linha de apoio (faixa de horário, temperatura, descrição curta). */
  hint?: ReactNode;
  /** Pequeno marcador acima do rótulo (numeral romano, por exemplo). */
  kicker?: ReactNode;
  icon?: IconType;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Rótulo acessível do grupo (também exibido acima quando `showLabel`). */
  label: string;
  showLabel?: boolean;
  /**
   * `inline`: uma linha, pílula compacta (rótulos curtos).
   * `stacked`: ícone/kicker + rótulo + hint empilhados, cantos de 22px.
   */
  layout?: 'inline' | 'stacked';
  /** Ocupa toda a largura, dividindo em colunas iguais. */
  fullWidth?: boolean;
  className?: string;
}

/** Grupo de opções exclusivas em pílula, com indicador dourado que desliza entre as escolhas. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  showLabel = false,
  layout = 'inline',
  fullWidth = true,
  className,
}: SegmentedProps<T>) {
  const groupId = useId();
  const reduceMotion = useReducedMotion();
  const stacked = layout === 'stacked';
  const labelId = `${groupId}-label`;

  const moveFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const enabled = options.filter((o) => !o.disabled);
    if (enabled.length === 0) return;
    const index = Math.max(0, enabled.findIndex((o) => o.id === value));
    let next = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % enabled.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    e.preventDefault();
    onChange(enabled[next].id);
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-id="${enabled[next].id}"]`)?.focus();
  };

  return (
    <div className={className}>
      {showLabel && (
        <p id={labelId} className="label">
          {label}
        </p>
      )}
      <div
        role="radiogroup"
        aria-label={showLabel ? undefined : label}
        aria-labelledby={showLabel ? labelId : undefined}
        onKeyDown={moveFocus}
        className={cn(
          'relative isolate flex gap-1 border border-line bg-ivory/[0.02] p-1',
          stacked ? 'rounded-[22px]' : 'rounded-full',
          fullWidth ? 'w-full' : 'w-fit',
        )}
      >
        {options.map((o) => {
          const active = o.id === value;
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              data-id={o.id}
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              disabled={o.disabled}
              onClick={() => onChange(o.id)}
              className={cn(
                'group/seg relative z-[1] flex min-w-0 items-center justify-center text-center transition-colors duration-500',
                'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-gold',
                'disabled:cursor-not-allowed disabled:opacity-40',
                fullWidth ? 'flex-1' : 'px-1',
                stacked ? 'flex-col gap-1.5 rounded-[18px] px-3 py-4' : 'gap-2 rounded-full px-4 py-2.5',
                active ? 'text-ivory' : 'text-mist hover:text-ivory',
              )}
            >
              {active && (
                <motion.span
                  aria-hidden
                  layoutId={`${groupId}-indicator`}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE }}
                  className={cn(
                    'absolute inset-0 -z-[1] border border-gold/70 bg-linear-to-b from-gold/[0.16] to-gold/[0.04] shadow-[0_10px_30px_-18px_rgb(212_175_55/0.6)]',
                    stacked ? 'rounded-[18px]' : 'rounded-full',
                  )}
                />
              )}
              {o.kicker !== undefined && (
                <span className={cn('numeral text-[0.62rem] transition-colors', active ? 'text-gold' : 'text-smoke')} aria-hidden>
                  {o.kicker}
                </span>
              )}
              {Icon && (
                <Icon
                  className={cn('h-4 w-4 shrink-0 transition-colors', active ? 'text-gold' : 'text-smoke group-hover/seg:text-mist')}
                  strokeWidth={1.25}
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  'font-semibold',
                  stacked ? 'text-[0.72rem] uppercase tracking-[0.16em]' : 'text-[0.74rem] uppercase tracking-[0.1em]',
                )}
              >
                {o.label}
              </span>
              {o.hint !== undefined && (
                <span className={cn('text-[0.66rem] leading-snug', active ? 'text-mist' : 'text-smoke', !stacked && 'hidden sm:inline')}>
                  {o.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: ReactNode;
  /** Lista de opções; alternativa a passar `<option>` como filhos. */
  options?: SelectOption[];
  /** Texto do primeiro item desabilitado (placeholder). */
  placeholder?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children?: ReactNode;
  wrapperClassName?: string;
}

/** Select nativo com o acabamento da marca: cantos de 16px, chevron dourado e foco em ouro. */
export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  children,
  className,
  wrapperClassName,
  id,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? `${autoId}-select`;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <select
        {...rest}
        id={selectId}
        aria-invalid={error ? true : rest['aria-invalid']}
        aria-describedby={[errorId, hintId, rest['aria-describedby']].filter(Boolean).join(' ') || undefined}
        className={cn('field field-select', !!error && 'border-danger/70 focus:border-danger', className)}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options?.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
        {children}
      </select>
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-smoke">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
