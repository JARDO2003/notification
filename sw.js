// GE Messenger Service Worker v4
// PWA cache + push notifications (sans Firebase — géré dans firebase-messaging-sw.js)
const CACHE_NAME = 'ge-messenger-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/icon-192-maskable.png',
  '/images/icon-512-maskable.png',
  '/images/apple-touch-icon.png',
];

// ── Install : mise en cache des assets statiques ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Certains assets non cachés:', err);
      });
    })
  );
});

// ── Activate : suppression des anciens caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : Network First avec fallback cache ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes Firebase, Cloudinary, etc.
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.protocol === 'chrome-extension:'
  ) {
    return;
  }

  // Stratégie : Network First, fallback Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache uniquement les réponses valides
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback pour les pages HTML
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// ── Push Notifications (background) ──
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {
      title: 'GE Messenger',
      body: event.data?.text() || 'Nouveau message'
    };
  }

  const title = data.title || 'GE Messenger';
  const options = {
    body: data.body || 'Vous avez un nouveau message',
    icon: '/images/icon-192.png',
    badge: '/images/icon-192.png',
    tag: data.tag || 'ge-notif',
    renotify: true,
    vibrate: [200, 100, 200],
    data: { url: data.url || '/', ...data.data },
    actions: [
      { action: 'open',    title: '📩 Ouvrir'  },
      { action: 'dismiss', title: '✕ Ignorer'  }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Cherche une fenêtre déjà ouverte
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      // Ouvre une nouvelle fenêtre
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Message depuis la page ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Background Sync ──
self.addEventListener('sync', event => {
  if (event.tag === 'ge-sync') {
    event.waitUntil(Promise.resolve());
  }
});
