"use client";

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { X, Sparkles, Shirt, ShoppingBag, CheckCircle2, Upload, Camera, RefreshCw } from 'lucide-react';

interface VirtualTryOnModalProps {
  isOpen: boolean;
  onClose: () => void;
  lookTitle: string;
  skinTone: string;
  items: { name: string; category: string; color: string; hex: string }[];
  onAddToCart: () => void;
}

export const VirtualTryOnModal: React.FC<VirtualTryOnModalProps> = ({
  isOpen,
  onClose,
  lookTitle,
  skinTone,
  items,
  onAddToCart,
}) => {
  const [userFaceImage, setUserFaceImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('titis_user_face_image');
    }
    return null;
  });
  const [uploadingFace, setUploadingFace] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingFace(true);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setUserFaceImage(result);
        if (typeof window !== 'undefined') {
          localStorage.setItem('titis_user_face_image', result);
        }
        setUploadingFace(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const skinToneImageMap: Record<string, string> = {
    clara: '/skin_clara_model.jpg',
    morena: '/skin_morena_model.jpg',
    parda: '/skin_parda_model.jpg',
    negra: '/skin_negra_model.jpg',
  };

  const fallbackModelImage = skinToneImageMap[skinTone.toLowerCase()] || '/skin_morena_model.jpg';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl glass-card border border-amber-500/35 rounded-[36px] p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>Provador Virtual com Seu Rosto</span>
          </div>
          <h3 className="text-2xl font-semibold text-white font-heading">
            {lookTitle}
          </h3>
          <p className="text-xs text-slate-300 font-normal">
            Teste e veja como o caimento das peças fica no seu tom de pele.
          </p>
        </div>

        {/* If user hasn't uploaded face yet */}
        {!userFaceImage ? (
          <div className="py-8 space-y-6 text-center">
            <div
              className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-3xl p-8 space-y-4 bg-slate-900/60 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFaceUpload}
                accept="image/*"
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white font-heading">Envie a Foto do Seu Rosto</h4>
                <p className="text-xs text-slate-400 mt-1">A IA usará o seu rosto para vestir as roupas recomendadas no manequim.</p>
              </div>
              <button type="button" className="px-6 py-2.5 rounded-full bg-gold-gradient text-[#0B0C10] text-xs font-bold uppercase tracking-wider">
                Carregar Foto do Rosto
              </button>
            </div>
          </div>
        ) : (
          /* Main Content Grid with user face image preview */
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            
            {/* AI Model Image with User Face Overlay */}
            <div className="sm:col-span-6 relative aspect-[3/4] w-full rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl group">
              <Image
                src={fallbackModelImage}
                alt="Modelo Provador"
                fill
                className="object-cover"
              />
              
              {/* User Face Badge Bubble */}
              <div className="absolute top-4 left-4 flex items-center gap-2.5 p-2 pr-3 rounded-full bg-slate-950/80 border border-amber-500/40 backdrop-blur-md">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-amber-400">
                  <img src={userFaceImage} alt="Seu Rosto" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-amber-300 font-medium">Seu Rosto Aplicado</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl glass-card border border-amber-500/30 text-center backdrop-blur-md">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] text-amber-300 underline font-medium"
                >
                  Alterar Foto do Rosto
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFaceUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>

            {/* Outfit Items Specification */}
            <div className="sm:col-span-6 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2">
                Peças Selecionadas:
              </h4>

              <div className="space-y-2.5">
                {items.map((item, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: item.hex }} />
                      <div>
                        <div className="text-xs font-semibold text-white font-heading">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onAddToCart();
                    onClose();
                  }}
                  className="w-full py-4 rounded-full bg-gold-gradient text-[#0B0C10] font-bold text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <ShoppingBag className="w-5 h-5 text-[#0B0C10]" />
                  <span>Encontrar Produto</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
