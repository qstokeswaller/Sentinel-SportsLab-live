/**
 * Vercel Serverless Function — Polar OAuth Token Exchange
 *
 * POST /api/polar-token
 * Body: { code: string, redirect_uri: string, type: 'team_pro' | 'individual' }
 *
 * Team Pro uses auth.polar.com for token exchange (no AccessLink registration needed).
 * Individual uses polarremote.com and requires AccessLink user registration.
 *
 * Returns: { access_token, refresh_token, expires_at, polar_user_id }
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, redirect_uri, type = 'team_pro' } = req.body;

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing code or redirect_uri' });
  }

  const CLIENT_ID = process.env.POLAR_CLIENT_ID;
  const CLIENT_SECRET = process.env.POLAR_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Polar credentials not configured on server' });
  }

  try {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    // Team Pro uses auth.polar.com; individual AccessLink uses polarremote.com
    const tokenUrl = type === 'team_pro'
      ? 'https://auth.polar.com/oauth/token'
      : 'https://polarremote.com/v2/oauth2/token';

    const tokenRes = await fetch(tokenUrl, {
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
    // Team Pro response: { access_token, token_type, refresh_token, expires_in, scope, jti }
    // AccessLink response: { access_token, token_type, x_user_id }

    // AccessLink requires user registration before any data access.
    // Team Pro does not — skip registration for team_pro connections.
    if (type === 'individual') {
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
      }
    }

    // Calculate absolute expiry time from expires_in seconds (Team Pro tokens expire in ~12 hours)
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    return res.status(200).json({
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at:    expiresAt,
      polar_user_id: tokenData.x_user_id ?? null, // only present for AccessLink (individual)
    });

  } catch (err) {
    console.error('Polar token handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
