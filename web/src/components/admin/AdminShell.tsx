'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRight, Lock } from 'lucide-react';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Button } from '@/components/ui/Button';
import { AccountLoader } from '@/components/account/AccountLoader';
import { useSession } from '@/providers/SessionProvider';
import { cn } from '@/lib/format';
import { ProductManager, type ProductStatusFilter } from './ProductManager';
import { OrdersBoard } from './OrdersBoard';
import { ClientsTable } from './ClientsTable';
import { useAdminClients, useAdminOrders, useAdminProducts } from './useAdminData';

const EASE = [0.22, 1, 0.36, 1] as const;

type TabId = 'acervo' | 'pedidos' | 'clientes';

const TABS: { id: TabId; label: string; numeral: string }[] = [
  { id: 'acervo', label: 'Acervo', numeral: 'I' },
  { id: 'pedidos', label: 'Pedidos', numeral: 'II' },
  { id: 'clientes', label: 'Clientes', numeral: 'III' },
];

function tabFromHash(): TabId {
  if (typeof window === 'undefined') return 'acervo';
  const hash = window.location.hash.replace('#', '');
  return TABS.find((t) => t.id === hash)?.id ?? 'acervo';
}

/** Painel administrativo: valida a sessão e o papel antes de montar os dados. */
export function AdminShell() {
  const router = useRouter();
  const { user, profile, loading, isAdmin } = useSession();
  // Logo após o login o perfil chega um instante depois da sessão: aguarde para não exibir "acesso restrito" por engano.
  const resolving = loading || (user !== null && profile === null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/admin');
  }, [loading, user, router]);

  let content: React.ReactNode;
  if (resolving) content = <AccountLoader label="Abrindo a administração" />;
  else if (!user) content = <AccountLoader label="Redirecionando para o acesso" />;
  else if (!isAdmin) content = <RestrictedArea />;
  else content = <AdminPanel userId={user.id} adminName={profile?.full_name ?? user.email ?? null} />;

  return (
    <>
      <Header />
      <main id="conteudo" className="min-h-dvh">
        {content}
      </main>
      <Footer />
    </>
  );
}

