'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  CircleCheck,
  Hourglass,
  ShieldCheck,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { planWhatsappText } from '@/lib/checkout';
import { CHECKOUT_PROVIDER, CONSULTING_PATH, type ClubPlan } from '@/lib/site';
import { cn, formatBRL, formatCPF, formatPhoneBR, isValidDocument, whatsappLink } from '@/lib/format';
import { getInstallmentOptions } from '@/lib/installments';
import { supabase } from '@/lib/supabaseClient';
import type { CouponQuote } from '@/lib/types';
import { useSession } from '@/providers/SessionProvider';
import { BlockedNotice } from './BlockedNotice';
import { CouponField } from './CouponField';
import { RefreshAccessButton } from './RefreshAccess';
import { EYEBROW, formatAccessDate, type ReturnStatus } from './shared';
import { processPlanPaymentAction } from '@/app/consultor/assinar/actions';

const HELP_TEXT = 'Olá, Titi! Tenho uma dúvida sobre os planos da consultoria.';

const RETURN_COPY: Record<ReturnStatus, { title: string; text: string; icon: typeof CircleCheck; tone: string }> = {
  approved: {
    title: 'Pagamento aprovado',
    text: 'Estamos liberando o acesso na sua conta. Costuma levar poucos segundos: toque em Atualizar acesso.',
    icon: CircleCheck,
    tone: 'border-success/35 bg-success/[0.06] text-success',
  },
  pending: {
    title: 'Pagamento em processamento',
    text: 'Alguns meios de pagamento levam alguns minutos para compensar. Assim que o Mercado Pago confirmar, o acesso é liberado na sua conta.',
    icon: Hourglass,
    tone: 'border-line-gold bg-gold/[0.05] text-gold',
  },
  failure: {
    title: 'O pagamento não foi concluído',
    text: 'O Mercado Pago não confirmou a cobrança. Tente de novo abaixo ou finalize com o Titi pelo WhatsApp.',
    icon: CircleAlert,
    tone: 'border-danger/35 bg-danger/[0.05] text-danger',
  },
};

function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatCardExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

function formatCardCvv(val: string): string {
  return val.replace(/\D/g, '').slice(0, 4);
}

function detectCardBrand(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (/^4/.test(clean)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(clean)) return 'Mastercard';
  if (/^(4011|4389|4514|4576|5041|5066|5067|5090|6277|6362|6363)/.test(clean)) return 'Elo';
  if (/^3[47]/.test(clean)) return 'Amex';
  if (/^(606282|3841)/.test(clean)) return 'Hipercard';
  return '';
}

