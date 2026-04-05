// ============================================================
// GE Messenger — Service Worker v5
// PWA Cache + Push natif (Firebase géré dans firebase-messaging-sw.js)
// ============================================================

const CACHE_NAME = 'ge-messenger-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/d.png',
];

// ── Install ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Asset non caché:', url, err))
        )
      )
    )
  );
});

// ── Activate ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch : Network First + fallback Cache ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.protocol === 'chrome-extension:'
  ) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
        })
      )
  );
});

// ── Push natif (fallback si Firebase ne prend pas en charge) ──
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (_) {
    data = { title: 'GE Messenger', body: event.data?.text() || 'Nouveau message' };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'GE Messenger', {
      body:     data.body || 'Vous avez un nouveau message',
      icon:     '/images/d.png',
      badge:    '/images/d.png',
      tag:      data.tag || 'ge-notif',
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url: data.url || '/', ...data.data },
      actions: [
        { action: 'open',    title: '📩 Ouvrir'  },
        { action: 'dismiss', title: '✕ Ignorer'  }
      ]
    })
  );
});

// ── Clic sur notification ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Message depuis la page ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Background Sync ──
self.addEventListener('sync', event => {
  if (event.tag === 'ge-sync') event.waitUntil(Promise.resolve());
});
