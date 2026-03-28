// CONFIG FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCPGgtXoDUycykLaTSee0S0yY0tkeJpqKI",
  authDomain: "data-com-a94a8.firebaseapp.com",
  databaseURL: "https://data-com-a94a8-default-rtdb.firebaseio.com",
  projectId: "data-com-a94a8",
  storageBucket: "data-com-a94a8.firebasestorage.app",
  messagingSenderId: "276904640935",
  appId: "1:276904640935:web:9cd805aeba6c34c767f682",
  measurementId: "G-FYQCWY5G4S"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

async function init() {
  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const token = await messaging.getToken({
        vapidKey: "BLrbso554YWcAd7-QPbzRFMUpJ9obsdJitRiFtzr-VU4GArr8ariq1l9klHxFUjSzASpkoelaTDAzcvI7UIWLZ8"
      });

      console.log("TOKEN:", token);
      document.getElementById("token").innerText = token;
    }
  } catch (error) {
    console.error(error);
  }
}

// Réception en foreground
messaging.onMessage((payload) => {
  console.log("Message reçu :", payload);

  new Notification(payload.notification.title, {
    body: payload.notification.body
  });
});
