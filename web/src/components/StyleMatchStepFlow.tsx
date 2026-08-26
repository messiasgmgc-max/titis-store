"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Sparkles, CheckCircle2, ChevronRight, ArrowLeft, Shirt, 
  Sun, Moon, Sunset, Thermometer, Share2, RefreshCw,
  Camera, Eye, ShoppingBag, MapPin, Cpu
} from 'lucide-react';
import { FacialScannerModal } from './FacialScannerModal';
import { VirtualTryOnModal } from './VirtualTryOnModal';
import { CartItem } from './WhatsAppCartModal';

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
  { id: 'outro', title: 'Outro Lugar Customizado', description: 'Digite um local ou evento específico para análise por IA' },
];

// Store Catalog Products mapping for automatic matching
const catalogStoreProducts = [
  {
    id: 'prod-1',
    name: 'Blazer Tailored Super 120s',
    category: 'Sobreposição',
    color: 'Azul Marinho',
    hex: '#1B2A4A',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600',
  },
  {
    id: 'prod-2',
    name: 'Tricô Cashmere Italiano',
    category: 'Superior',
    color: 'Terracota',
    hex: '#A0522D',
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600',
  },
  {
    id: 'prod-3',
    name: 'Camisa Pima Cotton Giza',
    category: 'Camisa',
    color: 'Branco Marfim',
    hex: '#FFFFFF',
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600',
  },
  {
    id: 'prod-4',
    name: 'Chino Tailored Cotton-Elastano',
    category: 'Calça',
    color: 'Cinza Grafite',
    hex: '#2C3539',
    image: 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=600',
  },
];

interface StyleMatchStepFlowProps {
  onAddToCart: (item: CartItem) => void;
}

