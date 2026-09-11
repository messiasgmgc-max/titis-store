'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowUpRight, LayoutDashboard, LogOut, ShieldCheck, ShoppingBag, User, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Medallion, Wordmark } from '@/components/ui/Logo';
import { WhatsAppIcon } from '@/components/ui/icons';
import { cn, whatsappLink } from '@/lib/format';
import { NAV_LINKS, SITE } from '@/lib/site';
import { useCart } from '@/providers/CartProvider';
import { useSession } from '@/providers/SessionProvider';
import { useUI } from '@/providers/UIProvider';

const EASE = [0.22, 1, 0.36, 1] as const;
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;
const SCHEDULE_TEXT = 'Olá, Titi! Gostaria de agendar um atendimento.';
const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
const SECTION_IDS = NAV_LINKS.map((link) => link.href.split('#')[1] ?? '').filter(Boolean);
const PRIVATE_AREAS = ['/dashboard', '/admin'];

const ICON_BUTTON =
  'relative grid h-11 w-11 place-items-center text-parchment transition-colors duration-500 hover:text-gold-light';

const MENU_ITEM =
  'flex w-full items-center gap-3 px-3 py-2.5 text-left text-[0.7rem] font-medium uppercase tracking-[0.18em] text-parchment transition-colors duration-300 hover:bg-gold/[0.07] hover:text-gold-light focus-visible:bg-gold/[0.07] focus-visible:text-gold-light';

function sectionOf(href: string): string {
  return href.split('#')[1] ?? '';
}

