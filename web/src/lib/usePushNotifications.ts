'use client';

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  loading: boolean;
  error: string | null;
  canInstall: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isStandalone: false,
    isIOS: false,
    isAndroid: false,
    loading: true,
    error: null,
    canInstall: false,
  });

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Detecta capacidades do navegador e registra Service Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /Android/.test(ua);
    const permission = isSupported ? Notification.permission : 'unsupported';

    // Captura evento de instalação PWA (Android / PC Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setState((prev) => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (!isSupported) {
      setState((prev) => ({
        ...prev,
        isSupported: false,
        permission: 'unsupported',
        isStandalone,
        isIOS,
        isAndroid,
        loading: false,
      }));
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // Registra Service Worker e checa se já existe subscrição ativa
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (registration) => {
        try {
          const subscription = await registration.pushManager.getSubscription();
          setState({
            isSupported: true,
            permission: Notification.permission,
            isSubscribed: !!subscription,
            isStandalone,
            isIOS,
            isAndroid,
            loading: false,
            error: null,
            canInstall: !!installPrompt,
          });
        } catch (e: any) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      })
      .catch((err) => {
        console.warn('[usePushNotifications] Erro ao registrar Service Worker:', err);
        setState((prev) => ({
          ...prev,
          isSupported: true,
          permission: Notification.permission,
          isStandalone,
          isIOS,
          isAndroid,
          loading: false,
          error: err.message,
        }));
      });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Inscreve o usuário em Web Push
  const subscribe = useCallback(
    async (userMetadata?: { userId?: string | null; email?: string | null; phone?: string | null }) => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        throw new Error('Notificações não são suportadas neste navegador.');
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const registration = await navigator.serviceWorker.ready;

        // Pede permissão explícita
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setState((prev) => ({
            ...prev,
            permission,
            loading: false,
            error: 'Permissão para notificações foi recusada no navegador.',
          }));
          return false;
        }

        // Obtém chave pública VAPID
        const resKey = await fetch('/api/notifications/subscribe');
        const { publicKey } = await resKey.json();

        if (!publicKey) {
          throw new Error('Chave pública VAPID não configurada.');
        }

        const convertedKey = urlBase64ToUint8Array(publicKey);

        // Inscreve no Push Manager
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey as any,
          });
        }

        // Salva inscrição no servidor
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            userId: userMetadata?.userId || null,
            customerEmail: userMetadata?.email || null,
            customerPhone: userMetadata?.phone || null,
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              standalone:
                window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true,
            },
          }),
        });

        setState((prev) => ({
          ...prev,
          permission: 'granted',
          isSubscribed: true,
          loading: false,
          error: null,
        }));

        return true;
      } catch (err: any) {
        console.error('[usePushNotifications] Falha ao ativar notificações:', err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err.message || 'Erro ao ativar notificações.',
        }));
        return false;
      }
    },
    []
  );

  // Dispara teste de notificação
  const sendTestNotification = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      // Garante permissão
      if (Notification.permission === 'default') {
        const granted = await subscribe();
        if (!granted) return { success: false, error: 'Permissão necessária.' };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      const response = await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription ? subscription.toJSON() : null,
          carrier: 'Correios Sedex',
        }),
      });

      const result = await response.json();

      // Se a notificação do Service Worker não disparar imediatamente devido a restrições de janela ativa em desktop, exibe também notificação direta
      if (Notification.permission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          new Notification(`📦 Etiqueta Gerada! Pedido #${result.orderId ? result.orderId.slice(0, 8) : 'TESTE'}`, {
            body: `Suas peças estão prontas e a etiqueta foi emitida via ${result.carrier || 'Correios'}. Rastreio: ${result.trackingCode || 'BR123456789BR'}`,
            icon: '/titislogo.jpeg',
            badge: '/titislogo.jpeg',
            tag: 'test-order-notification',
          });
        } catch (e) {
          // Em alguns navegadores mobile new Notification() requer ServiceWorker.showNotification
          registration.showNotification(`📦 Etiqueta Gerada! Pedido #${result.orderId ? result.orderId.slice(0, 8) : 'TESTE'}`, {
            body: `Suas peças estão prontas e a etiqueta foi emitida via ${result.carrier || 'Correios'}. Rastreio: ${result.trackingCode || 'BR123456789BR'}`,
            icon: '/titislogo.jpeg',
            badge: '/titislogo.jpeg',
            tag: 'test-order-notification',
          });
        }
      }

      setState((prev) => ({ ...prev, loading: false }));
      return result;
    } catch (err: any) {
      console.error('[usePushNotifications] Erro ao testar notificação:', err);
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
      return { success: false, error: err.message };
    }
  }, [subscribe]);

  // Executa o prompt nativo de instalação do PWA
  const promptInstall = useCallback(async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setState((prev) => ({ ...prev, isStandalone: true, canInstall: false }));
      }
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  return {
    ...state,
    subscribe,
    sendTestNotification,
    promptInstall,
  };
}
