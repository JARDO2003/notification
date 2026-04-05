importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Firebase Init ──
firebase.initializeApp({
  apiKey:            "AIzaSyCPGgtXoDUycykLaTSee0S0yY0tkeJpqKI",
  authDomain:        "data-com-a94a8.firebaseapp.com",
  databaseURL:       "https://data-com-a94a8-default-rtdb.firebaseio.com",
  projectId:         "data-com-a94a8",
  storageBucket:     "data-com-a94a8.firebasestorage.app",
  messagingSenderId: "276904640935",
  appId:             "1:276904640935:web:9cd805aeba6c34c767f682"
});

const messaging = firebase.messaging();

// ── Cache PWA ──
const CACHE_NAME = 'ge-messenger-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/d.png',
];

// ── Domaines à NE PAS intercepter ──
// Kaspersky, Firebase realtime, FCM, CDNs externes, extensions Chrome
const BYPASS_HOSTS = [
  'kis.v2.scr.kaspersky-labs.com',
  'kaspersky',
  'firebaseio.com',
  'firestore.googleapis.com',
  'fcm.googleapis.com',
  'cloudinary.com',
  'googleapis.com',
  'gstatic.com',
];

function shouldBypass(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'chrome-extension:') return true;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return true;
    return BYPASS_HOSTS.some(h => u.hostname.includes(h));
  } catch (_) {
    return true; // URL invalide → ignorer
  }
}

// ── Install ──
self.addEventListener('install', event => {
  console.log('[SW] Installation...');
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
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Suppression ancien cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch : Network First + fallback Cache ──
self.addEventListener('fetch', event => {
  // Ignorer tout ce qui ne doit pas être intercepté
  if (event.request.method !== 'GET') return;
  if (shouldBypass(event.request.url)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Ne mettre en cache que les réponses valides
        if (
          response &&
          response.status === 200 &&
          response.type !== 'opaque' &&
          response.type !== 'error'
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html');
          }
          // Retourner une réponse d'erreur propre plutôt que de rejeter la promesse
          return new Response('Hors ligne', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        })
      )
  );
});

// ── Notifications Firebase (app en arrière-plan / fermée) ──
messaging.onBackgroundMessage(payload => {
  console.log('[FCM-SW] Message reçu en background:', JSON.stringify(payload));

  const title = payload.notification?.title || payload.data?.title || 'Express Messenger';
  const body  = payload.notification?.body  || payload.data?.body  || 'Nouveau message';
  const url   = payload.data?.url || '/';

  return self.registration.showNotification(title, {
    body,
    icon:     '/images/d.png',
    badge:    '/images/d.png',
    tag:      payload.data?.tag || 'ge-fcm-msg',
    renotify: true,
    vibrate:  [150, 80, 150],
    data:     { url, ...payload.data },
    actions: [
      { action: 'open',    title: '📩 Ouvrir'  },
      { action: 'dismiss', title: '✕ Ignorer'  }
    ]
  });
});

// ── Push natif (fallback au cas où FCM ne gère pas) ──
self.addEventListener('push', event => {
  console.log('[SW] Push natif reçu');
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (_) {
    data = { title: 'GE Messenger', body: event.data?.text() || 'Nouveau message' };
  }

  if (data.from && data.notification) return;

  event.waitUntil(
    self.registration.showNotification(data.title || 'GE Messenger', {
      body:     data.body || 'Vous avez un nouveau message',
      icon:     '/images/d.png',
      badge:    '/images/d.png',
      tag:      data.tag || 'ge-push-msg',
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
  console.log('[SW] Notification cliquée → ', targetUrl);

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
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Skip waiting demandé');
    self.skipWaiting();
  }
});

// ── Background Sync ──
self.addEventListener('sync', event => {
  if (event.tag === 'ge-sync') event.waitUntil(Promise.resolve());
});
