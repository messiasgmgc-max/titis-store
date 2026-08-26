"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Send, Bot, Sparkles } from 'lucide-react';
import { analyzeCustomVenueWithGroq } from '@/lib/groqClient';

interface ChatMessage {
  sender: 'bot' | 'user';
  text: string;
}

export const AiConsultantWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Olá! Sou o assistente virtual de estilo. Como posso ajudar com sua combinação de roupas ou evento hoje?',
    },
  ]);

  const quickQuestions = [
    'Qual sapato usar com calça cinza?',
    'Como combinar relógio dourado e cinto?',
    'Qual roupa usar em evento às 17h?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const newMsgs: ChatMessage[] = [...messages, { sender: 'user', text: query }];
    setMessages(newMsgs);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    // Call Groq AI or fallback answer clean of asterisks
    try {
      const aiResponse = await analyzeCustomVenueWithGroq(query);
      setIsTyping(false);

      if (aiResponse) {
        // Clean markdown asterisks from output
        const cleaned = aiResponse.replace(/\*\*/g, '').replace(/\*/g, '');
        setMessages((prev) => [...prev, { sender: 'bot', text: cleaned }]);
      } else {
        let fallback = 'Para essa ocasião, recomendo manter a jaqueta ou blazer alinhados aos ombros com sapatos escuros. Quer que eu encontre essa combinação no catálogo?';
        
        if (query.toLowerCase().includes('sapato') || query.toLowerCase().includes('cinza')) {
          fallback = 'Com calça cinza, um sapato social em couro preto traz máxima formalidade. Se for um evento casual, um tênis minimalista branco traz elegância moderna!';
        } else if (query.toLowerCase().includes('relógio') || query.toLowerCase().includes('dourado')) {
          fallback = 'Ao usar relógio dourado, combine o tom com a fivela do cinto. Mantenha os acessórios discretos para uma imagem elegante.';
        } else if (query.toLowerCase().includes('evento') || query.toLowerCase().includes('17h')) {
          fallback = 'Para eventos ao fim da tarde, o ideal é um terno ou costume em azul marinho ou cinza médio. Você pode dispensar a gravata para um toque contemporâneo!';
        }

        setMessages((prev) => [...prev, { sender: 'bot', text: fallback }]);
      }
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Para essa ocasião, um blazer em tom escuro com camisa clara garante uma combinação harmoniosa e elegante.' },
      ]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* Minimized Launcher Button: Discreta bolinha escrita "IA" */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative w-14 h-14 rounded-full bg-gold-gradient text-[#0B0C10] font-black text-sm uppercase tracking-wider shadow-2xl shadow-amber-500/40 hover:scale-110 active:scale-95 transition-all flex items-center justify-center border-2 border-[#0B0C10]"
          title="Consultor IA"
        >
          <span className="font-heading text-base font-extrabold text-[#0B0C10]">IA</span>
          <span className="flex h-3 w-3 absolute -top-1 -right-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border border-[#0B0C10]"></span>
          </span>
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="w-[360px] sm:w-[390px] h-[500px] glass-card border border-amber-500/35 rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-[#0B0C10]/95 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold-gradient text-[#0B0C10] font-black flex items-center justify-center text-xs font-heading">
                IA
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-heading">
                  Consultor Virtual de Estilo
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online • Inteligência Artificial</span>
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
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-amber-500 text-[#0B0C10] font-semibold rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 font-normal rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 text-slate-400 p-3 rounded-2xl text-xs font-normal">
                  Analisando dados cromáticos e estilo...
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/60 overflow-x-auto flex gap-2 no-scrollbar">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(q)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-medium border border-slate-700 whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3.5 border-t border-slate-800 bg-[#0B0C10] flex items-center gap-2">
            <input
              type="text"
              placeholder="Pergunte sobre roupas ou eventos..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-full px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-normal"
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
