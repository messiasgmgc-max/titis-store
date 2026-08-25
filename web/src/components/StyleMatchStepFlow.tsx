"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Sparkles, CheckCircle2, ChevronRight, ArrowLeft, Shirt, 
  Sun, Moon, Sunset, Thermometer, Award, Share2, RefreshCw, Zap
} from 'lucide-react';

interface SkinToneOption {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  idealColors: { name: string; hex: string }[];
  avoidColors: { name: string; hex: string }[];
  proTip: string;
}

const skinToneOptions: SkinToneOption[] = [
  {
    id: 'clara',
    name: 'Clara',
    subtitle: 'Subtons frios ou neutros',
    image: '/skin_clara.jpg',
    idealColors: [
      { name: 'Azul Marinho', hex: '#1B2A4A' },
      { name: 'Cinza Grafite', hex: '#2C3539' },
      { name: 'Vinho Burgandi', hex: '#58111A' },
      { name: 'Verde Esmeralda', hex: '#0F382C' },
    ],
    avoidColors: [
      { name: 'Bege Amarelado', hex: '#F5F5DC' },
      { name: 'Amarelo Opaco', hex: '#EEDC82' },
    ],
    proTip: 'Cores escuras de alto contraste criam uma moldura marcante para peles claras, transmitindo firmeza e refinamento imediato.',
  },
  {
    id: 'morena',
    name: 'Morena Dourada',
    subtitle: 'Subtons quentes e iluminados',
    image: '/skin_morena.jpg',
    idealColors: [
      { name: 'Terracota', hex: '#A0522D' },
      { name: 'Beige Champagne', hex: '#E6D7C3' },
      { name: 'Verde Oliva', hex: '#4A5568' },
      { name: 'Champagne Gold', hex: '#D4AF37' },
    ],
    avoidColors: [
      { name: 'Cinza Pálido', hex: '#D3D3D3' },
      { name: 'Branco Apagado', hex: '#EAEAEA' },
    ],
    proTip: 'Tons quentes e terrosos harmonizam perfeitamente com seu brilho natural, destacando um ar sofisticado e solar.',
  },
  {
    id: 'parda',
    name: 'Parda',
    subtitle: 'Subtons médios e profundos',
    image: '/skin_parda.jpg',
    idealColors: [
      { name: 'Preto Obsidian', hex: '#0B0C10' },
      { name: 'Branco Névoa', hex: '#F7F7F7' },
      { name: 'Caramelo Premium', hex: '#8B4513' },
      { name: 'Azul Cobalto', hex: '#0047AB' },
    ],
    avoidColors: [
      { name: 'Verde Amarelado', hex: '#808000' },
    ],
    proTip: 'O contraste entre o preto profundo e pontos de luz marfim traz uma elegância magnética para qualquer evento.',
  },
  {
    id: 'negra',
    name: 'Negra Profunda',
    subtitle: 'Rica em luminosidade natural',
    image: '/skin_negra.jpg',
    idealColors: [
      { name: 'Branco Marfim', hex: '#FFFFFF' },
      { name: 'Bordô Imperial', hex: '#58111A' },
      { name: 'Verde Botânico', hex: '#0F382C' },
      { name: 'Dourado Nobre', hex: '#D4AF37' },
    ],
    avoidColors: [
      { name: 'Cinza Opaco', hex: '#4F4F4F' },
    ],
    proTip: 'Cores puras e luminosas criam um impacto visual inesquecível na pele negra. Aposte em alfaiataria em tons de joias.',
  },
];

interface EventOption {
  id: string;
  title: string;
  description: string;
}

const eventOptions: EventOption[] = [
  { id: 'trabalho', title: 'Executivo / Reunião', description: 'Escritório, conselhos & apresentações formais' },
  { id: 'casual', title: 'Casual Chic', description: 'Dia a dia elegante, passeios & viagens' },
  { id: 'barzinho', title: 'Barzinho / Lounge', description: 'Happy hour, encontros & momentos descontraídos' },
  { id: 'jantar', title: 'Jantar de Gala', description: 'Restaurantes de alta gastronomia & noites especiais' },
  { id: 'festa', title: 'Evento Social', description: 'Casamentos, galas, formaturas e celebrações' },
  { id: 'esporte', title: 'Esporte Fino / Club', description: 'Eventos ao ar livre, corridas & clubes sociais' },
];

