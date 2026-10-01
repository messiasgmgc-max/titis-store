'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ShoppingCart, 
  TrendingUp, 
  Smartphone, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Button } from '@/components/ui/Button';
import { WhatsAppIcon } from '@/components/ui/icons';
import { AccountLoader } from '@/components/account/AccountLoader';
import { useSession } from '@/providers/SessionProvider';
import { useUI } from '@/providers/UIProvider';
import { PdvManager } from '@/components/admin/PdvManager';
import {
  useAdminOrders,
  useAdminProducts,
  useAdminSettings,
} from '@/components/admin/useAdminData';
import { testMerchantWhatsAppNotificationAction } from '@/app/admin/actions';

const EASE = [0.22, 1, 0.36, 1] as const;

export default function PdvTestPage() {
  const router = useRouter();
  const { user, profile, loading, isAdmin } = useSession();
  const { toast } = useUI();

  const orders = useAdminOrders();
  const products = useAdminProducts();
  const settings = useAdminSettings();

  const [testingEvolution, setTestingEvolution] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; phoneUsed?: string; error?: string } | null>(null);

  // Authentication check
  const resolving = loading || (user !== null && profile === null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login?next=/admin/pdv');
  }, [loading, user, router]);

  const handleQuickTestEvolution = async () => {
    setTestingEvolution(true);
    setTestResult(null);
    try {
      const res = await testMerchantWhatsAppNotificationAction(testPhone || undefined);
      setTestResult(res);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    } catch {
      const fail = { success: false, message: 'Falha de rede ao acionar Evolution API.' };
      setTestResult(fail);
      toast(fail.message, 'error');
    } finally {
      setTestingEvolution(false);
    }
  };

  if (resolving) {
    return <AccountLoader label="Carregando módulo de teste PDV & WhatsApp..." />;
  }

  if (!user || !isAdmin) {
    return (
      <>
        <Header />
        <main className="min-h-dvh flex items-center justify-center p-6 text-center">
          <div className="panel max-w-md p-8 rounded-3xl space-y-4">
            <Lock className="h-10 w-10 text-gold mx-auto" />
            <h1 className="font-display text-2xl font-bold text-ivory">Acesso Restrito</h1>
            <p className="text-xs text-mist">
              Apenas administradores da Titi&apos;s Store podem acessar a página de teste do PDV e notificações WhatsApp.
            </p>
            <Button onClick={() => router.push('/admin')} className="w-full bg-gold text-obsidian font-bold">
              Ir para o Login / Painel
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main id="conteudo" className="min-h-dvh pb-20 sm:pb-24 pt-24 sm:pt-36">
        <div className="container-luxe space-y-6 sm:space-y-10">
          {/* Breadcrumb & Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4 sm:pb-6">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Link
                href="/admin#pdv"
                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface/60 px-3 sm:px-4 py-2 text-xs font-semibold text-smoke hover:border-gold/40 hover:text-ivory transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Voltar ao Painel Geral
              </Link>
              <span className="text-xs text-smoke">/</span>
              <span className="text-xs font-semibold text-gold truncate">Página Teste: PDV & Evolution API</span>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Ambiente Seguro
              </span>
              <Link
                href="/admin#configuracoes"
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-smoke hover:text-gold transition-colors"
              >
                Configurar Chaves <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Banner de Demonstração & Validação do Prompt */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/[0.08] via-obsidian-card to-obsidian-surface/90 p-5 sm:p-8 shadow-2xl relative overflow-hidden"
          >
            <span className="glow-gold pointer-events-none absolute -right-32 -top-32 h-64 w-64" aria-hidden />

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold">
                    Funcionalidade Solicitada
                  </span>
                  <span className="text-xs text-smoke font-mono">PDV + WhatsApp Instantâneo</span>
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-ivory">
                  Validação do Módulo de PDV & Notificações Evolution API
                </h1>
                <p className="text-xs sm:text-sm text-mist leading-relaxed">
                  Esta tela permite validar e operar o módulo completo: seleção de produtos cadastrados no acervo,
                  ajuste individual de custo (CMV) e valor cobrado, cálculo em tempo real de lucro e margem, formas de pagamento
                  (Pix, Débito, Crédito em até 12x, Dinheiro) com controle consolidado de saídas e disparo instantâneo no WhatsApp do lojista via Evolution API assim que qualquer pedido for aprovado.
                </p>
              </div>

              {/* Card de Teste Rápido do WhatsApp */}
              <div className="w-full lg:w-96 rounded-2xl border border-line bg-surface/80 p-5 space-y-3 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ivory flex items-center gap-1.5">
                    <WhatsAppIcon className="h-4 w-4 text-emerald-400" /> Teste Rápido WhatsApp
                  </span>
                  <span className="text-[10px] text-smoke font-mono">Evolution API</span>
                </div>

                <input
                  type="text"
                  placeholder="Número de teste (ex: 5531999999999)"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value.replace(/\D/g, ''))}
                  className="field rounded-xl py-1.5 text-xs font-mono"
                />

                <Button
                  size="sm"
                  onClick={handleQuickTestEvolution}
                  loading={testingEvolution}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 flex items-center justify-center gap-2"
                >
                  <Send className="h-3.5 w-3.5" /> Disparar Alerta no WhatsApp
                </Button>

                {testResult && (
                  <p
                    className={`text-[11px] leading-tight font-medium p-2 rounded-lg border ${
                      testResult.success
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    }`}
                  >
                    {testResult.message}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* O Módulo PDV em Si */}
          <div className="pt-2">
            <PdvManager
              ordersResource={orders}
              productsResource={products}
              settingsResource={settings}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
