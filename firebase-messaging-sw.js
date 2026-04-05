// firebase-messaging-sw.js — requis par Firebase Cloud Messaging
// DOIT être à la racine du domaine

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
  const notifTitle = title || 'Express Messenger';
  const notifBody  = body  || 'Nouveau message';

  return self.registration.showNotification(notifTitle, {
    body: notifBody,
    icon: '/images/d.png',
    badge: '/images/d.png',
    tag: 'ge-bg-msg',
    renotify: true,
    vibrate: [150, 80, 150],
    data: payload.data || {}
  });
});