export const StyleMatchStepFlow: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedSkinTone, setSelectedSkinTone] = useState<string>('morena');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('jantar');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>('noite');
  const [selectedClimate, setSelectedClimate] = useState<string>('ameno');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const activeSkinToneData = skinToneOptions.find((s) => s.id === selectedSkinTone) || skinToneOptions[1];

  const handleFinish = () => {
    setCurrentStep(3);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#F5D77F', '#FFFFFF'],
    });
  };

  const handleCopyLookbook = () => {
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  return (
    <section id="consultoria" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Sistema Inteligente Titi's Store StyleMatch</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-heading tracking-tight">
            Monte Seu Look Sob Medida
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium">
            Em apenas 3 passos simples, receba a recomendação exata de combinação de peças, contraste e paleta de cores para se destacar com máxima legibilidade e elegância.
          </p>
        </div>

        {/* Step Progress Tracker Bar */}
        <div className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-900 -z-10 -translate-y-1/2 rounded-full" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-gold-gradient -z-10 -translate-y-1/2 transition-all duration-500 rounded-full"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            />

            {/* Step 1 Circle */}
            <button
              onClick={() => setCurrentStep(1)}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm transition-all ${
                currentStep >= 1
                  ? 'bg-gold-gradient text-[#0B0C10] shadow-lg shadow-amber-500/30 scale-110'
                  : 'bg-slate-900 border border-slate-700 text-slate-400'
              }`}
            >
              1
            </button>

            {/* Step 2 Circle */}
            <button
              onClick={() => setCurrentStep(2)}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm transition-all ${
                currentStep >= 2
                  ? 'bg-gold-gradient text-[#0B0C10] shadow-lg shadow-amber-500/30 scale-110'
                  : 'bg-slate-900 border border-slate-700 text-slate-400'
              }`}
            >
              2
            </button>

            {/* Step 3 Circle */}
            <button
              onClick={() => currentStep >= 2 && setCurrentStep(3)}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-sm transition-all ${
                currentStep === 3
                  ? 'bg-gold-gradient text-[#0B0C10] shadow-lg shadow-amber-500/30 scale-110'
                  : 'bg-slate-900 border border-slate-700 text-slate-400'
              }`}
            >
              3
            </button>
          </div>

          <div className="flex justify-between text-xs font-bold text-slate-400 mt-3 px-1">
            <span className={currentStep === 1 ? 'text-amber-300 font-extrabold' : ''}>1. Tom de Pele</span>
            <span className={currentStep === 2 ? 'text-amber-300 font-extrabold' : ''}>2. Ocasião & Clima</span>
            <span className={currentStep === 3 ? 'text-amber-300 font-extrabold' : ''}>3. Looks Recomendados</span>
          </div>
        </div>

        {/* STEP CONTENT CONTAINER */}
        <div className="glass-card p-6 sm:p-10 rounded-[36px] border border-amber-500/25 shadow-2xl relative">
          
          <AnimatePresence mode="wait">
            
            {/* STEP 1: SKIN TONE SELECTION */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                      Escolha o Tom que Mais se Aproxima de Você
                    </h3>
                    <p className="text-slate-300 text-sm mt-1 font-medium">
                      A análise cromática Titi's Store garante que as peças ressaltem o contraste natural do seu rosto.
                    </p>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold self-start sm:self-auto">
                    Etapa 1 de 3
                  </div>
                </div>

                {/* Skin Tone Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {skinToneOptions.map((tone) => {
                    const isSelected = selectedSkinTone === tone.id;
                    return (
                      <div
                        key={tone.id}
                        onClick={() => setSelectedSkinTone(tone.id)}
                        className={`cursor-pointer rounded-[28px] p-4 transition-all duration-300 relative group flex flex-col justify-between overflow-hidden ${
                          isSelected
                            ? 'glass-card-active scale-[1.02]'
                            : 'glass-card hover:border-slate-600 hover:scale-[1.01]'
                        }`}
                      >
                        {/* Image Preview */}
                        <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden mb-4">
                          <Image
                            src={tone.image}
                            alt={tone.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent opacity-60" />
                          
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center shadow-lg">
                              <CheckCircle2 className="w-5 h-5 text-[#0B0C10]" />
                            </div>
                          )}
                        </div>

                        {/* Card Details */}
                        <div className="space-y-1">
                          <h4 className="text-lg font-bold text-white flex items-center justify-between font-heading">
                            <span>{tone.name}</span>
                          </h4>
                          <p className="text-xs text-slate-300 font-medium">{tone.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Skin Tone Analysis Box */}
                <div className="mt-8 p-6 rounded-[28px] bg-slate-900/90 border border-amber-500/30 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-widest">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>Recomendação Cromática Titi's Store - Tom {activeSkinToneData.name}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-semibold">
                      "{activeSkinToneData.proTip}"
                    </p>
                  </div>

                  <div className="md:col-span-4 space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Cores Ideais Recomendadas:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeSkinToneData.idealColors.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                          <div 
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-xs text-slate-100 font-bold">{color.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Navigation Action */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-9 py-4 rounded-full text-xs sm:text-sm font-black text-[#0B0C10] uppercase tracking-wider bg-gold-gradient shadow-xl shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <span>Continuar para Ocasião & Clima</span>
                    <ChevronRight className="w-4 h-4 text-[#0B0C10]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: OCCASION, TIME & CLIMATE */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-heading">
                      Qual é a Ocasião, Horário e Clima do Seu Compromisso?
                    </h3>
                    <p className="text-slate-300 text-sm mt-1 font-medium">
                      Ajustamos a densidade dos tecidos, camadas e formalidade para o contexto perfeito.
                    </p>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold self-start sm:self-auto">
                    Etapa 2 de 3
                  </div>
                </div>

                {/* Event Category Grid */}
                <div>
                  <label className="block text-xs font-black text-slate-300 uppercase tracking-widest mb-4">
                    1. Selecione o Tipo de Evento / Ocasião:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {eventOptions.map((evt) => {
                      const isSelected = selectedOccasion === evt.id;
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedOccasion(evt.id)}
                          className={`cursor-pointer p-5 rounded-[24px] transition-all duration-300 flex items-start gap-4 ${
                            isSelected
                              ? 'glass-card-active scale-[1.02]'
                              : 'glass-card hover:border-slate-600'
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-gold-gradient text-[#0B0C10]' : 'bg-slate-800 text-amber-400'
                          }`}>
                            <Shirt className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-white font-heading">{evt.title}</h4>
                            <p className="text-xs text-slate-300 mt-1 font-medium">{evt.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Time of Day & Climate Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  
                  {/* Time of Day Picker */}
                  <div className="glass-card p-6 rounded-[28px] space-y-4">
                    <label className="block text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>2. Horário do Compromisso:</span>
                    </label>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'manha', label: 'Manhã', sub: '06h - 12h' },
                        { id: 'tarde', label: 'Tarde', sub: '12h - 18h' },
                        { id: 'noite', label: 'Noite', sub: '18h - 04h' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedTimeOfDay(t.id)}
                          className={`p-3.5 rounded-2xl text-center text-xs font-extrabold transition-all ${
                            selectedTimeOfDay === t.id
                              ? 'bg-gold-gradient text-[#0B0C10] shadow-md'
                              : 'bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-sm font-heading">{t.label}</div>
                          <div className="text-[10px] font-medium opacity-80 mt-0.5">{t.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Climate / Temperature Picker */}
                  <div className="glass-card p-6 rounded-[28px] space-y-4">
                    <label className="block text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-amber-400" />
                      <span>3. Clima & Temperatura Estimada:</span>
                    </label>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'frio', label: 'Frio', sub: '< 18°C' },
                        { id: 'ameno', label: 'Ameno', sub: '18°C - 25°C' },
                        { id: 'quente', label: 'Quente', sub: '> 25°C' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClimate(c.id)}
                          className={`p-3.5 rounded-2xl text-center text-xs font-extrabold transition-all ${
                            selectedClimate === c.id
                              ? 'bg-gold-gradient text-[#0B0C10] shadow-md'
                              : 'bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-sm font-heading">{c.label}</div>
                          <div className="text-[10px] font-medium opacity-80 mt-0.5">{c.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3.5 rounded-full text-xs font-bold text-slate-300 hover:text-white glass-card flex items-center gap-2 border border-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar Passo 1</span>
                  </button>

                  <button
                    onClick={handleFinish}
                    className="px-9 py-4 rounded-full text-xs sm:text-sm font-black text-[#0B0C10] uppercase tracking-wider bg-gold-gradient shadow-xl shadow-amber-500/25 hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-[#0B0C10]" />
                    <span>Gerar Looks Titi's Store</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: GENERATED LOOKS */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-widest mb-1">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>Recomendações Exclusivas Titi's Store</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white font-heading">
                      Seu Lookbook Personalizado
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                      Combinando tom de pele **{activeSkinToneData.name}** + ocasião **{selectedOccasion.toUpperCase()}** + clima **{selectedClimate.toUpperCase()}**.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopyLookbook}
                      className="px-5 py-3 rounded-full text-xs font-bold text-slate-200 glass-card hover:bg-slate-800 flex items-center gap-2 border border-slate-700"
                    >
                      {copiedSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">Lookbook Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 text-amber-400" />
                          <span>Salvar Resumo</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-3 rounded-full text-xs font-black text-[#0B0C10] bg-gold-gradient flex items-center gap-2 shadow-md uppercase tracking-wider"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Novo Look</span>
                    </button>
                  </div>
                </div>

                {/* 3 Main Look Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Look Card 1 */}
                  <div className="glass-card rounded-[32px] p-6 border border-amber-500/35 flex flex-col justify-between relative group hover:border-amber-400 transition-all duration-300 shadow-xl">
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-extrabold uppercase tracking-wider border border-amber-500/30">
                          Recomendação Príma
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-amber-400">
                          <span>96% Presença</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-black text-white font-heading">
                          Executivo Noir Gold
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 font-medium">
                          Alfaiataria slim atemporal que transmite liderança, elegância e segurança.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                          Paleta Harmônica:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { name: 'Azul Marinho', hex: '#1B2A4A' },
                            { name: 'Branco Marfim', hex: '#F7F7F7' },
                            { name: 'Preto Absoluto', hex: '#111111' },
                            { name: 'Champagne', hex: '#D4AF37' },
                          ].map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-800">
                              <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                              <span className="text-[10px] text-slate-200 font-bold">{c.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-amber-300 font-extrabold block">
                          Peças Recomendadas:
                        </span>
                        <ul className="space-y-2 text-xs text-slate-200 font-semibold">
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Sobreposição:</span>
                            <span className="text-white">Blazer Lã Fria Azul Marinho</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Camisa:</span>
                            <span className="text-white">Pima Cotton Branco Marfim</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Calça:</span>
                            <span className="text-white">Chino Tailored Cinza Chumbo</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Calçado:</span>
                            <span className="text-white">Loafer Couro Italiano Preto</span>
                          </li>
                        </ul>
                      </div>

                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <p className="text-[11px] text-amber-200 font-semibold italic">
                        💡 **Dica Titi's Store:** Mantenha os punhos da camisa 1.5 cm à vista sob a manga do blazer.
                      </p>
                    </div>
                  </div>

                  {/* Look Card 2 */}
                  <div className="glass-card rounded-[32px] p-6 border border-slate-800 flex flex-col justify-between relative group hover:border-amber-500/40 transition-all duration-300 shadow-xl">
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-extrabold uppercase tracking-wider">
                          Smart Casual
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                          <span>89% Presença</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-black text-white font-heading">
                          Casual Luxury Terracota
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 font-medium">
                          Descontração sofisticada perfeita para encontros e jantares modernos.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                          Paleta Harmônica:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { name: 'Terracota', hex: '#A0522D' },
                            { name: 'Areia', hex: '#E6D7C3' },
                            { name: 'Asfalto', hex: '#4A5568' },
                          ].map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-800">
                              <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                              <span className="text-[10px] text-slate-200 font-bold">{c.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-amber-300 font-extrabold block">
                          Peças Recomendadas:
                        </span>
                        <ul className="space-y-2 text-xs text-slate-200 font-semibold">
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Superior:</span>
                            <span className="text-white">Tricô Cashmere Terracota</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Calça:</span>
                            <span className="text-white">Chino Areia Champagne</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Calçado:</span>
                            <span className="text-white">Sneaker Nappa Couro Branco</span>
                          </li>
                        </ul>
                      </div>

                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <p className="text-[11px] text-slate-200 font-semibold italic">
                        💡 **Dica Titi's Store:** Dobre as mangas do tricô suavemente para expor o relógio.
                      </p>
                    </div>
                  </div>

                  {/* Look Card 3 */}
                  <div className="glass-card rounded-[32px] p-6 border border-slate-800 flex flex-col justify-between relative group hover:border-amber-500/40 transition-all duration-300 shadow-xl">
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-extrabold uppercase tracking-wider">
                          Edição Noturna
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-300">
                          <span>98% Presença</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-black text-white font-heading">
                          Gala & Velvet Obsidian
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 font-medium">
                          Monocromático de alto impacto com textura marcante em veludo noturno.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                          Paleta Harmônica:
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { name: 'Obsidian', hex: '#0B0C10' },
                            { name: 'Vinho Bordô', hex: '#58111A' },
                            { name: 'Prata', hex: '#C0C0C0' },
                          ].map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-800">
                              <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                              <span className="text-[10px] text-slate-200 font-bold">{c.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-amber-300 font-extrabold block">
                          Peças Recomendadas:
                        </span>
                        <ul className="space-y-2 text-xs text-slate-200 font-semibold">
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Jaqueta/Blazer:</span>
                            <span className="text-white">Blazer Veludo Bordô Imperial</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Camisa:</span>
                            <span className="text-white">Camisa Modal Botoes Ocultos</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Calçado:</span>
                            <span className="text-white">Chelsea Boots Couro Polido</span>
                          </li>
                        </ul>
                      </div>

                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
                      <p className="text-[11px] text-slate-200 font-semibold italic">
                        💡 **Dica Titi's Store:** O veludo noturno absorve a luz e destaca sua silhueta com maestria.
                      </p>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>
    </section>
  );
};
