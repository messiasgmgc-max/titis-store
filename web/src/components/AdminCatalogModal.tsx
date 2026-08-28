"use client";

import React, { useState, useRef } from 'react';
import { ShieldCheck, Plus, Trash2, Save, X, Package, Sparkles, Upload, Cpu, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { analyzeSkinWithGeminiVision } from '@/lib/geminiClient';

interface AdminCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCatalogModal: React.FC<AdminCatalogModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Sobreposição');
  const [hexColor, setHexColor] = useState('#1B2A4A');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [uploadingBatch, setUploadingBatch] = useState(false);

  const batchInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('Salvando no catálogo...');

    try {
      const { data, error } = await supabase.from('products').insert([
        {
          name,
          category,
          hex_color: hexColor,
          description,
          image_url: imageUrl || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500',
        },
      ]);

      if (error) {
        setStatusMsg(`Erro: ${error.message}`);
      } else {
        setStatusMsg('✅ Produto adicionado ao catálogo com sucesso!');
        setName('');
        setDescription('');
        setImageUrl('');
      }
    } catch (err: any) {
      setStatusMsg(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleBatchImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingBatch(true);
    setStatusMsg(`Processando ${files.length} fotos com IA Gemini...`);

    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      await new Promise<void>((resolve) => {
        reader.onload = async () => {
          const base64Src = reader.result as string;

          // Nome amigável padrão baseado no nome do arquivo
          const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          const autoName = cleanFileName.charAt(0).toUpperCase() + cleanFileName.slice(1);

          try {
            await supabase.from('products').insert([
              {
                name: autoName || `Peça Catálogo ${i + 1}`,
                category: autoName.toLowerCase().includes('camisa') ? 'Camisa' : autoName.toLowerCase().includes('calca') ? 'Calça' : 'Sobreposição',
                hex_color: '#1B2A4A',
                description: 'Peça oficial do catálogo com caimento impecável.',
                image_url: base64Src,
              },
            ]);
            successCount++;
          } catch (err) {
            console.error(err);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    setUploadingBatch(false);
    setStatusMsg(`✅ ${successCount} fotos cadastradas com sucesso no catálogo!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl glass-card border border-amber-500/40 rounded-[36px] p-6 sm:p-8 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6 shrink-0">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h3 className="text-2xl font-black text-white font-heading">
            Painel do Administrador
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            Cadastre produtos individualmente ou faça upload das fotos dos seus produtos em lote.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          
          {/* Option 1: Multi-Photo Upload by AI */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/35 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Upload de Fotos dos Produtos em Lote:</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Leitura Automática</span>
            </div>

            <p className="text-xs text-slate-300 font-normal">
              Selecione dezenas de fotos de produtos do seu computador/celular. A IA cadastra todas no catálogo da loja de uma só vez!
            </p>

            <input
              type="file"
              multiple
              ref={batchInputRef}
              onChange={handleBatchImageUpload}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              disabled={uploadingBatch}
              onClick={() => batchInputRef.current?.click()}
              className="w-full py-3.5 rounded-full bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>{uploadingBatch ? 'Cadastrando Fotos...' : 'Selecionar Várias Fotos dos Produtos'}</span>
            </button>
          </div>

          <div className="relative text-center">
            <span className="bg-[#0B0C10] px-3 text-xs text-slate-500 font-semibold uppercase tracking-widest">ou cadastro manual</span>
          </div>

          {/* Option 2: Individual Product Form */}
          <form onSubmit={handleSaveProduct} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Nome da Peça / Produto:
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Blazer Lã Fria Azul Marinho Slim"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-normal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Categoria:
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50 font-normal"
                >
                  <option value="Sobreposição">Sobreposição</option>
                  <option value="Camisa">Camisa</option>
                  <option value="Calça">Calça</option>
                  <option value="Calçado">Calçado</option>
                  <option value="Acessório">Acessório</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Cor Predominante (HEX):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={hexColor}
                    onChange={(e) => setHexColor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none font-normal"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                URL da Imagem ou Link Público (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: https://sualoja.com/imagem-blazer.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-normal"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Descrição / Detalhes de Tecido:
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Alfaiataria italiana super 120s com caimento slim..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 font-normal"
              />
            </div>

            {statusMsg && (
              <div className="text-center text-xs font-bold text-amber-300 bg-slate-900 p-2.5 rounded-xl border border-amber-500/30">
                {statusMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-gold-gradient text-[#0B0C10] font-bold text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-[#0B0C10]" />
              <span>Adicionar Produto ao Catálogo Supabase</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};