export const StyleMatchStepFlow: React.FC<StyleMatchStepFlowProps> = ({ onAddToCart }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedSkinTone, setSelectedSkinTone] = useState<string>('morena');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('jantar');
  const [customVenueInput, setCustomVenueInput] = useState<string>('');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>('noite');
  const [selectedClimate, setSelectedClimate] = useState<string>('ameno');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  
  // Modals state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [activeLookTryOn, setActiveLookTryOn] = useState<{
    title: string;
    items: { name: string; category: string; color: string; hex: string }[];
  } | null>(null);

  const activeSkinToneData = skinToneOptions.find((s) => s.id === selectedSkinTone) || skinToneOptions[1];

  const handleFinish = () => {
    setIsAiProcessing(true);
    setTimeout(() => {
      setIsAiProcessing(false);
      setCurrentStep(3);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F5D77F', '#FFFFFF'],
      });
    }, 1000);
  };

  const handleCopyLookbook = () => {
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handleOpenTryOn = (title: string, items: { name: string; category: string; color: string; hex: string }[]) => {
    setActiveLookTryOn({ title, items });
    setTryOnOpen(true);
  };

  return (
    <section id="consultoria" className="py-16 md:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Sistema Inteligente de Estilo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white font-heading tracking-tight">
            Monte Seu Look Sob Medida
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
            Em 3 passos simples, receba a recomendação de peças, contraste e paleta de cores para o seu tom de pele.
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

            <button
              onClick={() => setCurrentStep(1)}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                currentStep >= 1
                  ? 'bg-gold-gradient text-[#0B0C10] shadow-lg shadow-amber-500/20 scale-110'
                  : 'bg-slate-900 border border-slate-700 text-slate-400'
              }`}
            >
              1
            </button>

            <button
              onClick={() => setCurrentStep(2)}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                currentStep >= 2
                  ? 'bg-gold-gradient text-[#0B0C10] shadow-lg shadow-amber-500/20 scale-110'
                  : 'bg-slate-900 border border-slate-700 text-slate-400'
              }`}
            >
              2
            </button>

            <button
              onClick={() => currentStep >= 2 && setCurrentStep(3)}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                currentStep === 3
                  ? 'bg-gold-gradient text-[#0B0C10] shadow-lg shadow-amber-500/20 scale-110'
                  : 'bg-slate-900 border border-slate-700 text-slate-400'
              }`}
            >
              3
            </button>
          </div>

          <div className="flex justify-between text-xs font-medium text-slate-400 mt-3 px-1">
            <span className={currentStep === 1 ? 'text-amber-300 font-semibold' : ''}>1. Tom de Pele</span>
            <span className={currentStep === 2 ? 'text-amber-300 font-semibold' : ''}>2. Ocasião & Clima</span>
            <span className={currentStep === 3 ? 'text-amber-300 font-semibold' : ''}>3. Looks Recomendados</span>
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white font-heading">
                      Escolha o Tom que Mais se Aproxima de Você
                    </h3>
                    <p className="text-slate-300 text-sm mt-1 font-normal">
                      Ou use a câmera para encontrar seu tom automaticamente por foto.
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setScannerOpen(true)}
                    className="px-5 py-2.5 rounded-full bg-gold-gradient text-[#0B0C10] font-semibold text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 hover:scale-105 transition-all shrink-0"
                  >
                    <Camera className="w-4 h-4 text-[#0B0C10]" />
                    <span>Escanear Foto do Rosto</span>
                  </button>
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

                        <div className="space-y-1">
                          <h4 className="text-lg font-semibold text-white flex items-center justify-between font-heading">
                            <span>{tone.name}</span>
                          </h4>
                          <p className="text-xs text-slate-300 font-normal">{tone.subtitle}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dynamic Skin Tone Analysis Box */}
                <div className="mt-8 p-6 rounded-[28px] bg-slate-900/90 border border-amber-500/30 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-8 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>Recomendação de Cores - Tom {activeSkinToneData.name}</span>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed font-normal">
                      {activeSkinToneData.proTip}
                    </p>
                  </div>

                  <div className="md:col-span-4 space-y-3">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                      Cores Recomendadas:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeSkinToneData.idealColors.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                          <div 
                            className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="text-xs text-slate-200 font-medium">{color.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Navigation Action */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-9 py-4 rounded-full text-xs sm:text-sm font-semibold text-[#0B0C10] uppercase tracking-wider bg-gold-gradient shadow-xl shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2"
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
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white font-heading">
                      Qual é a Ocasião, Horário e Clima do Seu Compromisso?
                    </h3>
                    <p className="text-slate-300 text-sm mt-1 font-normal">
                      Ajustamos a densidade dos tecidos, camadas e formalidade para o contexto perfeito.
                    </p>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium self-start sm:self-auto">
                    Etapa 2 de 3
                  </div>
                </div>

                {/* Event Category Grid */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
                    1. Selecione a Ocasião ou Digite Seu Lugar Customizado:
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
                            {evt.id === 'outro' ? <MapPin className="w-5 h-5" /> : <Shirt className="w-5 h-5" />}
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-white font-heading">{evt.title}</h4>
                            <p className="text-xs text-slate-300 mt-1 font-normal">{evt.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Venue Text Input if 'outro' is selected */}
                {selectedOccasion === 'outro' && (
                  <div className="p-6 rounded-[28px] glass-card border border-amber-500/40 bg-slate-900/90 space-y-3 animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-amber-400" />
                      <span>Análise de Lugar por Inteligência Artificial:</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Casamento ao por do sol em praia na Bahia, Jantar em vinícola..."
                      value={customVenueInput}
                      onChange={(e) => setCustomVenueInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 font-normal"
                    />
                  </div>
                )}

                {/* Time of Day & Climate Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  
                  {/* Time of Day Picker */}
                  <div className="glass-card p-6 rounded-[28px] space-y-4">
                    <label className="block text-xs font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-2">
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
                          className={`p-3.5 rounded-2xl text-center text-xs font-semibold transition-all ${
                            selectedTimeOfDay === t.id
                              ? 'bg-gold-gradient text-[#0B0C10] shadow-md'
                              : 'bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-sm font-heading">{t.label}</div>
                          <div className="text-[10px] font-normal opacity-80 mt-0.5">{t.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Climate / Temperature Picker */}
                  <div className="glass-card p-6 rounded-[28px] space-y-4">
                    <label className="block text-xs font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-2">
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
                          className={`p-3.5 rounded-2xl text-center text-xs font-semibold transition-all ${
                            selectedClimate === c.id
                              ? 'bg-gold-gradient text-[#0B0C10] shadow-md'
                              : 'bg-slate-900 text-slate-200 border border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-sm font-heading">{c.label}</div>
                          <div className="text-[10px] font-normal opacity-80 mt-0.5">{c.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3.5 rounded-full text-xs font-medium text-slate-300 hover:text-white glass-card flex items-center gap-2 border border-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar Passo 1</span>
                  </button>

                  <button
                    onClick={handleFinish}
                    disabled={isAiProcessing}
                    className="px-9 py-4 rounded-full text-xs sm:text-sm font-semibold text-[#0B0C10] uppercase tracking-wider bg-gold-gradient shadow-xl shadow-amber-500/20 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isAiProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-[#0B0C10] animate-spin" />
                        <span>Processando via IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#0B0C10]" />
                        <span>Gerar Looks</span>
                      </>
                    )}
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
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                      <span>Recomendações Exclusivas</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-semibold text-white font-heading">
                      Seu Lookbook Personalizado
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal">
                      Combinando tom de pele {activeSkinToneData.name} + contexto {selectedOccasion === 'outro' && customVenueInput ? customVenueInput : selectedOccasion.toUpperCase()} + clima {selectedClimate.toUpperCase()}.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopyLookbook}
                      className="px-5 py-3 rounded-full text-xs font-medium text-slate-200 glass-card hover:bg-slate-800 flex items-center gap-2 border border-slate-700"
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
                      className="px-5 py-3 rounded-full text-xs font-semibold text-[#0B0C10] bg-gold-gradient flex items-center gap-2 shadow-md uppercase tracking-wider"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Novo Look</span>
                    </button>
                  </div>
                </div>

                {/* 3 Main Look Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Look Card 1 - Check Store Catalog First */}
                  <div className="glass-card rounded-[32px] p-6 border border-amber-500/35 flex flex-col justify-between relative group hover:border-amber-400 transition-all duration-300 shadow-xl">
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-300 text-[11px] font-semibold uppercase tracking-wider border border-amber-500/30">
                          Recomendação Principal
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                          <span>96% Presença</span>
                        </div>
                      </div>

                      {/* Real Store Catalog Product Match Image Preview */}
                      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                        <Image
                          src={catalogStoreProducts[0].image}
                          alt={catalogStoreProducts[0].name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold backdrop-blur-md">
                          Disponível no Catálogo
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-semibold text-white font-heading">
                          Executivo Noir Gold
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 font-normal">
                          Alfaiataria slim atemporal que transmite liderança, elegância e segurança.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold block">
                          Peças Encontradas no Catálogo:
                        </span>
                        <ul className="space-y-2 text-xs text-slate-200 font-normal">
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Sobreposição:</span>
                            <span className="text-white font-medium">{catalogStoreProducts[0].name}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Camisa:</span>
                            <span className="text-white font-medium">{catalogStoreProducts[2].name}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Calça:</span>
                            <span className="text-white font-medium">{catalogStoreProducts[3].name}</span>
                          </li>
                        </ul>
                      </div>

                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                      <button
                        onClick={() => handleOpenTryOn('Executivo Noir Gold', [
                          { name: catalogStoreProducts[0].name, category: 'Sobreposição', color: 'Azul Marinho', hex: '#1B2A4A' },
                          { name: catalogStoreProducts[2].name, category: 'Camisa', color: 'Branco Marfim', hex: '#FFFFFF' },
                          { name: catalogStoreProducts[3].name, category: 'Calça', color: 'Cinza Grafite', hex: '#2C3539' },
                        ])}
                        className="w-full py-2.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Provador Digital com Seu Rosto</span>
                      </button>

                      {/* Prominent Encontrar Produto Button with Big Shopping Bag */}
                      <button
                        onClick={() => {
                          onAddToCart({ id: 'item-1', name: 'Executivo Noir Gold (Look Completo)', category: 'Lookbook', color: 'Azul Marinho & Marfim', hex: '#1B2A4A' });
                        }}
                        className="w-full py-4 rounded-full bg-gold-gradient text-[#0B0C10] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all"
                      >
                        <ShoppingBag className="w-5 h-5 text-[#0B0C10]" />
                        <span>Encontrar Produto</span>
                      </button>
                    </div>
                  </div>

                  {/* Look Card 2 - Check Store Catalog First */}
                  <div className="glass-card rounded-[32px] p-6 border border-slate-800 flex flex-col justify-between relative group hover:border-amber-500/40 transition-all duration-300 shadow-xl">
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-semibold uppercase tracking-wider">
                          Smart Casual
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                          <span>89% Presença</span>
                        </div>
                      </div>

                      {/* Real Store Catalog Product Match Image Preview */}
                      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                        <Image
                          src={catalogStoreProducts[1].image}
                          alt={catalogStoreProducts[1].name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold backdrop-blur-md">
                          Disponível no Catálogo
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-semibold text-white font-heading">
                          Casual Luxury Terracota
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 font-normal">
                          Descontração sofisticada perfeita para encontros e jantares modernos.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold block">
                          Peças Encontradas no Catálogo:
                        </span>
                        <ul className="space-y-2 text-xs text-slate-200 font-normal">
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Superior:</span>
                            <span className="text-white font-medium">{catalogStoreProducts[1].name}</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Calça:</span>
                            <span className="text-white font-medium">Chino Areia Champagne</span>
                          </li>
                        </ul>
                      </div>

                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                      <button
                        onClick={() => handleOpenTryOn('Casual Luxury Terracota', [
                          { name: catalogStoreProducts[1].name, category: 'Superior', color: 'Terracota', hex: '#A0522D' },
                          { name: 'Chino Areia Champagne', category: 'Calça', color: 'Areia Champagne', hex: '#E6D7C3' },
                        ])}
                        className="w-full py-2.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Provador Digital com Seu Rosto</span>
                      </button>

                      {/* Prominent Encontrar Produto Button with Big Shopping Bag */}
                      <button
                        onClick={() => {
                          onAddToCart({ id: 'item-2', name: 'Casual Luxury Terracota (Look)', category: 'Lookbook', color: 'Terracota & Areia', hex: '#A0522D' });
                        }}
                        className="w-full py-4 rounded-full bg-gold-gradient text-[#0B0C10] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all"
                      >
                        <ShoppingBag className="w-5 h-5 text-[#0B0C10]" />
                        <span>Encontrar Produto</span>
                      </button>
                    </div>
                  </div>

                  {/* Look Card 3 - Check Store Catalog First */}
                  <div className="glass-card rounded-[32px] p-6 border border-slate-800 flex flex-col justify-between relative group hover:border-amber-500/40 transition-all duration-300 shadow-xl">
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <span className="px-3.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-semibold uppercase tracking-wider">
                          Edição Noturna
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                          <span>98% Presença</span>
                        </div>
                      </div>

                      {/* Fallback image when not explicitly in default catalog */}
                      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                        <Image
                          src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600"
                          alt="Gala & Velvet Obsidian"
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold backdrop-blur-md">
                          Recomendação Sob Medida
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl font-semibold text-white font-heading">
                          Gala & Velvet Obsidian
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 font-normal">
                          Monocromático de alto impacto com textura marcante em veludo noturno.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold block">
                          Peças Recomendadas:
                        </span>
                        <ul className="space-y-2 text-xs text-slate-200 font-normal">
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Blazer:</span>
                            <span className="text-white font-medium">Blazer Veludo Bordô Imperial</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span className="text-slate-400 font-normal">Camisa:</span>
                            <span className="text-white font-medium">Camisa Modal Botoes Ocultos</span>
                          </li>
                        </ul>
                      </div>

                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                      <button
                        onClick={() => handleOpenTryOn('Gala & Velvet Obsidian', [
                          { name: 'Blazer Veludo Bordô Imperial', category: 'Blazer', color: 'Bordô Imperial', hex: '#58111A' },
                          { name: 'Camisa Modal Botoes Ocultos', category: 'Camisa', color: 'Preto Obsidian', hex: '#0B0C10' },
                        ])}
                        className="w-full py-2.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Provador Digital com Seu Rosto</span>
                      </button>

                      {/* Prominent Encontrar Produto Button with Big Shopping Bag */}
                      <button
                        onClick={() => {
                          onAddToCart({ id: 'item-3', name: 'Gala & Velvet Obsidian (Look)', category: 'Lookbook', color: 'Bordô & Obsidian', hex: '#58111A' });
                        }}
                        className="w-full py-4 rounded-full bg-gold-gradient text-[#0B0C10] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all"
                      >
                        <ShoppingBag className="w-5 h-5 text-[#0B0C10]" />
                        <span>Encontrar Produto</span>
                      </button>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>

      <FacialScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanComplete={(result) => {
          setSelectedSkinTone(result.skinTone);
        }}
      />

      {activeLookTryOn && (
        <VirtualTryOnModal
          isOpen={tryOnOpen}
          onClose={() => setTryOnOpen(false)}
          lookTitle={activeLookTryOn.title}
          skinTone={selectedSkinTone}
          items={activeLookTryOn.items}
          onAddToCart={() => {
            onAddToCart({
              id: `tryon-${Date.now()}`,
              name: `${activeLookTryOn.title} (Seleção Completa)`,
              category: 'Lookbook Custom',
              color: 'Harmônica',
              hex: activeLookTryOn.items[0]?.hex || '#D4AF37',
            });
          }}
        />
      )}
    </section>
  );
};
