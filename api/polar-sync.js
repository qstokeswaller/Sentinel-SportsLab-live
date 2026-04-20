/**
 * Vercel Serverless Function — Polar Exercises Sync
 *
 * POST /api/polar-sync
 * Body: { access_token: string }
 *
 * Fetches the last 30 days of exercises from Polar AccessLink API server-side,
 * avoiding CORS issues with direct browser requests to Polar's API.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { access_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'Missing access_token' });
  }

  try {
    const polarRes = await fetch('https://www.polaraccesslink.com/v3/exercises', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
      },
    });

    // 204 = no content (no exercises), treat as empty
    if (polarRes.status === 204) {
      return res.status(200).json({ exercises: [] });
    }

    if (polarRes.status === 401) {
      return res.status(401).json({ error: 'Polar token expired or invalid — please reconnect in Settings.' });
    }

    if (!polarRes.ok) {
      const errText = await polarRes.text();
      console.error('Polar exercises error:', polarRes.status, errText);
      return res.status(400).json({ error: `Polar API error ${polarRes.status}` });
    }

    const data = await polarRes.json();
    const exercises = Array.isArray(data) ? data : (data?.data ?? []);

    return res.status(200).json({ exercises });

  } catch (err) {
    console.error('Polar sync handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
