// ============================================================
// GE Messenger — Firebase Messaging Service Worker
// DOIT être à la racine du domaine : /firebase-messaging-sw.js
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

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

// ── Notifications en arrière-plan ──
messaging.onBackgroundMessage(payload => {
  console.log('[FCM-SW] Message reçu en background:', payload);

  const title = payload.notification?.title || 'Express Messenger';
  const body  = payload.notification?.body  || 'Nouveau message';

  return self.registration.showNotification(title, {
    body,
    icon:     '/images/d.png',
    badge:    '/images/d.png',
    tag:      'ge-bg-msg',
    renotify: true,
    vibrate:  [150, 80, 150],
    data:     { url: payload.data?.url || '/', ...payload.data }
  });
});

// ── Clic sur notification Firebase ──
self.addEventListener('notificationclick', event => {
  event.notification.close();

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
