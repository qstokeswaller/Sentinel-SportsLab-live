import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

/**
 * useState that persists to sessionStorage, so a page's "where you were" survives
 * navigating away (e.g. to Settings) and back — and resuming within the same tab
 * session. Session-scoped: a fresh browser session starts clean.
 *
 * Use a unique, page-scoped `key` (e.g. 'ssl_roster_team'). Serialisable values only.
 * For id-based state that can go stale (a deleted team/athlete), still validate the
 * restored value in the page (fall back to the landing view) — this hook only
 * handles persistence, not existence.
 */
export function useRestorableState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
    const [val, setVal] = useState<T>(() => {
        try {
            const s = sessionStorage.getItem(key);
            return s !== null ? (JSON.parse(s) as T) : initial;
        } catch {
            return initial;
        }
    });

    useEffect(() => {
        try {
            sessionStorage.setItem(key, JSON.stringify(val));
        } catch {
            /* quota exceeded / private mode — persistence is best-effort */
        }
    }, [key, val]);

    return [val, setVal];
}

export default useRestorableState;
