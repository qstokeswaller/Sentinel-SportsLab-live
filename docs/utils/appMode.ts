// Installed-app detection. True when running as the installed PWA (standalone
// window from desktop/Android install, or iOS Add to Home Screen) rather than
// in a normal browser tab. The installed app must never show the marketing
// landing page — it routes straight to sign-in / the dashboard.
export const isInstalledApp = (): boolean => {
    try {
        return (
            window.matchMedia?.('(display-mode: standalone)').matches ||
            window.matchMedia?.('(display-mode: window-controls-overlay)').matches ||
            (navigator as any).standalone === true
        );
    } catch {
        return false;
    }
};
