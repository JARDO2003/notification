const admin = require('firebase-admin');

// ═══════════════════════════════════════════════════════════════
// GE MESSENGER - NOTIFICATION SERVER
// Envoie des notifications push FCM aux utilisateurs
// ═══════════════════════════════════════════════════════════════

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: "data-com-a94a8",
      private_key_id: "973bccf7f89a8cf770081af02ec0f5ff1adf24e7",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCykPXvfVaB4ZEE\nY+Mv11RdmoBDkShM/7FGz6Nr7n4xFbQIWu4geRDndGOoxLX1/jN44bSz0r8ypXg9\naNMwlfDC5eF/pof2WANxcxuUIGQ2Ja97R4tKRM7seM15aciVH4aujas4Pe2P2Qc6\nCl9+JBR1uzPrBmWhGzKZd6XBHhH7Ex2sZPDGOcHwVVy3S0COMxKY6L2+/izLAOYb\n0RJ6yg7aBGd1Fu9zsTV6rlKoSdexvbPSHhvVyncM9hIRLswXPs17NBXnegjm3CeN\n2C1mP+v1Bqbt2cl2RU0uPQh/71ejLnRvBv8rnGSjeaNXpoZc2ZU8rZDYe0uGS1lI\ndFEQDs19AgMBAAECggEAAVhnLpaebi7iHlFEug/J0W5lexalH/CMIOfiH58QnK5q\nKZy6BtlY2Yfjpc/ITW5txsBCpFlJmGtc02dseEtJrTlT/ug5sRNMAKJo0HGkSfaI\nwTsh54GVPVN3ekJ0j1YHKcl5GdBkNbD+Xi/RuSsJrcdk+wxvVoRxYBojx6utgSnr\nKqh3aSPVPYoXcSMyUirLWblRIAL+O6eC/NBkfbde7VJaAN59PYTi8HNQDqruKNH+\n9wWM0d+zNFy9A/GmqUlyo2J9H6fERQ0m3Zua2s/LhwFp7tg2c8wLBRXknAApFNIU\nOG5DiNpG+r9Pyx822Ml+DhkApbDhtIesjFSe9zN4uwKBgQDoWVestOxcI6UvDUcu\nP0f7GV00jC7COU02CSi75QNSnQOR4ZtR3CABcr8OzQ1U+DFABfGy8lEgeG/aHk4z\nb6/YpH5tv5FuucaA1beNXZW7EF8DffgAA0brI3oN0EnXMJSAO4povuRNFNDzspKV\nwg8Oyp5xny18EZ9TUgrZz62jiwKBgQDEvh9m4CFSlxrkncj6lFEwMyjA1LAhgVGD\nohX0PHyWGQAlsxJb7x+SFaKvnemaU9jyR2uFDzDlOEYvCCYVfxYKZFh8gSBCg8kR\nrJ6GT/X0ZvbQCKwWkBBhxlF5kPvNOY/BaS6M5eNr3Ps1+NUSAxIbJnlw1UhFDXu5\nF6pY3NLUFwKBgQDMa0Y6uZa13dqHkfwNETnIDmG1SJwe3wEySE6hOPR6a4/negEH\nvU4fWBAF+pv/JLlX5aLnWE/N7Igj88PDd0DTrq1Y61ENhL7DPMRXyH1ibh3Z2asm\nf7uWRsksfBNrEt+kDj5Qt5nuwyCvN23F+kz7K4LI3k3LOUneqXDIfvH6zwKBgCLw\nvPTxQxm+2jjVyNavtod/3nH4k9svc0GUbJ+2ik3B3OPVHKKVIh84lm7n9Y/B6lqE\n0pSL8RwUVWqO4OyaaFiqH4jlCcymSPRJmtGxq7We/6BMmftb1Hz40olrdTyqR1yL\nCIhfX3dNhJO+QGD1iKanu5ONXUteLKXfjRJBDXQ7AoGAICO0j6eO+d16NOln5mO+\nAGDaXKaXJ02VYvn+U4kQwAIoDmY85MCjfkzWFCwrQ1qruoIACyGJg1pGC+FozWx/\nbJJnnpV0URYifeyKRrtAIK1GJ5c1+uPUNszvFYXeN0gU+qikbaDr3XhRkH+LKnEy\n1RuvR30MwZN20EjkfllQ51Q=\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@data-com-a94a8.iam.gserviceaccount.com",
      client_id: "101594480167817977368",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
    }),
    databaseURL: "https://data-com-a94a8-default-rtdb.firebaseio.com",
  });
}

