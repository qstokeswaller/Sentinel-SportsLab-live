// @ts-nocheck
/**
 * useForceLightMode — guarantees a page renders in light mode regardless
 * of the visitor's browser/app theme state.
 *
 * Why: public share + form pages (daily/weekly wellness, injury, workout,
 * protocol, data hub, athlete share) must always be readable on first
 * visit. Tailwind's dark variants activate when the `dark` class is
 * present on <html>, which the main app sets/clears based on the
 * authenticated user's theme preference. When a visitor opens a public
 * link in the same browser session, the `dark` class can still be on
 * <html>, leaking dark-mode styling onto a page that has no theme
 * toggle of its own.
 *
 * On mount: strip the `dark` class, remember whether it was there.
 * On unmount: restore it so the main app's theme isn't permanently
 * affected if the user navigates back into the authenticated app.
 */

import { useEffect } from 'react';

export function useForceLightMode() {
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const html = document.documentElement;
        const wasDark = html.classList.contains('dark');
        if (wasDark) html.classList.remove('dark');
        return () => {
            if (wasDark) html.classList.add('dark');
        };
    }, []);
}

export default useForceLightMode;
