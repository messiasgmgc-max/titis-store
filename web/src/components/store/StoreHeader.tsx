'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Search, 
  User, 
  Menu, 
  X, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert,
  Truck,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { useCart } from '@/providers/CartProvider';
import { useUI } from '@/providers/UIProvider';
import { useSession } from '@/providers/SessionProvider';
import { cn } from '@/lib/format';

const STORE_NAV_LINKS = [
  { label: 'Novidades', href: '/colecao' },
  { label: 'Alfaiataria', href: '/colecao?categoria=Alfaiataria' },
  { label: 'Camisaria', href: '/colecao?categoria=Camisaria' },
  { label: 'Calças', href: '/colecao?categoria=Calças' },
  { label: 'Calçados', href: '/colecao?categoria=Calçados' },
  { label: 'Acessórios', href: '/colecao?categoria=Acessórios' },
  { label: 'Toda a Coleção', href: '/colecao' },
];

export function StoreHeader() {
  const { count } = useCart();
  const { openOverlay } = useUI();
  const { user, profile, isAdmin, hasAccess, signOut } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Sua conta';

  const consultorUrl = process.env.NEXT_PUBLIC_CONSULTOR_URL || 'https://consultor.titisstore.com.br';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-obsidian/95 backdrop-blur-md border-b border-line">
      
      {/* 1. Barra de Anúncios no Topo (E-commerce) */}
      <div className="bg-surface-2 border-b border-line/60 px-4 py-1.5 text-[11px] text-mist flex items-center justify-between">
        <div className="container-luxe flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="font-medium text-parchment">
              Frete Grátis para todo o Brasil acima de R$ 399 · 5% OFF no Pix
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs">
            <a
              href={consultorUrl}
              className="text-gold hover:text-gold-light transition-colors flex items-center gap-1 font-semibold"
            >
              <Sparkles className="h-3 w-3" />
              <span>Conhecer Consultoria de Imagem</span>
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Barra Principal do E-commerce */}
      <div className="container-luxe">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-4">
          
          {/* Menu Mobile Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-ivory hover:text-gold transition-colors"
            aria-label="Abrir menu de navegação"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Logo da Loja */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full overflow-hidden border border-line-gold">
              <Image
                src="/titislogo.jpeg"
                alt="Titi's Store Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div>
              <span className="font-display font-extrabold text-lg sm:text-xl tracking-wider text-ivory block leading-tight">
                TITI&apos;S STORE
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-gold block font-semibold">
                Alta Alfaiataria Masculina
              </span>
            </div>
          </Link>

          {/* Menu de Categorias Desktop */}
          <nav className="hidden lg:flex items-center gap-6">
            {STORE_NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs uppercase font-bold tracking-wider text-parchment hover:text-gold transition-colors py-2"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Ações Direitas (Busca, Conta, Carrinho) */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Campo de Busca Rápida */}
            <div className="relative hidden md:block w-44 lg:w-56">
              <input
                type="text"
                placeholder="Buscar roupas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    window.location.href = `/colecao?busca=${encodeURIComponent(searchQuery.trim())}`;
                  }
                }}
                className="w-full bg-surface border border-line rounded-full pl-9 pr-3 py-1.5 text-xs text-ivory placeholder-mist focus:outline-none focus:border-gold"
              />
              <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-mist" />
            </div>

            {/* Conta / Perfil do Usuário com Dropdown Completo */}
            {user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className={cn(
                    'p-2 text-ivory hover:text-gold transition-colors rounded-full hover:bg-surface relative',
                    userMenuOpen && 'bg-surface text-gold',
                  )}
                  title="Menu da Conta & Perfil"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <User className="h-5 w-5" />
                  <span
                    className={cn(
                      'absolute bottom-1 right-1 h-2 w-2 rounded-full ring-2 ring-obsidian',
                      isAdmin ? 'bg-gold' : hasAccess ? 'bg-emerald-400' : 'bg-gold/60',
                    )}
                  />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-line-gold/40 bg-surface/98 p-3 text-ivory shadow-2xl backdrop-blur-2xl z-50"
                      role="menu"
                    >
                      {/* Identificação do Usuário */}
                      <div className="border-b border-line px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-bold text-ivory">{displayName}</p>
                          {isAdmin ? (
                            <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-gold">
                              Admin
                            </span>
                          ) : hasAccess ? (
                            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                              Assinante
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-mist">{user.email}</p>
                      </div>

                      {/* Lista de Opções */}
                      <div className="py-2 space-y-1 text-xs font-semibold">
                        <Link
                          href="/dashboard?aba=perfil"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-parchment transition-colors hover:bg-gold/10 hover:text-gold-light"
                          role="menuitem"
                        >
                          <User className="h-4 w-4 text-gold shrink-0" />
                          <span>Meu Perfil & Editar Dados</span>
                        </Link>

                        <Link
                          href="/dashboard?aba=pedidos"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-parchment transition-colors hover:bg-gold/10 hover:text-gold-light"
                          role="menuitem"
                        >
                          <ShoppingBag className="h-4 w-4 text-gold shrink-0" />
                          <span>Meus Pedidos</span>
                        </Link>

                        <Link
                          href="/dashboard?aba=cartela"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-parchment transition-colors hover:bg-gold/10 hover:text-gold-light"
                          role="menuitem"
                        >
                          <Sparkles className="h-4 w-4 text-gold shrink-0" />
                          <span>Minha Cartela & Looks</span>
                        </Link>

                        {isAdmin && (
                          <div className="pt-1">
                            <Link
                              href="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex w-full items-center justify-between rounded-xl bg-gold/10 border border-line-gold/50 px-3 py-2 text-gold transition-colors hover:bg-gold hover:text-obsidian font-bold"
                              role="menuitem"
                            >
                              <div className="flex items-center gap-2.5">
                                <ShieldAlert className="h-4 w-4 shrink-0" />
                                <span>Painel de Administração</span>
                              </div>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Botão Sair */}
                      <div className="border-t border-line pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            void signOut();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger"
                          role="menuitem"
                        >
                          <LogOut className="h-4 w-4 shrink-0" />
                          <span>Sair da conta</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="p-2 text-ivory hover:text-gold transition-colors rounded-full hover:bg-surface"
                title="Fazer Login"
              >
                <User className="h-5 w-5" />
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 border border-line-gold/60 rounded-full hover:bg-gold hover:text-obsidian transition-colors hidden sm:inline-flex items-center gap-1 shrink-0"
                title="Painel de Administração"
              >
                Admin
              </Link>
            )}

            {/* Botão da Sacola de Compras */}
            <button
              onClick={() => openOverlay({ type: 'bag' })}
              className="relative p-2.5 rounded-full bg-surface border border-line-gold/50 text-gold hover:bg-gold hover:text-obsidian transition-all shadow-md"
              aria-label="Abrir sacola de compras"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gold text-obsidian text-[10px] font-black flex items-center justify-center shadow-lg">
                  {count}
                </span>
              )}
            </button>

          </div>

        </div>
      </div>

      {/* Menu Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-line bg-obsidian/98 p-6 space-y-4 animate-in slide-in-from-top-4 duration-200">
          <div className="relative w-full mb-4">
            <input
              type="text"
              placeholder="Buscar camisa, blazer, calça..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  window.location.href = `/colecao?busca=${encodeURIComponent(searchQuery.trim())}`;
                }
              }}
              className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-xs text-ivory"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-mist" />
          </div>

          <div className="flex flex-col space-y-3">
            {STORE_NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-bold text-ivory hover:text-gold py-2 border-b border-line/40 flex items-center justify-between"
              >
                <span>{link.label}</span>
                <ArrowRight className="h-4 w-4 text-mist" />
              </Link>
            ))}

            {/* Atalhos de Conta & Perfil Mobile */}
            <div className="pt-3 border-t border-line space-y-2">
              {user ? (
                <>
                  <Link
                    href="/dashboard?aba=perfil"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface text-xs font-bold text-parchment hover:text-gold transition-colors"
                  >
                    <span>Meu Perfil & Editar Dados</span>
                    <User className="h-4 w-4 text-gold" />
                  </Link>
                  <Link
                    href="/dashboard?aba=pedidos"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface text-xs font-bold text-parchment hover:text-gold transition-colors"
                  >
                    <span>Meus Pedidos</span>
                    <ShoppingBag className="h-4 w-4 text-gold" />
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-gold/10 border border-line-gold/60 text-xs font-bold text-gold hover:bg-gold hover:text-obsidian transition-colors"
                    >
                      <span>Painel de Administração</span>
                      <ShieldAlert className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void signOut();
                    }}
                    className="w-full text-left p-2 text-xs font-semibold text-danger/80 hover:text-danger transition-colors"
                  >
                    Sair da conta
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface text-xs font-bold text-gold hover:bg-gold/10 transition-colors"
                >
                  <span>Entrar ou Criar Conta</span>
                  <User className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="pt-2 border-t border-line">
              <a
                href={consultorUrl}
                className="p-3 rounded-xl bg-gold/10 border border-line-gold text-gold text-xs font-bold flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span>Consultoria de Imagem Digital</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
