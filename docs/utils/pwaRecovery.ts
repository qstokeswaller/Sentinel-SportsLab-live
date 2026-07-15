// Self-heal for installed PWAs after a deploy.
//
// When an installed app (or a tab with a stale service worker) still references
// hashed asset files that a newer deploy has replaced, the request 404s and the
// server returns index.html (text/html) in its place. The browser then refuses
// to execute HTML as a JavaScript module — surfacing as
// "TypeError: 'text/html' is not a valid JavaScript MIME type" or
// "Failed to fetch dynamically imported module".
//
// We detect that specific failure and, once per session, wipe all caches +
// unregister the service worker + reload so the app fetches the CURRENT assets.
// Guarded against reload loops: if it crashes again after recovery, we stop and
// let the crash screen show (which also offers a manual reset).

const LOOP_GUARD = 'ssl_pwa_recovering';

/** Does this error look like a stale-asset / bad-MIME module failure? */
export function isStaleAssetError(err: unknown): boolean {
    const msg =
        err && typeof err === 'object' && 'message' in err
            ? String((err as any).message)
            : String(err ?? '');
    return /valid JavaScript MIME type|text\/html|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);
}

async function wipeCachesAndSW(): Promise<void> {
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
        }
    } catch { /* ignore */ }
    try {
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map((r) => r.unregister()));
        }
    } catch { /* ignore */ }
}

/** Auto-recovery for a detected stale-asset error. Runs at most once per session. */
export async function recoverFromStaleAssets(): Promise<void> {
    try {
        if (sessionStorage.getItem(LOOP_GUARD)) return; // already tried — don't loop
        sessionStorage.setItem(LOOP_GUARD, '1');
    } catch { /* sessionStorage unavailable — still attempt one recovery */ }
    await wipeCachesAndSW();
    window.location.reload();
}

/** Manual full reset — used by the crash screen's reload button. Always runs. */
export async function hardReset(): Promise<void> {
    await wipeCachesAndSW();
    try { sessionStorage.removeItem(LOOP_GUARD); } catch { /* ignore */ }
    // Cache-busting param guarantees the document itself is refetched fresh.
    const url = new URL(window.location.href);
    url.searchParams.set('_r', Date.now().toString(36));
    window.location.replace(url.toString());
}

/** Clear the loop guard once the app has booted successfully. */
export function clearRecoveryGuardOnLoad(): void {
    window.addEventListener('load', () => {
        window.setTimeout(() => {
            try { sessionStorage.removeItem(LOOP_GUARD); } catch { /* ignore */ }
        }, 5000);
    });
}
