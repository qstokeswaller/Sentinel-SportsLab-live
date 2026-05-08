/**
 * Vercel Serverless Function — Polar OAuth Token Exchange
 *
 * POST /api/polar-token
 * Body: { code: string, redirect_uri: string }
 *
 * Exchanges an authorization code for a Polar AccessLink access token.
 * The client_secret is kept server-side and never exposed to the browser.
 *
 * Also registers the user with Polar AccessLink (required on first connect).
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, redirect_uri } = req.body;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing code or redirect_uri' });
  }

  const CLIENT_ID = process.env.POLAR_CLIENT_ID;
  const CLIENT_SECRET = process.env.POLAR_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Polar credentials not configured on server' });
  }

  try {
    // Step 1: Exchange code for access token
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://polarremote.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Polar token exchange failed:', err);
      return res.status(400).json({ error: 'Token exchange failed', detail: err });
    }

    const tokenData = await tokenRes.json();
    // tokenData: { access_token, token_type, x_user_id }

    // Step 2: Register user with AccessLink (required before any data access)
    // This is idempotent — if already registered, returns 409 which we treat as success
    const registerRes = await fetch('https://www.polaraccesslink.com/v3/users', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 'member-id': String(tokenData.x_user_id) }),
    });

    // 200 = newly registered, 409 = already registered — both are fine
    if (!registerRes.ok && registerRes.status !== 409) {
      console.warn('Polar user registration warning:', registerRes.status);
      // Non-fatal — continue anyway, data pull may still work
    }

    return res.status(200).json({
      access_token: tokenData.access_token,
      polar_user_id: tokenData.x_user_id,
    });

  } catch (err) {
    console.error('Polar token handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
