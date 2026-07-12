import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAppState } from '../../context/AppStateContext';
import { useOnboarding } from '../../hooks/useOnboarding';

const STYLE_TAG_ID = 'sentinel-tour-styles';

// One-time injection of design-system-aligned styling for every driver.js popover
// in the app (L1 first-login tour AND L2 page tours). Keeps a single source of
// truth for tour visuals so both layers feel like the rest of the platform.
export function injectTourStyles() {
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = `
        .driver-popover {
            background: white !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 14px !important;
            box-shadow: 0 24px 48px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(15, 23, 42, 0.05) !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            padding: 0 !important;
            overflow: hidden !important;
            max-width: 400px !important;
        }
        .dark .driver-popover {
            background: #132338 !important;
            border-color: #243A58 !important;
            color: #E2E8F0 !important;
        }
        /* Banner-style title — indigo gradient strip with platform logo. */
        .driver-popover-title {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            background: linear-gradient(135deg, #4338ca 0%, #6366f1 55%, #818cf8 100%) !important;
            color: white !important;
            font-size: 13.5px !important;
            font-weight: 700 !important;
            letter-spacing: 0.005em !important;
            margin: 0 !important;
            padding: 12px 18px !important;
            border-bottom: 1px solid rgba(67, 56, 202, 0.45) !important;
            text-shadow: 0 1px 1px rgba(0, 0, 0, 0.12) !important;
        }
        /* Inline SVG mark — Lucide "activity" pulse, rendered crisply white at any
           DPI. Avoids the fuzziness of squashing the full-colour PNG logo to 18px
           with a CSS filter. */
        .driver-popover-title::before {
            content: '' !important;
            display: inline-block !important;
            width: 18px !important;
            height: 18px !important;
            background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.68 3.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4.44 13H2'/%3E%3C/svg%3E") !important;
            background-size: contain !important;
            background-repeat: no-repeat !important;
            background-position: center !important;
            opacity: 0.95 !important;
            flex-shrink: 0 !important;
        }
        .dark .driver-popover-title {
            background: linear-gradient(135deg, #312e81 0%, #4338ca 55%, #6366f1 100%) !important;
            border-bottom-color: rgba(99, 102, 241, 0.35) !important;
        }
        .driver-popover-description {
            font-size: 13.5px !important;
            line-height: 1.6 !important;
            color: #334155 !important;
            margin: 0 !important;
            padding: 14px 18px 4px !important;
        }
        .dark .driver-popover-description { color: #CBD5E1 !important; }
        .driver-popover-footer {
            margin: 0 !important;
            padding: 8px 18px 14px !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
        }
        .driver-popover-progress-text {
            font-size: 10.5px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            color: #94a3b8 !important;
        }
        .dark .driver-popover-progress-text { color: #64748B !important; }
        .driver-popover-navigation-btns {
            display: flex !important;
            gap: 6px !important;
            margin-left: auto !important;
        }
        .driver-popover-prev-btn, .driver-popover-next-btn {
            background: white !important;
            border: 1.5px solid #e2e8f0 !important;
            color: #475569 !important;
            border-radius: 8px !important;
            padding: 6px 14px !important;
            font-size: 12.5px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.15s !important;
            text-shadow: none !important;
        }
        .driver-popover-prev-btn:hover {
            background: #f8fafc !important;
            border-color: #cbd5e1 !important;
            color: #1e293b !important;
        }
        .driver-popover-next-btn {
            background: #4f46e5 !important;
            border-color: #4f46e5 !important;
            color: white !important;
        }
        .driver-popover-next-btn:hover {
            background: #4338ca !important;
            border-color: #4338ca !important;
        }
        .dark .driver-popover-prev-btn {
            background: #1A2D48 !important;
            border-color: #243A58 !important;
            color: #CBD5E1 !important;
        }
        .dark .driver-popover-prev-btn:hover {
            background: #243A58 !important;
            color: #E2E8F0 !important;
        }
        .driver-popover-close-btn { display: none !important; }
        .driver-overlay { fill: rgba(15, 23, 42, 0.65) !important; }
        .driver-active-element {
            outline: 3px solid rgba(99, 102, 241, 0.6) !important;
            outline-offset: 4px !important;
            border-radius: 12px !important;
        }
        .sl-theme-picker {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin: 4px 0 10px;
        }
        .sl-theme-btn {
            padding: 10px 12px;
            border-radius: 10px;
            border: 2px solid #e2e8f0;
            background: white;
            font-size: 12.5px;
            font-weight: 600;
            color: #475569;
            cursor: pointer;
            transition: all 0.15s;
            display: flex; flex-direction: column; align-items: center; gap: 4px;
        }
        .sl-theme-btn:hover { border-color: #cbd5e1; }
        .sl-theme-btn[data-selected="true"] {
            border-color: #4f46e5;
            background: #eef2ff;
            color: #4338ca;
        }
        .sl-theme-btn-icon { font-size: 18px; line-height: 1; }
        .dark .sl-theme-btn {
            background: #1A2D48;
            border-color: #243A58;
            color: #CBD5E1;
        }
        .dark .sl-theme-btn[data-selected="true"] {
            border-color: #6366f1;
            background: rgba(99, 102, 241, 0.18);
            color: #c7d2fe;
        }
    `;
    document.head.appendChild(style);
}

