"use client";

import React, { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Save, X, Package, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface AdminCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminCatalogModal: React.FC<AdminCatalogModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Sobreposição');
  const [hexColor, setHexColor] = useState('#1B2A4A');
  const [description, setDescription] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

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
          image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500',
        },
      ]);

      if (error) {
        setStatusMsg(`Erro: ${error.message}`);
      } else {
        setStatusMsg('✅ Produto adicionado ao catálogo com sucesso!');
        setName('');
        setDescription('');
      }
    } catch (err: any) {
      setStatusMsg(`Erro ao salvar: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0C10]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-card border border-amber-500/40 rounded-[36px] p-6 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h3 className="text-2xl font-black text-white font-heading">
            Painel do Administrador (Admin Role)
          </h3>
          <p className="text-xs text-slate-300 font-medium">
            Gerencie novos produtos e combinações exclusivas do catálogo Titi's Store.
          </p>
        </div>

        {/* Form */}
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
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
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
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
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
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Descrição / Detalhes de Tecido:
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Alfaiataria italiana super 120s com textura sutil..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {statusMsg && (
            <div className="text-center text-xs font-bold text-amber-300 bg-slate-900 p-2.5 rounded-xl border border-amber-500/30">
              {statusMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 rounded-full bg-gold-gradient text-[#0B0C10] font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4 text-[#0B0C10]" />
            <span>Adicionar Peça ao Catálogo Supabase</span>
          </button>
        </form>

      </div>
    </div>
  );
};
