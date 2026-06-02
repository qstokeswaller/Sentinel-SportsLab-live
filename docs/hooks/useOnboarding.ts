// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const LOCAL_KEY = (userId: string) => `sl_onboarded_${userId}`;

/**
 * Server-side gate for the L1 first-login welcome tour.
 *
 * Single source of truth = user_profiles.onboarding_completed_at. We optimistically
 * mirror the result into localStorage (keyed by user id) to suppress the tour on
 * subsequent loads before the server query returns. The localStorage cache only
 * ever suppresses — never fires — so clearing it can briefly re-show the tour
 * but never gate a returning user out.
 */
export function useOnboarding() {
    const { user } = useAuth();
    const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
    const [loaded, setLoaded] = useState<boolean>(false);

    useEffect(() => {
        if (!user?.id) { setLoaded(true); return; }

        let cancelled = false;

        try {
            const cached = localStorage.getItem(LOCAL_KEY(user.id));
            if (cached === '1') {
                setNeedsOnboarding(false);
                setLoaded(true);
                return;
            }
        } catch {}

        (async () => {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('onboarding_completed_at')
                .eq('id', user.id)
                .maybeSingle();
            if (cancelled) return;
            if (error) { setNeedsOnboarding(false); setLoaded(true); return; }
            const done = !!data?.onboarding_completed_at;
            setNeedsOnboarding(!done);
            if (done) {
                try { localStorage.setItem(LOCAL_KEY(user.id), '1'); } catch {}
            }
            setLoaded(true);
        })();

        return () => { cancelled = true; };
    }, [user?.id]);

    const completeOnboarding = useCallback(async () => {
        if (!user?.id) return;
        setNeedsOnboarding(false);
        try { localStorage.setItem(LOCAL_KEY(user.id), '1'); } catch {}
        const now = new Date().toISOString();
        // Upsert handles users without an existing user_profiles row (real-world
        // case for users created before this column existed and never had a
        // profile row inserted by handle_new_user_signup).
        const { error } = await supabase
            .from('user_profiles')
            .upsert({ id: user.id, onboarding_completed_at: now }, { onConflict: 'id' });
        if (error) console.warn('[onboarding] complete failed:', error.message);
    }, [user?.id]);

    const replayOnboarding = useCallback(async () => {
        if (!user?.id) return;
        try { localStorage.removeItem(LOCAL_KEY(user.id)); } catch {}
        const { error } = await supabase
            .from('user_profiles')
            .upsert({ id: user.id, onboarding_completed_at: null }, { onConflict: 'id' });
        if (error) {
            console.warn('[onboarding] replay reset failed:', error.message);
            return;
        }
        setNeedsOnboarding(true);
        try { window.dispatchEvent(new CustomEvent('sentinel:replay-onboarding')); } catch {}
    }, [user?.id]);

    return { needsOnboarding, onboardingLoaded: loaded, completeOnboarding, replayOnboarding };
}
