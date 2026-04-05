// GE Messenger Service Worker v3
const CACHE = 'express-messenger-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Install: cache assets
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {}))
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request))
  );
});

// ── Push Notifications (background) ──
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { title: 'GE Messenger', body: e.data?.text() || 'Nouveau message' }; }

  const title = data.title || 'Express Messenger';
  const options = {
    body: data.body || 'Vous avez un nouveau message',
    icon: data.icon || '/images/n.jpg',
    badge: '/images/n.jpg',
    tag: data.tag || 'ge-notif',
    renotify: true,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: 'open', title: '📩 Ouvrir' },
      { action: 'dismiss', title: '✕ Ignorer' }
    ]
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      for (const c of cls) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return clients.openWindow('/');
    })
  );
});

// ── Background sync (if supported) ──
self.addEventListener('sync', e => {
  if (e.tag === 'ge-sync') {
    e.waitUntil(Promise.resolve());
  }
});

// ── Firebase Messaging (background) ──
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyCPGgtXoDUycykLaTSee0S0yY0tkeJpqKI",
    authDomain: "data-com-a94a8.firebaseapp.com",
    databaseURL: "https://data-com-a94a8-default-rtdb.firebaseio.com",
    projectId: "data-com-a94a8",
    storageBucket: "data-com-a94a8.firebasestorage.app",
    messagingSenderId: "276904640935",
    appId: "1:276904640935:web:9cd805aeba6c34c767f682"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(payload => {
    const { title, body } = payload.notification || {};
    const notifTitle = title || 'GE Messenger';
    const notifBody  = body  || 'Nouveau message';

    return self.registration.showNotification(notifTitle, {
      body: notifBody,
      icon: '/images/n.jpg',
      badge: '/images/n.jpg',
      tag: 'ge-bg-msg',
      renotify: true,
      vibrate: [150, 80, 150],
      data: payload.data || {}
    });
  });
} catch (e) {
  // Firebase not available in SW context – push handled above
}
