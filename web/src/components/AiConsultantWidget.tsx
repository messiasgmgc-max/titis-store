"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Send } from 'lucide-react';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

export const AiConsultantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Olá! Sou o assistente virtual da **Titi\'s Store**. Qual é a sua dúvida de estilo ou evento de hoje?',
    },
  ]);

  const quickQuestions = [
    'Qual sapato usar com calça de alfaiataria cinza?',
    'Como combinar relógio dourado e cinto?',
    'Qual dress code usar em casamento às 17h?',
  ];

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const newMsgs: ChatMessage[] = [...messages, { sender: 'user', text: query }];
    setMessages(newMsgs);
    if (!textToSend) setInputText('');

    setTimeout(() => {
      let botAnswer = 'Para essa ocasião, recomendo manter a estrutura do blazer alinhada aos ombros e utilizar sapatos em tom marrom escuro ou preto polido. Quer que eu monte essa combinação completa para você?';
      
      if (query.toLowerCase().includes('sapato') || query.toLowerCase().includes('cinza')) {
        botAnswer = 'Com calça alfaiataria cinza chumbo, um Loafer ou Oxford em couro preto polido transmite máxima formalidade executiva. Se for um evento casual, um sneaker minimalista couro branco traz modernidade!';
      } else if (query.toLowerCase().includes('relógio') || query.toLowerCase().includes('dourado')) {
        botAnswer = 'Ao usar relógio dourado, combine os metais dos detalhes (fivela do cinto e abotoaduras). Evite misturar muitos acessórios chamativos para manter a sofisticação discreta.';
      } else if (query.toLowerCase().includes('casamento') || query.toLowerCase().includes('17h')) {
        botAnswer = 'Para casamentos ao fim da tarde (17h), o ideal é um costume ou terno slim em tom azul petróleo ou cinza médio. Dispense a gravata se a proposta for esporte fino sofisticado!';
      }

      setMessages((prev) => [...prev, { sender: 'bot', text: botAnswer }]);
    }, 600);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-gold-gradient text-[#0B0C10] font-black text-xs uppercase tracking-wider shadow-2xl shadow-amber-500/30 hover:scale-105 transition-all"
        >
          <div className="relative w-7 h-7 rounded-full p-0.5 bg-black overflow-hidden shrink-0">
            <Image
              src="/logo_titis.jpg"
              alt="Titi's Store Logo"
              fill
              className="object-cover"
            />
          </div>
          <span>Consultor IA Titi's Store</span>
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-900 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0B0C10]"></span>
          </span>
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] glass-card border border-amber-500/35 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-[#0B0C10]/95 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full p-0.5 bg-gradient-to-br from-[#F5D77F] via-[#D4AF37] to-[#AA7C11] overflow-hidden shrink-0">
                <div className="w-full h-full rounded-full relative overflow-hidden bg-black">
                  <Image
                    src="/logo_titis.jpg"
                    alt="Titi's Store Logo"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black text-white font-heading">
                  Consultor de Estilo Titi's Store
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online | Respostas Instantâneas</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-slate-950/40">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] p-3.5 rounded-2xl ${
                    m.sender === 'user'
                      ? 'bg-amber-500 text-[#0B0C10] font-bold rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 font-medium rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick suggestions */}
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/60 overflow-x-auto flex gap-2 no-scrollbar">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(q)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-bold border border-slate-700 whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3.5 border-t border-slate-800 bg-[#0B0C10] flex items-center gap-2">
            <input
              type="text"
              placeholder="Digite sua dúvida de estilo..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-medium"
            />
            <button
              onClick={() => handleSendMessage()}
              className="w-9 h-9 rounded-full bg-gold-gradient text-[#0B0C10] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shrink-0 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
