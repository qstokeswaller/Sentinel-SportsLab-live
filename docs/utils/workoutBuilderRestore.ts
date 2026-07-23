// ── Workouts in-page builder restore ────────────────────────────────────────
// The Programs and Sheets builders open IN PLACE (they hide the shell but don't
// change the URL), so their "is the builder open" state is lost when you navigate
// away (e.g. to Settings) and the page unmounts.
//
// We want returning via genuine back-navigation — Settings → Back is navigate(-1),
// which POPS history back to the SAME React-Router entry, preserving its stable
// `location.key` — to reopen the builder. But a FRESH visit (clicking Workouts in
// the sidebar) mints a NEW `location.key`, so the builder must NOT auto-open then.
// Tagging the persisted state with the key it was open on gives us exactly that.
//
// Only the CREATE (new) builder is persisted. An edit-in-progress isn't, because its
// populated fields (sheet columns, program days) aren't stored — reopening a blank
// shell tagged to an edit would be misleading, so those simply land back on the list.

type RestoreState = { open: true; key: string };

export function shouldRestoreWorkoutBuilder(storageKey: string, locationKey: string): boolean {
    try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return false;
        const s = JSON.parse(raw) as Partial<RestoreState>;
        return s?.open === true && s?.key === locationKey;
    } catch {
        return false;
    }
}

export function persistWorkoutBuilder(storageKey: string, locationKey: string, open: boolean): void {
    try {
        if (open) {
            sessionStorage.setItem(storageKey, JSON.stringify({ open: true, key: locationKey } satisfies RestoreState));
        } else {
            sessionStorage.removeItem(storageKey);
        }
    } catch {
        /* sessionStorage unavailable — restore simply won't happen; not fatal */
    }
}
