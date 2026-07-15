import React, { Component, ErrorInfo, ReactNode } from "react";
import { isStaleAssetError, recoverFromStaleAssets, hardReset } from "../utils/pwaRecovery";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    isStale: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        isStale: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, isStale: isStaleAssetError(error) };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        // A stale-asset crash (installed app pointing at replaced files after a
        // deploy) self-heals: clear caches + service worker + reload once.
        if (isStaleAssetError(error)) recoverFromStaleAssets();
    }

    public render() {
        if (this.state.hasError) {
            // ── Stale-version case: we're already auto-recovering. Show a calm
            //    "updating" screen instead of a scary crash. ─────────────────
            if (this.state.isStale) {
                return (
                    <div className="min-h-screen bg-slate-50 dark:bg-[#0D1829] flex items-center justify-center p-8">
                        <div className="text-center max-w-sm">
                            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                            <h1 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0] mb-2">Updating to the latest version</h1>
                            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-6">
                                A newer version of Sentinel SportsLab is available. We're refreshing it for you now — this only takes a moment.
                            </p>
                            <button
                                onClick={() => hardReset()}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
                            >
                                Taking too long? Tap to refresh
                            </button>
                        </div>
                    </div>
                );
            }

            // ── Genuine unexpected error ─────────────────────────────────────
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-[#0D1829] flex items-center justify-center p-6">
                    <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-xl border border-slate-200 dark:border-[#243A58] p-8 sm:p-10 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/25 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-6">
                            <span className="text-3xl font-black">!</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0] mb-2">Something went wrong</h1>
                        <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-6">
                            Sentinel SportsLab hit an unexpected error and couldn't finish loading. Refreshing usually clears it — if it keeps happening, email <a href="mailto:support@sentinelsportslab.com" className="text-indigo-600 dark:text-indigo-300 font-semibold hover:underline">support@sentinelsportslab.com</a> and we'll take a look.
                        </p>
                        <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl p-4 text-left mb-6 overflow-auto max-h-40 border border-slate-100 dark:border-[#243A58]">
                            <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 break-all">
                                {this.state.error?.toString()}
                            </p>
                        </div>
                        <button
                            onClick={() => hardReset()}
                            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors"
                        >
                            Refresh &amp; try again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