// ------------------------------------------------------------
// Acesso restrito
// ------------------------------------------------------------
function RestrictedArea() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="restrito-titulo">
      <span className="glow-gold pointer-events-none absolute left-1/2 top-24 h-[30rem] w-[30rem] -translate-x-1/2" aria-hidden />
      <div className="container-luxe relative flex min-h-[80dvh] flex-col items-center justify-center pb-20 pt-36 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="panel frame flex max-w-xl flex-col items-center px-8 py-14 sm:px-14"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full border border-line-gold text-gold">
            <Lock className="h-6 w-6" strokeWidth={1.25} aria-hidden />
          </span>
          <div className="mt-8 flex items-center gap-3">
            <span className="stitch w-8" aria-hidden />
            <span className="eyebrow">Acesso restrito</span>
            <span className="stitch w-8" aria-hidden />
          </div>
          <h1 id="restrito-titulo" className="mt-5 font-display text-4xl leading-tight text-ivory sm:text-5xl">
            Área exclusiva da <em className="italic text-foil">administração</em>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-mist sm:text-base">
            Sua conta não tem permissão para abrir este painel. Se acredita que é um engano, fale com a administração da loja.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button href="/">Voltar para a home</Button>
            <Button href="/dashboard" variant="outline">
              Minha conta
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------
// Painel
// ------------------------------------------------------------
function AdminPanel({ userId, adminName }: { userId: string; adminName: string | null }) {
  const products = useAdminProducts();
  const orders = useAdminOrders();
  const clients = useAdminClients();

  const [tab, setTab] = useState<TabId>(tabFromHash);
  const [productStatus, setProductStatus] = useState<ProductStatusFilter>('all');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const stats = useMemo(() => {
    const active = products.data.filter((p) => p.is_active).length;
    const fresh = orders.data.filter((o) => o.status === 'novo').length;
    const inProgress = orders.data.filter((o) => o.status === 'em_atendimento').length;
    const vip = clients.data.filter((c) => c.role === 'vip').length;
    return {
      active,
      drafts: products.data.length - active,
      featured: products.data.filter((p) => p.is_featured && p.is_active).length,
      orders: orders.data.length,
      fresh,
      inProgress,
      clients: clients.data.length,
      vip,
    };
  }, [products.data, orders.data, clients.data]);

  const selectTab = (id: TabId) => {
    setTab(id);
    window.history.replaceState(null, '', `#${id}`);
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

  const openProducts = (status: ProductStatusFilter) => {
    setProductStatus(status);
    selectTab('acervo');
  };

  const valueOf = (loading: boolean, error: string | null, value: number) => (loading || (error && value === 0) ? null : value);

  const indicators: StatProps[] = [
    {
      numeral: 'I',
      label: 'Peças ativas',
      value: valueOf(products.loading, products.error, stats.active),
      detail: stats.featured > 0 ? `${stats.featured} em destaque` : 'Visíveis na coleção',
      onClick: () => openProducts('active'),
    },
    {
      numeral: 'II',
      label: 'Rascunhos',
      value: valueOf(products.loading, products.error, stats.drafts),
      detail: stats.drafts > 0 ? 'Aguardando revisão' : 'Nada pendente',
      onClick: () => openProducts('draft'),
    },
    {
      numeral: 'III',
      label: 'Pedidos recebidos',
      value: valueOf(orders.loading, orders.error, stats.orders),
      detail:
        stats.fresh > 0
          ? `${stats.fresh} ${stats.fresh === 1 ? 'novo' : 'novos'}${stats.inProgress > 0 ? ` · ${stats.inProgress} em atendimento` : ''}`
          : stats.inProgress > 0
            ? `${stats.inProgress} em atendimento`
            : 'Nenhum pedido novo',
      highlight: stats.fresh > 0,
      onClick: () => selectTab('pedidos'),
    },
    {
      numeral: 'IV',
      label: 'Clientes',
      value: valueOf(clients.loading, clients.error, stats.clients),
      detail: stats.vip > 0 ? `${stats.vip} ${stats.vip === 1 ? 'membro' : 'membros'} VIP` : 'Contas cadastradas',
      onClick: () => selectTab('clientes'),
    },
  ];

  const tabCount: Record<TabId, number | null> = {
    acervo: products.loading ? null : products.data.length,
    pedidos: orders.loading ? null : stats.fresh,
    clientes: clients.loading ? null : clients.data.length,
  };

  const firstName = (adminName ?? '').trim().split(/[\s@]+/)[0];

  return (
    <>
      <section className="relative overflow-hidden border-b border-line" aria-labelledby="admin-titulo">
        <span className="glow-gold pointer-events-none absolute -right-48 -top-48 h-[32rem] w-[32rem]" aria-hidden />
        <span
          className="vertical-text pointer-events-none absolute bottom-10 left-3 hidden font-caps text-[0.58rem] tracking-[0.5em] text-smoke xl:block"
          aria-hidden
        >
          Livro da casa
        </span>

        <div className="container-luxe relative pb-10 pt-28 sm:pt-36">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
            className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
          >
            <div>
              <div className="flex items-center gap-4">
                <span className="numeral text-xs">Nº {userId.slice(0, 4).toUpperCase()}</span>
                <span className="stitch w-10" aria-hidden />
                <span className="eyebrow">Painel da casa</span>
              </div>
              <h1 id="admin-titulo" className="mt-5 font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.95] text-ivory">
                Administração<span className="text-gold">.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-mist sm:text-base">
                Acervo, pedidos e clientes da Titi&apos;s Store reunidos em um só{' '}
                <em className="font-display text-lg italic text-gold-light">livro</em>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {firstName && (
                <span className="text-[0.62rem] uppercase tracking-[0.22em] text-smoke">
                  Sessão de <span className="text-parchment">{firstName}</span>
                </span>
              )}
              <Link href="/" className="link-luxe text-gold-light">
                Ver o site
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </Link>
            </div>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            aria-label="Indicadores"
            className="mt-10 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4"
          >
            {indicators.map((s) => (
              <Stat key={s.label} {...s} />
            ))}
          </motion.ul>
        </div>
        <div className="tape opacity-20" aria-hidden />
      </section>

      <div className="container-luxe pb-24">
        <div
          role="tablist"
          aria-label="Seções da administração"
          onKeyDown={onTabKeyDown}
          className="no-scrollbar flex gap-8 overflow-x-auto border-b border-line sm:gap-12"
        >
          {TABS.map((t, i) => {
            const active = t.id === tab;
            const count = tabCount[t.id];
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`admin-aba-${t.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`admin-painel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => selectTab(t.id)}
                className={cn(
                  'relative flex shrink-0 items-baseline gap-2.5 pb-4 pt-8 text-[0.72rem] font-medium uppercase tracking-[0.24em] transition-colors duration-300',
                  active ? 'text-ivory' : 'text-smoke hover:text-parchment',
                )}
              >
                <span className={cn('font-caps text-[0.62rem] tracking-[0.12em]', active ? 'text-gold' : 'text-smoke')}>{t.numeral}</span>
                {t.label}
                {count !== null && count > 0 && (
                  <span
                    className={cn(
                      'tabular-nums text-[0.62rem] tracking-[0.1em]',
                      t.id === 'pedidos' ? 'text-gold-light' : active ? 'text-gold' : 'text-smoke',
                    )}
                  >
                    {t.id === 'pedidos' ? `${count} ${count === 1 ? 'novo' : 'novos'}` : count}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="admin-tab-underline"
                    className="absolute inset-x-0 -bottom-px h-px bg-gold"
                    transition={{ duration: 0.5, ease: EASE }}
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`admin-painel-${tab}`} aria-labelledby={`admin-aba-${tab}`} className="pt-10 sm:pt-12">
          {tab === 'acervo' && <ProductManager resource={products} status={productStatus} onStatusChange={setProductStatus} />}
          {tab === 'pedidos' && <OrdersBoard resource={orders} />}
          {tab === 'clientes' && <ClientsTable resource={clients} currentUserId={userId} />}
        </div>
      </div>
    </>
  );
}

interface StatProps {
  numeral: string;
  label: string;
  value: number | null;
  detail: string;
  highlight?: boolean;
  onClick: () => void;
}

function Stat({ numeral, label, value, detail, highlight, onClick }: StatProps) {
  return (
    <li className="bg-obsidian">
      <button
        type="button"
        onClick={onClick}
        className="group flex h-full w-full flex-col bg-surface/60 px-4 py-5 text-left transition-colors duration-500 hover:bg-surface sm:px-6 sm:py-6"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-mist transition-colors group-hover:text-parchment">
            {label}
          </span>
          <span className="numeral text-[0.6rem]" aria-hidden>
            {numeral}
          </span>
        </span>
        <span className="mt-4 font-display text-4xl leading-none tabular-nums text-ivory sm:text-5xl">
          {value === null ? (
            <>
              <span className="inline-block h-9 w-12 animate-pulse bg-surface-2 align-middle sm:h-11" aria-hidden />
              <span className="sr-only">Carregando</span>
            </>
          ) : (
            value
          )}
        </span>
        <span className={cn('mt-2.5 text-xs', highlight ? 'text-gold-light' : 'text-smoke')}>{detail}</span>
      </button>
    </li>
  );
}
