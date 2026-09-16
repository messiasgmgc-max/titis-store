'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
  AlertCircle
} from 'lucide-react';
import { useCart } from '@/providers/CartProvider';
import { formatBRL } from '@/lib/format';

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
  const [cardSuccess, setCardSuccess] = useState(false);

  // Busca CEP via ViaCEP
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
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const payload = {
        amountCents: subtotalCents,
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
        setCardSuccess(true);
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

  if (items.length === 0 && !pixResult && !cardSuccess) {
    return (
      <main className="min-h-[70vh] bg-obsidian text-ivory flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold">Nenhum item para checkout</h1>
        <p className="mt-2 text-sm text-mist">Adicione peças à sua sacola para prosseguir.</p>
        <Link href="/colecao" className="btn btn-gold btn-md mt-6">
          Ver Coleção
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
            <div className="mt-4 flex items-center justify-between">
              <h1 className="text-3xl font-extrabold text-ivory">Checkout Transparente</h1>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <Lock className="h-3.5 w-3.5" />
                <span>Ambiente Seguro SSL 256-bit</span>
              </span>
            </div>
          </div>

          {/* SUCESSO PIX */}
          {pixResult && (
            <div className="rounded-3xl border border-line-gold bg-surface/90 p-8 text-center space-y-6 animate-in zoom-in-95 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center text-gold mx-auto">
                <QrCode className="h-8 w-8" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-ivory">Pix Gerado com Sucesso!</h2>
                <p className="text-sm text-mist mt-1">
                  Pedido <strong>#{pixResult.orderId}</strong> registrado. Pague pelo aplicativo do seu banco.
                </p>
              </div>

              {/* QR Code Imagem */}
              {pixResult.qrCodeBase64 && (
                <div className="mx-auto w-56 h-56 bg-white p-3 rounded-2xl shadow-xl border-4 border-gold/30 flex items-center justify-center">
                  <img
                    src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Chave Pix Copia e Cola */}
              {pixResult.qrCode && (
                <div className="max-w-md mx-auto space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-parchment block">
                    Pix Copia e Cola:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixResult.qrCode}
                      className="w-full bg-obsidian border border-line rounded-xl px-3 py-2.5 text-xs text-mist font-mono truncate"
                    />
                    <button
                      onClick={copyPixCode}
                      className="px-4 py-2.5 rounded-xl bg-gold text-obsidian font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-gold-light transition-colors shrink-0"
                    >
                      {copiedPix ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs text-mist border-t border-line pt-4 max-w-sm mx-auto">
                Assim que você realizar o pagamento, nosso sistema identificará automaticamente e enviará a confirmação no seu WhatsApp!
              </div>

              <Link href="/colecao" className="btn btn-outline btn-md inline-flex">
                Voltar à Loja
              </Link>
            </div>
          )}

          {/* SUCESSO CARTÃO */}
          {cardSuccess && (
            <div className="rounded-3xl border border-line-gold bg-surface/90 p-8 text-center space-y-6 animate-in zoom-in-95 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-ivory">Pagamento Aprovado!</h2>
                <p className="text-sm text-mist mt-1">
                  Seu pedido foi processado e confirmado pelo Mercado Pago com sucesso.
                </p>
              </div>
              <p className="text-xs text-mist max-w-md mx-auto">
                Enviamos os detalhes do pedido para o seu e-mail e nosso alfaiate entrará em contato via WhatsApp com os detalhes de rastreio!
              </p>
              <Link href="/colecao" className="btn btn-gold btn-md inline-flex">
                Continuar Comprando
              </Link>
            </div>
          )}

          {/* FORMULÁRIO DE CHECKOUT */}
          {!pixResult && !cardSuccess && (
            <form onSubmit={handleCheckout} className="grid grid-cols-1 gap-12 lg:grid-cols-12">
              
              <div className="lg:col-span-7 space-y-8">
                
                {/* 1. DADOS DO CLIENTE */}
                <div className="rounded-2xl border border-line bg-surface/60 p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                    <span>1. Dados Pessoais</span>
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">Nome:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Lucas"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
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
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">E-mail para Recibo:</label>
                      <input
                        type="email"
                        required
                        placeholder="seuemail@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">CPF (obrigatório para nota fiscal):</label>
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-mist mb-1">WhatsApp / Celular com DDD:</label>
                    <input
                      type="tel"
                      required
                      placeholder="(31) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                {/* 2. ENDEREÇO DE ENTREGA */}
                <div className="rounded-2xl border border-line bg-surface/60 p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gold flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    <span>2. Endereço de Entrega</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">CEP:</label>
                      <input
                        type="text"
                        required
                        placeholder="00000-000"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        onBlur={handleCepBlur}
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-mist mb-1">Rua / Avenida:</label>
                      <input
                        type="text"
                        required
                        placeholder="Nome da rua"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">Número:</label>
                      <input
                        type="text"
                        required
                        placeholder="123"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-bold text-mist mb-1">Complemento / Apto:</label>
                      <input
                        type="text"
                        placeholder="Ex: Apto 301 Bloco B"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-mist mb-1">Bairro:</label>
                      <input
                        type="text"
                        required
                        placeholder="Bairro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
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
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
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
                        className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory uppercase focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. FORMA DE PAGAMENTO */}
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
                          ? 'border-gold bg-gold/10 text-gold shadow-md'
                          : 'border-line bg-surface text-mist hover:border-line-gold'
                      }`}
                    >
                      <QrCode className="h-6 w-6" />
                      <span className="text-xs font-bold uppercase tracking-wider">Pix Instantâneo</span>
                      <span className="text-[10px] text-emerald-400">Aprovação Imediata</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'credit_card'
                          ? 'border-gold bg-gold/10 text-gold shadow-md'
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
                          className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-mist mb-1">Nome Impresso no Cartão:</label>
                        <input
                          type="text"
                          required
                          placeholder="Como está gravado no cartão"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory uppercase focus:outline-none focus:border-gold"
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
                            className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
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
                            className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-mist mb-1">Número de Parcelas:</label>
                        <select
                          value={installments}
                          onChange={(e) => setInstallments(Number(e.target.value))}
                          className="w-full bg-obsidian border border-line rounded-xl px-3 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
                        >
                          <option value={1}>1x de {formatBRL(subtotalCents)} sem juros</option>
                          <option value={2}>2x de {formatBRL(subtotalCents / 2)} sem juros</option>
                          <option value={3}>3x de {formatBRL(subtotalCents / 3)} sem juros</option>
                          <option value={6}>6x de {formatBRL(subtotalCents / 6)} sem juros</option>
                          <option value={10}>10x de {formatBRL(subtotalCents / 10)}</option>
                          <option value={12}>12x de {formatBRL(subtotalCents / 12)}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
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
                        ? 'Processando...' 
                        : paymentMethod === 'pix' 
                          ? `Gerar Código Pix · ${formatBRL(subtotalCents)}` 
                          : `Pagar com Cartão · ${formatBRL(subtotalCents)}`}
                    </span>
                  </button>
                </div>

              </div>

              {/* RESUMO LATERAL */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-line bg-surface/70 p-6 space-y-6 sticky top-28">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ivory border-b border-line pb-3">
                    Itens no Pedido ({items.length})
                  </h3>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
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
                    <div className="flex justify-between text-mist">
                      <span>Frete</span>
                      <span className="text-emerald-400 font-bold">Grátis para todo o Brasil</span>
                    </div>
                    <div className="border-t border-line pt-3 flex justify-between text-sm font-bold text-ivory">
                      <span>Total</span>
                      <span className="text-gold text-lg">{formatBRL(subtotalCents)}</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-obsidian p-3 text-[11px] text-mist space-y-1">
                    <p className="font-bold text-parchment">Garantia Titi&apos;s Store</p>
                    <p>Você tem 7 dias após o recebimento para troca ou devolução gratuita.</p>
                  </div>
                </div>
              </div>

            </form>
          )}

        </div>
      </main>
  );
}
