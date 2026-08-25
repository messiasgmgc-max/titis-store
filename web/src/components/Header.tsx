"use client";

import React, { useState, useEffect } from 'react';
import { Crown, Smartphone, Sparkles, Menu, X, User as UserIcon, LogOut, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { AuthModal } from './AuthModal';

interface HeaderProps {
  onStartConsultation: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onStartConsultation }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check initial user session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-40 glass-card border-b border-amber-500/20 bg-[#0B0C10]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5D77F] via-[#D4AF37] to-[#AA7C11] flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Crown className="w-5 h-5 text-[#0B0C10]" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-extrabold tracking-widest text-gold-gradient font-[family-name:var(--font-serif)]">
                TITI'S
              </span>
              <span className="block text-[10px] tracking-[0.25em] text-slate-400 font-medium uppercase -mt-1">
                Consultoria de Imagem
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="/#consultoria" className="text-slate-300 hover:text-[#D4AF37] transition-colors">
              Montar Look
            </a>
            <a href="/#sobre" className="text-slate-300 hover:text-[#D4AF37] transition-colors">
              A Metodologia
            </a>
            <a href="/#catalogo" className="text-slate-300 hover:text-[#D4AF37] transition-colors">
              Catálogo Signature
            </a>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs text-amber-300/90">
              <Smartphone className="w-3.5 h-3.5" />
              <span>App iOS & Android</span>
            </div>
          </nav>

          {/* Desktop Auth Controls */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <a
                  href="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  <span>Painel VIP ({user.email?.split('@')[0]})</span>
                </a>

                <button
                  onClick={handleLogout}
                  title="Sair da Conta"
                  className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-slate-200 hover:text-white glass-card border border-slate-700"
                >
                  Entrar / Cadastrar
                </button>

                <button
                  onClick={onStartConsultation}
                  className="group relative inline-flex items-center justify-center px-6 py-2.5 text-xs font-bold text-[#0B0C10] uppercase tracking-wider transition-all duration-300 rounded-full bg-gold-gradient hover:shadow-lg hover:shadow-amber-500/25 active:scale-95"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-[#0B0C10] group-hover:rotate-12 transition-transform" />
                  Consultoria Premium
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-card border-b border-amber-500/20 px-6 py-6 space-y-4 animate-in slide-in-from-top duration-200">
            {user ? (
              <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2">
                <div className="text-xs text-amber-300 font-bold">VIP: {user.email}</div>
                <div className="flex items-center gap-2">
                  <a href="/dashboard" className="text-xs text-white underline font-semibold">Acessar Painel VIP</a>
                  <button onClick={handleLogout} className="text-xs text-red-400 ml-auto">Sair</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold"
              >
                Entrar na Conta / Cadastrar
              </button>
            )}

            <a
              href="/#consultoria"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-200 hover:text-[#D4AF37] font-medium"
            >
              Montar Look Interativo
            </a>
            <a
              href="/#sobre"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-200 hover:text-[#D4AF37] font-medium"
            >
              A Metodologia Titi's
            </a>
            <a
              href="/#catalogo"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-200 hover:text-[#D4AF37] font-medium"
            >
              Catálogo Signature
            </a>
            
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onStartConsultation();
              }}
              className="w-full py-3 text-xs font-bold text-[#0B0C10] uppercase tracking-wider rounded-xl bg-gold-gradient text-center shadow-lg shadow-amber-500/20"
            >
              Iniciar Consultoria Agora
            </button>
          </div>
        )}
      </header>

      {/* Floating Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />
    </>
  );
};
