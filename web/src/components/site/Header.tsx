'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowRight, ArrowUpRight, LogOut, ShoppingBag, Sparkles, User, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Medallion, Wordmark } from '@/components/ui/Logo';
import { WhatsAppIcon } from '@/components/ui/icons';
import { DEFAULT_PLAN_HREF, DOUBT_TEXT } from '@/components/home/links';
import { PLAN_TAB_PATH } from '@/lib/auth-redirect';
import { cn, whatsappLink } from '@/lib/format';
import { CONSULTING_PATH, NAV_LINKS, SITE } from '@/lib/site';
import { useCart } from '@/providers/CartProvider';
import { useSession } from '@/providers/SessionProvider';
import { useUI } from '@/providers/UIProvider';

const EASE = [0.22, 1, 0.36, 1] as const;
const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
const SECTION_IDS = NAV_LINKS.map((link) => link.href.split('#')[1] ?? '').filter(Boolean);
const PRIVATE_AREAS = ['/dashboard', '/admin', CONSULTING_PATH];
/** Páginas com a barra fixa de CTA no mobile. */
const MOBILE_CTA_PAGES = ['/', '/colecao'];

const ICON_BUTTON =
  'relative grid h-11 w-11 place-items-center rounded-full text-parchment transition-colors duration-300 hover:text-gold-light';

function sectionOf(href: string): string {
  return href.split('#')[1] ?? '';
}

function isLinkActive(href: string, pathname: string, activeSection: string | null): boolean {
  const section = sectionOf(href);
  return section ? section === activeSection : pathname === href;
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

/** true enquanto algum bloco marcado com data-hide-mobile-cta (hero, planos, CTA final) estiver na tela. */
function useCtaBlocked(enabled: boolean): boolean {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-hide-mobile-cta]'));
    if (targets.length === 0) return;

    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        setBlocked(visible.size > 0);
      },
      { threshold: 0 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [enabled]);

  return enabled && blocked;
}