const messaging = admin.messaging();

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE - Endpoint API
// ═══════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tokens, title, body, data, type = 'message' } = req.body;

  if (!tokens?.length || !title || !body) {
    return res.status(400).json({ error: 'Champs requis : tokens[], title, body' });
  }

  const db = admin.database();

  // Construire le message selon le type
  const message = buildMessage(type, tokens, title, body, data);

  try {
    const result = await messaging.sendEachForMulticast(message);

    // Supprimer les tokens invalides
    const invalidTokens = [];
    result.responses.forEach((r, i) => {
      if (!r.success && (
        r.error?.code === 'messaging/registration-token-not-registered' ||
        r.error?.code === 'messaging/invalid-registration-token'
      )) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (invalidTokens.length) {
      const snapshot = await db.ref('ge_members').once('value');
      const all = snapshot.val() || {};
      for (const [key, val] of Object.entries(all)) {
        if (invalidTokens.includes(val.fcmToken)) {
          await db.ref(`ge_members/${key}/fcmToken`).remove();
        }
      }
    }

    res.json({
      success: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
      invalidTokens: invalidTokens.length
    });
  } catch (err) {
    console.error('[FCM Error]', err);
    res.status(500).json({ error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// CONSTRUCTEUR DE MESSAGES PAR TYPE
// ═══════════════════════════════════════════════════════════════
function buildMessage(type, tokens, title, body, data = {}) {
  const baseMessage = {
    tokens,
    notification: { title, body },
    data: {
      type,
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    android: {
      notification: {
        channelId: `ge-${type}`,
        priority: 'high',
        defaultSound: true,
        defaultVibrateTimings: true
      }
    },
    apns: {
      payload: {
        aps: {
          alert: { title, body },
          badge: 1,
          sound: 'default'
        }
      }
    }
  };

  switch (type) {
    case 'message':
      return {
        ...baseMessage,
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title: `💬 ${title}`,
            body,
            icon: '/images/d.png',
            badge: '/images/d.png',
            tag: `ge-msg-${data.convId || 'unknown'}`,
            requireInteraction: false,
            vibrate: [150, 80, 150],
            actions: [
              { action: 'reply', title: '✏️ Répondre' },
              { action: 'read', title: '✓ Lu' },
              { action: 'dismiss', title: '✕ Ignorer' }
            ]
          },
          fcmOptions: { link: data?.url || '/' }
        }
      };

    case 'post':
      return {
        ...baseMessage,
        webpush: {
          headers: { Urgency: 'normal' },
          notification: {
            title: `📰 ${title}`,
            body,
            icon: '/images/d.png',
            badge: '/images/d.png',
            tag: 'ge-post',
            requireInteraction: false,
            vibrate: [200, 100],
            image: data.mediaUrl || undefined,
            actions: [
              { action: 'open', title: '📰 Voir' },
              { action: 'like', title: '❤️ J\'aime' },
              { action: 'dismiss', title: '✕ Ignorer' }
            ]
          },
          fcmOptions: { link: '/?tab=feed' }
        }
      };

    case 'like':
      return {
        ...baseMessage,
        webpush: {
          headers: { Urgency: 'normal' },
          notification: {
            title: `❤️ ${title}`,
            body,
            icon: '/images/d.png',
            badge: '/images/d.png',
            tag: 'ge-like',
            requireInteraction: false,
            vibrate: [100, 50],
            actions: [
              { action: 'open', title: '👁️ Voir' },
              { action: 'dismiss', title: '✕ Ignorer' }
            ]
          },
          fcmOptions: { link: '/?tab=feed' }
        }
      };

    case 'call':
      return {
        ...baseMessage,
        webpush: {
          headers: { Urgency: 'high' },
          notification: {
            title: `📞 ${title}`,
            body: 'Appel entrant...',
            icon: '/images/d.png',
            badge: '/images/d.png',
            tag: 'ge-call',
            requireInteraction: true,
            vibrate: [500, 200, 500, 200, 500],
            actions: [
              { action: 'accept', title: '✅ Répondre' },
              { action: 'decline', title: '❌ Refuser' }
            ]
          },
          fcmOptions: { link: '/?call=accept' }
        }
      };

    case 'story':
      return {
        ...baseMessage,
        webpush: {
          headers: { Urgency: 'normal' },
          notification: {
            title: `✨ ${title}`,
            body,
            icon: '/images/d.png',
            badge: '/images/d.png',
            tag: 'ge-story',
            requireInteraction: false,
            vibrate: [150, 50, 150],
            image: data.storyUrl || undefined,
            actions: [
              { action: 'view', title: '👁️ Voir' },
              { action: 'reply', title: '💬 Répondre' },
              { action: 'dismiss', title: '✕ Ignorer' }
            ]
          },
          fcmOptions: { link: '/?tab=home' }
        }
      };

    default:
      return {
        ...baseMessage,
        webpush: {
          headers: { Urgency: 'normal' },
          notification: {
            title,
            body,
            icon: '/images/d.png',
            badge: '/images/d.png'
          },
          fcmOptions: { link: data?.url || '/' }
        }
      };
  }
}

// ═══════════════════════════════════════════════════════════════
// FONCTION AUXILIAIRE - Envoi a un utilisateur specifique
// ═══════════════════════════════════════════════════════════════
async function sendToUser(uid, title, body, data = {}, type = 'message') {
  try {
    const db = admin.database();
    const userSnap = await db.ref(`ge_members/${uid}`).once('value');
    const userData = userSnap.val();
    
    if (!userData?.fcmToken) {
      console.log(`[FCM] No token for user ${uid}`);
      return { success: false, error: 'No FCM token' };
    }

    const message = buildMessage(type, [userData.fcmToken], title, body, data);
    delete message.tokens;
    message.token = userData.fcmToken;

    const result = await messaging.send(message);
    return { success: true, messageId: result };
  } catch (err) {
    console.error(`[FCM] Error sending to ${uid}:`, err);
    return { success: false, error: err.message };
  }
}

// Export pour utilisation externe
module.exports.sendToUser = sendToUser;
