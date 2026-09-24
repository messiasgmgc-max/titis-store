'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatPhoneBR } from '@/lib/format';
import { postLoginPath, resolvePostLoginPath, safeNextPath } from '@/lib/auth-redirect';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/providers/SessionProvider';

export type AuthMode = 'login' | 'register' | 'forgot';

type Field = 'name' | 'phone' | 'email' | 'password' | 'terms';
type Notice = { tone: 'error' | 'success'; text: string };

export const MIN_PASSWORD_LENGTH = 8;

const EASE = [0.22, 1, 0.36, 1] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TABS: { mode: 'login' | 'register'; label: string }[] = [
  { mode: 'login', label: 'Entrar' },
  { mode: 'register', label: 'Criar conta' },
];

const SUBMIT_LABEL: Record<AuthMode, string> = {
  login: 'Entrar',
  register: 'Criar conta',
  forgot: 'Enviar link',
};

// ---------------------------------------------------------------------------
// Tradução das mensagens do Supabase Auth
// ---------------------------------------------------------------------------
function translateAuthError(err: unknown): string {
  const e = (err ?? {}) as { code?: string; status?: number; message?: string; name?: string };
  const code = e.code ?? '';
  const msg = (e.message ?? '').toLowerCase();

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (code.startsWith('over_') || e.status === 429 || msg.includes('rate limit') || msg.includes('for security purposes')) {
    return 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.';
  }
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) {
    return 'Este e-mail já tem cadastro. Entre com sua senha ou redefina-a.';
  }
  if (code === 'weak_password' || msg.includes('password should')) {
    return `Senha fraca. Use ao menos ${MIN_PASSWORD_LENGTH} caracteres, combinando letras e números.`;
  }
  if (code === 'same_password' || msg.includes('different from the old')) return 'A nova senha precisa ser diferente da anterior.';
  if (code === 'reauthentication_needed') return 'Por segurança, entre novamente na sua conta antes de trocar a senha.';
  if (code === 'email_address_invalid' || msg.includes('invalid email') || msg.includes('validate email')) {
    return 'Informe um e-mail válido.';
  }
  if (code === 'signup_disabled' || msg.includes('signups not allowed')) return 'Novos cadastros estão temporariamente indisponíveis.';
  if (
    ['otp_expired', 'flow_state_expired', 'flow_state_not_found', 'bad_code_verifier'].includes(code) ||
    msg.includes('expired') ||
    msg.includes('invalid flow state')
  ) {
    return 'Este link expirou ou já foi usado. Solicite um novo.';
  }
  if (code === 'session_not_found' || e.name === 'AuthSessionMissingError' || msg.includes('session missing')) {
    return 'Sua sessão expirou. Solicite um novo link de redefinição.';
  }
  if (msg.includes('fetch') || msg.includes('network')) return 'Falha de conexão. Verifique sua internet e tente novamente.';
  return 'Não foi possível concluir agora. Tente novamente em instantes.';
}