/** Faixa fina na home para quem já tem acesso: atalho direto para a consultoria. */
function AccessStrip() {
  return (
    <div className="border-t border-line-gold/60 bg-gold/[0.06]">
      <div className="container-luxe flex h-10 items-center justify-center gap-x-3 text-[0.78rem] font-semibold tracking-[-0.005em] text-parchment">
        <Sparkles className="hidden h-3.5 w-3.5 text-gold sm:block" strokeWidth={1.75} aria-hidden />
        <span className="truncate">Você já tem acesso</span>
        <span aria-hidden className="text-gold/60">
          ·
        </span>
        <Link href={CONSULTING_PATH} className="inline-flex shrink-0 items-center gap-1.5 text-gold-light transition-colors hover:text-ivory">
          Abrir minha consultoria
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, isAdmin, hasAccess, signOut } = useSession();
  const { count, lastAddedAt } = useCart();
  const { openOverlay, toast } = useUI();

  const [scrolled, setScrolled] = useState(false);
  const [pastTop, setPastTop] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollAnchor = useRef(0);
  const scrollDirection = useRef<1 | -1>(1);

  const menuId = useId();

  const activeSection = useActiveSection(pathname === '/');
  const mobileCtaEnabled = !loading && !hasAccess && MOBILE_CTA_PAGES.includes(pathname);
  const ctaBlocked = useCtaBlocked(mobileCtaEnabled);

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
    setPastTop(y > 320);
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

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'Sua conta';
  const bagLabel = count > 0 ? `Abrir sacola, ${count} ${count === 1 ? 'item' : 'itens'}` : 'Abrir sacola, vazia';
  const solid = scrolled || menuOpen;
  const concealed = hidden && !menuOpen;
  // Quem já pagou cai direto na consultoria; sem plano, na conta (aba "Meu plano").
  const accountHref = hasAccess ? CONSULTING_PATH : '/dashboard';
  const accountLabel = hasAccess ? 'Minha consultoria' : 'Minha conta';
  const cta = hasAccess
    ? { href: CONSULTING_PATH, label: 'Minha consultoria' }
    : { href: DEFAULT_PLAN_HREF, label: 'Começar consultoria' };
  const showMobileCta = mobileCtaEnabled && pastTop && !ctaBlocked && !menuOpen;
  const showAccessStrip = pathname === '/' && !loading && hasAccess;

  function openAuth(mode: 'login' | 'register' = 'login') {
    setMenuOpen(false);
    openOverlay({ type: 'auth', mode });
  }

  function openBag() {
    setMenuOpen(false);
    openOverlay({ type: 'bag' });
  }

  async function handleSignOut() {
    setMenuOpen(false);
    try {
      await signOut();
      toast('Sessão encerrada. Até breve.', 'success');
      if (PRIVATE_AREAS.some((area) => pathname.startsWith(area))) router.push('/');
    } catch {
      toast('Não foi possível encerrar a sessão. Tente novamente.', 'error');
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
            <ul className="flex items-center gap-8 xl:gap-10">
              {NAV_LINKS.map((link) => {
                const active = isLinkActive(link.href, pathname, activeSection);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? (sectionOf(link.href) ? 'true' : 'page') : undefined}
                      className={cn(
                        'relative block py-2 text-[0.94rem] font-semibold tracking-[-0.005em] transition-colors duration-300',
                        'after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:bg-gold after:transition-transform after:duration-500 after:ease-[var(--ease-couture)]',
                        active
                          ? 'text-gold-light after:scale-x-100'
                          : 'text-parchment/80 after:scale-x-0 hover:text-gold-light hover:after:scale-x-100',
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
            {/* Conta: logado vai direto para o seu lugar; visitante abre o modal de acesso */}
            {user ? (
              <>
              <Link
                href={accountHref}
                aria-label={`${accountLabel} · ${displayName}`}
                title={accountLabel}
                className={ICON_BUTTON}
              >
                <User className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden />
                <span
                  aria-hidden
                  className={cn(
                    'absolute bottom-[11px] right-[10px] h-1.5 w-1.5 rounded-full shadow-[0_0_0_2px_var(--color-obsidian)]',
                    hasAccess ? 'bg-success' : 'bg-gold',
                  )}
                />
              </Link>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                aria-label="Sair da conta"
                title="Sair"
                className={cn(ICON_BUTTON, 'hidden lg:grid')}
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden />
              </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => !loading && openAuth('login')}
                aria-label="Entrar ou criar conta"
                aria-haspopup="dialog"
                aria-busy={loading || undefined}
                className={ICON_BUTTON}
              >
                <User className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden />
              </button>
            )}

            {/* Sacola */}
            <button type="button" onClick={openBag} aria-label={bagLabel} className={ICON_BUTTON}>
              <motion.span
                key={lastAddedAt}
                aria-hidden
                className="grid place-items-center"
                animate={lastAddedAt ? { y: [0, -7, 0, -2, 0], rotate: [0, -10, 6, -2, 0] } : undefined}
                transition={{ duration: 0.75, ease: 'easeOut' }}
              >
                <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.6} />
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

            {/* CTA principal (no celular, a barra fixa inferior assume) */}
            <Button href={cta.href} size="sm" className="ml-2 hidden sm:inline-flex">
              {cta.label}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            </Button>

            {/* Menu móvel */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? menuId : undefined}
              className="-mr-2 ml-1 grid h-11 w-11 place-items-center rounded-full lg:hidden"
            >
              <span aria-hidden className="flex w-6 flex-col items-end gap-[7px]">
                <span className="block h-0.5 w-6 rounded-full bg-ivory" />
                <span className="block h-0.5 w-4 rounded-full bg-gold" />
              </span>
            </button>
          </div>
        </div>

        {showAccessStrip && <AccessStrip />}
      </motion.header>

      {/* Barra fixa de conversão no mobile: some sobre o hero, os planos e o CTA final. */}
      <AnimatePresence>
        {showMobileCta && (
          <motion.div
            key="mobile-cta"
            className="fixed bottom-5 left-4 right-[92px] z-[55] sm:bottom-7 sm:left-7 sm:right-[100px] sm:max-w-sm lg:hidden"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Link href={DEFAULT_PLAN_HREF} className="btn btn-gold h-14 w-full">
              Quero minha consultoria
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <MobileMenu
            key="mobile-menu"
            id={menuId}
            onClose={closeMenu}
            pathname={pathname}
            activeSection={activeSection}
            signedIn={Boolean(user)}
            isAdmin={isAdmin}
            hasAccess={hasAccess}
            displayName={displayName}
            count={count}
            cta={cta}
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
  pathname: string;
  activeSection: string | null;
  signedIn: boolean;
  isAdmin: boolean;
  hasAccess: boolean;
  displayName: string;
  count: number;
  cta: { href: string; label: string };
  onAuth: (mode: 'login' | 'register') => void;
  onBag: () => void;
  onSignOut: () => void;
}

const MOBILE_ACTION = '[&:last-child:nth-child(odd)]:col-span-2';

/** Menu de tela cheia (mobile): links, CTA da consultoria, conta e WhatsApp. */
function MobileMenu({
  id,
  onClose,
  pathname,
  activeSection,
  signedIn,
  isAdmin,
  hasAccess,
  displayName,
  count,
  cta,
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
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div aria-hidden className="glow-gold pointer-events-none absolute -right-1/3 -top-24 aspect-square w-[120vw] opacity-60" />

      <div className="container-luxe relative flex h-[72px] shrink-0 items-center justify-between">
        <Link href="/" onClick={onClose} className="flex items-center gap-3" aria-label="Titi's Store — início">
          <Medallion size={38} />
          <span aria-hidden className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mist">
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
          <X className="h-5 w-5" strokeWidth={1.6} aria-hidden />
        </button>
      </div>
      <div aria-hidden className="container-luxe">
        <div className="stitch opacity-60" />
      </div>

      <nav aria-label="Principal" className="container-luxe relative flex-1 pb-8 pt-3">
        <ol>
          {NAV_LINKS.map((link, index) => {
            const active = isLinkActive(link.href, pathname, activeSection);
            return (
              <motion.li
                key={link.href}
                className="border-b border-line"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.12 + index * 0.05, ease: EASE }}
              >
                <Link
                  href={link.href}
                  onClick={onClose}
                  aria-current={active ? (sectionOf(link.href) ? 'true' : 'page') : undefined}
                  className="group flex items-center gap-5 py-5"
                >
                  <span aria-hidden className="w-7 shrink-0 text-xs font-semibold tabular-nums text-gold/80">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      'text-[clamp(2rem,9vw,2.8rem)] font-extrabold leading-none tracking-[-0.03em] transition-colors duration-300',
                      active ? 'text-gold-light' : 'text-ivory group-hover:text-gold-light',
                    )}
                  >
                    {link.label}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    strokeWidth={1.6}
                    className="ml-auto h-5 w-5 shrink-0 text-smoke transition-[color,translate] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold"
                  />
                </Link>
              </motion.li>
            );
          })}
        </ol>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: EASE }}
        >
          <Button href={cta.href} size="lg" onClick={onClose} className="mt-8 w-full">
            {cta.label}
            <ArrowRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          </Button>
        </motion.div>
      </nav>

      <motion.div
        className="container-luxe relative pb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
      >
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-mist">
          {signedIn ? `Boas-vindas, ${displayName}` : 'Sua conta'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {signedIn ? (
            <>
              <Button href="/dashboard" variant="ghost" size="sm" onClick={onClose} className={MOBILE_ACTION}>
                Minha conta
              </Button>
              <Button href={PLAN_TAB_PATH} variant="ghost" size="sm" onClick={onClose} className={MOBILE_ACTION}>
                {hasAccess ? 'Meu plano' : 'Ativar plano'}
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

        <Button href={whatsappLink(DOUBT_TEXT)} external variant="ghost" className="mt-5 w-full">
          <WhatsAppIcon className="h-4 w-4 text-gold" />
          Falar com o Titi
        </Button>
        <p className="mt-4 flex items-center justify-center gap-3 text-xs text-smoke">
          <span aria-hidden className="stitch w-6" />
          {SITE.whatsappDisplay}
          <span aria-hidden className="stitch w-6" />
        </p>
      </motion.div>
    </motion.div>
  );
}
