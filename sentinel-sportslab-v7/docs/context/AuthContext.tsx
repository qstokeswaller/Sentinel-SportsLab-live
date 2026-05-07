import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsPasswordUpdate: boolean;
  clearPasswordUpdate: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  needsPasswordUpdate: false,
  clearPasswordUpdate: () => { },
  signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordUpdate, setNeedsPasswordUpdate] = useState(false);

  const clearPasswordUpdate = () => setNeedsPasswordUpdate(false);

  useEffect(() => {
    // Fallback: detect recovery token in URL hash in case the event fires before
    // the listener is registered or the page is refreshed mid-flow.
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setNeedsPasswordUpdate(true);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Always try to refresh first — this catches stale refresh tokens that
        // getSession() can't detect (the local JWT looks valid but the server rejects it)
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session) {
          // Refresh failed — session is truly dead. Clear everything so user gets redirected to login.
          console.warn('Session refresh failed — signing out:', refreshError?.message);
          await supabase.auth.signOut({ scope: 'local' });
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        // Refresh succeeded — use the fresh session
        setSession(refreshed.session);
        setUser(refreshed.session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordUpdate(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Use 'local' scope so even if the server request fails (network issue),
    // the local session is still cleared and the user is signed out.
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
    setUser(null);
    setNeedsPasswordUpdate(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, needsPasswordUpdate, clearPasswordUpdate, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