function ReturnNotice({ status, hasAccess }: { status: ReturnStatus; hasAccess: boolean }) {
  const released = status !== 'failure' && hasAccess;
  const copy = RETURN_COPY[status];
  const Icon = released ? BadgeCheck : copy.icon;
  return (
    <div role="status" className={cn('rounded-2xl border p-5', released ? RETURN_COPY.approved.tone : copy.tone)}>
      <p className="flex items-center gap-2.5 text-base font-extrabold tracking-[-0.02em] text-ivory">
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden />
        {released ? 'Acesso liberado' : copy.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-parchment">
        {released ? 'Tudo pronto: sua consultoria já está disponível na sua conta.' : copy.text}
      </p>
      {status !== 'failure' && (
        <div className="mt-4">
          {released ? (
            <Button href={CONSULTING_PATH} className="w-full">
              Ir para minha consultoria
            </Button>
          ) : (
            <RefreshAccessButton size="sm" />
          )}
        </div>
      )}
    </div>
  );
}

function ActiveNotice({
  accessUntil,
  isAdmin,
  upgrade,
  onRenew,
}: {
  accessUntil: string | null;
  isAdmin: boolean;
  upgrade: boolean;
  onRenew?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-success/35 bg-success/[0.06] p-5">
      <p className="flex items-center gap-2.5 text-base font-extrabold tracking-[-0.02em] text-ivory">
        <BadgeCheck className="h-5 w-5 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
        Seu plano está ativo
      </p>
      <p className="mt-1.5 text-sm text-mist">
        {accessUntil && !isAdmin ? `Acesso até ${formatAccessDate(accessUntil)}.` : 'Acesso sem prazo.'}
        {upgrade && ' O upgrade vale a partir da confirmação, sem perder sua cartela nem seus looks.'}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button href={CONSULTING_PATH} variant="gold" size="sm" className="w-full">
          Ir para minha consultoria
        </Button>
        {onRenew && (
          <button
            type="button"
            onClick={onRenew}
            className="btn btn-outline h-9 px-3 text-xs text-smoke hover:text-parchment"
          >
            Renovar / Alterar
          </button>
        )}
      </div>
    </div>
  );
}

function PanelLoading() {
  return (
    <div aria-hidden className="animate-pulse space-y-4">
      <span className="block h-2.5 w-24 rounded-full bg-line" />
      <span className="block h-3 w-full rounded-full bg-line" />
      <span className="block h-3 w-2/3 rounded-full bg-line" />
      <span className="block h-12 w-full rounded-full bg-gold/20" />
    </div>
  );
}

/** Coluna de ações da assinatura com Checkout Transparente (Pix e Cartão em até 12x) */
export function PurchasePanel({
  plan,
  returnStatus,
  upgrade = false,
}: {
  plan: ClubPlan;
  returnStatus: ReturnStatus | null;
  upgrade?: boolean;
}) {
  const { user, profile, loading, hasAccess, accessUntil, isAdmin, isBlocked, refreshProfile, updateProfile } =
    useSession();

  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [justJoined, setJustJoined] = useState(false);
  const [quote, setQuote] = useState<CouponQuote | null>(null);

  // Form states do comprador
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);
  const [differentCardholder, setDifferentCardholder] = useState(false);
  const [cardholderCpf, setCardholderCpf] = useState('');

  // Estados de feedback & checkout
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixResult, setPixResult] = useState<{
    orderId: string;
    qrCodeBase64?: string | null;
    qrCode?: string | null;
  } | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [renewing, setRenewing] = useState(false);

  const digital = plan.accessDays !== null;
  const online = CHECKOUT_PROVIDER === 'mercadopago' && plan.priceCents !== null;
  const paymentReturned = returnStatus === 'approved' || returnStatus === 'pending';
  const coupon = quote?.code ?? null;
  const payable = quote ? quote.finalCents : plan.priceCents ?? 0;

  // Pré-preenche os dados com o perfil logado
  useEffect(() => {
    if (profile) {
      if (profile.full_name && !fullName) setFullName(profile.full_name);
      if (profile.cpf && !cpf) setCpf(formatCPF(profile.cpf));
      if (profile.phone && !phone) setPhone(formatPhoneBR(profile.phone));
    }
  }, [profile, fullName, cpf, phone]);

  // Monitora o pagamento Pix em tempo real
  useEffect(() => {
    if (!pixResult?.orderId || paymentConfirmed) return;

    const currentOrderId = pixResult.orderId;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(currentOrderId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.isPaid) {
          clearInterval(interval);
          setPaymentConfirmed(true);
          setPixResult(null);

          try {
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#d4af37', '#e6ca65', '#f6f5f1', '#10b981'],
            });
          } catch {
            // ignore
          }

          await refreshProfile();
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [pixResult?.orderId, paymentConfirmed, refreshProfile]);

  const handleCopyPix = () => {
    if (!pixResult?.qrCode) return;
    void navigator.clipboard.writeText(pixResult.qrCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleSubmitPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!user) return;

    const cleanCpf = cpf.replace(/\D/g, '');
    if (!isValidDocument(cleanCpf)) {
      setErrorMessage('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    if (paymentMethod === 'credit_card' && payable > 0) {
      const cleanCard = cardNumber.replace(/\D/g, '');
      if (cleanCard.length < 13) {
        setErrorMessage('Por favor, informe o número completo do cartão de crédito.');
        return;
      }
      if (!cardHolder.trim()) {
        setErrorMessage('Por favor, informe o nome impresso no cartão.');
        return;
      }
      if (differentCardholder) {
        const cleanHolderCpf = cardholderCpf.replace(/\D/g, '');
        if (!isValidDocument(cleanHolderCpf)) {
          setErrorMessage('O CPF do titular do cartão é inválido.');
          return;
        }
      }
      const cleanExp = cardExpiry.replace(/\D/g, '');
      if (cleanExp.length < 4) {
        setErrorMessage('Por favor, informe a validade do cartão no formato MM/AA.');
        return;
      }
      if (cardCvv.replace(/\D/g, '').length < 3) {
        setErrorMessage('Por favor, informe o código de segurança (CVV).');
        return;
      }
    }

    // Persiste dados na conta se profile estiver incompleto
    void updateProfile({
      full_name: fullName.trim(),
      cpf: cleanCpf,
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    });

    setSubmitting(true);

    try {
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Cliente';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Silva';

      const res = await processPlanPaymentAction({
        userId: user.id,
        planId: plan.id,
        couponCode: coupon,
        paymentMethod: payable <= 0 ? 'pix' : paymentMethod,
        payer: {
          firstName,
          lastName,
          email: user.email || profile?.email || '',
          cpf: cleanCpf,
          phone: phone.trim() || undefined,
        },
        card:
          paymentMethod === 'credit_card' && payable > 0
            ? {
                cardNumber: cardNumber.replace(/\D/g, ''),
                cardHolder: cardHolder.trim(),
                cardExpiry: cardExpiry.trim(),
                cardCvv: cardCvv.trim(),
                cardholderCpf: differentCardholder ? cardholderCpf.replace(/\D/g, '') : cleanCpf,
              }
            : undefined,
        installments: paymentMethod === 'credit_card' ? installments : 1,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Não foi possível processar o pagamento.');
        return;
      }

      if (res.data?.isApproved) {
        setPaymentConfirmed(true);
        setPixResult(null);

        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#d4af37', '#e6ca65', '#f6f5f1', '#10b981'],
          });
        } catch {
          // ignore
        }

        await refreshProfile();
      } else if (res.data?.qrCode) {
        setPixResult({
          orderId: res.data.orderId,
          qrCode: res.data.qrCode,
          qrCodeBase64: res.data.qrCodeBase64,
        });
      } else if (res.data?.status === 'pending') {
        setErrorMessage('Seu pagamento está em análise pelo banco. Assim que aprovado, o acesso será liberado.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao conectar com o serviço de pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const installmentOptions = getInstallmentOptions(payable);
  const cardBrand = detectCardBrand(cardNumber);

  let body: React.ReactNode;

  if (!digital) {
    body = (
      <div>
        <p className={EYEBROW}>Agendamento</p>
        <p className="mt-3 text-sm leading-relaxed text-parchment">
          A consultoria presencial é combinada direto com o Titi: data, local e valor. Não é preciso criar conta.
        </p>
        <Button href={whatsappLink(planWhatsappText(plan, profile))} external size="lg" className="mt-6 w-full">
          <WhatsAppIcon className="h-4 w-4" />
          Agendar pelo WhatsApp
        </Button>
      </div>
    );
  } else if (loading || (user && !profile)) {
    body = <PanelLoading />;
  } else if (!user) {
    const entering = authMode === 'login';
    body = (
      <div>
        <p className={EYEBROW}>{paymentReturned || entering ? 'Entre na sua conta' : 'Passo 1 de 2'}</p>
        <p className="mt-3 text-xl font-extrabold leading-tight tracking-[-0.03em] text-ivory">
          {paymentReturned
            ? 'Entre com a conta usada no pagamento'
            : entering
              ? 'Entre para receber o acesso'
              : 'Crie sua conta para receber o acesso'}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          O plano é liberado na sua conta: é nela que ficam sua cartela e seus looks.
        </p>
        <AuthForm
          className="mt-6"
          initialMode={paymentReturned ? 'login' : 'register'}
          onModeChange={setAuthMode}
          onSuccess={() => setJustJoined(true)}
        />
        <p className="mt-4 text-xs leading-relaxed text-smoke">
          Se pedirmos a confirmação do e-mail, confirme e volte a esta página para concluir.
        </p>
      </div>
    );
  } else if (isBlocked) {
    body = <BlockedNotice compact />;
  } else if (paymentConfirmed) {
    body = (
      <div className="space-y-6">
        <div className="rounded-3xl border border-success/40 bg-success/[0.08] p-6 text-center shadow-lg shadow-success/10 animate-in fade-in zoom-in-95">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success/20 text-success">
            <BadgeCheck className="h-8 w-8 text-emerald-400" strokeWidth={1.75} />
          </div>
          <h3 className="mt-4 font-display text-2xl font-bold tracking-[-0.02em] text-ivory">
            Acesso Liberado com Sucesso!
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-parchment">
            Sua assinatura do <strong className="text-gold">{plan.name}</strong> já está ativa na sua conta. Sua leitura
            de colorimetria, cartela e looks já estão disponíveis.
          </p>
          <div className="mt-6">
            <Button href={CONSULTING_PATH} size="lg" className="w-full shadow-lg shadow-gold/25 font-bold">
              Ir para Minha Consultoria
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  } else if (hasAccess && !upgrade && !renewing) {
    body = (
      <div className="space-y-6">
        <ActiveNotice accessUntil={accessUntil} isAdmin={isAdmin} upgrade={upgrade} onRenew={() => setRenewing(true)} />
      </div>
    );
  } else {
    body = (
      <form onSubmit={handleSubmitPayment} className="space-y-6">
        {justJoined && !hasAccess && (
          <p role="status" className="flex items-center gap-2.5 text-sm font-semibold text-success">
            <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Conta pronta. Falta só ativar o plano.
          </p>
        )}

        <div>
          <p className={EYEBROW}>
            {upgrade ? 'Upgrade para o Clube' : renewing ? 'Renovação de Assinatura' : 'Passo 2 de 2'}
          </p>
          <h2 className="mt-1 font-display text-xl text-ivory">
            {upgrade ? 'Confirmar Upgrade' : 'Ativação Instantânea'}
          </h2>
          <p className="mt-1.5 text-xs text-mist leading-relaxed">
            Seu acesso é liberado no sistema automaticamente assim que o pagamento for concluído.
          </p>
        </div>

        {/* Campo de Cupom */}
        {plan.priceCents !== null && (
          <CouponField plan={plan} quote={quote} onQuote={setQuote} disabled={submitting || Boolean(pixResult)} />
        )}

        {/* Resumo do Total */}
        <div className="flex items-baseline justify-between gap-4 rounded-2xl border border-line bg-obsidian/40 px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-smoke">Total</span>
          <span className="text-right">
            {quote && (
              <span className="mr-2 text-sm tabular-nums text-smoke line-through">{formatBRL(quote.originalCents)}</span>
            )}
            <span className="text-xl font-extrabold tabular-nums tracking-[-0.02em] text-ivory">{formatBRL(payable)}</span>
            <span className="ml-1.5 text-xs text-mist">{plan.cadence}</span>
          </span>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-danger/40 bg-danger/10 p-3.5 text-xs text-danger flex items-start gap-2.5 animate-in fade-in">
            <CircleAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Cupom 100% */}
        {payable <= 0 ? (
          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full font-bold shadow-lg shadow-gold/20"
            loading={submitting}
          >
            <Sparkles className="h-4 w-4" />
            Ativar Acesso Grátis com Cupom
          </Button>
        ) : pixResult ? (
          /* TELA DO PIX GERADO */
          <div className="space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center justify-center p-5 bg-obsidian/70 rounded-2xl border border-line-gold/40">
              {pixResult.qrCodeBase64 ? (
                <img
                  src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-48 h-48 rounded-xl bg-white p-2 shadow-lg shadow-gold/10"
                />
              ) : (
                <div className="w-48 h-48 rounded-xl bg-surface flex items-center justify-center border border-line">
                  <QrCode className="h-12 w-12 text-gold animate-pulse" />
                </div>
              )}
              <p className="mt-3 text-xs text-parchment font-medium text-center">
                Abra o app do seu banco e escaneie o QR Code acima
              </p>
            </div>

            {/* Código Copia e Cola */}
            {pixResult.qrCode && (
              <div className="space-y-1.5">
                <span className="text-xs text-mist font-medium">Ou pague com o Pix Copia e Cola:</span>
                <div className="flex items-center gap-2 bg-obsidian border border-line rounded-xl p-2.5">
                  <input
                    readOnly
                    value={pixResult.qrCode}
                    className="bg-transparent flex-1 text-xs text-mist truncate outline-none select-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="btn btn-gold h-8 px-3 text-xs gap-1.5 shrink-0"
                  >
                    {copiedPix ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Indicador de monitoramento em tempo real */}
            <div className="flex items-center gap-3 rounded-xl border border-line-gold bg-gold/[0.05] p-3 text-xs text-gold">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold" />
              <span>
                Aguardando pagamento... Assim que você pagar no app do seu banco, esta tela libera seu acesso na hora.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPixResult(null)}
              className="w-full text-center text-xs text-smoke hover:text-parchment transition-colors py-2"
            >
              Escolher outra forma de pagamento
            </button>
          </div>
        ) : (
          /* FORMULÁRIO DE CHECKOUT TRANSPARENTE */
          <div className="space-y-5">
            {/* Dados do Comprador */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-smoke">Seus Dados</span>
              <div>
                <label className="block text-xs text-mist mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-line bg-obsidian/60 px-3.5 py-2.5 text-sm text-ivory placeholder:text-smoke focus:border-gold outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-mist mb-1">CPF (obrigatório para pagamento)</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    maxLength={14}
                    className="w-full rounded-xl border border-line bg-obsidian/60 px-3.5 py-2.5 text-sm text-ivory font-mono placeholder:text-smoke focus:border-gold outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-mist mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                    maxLength={15}
                    className="w-full rounded-xl border border-line bg-obsidian/60 px-3.5 py-2.5 text-sm text-ivory font-mono placeholder:text-smoke focus:border-gold outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Seletor de Forma de Pagamento */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-smoke">Forma de Pagamento</span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3.5 transition-all text-xs font-semibold',
                    paymentMethod === 'pix'
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 shadow-md shadow-emerald-500/10'
                      : 'border-line bg-obsidian/40 text-mist hover:border-line-gold hover:text-parchment'
                  )}
                >
                  <QrCode className="h-5 w-5 text-emerald-400" />
                  <span>Pix Instantâneo</span>
                  <span className="text-[10px] text-emerald-400/90 font-bold">Liberação imediata</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3.5 transition-all text-xs font-semibold',
                    paymentMethod === 'credit_card'
                      ? 'border-gold bg-gold/10 text-gold shadow-md shadow-gold/10'
                      : 'border-line bg-obsidian/40 text-mist hover:border-line-gold hover:text-parchment'
                  )}
                >
                  <CreditCard className="h-5 w-5 text-gold" />
                  <span>Cartão de Crédito</span>
                  <span className="text-[10px] text-smoke">Em até 12x</span>
                </button>
              </div>
            </div>

            {/* SE PIX */}
            {paymentMethod === 'pix' && (
              <div className="space-y-4 rounded-2xl border border-line bg-obsidian/40 p-4 animate-in fade-in">
                <p className="text-xs text-parchment leading-relaxed">
                  Ao clicar abaixo, o QR Code e o código Pix Copia e Cola serão exibidos na tela. A liberação na sua
                  conta é 100% automática em segundos.
                </p>
                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="w-full font-bold shadow-lg shadow-gold/20"
                  loading={submitting}
                >
                  <QrCode className="h-4 w-4" />
                  Gerar Código Pix ({formatBRL(payable)})
                </Button>
              </div>
            )}

            {/* SE CARTÃO DE CRÉDITO */}
            {paymentMethod === 'credit_card' && (
              <div className="space-y-3.5 rounded-2xl border border-line bg-obsidian/40 p-4 animate-in fade-in">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-mist">Número do Cartão</label>
                    {cardBrand && <span className="text-[10px] text-gold font-bold uppercase">{cardBrand}</span>}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-sm text-ivory font-mono placeholder:text-smoke focus:border-gold outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-mist mb-1">Nome impresso no Cartão</label>
                  <input
                    type="text"
                    required
                    placeholder="Como no cartão"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-sm text-ivory placeholder:text-smoke focus:border-gold outline-none uppercase transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-mist mb-1">Validade</label>
                    <input
                      type="text"
                      required
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                      maxLength={5}
                      className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-sm text-ivory font-mono placeholder:text-smoke focus:border-gold outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-mist mb-1">CVV</label>
                    <input
                      type="password"
                      required
                      placeholder="123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(formatCardCvv(e.target.value))}
                      maxLength={4}
                      className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-sm text-ivory font-mono placeholder:text-smoke focus:border-gold outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Parcelas */}
                <div>
                  <label className="block text-xs text-mist mb-1">Parcelamento</label>
                  <select
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                    className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-xs text-ivory focus:border-gold outline-none transition-colors"
                  >
                    {installmentOptions.map((opt) => (
                      <option key={opt.installments} value={opt.installments}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Titular diferente */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-mist">
                    <input
                      type="checkbox"
                      checked={differentCardholder}
                      onChange={(e) => setDifferentCardholder(e.target.checked)}
                      className="rounded border-line bg-obsidian text-gold focus:ring-gold"
                    />
                    <span>O titular do cartão é diferente do comprador</span>
                  </label>
                  {differentCardholder && (
                    <div className="mt-2.5 animate-in fade-in">
                      <label className="block text-xs text-mist mb-1">CPF do Titular do Cartão</label>
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={cardholderCpf}
                        onChange={(e) => setCardholderCpf(formatCPF(e.target.value))}
                        maxLength={14}
                        className="w-full rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-sm text-ivory font-mono placeholder:text-smoke focus:border-gold outline-none transition-colors"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="gold"
                  size="lg"
                  className="w-full font-bold shadow-lg shadow-gold/20 mt-2"
                  loading={submitting}
                >
                  <CreditCard className="h-4 w-4" />
                  Pagar e Ativar Acesso ({formatBRL(payable)})
                </Button>
              </div>
            )}
          </div>
        )}

        {profile?.email && (
          <p className="text-xs text-smoke">
            Conta: <span className="break-all text-mist">{profile.email}</span>
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="panel rounded-3xl p-6 sm:p-8">
      <div className="space-y-6">
        {digital && returnStatus && user && !isBlocked && <ReturnNotice status={returnStatus} hasAccess={hasAccess} />}
        {body}
      </div>

      <div className="mt-8 space-y-4 border-t border-line pt-6">
        <p className="flex items-start gap-2.5 text-xs leading-relaxed text-mist">
          <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
          {online
            ? "Pagamento seguro processado pelo Mercado Pago. Seus dados estão protegidos por criptografia de ponta a ponta."
            : 'Nenhum pagamento é feito neste site: você combina direto com o Titi.'}
        </p>
        <a
          href={whatsappLink(HELP_TEXT)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gold-light transition-colors hover:text-ivory"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Dúvidas antes de assinar? Falar com o Titi
        </a>
      </div>
    </div>
  );
}

