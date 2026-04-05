

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
const CACHE_NAME = 'ge-messenger-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/d.png',
];

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
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('fcm.googleapis.com') ||
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

// ── Notifications Firebase (app en arrière-plan / fermée) ──
messaging.onBackgroundMessage(payload => {
  console.log('[FCM-SW] Message reçu en background:', JSON.stringify(payload));

  // Firebase affiche automatiquement la notification si "notification" est présent
  // On surcharge ici pour forcer l'icône et les options
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

  // Si Firebase gère déjà via onBackgroundMessage, on évite le doublon
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
