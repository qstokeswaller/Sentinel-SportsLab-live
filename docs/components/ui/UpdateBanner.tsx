import React, { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { RefreshCwIcon, XIcon } from 'lucide-react';
import { isInstalledApp } from '../../utils/appMode';

/**
 * UpdateBanner — new-version handling, split by surface:
 *
 *  • Installed app (PWA)  → shows a non-blocking "Update available" toast so the
 *    user chooses when to refresh (app-like behaviour; per VERSION-DETECTION
 *    mechanism B). Never uses window.confirm (house rule).
 *  • Website (browser tab) → NO toast. The new version is applied silently the
 *    next time the tab is backgrounded, so the site "just updates" as people
 *    use it, without ever interrupting an active session. A website shouldn't
 *    nag about refreshing.
 *
 * Rendered at the app root, outside all providers, so it works even if the app
 * state crashes.
 */
export const UpdateBanner: React.FC = () => {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [doUpdate, setDoUpdate] = useState<(() => void) | null>(null);

    useEffect(() => {
        // registerSW is a no-op-safe call; in dev (no SW) nothing happens.
        const updateSW = registerSW({
            onNeedRefresh() {
                if (isInstalledApp()) {
                    // App: let the user pick the moment via the toast.
                    setNeedRefresh(true);
                    return;
                }
                // Website: update silently. Apply the new version the next time
                // the tab is hidden (they switched away / navigated) so the
                // reload is invisible and never interrupts what they're doing.
                const applyWhenHidden = () => {
                    if (document.visibilityState === 'hidden') {
                        document.removeEventListener('visibilitychange', applyWhenHidden);
                        updateSW(true); // skipWaiting + reload
                    }
                };
                if (document.visibilityState === 'hidden') {
                    updateSW(true);
                } else {
                    document.addEventListener('visibilitychange', applyWhenHidden);
                }
            },
        });
        setDoUpdate(() => () => updateSW(true));
    }, []);

    // Toast only ever renders in the installed app.
    if (!needRefresh || dismissed || !isInstalledApp()) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[1200] max-w-sm bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="w-8 h-8 bg-indigo-500/15 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                <RefreshCwIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Update available</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5 mb-2.5">A new version of Sentinel SportsLab is ready.</p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => doUpdate?.()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                        Refresh now
                    </button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors"
                    >
                        Later
                    </button>
                </div>
            </div>
            <button
                aria-label="Dismiss"
                onClick={() => setDismissed(true)}
                className="p-1 -m-1 text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#CBD5E1] transition-colors shrink-0"
            >
                <XIcon className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};
