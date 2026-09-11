'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRight, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSession } from '@/providers/SessionProvider';
import { useDiagnosis } from '@/providers/DiagnosisProvider';
import { useUI } from '@/providers/UIProvider';
import { cn } from '@/lib/format';
import { AccountLoader } from './AccountLoader';
import { PaletteTab } from './PaletteTab';
import { SavedLooksTab } from './SavedLooksTab';
import { OrdersTab } from './OrdersTab';
import { ProfileTab } from './ProfileTab';
import { firstName, toRoman } from './shared';

const EASE = [0.22, 1, 0.36, 1] as const;

const TABS = [
  { id: 'cartela', label: 'Minha cartela' },
  { id: 'looks', label: 'Looks salvos' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'perfil', label: 'Perfil' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function parseTab(value: string | null): TabId {
  return TABS.find((t) => t.id === value)?.id ?? 'cartela';
}

function tabHref(id: TabId): string {
  return id === 'cartela' ? '/dashboard' : `/dashboard?aba=${id}`;
}

function monthYear(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** Etiqueta de papel (hang tag) com o vínculo do cliente. */
function HangTag({ role, file, since, season }: { role: string; file: string; since: string | null; season: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -9, y: -18 }}
      animate={{ opacity: 1, rotate: -3, y: 0 }}
      transition={{ duration: 1.2, ease: EASE, delay: 0.2 }}
      className="relative w-60 origin-top pt-12"
    >
      <span className="absolute left-1/2 top-0 h-[3.9rem] w-px -translate-x-1/2 bg-gold/60" aria-hidden />
      <div
        className="relative bg-parchment px-7 pb-7 pt-11 text-obsidian shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"
        style={{ clipPath: 'polygon(20% 0, 80% 0, 100% 11%, 100% 100%, 0 100%, 0 11%)' }}
      >
        <span className="pointer-events-none absolute inset-2 border border-dashed border-obsidian/15" aria-hidden />
        <span className="absolute left-1/2 top-4 h-3 w-3 -translate-x-1/2 rounded-full bg-obsidian ring-2 ring-gold-dark/40" aria-hidden />
        <p className="font-caps text-[0.58rem] tracking-[0.34em] text-gold-dark">Titi&apos;s Store</p>
        <p className="mt-2 font-display text-[1.9rem] font-semibold leading-none">{role}</p>
        <div className="my-5 border-t border-dashed border-obsidian/25" aria-hidden />
        <dl className="space-y-2 text-[0.6rem] uppercase tracking-[0.2em]">
          <div className="flex justify-between gap-3">
            <dt className="text-obsidian/55">Ficha nº</dt>
            <dd className="font-medium">{file}</dd>
          </div>
          {since && (
            <div className="flex justify-between gap-3">
              <dt className="text-obsidian/55">Desde</dt>
              <dd className="font-medium">{since}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-obsidian/55">Estação</dt>
            <dd className="text-right font-medium">{season ?? 'A definir'}</dd>
          </div>
        </dl>
      </div>
    </motion.div>
  );
}

export function AccountDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile, loading, isAdmin, isVip, signOut } = useSession();
  const { diagnosis } = useDiagnosis();
  const { openOverlay, toast } = useUI();
  const [leaving, setLeaving] = useState(false);
  const [visited, setVisited] = useState<TabId[]>([]);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const tab = parseTab(searchParams.get('aba'));

  useEffect(() => {
    if (loading || user || leaving) return;
    router.replace(`/login?next=${encodeURIComponent(tabHref(tab))}`);
  }, [loading, user, leaving, router, tab]);

  if (loading || !user || leaving) {
    return <AccountLoader label={leaving ? 'Até breve' : loading ? 'Abrindo sua ficha' : 'Redirecionando para o acesso'} />;
  }

  const selectTab = (id: TabId) => {
    setVisited((prev) => (prev.includes(tab) && prev.includes(id) ? prev : Array.from(new Set([...prev, tab, id]))));
    if (id !== tab) window.history.replaceState(null, '', tabHref(id));
  };

  const onTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === 'ArrowRight') next = (current + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (current - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    selectTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  const handleSignOut = async () => {
    setLeaving(true);
    try {
      await signOut();
      router.push('/');
    } catch {
      setLeaving(false);
      toast('Não foi possível sair agora. Tente novamente.', 'error');
    }
  };

  const name = firstName(profile?.full_name, profile?.email ?? user.email);
  const roleLabel = isAdmin ? 'Administração' : isVip ? 'Membro do Clube' : 'Cliente';
  const isMounted = (id: TabId) => id === tab || visited.includes(id);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line" aria-labelledby="conta-titulo">
        <span className="glow-gold pointer-events-none absolute -right-40 -top-40 h-[34rem] w-[34rem]" aria-hidden />
        <span
          className="vertical-text pointer-events-none absolute bottom-16 left-3 hidden font-caps text-[0.58rem] tracking-[0.5em] text-smoke xl:block"
          aria-hidden
        >
          Ficha do cliente
        </span>

        <div className="container-luxe relative pb-14 pt-32 sm:pt-40 lg:pb-20">
          <div className="grid gap-14 lg:grid-cols-12 lg:items-end">
            <motion.div
              className="lg:col-span-8"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <div className="flex items-center gap-4">
                <span className="numeral text-xs">Nº {user.id.slice(0, 4).toUpperCase()}</span>
                <span className="stitch w-10" aria-hidden />
                <span className="eyebrow">Minha conta</span>
              </div>
              <h1 id="conta-titulo" className="mt-6 font-display text-[clamp(3rem,9vw,7rem)] leading-[0.95] text-ivory">
                Olá, <em className="italic text-foil">{name}</em>.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-mist md:text-lg">
                Sua cartela, os looks que você salvou e o andamento dos pedidos, reunidos em uma só ficha.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button href="/#atelier">Nova consultoria</Button>
                <Button variant="outline" onClick={() => openOverlay({ type: 'scanner' })}>
                  <ScanFace className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  Nova leitura por foto
                </Button>
                {isAdmin && (
                  <Link href="/admin" className="link-luxe ml-2 text-gold-light">
                    Administração
                    <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  </Link>
                )}
              </div>
            </motion.div>

            <div className="flex justify-start lg:col-span-4 lg:justify-end">
              <HangTag
                role={roleLabel}
                file={user.id.slice(0, 8).toUpperCase()}
                since={monthYear(profile?.created_at ?? user.created_at)}
                season={diagnosis?.season ?? null}
              />
            </div>
          </div>
        </div>
        <div className="tape opacity-25" aria-hidden />
      </section>

      <div className="container-luxe">
        <div
          role="tablist"
          aria-label="Seções da conta"
          onKeyDown={onTabKeyDown}
          className="no-scrollbar -mx-5 flex overflow-x-auto border-b border-line px-1 sm:mx-0 sm:px-0"
        >
          {TABS.map((t, i) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`aba-${t.id}`}
                aria-selected={active}
                aria-controls={isMounted(t.id) ? `painel-${t.id}` : undefined}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(t.id)}
                className="group relative flex shrink-0 items-baseline gap-2.5 px-4 py-5 sm:px-6"
              >
                <span className={cn('numeral text-[0.6rem] transition-colors', active ? 'text-gold' : 'text-smoke group-hover:text-gold-dark')}>
                  {toRoman(i + 1)}
                </span>
                <span
                  className={cn(
                    'text-[0.72rem] font-medium uppercase tracking-[0.2em] transition-colors duration-500',
                    active ? 'text-ivory' : 'text-mist group-hover:text-ivory',
                  )}
                >
                  {t.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="conta-aba-ativa"
                    className="absolute inset-x-4 -bottom-px h-px bg-gold sm:inset-x-6"
                    transition={{ duration: 0.6, ease: EASE }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="py-12 sm:py-16">
          {TABS.map((t) =>
            isMounted(t.id) ? (
              <div
                key={t.id}
                role="tabpanel"
                id={`painel-${t.id}`}
                aria-labelledby={`aba-${t.id}`}
                hidden={t.id !== tab}
                tabIndex={0}
                className="outline-none"
              >
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
                  {t.id === 'cartela' && <PaletteTab />}
                  {t.id === 'looks' && <SavedLooksTab userId={user.id} />}
                  {t.id === 'pedidos' && <OrdersTab userId={user.id} />}
                  {t.id === 'perfil' && <ProfileTab onSignOut={handleSignOut} signingOut={leaving} />}
                </motion.div>
              </div>
            ) : null,
          )}
        </div>
      </div>
    </>
  );
}