/** Destaca no menu a seção visível (somente na home). */
function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(SECTION_IDS.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [enabled]);

  return enabled ? active : null;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, isAdmin, isVip, signOut } = useSession();
  const { count, lastAddedAt } = useCart();
  const { openOverlay, toast } = useUI();

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const scrollAnchor = useRef(0);
  const scrollDirection = useRef<1 | -1>(1);

  const menuId = useId();
  const accountMenuId = useId();
  const accountLabelId = useId();

  const activeSection = useActiveSection(pathname === '/');

  // Transparente no topo; sólido após 24px. Esconde ao descer e volta ao subir.
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? y;
    const direction: 1 | -1 = y >= previous ? 1 : -1;
    if (direction !== scrollDirection.current) {
      scrollDirection.current = direction;
      scrollAnchor.current = previous;
    }
    setScrolled(y > 24);
    if (y < 120) setHidden(false);
    else if (direction === 1 && y - scrollAnchor.current > 64) setHidden(true);
    else if (direction === -1 && scrollAnchor.current - y > 12) setHidden(false);
  });

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Menu móvel: trava a rolagem e fecha se a janela passar para o desktop.
  useEffect(() => {
    if (!menuOpen) return;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };
    desktop.addEventListener('change', onChange);
    return () => {
      html.style.overflow = previousOverflow;
      desktop.removeEventListener('change', onChange);
    };
  }, [menuOpen]);

  // Menu da conta: foco no primeiro item, fecha ao clicar fora ou com ESC.
  useEffect(() => {
    if (!accountOpen) return;
    const frame = window.requestAnimationFrame(() => {
      accountMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountOpen]);

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Sua conta';
  const roleLabel = isAdmin ? 'Administração' : isVip ? "Membro do Clube Titi's" : 'Cliente da casa';
  const bagLabel = count > 0 ? `Abrir sacola, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Abrir sacola, vazia';
  const solid = scrolled || menuOpen;
  const concealed = hidden && !menuOpen && !accountOpen;

  function handleAccountClick() {
    if (user) {
      setAccountOpen((open) => !open);
      return;
    }
    if (loading) return;
    openOverlay({ type: 'auth' });
  }

  function openAuth(mode: 'login' | 'register') {
    setMenuOpen(false);
    openOverlay({ type: 'auth', mode });
  }

  function openBag() {
    setMenuOpen(false);
    setAccountOpen(false);
    openOverlay({ type: 'bag' });
  }

  async function handleSignOut() {
    setAccountOpen(false);
    setMenuOpen(false);
    try {
      await signOut();
      toast('Sessão encerrada. Até breve.', 'success');
      if (PRIVATE_AREAS.some((area) => pathname.startsWith(area))) router.push('/');
    } catch {
      toast('Não foi possível encerrar a sessão. Tente novamente.', 'error');
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % items.length;
    else if (event.key === 'ArrowUp') next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else if (event.key === 'Tab') setAccountOpen(false);
    if (next !== null) {
      event.preventDefault();
      items[next]?.focus();
    }
  }

  return (
    <>
      <motion.header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ease-[var(--ease-couture)]',
          solid ? 'border-line bg-obsidian/85 backdrop-blur-xl' : 'border-transparent bg-transparent',
        )}
        initial={false}
        animate={{ y: concealed ? '-100%' : '0%' }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 -z-10 h-[140%] bg-linear-to-b from-obsidian/80 to-transparent transition-opacity duration-500',
            solid ? 'opacity-0' : 'opacity-100',
          )}
        />

        <div className="container-luxe flex h-[72px] items-center gap-6 lg:grid lg:h-[88px] lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center">
            <Wordmark />
          </div>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-9 xl:gap-11">
              {NAV_LINKS.map((link) => {
                const active = sectionOf(link.href) === activeSection;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'relative block py-2 text-[0.68rem] font-medium uppercase tracking-[0.26em] transition-colors duration-500',
                        'after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:bg-gold after:transition-transform after:duration-700 after:ease-[var(--ease-couture)]',
                        active
                          ? 'text-gold-light after:scale-x-100'
                          : 'text-parchment/75 after:scale-x-0 hover:text-gold-light hover:after:scale-x-100',
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 lg:ml-0 lg:justify-self-end">
            {/* Conta */}
            <div ref={accountRef} className="relative">
              <button
                ref={accountButtonRef}
                type="button"
                onClick={handleAccountClick}
                aria-label={user ? `Conta de ${displayName}` : 'Entrar ou criar conta'}
                aria-haspopup={user ? 'menu' : 'dialog'}
                aria-expanded={user ? accountOpen : undefined}
                aria-controls={user && accountOpen ? accountMenuId : undefined}
                aria-busy={!user && loading ? true : undefined}
                className={ICON_BUTTON}
              >
                <User className="h-[18px] w-[18px]" strokeWidth={1.4} aria-hidden />
                {user && (
                  <span
                    aria-hidden
                    className="absolute bottom-[11px] right-[10px] h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_0_2px_var(--color-obsidian)]"
                  />
                )}
              </button>

              <AnimatePresence>
                {user && accountOpen && (
                  <motion.div
                    key="account-menu"
                    className="absolute right-0 top-full z-10 mt-2 w-72 border border-line-gold bg-surface shadow-[0_32px_64px_-24px_rgba(0,0,0,0.85)] lg:mt-3"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <span aria-hidden className="absolute -top-px right-4 h-px w-8 bg-gold" />
                    <div className="px-5 pb-4 pt-5">
                      <p className="eyebrow text-[0.58rem]">Boas-vindas</p>
                      <p id={accountLabelId} className="mt-2 truncate font-display text-[1.6rem] leading-tight text-ivory">
                        {displayName}
                      </p>
                      <p className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.22em] text-gold-light/80">{roleLabel}</p>
                    </div>
                    <div aria-hidden className="stitch mx-5 opacity-70" />
                    <div
                      ref={accountMenuRef}
                      id={accountMenuId}
                      role="menu"
                      aria-labelledby={accountLabelId}
                      onKeyDown={handleMenuKeyDown}
                      className="p-2"
                    >
                      <Link role="menuitem" href="/dashboard" onClick={() => setAccountOpen(false)} className={MENU_ITEM}>
                        <LayoutDashboard className="h-4 w-4 text-gold/80" strokeWidth={1.3} aria-hidden />
                        Minha conta
                      </Link>
                      {isAdmin && (
                        <Link role="menuitem" href="/admin" onClick={() => setAccountOpen(false)} className={MENU_ITEM}>
                          <ShieldCheck className="h-4 w-4 text-gold/80" strokeWidth={1.3} aria-hidden />
                          Administração
                        </Link>
                      )}
                      <button role="menuitem" type="button" onClick={() => void handleSignOut()} className={MENU_ITEM}>
                        <LogOut className="h-4 w-4 text-gold/80" strokeWidth={1.3} aria-hidden />
                        Sair
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sacola */}
            <button type="button" onClick={openBag} aria-label={bagLabel} className={ICON_BUTTON}>
              <motion.span
                key={lastAddedAt}
                aria-hidden
                className="grid place-items-center"
                animate={lastAddedAt ? { y: [0, -7, 0, -2, 0], rotate: [0, -10, 6, -2, 0] } : undefined}
                transition={{ duration: 0.75, ease: 'easeOut' }}
              >
                <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.4} />
              </motion.span>
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key="bag-count"
                    aria-hidden
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="absolute right-[4px] top-[6px] grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[0.56rem] font-semibold leading-none tabular-nums text-obsidian"
                  >
                    {count > 99 ? '99+' : count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <Button href={whatsappLink(SCHEDULE_TEXT)} external size="sm" className="ml-3 hidden md:inline-flex">
              <WhatsAppIcon className="h-3.5 w-3.5" />
              Agendar
            </Button>

            {/* Menu móvel */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
              className="-mr-2 ml-1 grid h-11 w-11 place-items-center lg:hidden"
            >
              <span aria-hidden className="flex w-6 flex-col items-end gap-[7px]">
                <span className="block h-px w-6 bg-ivory" />
                <span className="block h-px w-4 bg-gold" />
              </span>
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <MobileMenu
            key="mobile-menu"
            id={menuId}
            onClose={closeMenu}
            activeSection={activeSection}
            signedIn={Boolean(user)}
            isAdmin={isAdmin}
            displayName={displayName}
            count={count}
            onAuth={openAuth}
            onBag={openBag}
            onSignOut={() => void handleSignOut()}
          />
        )}
      </AnimatePresence>
    </>
  );
}

interface MobileMenuProps {
  id: string;
  onClose: () => void;
  activeSection: string | null;
  signedIn: boolean;
  isAdmin: boolean;
  displayName: string;
  count: number;
  onAuth: (mode: 'login' | 'register') => void;
  onBag: () => void;
  onSignOut: () => void;
}

const MOBILE_ACTION = '[&:last-child:nth-child(odd)]:col-span-2';

/** Menu de tela cheia (mobile): links numerados, conta e WhatsApp. */
function MobileMenu({
  id,
  onClose,
  activeSection,
  signedIn,
  isAdmin,
  displayName,
  count,
  onAuth,
  onBag,
  onSignOut,
}: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }, 60);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      // Só devolve o foco se nada mais o capturou (ex.: um modal aberto a partir do menu).
      const current = document.activeElement;
      if (!current || current === document.body) previouslyFocused?.focus({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <motion.div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-obsidian lg:hidden"
      initial={{ opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' }}
      animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
      exit={{ opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' }}
      transition={{ duration: 0.65, ease: EASE }}
    >
      <div aria-hidden className="glow-gold pointer-events-none absolute -right-1/3 -top-24 aspect-square w-[120vw] opacity-60" />

      <div className="container-luxe relative flex h-[72px] shrink-0 items-center justify-between">
        <Link href="/" onClick={onClose} className="flex items-center gap-3" aria-label="Titi's Store — início">
          <Medallion size={38} />
          <span aria-hidden className="font-caps text-[0.62rem] tracking-[0.4em] text-mist">
            Menu
          </span>
        </Link>
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          aria-label="Fechar menu"
          className="-mr-2 grid h-11 w-11 place-items-center text-parchment transition-colors hover:text-gold-light"
        >
          <X className="h-5 w-5" strokeWidth={1.3} aria-hidden />
        </button>
      </div>
      <div aria-hidden className="container-luxe">
        <div className="stitch opacity-60" />
      </div>

      <nav aria-label="Principal" className="container-luxe relative flex-1 pb-10 pt-4">
        <ol>
          {NAV_LINKS.map((link, index) => {
            const active = sectionOf(link.href) === activeSection;
            return (
              <motion.li
                key={link.href}
                className="border-b border-line"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 + index * 0.06, ease: EASE }}
              >
                <Link
                  href={link.href}
                  onClick={onClose}
                  aria-current={active ? 'true' : undefined}
                  className="group flex items-center gap-5 py-5"
                >
                  <span aria-hidden className="numeral w-9 shrink-0 text-[0.7rem] text-gold/80">
                    {NUMERALS[index]}
                  </span>
                  <span
                    className={cn(
                      'font-display text-[clamp(2.3rem,10vw,3.2rem)] leading-none transition-colors duration-500',
                      active ? 'italic text-gold-light' : 'text-ivory group-hover:text-gold-light',
                    )}
                  >
                    {link.label}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    strokeWidth={1.2}
                    className="ml-auto h-5 w-5 shrink-0 text-smoke transition-[color,translate] duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
                  />
                </Link>
              </motion.li>
            );
          })}
        </ol>
      </nav>

      <motion.div
        className="container-luxe relative pb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
      >
        <p className="kicker truncate text-[0.6rem]">{signedIn ? `Boas-vindas, ${displayName}` : 'Sua conta'}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {signedIn ? (
            <>
              <Button href="/dashboard" variant="ghost" size="sm" onClick={onClose} className={MOBILE_ACTION}>
                Minha conta
              </Button>
              {isAdmin && (
                <Button href="/admin" variant="ghost" size="sm" onClick={onClose} className={MOBILE_ACTION}>
                  Administração
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onBag} className={MOBILE_ACTION}>
                Sacola{count > 0 ? ` · ${count}` : ''}
              </Button>
              <Button variant="ghost" size="sm" onClick={onSignOut} className={MOBILE_ACTION}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => onAuth('login')} className={MOBILE_ACTION}>
                Entrar
              </Button>
              <Button variant="outline" size="sm" onClick={() => onAuth('register')} className={MOBILE_ACTION}>
                Criar conta
              </Button>
              <Button variant="ghost" size="sm" onClick={onBag} className={MOBILE_ACTION}>
                Sacola{count > 0 ? ` · ${count}` : ''}
              </Button>
            </>
          )}
        </div>

        <Button href={whatsappLink(SCHEDULE_TEXT)} external className="mt-6 w-full">
          <WhatsAppIcon className="h-4 w-4" />
          Agendar pelo WhatsApp
        </Button>
        <p className="mt-4 flex items-center justify-center gap-3 text-xs tracking-[0.18em] text-smoke">
          <span aria-hidden className="stitch w-6" />
          {SITE.whatsappDisplay}
          <span aria-hidden className="stitch w-6" />
        </p>
      </motion.div>
    </motion.div>
  );
}
