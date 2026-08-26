"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Smartphone, Sparkles, Menu, X, LogOut, LayoutDashboard, ShoppingBag, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { AuthModal } from './AuthModal';
import { WhatsAppCartModal, CartItem } from './WhatsAppCartModal';
import { AdminCatalogModal } from './AdminCatalogModal';

interface HeaderProps {
  onStartConsultation: () => void;
  cartItems: CartItem[];
  onRemoveCartItem: (id: string) => void;
  onClearCart: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onStartConsultation,
  cartItems,
  onRemoveCartItem,
  onClearCart,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('client');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchUserProfile(user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        fetchUserProfile(activeUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
      if (data?.role) {
        setUserRole(data.role);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole('client');
    window.location.href = '/';
  };

  return (
    <>
      <header className="sticky top-0 z-40 glass-card border-b border-amber-500/20 bg-[#0B0C10]/85 backdrop-blur-xl rounded-none border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => window.location.href = '/'}>
            <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-br from-[#F5D77F] via-[#D4AF37] to-[#AA7C11] shadow-md shadow-amber-500/15 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              <div className="w-full h-full rounded-full relative overflow-hidden bg-black">
                <Image
                  src="/logo_titis.jpg"
                  alt="Titi's Store Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-semibold tracking-wider text-gold-gradient font-heading block">
                TITI'S STORE
              </span>
              <span className="block text-[10px] tracking-[0.3em] text-slate-400 font-normal uppercase -mt-1">
                Consultoria de Imagem
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <a href="/#consultoria" className="text-slate-300 hover:text-[#D4AF37] transition-colors">
              Montar Look
            </a>
            <a href="/#planos" className="text-slate-300 hover:text-[#D4AF37] transition-colors">
              Passes & Planos
            </a>
            <a href="/#catalogo" className="text-slate-300 hover:text-[#D4AF37] transition-colors">
              Catálogo Signature
            </a>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/30 text-xs text-amber-300/90 font-normal">
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>App iOS & Android</span>
            </div>
          </nav>

          {/* Controls */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Cart Button */}
            <button
              onClick={() => setCartModalOpen(true)}
              className="relative p-2.5 rounded-full glass-card border-amber-500/30 text-amber-300 hover:text-white hover:border-amber-400 transition-all"
              title="Carrinho VIP WhatsApp"
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold-gradient text-[#0B0C10] font-black text-[10px] flex items-center justify-center shadow-md">
                  {cartItems.length}
                </span>
              )}
            </button>

            {/* Admin Badge if role === admin */}
            {userRole === 'admin' && (
              <button
                onClick={() => setAdminModalOpen(true)}
                className="px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>Admin Painel</span>
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <a
                  href="/dashboard"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full glass-card border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-slate-800 transition-colors shadow-md"
                >
                  <LayoutDashboard className="w-4 h-4 text-amber-400" />
                  <span>Painel VIP ({user.email?.split('@')[0]})</span>
                </a>

                <button
                  onClick={handleLogout}
                  title="Sair da Conta"
                  className="p-2.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-5 py-2.5 rounded-full text-xs font-medium text-slate-200 hover:text-white glass-card border border-slate-700/80 hover:border-amber-500/40 transition-all"
                >
                  Entrar / Cadastrar
                </button>

                <button
                  onClick={onStartConsultation}
                  className="group relative inline-flex items-center justify-center px-6 py-2.5 text-xs font-semibold text-[#0B0C10] uppercase tracking-wider transition-all duration-300 rounded-full bg-gold-gradient shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-105 active:scale-95"
                >
                  <Sparkles className="w-4 h-4 mr-2 text-[#0B0C10] group-hover:rotate-12 transition-transform" />
                  Consultoria Premium
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => setCartModalOpen(true)}
              className="relative p-2 rounded-full glass-card border-amber-500/30 text-amber-300"
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-gradient text-[#0B0C10] font-bold text-[9px] flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-card border-b border-amber-500/20 px-6 py-6 space-y-4 rounded-b-3xl animate-in slide-in-from-top duration-200">
            {user ? (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2">
                <div className="text-xs text-amber-300 font-medium">VIP: {user.email} (Role: {userRole})</div>
                <div className="flex items-center gap-2">
                  <a href="/dashboard" className="text-xs text-white underline font-medium">Acessar Painel VIP</a>
                  <button onClick={handleLogout} className="text-xs text-red-400 ml-auto font-medium">Sair</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}
                className="w-full py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold"
              >
                Entrar na Conta / Cadastrar
              </button>
            )}

            <a
              href="/#consultoria"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-200 hover:text-[#D4AF37] font-medium text-sm"
            >
              Montar Look Interativo
            </a>
            <a
              href="/#planos"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-200 hover:text-[#D4AF37] font-medium text-sm"
            >
              Passes & Planos
            </a>
            <a
              href="/#catalogo"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-slate-200 hover:text-[#D4AF37] font-medium text-sm"
            >
              Catálogo Signature
            </a>
            
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onStartConsultation();
              }}
              className="w-full py-3.5 text-xs font-semibold text-[#0B0C10] uppercase tracking-wider rounded-full bg-gold-gradient text-center shadow-lg shadow-amber-500/20"
            >
              Iniciar Consultoria Agora
            </button>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setAuthModalOpen(false)}
      />

      <WhatsAppCartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        items={cartItems}
        onRemoveItem={onRemoveCartItem}
        onClearCart={onClearCart}
      />

      <AdminCatalogModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />
    </>
  );
};
