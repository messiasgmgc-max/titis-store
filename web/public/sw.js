// ============================================================
// SERVICE WORKER - TITI'S STORE & CONSULTORIA
// Suporte PWA, Web Push Notifications (Android, iOS 16.4+, PC/Desktop)
// ============================================================

const CACHE_NAME = 'titis-store-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener de Notificação Push
self.addEventListener('push', (event) => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: "Titi's Store — Atualização",
        body: event.data.text() || 'Seu pedido teve uma nova atualização.',
      };
    }
  } else {
    data = {
      title: "Titi's Store — Atualização",
      body: 'Seu pedido teve uma nova atualização de entrega.',
    };
  }

  const title = data.title || "Titi's Store — Pedido Atualizado";
  const options = {
    body: data.body || 'Sua etiqueta de envio foi gerada ou o status do pedido mudou.',
    icon: data.icon || '/titislogo.jpeg',
    badge: data.badge || '/titislogo.jpeg',
    image: data.image || undefined,
    tag: data.tag || 'titis-order-update',
    renotify: true,
    requireInteraction: data.requireInteraction !== false,
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    data: {
      url: data.url || (data.data && data.data.url) || '/dashboard?aba=pedidos',
      orderId: data.orderId || (data.data && data.data.orderId),
      trackingCode: data.trackingCode || (data.data && data.data.trackingCode),
      dateOfArrival: Date.now(),
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'Ver Pedido 📦',
      },
      {
        action: 'track',
        title: 'Acompanhar Rastreio 🔍',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener de Clique na Notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/dashboard?aba=pedidos';

  if (event.action === 'track' && notificationData.trackingCode) {
    targetUrl = `https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(
      notificationData.trackingCode
    )}`;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já houver uma aba aberta no domínio da loja, foca nela e navega
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            if ('navigate' in client && !targetUrl.startsWith('http')) {
              return client.navigate(targetUrl);
            }
            return;
          }
        }
      }
      // Se não houver aba aberta, abre uma nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Listener para renovação de inscrição Push
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
      .then((subscription) => {
        return fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      })
      .catch((err) => {
        console.error('[SW] Erro ao renovar push subscription:', err);
      })
  );
});
