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
import { cn, formatBRL } from '@/lib/format';
import { useCatalog, searchProducts } from '@/lib/catalog';
import { getInstallmentTeaser } from '@/lib/installments';

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
  const { products } = useCatalog();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const searchResults = React.useMemo(() => searchProducts(products, searchQuery), [products, searchQuery]);
  const showDropdown = (searchFocused || searchQuery.trim().length > 0) && searchQuery.trim().length > 0;

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
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        (!mobileSearchRef.current || !mobileSearchRef.current.contains(target))
      ) {
        setSearchFocused(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  useEffect(() => {
    setUserMenuOpen(false);
    setSearchFocused(false);
    setSearchQuery('');
    setMobileMenuOpen(false);
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
            
            {/* Campo de Busca Rápida com Resultados em Tempo Real */}
            <div ref={searchContainerRef} className="relative hidden md:block w-48 lg:w-64 focus-within:w-72 lg:focus-within:w-80 transition-all duration-300">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Buscar roupas, peças..."
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      setSearchFocused(false);
                      window.location.href = `/colecao?busca=${encodeURIComponent(searchQuery.trim())}`;
                    }
                  }}
                  className="w-full bg-surface border border-line rounded-full pl-9 pr-8 py-1.5 text-xs text-ivory placeholder-mist focus:outline-none focus:border-gold transition-all"
                />
                <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-mist pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchFocused(false);
                    }}
                    className="absolute right-2.5 top-2 p-0.5 text-mist hover:text-ivory rounded-full transition-colors"
                    title="Limpar busca"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Dropdown de Resultados em Tempo Real */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-full mt-2 w-80 lg:w-96 rounded-2xl border border-line-gold/40 bg-surface/98 shadow-2xl backdrop-blur-2xl z-50 overflow-hidden"
                  >
                    <div className="border-b border-line px-4 py-2 flex items-center justify-between text-[11px] font-semibold text-mist bg-surface-2/40">
                      <span>Resultados em tempo real</span>
                      <span className="rounded-full bg-gold/10 text-gold px-2 py-0.5 text-[10px] font-bold">
                        {searchResults.length} {searchResults.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>

                    <div className="max-h-[340px] overflow-y-auto divide-y divide-line/40 no-scrollbar">
                      {searchResults.length > 0 ? (
                        searchResults.slice(0, 6).map((product) => (
                          <Link
                            key={product.id}
                            href={`/produtos/${product.slug || product.id}`}
                            onClick={() => {
                              setSearchFocused(false);
                              setSearchQuery('');
                            }}
                            className="flex items-center gap-3 p-3 hover:bg-gold/10 transition-colors group"
                          >
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-line-gold/30 bg-obsidian">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-mist text-[10px]">
                                  Titi&apos;s
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-bold text-ivory group-hover:text-gold transition-colors">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-mist mt-0.5">
                                <span className="font-semibold text-parchment">{product.category}</span>
                                {product.color_name && (
                                  <>
                                    <span>·</span>
                                    <span>{product.color_name}</span>
                                  </>
                                )}
                              </div>
                              <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-xs font-black text-gold">
                                  {formatBRL(product.price_cents)}
                                </span>
                                {product.price_cents && (
                                  <span className="text-[9px] text-mist truncate">
                                    {getInstallmentTeaser(product.price_cents)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-mist opacity-0 group-hover:opacity-100 group-hover:text-gold transition-all shrink-0" />
                          </Link>
                        ))
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-xs font-bold text-ivory">Nenhum produto encontrado</p>
                          <p className="text-[11px] text-mist mt-1">
                            Não encontramos peças para &ldquo;{searchQuery}&rdquo;.
                          </p>
                          <Link
                            href="/colecao"
                            onClick={() => {
                              setSearchFocused(false);
                              setSearchQuery('');
                            }}
                            className="mt-3 inline-block text-xs font-bold text-gold hover:underline"
                          >
                            Ver acervo completo
                          </Link>
                        </div>
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="border-t border-line p-2 bg-surface-2/30">
                        <Link
                          href={`/colecao?busca=${encodeURIComponent(searchQuery.trim())}`}
                          onClick={() => {
                            setSearchFocused(false);
                            setSearchQuery('');
                          }}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gold/10 hover:bg-gold hover:text-obsidian py-2 text-xs font-bold text-gold transition-all"
                        >
                          <span>Ver todos os {searchResults.length} produtos na coleção</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
          <div ref={mobileSearchRef} className="relative w-full mb-4">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Buscar camisa, blazer, calça..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setMobileMenuOpen(false);
                    window.location.href = `/colecao?busca=${encodeURIComponent(searchQuery.trim())}`;
                  }
                }}
                className="w-full bg-surface border border-line rounded-xl pl-10 pr-9 py-2.5 text-xs text-ivory focus:outline-none focus:border-gold"
              />
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-mist pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 p-1 text-mist hover:text-ivory"
                  title="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Resultados em Tempo Real no Mobile */}
            {searchQuery.trim().length > 0 && (
              <div className="mt-2 rounded-xl border border-line-gold/30 bg-surface/98 max-h-64 overflow-y-auto divide-y divide-line/40 no-scrollbar shadow-xl">
                {searchResults.length > 0 ? (
                  searchResults.slice(0, 5).map((product) => (
                    <Link
                      key={product.id}
                      href={`/produtos/${product.slug || product.id}`}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 p-2.5 hover:bg-gold/10 transition-colors"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line-gold/30 bg-obsidian">
                        {product.image_url ? (
                          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] text-mist">Titi&apos;s</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ivory">{product.name}</p>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-[11px] text-gold font-black">{formatBRL(product.price_cents)}</span>
                          {product.price_cents && (
                            <span className="text-[9px] text-mist truncate">
                              {getInstallmentTeaser(product.price_cents)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-mist shrink-0" />
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-mist">
                    Nenhum produto encontrado para &ldquo;{searchQuery}&rdquo;.
                  </div>
                )}
                {searchResults.length > 0 && (
                  <Link
                    href={`/colecao?busca=${encodeURIComponent(searchQuery.trim())}`}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setSearchQuery('');
                    }}
                    className="block p-2.5 text-center text-xs font-bold text-gold bg-gold/10 hover:bg-gold hover:text-obsidian transition-colors"
                  >
                    Ver todos os {searchResults.length} resultados →
                  </Link>
                )}
              </div>
            )}
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
