import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/**
 * Session-less anon client for PUBLIC form routes (wellness, injury, share pages).
 *
 * Why this exists — the demo bug:
 * Public forms are opened by athletes who have NO account. The link is a stable
 * per-team permalink used by everyone, forever. Submissions must always work with
 * the anon key. The problem was that the app's MAIN client persists the last
 * coach's login in localStorage and auto-attaches that JWT to every request. On a
 * device carrying a *stale* coach session (a shared/demo device, or a login that
 * expired), the form's load + submit went out with a dead token → the API gateway
 * rejected it (401) before RLS even ran → "can't fill in the form". It worked on
 * the coach's own PC only because their session was still fresh.
 *
 * This client is configured to NEVER read or write the shared auth session:
 *   - persistSession: false      → ignores whatever is in localStorage
 *   - autoRefreshToken: false    → no token machinery
 *   - detectSessionInUrl: false  → won't consume auth params
 *   - storageKey                 → isolated so it can't collide with the main
 *                                  GoTrue client instance
 *
 * Result: public-form DB calls ALWAYS use the raw anon key, completely independent
 * of any session state on the device. No race between "clear the stale session"
 * and "load the form", and a coach previewing the link is NOT logged out of their
 * dashboard (the main client is untouched). RLS explicitly allows the anon role to
 * run the form's SECURITY DEFINER RPCs and to insert wellness/injury rows.
 */
export const supabasePublic = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-public-noauth',
    lock: async <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>) => fn(),
  },
});
