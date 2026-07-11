import { supabase } from '../lib/supabase';

/**
 * Public form session guard.
 *
 * Public form routes (daily/weekly wellness, injury) are meant to be filled in
 * anonymously by athletes who have NO account — submissions go through the
 * shared Supabase client using the anon key, and RLS explicitly allows anon
 * inserts into wellness_responses / injury tables.
 *
 * The hazard: if the visitor's browser has a coach session left in localStorage
 * (e.g. a shared demo device, or the coach previewing the link), the client
 * attaches that JWT to the submit request. If the access token is EXPIRED and
 * its refresh token is also dead, the request goes out with a stale JWT and the
 * server returns 401 — the athlete "can't submit the form".
 *
 * This is exactly the bug that hit the demo: it worked on the coach's own PC
 * (valid, active session) but failed on a device carrying a stale session.
 *
 * The fix: on public form mount, clear ONLY an expired session. We intentionally
 * keep a still-valid session so a logged-in coach previewing the form doesn't get
 * silently signed out of their dashboard in another tab. `scope: 'local'` never
 * hits the auth server — it just drops the local session so the next request
 * falls back to the anon key (which these forms fully support).
 *
 * NOTE: the previous inline version had the condition inverted
 * (`if (!data.session) signOut()` — a no-op), which is why the guard never
 * actually cleared the stale session. Centralised here so all 4 forms share one
 * correct implementation and can't drift again.
 */
export async function clearStalePublicFormSession(): Promise<void> {
    try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) return; // no session → anon key already in use → nothing to do

        // expires_at is a Unix timestamp (seconds) for the ACCESS token. If it's in
        // the past the token is stale; clear it so submit falls back to the anon key.
        // A small 60s skew guards against clock drift making a fresh token look expired.
        const expiresAtMs = (session.expires_at ?? 0) * 1000;
        const isExpired = expiresAtMs > 0 && expiresAtMs < Date.now() - 60_000;
        if (isExpired) {
            await supabase.auth.signOut({ scope: 'local' });
        }
    } catch {
        // Never let the guard throw — a failure here must not block the form.
    }
}
