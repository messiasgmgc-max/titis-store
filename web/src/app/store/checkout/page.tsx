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
  Loader2,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import { useCart } from '@/providers/CartProvider';
import { useSession } from '@/providers/SessionProvider';
import { formatBRL, formatCEP, formatCPF, formatPhoneBR } from '@/lib/format';

interface ShippingOption {
  id: string;
  name: string;
  carrier: string;
  priceCents: number;
  deliveryDays: number;
  isFree?: boolean;
}

const STORAGE_KEY = 'titis_checkout_customer';

export default function TransparentCheckoutPage() {
  const router = useRouter();
  const { items, subtotalCents, setQuantity, remove, clear } = useCart();
  const { user, profile, updateProfile } = useSession();

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
  const [hydrated, setHydrated] = useState(false);

  // Total calculado (subtotal + frete)
  const shippingCents = selectedShipping?.priceCents ?? 0;
  const grandTotalCents = subtotalCents + shippingCents;

  // Função para salvar dados localmente e na conta
  const persistCustomerData = (patch: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const updated = { ...existing, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (user) {
      const pFirst = patch.firstName !== undefined ? patch.firstName : firstName;
      const pLast = patch.lastName !== undefined ? patch.lastName : lastName;
      const fullName = `${pFirst || ''} ${pLast || ''}`.trim();
      void updateProfile({
        ...(fullName ? { full_name: fullName } : {}),
        ...(patch.phone !== undefined ? { phone: String(patch.phone) } : {}),
        ...(patch.cpf !== undefined ? { cpf: String(patch.cpf) } : {}),
        shipping_address: {
          cep: String(patch.cep !== undefined ? patch.cep : cep),
          street: String(patch.street !== undefined ? patch.street : street),
          number: String(patch.number !== undefined ? patch.number : number),
          complement: String(patch.complement !== undefined ? patch.complement : complement),
          neighborhood: String(patch.neighborhood !== undefined ? patch.neighborhood : neighborhood),
          city: String(patch.city !== undefined ? patch.city : city),
          state: String(patch.state !== undefined ? patch.state : state),
        },
      });
    }
  };

  // Fallback regional instantâneo caso a API esteja temporariamente offline
  const applyClientShippingFallback = (cleanCep: string) => {
    const cepNum = parseInt(cleanCep.substring(0, 5), 10);
    const isFreeEligible = subtotalCents >= 39900; // Frete grátis acima de R$ 399

    let pacCents = 2490;
    let sedexCents = 3890;
    let pacDays = 6;
    let sedexDays = 2;

    if (cepNum >= 30000 && cepNum <= 39999) {
      // MG (Origem)
      pacCents = 1890;
      sedexCents = 2490;
      pacDays = 3;
      sedexDays = 1;
    } else if (
      (cepNum >= 1000 && cepNum <= 19999) || // SP
      (cepNum >= 20000 && cepNum <= 28999) || // RJ
      (cepNum >= 29000 && cepNum <= 29999) // ES
    ) {
      pacCents = 2290;
      sedexCents = 3290;
      pacDays = 5;
      sedexDays = 2;
    } else if (cepNum >= 80000 && cepNum <= 99999) {
      // Sul
      pacCents = 2890;
      sedexCents = 4490;
      pacDays = 7;
      sedexDays = 3;
    } else if (cepNum >= 70000 && cepNum <= 79999) {
      // Centro-Oeste
      pacCents = 2990;
      sedexCents = 4690;
      pacDays = 7;
      sedexDays = 3;
    } else if (cepNum >= 40000 && cepNum <= 65999) {
      // Nordeste
      pacCents = 3490;
      sedexCents = 5990;
      pacDays = 9;
      sedexDays = 4;
    } else {
      // Norte
      pacCents = 4290;
      sedexCents = 7490;
      pacDays = 12;
      sedexDays = 5;
    }

    const fallbackList: ShippingOption[] = [
      {
        id: 'pac',
        name: 'Correios PAC',
        carrier: 'Correios',
        priceCents: isFreeEligible ? 0 : pacCents,
        deliveryDays: pacDays,
        isFree: isFreeEligible,
      },
      {
        id: 'sedex',
        name: 'Correios SEDEX',
        carrier: 'Correios',
        priceCents: sedexCents,
        deliveryDays: sedexDays,
        isFree: false,
      },
      {
        id: 'jadlog',
        name: 'Jadlog .Package',
        carrier: 'Jadlog',
        priceCents: Math.max(1990, pacCents - 200),
        deliveryDays: Math.max(2, pacDays - 1),
        isFree: false,
      },
    ];

    setShippingOptions(fallbackList);
    setSelectedShipping((prev) => {
      if (prev && fallbackList.some((o) => o.id === prev.id)) {
        return fallbackList.find((o) => o.id === prev.id) || fallbackList[0];
      }
      return fallbackList[0];
    });
  };

  // Busca frete nos Correios & Jadlog com fallback seguro
  const fetchShipping = async (cleanCep: string) => {
    if (!cleanCep || cleanCep.length !== 8) return;
    setLoadingShipping(true);
    try {
      const res = await fetch('/api/shipping/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationCep: cleanCep,
          itemsCount: Math.max(1, items.reduce((acc, i) => acc + i.quantity, 0)),
          subtotalCents,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.options && data.options.length > 0) {
          setShippingOptions(data.options);
          setSelectedShipping((prev) => {
            if (prev && data.options.some((o: ShippingOption) => o.id === prev.id)) {
              return data.options.find((o: ShippingOption) => o.id === prev.id) || data.options[0];
            }
            return data.options[0];
          });
          return;
        }
      }

      // Aplica fallback de frete regional caso a API não responda com JSON válido
      applyClientShippingFallback(cleanCep);
    } catch {
      applyClientShippingFallback(cleanCep);
    } finally {
      setLoadingShipping(false);
    }
  };

  // Busca CEP via ViaCEP + Dispara cálculo de frete
  const handleCepLookupAndShipping = async (rawCep: string) => {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const newStreet = data.logradouro || '';
          const newNeigh = data.bairro || '';
          const newCity = data.localidade || '';
          const newState = data.uf || 'MG';

          setStreet(newStreet);
          setNeighborhood(newNeigh);
          setCity(newCity);
          setState(newState);

          persistCustomerData({
            cep: formatCEP(cleanCep),
            street: newStreet,
            neighborhood: newNeigh,
            city: newCity,
            state: newState,
          });
        }
      } catch {
        // ignora erro
      }

      await fetchShipping(cleanCep);
    }
  };

  // Pré-carregamento automático do perfil e do localStorage
  useEffect(() => {
    if (hydrated) return;

    let preFirst = '';
    let preLast = '';
    let preEmail = '';
    let prePhone = '';
    let preCpf = '';
    let preCep = '';
    let preStreet = '';
    let preNumber = '';
    let preComp = '';
    let preNeigh = '';
    let preCity = '';
    let preState = 'MG';

    // 1. Tenta carregar do perfil autenticado
    if (profile) {
      if (profile.full_name) {
        const parts = profile.full_name.trim().split(/\s+/);
        preFirst = parts[0] || '';
        preLast = parts.slice(1).join(' ') || '';
      }
      preEmail = profile.email || user?.email || '';
      prePhone = profile.phone ? formatPhoneBR(profile.phone) : '';
      preCpf = profile.cpf ? formatCPF(profile.cpf) : '';

      if (profile.shipping_address) {
        preCep = profile.shipping_address.cep ? formatCEP(profile.shipping_address.cep) : '';
        preStreet = profile.shipping_address.street || '';
        preNumber = profile.shipping_address.number || '';
        preComp = profile.shipping_address.complement || '';
        preNeigh = profile.shipping_address.neighborhood || '';
        preCity = profile.shipping_address.city || '';
        preState = profile.shipping_address.state || 'MG';
      }
    }

    // 2. Se faltar dados, complementa com o localStorage
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (!preFirst && saved.firstName) preFirst = saved.firstName;
        if (!preLast && saved.lastName) preLast = saved.lastName;
        if (!preEmail && saved.email) preEmail = saved.email;
        if (!prePhone && saved.phone) prePhone = saved.phone;
        if (!preCpf && saved.cpf) preCpf = saved.cpf;
        if (!preCep && saved.cep) preCep = saved.cep;
        if (!preStreet && saved.street) preStreet = saved.street;
        if (!preNumber && saved.number) preNumber = saved.number;
        if (!preComp && saved.complement) preComp = saved.complement;
        if (!preNeigh && saved.neighborhood) preNeigh = saved.neighborhood;
        if (!preCity && saved.city) preCity = saved.city;
        if (saved.state) preState = saved.state;
      } catch {
        // ignore
      }
    }

    if (preFirst) setFirstName(preFirst);
    if (preLast) setLastName(preLast);
    if (preEmail) setEmail(preEmail);
    if (prePhone) setPhone(prePhone);
    if (preCpf) setCpf(preCpf);
    if (preCep) setCep(preCep);
    if (preStreet) setStreet(preStreet);
    if (preNumber) setNumber(preNumber);
    if (preComp) setComplement(preComp);
    if (preNeigh) setNeighborhood(preNeigh);
    if (preCity) setCity(preCity);
    if (preState) setState(preState);

    setHydrated(true);

    // Se já tinha CEP válido pré-gravado, dispara o frete na hora!
    const cleanCep = preCep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      void fetchShipping(cleanCep);
    }
  }, [profile, user, hydrated]);

  // Recalcula o frete e faixa de frete grátis caso o subtotal mude ao alterar quantidades
  useEffect(() => {
    if (!hydrated) return;
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      void fetchShipping(cleanCep);
    }
  }, [subtotalCents, hydrated]);

  // Formatações e gatilhos de input
  const handleCpfChange = (val: string) => {
    const formatted = formatCPF(val);
    setCpf(formatted);
    persistCustomerData({ cpf: formatted });
  };

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhoneBR(val);
    setPhone(formatted);
    persistCustomerData({ phone: formatted });
  };

  const handleCepChange = (val: string) => {
    const formatted = formatCEP(val);
    setCep(formatted);
    persistCustomerData({ cep: formatted });
    const raw = val.replace(/\D/g, '');
    if (raw.length === 8) {
      void handleCepLookupAndShipping(raw);
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

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
      }

      if (!res.ok || !data) {
        const errorMsg =
          data?.error ||
          (res.status === 404
            ? 'O servidor de pagamentos online está em atualização no momento. Finalize seu pedido com suporte imediato pelo WhatsApp!'
            : res.status === 503
            ? 'Pagamento online temporariamente indisponível. Finalize diretamente pelo WhatsApp com nossa equipe.'
            : `Falha na comunicação com o servidor (${res.status}). Conclua pelo WhatsApp para garantir suas peças.`);
        throw new Error(errorMsg);
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
      setErrorMessage(err.message || 'Falha ao processar pagamento. Tente novamente ou finalize pelo WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const getWhatsappOrderUrl = () => {
    const phoneNum = '5531996000213';
    const lines = [
      `👑 *NOVO PEDIDO VIA WHATSAPP — TITI'S STORE*`,
      '',
      `👤 *Cliente:* ${firstName} ${lastName}`.trim(),
      email ? `✉️ *E-mail:* ${email}` : '',
      phone ? `📱 *WhatsApp:* ${phone}` : '',
      cpf ? `📄 *CPF:* ${cpf}` : '',
      '',
      `📍 *Endereço de Entrega:*`,
      `${street || 'Rua'}, ${number || 'S/N'}${complement ? ` - ${complement}` : ''}`,
      `${neighborhood ? `${neighborhood}, ` : ''}${city || 'Betim'} - ${state || 'MG'}`,
      `CEP: ${cep || ''}`,
      '',
      `🛍️ *Peças Solicitadas:*`,
      ...items.map(
        (i) =>
          `• ${i.quantity}x ${i.name}${i.size ? ` (Tam: ${i.size})` : ''}${i.color ? ` (Cor: ${i.color})` : ''} — ${formatBRL(
            (i.priceCents ?? 0) * i.quantity
          )}`
      ),
      '',
      `🚚 *Frete:* ${
        selectedShipping
          ? `${selectedShipping.carrier} ${selectedShipping.name} (${
              selectedShipping.isFree ? 'Grátis' : formatBRL(selectedShipping.priceCents)
            })`
          : 'A combinar'
      }`,
      `💰 *Total Geral:* *${formatBRL(grandTotalCents)}*`,
      '',
      `💳 *Forma de Pagamento:* ${
        paymentMethod === 'pix' ? 'Pix Instantâneo' : `Cartão de Crédito (${installments}x)`
      }`,
      '',
      `Olá! Gostaria de finalizar este pedido e receber a chave Pix / link de pagamento com o atendimento exclusivo da Titi's Store!`,
    ]
      .filter(Boolean)
      .join('\n');

    return `https://wa.me/${phoneNum}?text=${encodeURIComponent(lines)}`;
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
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        persistCustomerData({ firstName: e.target.value });
                      }}
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
                      onChange={(e) => {
                        setLastName(e.target.value);
                        persistCustomerData({ lastName: e.target.value });
                      }}
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        persistCustomerData({ email: e.target.value });
                      }}
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
                      onBlur={() => handleCepLookupAndShipping(cep)}
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
                      onChange={(e) => {
                        setStreet(e.target.value);
                        persistCustomerData({ street: e.target.value });
                      }}
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
                      onChange={(e) => {
                        setNumber(e.target.value);
                        persistCustomerData({ number: e.target.value });
                      }}
                      className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-mist mb-1">Complemento / Apto:</label>
                    <input
                      type="text"
                      placeholder="Ex: Apto 301 Bloco B"
                      value={complement}
                      onChange={(e) => {
                        setComplement(e.target.value);
                        persistCustomerData({ complement: e.target.value });
                      }}
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
                      onChange={(e) => {
                        setNeighborhood(e.target.value);
                        persistCustomerData({ neighborhood: e.target.value });
                      }}
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
                      onChange={(e) => {
                        setCity(e.target.value);
                        persistCustomerData({ city: e.target.value });
                      }}
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
                      onChange={(e) => {
                        setState(e.target.value);
                        persistCustomerData({ state: e.target.value });
                      }}
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
                  <div className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs space-y-3 animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-danger" />
                      <div>
                        <p className="font-bold text-ivory">{errorMessage}</p>
                        <p className="text-[11px] text-mist mt-1 leading-relaxed">
                          Não se preocupe: suas peças continuam reservadas! Você pode tentar novamente ou concluir o pedido imediatamente com nosso consultor via WhatsApp.
                        </p>
                      </div>
                    </div>

                    <a
                      href={getWhatsappOrderUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Concluir Pedido pelo WhatsApp com Consultor</span>
                    </a>
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

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1 divide-y divide-line/30">
                  {items.map((item) => (
                    <div key={item.key} className="pt-3 first:pt-0 flex gap-3 text-xs items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-surface border border-line">
                          <Image 
                            src={item.image || '/produtos/calca-alfaiataria-regulador-cinza-grafite.jpg'} 
                            alt={item.name} 
                            fill 
                            className="object-cover" 
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ivory text-xs line-clamp-1" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {item.size && (
                              <span className="text-[10px] text-mist font-medium">
                                Tam: <span className="text-ivory font-bold">{item.size}</span>
                              </span>
                            )}

                            {/* Controles compactos de quantidade: [-] Qtd [+] */}
                            <div className="inline-flex items-center rounded-md border border-line bg-black/40 px-1 py-0.5 gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    setQuantity(item.key, item.quantity - 1);
                                  } else {
                                    remove(item.key);
                                  }
                                }}
                                title={item.quantity === 1 ? 'Remover item' : 'Diminuir quantidade'}
                                className="w-4 h-4 rounded flex items-center justify-center text-mist hover:text-white hover:bg-white/10 transition-colors"
                              >
                                {item.quantity === 1 ? (
                                  <Trash2 className="w-2.5 h-2.5 text-rose-400" />
                                ) : (
                                  <Minus className="w-2.5 h-2.5" />
                                )}
                              </button>
                              <span className="text-[10px] font-bold text-ivory min-w-[14px] text-center select-none">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQuantity(item.key, item.quantity + 1)}
                                title="Adicionar mais unidade"
                                className="w-4 h-4 rounded flex items-center justify-center text-mist hover:text-white hover:bg-white/10 transition-colors"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            {/* Botão de remoção direta */}
                            <button
                              type="button"
                              onClick={() => remove(item.key)}
                              title="Remover produto do pedido"
                              className="text-mist/60 hover:text-rose-400 p-0.5 rounded transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-gold text-xs block">
                          {item.priceCents ? formatBRL(item.priceCents * item.quantity) : 'Sob consulta'}
                        </span>
                        {item.quantity > 1 && item.priceCents && (
                          <span className="text-[9px] text-mist block">
                            {formatBRL(item.priceCents)} un.
                          </span>
                        )}
                      </div>
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
