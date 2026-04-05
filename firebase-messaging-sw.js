importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ═══════════════════════════════════════════════════════════════
// GE MESSENGER - SERVICE WORKER NOTIFICATIONS ULTRA COMPLET
// Notifications même PWA fermée + Système de "vu" WhatsApp
// ═══════════════════════════════════════════════════════════════

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
const CACHE_NAME = 'ge-messenger-v7-notifications';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/d.png',
];

// ── Domaines à NE PAS intercepter ──
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
    return true;
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
  if (event.request.method !== 'GET') return;
  if (shouldBypass(event.request.url)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
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
          return new Response('Hors ligne', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        })
      )
  );
});

// ═══════════════════════════════════════════════════════════════
// GESTION COMPLÈTE DES NOTIFICATIONS FCM
// ═══════════════════════════════════════════════════════════════

// ── Notifications Firebase (app en arrière-plan / fermée) ──
messaging.onBackgroundMessage(payload => {
  console.log('[FCM-SW] Message background:', JSON.stringify(payload));
  
  const data = payload.data || {};
  const type = data.type || 'message';
  
  // Construire la notification selon le type
  const notification = buildNotification(type, payload);
  
  return self.registration.showNotification(notification.title, notification.options);
});

// Fonction pour construire les notifications selon le type
function buildNotification(type, payload) {
  const data = payload.data || {};
  const title = payload.notification?.title || data.title || 'Express Messenger';
  const body = payload.notification?.body || data.body || 'Nouvelle notification';
  const url = data.url || '/';
  
  const baseOptions = {
    icon: '/images/d.png',
    badge: '/images/d.png',
    tag: data.tag || `ge-${type}-${Date.now()}`,
    renotify: true,
    requireInteraction: type === 'call',
    vibrate: getVibrationPattern(type),
    data: { url, type, ...data },
    actions: getActionsForType(type),
    timestamp: Date.now()
  };
  
  switch(type) {
    case 'message':
      return {
        title: `💬 ${title}`,
        options: {
          ...baseOptions,
          body: body,
          image: data.imageUrl || undefined,
          actions: [
            { action: 'reply', title: '✏️ Répondre' },
            { action: 'read', title: '✓ Lu' },
            { action: 'dismiss', title: '✕ Ignorer' }
          ]
        }
      };
      
    case 'post':
      return {
        title: `📰 ${title}`,
        options: {
          ...baseOptions,
          body: body,
          image: data.mediaUrl || undefined,
          actions: [
            { action: 'open', title: '📰 Voir' },
            { action: 'like', title: '❤️ J\'aime' },
            { action: 'dismiss', title: '✕ Ignorer' }
          ]
        }
      };
      
    case 'like':
      return {
        title: `❤️ ${title}`,
        options: {
          ...baseOptions,
          body: body,
          actions: [
            { action: 'open', title: '👁️ Voir' },
            { action: 'dismiss', title: '✕ Ignorer' }
          ]
        }
      };
      
    case 'call':
      return {
        title: `📞 ${title}`,
        options: {
          ...baseOptions,
          body: 'Appel entrant...',
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500, 200, 500],
          actions: [
            { action: 'accept', title: '✅ Répondre' },
            { action: 'decline', title: '❌ Refuser' }
          ]
        }
      };
      
    case 'story':
      return {
        title: `✨ ${title}`,
        options: {
          ...baseOptions,
          body: body,
          image: data.storyUrl || undefined,
          actions: [
            { action: 'view', title: '👁️ Voir' },
            { action: 'reply', title: '💬 Répondre' },
            { action: 'dismiss', title: '✕ Ignorer' }
          ]
        }
      };
      
    default:
      return {
        title: title,
        options: baseOptions
      };
  }
}

function getVibrationPattern(type) {
  switch(type) {
    case 'message': return [150, 80, 150];
    case 'post': return [200, 100];
    case 'like': return [100, 50];
    case 'call': return [500, 200, 500, 200, 500];
    case 'story': return [150, 50, 150];
    default: return [200];
  }
}

