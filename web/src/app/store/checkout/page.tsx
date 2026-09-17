'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Copy, 
  Check, 
  ArrowLeft, 
  Lock, 
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useCart } from '@/providers/CartProvider';
import { formatBRL } from '@/lib/format';

interface ShippingOption {
  id: string;
  name: string;
  carrier: string;
  priceCents: number;
  deliveryDays: number;
  isFree?: boolean;
}

export default function TransparentCheckoutPage() {
  const router = useRouter();
  const { items, subtotalCents, clear } = useCart();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  // Shipping states
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('MG');

  // Shipping calculation states
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixResult, setPixResult] = useState<{
    orderId: string;
    qrCodeBase64?: string | null;
    qrCode?: string | null;
  } | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Total calculado (subtotal + frete)
  const shippingCents = selectedShipping?.priceCents ?? 0;
  const grandTotalCents = subtotalCents + shippingCents;

  // Formatações de input
  const handleCpfChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) setCpf(raw);
    else if (raw.length <= 6) setCpf(`${raw.slice(0, 3)}.${raw.slice(3)}`);
    else if (raw.length <= 9) setCpf(`${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`);
    else setCpf(`${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`);
  };

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) setPhone(raw);
    else if (raw.length <= 7) setPhone(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    else setPhone(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`);
  };

  const handleCepChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) setCep(raw);
    else setCep(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  };

  // Busca frete no Melhor Envio
  const fetchShipping = async (cleanCep: string) => {
    setLoadingShipping(true);
    try {
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCep: cleanCep,
          itemsCount: items.reduce((acc, i) => acc + i.quantity, 0),
          subtotalCents,
        }),
      });
      const data = await res.json();
      if (data.options && data.options.length > 0) {
        setShippingOptions(data.options);
        // Seleciona a primeira opção por padrão (geralmente a mais econômica)
        setSelectedShipping(data.options[0]);
      }
    } catch {
      // ignora erro
    } finally {
      setLoadingShipping(false);
    }
  };

  // Busca CEP via ViaCEP + Dispara cálculo de frete
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || 'MG');
        }
      } catch {
        // ignora erro silencioso
      }

      // Calcula as opções de frete
      await fetchShipping(cleanCep);
    }
  };

  // Monitora o pagamento Pix em tempo real
  useEffect(() => {
    if (!pixResult?.orderId) return;

    const currentOrderId = pixResult.orderId;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?orderId=${encodeURIComponent(currentOrderId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.isPaid) {
          clearInterval(interval);
          setConfirmedOrderId(currentOrderId);
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
        }
      } catch {
        // ignora erro transitório
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pixResult?.orderId]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const payload = {
        amountCents: grandTotalCents,
        paymentMethod,
        payer: {
          firstName,
          lastName,
          email,
          cpf,
          phone,
        },
        shipping: {
          cep,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
        },
        shippingService: selectedShipping
          ? {
              id: selectedShipping.id,
              name: `${selectedShipping.carrier} - ${selectedShipping.name}`,
              priceCents: selectedShipping.priceCents,
              deliveryDays: selectedShipping.deliveryDays,
            }
          : undefined,
        items: items.map((i) => ({
          name: i.name,
          priceCents: i.priceCents,
          quantity: i.quantity,
          size: i.size,
          color: i.color,
        })),
        installments: paymentMethod === 'credit_card' ? installments : undefined,
      };

      const res = await fetch('/api/checkout/transparent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      clear();

      if (paymentMethod === 'pix') {
        setPixResult({
          orderId: data.orderId,
          qrCodeBase64: data.qrCodeBase64,
          qrCode: data.qrCode,
        });
      } else {
        setConfirmedOrderId(data.orderId);
        setPaymentConfirmed(true);
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
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (pixResult?.qrCode) {
      navigator.clipboard.writeText(pixResult.qrCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  if (items.length === 0 && !pixResult && !paymentConfirmed) {
    return (
      <main className="min-h-[70vh] bg-obsidian text-ivory flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-surface border border-line flex items-center justify-center text-mist mb-4">
          <Truck className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Nenhum item na sua sacola</h1>
        <p className="mt-2 text-sm text-mist">Adicione peças da coleção para prosseguir com a compra.</p>
        <Link href="/colecao" className="btn btn-gold btn-md mt-6">
          Ver Coleção Completa
        </Link>
      </main>
    );
  }

  return (
    <main id="conteudo" className="min-h-screen bg-obsidian text-ivory pt-28 pb-20 sm:pt-36 sm:pb-28">
      <div className="container-luxe max-w-5xl">
        
        <div className="mb-8">
          <Link
            href="/carrinho"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mist hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para a Sacola</span>
          </Link>
          <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-3xl font-extrabold text-ivory">Checkout Seguro</h1>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              <Lock className="h-3.5 w-3.5" />
              <span>Ambiente Criptografado SSL 256-bit</span>
            </span>
          </div>
        </div>

        {/* 1. TELA DE SUCESSO PIX COM QR CODE E STATUS AO VIVO */}
        {pixResult && (
          <div className="rounded-3xl border border-line-gold bg-surface/90 p-8 sm:p-12 text-center space-y-6 animate-in zoom-in-95 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold mx-auto">
              <QrCode className="h-8 w-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold text-xs font-bold uppercase tracking-widest mb-2 border border-line-gold">
                <Clock className="h-3.5 w-3.5 animate-spin" />
                <span>Aguardando Pagamento em Tempo Real</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ivory">Pix Gerado com Sucesso!</h2>
              <p className="text-sm text-mist mt-1">
                Pedido <strong>#{pixResult.orderId}</strong> registrado. Pague agora pelo aplicativo do seu banco.
              </p>
            </div>

            {/* QR Code Imagem em Alta Definição */}
            {pixResult.qrCodeBase64 && (
              <div className="mx-auto w-64 h-64 bg-white p-3 rounded-2xl shadow-2xl border-4 border-gold/40 flex items-center justify-center">
                <img
                  src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Chave Pix Copia e Cola */}
            {pixResult.qrCode && (
              <div className="max-w-lg mx-auto space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-parchment block">
                  Código Pix Copia e Cola:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixResult.qrCode}
                    className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-3 text-xs text-mist font-mono truncate select-all focus:outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    onClick={copyPixCode}
                    className="px-5 py-3 rounded-xl bg-gold text-obsidian font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-gold-light transition-all shrink-0 active:scale-95 shadow-lg shadow-gold/20"
                  >
                    {copiedPix ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-surface border border-line max-w-lg mx-auto text-xs text-mist space-y-1">
              <p className="font-bold text-ivory">⚡ Identificação Automática:</p>
              <p>Não feche esta página. Assim que você pagar no app do seu banco, ela se atualizará sozinha em poucos segundos!</p>
            </div>

            <div>
              <Link href="/colecao" className="btn btn-outline btn-md inline-flex">
                Voltar à Coleção
              </Link>
            </div>
          </div>
        )}

        {/* 2. TELA DE SUCESSO APROVADO (CARTÃO OU PIX CONFIRMADO) */}
        {paymentConfirmed && (
          <div className="rounded-3xl border border-line-gold bg-surface/90 p-8 sm:p-12 text-center space-y-6 animate-in zoom-in-95 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                ✓ Pedido Confirmado
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ivory">Pagamento Aprovado com Sucesso!</h2>
              {confirmedOrderId && (
                <p className="text-base text-gold font-mono font-bold mt-1">
                  Pedido #{confirmedOrderId}
                </p>
              )}
            </div>
            <p className="text-sm text-mist max-w-md mx-auto leading-relaxed">
              Recebemos seu pedido e nossa equipe de alfaiataria já está cuidando da preparação das suas peças.
              Você receberá a confirmação e o código de rastreamento por e-mail e WhatsApp!
            </p>
            <div className="pt-2 flex justify-center gap-4">
              <Link href="/colecao" className="btn btn-gold btn-md inline-flex shadow-xl shadow-gold/25">
                Continuar Comprando
              </Link>
            </div>
          </div>
        )}

        {/* 3. FORMULÁRIO PRINCIPAL DE CHECKOUT */}
        {!pixResult && !paymentConfirmed && (
          <form onSubmit={handleCheckout} className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            
            <div className="lg:col-span-7 space-y-8">
              
              {/* DADOS PESSOAIS */}
              <div className="rounded-2xl border border-line bg-surface/60 p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                  <span>1. Dados Pessoais</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">Nome:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Lucas"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">Sobrenome:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Silva"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">E-mail para Confirmação:</label>
                    <input
                      type="email"
                      required
                      placeholder="seuemail@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">CPF (obrigatório para envio):</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => handleCpfChange(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-mist mb-1">WhatsApp com DDD (para atualizações):</label>
                  <input
                    type="tel"
                    required
                    placeholder="(31) 99999-9999"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* ENDEREÇO DE ENTREGA */}
              <div className="rounded-2xl border border-line bg-surface/60 p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>2. Endereço de Entrega</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">CEP:</label>
                    <input
                      type="text"
                      required
                      placeholder="00000-000"
                      value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      onBlur={handleCepBlur}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-mist mb-1">Rua / Avenida:</label>
                    <input
                      type="text"
                      required
                      placeholder="Nome da rua"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">Número:</label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-mist mb-1">Complemento / Apto:</label>
                    <input
                      type="text"
                      placeholder="Ex: Apto 301 Bloco B"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">Bairro:</label>
                    <input
                      type="text"
                      required
                      placeholder="Bairro"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">Cidade:</label>
                    <input
                      type="text"
                      required
                      placeholder="Cidade"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">Estado:</label>
                    <input
                      type="text"
                      required
                      placeholder="MG"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory uppercase focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                {/* OPÇÕES DE FRETE (MELHOR ENVIO) */}
                <div className="border-t border-line/60 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-parchment">
                      Opções de Envio (Correios & Jadlog):
                    </span>
                    {loadingShipping && (
                      <span className="flex items-center gap-1.5 text-[11px] text-gold animate-pulse">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Calculando fretes...</span>
                      </span>
                    )}
                  </div>

                  {shippingOptions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {shippingOptions.map((opt) => {
                        const isSelected = selectedShipping?.id === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedShipping(opt)}
                            className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                              isSelected
                                ? 'border-gold bg-gold/10 text-gold shadow-md'
                                : 'border-line bg-obsidian text-mist hover:border-line-gold'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs text-ivory">{opt.carrier}</span>
                                <span className="text-[10px] text-smoke uppercase">{opt.name}</span>
                              </div>
                              <p className="text-[11px] text-mist mt-1">
                                Até {opt.deliveryDays} {opt.deliveryDays === 1 ? 'dia útil' : 'dias úteis'}
                              </p>
                            </div>
                            <div className="mt-3">
                              {opt.isFree ? (
                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                  Grátis
                                </span>
                              ) : (
                                <span className="font-bold text-xs text-ivory">
                                  {formatBRL(opt.priceCents)}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-smoke italic">
                      Digite seu CEP acima para carregar as opções de envio dos Correios e Jadlog.
                    </p>
                  )}
                </div>
              </div>

              {/* FORMA DE PAGAMENTO */}
              <div className="rounded-2xl border border-line bg-surface/60 p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>3. Pagamento Transparente</span>
                </h3>

                {/* Seleção Pix vs Cartão */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-gold bg-gold/10 text-gold shadow-md shadow-gold/10'
                        : 'border-line bg-surface text-mist hover:border-line-gold'
                    }`}
                  >
                    <QrCode className="h-6 w-6" />
                    <span className="text-xs font-bold uppercase tracking-wider">Pix Instantâneo</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Confirmação Imediata</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'credit_card'
                        ? 'border-gold bg-gold/10 text-gold shadow-md shadow-gold/10'
                        : 'border-line bg-surface text-mist hover:border-line-gold'
                    }`}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="text-xs font-bold uppercase tracking-wider">Cartão de Crédito</span>
                    <span className="text-[10px] text-mist">Em até 12x</span>
                  </button>
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className="space-y-4 pt-2 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">Número do Cartão:</label>
                      <input
                        type="text"
                        required
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">Nome Impresso no Cartão:</label>
                      <input
                        type="text"
                        required
                        placeholder="Como impresso no cartão"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory uppercase focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-mist mb-1">Validade (MM/AA):</label>
                        <input
                          type="text"
                          required
                          placeholder="12/28"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-mist mb-1">CVV (3 ou 4 dígitos):</label>
                        <input
                          type="text"
                          required
                          placeholder="123"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">Número de Parcelas:</label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                      >
                        <option value={1}>1x de {formatBRL(grandTotalCents)} sem juros</option>
                        <option value={2}>2x de {formatBRL(grandTotalCents / 2)} sem juros</option>
                        <option value={3}>3x de {formatBRL(grandTotalCents / 3)} sem juros</option>
                        <option value={6}>6x de {formatBRL(grandTotalCents / 6)} sem juros</option>
                        <option value={10}>10x de {formatBRL(grandTotalCents / 10)}</option>
                        <option value={12}>12x de {formatBRL(grandTotalCents / 12)}</option>
                      </select>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-full bg-gold-gradient text-obsidian font-black text-xs uppercase tracking-wider shadow-xl shadow-gold/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="h-4 w-4 text-obsidian" />
                  <span>
                    {loading 
                      ? 'Processando no Mercado Pago...' 
                      : paymentMethod === 'pix' 
                        ? `Gerar QR Code Pix · ${formatBRL(grandTotalCents)}` 
                        : `Finalizar Pedido · ${formatBRL(grandTotalCents)}`}
                  </span>
                </button>
              </div>

            </div>

            {/* RESUMO LATERAL DO PEDIDO */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-line bg-surface/70 p-6 space-y-6 sticky top-28">
                <h3 className="text-sm font-bold uppercase tracking-wider text-ivory border-b border-line pb-3">
                  Resumo do Pedido ({items.length} {items.length === 1 ? 'item' : 'itens'})
                </h3>

                <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.key} className="flex gap-3 text-xs items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-surface border border-line">
                          <Image src={item.image || '/skin_morena_model.jpg'} alt="" fill className="object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-ivory line-clamp-1">{item.name}</p>
                          <p className="text-[10px] text-mist">
                            {item.size && `Tam: ${item.size}`} · Qtd: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-bold text-gold shrink-0">
                        {item.priceCents ? formatBRL(item.priceCents * item.quantity) : 'Sob consulta'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-line pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-mist">
                    <span>Subtotal</span>
                    <span className="text-ivory font-bold">{formatBRL(subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-mist items-center">
                    <span>Frete</span>
                    {selectedShipping ? (
                      selectedShipping.isFree ? (
                        <span className="text-emerald-400 font-bold">Grátis</span>
                      ) : (
                        <span className="text-ivory font-bold">{formatBRL(selectedShipping.priceCents)}</span>
                      )
                    ) : (
                      <span className="text-smoke italic">Informe o CEP</span>
                    )}
                  </div>
                  {selectedShipping && (
                    <p className="text-[10px] text-mist text-right">
                      {selectedShipping.carrier} ({selectedShipping.name}) · {selectedShipping.deliveryDays}d úteis
                    </p>
                  )}
                  <div className="border-t border-line pt-3 flex justify-between text-sm font-bold text-ivory">
                    <span>Total a Pagar</span>
                    <span className="text-gold text-xl font-extrabold">{formatBRL(grandTotalCents)}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-obsidian p-3.5 text-[11px] text-mist space-y-2">
                  <div className="flex items-center gap-2 text-gold font-bold">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Experiência Titi&apos;s Store</span>
                  </div>
                  <p>✓ Peças conferidas e passadas artesanalmente antes do despacho.</p>
                  <p>✓ 1ª Troca grátis e devolução em até 7 dias após o recebimento.</p>
                </div>
              </div>
            </div>

          </form>
        )}

      </div>
    </main>
  );
}
