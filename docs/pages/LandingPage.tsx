/**
 * Landing Page V5 — Flip card features, visual Why Us
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteFooter from '../components/layout/SiteFooter';
import {
    ActivityIcon, CheckIcon, ArrowRightIcon, ChevronRightIcon,
    SparklesIcon, SunIcon, MoonIcon, MenuIcon, XIcon,
    GaugeIcon, HeartIcon, FlaskConicalIcon, BrainIcon, DumbbellIcon, BarChart3Icon,
    ShieldIcon, ZapIcon, TargetIcon, LayersIcon, MapPinIcon, ClipboardListIcon,
    UsersIcon,
    DownloadIcon, AppleIcon, SmartphoneIcon, MonitorIcon, ShareIcon,
    HomeIcon, RefreshCwIcon, WifiOffIcon, LockIcon, RocketIcon,
} from 'lucide-react';

// ── Scroll reveal ──
const useReveal = (delay = 0) => {
    const ref = useRef<HTMLDivElement>(null);
    const [vis, setVis] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTimeout(() => setVis(true), delay); }, { threshold: 0.1 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [delay]);
    return { ref, style: { opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(40px)', transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms` } };
};

// ── Counter ──
const Counter = ({ end, suffix = '' }) => {
    const [n, setN] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const ran = useRef(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !ran.current) {
                ran.current = true;
                const t0 = Date.now();
                const tick = () => { const p = Math.min((Date.now() - t0) / 2000, 1); setN(Math.round(end * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
                tick();
            }
        }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [end]);
    return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
};

const LandingPage: React.FC = () => {
    const nav = useNavigate();
    const [dark, setDark] = useState(true);
    const [flippedCard, setFlippedCard] = useState<number | null>(null);
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const rHero = useReveal(100);
    const rStats = useReveal();
    const rFeatHead = useReveal();
    const rFeatGrid = useReveal(100);
    const rDiff = useReveal();
    const rVision = useReveal(100);
    const rInstall = useReveal();
    const rPrice = useReveal();

    // Detect the visitor's install context. Three independent signals so we can
    // render the right card layout: iOS (manual Add to Home Screen), Android +
    // desktop Chromium (one-click via beforeinstallprompt — Phase 3 wires the
    // real event), and "already installed" (hide the whole section).
    // Frontend-only for now; the actual prompt event listener lands in Phase 3
    // alongside the service worker registration.
    const [installCtx, setInstallCtx] = useState({ isIOS: false, isAndroid: false, isDesktop: true, isStandalone: false });
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
        const isAndroid = /android/i.test(ua);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
        setInstallCtx({ isIOS, isAndroid, isDesktop: !isIOS && !isAndroid, isStandalone });
    }, []);

    // Real install wiring: capture the browser's beforeinstallprompt so the
    // Install buttons trigger the native one-click install dialog on
    // Chromium (desktop, Android, Edge, Brave, Samsung Internet).
    const [installStubMessage, setInstallStubMessage] = useState<string | null>(null);
    const installMsgRef = useRef<HTMLDivElement>(null);
    // Show a message AND bring it on-screen — on phones the banner sits below
    // the three cards, off-viewport when a card button is tapped.
    const flashInstallMessage = (msg: string, ms = 8000) => {
        setInstallStubMessage(msg);
        setTimeout(() => installMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
        setTimeout(() => setInstallStubMessage(null), ms);
    };
    const deferredPromptRef = React.useRef<any>(null);
    const [installState, setInstallState] = useState<'idle' | 'available' | 'installed'>('idle');
    useEffect(() => {
        const onPrompt = (e: any) => {
            e.preventDefault();               // keep the mini-infobar quiet; we prompt on click
            deferredPromptRef.current = e;
            setInstallState('available');
        };
        const onInstalled = () => {
            deferredPromptRef.current = null;
            setInstallState('installed');
            flashInstallMessage('Installed! Find Sentinel SportsLab in your dock, taskbar, or home screen.');
        };
        // Pick up an event that fired before this component mounted
        if ((window as any).__sslInstallPrompt) {
            deferredPromptRef.current = (window as any).__sslInstallPrompt;
            setInstallState('available');
        }
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    const handleInstallClick = async (source: 'ios' | 'android' | 'desktop') => {
        if (source === 'ios') {
            // iOS never fires beforeinstallprompt — the card's inline steps are
            // the flow. Scroll to the section + restate the steps.
            flashInstallMessage('Tap the Share icon at the bottom of Safari, then scroll down and choose "Add to Home Screen" — the app icon lands on your home screen.', 9000);
            return;
        }
        const dp = deferredPromptRef.current;
        if (dp) {
            // Native install dialog
            dp.prompt();
            try {
                const choice = await dp.userChoice;
                if (choice?.outcome === 'accepted') {
                    flashInstallMessage('Installing… find Sentinel SportsLab in your dock, taskbar, or home screen.');
                } else {
                    flashInstallMessage('No problem — you can install any time from this page or the browser menu.');
                }
            } catch { /* dialog dismissed */ }
            deferredPromptRef.current = null;   // Chromium only allows one use per event
            (window as any).__sslInstallPrompt = null;
            setInstallState('idle');
            return;
        }
        if (installCtx.isStandalone || installState === 'installed') {
            flashInstallMessage('You\'re already using the installed app on this device.');
            return;
        }
        // No prompt available: already installed previously, or a browser
        // without one-click install (Firefox / Safari) — give the manual path.
        flashInstallMessage(
            'If Sentinel SportsLab is already installed, open it from your dock or home screen. Otherwise: in Chrome, Edge or Brave open the browser menu (⋮) and choose "Install Sentinel SportsLab…" / "Add to Home screen". Firefox and desktop Safari don\'t support app installs — use Chrome or Edge for the app experience.', 12000);
    };

    // Hash-scroll handler: when arriving via a hash anchor from another page
    // (e.g. /privacy → footer "Features" → /#features), React Router doesn't
    // scroll to the target automatically. This effect waits a tick for the
    // page to render, then scrolls smoothly to the matching element. Same-page
    // clicks (already on /) are handled by the browser natively via <a href>.
    useEffect(() => {
        if (!window.location.hash) return;
        const id = window.location.hash.slice(1);
        const t = setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
        return () => clearTimeout(t);
    }, []);

    const bg = dark ? '#06060B' : '#FFFFFF';
    const tx = dark ? 'text-white' : 'text-slate-900';
    const txm = dark ? 'text-slate-400' : 'text-slate-500';
    const txs = dark ? 'text-slate-500' : 'text-slate-400';
    const card = dark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-200';
    const cardH = dark ? 'hover:bg-white/[0.06] hover:border-white/[0.12]' : 'hover:shadow-xl hover:border-slate-300';
    const glass = dark ? 'bg-white/[0.05] backdrop-blur-2xl border-white/[0.08]' : 'bg-white/80 dark:bg-[#132338]/80 backdrop-blur-2xl border-slate-200/80';

    // ── Feature card data ──
    const features = [
        {
            idx: 0,
            Icon: GaugeIcon,
            gFrom: '#4f46e5', gTo: '#7c3aed',
            shadowColor: 'rgba(79,70,229,0.25)',
            cat: 'Load Management',
            title: 'ACWR Load Monitoring',
            tagline: "Know how hard you're pushing each athlete — before injury answers for you.",
            bullets: [
                "Individual safe-band thresholds from each athlete's own history",
                'EWMA and rolling 28-day window options — switch per squad',
                'Injured athletes auto-excluded from team calculations on their injury dates',
                "Scenario modelling to project next week's ACWR before you prescribe",
            ],
            visual: (dark: boolean, txs: string) => (
                <div className="mt-3 space-y-1.5">
                    {[
                        { name: 'T. Williams', acwr: '1.08', cls: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400', label: 'Optimal' },
                        { name: 'J. Martínez', acwr: '1.34', cls: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-400', label: 'Caution' },
                        { name: 'R. Patel',    acwr: '1.57', cls: 'text-rose-400',   badge: 'bg-rose-500/10 text-rose-400',   label: 'Danger'  },
                    ].map(p => (
                        <div key={p.name} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${dark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                            <span className={`text-[9px] font-medium ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{p.name}</span>
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold tabular-nums ${p.cls}`}>{p.acwr}</span>
                                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-semibold ${p.badge}`}>{p.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            idx: 1,
            Icon: HeartIcon,
            gFrom: '#ef4444', gTo: '#ec4899',
            shadowColor: 'rgba(239,68,68,0.25)',
            cat: 'Athlete Welfare',
            title: 'Wellness Surveillance',
            tagline: '60-second daily IOC check-in. Flags at-risk athletes before they step on the field.',
            bullets: [
                'FIFA/IOC wellness form auto-scored against published reference norms',
                'Amber and red flags raised instantly for out-of-band scores',
                'Team and individual wellness trends visualised over time',
                'Weekly deep-check with injury & illness pathway and return-to-play tracking',
            ],
            visual: (dark: boolean, txs: string) => (
                <div className="mt-3">
                    <div className="flex gap-2 mb-2">
                        {[{n:'32',l:'Clear',bg:'bg-emerald-500/10',t:'text-emerald-400'},{n:'4',l:'Amber',bg:'bg-amber-500/10',t:'text-amber-400'},{n:'2',l:'Red Flag',bg:'bg-rose-500/10',t:'text-rose-400'}].map(s => (
                            <div key={s.l} className={`flex-1 rounded-lg py-2 text-center ${s.bg}`}>
                                <div className={`text-sm font-bold ${s.t}`}>{s.n}</div>
                                <div className={`text-[7px] font-medium ${s.t} opacity-70`}>{s.l}</div>
                            </div>
                        ))}
                    </div>
                    <div className={`text-[8px] text-center ${txs}`}>38 / 42 submitted today · Scores vs FIFA/IOC norms</div>
                </div>
            ),
        },
        {
            idx: 2,
            Icon: BrainIcon,
            gFrom: '#06b6d4', gTo: '#2563eb',
            shadowColor: 'rgba(6,182,212,0.25)',
            cat: 'Analytics',
            title: 'Performance Intelligence',
            tagline: 'Five analytics terminals in one hub. No extra hardware required.',
            bullets: [
                'Readiness composites across load, recovery, and performance domains',
                'Baseline trend tracking to confirm your program is producing adaptation',
                'Dose-response analysis — quantify what each block actually delivered',
                'Force-velocity profiling from existing test data, no force plate needed',
            ],
            visual: (dark: boolean, txs: string) => (
                <div className="mt-3">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="relative w-12 h-12 shrink-0">
                            <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                                <circle cx="40" cy="40" r="34" fill="none" stroke={dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'} strokeWidth="8" />
                                <circle cx="40" cy="40" r="34" fill="none" stroke="url(#readGradFlip)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${0.82 * 213.6} ${213.6}`} />
                                <defs><linearGradient id="readGradFlip"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>82</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {['Baseline Trend','Dose-Response','Scenario Model','F-V Profile'].map(m => (
                                <span key={m} className={`text-[7px] px-1.5 py-0.5 rounded font-medium ${dark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'}`}>{m}</span>
                            ))}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            idx: 3,
            Icon: FlaskConicalIcon,
            gFrom: '#10b981', gTo: '#0d9488',
            shadowColor: 'rgba(16,185,129,0.25)',
            cat: 'Testing',
            title: 'Testing Hub',
            tagline: '80+ research-referenced protocols. Benchmarked against published norms instantly.',
            bullets: [
                '8 categories: Screening, RTP, Power, Strength, Speed, Endurance, Anthropometric, Neurocognitive',
                'Normative percentile bands built into every result — no manual lookup needed',
                'Track individual athlete progress across testing blocks over time',
                'CMJ, IMTP, RSI, Nordic Force, FMS, Sprint 10/30m, VO₂ Max, InBody, and more',
            ],
            visual: (dark: boolean, txs: string) => (
                <div className="mt-3">
                    <div className={`text-[8px] font-semibold ${txs} mb-1.5`}>Normative Band — CMJ (Males 18–25)</div>
                    <div className="flex gap-0.5 rounded-full overflow-hidden mb-1.5">
                        {[['bg-rose-500','Poor'],['bg-amber-500','Below'],['bg-yellow-400','Avg'],['bg-emerald-400','Above'],['bg-emerald-600','Elite']].map(([c,l]) => (
                            <div key={l} className={`flex-1 h-2.5 ${c}`} />
                        ))}
                    </div>
                    <div className="relative h-4 mb-1">
                        <div className="absolute" style={{ left: '70%', transform: 'translateX(-50%)' }}>
                            <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-emerald-400 mx-auto" />
                            <div className="text-[8px] font-bold text-emerald-400 whitespace-nowrap">38.2 cm — Above Avg</div>
                        </div>
                    </div>
                    <div className="flex justify-between">
                        {['Poor','Below','Avg','Above','Elite'].map(l => <span key={l} className={`text-[7px] ${txs}`}>{l}</span>)}
                    </div>
                </div>
            ),
        },
        {
            idx: 4,
            Icon: DumbbellIcon,
            gFrom: '#f59e0b', gTo: '#f97316',
            shadowColor: 'rgba(245,158,11,0.25)',
            cat: 'Programming',
            title: 'Workout Builder',
            tagline: 'Build programs from 3,700+ exercises. Every rep tracked, every session quantified.',
            bullets: [
                'Sets, reps, weight, and Reps in Reserve (RIR) logged per exercise',
                'Automatic tonnage tracking per session and across the full training block',
                'Assign sessions to teams or individual athletes; drag to reorder',
                'Every exercise linked to a video reference from the 3,700+ library',
            ],
            visual: (dark: boolean, txs: string) => (
                <div className="mt-3 space-y-1.5">
                    {[
                        { ex: 'Back Squat', detail: '5 × 4 @ 130 kg · RIR 2', t: '2,600 kg' },
                        { ex: 'Romanian Deadlift', detail: '4 × 6 @ 100 kg · RIR 3', t: '2,400 kg' },
                        { ex: 'Nordic Curl', detail: '4 × 5 bodyweight · RIR 1', t: '— kg' },
                    ].map(e => (
                        <div key={e.ex} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${dark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                            <div>
                                <div className={`text-[9px] font-semibold ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{e.ex}</div>
                                <div className={`text-[7px] tabular-nums ${txs}`}>{e.detail}</div>
                            </div>
                            <span className="text-[8px] font-bold text-amber-400">{e.t}</span>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            idx: 5,
            Icon: MapPinIcon,
            gFrom: '#8b5cf6', gTo: '#6d28d9',
            shadowColor: 'rgba(139,92,246,0.25)',
            cat: 'GPS & Tracking',
            title: 'GPS & Load Intelligence',
            tagline: 'Upload from any provider. Smart column mapping. Insights in seconds.',
            bullets: [
                'Catapult, Polar Team Pro, STATSports, or any GPS CSV export',
                'Auto-detects columns and flags anything unresolved for review',
                'Column profiles saved per team — no remapping on every upload',
                'Athlete trends, session comparisons, and session type filtering in Insights',
            ],
            visual: (dark: boolean, txs: string) => (
                <div className="mt-3">
                    {[
                        { label: 'Heart Rate Metrics', color: dark ? 'text-rose-400' : 'text-rose-500' },
                        { label: 'Distance Metrics', color: dark ? 'text-indigo-400' : 'text-indigo-500' },
                        { label: 'Speed Metrics', color: dark ? 'text-cyan-400' : 'text-cyan-600' },
                        { label: 'Acceleration Metrics', color: dark ? 'text-amber-400' : 'text-amber-500' },
                    ].map(r => (
                        <div key={r.label} className={`flex items-center justify-between px-2 py-1.5 border-b ${dark ? 'border-white/[0.05]' : 'border-slate-200 dark:border-[#243A58]'} last:border-0`}>
                            <span className={`text-[8px] font-semibold ${r.color}`}>{r.label}</span>
                            <span className="text-[7px] font-bold text-emerald-400">✓ mapped</span>
                        </div>
                    ))}
                    <div className={`text-[8px] text-center mt-1.5 ${txs}`}>Catapult · Polar · STATSports · and more</div>
                </div>
            ),
        },
    ];

    return (
        <div className={`min-h-screen ${tx} overflow-x-hidden transition-colors duration-700`} style={{ backgroundColor: bg }}>

            {/* ═══════ NAV ═══════ */}
            <nav className={`fixed top-0 inset-x-0 z-50 ${glass} border-b`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-12 w-auto select-none" />
                        <span className="font-semibold text-[15px] tracking-tight">Sentinel <span className="text-indigo-500">SportsLab</span></span>
                    </div>
                    <div className={`hidden md:flex items-center gap-10 text-[13px] font-medium ${txm}`}>
                        <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
                        <a href="#why" className="hover:text-indigo-400 transition-colors">Why Us</a>
                        <a href="#pilot" className="hover:text-indigo-400 transition-colors">Pilot</a>
                        <a href="#install" className="hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5">
                            Install App
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">New</span>
                        </a>
                        <a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button onClick={() => setDark(!dark)} aria-label="Toggle theme" className={`p-2 rounded-lg transition-all ${dark ? 'text-slate-500 dark:text-[#CBD5E1] hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48]'}`}>
                            {dark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
                        </button>
                        <button onClick={() => nav('/login')} className={`hidden sm:block text-[13px] font-medium ${txm} hover:text-indigo-400 transition-colors px-3 py-2`}>Log in</button>
                        <button onClick={() => nav('/login?mode=signup')} className="hidden sm:block text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-lg transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30">Get Started</button>
                        {/* Hamburger — visible below md. Replaces the section
                            links + Log in + Get Started on small screens. */}
                        <button onClick={() => setMobileMenuOpen(v => !v)} aria-label="Open menu" className={`md:hidden p-2 rounded-lg transition-all ${dark ? 'text-slate-300 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48]'}`}>
                            {mobileMenuOpen ? <XIcon size={18} /> : <MenuIcon size={18} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu panel — slides down under the nav bar */}
                {mobileMenuOpen && (
                    <div className={`md:hidden border-t ${dark ? 'border-white/10 bg-[#06060B]/95' : 'border-slate-200 dark:border-[#243A58] bg-white/95'} backdrop-blur-lg`}>
                        <div className="px-4 py-4 flex flex-col gap-1">
                            {[
                                { href: '#features', label: 'Features' },
                                { href: '#why',      label: 'Why Us' },
                                { href: '#pilot',    label: 'Pilot' },
                                { href: '#install',  label: 'Install App' },
                                { href: '#pricing',  label: 'Pricing' },
                            ].map(l => (
                                <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}
                                   className={`text-[14px] font-medium px-3 py-3 rounded-lg transition-colors ${dark ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-[#1A2D48]'}`}>
                                    {l.label}
                                </a>
                            ))}
                            <div className={`h-px my-2 ${dark ? 'bg-white/10' : 'bg-slate-200'}`} />
                            <button onClick={() => { setMobileMenuOpen(false); nav('/login'); }}
                                    className={`text-[14px] font-medium px-3 py-3 rounded-lg text-left transition-colors ${dark ? 'text-slate-300 hover:text-white hover:bg-white/5' : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-[#1A2D48]'}`}>
                                Log in
                            </button>
                            <button onClick={() => { setMobileMenuOpen(false); nav('/login?mode=signup'); }}
                                    className="text-[14px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-3 rounded-lg transition-all mt-1">
                                Get Started
                            </button>
                        </div>
                    </div>
                )}
            </nav>

            {/* ═══════ HERO ═══════ */}
            <section className="relative min-h-screen flex items-center justify-center pt-16">
                <div className="absolute inset-0 overflow-hidden">
                    {/* Photo backdrop — null-safe. If /images/landing/hero.jpg
                        doesn't exist the browser silently fails the request and
                        the underlying gradient orbs below remain visible.
                        Opacity tuned a touch higher than the original scaffold
                        so the photo carries more of the hero (user feedback). */}
                    <div
                        className={`absolute inset-0 bg-cover bg-center ${dark ? 'opacity-45' : 'opacity-70'}`}
                        style={{ backgroundImage: 'url(/images/landing/hero.jpg)' }}
                    />
                    {/* Overlay tint — softened so more of the photo shows through.
                        Bottom anchor stays solid so the section blends into the
                        next section's dark/light background cleanly. */}
                    <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-[#06060B]/35 via-[#06060B]/45 to-[#06060B]' : 'bg-gradient-to-b from-white/25 via-white/50 to-white'}`} />
                    {dark ? (
                        <>
                            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
                            <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
                            <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/60 via-white to-cyan-50/40" />
                            <div className="absolute top-20 right-[15%] w-[400px] h-[400px] bg-indigo-300/15 rounded-full blur-[100px]" />
                            <div className="absolute bottom-20 left-[10%] w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-[120px]" />
                        </>
                    )}
                    <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${dark ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
                </div>

                <div ref={rHero.ref} style={rHero.style} className="relative max-w-7xl mx-auto px-4 sm:px-8 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 ${dark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 dark:bg-indigo-600 border-indigo-100 dark:border-indigo-800/40 text-indigo-600'} border rounded-full text-xs font-semibold mb-10`}>
                        <SparklesIcon size={13} /> Sports Science Intelligence Platform
                    </div>
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[-0.03em] leading-[0.95]">
                        Monitor athletes.
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            Optimise performance.
                        </span>
                    </h1>
                    <p className={`mt-8 text-lg md:text-xl ${txm} max-w-2xl mx-auto leading-relaxed`}>
                        ACWR load monitoring, research-grade wellness surveillance, 80+ protocols, and GPS intelligence.
                        Built on published research. Accessible from day one.
                    </p>
                    <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
                        <button onClick={() => nav('/login?mode=signup')}
                            className="group flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-2xl shadow-indigo-600/25 hover:shadow-indigo-500/35 transition-all active:scale-[0.97] text-[15px]">
                            Activate 21-day Access <ArrowRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <a href="#features" className={`flex items-center gap-2 px-6 py-4 ${txm} font-medium hover:text-indigo-400 transition-colors text-[15px]`}>
                            Explore Features <ChevronRightIcon size={16} />
                        </a>
                    </div>
                    <div className={`mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-sm ${txs}`}>
                        <span className="flex items-center gap-2"><CheckIcon size={15} className="text-emerald-500" /> 21-day guided pilot</span>
                        <span className="flex items-center gap-2"><CheckIcon size={15} className="text-emerald-500" /> No credit card</span>
                        <span className="flex items-center gap-2"><CheckIcon size={15} className="text-emerald-500" /> Direct onboarding support</span>
                    </div>

                    {/* Sport list strip — Catapult-style "Built for" row.
                        Pattern observed across competitor sites where the
                        homepage immediately signals which sports the platform
                        covers, so prospects don't have to scroll to verify. */}
                    <div className={`mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[10.5px] font-bold uppercase tracking-[0.18em] ${txs}`}>
                        <span className={`opacity-70 mr-1`}>Built for</span>
                        {['Football', 'Rugby', 'Cricket', 'Hockey', 'Basketball', 'Athletics', 'Combat Sports'].map((s, i, arr) => (
                            <React.Fragment key={s}>
                                <span className="opacity-90">{s}</span>
                                {i < arr.length - 1 && <span className="opacity-40">·</span>}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Floating mock dashboard */}
                    <div className="mt-20 mx-auto max-w-4xl" style={{ perspective: '1200px' }}>
                        <div className="relative rounded-2xl overflow-hidden transition-transform duration-1000 hover:scale-[1.01]" style={{ transform: 'rotateX(4deg)' }}>
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 opacity-40" style={{ animation: 'spin 8s linear infinite', backgroundSize: '200% 200%' }} />
                            <div className={`relative ${dark ? 'bg-[#0c0c14]' : 'bg-white'} rounded-2xl p-6 m-px`}>
                                <div className="flex items-center gap-1.5 mb-5">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                                    <span className={`text-[10px] ${txs} ml-3`}>sentinelsportslab.com/dashboard</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    {[{ l: 'Athletes', v: '42', c: 'from-indigo-500/20 to-indigo-500/5', tc: 'text-indigo-400' },
                                      { l: 'Available', v: '38', c: 'from-emerald-500/20 to-emerald-500/5', tc: 'text-emerald-400' },
                                      { l: 'Flagged', v: '3', c: 'from-amber-500/20 to-amber-500/5', tc: 'text-amber-400' },
                                      { l: 'At Risk', v: '1', c: 'from-rose-500/20 to-rose-500/5', tc: 'text-rose-400' }
                                    ].map((c, i) => (
                                        <div key={i} className={`bg-gradient-to-b ${c.c} rounded-xl px-4 py-3 ${dark ? '' : 'border border-slate-100 dark:border-[#243A58]'}`}>
                                            <div className={`text-2xl font-bold ${dark ? c.tc : c.tc.replace('400', '600')}`}>{c.v}</div>
                                            <div className={`text-[9px] font-semibold uppercase tracking-wider ${txs}`}>{c.l}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className={`sm:col-span-2 ${dark ? 'bg-white/[0.02]' : 'bg-slate-50'} rounded-xl p-4`}>
                                        <div className={`text-[9px] font-semibold ${txs} uppercase tracking-wider mb-3`}>Team ACWR (28-Day Rolling)</div>
                                        <div className="flex items-end gap-[3px] h-20">
                                            {[30, 45, 55, 70, 85, 92, 78, 65, 88, 95, 72, 60, 80, 90, 75, 55, 68, 82, 93, 70].map((h, i) => (
                                                <div key={i} className={`flex-1 rounded-t-sm ${h > 80 ? 'bg-emerald-500' : h > 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                    style={{ height: `${h}%`, transition: `height 1s ease ${i * 50}ms` }} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
                                        <div className={`${dark ? 'bg-indigo-500/10' : 'bg-indigo-50 dark:bg-indigo-600 border border-indigo-100 dark:border-indigo-800/40'} rounded-xl p-3`}>
                                            <div className={`text-[8px] font-semibold ${dark ? 'text-indigo-400' : 'text-indigo-500'} uppercase tracking-wider`}>Readiness</div>
                                            <div className={`text-2xl font-bold mt-1 ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>82</div>
                                        </div>
                                        <div className={`${dark ? 'bg-emerald-500/10' : 'bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/40'} rounded-xl p-3`}>
                                            <div className={`text-[8px] font-semibold ${dark ? 'text-emerald-400' : 'text-emerald-500'} uppercase tracking-wider`}>Compliance</div>
                                            <div className={`text-2xl font-bold mt-1 ${dark ? 'text-emerald-300' : 'text-emerald-600'}`}>91%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>{`@keyframes spin { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>
            </section>

            {/* ═══════ STATS ═══════ */}
            <section className={`py-12 sm:py-20 border-y ${dark ? 'border-white/[0.05]' : 'border-slate-100 dark:border-[#243A58]'}`}>
                <div ref={rStats.ref} style={rStats.style} className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-3 gap-4 sm:gap-8 text-center">
                    {[
                        { end: 80, s: '+', l: 'Protocol Documents' },
                        { end: 3700, s: '+', l: 'Exercise Library' },
                        { end: 6, s: '', l: 'Intelligence Hubs' },
                    ].map((s, i) => (
                        <div key={i} className="min-w-0">
                            <div className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"><Counter end={s.end} suffix={s.s} /></div>
                            <div className={`text-xs sm:text-sm ${txm} mt-1 sm:mt-2 font-medium`}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════ FEATURES — FLIP CARDS ═══════ */}
            <section id="features" className="py-16 sm:py-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div ref={rFeatHead.ref} style={rFeatHead.style} className="text-center mb-16">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${dark ? 'bg-white/[0.05] border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 dark:border-[#243A58] text-slate-600'} border rounded-full text-xs font-semibold mb-5`}>
                            <LayersIcon size={12} /> Platform
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Everything you need</h2>
                        <p className={`mt-4 text-lg ${txm} max-w-lg mx-auto`}>Built for sport science professionals. Click any feature to explore.</p>
                    </div>

                    <div ref={rFeatGrid.ref} style={rFeatGrid.style} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((f) => (
                            <div
                                key={f.idx}
                                style={{ perspective: '1200px', height: '420px' }}
                            >
                                <div
                                    style={{
                                        transformStyle: 'preserve-3d' as any,
                                        transform: flippedCard === f.idx
                                            ? 'rotateY(180deg)'
                                            : hoveredCard === f.idx
                                                ? 'rotateY(10deg) rotateX(2deg) translateZ(4px)'
                                                : 'rotateY(0deg)',
                                        transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
                                        height: '100%',
                                        position: 'relative' as any,
                                        cursor: 'pointer',
                                    }}
                                    onMouseEnter={() => setHoveredCard(f.idx)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    onClick={() => setFlippedCard(flippedCard === f.idx ? null : f.idx)}
                                >
                                    {/* FRONT */}
                                    <div
                                        style={{ backfaceVisibility: 'hidden' as any, WebkitBackfaceVisibility: 'hidden' as any, position: 'absolute', inset: 0 }}
                                        className={`${card} border rounded-2xl p-7 flex flex-col overflow-hidden`}
                                    >
                                        <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 30% 20%, ${f.gFrom}18, transparent 60%)` }} />
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 shadow-lg shrink-0"
                                            style={{ background: `linear-gradient(135deg, ${f.gFrom}, ${f.gTo})`, boxShadow: `0 8px 24px ${f.shadowColor}` }}
                                        >
                                            <f.Icon size={22} className="text-white" />
                                        </div>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2`} style={{ color: f.gFrom }}>
                                            {f.cat}
                                        </p>
                                        <h3 className={`text-lg font-bold tracking-tight mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>{f.title}</h3>
                                        <p className={`text-sm ${txm} leading-relaxed flex-1`}>{f.tagline}</p>
                                        <div className={`mt-5 pt-4 border-t ${dark ? 'border-white/[0.07]' : 'border-slate-100 dark:border-[#243A58]'} flex items-center gap-1.5`} style={{ color: f.gFrom }}>
                                            <span className="text-[11px] font-semibold">Explore feature</span>
                                            <ChevronRightIcon size={13} />
                                        </div>
                                    </div>

                                    {/* BACK */}
                                    <div
                                        style={{ backfaceVisibility: 'hidden' as any, WebkitBackfaceVisibility: 'hidden' as any, transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}
                                        className={`${dark ? 'bg-[#0e0e1a] border-white/[0.09]' : 'bg-slate-50 border-slate-200 dark:border-[#243A58]'} border rounded-2xl p-6 flex flex-col overflow-hidden`}
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl" style={{ background: `radial-gradient(circle, ${f.gTo}, transparent)` }} />
                                        <div className="flex items-center gap-2 mb-4">
                                            <div
                                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                style={{ background: `linear-gradient(135deg, ${f.gFrom}, ${f.gTo})` }}
                                            >
                                                <f.Icon size={14} className="text-white" />
                                            </div>
                                            <h3 className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{f.title}</h3>
                                        </div>
                                        <ul className="space-y-2 flex-1">
                                            {f.bullets.map((b, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <CheckIcon size={12} className="mt-0.5 shrink-0" style={{ color: f.gFrom }} />
                                                    <span className={`text-[11px] ${txm} leading-snug`}>{b}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {f.visual(dark, txs)}
                                        <div className={`mt-3 text-[10px] text-center ${txs}`}>Click to flip back</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ WHY US ═══════ */}
            <section id="why" className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#06060B]" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(6,182,212,0.1) 0%, transparent 50%)' }} />
                <div ref={rDiff.ref} style={rDiff.style} className="relative max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full text-xs font-semibold text-indigo-400 mb-5">
                            <TargetIcon size={12} /> What sets us apart
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">Built different. Proven in practice.</h2>
                        <p className="mt-5 text-lg text-slate-400 max-w-xl mx-auto">Capabilities that usually require enterprise contracts, accessible from day one.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
                        {[
                            {
                                icon: ShieldIcon,
                                title: 'Individualised ACWR Thresholds',
                                sub: 'Load Management',
                                desc: "Safe bands calculated from each athlete's own load history — not a fixed squad-wide value. One athlete's 1.3 is another's danger zone.",
                                proof: '↓ Injury risk when thresholds are athlete-specific',
                            },
                            {
                                icon: ZapIcon,
                                title: 'F-V Profiling Without Hardware',
                                sub: 'Analytics',
                                desc: 'Force-velocity profiles derived from your existing test results — no force plate or specialised equipment. Works with CMJ and sprint data you already collect.',
                                proof: 'Available in the Performance Intelligence hub',
                            },
                            {
                                icon: BarChart3Icon,
                                title: 'Dose-Response Analysis',
                                sub: 'Analytics',
                                desc: "Answer the question every coach asks: did this training block actually produce a performance change? Compare test results across blocks with statistical context.",
                                proof: 'Block-by-block performance delta tracking',
                            },
                            {
                                icon: ClipboardListIcon,
                                title: 'Smart CSV Auto-Detection',
                                sub: 'GPS & Tracking',
                                desc: 'Upload any GPS or test export — the system identifies columns automatically, saves your mapping as a reusable profile, and flags anything unresolved.',
                                proof: 'Compatible with any provider CSV format',
                            },
                            {
                                icon: HeartIcon,
                                title: 'Research-Grade Wellness Forms',
                                sub: 'Athlete Welfare',
                                desc: 'FIFA/IOC-validated daily and weekly check-ins with a built-in injury and illness pathway — not just a basic questionnaire with no reference norms.',
                                proof: 'Scores benchmarked against published IOC thresholds',
                            },
                            {
                                icon: BrainIcon,
                                title: 'Scenario Modelling',
                                sub: 'Load Management',
                                desc: 'Project future ACWR values before you prescribe a training week. See exactly where each athlete will land — and adjust before load becomes risk.',
                                proof: 'Plan inside safe bands, not outside them',
                            },
                        ].map((d, i) => (
                            <div key={i} className="group p-6 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:from-indigo-500/30 group-hover:to-cyan-500/30 transition-all">
                                        <d.icon size={18} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400/70 mb-1">{d.sub}</p>
                                        <h4 className="font-semibold text-white text-sm leading-snug">{d.title}</h4>
                                    </div>
                                </div>
                                <p className="text-[13px] text-slate-400 leading-relaxed mb-3">{d.desc}</p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-white/[0.05] pt-3">
                                    <CheckIcon size={11} className="text-emerald-500 shrink-0" />
                                    {d.proof}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ MANIFESTO ═══════ */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-[#06060B]" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(99,102,241,0.06) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />

                <div ref={rVision.ref} style={rVision.style} className="relative max-w-4xl mx-auto px-4 sm:px-8 text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-400 mb-10">Our Philosophy</p>
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.05]">
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            Built for those who refuse to guess.
                        </span>
                    </h2>
                    <div className="mt-14 max-w-2xl mx-auto space-y-6 text-lg text-slate-400 leading-relaxed text-left">
                        <p>Sentinel exists to serve environments where decisions carry real weight — where time cannot be wasted and guesswork is not an option. We don't scale for the sake of reach. We refine for the sake of impact.</p>
                        <p>We partner with practitioners who hold their programs to a higher standard. Equipping them to move faster, act with conviction, and create an environment where the best decisions are also the most informed ones.</p>
                    </div>
                    <div className="my-14 flex items-center gap-6 max-w-2xl mx-auto">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">Data drives decisions. Decisions drive success.</p>
                    </div>
                </div>
            </section>

            {/* ═══════ AUDIENCE CARDS ═══════
                Two-card layout pairing the two primary users — sport scientists
                and coaches — with the photo of each context (Images 3 and 4).
                Both card backgrounds are null-safe via CSS background-image, so
                missing files = a clean coloured card with no broken-image icon. */}
            <section className={`py-16 sm:py-24 ${dark ? 'bg-[#0a0a14]' : 'bg-slate-50'}`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="text-center mb-12">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${dark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'} border rounded-full text-xs font-semibold mb-5`}>
                            <UsersIcon size={12} /> Who it's for
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
                            Two roles. <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">One platform.</span>
                        </h2>
                        <p className={`mt-4 text-lg ${txm} max-w-xl mx-auto`}>
                            Built around the day-to-day work of sport scientists and coaches — the people who actually use this every morning.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-6xl mx-auto">
                        {[
                            {
                                tag: 'For sport scientists',
                                title: 'Run analysis without leaving the workflow',
                                img: '/images/landing/audience-scientist.jpg',
                                Icon: BarChart3Icon,
                                points: [
                                    'ACWR (EWMA) load monitoring with individualised thresholds',
                                    'F-V profiling from existing CMJ and sprint data',
                                    'Dose-response analysis across training blocks',
                                    'Five analytics terminals, GPS column auto-detection',
                                ],
                            },
                            {
                                tag: 'For coaches',
                                title: 'See readiness before the session starts',
                                img: '/images/landing/audience-coach.jpg',
                                Icon: HeartIcon,
                                points: [
                                    'FIFA/IOC daily wellness with auto-flag alerts',
                                    'Squad-wide readiness dashboard',
                                    'Injury and illness pathway from a single form',
                                    'Conditioning Hub, Wattbike and HR monitoring',
                                ],
                            },
                        ].map((a, i) => (
                            <div key={i} className={`group relative rounded-2xl overflow-hidden border ${dark ? 'border-white/[0.07] bg-white/[0.03]' : 'border-slate-200 dark:border-[#243A58] bg-white'} hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all`}>
                                {/* Photo block — null-safe */}
                                <div
                                    className="relative h-56 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${a.img}), linear-gradient(135deg, #4338ca 0%, #6366f1 100%)` }}
                                >
                                    <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-t from-[#0a0a14]/85 via-[#0a0a14]/30 to-transparent' : 'bg-gradient-to-t from-white/95 via-white/30 to-transparent'}`} />
                                    <div className="absolute top-4 left-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${dark ? 'bg-[#0a0a14]/85 text-indigo-300 border border-indigo-500/40' : 'bg-white/95 text-indigo-600 border border-indigo-200'} backdrop-blur-sm`}>
                                            <a.Icon size={11} /> {a.tag}
                                        </span>
                                    </div>
                                </div>
                                {/* Content */}
                                <div className="p-6 sm:p-7">
                                    <h3 className={`text-lg sm:text-xl font-semibold tracking-tight mb-4 ${tx}`}>{a.title}</h3>
                                    <ul className={`space-y-2.5 text-[13px] ${txm} leading-relaxed`}>
                                        {a.points.map((p, j) => (
                                            <li key={j} className="flex items-start gap-2">
                                                <CheckIcon size={13} className="text-emerald-500 shrink-0 mt-1" />
                                                <span>{p}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ 21-DAY PILOT ═══════
                Replaces the old "14-day trial" framing. The whole positioning
                shift is from "free try-before-you-buy" to "structured guided
                pilot" — 14 days is enough for first impressions, 21 gives
                time for setup, real-world use, and a calibration review. */}
            <section id="pilot" className="py-16 sm:py-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    {/* Header photo strip — null-safe. Missing file = the slot
                        collapses (hidden when pilot.jpg fails to load) so the
                        section opens straight into the heading below. */}
                    <div
                        className="relative max-w-5xl mx-auto mb-12 rounded-2xl overflow-hidden bg-cover bg-center"
                        style={{ backgroundImage: 'url(/images/landing/pilot.jpg)', aspectRatio: '21 / 9' }}
                    >
                        {/* Gradient overlay anchored bottom — keeps the heading
                            below the photo from feeling disconnected. */}
                        <div className={`absolute inset-0 ${dark ? 'bg-gradient-to-b from-transparent via-transparent to-[#06060B]' : 'bg-gradient-to-b from-transparent via-transparent to-white'}`} />
                    </div>

                    <div className="text-center mb-16">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${dark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 dark:bg-indigo-600 border-indigo-100 dark:border-indigo-800/40 text-indigo-600'} border rounded-full text-xs font-semibold mb-5`}>
                            <SparklesIcon size={12} /> How the pilot works
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Three weeks. Guided. Structured.</h2>
                        <p className={`mt-5 text-lg ${txm} max-w-2xl mx-auto leading-relaxed`}>
                            14 days surfaces first impressions. 21 days gives us setup, data collection, interpretation, and a real review window — long enough to settle into routine and generate behavioural feedback rather than gut reactions.
                        </p>
                    </div>

                    {/* Step-flow grid — md+ shows a faint dashed line behind the
                        three cards so they read as sequential steps in a single
                        journey, not three unrelated cards. Pattern observed on
                        Teamworks workflow sections + Edge10 product steps. */}
                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
                        {[
                            {
                                week: 'Week 1',
                                step: 1,
                                title: 'Setup & onboarding',
                                sub: 'Foundation',
                                icon: LayersIcon,
                                items: [
                                    'Account setup and provisioning',
                                    'Importing your data — athletes, history, GPS, tests',
                                    'Understanding workflows across each hub',
                                    'Guided walkthroughs led by us',
                                ],
                            },
                            {
                                week: 'Week 2',
                                step: 2,
                                title: 'Active usage',
                                sub: 'Live use',
                                icon: ActivityIcon,
                                items: [
                                    'Daily use across training and recovery cycles',
                                    'Applying features in real scenarios',
                                    'Embedding the system into your routine',
                                ],
                            },
                            {
                                week: 'Week 3',
                                step: 3,
                                title: 'Evaluation & refinement',
                                sub: 'Calibration',
                                icon: TargetIcon,
                                items: [
                                    'Structured feedback session',
                                    'Identifying sticking points together',
                                    'Surfacing deeper functionality',
                                    'Mapping long-term integration',
                                ],
                            },
                        ].map((w, i) => (
                            <div key={i} className={`relative z-10 p-6 rounded-2xl ${card} border ${cardH} transition-all duration-300 flex flex-col`}>
                                {/* Step-number disc — sits at top-right, anchored
                                    onto the connector line so the three cards read
                                    as 1 → 2 → 3 sequential steps. */}
                                <div className={`absolute -top-3 right-5 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white bg-indigo-600 shadow-lg shadow-indigo-600/30 ring-4 ${dark ? 'ring-[#06060B]' : 'ring-white'}`}>
                                    {w.step}
                                </div>
                                <div className="flex items-start gap-4 mb-5">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-cyan-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                        <w.icon size={20} className="text-indigo-500 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500/80 dark:text-indigo-400/70 mb-1">{w.week} · {w.sub}</p>
                                        <h4 className="font-semibold text-base leading-snug">{w.title}</h4>
                                    </div>
                                </div>
                                <ul className={`space-y-2.5 text-[13px] ${txm} leading-relaxed flex-1`}>
                                    {w.items.map((it, j) => (
                                        <li key={j} className="flex items-start gap-2">
                                            <CheckIcon size={13} className="text-emerald-500 shrink-0 mt-1" />
                                            <span>{it}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                </div>
            </section>

            {/* ═══════ INSTALL APP ═══════ */}
            <section id="install" className={`py-16 sm:py-32 relative overflow-hidden ${dark ? 'bg-[#0a0a14]' : 'bg-slate-50'}`}>
                {/* Background gradient orbs — matches hero aesthetic but tuned down */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {dark ? (
                        <>
                            <div className="absolute top-[10%] left-[5%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
                            <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
                        </>
                    ) : (
                        <>
                            <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px]" />
                            <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-violet-200/20 rounded-full blur-[100px]" />
                        </>
                    )}
                </div>

                <div ref={rInstall.ref} style={rInstall.style} className="relative max-w-6xl mx-auto px-4 sm:px-8">
                    {installCtx.isStandalone ? (
                        /* ── Already installed — celebrate, don't nag ── */
                        <div className={`max-w-2xl mx-auto text-center px-6 py-10 rounded-2xl border ${card}`}>
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white mb-4 shadow-lg shadow-emerald-500/20">
                                <CheckIcon size={26} />
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">You're running the app.</h2>
                            <p className={`mt-3 ${txm}`}>Sentinel SportsLab is installed on this device — you're getting the fastest, fullscreen experience.</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Eyebrow + heading ── */}
                            <div className="text-center mb-14 sm:mb-20">
                                <div className={`inline-flex items-center gap-2 px-4 py-2 ${dark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'} border rounded-full text-xs font-semibold mb-6`}>
                                    <DownloadIcon size={13} /> Install App
                                </div>
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
                                    Take it anywhere.
                                    <br />
                                    <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                                        Install in one tap.
                                    </span>
                                </h2>
                                <p className={`mt-6 text-base sm:text-lg ${txm} max-w-xl mx-auto leading-relaxed`}>
                                    Install Sentinel SportsLab as an app on your phone, tablet, or computer.
                                    No app store. No download wait. Same login, same data, fullscreen experience.
                                </p>
                            </div>

                            {/* ── Three platform cards ── */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* iOS card */}
                                <div className={`group relative rounded-2xl border ${card} ${cardH} p-6 transition-all duration-200 ${installCtx.isIOS ? 'ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/10' : ''}`}>
                                    {installCtx.isIOS && (
                                        <div className="absolute -top-2.5 left-6 text-[9px] font-bold uppercase tracking-[0.15em] bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/30">
                                            Your device
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${dark ? 'bg-white/10' : 'bg-slate-100'}`}>
                                            <AppleIcon size={22} className={dark ? 'text-white' : 'text-slate-900'} />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold">iPhone & iPad</h3>
                                            <p className={`text-[11px] ${txs}`}>Safari · iOS 16.4+</p>
                                        </div>
                                    </div>
                                    <ol className={`text-[12.5px] ${txm} space-y-2.5 mb-5 leading-relaxed`}>
                                        <li className="flex items-start gap-2.5">
                                            <span className={`shrink-0 w-5 h-5 rounded-full ${dark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'} flex items-center justify-center text-[10px] font-bold`}>1</span>
                                            <span>Open this page in <strong className={tx}>Safari</strong></span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className={`shrink-0 w-5 h-5 rounded-full ${dark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'} flex items-center justify-center text-[10px] font-bold`}>2</span>
                                            <span>Tap the <ShareIcon size={11} className="inline -mt-0.5" /> <strong className={tx}>Share</strong> icon at the bottom</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className={`shrink-0 w-5 h-5 rounded-full ${dark ? 'bg-white/10 text-white' : 'bg-slate-200 text-slate-700'} flex items-center justify-center text-[10px] font-bold`}>3</span>
                                            <span>Choose <strong className={tx}>Add to Home Screen</strong></span>
                                        </li>
                                    </ol>
                                    <button
                                        onClick={() => handleInstallClick('ios')}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${dark ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
                                    >
                                        <ShareIcon size={14} />
                                        Show me how
                                    </button>
                                </div>

                                {/* Android card */}
                                <div className={`group relative rounded-2xl border ${card} ${cardH} p-6 transition-all duration-200 ${installCtx.isAndroid ? 'ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/10' : ''}`}>
                                    {installCtx.isAndroid && (
                                        <div className="absolute -top-2.5 left-6 text-[9px] font-bold uppercase tracking-[0.15em] bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/30">
                                            Your device
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                                            <SmartphoneIcon size={22} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold">Android</h3>
                                            <p className={`text-[11px] ${txs}`}>Chrome · Edge · Samsung Internet</p>
                                        </div>
                                    </div>
                                    <ul className={`text-[12.5px] ${txm} space-y-2.5 mb-5 leading-relaxed`}>
                                        <li className="flex items-start gap-2.5">
                                            <CheckIcon size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                            <span>One-tap install from your browser</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <CheckIcon size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                            <span>App icon on your home screen instantly</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <CheckIcon size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                            <span>Fullscreen, no browser chrome</span>
                                        </li>
                                    </ul>
                                    <button
                                        onClick={() => handleInstallClick('android')}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all"
                                    >
                                        <DownloadIcon size={14} />
                                        Install on Android
                                    </button>
                                </div>

                                {/* Desktop card */}
                                <div className={`group relative rounded-2xl border ${card} ${cardH} p-6 transition-all duration-200 ${installCtx.isDesktop ? 'ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/10' : ''}`}>
                                    {installCtx.isDesktop && (
                                        <div className="absolute -top-2.5 left-6 text-[9px] font-bold uppercase tracking-[0.15em] bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-lg shadow-indigo-500/30">
                                            Your device
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                                            <MonitorIcon size={22} className="text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold">Desktop</h3>
                                            <p className={`text-[11px] ${txs}`}>Windows · macOS · Linux</p>
                                        </div>
                                    </div>
                                    <ul className={`text-[12.5px] ${txm} space-y-2.5 mb-5 leading-relaxed`}>
                                        <li className="flex items-start gap-2.5">
                                            <CheckIcon size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                            <span>Install via Chrome, Edge, or Brave</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <CheckIcon size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                            <span>Standalone window — separate from browser tabs</span>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <CheckIcon size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                            <span>Pin to dock, taskbar, or Start menu</span>
                                        </li>
                                    </ul>
                                    <button
                                        onClick={() => handleInstallClick('desktop')}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all"
                                    >
                                        <DownloadIcon size={14} />
                                        Install on Desktop
                                    </button>
                                </div>
                            </div>

                            {/* ── Stub message — replaced in Phase 3 with real install prompt ── */}
                            {installStubMessage && (
                                <div className={`mt-6 max-w-2xl mx-auto px-5 py-3.5 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${dark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'}`}>
                                    <RocketIcon size={16} className="shrink-0 mt-0.5 text-indigo-400" />
                                    <p className="text-[13px] leading-relaxed">{installStubMessage}</p>
                                </div>
                            )}

                            {/* ── Value props row ── */}
                            <div className={`mt-14 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto`}>
                                {[
                                    { Icon: ZapIcon,        label: 'Instant updates',         sub: 'No store reviews' },
                                    { Icon: LockIcon,       label: 'Same secure login',       sub: 'Your data, encrypted' },
                                    { Icon: RefreshCwIcon,  label: 'Cross-device sync',       sub: 'Browser and app together' },
                                    { Icon: HomeIcon,       label: 'Lives on home screen',    sub: 'One tap to open' },
                                ].map(p => (
                                    <div key={p.label} className="text-center">
                                        <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-3 ${dark ? 'bg-white/5 border border-white/10' : 'bg-white border border-slate-200 dark:border-[#243A58] shadow-sm'}`}>
                                            <p.Icon size={18} className="text-indigo-400" />
                                        </div>
                                        <p className={`text-[12.5px] font-semibold ${tx}`}>{p.label}</p>
                                        <p className={`text-[10.5px] ${txs} mt-0.5`}>{p.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* ── Reassurance line ── */}
                            <p className={`mt-10 text-center text-[11.5px] ${txs} max-w-xl mx-auto`}>
                                The installed app and the website both connect to the same live database.
                                Log in from anywhere — your athletes, sessions, and data are always in sync.
                            </p>
                        </>
                    )}
                </div>
            </section>

            {/* ═══════ PRICING ═══════ */}
            <section id="pricing" className="py-16 sm:py-32">
                <div ref={rPrice.ref} style={rPrice.style} className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h2>
                        <p className={`mt-5 text-lg ${txm} max-w-lg mx-auto`}>Begin with a 21-day guided pilot on any tier. Pick the one that fits your program.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        {[
                            {
                                name: 'Basic', price: 'R599', per: '/month',
                                seats: '1 user',
                                desc: 'Core platform for individual practitioners',
                                features: ['Dashboard & squad readiness','Athlete roster management','Workout builder (3,700+ exercises)','Tonnage & session tracking','Testing Hub — 80+ protocols','Exercise library & catalogues','Session calendar & scheduling'],
                                pop: false, cust: false,
                            },
                            {
                                name: 'Performance', price: 'R3,499', per: '/month',
                                seats: 'Up to 3 users',
                                desc: 'Everything in Basic, plus welfare & conditioning',
                                features: ['Everything in Basic','Wellness Hub — daily & weekly forms','FIFA/IOC wellness surveillance','Auto-flag & medical alert system','Conditioning Hub','Wattbike & HR monitoring','Injury & illness tracking'],
                                pop: true, cust: false,
                            },
                            {
                                name: 'Elite', price: "Let's talk", per: '',
                                seats: 'Full platform access · Organisational',
                                desc: 'The complete platform — and we onboard your whole staff personally',
                                features: ['Everything in Performance','Full access: GPS, ACWR, Analytics, Insights, Periodization','Guided 21-day onboarding with our team','Hands-on training sessions for your staff','We configure the platform around your programme','Direct line to our sport-science team'],
                                pop: false, cust: false, elite: true,
                            },
                            {
                                name: 'Custom', price: 'Contact us', per: '',
                                seats: 'Custom seat count',
                                desc: 'Pick exactly the features you need — we quote accordingly',
                                features: ['Choose any combination of features','Pay only for what you use','Dedicated onboarding session','Priority support channel','Custom integrations on request','White-label options available'],
                                pop: false, cust: true, elite: false,
                            },
                        ].map((t, i) => (
                            <div key={i} className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 ${
                                t.pop
                                    ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 md:scale-[1.03] z-10 ring-1 ring-indigo-500'
                                    : t.cust
                                        ? `${dark ? 'bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/[0.08]' : 'bg-slate-950 text-white'}`
                                        : `${card} border ${cardH}`
                            }`}>
                                {t.pop && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-widest rounded-full">Most Popular</div>}
                                <h3 className="text-lg font-semibold">{t.name}</h3>
                                <p className={`text-sm mt-1 mb-4 leading-snug ${t.pop ? 'text-indigo-200' : t.cust ? 'text-slate-400' : txm}`}>{t.desc}</p>
                                <div className="mb-5">
                                    <div>
                                        <span className="text-2xl font-bold">{t.price}</span>
                                        {t.per && <span className={`text-sm ml-1 ${t.pop ? 'text-indigo-200' : txm}`}>{t.per}</span>}
                                    </div>
                                    {t.seats && (
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${t.pop ? 'text-indigo-200' : t.cust ? 'text-slate-400' : 'text-indigo-500/80 dark:text-indigo-400/80'}`}>
                                            {t.seats}
                                        </p>
                                    )}
                                </div>
                                <ul className={`space-y-2.5 text-[12px] mb-8 flex-1 ${t.pop ? 'text-indigo-100' : t.cust ? 'text-slate-300' : txm}`}>
                                    {t.features.map((f, j) => (
                                        <li key={j} className="flex items-start gap-2">
                                            <CheckIcon size={13} className={`mt-0.5 shrink-0 ${t.pop ? 'text-emerald-300' : 'text-emerald-500'}`} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    onClick={() => (t as any).elite ? nav('/contact?subject=elite') : t.cust ? nav('/contact') : nav('/login?mode=signup')}
                                    className={`w-full py-3 font-semibold rounded-xl text-sm transition-all ${
                                        t.pop
                                            ? 'bg-white dark:bg-[#1A2D48] text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50'
                                            : t.cust
                                                ? 'bg-white text-slate-900 hover:bg-slate-100 dark:hover:bg-[#1A2D48]'
                                                : dark
                                                    ? 'border border-white/10 hover:border-indigo-500/40 hover:text-indigo-400'
                                                    : 'border-2 border-slate-200 dark:border-[#243A58] text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}>
                                    {(t as any).elite ? 'Contact us' : t.cust ? 'Get a Quote' : 'Begin Access'}
                                </button>
                                {(t as any).elite && (
                                    <p className={`text-[10px] text-center mt-3 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Speak to us — we set you up, train your staff,<br />and take you through the 21-day onboarding.
                                    </p>
                                )}
                                {t.cust && (
                                    <p className={`text-[10px] text-center mt-3 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Tell us which features you need.<br />We'll build a package around your program.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className={`text-center text-xs mt-10 ${txs}`}>All prices exclude VAT. 21-day guided pilot on all tiers — no credit card required.</p>
                </div>
            </section>

            {/* ═══════ FOOTER ═══════ */}
            <SiteFooter />
        </div>
    );
};

export default LandingPage;
