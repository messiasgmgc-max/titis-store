"use client";

import React, { useState } from 'react';
import { ShoppingBag, X, Trash2, Send, CheckCircle2, MessageSquare } from 'lucide-react';

export interface CartItem {
  id: string;
  name: string;
  category: string;
  color: string;
  hex: string;
}

interface WhatsAppCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export const WhatsAppCartModal: React.FC<WhatsAppCartModalProps> = ({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onClearCart,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSendToWhatsApp = () => {
    if (items.length === 0) return;

    const itemsText = items
      .map((item, idx) => `${idx + 1}. *${item.name}* (${item.category}) - Cor: ${item.color}`)
      .join('\n');

    const message = `👑 *NOVO PEDIDO DE PEÇAS - TITI'S STORE*\n\n` +
      `👤 *Cliente:* ${customerName || 'Cliente VIP'}\n` +
      `📱 *Telefone de Contato:* +5531996000213\n\n` +
      `👔 *Peças Selecionadas:* \n${itemsText}\n\n` +
      `💡 *Observações / Tamanhos:* ${notes || 'Solicito disponibilidade de tamanhos e orçamento sob medida.'}\n\n` +
      `_Mensagem enviada automaticamente pela plataforma Titi's Store._`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/5531996000213?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-card border border-amber-500/35 rounded-[36px] p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6 shrink-0">
          <div className="w-12 h-12 rounded-full bg-gold-gradient mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ShoppingBag className="w-6 h-6 text-[#0B0C10]" />
          </div>
          <h3 className="text-2xl font-black text-white font-heading">
            Carrinho VIP Titi's Store
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            Encomende suas peças selecionadas diretamente com o Titi via WhatsApp.
          </p>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-medium">Seu carrinho VIP está vazio no momento.</p>
              <p className="text-[11px] text-slate-500">Adicione peças dos lookbooks recomendados!</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: item.hex }}
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white font-heading">{item.name}</h4>
                    <span className="text-[10px] text-slate-400 font-medium">{item.category} • Cor: {item.color}</span>
                  </div>
                </div>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Input & WhatsApp Action */}
        {items.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-4 shrink-0">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Seu Nome para Atendimento VIP:
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Andrade"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Observações de Tamanhos / Peças:
              </label>
              <input
                type="text"
                placeholder="Ex: Blazer tamanho 48R, sapato 41..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <button
              onClick={handleSendToWhatsApp}
              className="w-full py-4 rounded-full bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-950/40 hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4 fill-white text-emerald-500" />
              <span>Enviar Pedido para WhatsApp (+55 31 99600-0213)</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