// ---------------------------------------------------------------------------
// Peças de formulário
// ---------------------------------------------------------------------------
function NoticeLine({ notice }: { notice: Notice | null }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {notice && (
        <p
          className={cn(
            'flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm leading-snug',
            notice.tone === 'error'
              ? 'border-danger/35 bg-danger/[0.06] text-danger'
              : 'border-success/35 bg-success/[0.06] text-success',
          )}
        >
          {notice.tone === 'error' ? (
            <CircleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          ) : (
            <CircleCheck className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          )}
          <span>{notice.text}</span>
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'> {
  id: string;
  label: React.ReactNode;
  value: string;
  onValue: (value: string) => void;
  invalid?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  autoFocusTarget?: boolean;
}

function TextField({ id, label, value, onValue, invalid, inputRef, autoFocusTarget, className, ...rest }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onValue(e.target.value)}
        aria-invalid={invalid || undefined}
        data-autofocus={autoFocusTarget ? '' : undefined}
        className={cn('field rounded-2xl', invalid && 'border-danger/60', className)}
        {...rest}
      />
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onValue: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  invalid?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Mostra a régua de 8 marcas (mínimo de caracteres). */
  meter?: boolean;
  action?: React.ReactNode;
  autoFocusTarget?: boolean;
}

function PasswordField({
  id,
  label,
  value,
  onValue,
  visible,
  onToggle,
  autoComplete,
  invalid,
  inputRef,
  meter,
  action,
  autoFocusTarget,
}: PasswordFieldProps) {
  const complete = value.length >= MIN_PASSWORD_LENGTH;
  return (
    <div>
      <div className="mb-[0.45rem] flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label mb-0">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={meter ? `${id}-hint` : undefined}
          data-autofocus={autoFocusTarget ? '' : undefined}
          className={cn('field rounded-2xl pr-12', invalid && 'border-danger/60')}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-2xl text-smoke transition-colors hover:text-gold-light"
        >
          {visible ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
        </button>
      </div>
      {meter && (
        <div className="mt-2.5 flex items-center gap-3">
          <span aria-hidden className="grid flex-1 grid-cols-8 gap-1">
            {Array.from({ length: MIN_PASSWORD_LENGTH }, (_, i) => (
              <span
                key={i}
                className={cn('h-[3px] rounded-full transition-colors duration-300', i < value.length ? 'bg-gold' : 'bg-line')}
              />
            ))}
          </span>
          <span id={`${id}-hint`} className={cn('text-[0.68rem] tracking-wide', complete ? 'text-gold-light' : 'text-smoke')}>
            {complete ? 'Medida certa' : `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
          </span>
        </div>
      )}
    </div>
  );
}

function TermsCheckbox({
  id,
  checked,
  onChange,
  invalid,
  inputRef,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalid?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const linkClass = 'text-gold-light underline decoration-gold/40 underline-offset-4 transition-colors hover:decoration-gold';
  return (
    <div className="flex items-start gap-3">
      <span className="relative mt-[2px] grid h-[18px] w-[18px] shrink-0 place-items-center">
        <input
          ref={inputRef}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={invalid || undefined}
          className={cn(
            'peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-full border bg-transparent transition-colors checked:border-gold checked:bg-gold',
            invalid ? 'border-danger/70' : 'border-line-gold',
          )}
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none relative h-3 w-3 text-obsidian opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <label htmlFor={id} className="text-[0.82rem] leading-relaxed text-mist">
        Li e aceito a{' '}
        <Link href="/privacidade" target="_blank" rel="noopener" className={linkClass}>
          Política de Privacidade
        </Link>{' '}
        e os{' '}
        <Link href="/termos" target="_blank" rel="noopener" className={linkClass}>
          Termos de Uso
        </Link>
        .
      </label>
    </div>
  );
}

function SentPanel({
  kind,
  email,
  onBack,
  backLabel,
}: {
  kind: 'confirm' | 'reset';
  email: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="py-4 text-center" role="status">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line-gold text-gold">
        <Mail className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="mt-6 font-display text-[1.5rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-ivory">
        {kind === 'confirm' ? 'Confirme seu ' : 'Verifique seu '}
        <span className="text-foil">e-mail</span>
      </p>
      <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-mist">
        {kind === 'confirm' ? (
          <>
            Enviamos um link de confirmação para <span className="break-all text-ivory">{email}</span>.
          </>
        ) : (
          <>
            Se houver uma conta para <span className="break-all text-ivory">{email}</span>, enviamos um link para criar uma
            nova senha.
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-smoke">Não encontrou? Confira as pastas de spam e promoções.</p>
      <Button variant="outline" size="sm" className="mt-7" onClick={onBack}>
        {backLabel}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulário principal: Entrar · Criar conta · Esqueci a senha
// ---------------------------------------------------------------------------
interface AuthFormProps {
  initialMode?: AuthMode;
  /** Caminho interno preferido depois de entrar (ex.: a página em que o usuário estava). */
  next?: string | null;
  /**
   * Chamado após entrar (ou criar conta com sessão) com o destino calculado por postLoginPath.
   * Sem este callback o formulário navega sozinho para o destino.
   */
  onSuccess?: (destination: string) => void;
  /** Avisa o contêiner (ex.: modal) quando o modo muda, para ajustar títulos. */
  onModeChange?: (mode: AuthMode) => void;
  /** Esconde as abas e o "voltar" — usado quando só um modo faz sentido. */
  lockMode?: boolean;
  /** Marca o primeiro campo com data-autofocus (foco inicial do <Modal>). */
  autoFocus?: boolean;
  className?: string;
}

export function AuthForm({
  initialMode = 'login',
  next = null,
  onSuccess,
  onModeChange,
  lockMode = false,
  autoFocus = false,
  className,
}: AuthFormProps) {
  const uid = useId();
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [invalidField, setInvalidField] = useState<Field | null>(null);
  const [sentTo, setSentTo] = useState<{ kind: 'confirm' | 'reset'; email: string } | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const fieldRefs: Record<Field, React.RefObject<HTMLInputElement | null>> = {
    name: nameRef,
    phone: phoneRef,
    email: emailRef,
    password: passwordRef,
    terms: termsRef,
  };

  function switchMode(next: AuthMode) {
    setMode(next);
    setNotice(null);
    setInvalidField(null);
    setSentTo(null);
    setShowPassword(false);
    onModeChange?.(next);
  }

  function onTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = mode === 'register' ? 'login' : 'register';
    switchMode(next);
    document.getElementById(`${uid}-tab-${next}`)?.focus();
  }

  function validate(): { field: Field; text: string } | null {
    if (mode === 'register' && name.trim().length < 2) return { field: 'name', text: 'Informe seu nome.' };
    if (mode === 'register' && phone && phone.replace(/\D/g, '').length < 10) {
      return { field: 'phone', text: 'Confira o WhatsApp com DDD.' };
    }
    if (!EMAIL_PATTERN.test(email.trim())) return { field: 'email', text: 'Informe um e-mail válido.' };
    if (mode === 'login' && !password) return { field: 'password', text: 'Informe sua senha.' };
    if (mode === 'register' && password.length < MIN_PASSWORD_LENGTH) {
      return { field: 'password', text: `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` };
    }
    if (mode === 'register' && !accepted) {
      return { field: 'terms', text: 'Para criar a conta, aceite a Política de Privacidade e os Termos de Uso.' };
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const problem = validate();
    if (problem) {
      setInvalidField(problem.field);
      setNotice({ tone: 'error', text: problem.text });
      fieldRefs[problem.field].current?.focus();
      return;
    }

    setInvalidField(null);
    setNotice(null);
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    // Quem já pagou cai na consultoria; sem plano, na aba "Meu plano"; admin, no painel.
    const finish = async () => {
      const destination = await resolvePostLoginPath(next);
      if (onSuccess) onSuccess(destination);
      else router.push(destination);
    };

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        setNotice({ tone: 'success', text: 'Acesso confirmado. Levando você ao seu lugar…' });
        await finish();
      } else if (mode === 'register') {
        const digits = phone.replace(/\D/g, '');
        const currentTarget = `${window.location.pathname}${window.location.search}`;
        const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentTarget)}`;

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { full_name: name.trim(), phone: digits ? formatPhoneBR(digits) : null },
            emailRedirectTo: redirectUrl,
          },
        });
        if (error) throw error;
        // Com confirmação de e-mail ativa, um e-mail já cadastrado volta sem identidades.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          throw Object.assign(new Error('User already registered'), { code: 'user_already_exists' });
        }
        if (!data.session) {
          // Tenta login imediato caso a auto-confirmação do Supabase esteja ativa sem session síncrona
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (!signInErr && signInData?.session) {
            await finish();
            return;
          }
          setPassword('');
          setSentTo({ kind: 'confirm', email: cleanEmail });
        } else {
          await finish();
        }
      } else {
        const resetRedirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/redefinir-senha')}`;
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: resetRedirect,
        });
        if (error) throw error;
        setSentTo({ kind: 'reset', email: cleanEmail });
      }
    } catch (err) {
      setNotice({ tone: 'error', text: translateAuthError(err) });
    } finally {
      setLoading(false);
    }
  }

  const showTabs = !lockMode && mode !== 'forgot';
  const panelKey = sentTo ? `sent-${sentTo.kind}` : mode;
  const firstField: Field = mode === 'register' ? 'name' : 'email';

  return (
    <div className={cn('w-full', className)}>
      {showTabs && (
        <div
          role="tablist"
          aria-label="Acesso à conta"
          onKeyDown={onTabKeyDown}
          className="relative grid grid-cols-2 rounded-full border border-line bg-surface-2/60 p-1"
        >
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-gold/[0.12] ring-1 ring-gold/40 transition-transform duration-700 ease-[var(--ease-couture)]"
            style={{ transform: `translateX(${mode === 'register' ? '100%' : '0%'})` }}
          />
          {TABS.map((tab) => {
            const active = mode === tab.mode;
            return (
              <button
                key={tab.mode}
                id={`${uid}-tab-${tab.mode}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`${uid}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => !active && switchMode(tab.mode)}
                className={cn(
                  'relative rounded-full py-2.5 text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors duration-500',
                  active ? 'text-gold-light' : 'text-smoke hover:text-mist',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {!lockMode && mode === 'forgot' && (
        <div className="flex items-center justify-between gap-4 rounded-full border border-line px-4 py-2">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className="-ml-1 inline-flex items-center gap-1.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mist transition-colors hover:text-gold-light"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Voltar para entrar
          </button>
          <KeyRound className="h-4 w-4 text-gold/70" strokeWidth={1.5} aria-hidden />
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={panelKey}
          id={`${uid}-panel`}
          role={showTabs && !sentTo ? 'tabpanel' : undefined}
          aria-labelledby={showTabs && !sentTo ? `${uid}-tab-${mode}` : undefined}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: EASE }}
        >
          {sentTo ? (
            <div className="mt-6">
              <SentPanel
                kind={sentTo.kind}
                email={sentTo.email}
                backLabel={lockMode ? 'Usar outro e-mail' : 'Voltar para entrar'}
                onBack={() => (lockMode ? setSentTo(null) : switchMode('login'))}
              />
            </div>
          ) : (
            <form noValidate onSubmit={handleSubmit} className={cn('space-y-5', lockMode ? 'mt-0' : 'mt-7')}>
              {mode === 'forgot' && (
                <p className="text-sm leading-relaxed text-mist">
                  Informe o e-mail da sua conta. Enviaremos um link seguro para você criar uma nova senha.
                </p>
              )}

              {mode === 'register' && (
                <TextField
                  id={`${uid}-name`}
                  label="Nome"
                  value={name}
                  onValue={setName}
                  autoComplete="name"
                  placeholder="Como devemos chamar você"
                  invalid={invalidField === 'name'}
                  inputRef={nameRef}
                  autoFocusTarget={autoFocus && firstField === 'name'}
                />
              )}

              {mode === 'register' && (
                <TextField
                  id={`${uid}-phone`}
                  type="tel"
                  inputMode="tel"
                  label={
                    <>
                      WhatsApp <span className="normal-case tracking-normal text-smoke">· opcional</span>
                    </>
                  }
                  value={phone}
                  onValue={(v) => setPhone(formatPhoneBR(v))}
                  autoComplete="tel-national"
                  placeholder="(31) 99999-9999"
                  invalid={invalidField === 'phone'}
                  inputRef={phoneRef}
                />
              )}

              <TextField
                id={`${uid}-email`}
                type="email"
                inputMode="email"
                label="E-mail"
                value={email}
                onValue={setEmail}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="voce@email.com"
                invalid={invalidField === 'email'}
                inputRef={emailRef}
                autoFocusTarget={autoFocus && firstField === 'email'}
              />

              {mode !== 'forgot' && (
                <PasswordField
                  id={`${uid}-password`}
                  label="Senha"
                  value={password}
                  onValue={setPassword}
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  invalid={invalidField === 'password'}
                  inputRef={passwordRef}
                  meter={mode === 'register'}
                  action={
                    mode === 'login' && !lockMode ? (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-[0.7rem] tracking-[0.06em] text-gold-light/85 underline-offset-4 transition-colors hover:text-gold-light hover:underline"
                      >
                        Esqueci a senha
                      </button>
                    ) : null
                  }
                />
              )}

              {mode === 'register' && (
                <TermsCheckbox
                  id={`${uid}-terms`}
                  checked={accepted}
                  onChange={setAccepted}
                  invalid={invalidField === 'terms'}
                  inputRef={termsRef}
                />
              )}

              <NoticeLine notice={notice} />

              <Button type="submit" loading={loading} className="w-full">
                {SUBMIT_LABEL[mode]}
              </Button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// /login — lê ?next= e ?modo= (envolver em <Suspense>)
// ---------------------------------------------------------------------------
export function LoginRedirectForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, profile, loading } = useSession();
  const next = safeNextPath(params.get('next'));
  const initialMode: AuthMode = params.get('modo') === 'cadastro' ? 'register' : 'login';

  // Quem já está conectado segue direto para o seu lugar (espera o perfil para decidir).
  useEffect(() => {
    if (!loading && user && profile) router.replace(postLoginPath(profile, next));
  }, [loading, user, profile, router, next]);

  return <AuthForm initialMode={initialMode} next={next} onSuccess={(destination) => router.replace(destination)} />;
}

// ---------------------------------------------------------------------------
// /redefinir-senha — valida o link e grava a nova senha
// ---------------------------------------------------------------------------
type ResetStatus = 'checking' | 'ready' | 'invalid' | 'done';
type ExchangeResult = Awaited<ReturnType<typeof supabase.auth.exchangeCodeForSession>>;

// Evita trocar o mesmo código duas vezes (efeitos duplicados em desenvolvimento).
const codeExchanges = new Map<string, Promise<ExchangeResult>>();
function exchangeOnce(code: string): Promise<ExchangeResult> {
  let pending = codeExchanges.get(code);
  if (!pending) {
    pending = supabase.auth.exchangeCodeForSession(code);
    codeExchanges.set(code, pending);
  }
  return pending;
}

export function ResetPasswordPanel() {
  const uid = useId();
  const [status, setStatus] = useState<ResetStatus>('checking');
  const [expired, setExpired] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [invalid, setInvalid] = useState<'password' | 'confirmation' | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const code = url.searchParams.get('code');
    const urlHasError = ['error', 'error_code', 'error_description'].some((k) => url.searchParams.has(k) || hash.has(k));

    const cleanUrl = () => {
      if (url.search || url.hash) window.history.replaceState(null, '', url.pathname);
    };
    const unlock = (mail: string | undefined) => {
      if (!active) return;
      setAccount(mail ?? null);
      setStatus((s) => (s === 'done' ? s : 'ready'));
    };
    const reject = (isExpired: boolean) => {
      if (!active) return;
      setExpired(isExpired);
      setStatus((s) => (s === 'checking' ? 'invalid' : s));
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) unlock(session.user.email);
    });

    const resolve = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          cleanUrl();
          unlock(data.session.user.email);
          return;
        }
        if (code) {
          const { data: exchanged, error } = await exchangeOnce(code);
          cleanUrl();
          if (!error && exchanged.session) {
            unlock(exchanged.session.user.email);
            return;
          }
          const retry = await supabase.auth.getSession();
          if (retry.data.session) {
            unlock(retry.data.session.user.email);
            return;
          }
          reject(true);
          return;
        }
        cleanUrl();
        reject(urlHasError);
      } catch {
        reject(true);
      }
    };
    void resolve();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setInvalid('password');
      setNotice({ tone: 'error', text: `A nova senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.` });
      passwordRef.current?.focus();
      return;
    }
    if (confirmation !== password) {
      setInvalid('confirmation');
      setNotice({ tone: 'error', text: 'As senhas não coincidem.' });
      confirmationRef.current?.focus();
      return;
    }

    setInvalid(null);
    setNotice(null);
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setConfirmation('');
      setStatus('done');
    } catch (err) {
      const e2 = err as { code?: string; name?: string };
      if (e2.code === 'session_not_found' || e2.code === 'session_expired' || e2.name === 'AuthSessionMissingError') {
        setExpired(true);
        setStatus('invalid');
        return;
      }
      setNotice({ tone: 'error', text: translateAuthError(err) });
    } finally {
      setSaving(false);
    }
  }

  if (status === 'checking') {
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-12 text-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-gold" aria-hidden />
        <p className="text-sm text-mist">Validando seu link de redefinição…</p>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div role="status" className="py-4 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-success/40 text-success">
          <CircleCheck className="h-6 w-6" strokeWidth={1.5} aria-hidden />
        </span>
        <p className="mt-6 font-display text-[1.6rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-ivory">
          Senha <span className="text-foil">atualizada</span>
        </p>
        <p className="mt-3 text-sm text-mist">Sua nova senha já está valendo.</p>
        <div className="mt-8 flex flex-col items-center gap-5">
          <Button href="/dashboard" className="w-full">
            Ir para minha conta
          </Button>
          <Link href="/" className="link-luxe text-mist">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div>
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line-gold text-gold">
            <KeyRound className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="mt-6 font-display text-[1.5rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-ivory">
            {expired ? (
              <>
                Link <span className="text-foil">expirado</span> ou já utilizado
              </>
            ) : (
              <>
                Solicite um <span className="text-foil">novo link</span>
              </>
            )}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mist">
            {expired
              ? 'Por segurança, cada link de redefinição vale por tempo limitado e só pode ser usado uma vez. Peça um novo abaixo.'
              : 'Para criar uma nova senha, abra o link enviado ao seu e-mail ou solicite um novo abaixo.'}
          </p>
        </div>
        <div className="stitch my-7" aria-hidden />
        <AuthForm initialMode="forgot" lockMode />
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      {account && (
        <p className="flex items-center gap-2.5 border-b border-line pb-4 text-sm text-mist">
          <ShieldCheck className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
          <span className="shrink-0">Conta</span>
          <span className="truncate text-ivory">{account}</span>
        </p>
      )}
      <PasswordField
        id={`${uid}-new`}
        label="Nova senha"
        value={password}
        onValue={setPassword}
        visible={visible}
        onToggle={() => setVisible((v) => !v)}
        autoComplete="new-password"
        invalid={invalid === 'password'}
        inputRef={passwordRef}
        meter
      />
      <PasswordField
        id={`${uid}-confirm`}
        label="Confirme a nova senha"
        value={confirmation}
        onValue={setConfirmation}
        visible={visible}
        onToggle={() => setVisible((v) => !v)}
        autoComplete="new-password"
        invalid={invalid === 'confirmation'}
        inputRef={confirmationRef}
      />
      <NoticeLine notice={notice} />
      <Button type="submit" loading={saving} className="w-full">
        Salvar nova senha
      </Button>
    </form>
  );
}