/**
 * L1 — First-login welcome tour. Fires exactly once per user account, gated by
 * user_profiles.onboarding_completed_at. Re-trigger from Settings → "Replay
 * welcome tour" emits `sentinel:replay-onboarding`.
 *
 * Theme picker on step 7 is wired live: clicking Light or Dark inside the
 * popover immediately calls toggleDarkMode so the user sees the result.
 */
export const FirstLoginTour: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDarkMode, toggleDarkMode } = useAppState();
    const { needsOnboarding, onboardingLoaded, completeOnboarding } = useOnboarding();
    const driverRef = useRef<any>(null);
    const isDarkRef = useRef<boolean>(isDarkMode);
    isDarkRef.current = isDarkMode;

    const startTour = () => {
        if (driverRef.current) return;
        injectTourStyles();

        const steps: any[] = [
            {
                popover: {
                    title: 'Welcome to Sentinel SportsLab',
                    description: "Let's take 90 seconds to walk through the platform. We'll show you the navigation, the dashboard pieces, how the calendar works, and where to find Settings. You can skip this anytime — replay it later from Settings → Walkthrough.",
                    align: 'center',
                    side: 'over',
                },
            },
            {
                element: '[data-tour="sidebar-nav"]',
                popover: {
                    title: 'Your navigation',
                    description: "Every hub lives in the left sidebar — Dashboard, Roster, Workouts, Library, Conditioning, Wellness, Testing, Reporting, Analytics, Performance Lab. Items that don't match your subscription tier show a lock icon — upgrade in Settings to unlock them.",
                    side: 'right',
                    align: 'start',
                },
            },
            {
                element: '[data-tour="dashboard-kpis"]',
                popover: {
                    title: 'Top KPI tiles',
                    description: "Four headline numbers at a glance. Flagged — athletes who returned concerning answers in their latest daily wellness check-in. ACWR Risk — athletes whose Acute-to-Chronic Workload Ratio is outside the safe band (a sport-science injury-risk indicator, calculated from training sessions logged in Wellness → ACWR Monitoring). Sleep Risk — athletes who reported <6h sleep. Squad Readiness — overall composite team status with severity tag. Each tile is a click-through to the detailed view.",
                    side: 'bottom',
                    align: 'start',
                },
            },
            {
                element: '[data-tour="morning-report"]',
                popover: {
                    title: 'Performance Report',
                    description: "Your morning readout for the day — every athlete listed with their current ACWR risk level. ACWR (Acute-to-Chronic Workload Ratio) is the sports-science early-warning signal for overload injury. The list is populated from training sessions you log in Wellness → ACWR Monitoring (manually, via CSV upload, or via GPS integration). Click any athlete row to drill into their full 28-day load trend and session history.",
                    side: 'right',
                    align: 'start',
                },
            },
            {
                element: '[data-tour="heatmap"]',
                popover: {
                    title: 'Wellness Summary',
                    description: "A heatmap of every athlete\'s latest daily wellness check-in (sleep, fatigue, soreness, stress, mood). Greener cells = healthier, redder = flagged. The check-in responses powering this come from forms you share with athletes from Wellness — they fill them in on their phone in seconds, no account needed. Click the row to expand into the detailed breakdown per athlete.",
                    side: 'left',
                    align: 'start',
                },
            },
            {
                element: '[data-tour="calendar"]',
                popover: {
                    title: 'Training calendar',
                    description: "Your week\'s schedule. Toggle Week / Month / All with the buttons in the header. Click + Add Event to schedule a session, match, or rest day. Workouts you build in the Workouts page (Programs or Packets) auto-appear here when assigned — colour-coded by session type (strength, speed, recovery, technical). Drag any event to reschedule. Click any event for details.",
                    side: 'top',
                    align: 'start',
                },
            },
            {
                popover: {
                    title: 'Pick your theme',
                    description: "Light or dark — pick whichever you prefer. You can change it anytime from Settings → Appearance, and dark mode persists across devices.",
                    align: 'center',
                    side: 'over',
                },
            },
            {
                element: '[data-tour="settings-button"]',
                popover: {
                    title: 'Settings & support',
                    description: "Settings lives at the bottom-left of the sidebar. From there you can update your profile, manage your organisation and team members, change your subscription tier, configure ACWR + Testing features, switch your theme in Appearance, contact support, and replay any walkthrough from the Walkthrough tab.",
                    side: 'right',
                    align: 'end',
                },
            },
            {
                popover: {
                    title: "You're ready",
                    description: "That's the tour. Every page also has its own short walkthrough that fires the first time you visit it — and you can replay any of them from Settings → Walkthrough at any time. Welcome aboard.",
                    align: 'center',
                    side: 'over',
                },
            },
        ];

        const wireThemePicker = (popover: any) => {
            // Clean any prior instance (driver.js re-runs onPopoverRender on every step transition)
            const existing = popover.wrapper?.querySelector('.sl-theme-picker');
            if (existing) existing.remove();

            const container = document.createElement('div');
            container.className = 'sl-theme-picker';
            container.innerHTML = `
                <button type="button" data-theme-choice="light" class="sl-theme-btn">
                    <span class="sl-theme-btn-icon">☀️</span>
                    <span>Light</span>
                </button>
                <button type="button" data-theme-choice="dark" class="sl-theme-btn">
                    <span class="sl-theme-btn-icon">🌙</span>
                    <span>Dark</span>
                </button>
            `;
            const refresh = () => {
                const dark = isDarkRef.current;
                container.querySelectorAll<HTMLButtonElement>('.sl-theme-btn').forEach(btn => {
                    const isLight = btn.dataset.themeChoice === 'light';
                    btn.dataset.selected = (isLight && !dark) || (!isLight && dark) ? 'true' : 'false';
                });
            };
            container.querySelectorAll<HTMLButtonElement>('.sl-theme-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const wantDark = btn.dataset.themeChoice === 'dark';
                    if (wantDark !== isDarkRef.current) toggleDarkMode();
                    isDarkRef.current = wantDark;
                    refresh();
                });
            });
            refresh();
            // Place picker between description and footer
            const footer = popover.wrapper.querySelector('.driver-popover-footer');
            if (footer) popover.wrapper.insertBefore(container, footer);
            else popover.description.appendChild(container);
        };

        const d = driver({
            showProgress: true,
            progressText: '{{current}} of {{total}}',
            showButtons: ['next', 'previous'],
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
            doneBtnText: 'Finish',
            animate: true,
            overlayOpacity: 0.65,
            allowClose: false,
            disableActiveInteraction: true,
            stagePadding: 8,
            stageRadius: 12,
            popoverClass: 'sentinel-first-login-tour',
            steps,
            // Driver-level: fires on every step. Picker is only wired on the theme step (index 6).
            onPopoverRender: (popover: any, opts: any) => {
                if (opts?.state?.activeIndex === 6) {
                    wireThemePicker(popover);
                }
            },
            onDestroyStarted: () => {
                completeOnboarding();
                d.destroy();
            },
            onDestroyed: () => {
                driverRef.current = null;
                hideSkipPill();
            },
        });

        showSkipPill(() => d.destroy());
        d.drive();
        driverRef.current = d;
    };

    useEffect(() => {
        if (!onboardingLoaded) return;
        if (!needsOnboarding) return;
        if (!location.pathname.startsWith('/dashboard')) return;
        const t = setTimeout(() => startTour(), 600);
        return () => clearTimeout(t);
    }, [onboardingLoaded, needsOnboarding, location.pathname]);

    useEffect(() => {
        const handler = () => {
            if (!location.pathname.startsWith('/dashboard')) navigate('/dashboard');
            setTimeout(() => startTour(), 700);
        };
        window.addEventListener('sentinel:replay-onboarding', handler);
        return () => window.removeEventListener('sentinel:replay-onboarding', handler);
    }, [location.pathname, navigate]);

    useEffect(() => {
        return () => {
            if (driverRef.current) {
                try { driverRef.current.destroy(); } catch {}
            }
            hideSkipPill();
        };
    }, []);

    return null;
};

function showSkipPill(onSkip: () => void) {
    if (document.getElementById('sentinel-skip-tour-pill')) return;
    const pill = document.createElement('button');
    pill.id = 'sentinel-skip-tour-pill';
    pill.type = 'button';
    pill.textContent = 'Skip tour';
    pill.style.cssText = `
        position: fixed; bottom: 1rem; right: 1rem; z-index: 100001;
        background: rgba(15, 23, 42, 0.92); color: rgba(255, 255, 255, 0.95);
        font-size: 12px; font-weight: 600; padding: 7px 16px; border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.18); cursor: pointer;
        backdrop-filter: blur(8px); box-shadow: 0 6px 18px rgba(0,0,0,0.35);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    pill.addEventListener('click', onSkip);
    document.body.appendChild(pill);
}

function hideSkipPill() {
    const pill = document.getElementById('sentinel-skip-tour-pill');
    if (pill) pill.remove();
}

export default FirstLoginTour;
