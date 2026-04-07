// @ts-nocheck
/**
 * Landing Page — Premium design with dark/light theme
 *
 * Design principles (from research):
 * - Linear/Vercel: extreme whitespace, gradient glows, scroll reveals
 * - Stripe: gradient mesh backgrounds
 * - Framer: bento grid, interactive elements
 * - Dark mode differentiates from all sport science competitors (they're all light)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ActivityIcon, ShieldIcon, FlaskConicalIcon, GaugeIcon, HeartIcon,
    DumbbellIcon, BarChart3Icon, ZapIcon, CheckIcon, ArrowRightIcon,
    ChevronRightIcon, MessageCircleIcon, SparklesIcon, LayersIcon,
    BrainIcon, TargetIcon, SunIcon, MoonIcon,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Scroll-triggered reveal hook
// ═══════════════════════════════════════════════════════════════════════
const useReveal = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return { ref, className: `transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}` };
};

// ═══════════════════════════════════════════════════════════════════════
// Animated counter
// ═══════════════════════════════════════════════════════════════════════
const Counter = ({ end, suffix = '', duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !started.current) {
                started.current = true;
                const t0 = Date.now();
                const tick = () => {
                    const p = Math.min((Date.now() - t0) / duration, 1);
                    setCount(Math.round(end * (1 - Math.pow(1 - p, 3))));
                    if (p < 1) requestAnimationFrame(tick);
                };
                tick();
            }
        }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [end, duration]);
    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// ═══════════════════════════════════════════════════════════════════════
// Theme
// ═══════════════════════════════════════════════════════════════════════
const themes = {
    dark: {
        bg: 'bg-[#0A0A0F]', text: 'text-white', muted: 'text-slate-400', subtle: 'text-slate-500',
        card: 'bg-white/[0.04] border-white/[0.08] backdrop-blur-xl', cardHover: 'hover:bg-white/[0.08] hover:border-white/[0.15]',
        navBg: 'bg-[#0A0A0F]/80 backdrop-blur-xl border-white/[0.06]',
        accent: 'text-indigo-400', accentBg: 'bg-indigo-500', accentGlow: 'shadow-indigo-500/25',
        sectionAlt: 'bg-white/[0.02]', footerBg: 'bg-[#06060A]',
        badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
        inputBg: 'bg-white/[0.05] border-white/[0.1]',
    },
    light: {
        bg: 'bg-white', text: 'text-slate-900', muted: 'text-slate-500', subtle: 'text-slate-400',
        card: 'bg-white border-slate-200 shadow-sm', cardHover: 'hover:shadow-xl hover:border-slate-300',
        navBg: 'bg-white/80 backdrop-blur-xl border-slate-100',
        accent: 'text-indigo-600', accentBg: 'bg-indigo-600', accentGlow: 'shadow-indigo-200/50',
        sectionAlt: 'bg-slate-50', footerBg: 'bg-slate-950',
        badge: 'bg-indigo-50 border-indigo-100 text-indigo-600',
        inputBg: 'bg-slate-50 border-slate-200',
    },
};

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════
const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<'dark' | 'light'>('dark');
    const t = themes[mode];
    const isDark = mode === 'dark';

    const r1 = useReveal(), r2 = useReveal(), r3 = useReveal(), r4 = useReveal(), r5 = useReveal(), r6 = useReveal();

    const FEATURES = [
        { icon: GaugeIcon, title: 'ACWR Monitoring', desc: 'Acute:chronic workload ratios with EWMA, individualized thresholds, and scenario modelling.', size: 'large' },
        { icon: HeartIcon, title: 'Wellness Surveillance', desc: 'FIFA/IOC-aligned daily wellness with auto-flag detection.', size: 'normal' },
        { icon: FlaskConicalIcon, title: 'Testing Hub', desc: '80+ sport science protocols with normative data and benchmarking.', size: 'normal' },
        { icon: BrainIcon, title: 'Performance Intelligence', desc: 'Readiness composites, dose-response analysis, F-V profiling.', size: 'large' },
        { icon: DumbbellIcon, title: 'Workout Builder', desc: 'Programs, packets, periodization. 3,700+ exercise library.', size: 'normal' },
        { icon: BarChart3Icon, title: 'GPS & Load Data', desc: 'Smart CSV auto-detection from any provider.', size: 'normal' },
    ];

    const DIFFS = [
        'Individualized Load Thresholds — personal ACWR bands per athlete',
        'Force-Velocity Profiling — from existing test data, no hardware',
        'Dose-Response Analysis — did the training block produce gains?',
        'Smart CSV Auto-Detection — upload any file, system maps it',
        'FIFA/IOC Wellness Monitoring — research-grade surveillance',
        'Scenario Modelling — project future ACWR from planned loads',
    ];

    const TIERS = [
        { name: 'Starter', price: '$3', sub: '/athlete/mo', desc: 'Personal trainers & small teams', features: ['Athlete roster', 'Exercise library (3,700+)', 'Workout builder', 'Basic testing', 'Session scheduling', 'CSV import'], highlight: false },
        { name: 'Pro', price: '$6', sub: '/athlete/mo', desc: 'Sport scientists & S&C coaches', features: ['Everything in Starter', 'ACWR monitoring', 'Wellness Hub + forms', 'GPS smart mapping', '80+ test protocols', 'Injury tracking', 'Analytics hub', 'Smart CSV detection'], highlight: true },
        { name: 'Elite', price: '$10', sub: '/athlete/mo', desc: 'Pro clubs & federations', features: ['Everything in Pro', 'Individualized thresholds', 'F-V profiling', 'Dose-response analysis', 'Scenario modelling', 'Performance Intelligence', 'Benchmarking engine', 'FIFA wellness system'], highlight: false },
        { name: 'Custom', price: "Let's talk", sub: '', desc: 'Tailored to your needs', features: ['Pick features you need', "Remove what you don't", 'Custom integrations', 'White-label option', 'Dedicated onboarding', 'Priority support', 'API access', 'Multi-team management'], highlight: false, custom: true },
    ];

    return (
        <div className={`min-h-screen ${t.bg} ${t.text} overflow-x-hidden transition-colors duration-500`}>

            {/* ══════════ NAV ══════════ */}
            <nav className={`fixed top-0 left-0 right-0 z-50 ${t.navBg} border-b`}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 ${t.accentBg} rounded-lg flex items-center justify-center shrink-0 shadow-lg ${t.accentGlow}`}>
                            <ActivityIcon size={16} className="text-white" />
                        </div>
                        <span className="font-bold text-base tracking-tight">
                            Sentinel <span className={t.accent}>SportsLab</span>
                        </span>
                    </div>
                    <div className={`hidden md:flex items-center gap-8 text-sm font-medium ${t.muted}`}>
                        <a href="#features" className={`hover:${t.text} transition-colors`}>Features</a>
                        <a href="#why" className={`hover:${t.text} transition-colors`}>Why Us</a>
                        <a href="#pricing" className={`hover:${t.text} transition-colors`}>Pricing</a>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMode(isDark ? 'light' : 'dark')}
                            className={`p-2 rounded-lg ${isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'} transition-all`}
                            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                            {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                        </button>
                        <button onClick={() => navigate('/login')} className={`text-sm font-medium ${t.muted} hover:${t.text} transition-colors px-3 py-2`}>Log in</button>
                        <button onClick={() => navigate('/login')}
                            className={`text-sm font-semibold text-white ${t.accentBg} hover:opacity-90 px-4 py-2 rounded-lg transition-all shadow-lg ${t.accentGlow}`}>
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* ══════════ HERO ══════════ */}
            <section className="relative min-h-[92vh] flex items-center pt-16">
                {/* Background effects */}
                <div className="absolute inset-0 overflow-hidden">
                    {isDark ? (
                        <>
                            <div className="absolute top-1/4 left-[15%] w-[500px] h-[500px] bg-indigo-600/[0.07] rounded-full blur-[120px]" />
                            <div className="absolute bottom-1/4 right-[10%] w-[400px] h-[400px] bg-cyan-500/[0.05] rounded-full blur-[100px]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/[0.04] rounded-full blur-[140px]" />
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-white to-cyan-50/50" />
                            <div className="absolute top-20 right-[10%] w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                            <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
                        </>
                    )}
                    {/* Dot grid */}
                    <div className={`absolute inset-0 ${isDark ? 'opacity-[0.04]' : 'opacity-[0.03]'}`} style={{ backgroundImage: `radial-gradient(circle, ${isDark ? '#6366f1' : '#6366f1'} 1px, transparent 1px)`, backgroundSize: '32px 32px' }} />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 w-full">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${t.badge} border rounded-full text-xs font-semibold mb-8`}>
                                <SparklesIcon size={12} /> Sports Science Intelligence
                            </div>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                                Monitor.
                                <br />
                                <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
                                    Optimise.
                                </span>
                                <br />
                                Perform.
                            </h1>
                            <p className={`mt-8 text-lg md:text-xl ${t.muted} leading-relaxed max-w-lg`}>
                                The all-in-one platform for sport scientists, S&C coaches, and trainers. Built on published research. Accessible from day one.
                            </p>
                            <div className="mt-10 flex flex-wrap items-center gap-4">
                                <button onClick={() => navigate('/login')}
                                    className={`group flex items-center gap-2 px-8 py-4 ${t.accentBg} text-white font-semibold rounded-xl shadow-xl ${t.accentGlow} transition-all hover:shadow-2xl active:scale-[0.98] text-base`}>
                                    Start Free <ArrowRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <a href="#features" className={`flex items-center gap-2 px-6 py-4 ${t.muted} font-medium hover:${t.text} transition-colors`}>
                                    Explore <ChevronRightIcon size={16} />
                                </a>
                            </div>
                            <div className={`mt-12 flex items-center gap-6 text-sm ${t.subtle}`}>
                                <span className="flex items-center gap-1.5"><CheckIcon size={14} className="text-emerald-500" /> 14-day free trial</span>
                                <span className="flex items-center gap-1.5"><CheckIcon size={14} className="text-emerald-500" /> No credit card</span>
                            </div>
                        </div>

                        {/* Mock dashboard */}
                        <div className="hidden lg:block" style={{ perspective: '1200px' }}>
                            <div className={`${isDark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xl'} border rounded-2xl p-5 transition-transform duration-700 hover:scale-[1.02]`}
                                style={{ transform: 'rotateY(-4deg) rotateX(2deg)' }}>
                                <div className="flex items-center gap-1.5 mb-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                    <span className={`text-[9px] ${t.subtle} ml-2`}>sentinelsportslab.com</span>
                                </div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-4 gap-2">
                                        {[{ l: 'Athletes', v: '42', c: isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600' },
                                          { l: 'Available', v: '38', c: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600' },
                                          { l: 'Modified', v: '3', c: isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600' },
                                          { l: 'Flagged', v: '2', c: isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600' }
                                        ].map((c, i) => (
                                            <div key={i} className={`${c.c} rounded-lg px-2.5 py-2 text-center`}>
                                                <div className="text-lg font-bold">{c.v}</div>
                                                <div className="text-[7px] font-semibold uppercase tracking-wide opacity-60">{c.l}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`${isDark ? 'bg-white/[0.03]' : 'bg-slate-50'} rounded-lg p-3`}>
                                        <div className={`text-[8px] font-semibold ${t.subtle} uppercase mb-2`}>ACWR Distribution</div>
                                        <div className="flex items-end gap-1 h-14">
                                            {[35, 55, 70, 85, 95, 80, 65, 90, 75, 60, 50, 40].map((h, i) => (
                                                <div key={i} className={`flex-1 rounded-t-sm ${h > 80 ? 'bg-emerald-500' : h > 60 ? 'bg-amber-500' : 'bg-rose-500'} ${isDark ? 'opacity-70' : ''}`}
                                                    style={{ height: `${h}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className={`${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'} rounded-lg p-2.5`}>
                                            <div className={`text-[7px] font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-500'} uppercase`}>Readiness</div>
                                            <div className={`text-xl font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>82<span className="text-xs opacity-60">/100</span></div>
                                        </div>
                                        <div className={`${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'} rounded-lg p-2.5`}>
                                            <div className={`text-[7px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-500'} uppercase`}>Compliance</div>
                                            <div className={`text-xl font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-600'}`}>91<span className="text-xs opacity-60">%</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ STATS ══════════ */}
            <section className={`border-y ${isDark ? 'border-white/[0.06]' : 'border-slate-100'} ${t.sectionAlt} py-16`}>
                <div className="max-w-6xl mx-auto px-6">
                    <div ref={r1.ref} className={`grid grid-cols-3 gap-8 text-center ${r1.className}`}>
                        {[{ end: 80, suffix: '+', label: 'Testing Protocols' }, { end: 3700, suffix: '+', label: 'Exercise Library' }, { end: 45, suffix: '+', label: 'GPS Fields Supported' }].map((s, i) => (
                            <div key={i}>
                                <div className={`text-4xl md:text-5xl font-bold ${t.accent}`}><Counter end={s.end} suffix={s.suffix} /></div>
                                <div className={`text-sm ${t.muted} mt-2 font-medium`}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ FEATURES — BENTO GRID ══════════ */}
            <section id="features" className="py-28">
                <div className="max-w-6xl mx-auto px-6">
                    <div ref={r2.ref} className={`text-center mb-20 ${r2.className}`}>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${t.badge} border rounded-full text-xs font-semibold mb-5`}>
                            <LayersIcon size={12} /> Platform
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything you need</h2>
                        <p className={`mt-4 text-lg ${t.muted} max-w-xl mx-auto`}>From daily wellness to advanced analytics — one platform.</p>
                    </div>

                    <div ref={r3.ref} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${r3.className}`}>
                        {FEATURES.map((f, i) => (
                            <div key={i} className={`${t.card} border rounded-2xl p-6 ${t.cardHover} transition-all duration-300 ${f.size === 'large' ? 'lg:col-span-2' : ''}`}>
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                                    <f.icon size={18} className="text-white" />
                                </div>
                                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                                <p className={`text-sm ${t.muted} leading-relaxed`}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ DIFFERENTIATORS ══════════ */}
            <section id="why" className={`py-28 ${isDark ? 'bg-gradient-to-b from-[#0A0A0F] via-[#0f0a1a] to-[#0A0A0F]' : 'bg-slate-950 text-white'} relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 50%, #06b6d4 0%, transparent 50%)' }} />
                <div className="relative max-w-6xl mx-auto px-6">
                    <div ref={r4.ref} className={`text-center mb-16 ${r4.className}`}>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/10 rounded-full text-xs font-semibold text-indigo-300 mb-5">
                            <TargetIcon size={12} /> What Makes Us Different
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Enterprise depth. Accessible pricing.</h2>
                        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">Features that cost $10K+/year on enterprise platforms.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                        {DIFFS.map((d, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <CheckIcon size={13} className="text-white" />
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">{d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ PRICING ══════════ */}
            <section id="pricing" className="py-28">
                <div className="max-w-6xl mx-auto px-6">
                    <div ref={r5.ref} className={`text-center mb-16 ${r5.className}`}>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Start free. Scale as you grow.</h2>
                        <p className={`mt-4 text-lg ${t.muted} max-w-xl mx-auto`}>No hidden fees. Annual billing saves 20%.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {TIERS.map((tier, i) => {
                            const isCustom = tier.custom;
                            const isHighlight = tier.highlight;
                            return (
                                <div key={i} className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 ${
                                    isHighlight
                                        ? `${t.accentBg} text-white shadow-2xl ${t.accentGlow} scale-[1.03] z-10`
                                        : isCustom
                                            ? `${isDark ? 'bg-gradient-to-b from-white/[0.06] to-white/[0.02]' : 'bg-slate-950 text-white'} border ${isDark ? 'border-white/[0.1]' : 'border-slate-800'}`
                                            : `${t.card} border ${t.cardHover}`
                                }`}>
                                    {isHighlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/20 text-white text-[9px] font-bold uppercase tracking-wider rounded-full backdrop-blur-sm">Most Popular</div>}
                                    <h3 className="text-lg font-semibold">{tier.name}</h3>
                                    <p className={`text-sm mt-1 mb-5 ${isHighlight ? 'text-indigo-200' : isCustom ? 'text-slate-400' : t.muted}`}>{tier.desc}</p>
                                    <div className="mb-6">
                                        <span className="text-3xl font-bold">{tier.price}</span>
                                        {tier.sub && <span className={`text-sm ${isHighlight ? 'text-indigo-200' : t.muted}`}>{tier.sub}</span>}
                                    </div>
                                    <ul className={`space-y-2 text-sm mb-8 flex-1 ${isHighlight ? 'text-indigo-100' : isCustom ? 'text-slate-300' : t.muted}`}>
                                        {tier.features.map((f, j) => (
                                            <li key={j} className="flex items-start gap-2">
                                                <CheckIcon size={14} className={`mt-0.5 shrink-0 ${isHighlight ? 'text-emerald-300' : 'text-emerald-500'}`} />{f}
                                            </li>
                                        ))}
                                    </ul>
                                    <button onClick={() => isCustom ? (window.location.href = 'mailto:hello@sentinelsportslab.com') : navigate('/login')}
                                        className={`w-full py-2.5 font-semibold rounded-xl text-sm transition-all ${
                                            isHighlight ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                                            : isCustom ? 'bg-white text-slate-900 hover:bg-slate-100'
                                            : `border-2 ${isDark ? 'border-white/10 text-white hover:border-indigo-500/50 hover:text-indigo-400' : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600'}`
                                        }`}>
                                        {isCustom ? 'Contact Us' : 'Start Free Trial'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ══════════ FINAL CTA ══════════ */}
            <section className="py-28 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700" />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div ref={r6.ref} className={`relative max-w-3xl mx-auto px-6 text-center ${r6.className}`}>
                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Ready to elevate your sport science?</h2>
                    <p className="mt-5 text-lg text-indigo-200 max-w-xl mx-auto leading-relaxed">
                        Join sport scientists and S&C coaches using research-backed tools to monitor, test, and optimise athlete performance.
                    </p>
                    <button onClick={() => navigate('/login')}
                        className="mt-10 px-10 py-4 bg-white text-indigo-600 font-bold rounded-xl shadow-xl hover:shadow-2xl hover:bg-indigo-50 transition-all active:scale-[0.98] text-base">
                        Start Your Free Trial
                    </button>
                </div>
            </section>

            {/* ══════════ FOOTER ══════════ */}
            <footer className={`${isDark ? t.footerBg : 'bg-slate-950'} text-slate-400 py-12`}>
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                                <ActivityIcon size={14} className="text-white" />
                            </div>
                            <span className="font-bold text-sm text-white tracking-tight">Sentinel <span className="text-indigo-400">SportsLab</span></span>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                            <a href="#features" className="hover:text-white transition-colors">Features</a>
                            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                            <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">Login</button>
                        </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs text-slate-500">
                        &copy; {new Date().getFullYear()} Sentinel SportsTech. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
