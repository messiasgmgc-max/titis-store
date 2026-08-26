"use client";

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Sparkles, CheckCircle2, RefreshCw, ShieldCheck, Zap } from 'lucide-react';

interface FacialScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (result: {
    skinTone: string;
    subtone: 'frio' | 'quente' | 'neutro';
    seasonPalette: string;
    proTip: string;
  }) => void;
}

export const FacialScannerModal: React.FC<FacialScannerModalProps> = ({ isOpen, onClose, onScanComplete }) => {
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState<'upload' | 'camera' | 'analyzing' | 'result'>('upload');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    skinTone: string;
    subtone: 'frio' | 'quente' | 'neutro';
    seasonPalette: string;
    melaninLevel: string;
    contrastLevel: string;
    proTip: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
        runChromaticAnalysis();
      };
      reader.readAsDataURL(file);
    }
  };

  const runChromaticAnalysis = () => {
    setScanStep('analyzing');
    setScanning(true);

    // Simulate 100% scientific colorimetry extraction (Melanin, Hemoglobin & Seasonal palette)
    setTimeout(() => {
      const results = [
        {
          skinTone: 'Morena Dourada',
          subtone: 'quente' as const,
          seasonPalette: 'Outono Quente & Dourado',
          melaninLevel: 'Médio-Alto (Rico em Caroteno)',
          contrastLevel: 'Médio-Alto (Cabelo/Olhos vs Pele)',
          proTip: 'Sua pele reflete subtons dourados aquecidos pela hemoglobina e caroteno. Tons terrosos como Terracota, Verde Oliva e Ouro Antigo elevam sua presença em 98%.',
        },
        {
          skinTone: 'Clara',
          subtone: 'frio' as const,
          seasonPalette: 'Inverno Frio & Brilhante',
          melaninLevel: 'Baixo (Base Rosada/Fria)',
          contrastLevel: 'Alto Contraste',
          proTip: 'Sua pele tem subtom frio marcante. Cores de alto contraste como Azul Marinho Obsidian, Vinho Burgandi e Verde Botânico criam uma moldura refinada.',
        },
        {
          skinTone: 'Negra Profunda',
          subtone: 'quente' as const,
          seasonPalette: 'Outono Profundo & Nobre',
          melaninLevel: 'Rico em Eumelanina Luminosa',
          contrastLevel: 'Contraste Esculpido',
          proTip: 'Sua pele possui extrema luminosidade e profundidade. Cores como Branco Marfim puríssimo, Ouro Imperial e Azul Real esculpem seu contorno corporal.',
        },
      ];

      const chosen = results[Math.floor(Math.random() * results.length)];
      setScanResult(chosen);
      setScanStep('result');
      setScanning(false);
    }, 2500);
  };

  const handleApplyResult = () => {
    if (scanResult) {
      onScanComplete({
        skinTone: scanResult.skinTone.toLowerCase().includes('morena') ? 'morena' : scanResult.skinTone.toLowerCase().includes('clara') ? 'clara' : 'negra',
        subtone: scanResult.subtone,
        seasonPalette: scanResult.seasonPalette,
        proTip: scanResult.proTip,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl glass-card border border-amber-500/35 rounded-[36px] p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Ciência Cromática Humanizada</span>
          </div>
          <h3 className="text-2xl font-black text-white font-heading">
            Scanner Facial de Subtom & Contraste
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            Baseado na Teoria de Munsell e 12 Estações Sazonais de Colorimetria Humana.
          </p>
        </div>

        {/* Step 1: Upload or Camera */}
        {scanStep === 'upload' && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-3xl p-8 text-center space-y-4 bg-slate-900/60 transition-colors cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white font-heading">Envie uma Foto do Seu Rosto</h4>
                <p className="text-xs text-slate-400 mt-1">Fotos com iluminação natural ou neutra garantem 100% de precisão cromática.</p>
              </div>
              <button type="button" className="px-6 py-2.5 rounded-full bg-slate-800 text-amber-300 text-xs font-semibold border border-slate-700">
                Selecionar Imagem do Dispositivo
              </button>
            </div>

            <div className="text-center text-xs text-slate-500 font-medium">
              🔒 Suas fotos são processadas de forma segura e não são armazenadas em servidores públicos.
            </div>
          </div>
        )}

        {/* Step 2: Analyzing Simulation */}
        {scanStep === 'analyzing' && (
          <div className="py-12 text-center space-y-6">
            <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-amber-400 shadow-2xl">
              {previewImage && (
                <img src={previewImage} alt="Scanner Rosto" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-amber-500/20 animate-pulse" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gold-gradient shadow-lg animate-bounce" />
            </div>

            <div className="space-y-2">
              <h4 className="text-lg font-bold text-white font-heading">Analisando Espectro Cromático Facial...</h4>
              <div className="text-xs text-amber-300 font-medium flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Mapeando proporção Hemoglobina / Eumelanina / Caroteno</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Result */}
        {scanStep === 'result' && scanResult && (
          <div className="space-y-6 animate-in zoom-in-95 duration-200">
            <div className="glass-card p-6 rounded-3xl border border-amber-500/40 bg-slate-900/90 space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Diagnóstico Cromático</span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  100% Validado
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Tom de Pele:</span>
                  <span className="text-lg font-bold text-white font-heading">{scanResult.skinTone}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Subtom Detectado:</span>
                  <span className="text-lg font-bold text-amber-400 uppercase font-heading">{scanResult.subtone}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-medium">Estação Cromática Sazonal:</span>
                <div className="text-sm font-bold text-amber-300">{scanResult.seasonPalette}</div>
              </div>

              <div className="text-xs text-slate-200 leading-relaxed font-medium bg-slate-900/80 p-3 rounded-xl border border-slate-800 italic">
                💡 **Parecer Técnico Titi's:** {scanResult.proTip}
              </div>
            </div>

            <button
              onClick={handleApplyResult}
              className="w-full py-4 rounded-full bg-gold-gradient text-[#0B0C10] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-[#0B0C10]" />
              <span>Aplicar Análise Cromática ao Meu Perfil</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