function getActionsForType(type) {
  switch(type) {
    case 'message':
      return [
        { action: 'reply', title: '✏️ Répondre' },
        { action: 'read', title: '✓ Lu' },
        { action: 'dismiss', title: '✕ Ignorer' }
      ];
    case 'post':
      return [
        { action: 'open', title: '📰 Voir' },
        { action: 'like', title: '❤️ J\'aime' },
        { action: 'dismiss', title: '✕ Ignorer' }
      ];
    case 'like':
      return [
        { action: 'open', title: '👁️ Voir' },
        { action: 'dismiss', title: '✕ Ignorer' }
      ];
    case 'call':
      return [
        { action: 'accept', title: '✅ Répondre' },
        { action: 'decline', title: '❌ Refuser' }
      ];
    default:
      return [
        { action: 'open', title: '📩 Ouvrir' },
        { action: 'dismiss', title: '✕ Ignorer' }
      ];
  }
}

// ── Push natif (fallback) ──
self.addEventListener('push', event => {
  console.log('[SW] Push natif recu');
  
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (_) {
    data = { title: 'GE Messenger', body: event.data?.text() || 'Nouveau message' };
  }
  
  if (data.from && data.notification) return;
  
  const type = data.type || 'message';
  const notification = buildNotification(type, { data });
  
  event.waitUntil(
    self.registration.showNotification(notification.title, notification.options)
  );
});

// ═══════════════════════════════════════════════════════════════
// GESTION DES CLICS SUR NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  console.log('[SW] Notification cliquee:', action, data);
  
  notification.close();
  
  switch(action) {
    case 'reply':
      event.waitUntil(handleReplyAction(data));
      return;
    case 'read':
      event.waitUntil(handleReadAction(data));
      return;
    case 'like':
      event.waitUntil(handleLikeAction(data));
      return;
    case 'accept':
      event.waitUntil(handleAcceptCall(data));
      return;
    case 'decline':
      event.waitUntil(handleDeclineCall(data));
      return;
    case 'dismiss':
      return;
    case 'view':
    case 'open':
    default:
      event.waitUntil(openApp(data.url || '/', data));
  }
});

async function openApp(url, data = {}) {
  console.log('[SW] Ouverture app:', url);
  
  const targetUrl = new URL(url, self.location.origin).href;
  
  const clientList = await clients.matchAll({ 
    type: 'window', 
    includeUncontrolled: true 
  });
  
  for (const client of clientList) {
    if (client.url.startsWith(self.location.origin) && 'focus' in client) {
      client.postMessage({ 
        type: 'NOTIFICATION_CLICK', 
        url: targetUrl,
        data: data
      });
      return client.focus();
    }
  }
  
  return clients.openWindow(targetUrl);
}

async function handleReplyAction(data) {
  await openApp(data.url || '/', { ...data, focusReply: true });
}

async function handleReadAction(data) {
  // Envoyer un message à la page pour marquer comme lu
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({ 
      type: 'MARK_AS_READ', 
      convId: data.convId,
      messageId: data.messageId
    });
  }
}

async function handleLikeAction(data) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({ 
      type: 'LIKE_POST', 
      postId: data.postId
    });
  }
  await openApp(data.url || '/', data);
}

async function handleAcceptCall(data) {
  await openApp('/?call=accept&from=' + (data.from || ''), data);
}

async function handleDeclineCall(data) {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage({ type: 'DECLINE_CALL', from: data.from });
  }
}

// ═══════════════════════════════════════════════════════════════
// COMMUNICATION AVEC LA PAGE
// ═══════════════════════════════════════════════════════════════

self.addEventListener('message', event => {
  console.log('[SW] Message recu:', event.data);
  
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
  
  if (event.data?.type === 'CLEAR_NOTIFICATIONS') {
    self.registration.getNotifications().then(notifications => {
      notifications.forEach(n => {
        if (event.data.tag && n.tag === event.data.tag) {
          n.close();
        } else if (!event.data.tag) {
          n.close();
        }
      });
    });
  }
});

// ── Background Sync ──
self.addEventListener('sync', event => {
  if (event.tag === 'ge-sync') {
    event.waitUntil(Promise.resolve());
  }
});

// ── Periodic Background Sync (pour notifications en arrière-plan) ──
self.addEventListener('periodicsync', event => {
  if (event.tag === 'ge-notifications') {
    event.waitUntil(checkForNewContent());
  }
});

async function checkForNewContent() {
  console.log('[SW] Checking for new content...');
  // Cette fonction peut être utilisée pour récupérer des notifications
  // depuis le serveur même quand FCM n'est pas disponible
}

console.log('[SW] Service Worker GE Messenger charge - v7 Notifications');
