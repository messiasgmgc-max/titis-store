'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft, ShieldCheck, Ticket } from 'lucide-react';
import { useCart } from '@/providers/CartProvider';
import { formatBRL } from '@/lib/format';
import { Button } from '@/components/ui/Button';

export default function CartPage() {
  const { items, count, subtotalCents, setQuantity, remove, clear } = useCart();
  const [coupon, setCoupon] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const finalTotalCents = Math.max(0, subtotalCents - appliedDiscount);

  if (items.length === 0) {
    return (
      <main className="min-h-[70vh] bg-obsidian text-ivory flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full border border-line-gold bg-gold/10 flex items-center justify-center text-gold mb-4">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-ivory">Sua sacola está vazia</h1>
        <p className="mt-2 text-sm text-mist max-w-sm">
          Explore nossa coleção de alta costura masculina e selecione peças que valorizem seu estilo.
        </p>
        <Button href="/colecao" variant="gold" className="mt-6">
          Explorar Coleção
        </Button>
      </main>
    );
  }

  return (
    <main id="conteudo" className="min-h-screen bg-obsidian text-ivory pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div className="container-luxe">
          
          <div className="flex items-center justify-between border-b border-line pb-6 mb-8">
            <div>
              <h1 className="text-2xl font-extrabold text-ivory sm:text-3xl">
                Sacola de Compras ({count} {count === 1 ? 'item' : 'itens'})
              </h1>
              <p className="text-xs text-mist mt-1">Revise suas peças antes de finalizar o pedido.</p>
            </div>
            <button
              onClick={clear}
              className="text-xs text-mist hover:text-danger transition-colors underline"
            >
              Limpar sacola
            </button>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            
            {/* LISTA DE ITENS */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-4 p-4 rounded-2xl border border-line bg-surface/60 items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-surface border border-line">
                      <Image
                        src={item.image || '/skin_morena.jpg'}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ivory">{item.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-mist">
                        {item.size && <span>Tam: <strong>{item.size}</strong></span>}
                        {item.color && <span>Cor: <strong>{item.color}</strong></span>}
                      </div>
                      <p className="mt-1.5 text-sm font-extrabold text-gold">
                        {item.priceCents ? formatBRL(item.priceCents) : 'Sob consulta'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Controle de Quantidade */}
                    <div className="flex items-center rounded-lg border border-line bg-surface px-2">
                      <button
                        onClick={() => setQuantity(item.key, Math.max(1, item.quantity - 1))}
                        className="px-2 py-1 text-xs text-mist hover:text-ivory"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-ivory">{item.quantity}</span>
                      <button
                        onClick={() => setQuantity(item.key, item.quantity + 1)}
                        className="px-2 py-1 text-xs text-mist hover:text-ivory"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => remove(item.key)}
                      className="p-2 text-mist hover:text-danger rounded-lg transition-colors"
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-4">
                <Link
                  href="/colecao"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Adicionar mais peças à sacola</span>
                </Link>
              </div>
            </div>

            {/* RESUMO DO PEDIDO */}
            <div className="lg:col-span-4">
              <div className="rounded-3xl border border-line-gold/40 bg-surface/80 p-6 space-y-6 shadow-xl sticky top-28">
                <h3 className="text-base font-bold text-ivory uppercase tracking-wider border-b border-line pb-3">
                  Resumo do Pedido
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-mist">
                    <span>Subtotal</span>
                    <span className="text-ivory font-bold">{formatBRL(subtotalCents)}</span>
                  </div>
                  <div className="flex justify-between text-mist">
                    <span>Frete</span>
                    <span className="text-emerald-400 font-bold">Calculado no checkout</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-gold">
                      <span>Desconto Cupom</span>
                      <span className="font-bold">-{formatBRL(appliedDiscount)}</span>
                    </div>
                  )}
                  <div className="border-t border-line pt-3 flex justify-between text-sm font-bold text-ivory">
                    <span>Total Estimado</span>
                    <span className="text-gold text-lg">{formatBRL(finalTotalCents)}</span>
                  </div>
                </div>

                {/* Cupom */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-3 top-3 h-4 w-4 text-mist" />
                    <input
                      type="text"
                      placeholder="Cupom de desconto"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      className="w-full bg-obsidian border border-line rounded-xl pl-9 pr-3 py-2.5 text-xs text-ivory uppercase focus:outline-none focus:border-gold"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (coupon.toUpperCase() === 'PRIMEIRACOMPRA') {
                        setAppliedDiscount(Math.round(subtotalCents * 0.1));
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-line bg-surface text-xs font-bold uppercase hover:bg-gold hover:text-obsidian transition-colors"
                  >
                    Aplicar
                  </button>
                </div>

                <Link
                  href="/checkout"
                  className="w-full py-4 rounded-full bg-gold-gradient text-obsidian font-black text-xs uppercase tracking-wider shadow-xl shadow-gold/25 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Avançar para o Checkout</span>
                  <ArrowRight className="h-4 w-4 text-obsidian" />
                </Link>

                <div className="flex items-center justify-center gap-2 text-[11px] text-mist text-center">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold" />
                  <span>Checkout Transparente Mercado Pago</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>
  );
}
