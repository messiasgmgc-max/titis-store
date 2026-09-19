'use client';

import { useState } from 'react';
import { Bell, BellRing, Smartphone, Monitor, CheckCircle2, AlertCircle, Share2, Sparkles, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/lib/usePushNotifications';
import { useUI } from '@/providers/UIProvider';
import { useSession } from '@/providers/SessionProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/format';

export function PushNotificationCard({ className }: { className?: string }) {
  const { isSupported, permission, isSubscribed, isStandalone, isIOS, isAndroid, loading, canInstall, subscribe, sendTestNotification, promptInstall } = usePushNotifications();
  const { user, profile } = useSession();
  const { toast } = useUI();
  const [testing, setTesting] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const handleActivate = async () => {
    const success = await subscribe({
      userId: user?.id,
      email: user?.email,
      phone: (profile as any)?.phone || null,
    });

    if (success) {
      toast('Notificações Ativadas! Você receberá avisos em tempo real sempre que uma etiqueta de envio for emitida.', 'success');
    } else {
      toast('Por favor, autorize as notificações na caixa de diálogo do seu navegador.', 'info');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await sendTestNotification();
      if (res && res.success) {
        toast(`Notificação de Teste Enviada! Simulação de etiqueta emitida via ${res.carrier || 'Correios'}.`, 'success');
      } else {
        toast(res?.error || 'Verifique se as notificações do navegador estão autorizadas para este site.', 'info');
      }
    } catch (e: any) {
      toast(e.message || 'Erro ao testar notificação.', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-line-gold/40 bg-obsidian-card p-6 shadow-xl backdrop-blur-md sm:p-7',
        className
      )}
    >
      {/* Detalhe de fundo dourado sutil */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold/5 blur-3xl" />

      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold border border-gold/20 shadow-inner">
            {isSubscribed ? <BellRing className="h-6 w-6 animate-pulse" /> : <Bell className="h-6 w-6" />}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-ivory">
                Notificações de Pedidos & Etiquetas
              </h3>
              {isSubscribed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Ativo
                </span>
              ) : permission === 'denied' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400 border border-rose-500/20">
                  <AlertCircle className="h-3 w-3" /> Bloqueado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-light border border-gold/20">
                  Disponível
                </span>
              )}
            </div>

            <p className="text-xs text-smoke max-w-xl">
              Receba avisos instantâneos no seu celular (Android ou iPhone) ou PC quando sua etiqueta de envio for emitida, com código de rastreamento e status da alfaiataria em tempo real.
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isIOS && !isStandalone && (
            <button
              type="button"
              onClick={() => setShowIOSModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-3.5 py-2 text-xs font-semibold text-gold-light transition hover:bg-gold/10"
            >
              <Share2 className="h-3.5 w-3.5" />
              Instalar no iPhone (iOS)
            </button>
          )}

          {canInstall && !isStandalone && (
            <button
              type="button"
              onClick={promptInstall}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition hover:bg-gold/20"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Instalar App no Celular/PC
            </button>
          )}

          {!isSubscribed ? (
            <Button
              onClick={handleActivate}
              disabled={loading}
              className="bg-gold text-obsidian hover:bg-gold-light font-bold text-xs px-5 py-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" /> Ativar Notificações
                </span>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing}
              className="border-gold/40 text-gold-light hover:bg-gold/10 text-xs px-4 py-2"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-gold" /> Testar Notificação de Etiqueta
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Modal Guia Rápido iPhone / iOS */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-line-gold bg-obsidian-card p-6 shadow-2xl space-y-4">
            <h4 className="font-display text-lg font-bold text-ivory flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-gold" /> Instalar no iPhone (iOS 16.4+)
            </h4>
            <div className="space-y-3 text-xs text-parchment leading-relaxed">
              <p>O Safari do iOS permite notificações em tempo real quando o app é adicionado à tela de início:</p>
              <ol className="list-decimal list-inside space-y-2 text-mist">
                <li>
                  Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima <Share2 className="inline h-3 w-3 text-gold" />) na barra do Safari.
                </li>
                <li>
                  Role para baixo e toque em <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.
                </li>
                <li>
                  Abra o aplicativo pelo ícone <strong>Titi&apos;s Store</strong> criado na sua tela inicial e clique em <strong>Ativar Notificações</strong>.
                </li>
              </ol>
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={() => setShowIOSModal(false)} size="sm" className="bg-gold text-obsidian font-bold">
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
