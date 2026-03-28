export default async function handler(req, res) {
  // Autoriser les requêtes depuis n'importe quelle origine
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title et body sont requis' });
  }

  const APP_ID  = process.env.ONESIGNAL_APP_ID;
  const API_KEY = process.env.ONESIGNAL_API_KEY;

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${API_KEY}`
      },
      body: JSON.stringify({
        app_id: APP_ID,
        included_segments: ['Total Subscriptions'], // ← envoie à TOUS les abonnés
        headings: { fr: title, en: title },
        contents: { fr: body,  en: body }
      })
    });

    const json = await response.json();

    if (response.ok && json.id) {
      return res.status(200).json({ success: true, id: json.id, recipients: json.recipients });
    } else {
      return res.status(400).json({ success: false, error: json.errors || json });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
