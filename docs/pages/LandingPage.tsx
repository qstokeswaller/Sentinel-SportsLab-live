// @ts-nocheck
/**
 * Landing Page V3 — Bold editorial design
 *
 * Design language:
 * - Dark-first (like Linear/Vercel) with light toggle
 * - Animated gradient mesh hero (Stripe-inspired)
 * - Bento grid with varying card sizes
 * - Scroll-driven reveal animations
 * - Glassmorphic elements
 * - Massive typography hierarchy
 * - 120-160px section spacing
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ActivityIcon, CheckIcon, ArrowRightIcon, ChevronRightIcon,
    MessageCircleIcon, SparklesIcon, SunIcon, MoonIcon,
    GaugeIcon, HeartIcon, FlaskConicalIcon, BrainIcon, DumbbellIcon, BarChart3Icon,
    ShieldIcon, ZapIcon, TargetIcon, LayersIcon,
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

    // Reveal hooks for each section
    const rHero = useReveal(100);
    const rStats = useReveal();
    const rFeatHead = useReveal();
    const rFeat1 = useReveal(0), rFeat2 = useReveal(80), rFeat3 = useReveal(160), rFeat4 = useReveal(240), rFeat5 = useReveal(320), rFeat6 = useReveal(400);
    const rDiff = useReveal();
    const rVision = useReveal(100);
    const rPrice = useReveal();
    const rCta = useReveal();

    // Theme classes
    const bg = dark ? '#06060B' : '#FFFFFF';
    const tx = dark ? 'text-white' : 'text-slate-900';
    const txm = dark ? 'text-slate-400' : 'text-slate-500';
    const txs = dark ? 'text-slate-500' : 'text-slate-400';
    const card = dark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-200';
    const cardH = dark ? 'hover:bg-white/[0.06] hover:border-white/[0.12]' : 'hover:shadow-xl hover:border-slate-300';
    const glass = dark ? 'bg-white/[0.05] backdrop-blur-2xl border-white/[0.08]' : 'bg-white/80 backdrop-blur-2xl border-slate-200/80';

    return (
        <div className={`min-h-screen ${tx} overflow-x-hidden transition-colors duration-700`} style={{ backgroundColor: bg }}>

            {/* ═══════ NAV ═══════ */}
            <nav className={`fixed top-0 inset-x-0 z-50 ${glass} border-b`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <ActivityIcon size={15} className="text-white" />
                        </div>
                        <span className="font-semibold text-[15px] tracking-tight">Sentinel <span className="text-indigo-500">SportsLab</span></span>
                    </div>
                    <div className={`hidden md:flex items-center gap-10 text-[13px] font-medium ${txm}`}>
                        <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
                        <a href="#why" className="hover:text-indigo-400 transition-colors">Why Us</a>
                        <a href="#pricing" className="hover:text-indigo-400 transition-colors">Pricing</a>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button onClick={() => setDark(!dark)} className={`p-2 rounded-lg transition-all ${dark ? 'text-slate-500 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}>
                            {dark ? <SunIcon size={15} /> : <MoonIcon size={15} />}
                        </button>
                        <button onClick={() => nav('/login')} className={`hidden sm:block text-[13px] font-medium ${txm} hover:text-indigo-400 transition-colors px-3 py-2`}>Log in</button>
                        <button onClick={() => nav('/login')} className="text-[12px] sm:text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-5 py-2 rounded-lg transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30">Get Started</button>
                    </div>
                </div>
            </nav>

            {/* ═══════ HERO ═══════ */}
            <section className="relative min-h-screen flex items-center justify-center pt-16">
                {/* Gradient mesh */}
                <div className="absolute inset-0 overflow-hidden">
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
                    {/* Subtle grid */}
                    <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${dark ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
                </div>

                <div ref={rHero.ref} style={rHero.style} className="relative max-w-7xl mx-auto px-4 sm:px-8 text-center">
                    {/* Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 ${dark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'} border rounded-full text-xs font-semibold mb-10`}>
                        <SparklesIcon size={13} /> Sports Science Intelligence Platform
                    </div>

                    {/* Headline — massive */}
                    <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-[-0.03em] leading-[0.95]">
                        Monitor athletes.
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            Optimise performance.
                        </span>
                    </h1>

                    <p className={`mt-8 text-lg md:text-xl ${txm} max-w-2xl mx-auto leading-relaxed`}>
                        ACWR monitoring, wellness surveillance, 80+ testing protocols, and performance intelligence.
                        Built on published research. Accessible from day one.
                    </p>

                    {/* CTA */}
                    <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
                        <button onClick={() => nav('/login')}
                            className="group flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-2xl shadow-indigo-600/25 hover:shadow-indigo-500/35 transition-all active:scale-[0.97] text-[15px]">
                            Start Free Trial <ArrowRightIcon size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <a href="#features" className={`flex items-center gap-2 px-6 py-4 ${txm} font-medium hover:text-indigo-400 transition-colors text-[15px]`}>
                            Explore Features <ChevronRightIcon size={16} />
                        </a>
                    </div>

                    <div className={`mt-14 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-sm ${txs}`}>
                        <span className="flex items-center gap-2"><CheckIcon size={15} className="text-emerald-500" /> Free 14-day trial</span>
                        <span className="flex items-center gap-2"><CheckIcon size={15} className="text-emerald-500" /> No credit card</span>
                        <span className="flex items-center gap-2"><CheckIcon size={15} className="text-emerald-500" /> Cancel anytime</span>
                    </div>

                    {/* Floating mock dashboard — 3D with animated gradient border */}
                    <div className="mt-20 mx-auto max-w-4xl" style={{ perspective: '1200px' }}>
                        <div className={`relative rounded-2xl overflow-hidden transition-transform duration-1000 hover:scale-[1.01]`}
                            style={{ transform: 'rotateX(4deg)' }}>
                            {/* Animated gradient border */}
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 opacity-40" style={{ animation: 'spin 8s linear infinite', backgroundSize: '200% 200%' }} />
                            <div className={`relative ${dark ? 'bg-[#0c0c14]' : 'bg-white'} rounded-2xl p-6 m-px`}>
                                {/* Window dots */}
                                <div className="flex items-center gap-1.5 mb-5">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                                    <span className={`text-[10px] ${txs} ml-3`}>sentinelsportslab.com/dashboard</span>
                                </div>
                                {/* Dashboard mockup */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    {[{ l: 'Athletes', v: '42', c: 'from-indigo-500/20 to-indigo-500/5', tc: 'text-indigo-400' },
                                      { l: 'Available', v: '38', c: 'from-emerald-500/20 to-emerald-500/5', tc: 'text-emerald-400' },
                                      { l: 'Flagged', v: '3', c: 'from-amber-500/20 to-amber-500/5', tc: 'text-amber-400' },
                                      { l: 'At Risk', v: '1', c: 'from-rose-500/20 to-rose-500/5', tc: 'text-rose-400' }
                                    ].map((c, i) => (
                                        <div key={i} className={`bg-gradient-to-b ${c.c} rounded-xl px-4 py-3 ${dark ? '' : 'border border-slate-100'}`}>
                                            <div className={`text-2xl font-bold ${dark ? c.tc : c.tc.replace('400', '600')}`}>{c.v}</div>
                                            <div className={`text-[9px] font-semibold uppercase tracking-wider ${txs}`}>{c.l}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className={`sm:col-span-2 ${dark ? 'bg-white/[0.02]' : 'bg-slate-50'} rounded-xl p-4`}>
                                        <div className={`text-[9px] font-semibold ${txs} uppercase tracking-wider mb-3`}>Team ACWR (7-Day)</div>
                                        <div className="flex items-end gap-[3px] h-20">
                                            {[30, 45, 55, 70, 85, 92, 78, 65, 88, 95, 72, 60, 80, 90, 75, 55, 68, 82, 93, 70].map((h, i) => (
                                                <div key={i} className={`flex-1 rounded-t-sm ${h > 80 ? 'bg-emerald-500' : h > 60 ? 'bg-amber-500' : 'bg-rose-500'} ${dark ? '' : 'opacity-80'}`}
                                                    style={{ height: `${h}%`, transition: `height 1s ease ${i * 50}ms` }} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-1 gap-3">
                                        <div className={`${dark ? 'bg-indigo-500/10' : 'bg-indigo-50 border border-indigo-100'} rounded-xl p-3`}>
                                            <div className={`text-[8px] font-semibold ${dark ? 'text-indigo-400' : 'text-indigo-500'} uppercase tracking-wider`}>Readiness</div>
                                            <div className={`text-2xl font-bold mt-1 ${dark ? 'text-indigo-300' : 'text-indigo-600'}`}>82</div>
                                        </div>
                                        <div className={`${dark ? 'bg-emerald-500/10' : 'bg-emerald-50 border border-emerald-100'} rounded-xl p-3`}>
                                            <div className={`text-[8px] font-semibold ${dark ? 'text-emerald-400' : 'text-emerald-500'} uppercase tracking-wider`}>Compliance</div>
                                            <div className={`text-2xl font-bold mt-1 ${dark ? 'text-emerald-300' : 'text-emerald-600'}`}>91%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CSS for gradient animation */}
                <style>{`@keyframes spin { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>
            </section>

            {/* ═══════ STATS ═══════ */}
            <section className={`py-12 sm:py-20 border-y ${dark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                <div ref={rStats.ref} style={rStats.style} className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-3 gap-4 sm:gap-8 text-center">
                    {[{ end: 80, s: '+', l: 'Testing Protocols' }, { end: 3700, s: '+', l: 'Exercise Library' }, { end: 45, s: '+', l: 'GPS Fields' }].map((s, i) => (
                        <div key={i} className="min-w-0">
                            <div className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent"><Counter end={s.end} suffix={s.s} /></div>
                            <div className={`text-xs sm:text-sm ${txm} mt-1 sm:mt-2 font-medium`}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════ FEATURES — BENTO ═══════ */}
            <section id="features" className="py-16 sm:py-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div ref={rFeatHead.ref} style={rFeatHead.style} className="text-center mb-20">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${dark ? 'bg-white/[0.05] border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'} border rounded-full text-xs font-semibold mb-5`}>
                            <LayersIcon size={12} /> Platform
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Everything you need</h2>
                        <p className={`mt-5 text-lg ${txm} max-w-lg mx-auto`}>Built for sport science professionals. One platform, no compromises.</p>
                    </div>

                    {/* Asymmetric bento grid with visual content */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:auto-rows-[180px]">

                        {/* ACWR Monitoring — large card with mini line chart */}
                        <div ref={rFeat1.ref} style={rFeat1.style} className={`group relative ${card} border rounded-2xl p-7 ${cardH} transition-all duration-500 overflow-hidden md:col-span-4 md:row-span-2`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500" />
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-4 shadow-lg">
                                        <GaugeIcon size={18} className="text-white" />
                                    </div>
                                    <h3 className="text-base font-semibold mb-2">ACWR Monitoring</h3>
                                    <p className={`text-sm ${txm} leading-relaxed max-w-xs`}>Acute:chronic workload ratios with EWMA. Individualized thresholds. Scenario modelling.</p>
                                </div>
                            </div>
                            {/* Mini ACWR line chart mockup */}
                            <div className={`mt-5 ${dark ? 'bg-white/[0.03]' : 'bg-slate-50'} rounded-xl p-4`}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-[8px] font-semibold ${txs} uppercase tracking-wider`}>Team ACWR Trend (28 days)</span>
                                    <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 text-[7px]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Optimal</span>
                                        <span className="flex items-center gap-1 text-[7px]"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Caution</span>
                                        <span className="flex items-center gap-1 text-[7px]"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Danger</span>
                                    </div>
                                </div>
                                {/* SVG line chart */}
                                <svg viewBox="0 0 300 80" className="w-full h-auto">
                                    {/* Zone bands */}
                                    <rect x="0" y="0" width="300" height="16" fill={dark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)'} rx="2" />
                                    <rect x="0" y="16" width="300" height="16" fill={dark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)'} rx="2" />
                                    <rect x="0" y="32" width="300" height="32" fill={dark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.04)'} rx="2" />
                                    <rect x="0" y="64" width="300" height="16" fill={dark ? 'rgba(56,189,248,0.06)' : 'rgba(56,189,248,0.04)'} rx="2" />
                                    {/* Zone labels */}
                                    <text x="4" y="10" className="text-[5px]" fill={dark ? '#94a3b8' : '#94a3b8'}>1.5+</text>
                                    <text x="4" y="26" className="text-[5px]" fill={dark ? '#94a3b8' : '#94a3b8'}>1.3</text>
                                    <text x="4" y="50" className="text-[5px]" fill={dark ? '#94a3b8' : '#94a3b8'}>0.8-1.3</text>
                                    <text x="4" y="74" className="text-[5px]" fill={dark ? '#94a3b8' : '#94a3b8'}>&lt;0.8</text>
                                    {/* ACWR line */}
                                    <polyline points="20,55 35,50 50,48 65,44 80,40 95,38 110,42 125,45 140,39 155,35 170,30 185,28 200,32 215,36 230,38 245,40 260,37 275,42 290,44"
                                        fill="none" stroke="url(#acwrGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    {/* Current dot */}
                                    <circle cx="290" cy="44" r="4" fill="#6366f1" stroke="white" strokeWidth="1.5" />
                                    <defs>
                                        <linearGradient id="acwrGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#22c55e" />
                                            <stop offset="50%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="flex items-center justify-between mt-2">
                                    <span className={`text-[8px] ${txs}`}>4 weeks ago</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold text-emerald-500">ACWR: 1.12</span>
                                        <span className="text-[7px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Optimal</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Wellness Surveillance */}
                        <div ref={rFeat2.ref} style={rFeat2.style} className={`group relative ${card} border rounded-2xl p-6 ${cardH} transition-all duration-500 overflow-hidden md:col-span-2`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-500 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500" />
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mb-3 shadow-lg">
                                <HeartIcon size={16} className="text-white" />
                            </div>
                            <h3 className="text-sm font-semibold mb-1.5">Wellness Surveillance</h3>
                            <p className={`text-xs ${txm} leading-relaxed mb-3`}>FIFA/IOC-aligned. Auto-flags.</p>
                            {/* Mini flag indicators */}
                            <div className="flex gap-1.5">
                                <div className="flex-1 bg-emerald-500/10 rounded-lg py-1.5 text-center"><span className="text-[8px] font-bold text-emerald-500">32</span><br/><span className={`text-[6px] ${txs}`}>OK</span></div>
                                <div className="flex-1 bg-amber-500/10 rounded-lg py-1.5 text-center"><span className="text-[8px] font-bold text-amber-500">4</span><br/><span className={`text-[6px] ${txs}`}>Amber</span></div>
                                <div className="flex-1 bg-rose-500/10 rounded-lg py-1.5 text-center"><span className="text-[8px] font-bold text-rose-500">2</span><br/><span className={`text-[6px] ${txs}`}>Red</span></div>
                            </div>
                        </div>

                        {/* Testing Hub */}
                        <div ref={rFeat3.ref} style={rFeat3.style} className={`group relative ${card} border rounded-2xl p-6 ${cardH} transition-all duration-500 overflow-hidden md:col-span-2`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500" />
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3 shadow-lg">
                                <FlaskConicalIcon size={16} className="text-white" />
                            </div>
                            <h3 className="text-sm font-semibold mb-1.5">Testing Hub</h3>
                            <p className={`text-xs ${txm} leading-relaxed mb-3`}>80+ protocols with norms.</p>
                            {/* Mini test badges */}
                            <div className="flex flex-wrap gap-1">
                                {['CMJ', 'IMTP', 'Sprint', 'FMS', 'InBody', 'RSI'].map(t => (
                                    <span key={t} className={`text-[7px] font-semibold px-1.5 py-0.5 rounded ${dark ? 'bg-white/[0.06] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{t}</span>
                                ))}
                            </div>
                        </div>

                        {/* Performance Intelligence — large card with readiness gauge */}
                        <div ref={rFeat4.ref} style={rFeat4.style} className={`group relative ${card} border rounded-2xl p-7 ${cardH} transition-all duration-500 overflow-hidden md:col-span-3 md:row-span-2`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500" />
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-4 shadow-lg">
                                <BrainIcon size={18} className="text-white" />
                            </div>
                            <h3 className="text-base font-semibold mb-2">Performance Intelligence</h3>
                            <p className={`text-sm ${txm} leading-relaxed mb-4`}>Readiness composites, dose-response, F-V profiling.</p>
                            {/* Readiness gauge mockup */}
                            <div className={`${dark ? 'bg-white/[0.03]' : 'bg-slate-50'} rounded-xl p-4`}>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 shrink-0">
                                        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                                            <circle cx="40" cy="40" r="34" fill="none" stroke={dark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'} strokeWidth="6" />
                                            <circle cx="40" cy="40" r="34" fill="none" stroke="url(#readGrad)" strokeWidth="6" strokeLinecap="round"
                                                strokeDasharray={`${0.82 * 213.6} ${213.6}`} />
                                            <defs><linearGradient id="readGrad"><stop offset="0%" stopColor="#06b6d4"/><stop offset="100%" stopColor="#6366f1"/></linearGradient></defs>
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-lg font-bold">82</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                        {[{ l: 'Load', v: 90, c: 'bg-emerald-500' }, { l: 'Recovery', v: 75, c: 'bg-cyan-500' }, { l: 'Performance', v: 85, c: 'bg-indigo-500' }, { l: 'Injury Risk', v: 70, c: 'bg-amber-500' }].map(d => (
                                            <div key={d.l} className="flex items-center gap-2">
                                                <span className={`text-[7px] ${txs} w-14 shrink-0`}>{d.l}</span>
                                                <div className={`flex-1 h-1.5 rounded-full ${dark ? 'bg-white/[0.05]' : 'bg-slate-200'}`}>
                                                    <div className={`h-full rounded-full ${d.c}`} style={{ width: `${d.v}%` }} />
                                                </div>
                                                <span className="text-[7px] font-bold w-5 text-right">{d.v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Workout Builder */}
                        <div ref={rFeat5.ref} style={rFeat5.style} className={`group relative ${card} border rounded-2xl p-6 ${cardH} transition-all duration-500 overflow-hidden md:col-span-3`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500" />
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3 shadow-lg">
                                <DumbbellIcon size={16} className="text-white" />
                            </div>
                            <h3 className="text-sm font-semibold mb-1.5">Workout Builder</h3>
                            <p className={`text-xs ${txm} leading-relaxed mb-3`}>Programs, packets, 3,700+ exercises.</p>
                            {/* Mini exercise pills */}
                            <div className="flex flex-wrap gap-1">
                                {['Back Squat', 'Bench Press', 'RDL', 'Pull-ups', 'Plyo'].map(e => (
                                    <span key={e} className={`text-[7px] font-medium px-2 py-0.5 rounded-full ${dark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{e}</span>
                                ))}
                            </div>
                        </div>

                        {/* GPS & Load Data */}
                        <div ref={rFeat6.ref} style={rFeat6.style} className={`group relative ${card} border rounded-2xl p-6 ${cardH} transition-all duration-500 overflow-hidden md:col-span-3`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500" />
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-3 shadow-lg">
                                <BarChart3Icon size={16} className="text-white" />
                            </div>
                            <h3 className="text-sm font-semibold mb-1.5">GPS & Load Data</h3>
                            <p className={`text-xs ${txm} leading-relaxed mb-3`}>Smart CSV auto-detection.</p>
                            {/* Mini bar chart */}
                            <div className="flex items-end gap-[3px] h-10">
                                {[40, 65, 55, 80, 70, 90, 60, 75, 85, 50].map((h, i) => (
                                    <div key={i} className={`flex-1 rounded-t-sm ${dark ? 'bg-violet-500/30' : 'bg-violet-200'}`} style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════ WHY US ═══════ */}
            <section id="why" className="py-32 relative overflow-hidden">
                {/* Always dark for this section */}
                <div className="absolute inset-0 bg-[#06060B]" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(6,182,212,0.1) 0%, transparent 50%)' }} />
                <div ref={rDiff.ref} style={rDiff.style} className="relative max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-full text-xs font-semibold text-indigo-400 mb-5">
                            <TargetIcon size={12} /> Competitive Edge
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">Features nobody else has</h2>
                        <p className="mt-5 text-lg text-slate-400 max-w-xl mx-auto">Enterprise capabilities that cost $10K+/year elsewhere. Self-service from day one.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl mx-auto">
                        {[
                            { icon: ShieldIcon, title: 'Individualized Thresholds', desc: 'Personal ACWR safe bands per athlete from their own data history.' },
                            { icon: ZapIcon, title: 'Force-Velocity Profiling', desc: 'F-V profiles from existing tests. No hardware needed.' },
                            { icon: BarChart3Icon, title: 'Dose-Response Analysis', desc: 'Did the training block produce performance gains?' },
                            { icon: LayersIcon, title: 'Smart CSV Detection', desc: 'Upload any file — system identifies the test type automatically.' },
                            { icon: HeartIcon, title: 'FIFA Wellness System', desc: 'Research-grade forms with auto-flag detection engine.' },
                            { icon: BrainIcon, title: 'Scenario Modelling', desc: 'Project future ACWR to plan within safe training bands.' },
                        ].map((d, i) => (
                            <div key={i} className="group p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/20 flex items-center justify-center mb-3 group-hover:from-indigo-500/30 group-hover:to-cyan-500/30 transition-all">
                                    <d.icon size={16} className="text-indigo-400" />
                                </div>
                                <h4 className="font-semibold text-white text-sm mb-1.5">{d.title}</h4>
                                <p className="text-[13px] text-slate-400 leading-relaxed">{d.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ MANIFESTO ═══════ */}
            <section className="py-32 relative overflow-hidden">
                <div className={`absolute inset-0 ${dark ? 'bg-[#06060B]' : 'bg-slate-950'}`} />
                {/* Subtle texture */}
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(99,102,241,0.06) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
                {/* Ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />

                <div ref={rVision.ref} style={rVision.style} className="relative max-w-4xl mx-auto px-4 sm:px-8 text-center">

                    {/* Opening statement — editorial */}
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-400 mb-10">Our Philosophy</p>

                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-[1.05]">
                        Not built for every system.
                        <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                            Built for those who refuse to guess.
                        </span>
                    </h2>

                    {/* Body — editorial medium */}
                    <div className="mt-14 max-w-2xl mx-auto space-y-6 text-lg text-slate-400 leading-relaxed text-left">
                        <p>
                            Sentinel exists to serve environments where decisions carry real weight — where time cannot be wasted and guesswork is not an option. We don't scale for the sake of reach. We refine for the sake of impact.
                        </p>
                        <p>
                            We partner with practitioners who hold their programs to a higher standard. Equipping them to move faster, act with conviction, and create an environment where the best decisions are also the most informed ones.
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="my-14 flex items-center gap-6 max-w-2xl mx-auto">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
                    </div>

                    {/* Closing declaration */}
                    <div className="space-y-2">
                        <p className={`text-xl sm:text-2xl font-semibold text-slate-500 line-through decoration-slate-600`}>
                            We don't promise more data.
                        </p>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                            We deliver conviction in every decision.
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══════ PRICING ═══════ */}
            <section id="pricing" className="py-16 sm:py-32">
                <div ref={rPrice.ref} style={rPrice.style} className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Simple pricing</h2>
                        <p className={`mt-5 text-lg ${txm} max-w-lg mx-auto`}>Start free. Scale as your team grows. Annual saves 20%.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        {[
                            { name: 'Starter', price: '$3', per: '/athlete/mo', desc: 'Personal trainers', features: ['Athlete roster', 'Exercise library', 'Workout builder', 'Basic testing', 'CSV import'], pop: false, cust: false },
                            { name: 'Pro', price: '$6', per: '/athlete/mo', desc: 'Sport scientists', features: ['Everything in Starter', 'ACWR monitoring', 'Wellness Hub', 'GPS smart mapping', '80+ test protocols', 'Injury tracking', 'Analytics hub'], pop: true, cust: false },
                            { name: 'Elite', price: '$10', per: '/athlete/mo', desc: 'Pro clubs', features: ['Everything in Pro', 'Individual thresholds', 'F-V profiling', 'Dose-response', 'Scenario modelling', 'Performance Intelligence', 'FIFA wellness'], pop: false, cust: false },
                            { name: 'Custom', price: "Let's talk", per: '', desc: 'Your way', features: ['Pick your features', 'White-label', 'Custom integrations', 'API access', 'Priority support', 'Dedicated onboarding'], pop: false, cust: true },
                        ].map((t, i) => (
                            <div key={i} className={`relative rounded-2xl p-6 flex flex-col transition-all duration-300 ${
                                t.pop ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 md:scale-[1.03] z-10 ring-1 ring-indigo-500'
                                : t.cust ? `${dark ? 'bg-gradient-to-b from-white/[0.05] to-white/[0.01] border border-white/[0.08]' : 'bg-slate-950 text-white'}`
                                : `${card} border ${cardH}`
                            }`}>
                                {t.pop && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-widest rounded-full">Popular</div>}
                                <h3 className="text-lg font-semibold">{t.name}</h3>
                                <p className={`text-sm mt-1 mb-5 ${t.pop ? 'text-indigo-200' : t.cust ? 'text-slate-400' : txm}`}>{t.desc}</p>
                                <div className="mb-6"><span className="text-3xl font-bold">{t.price}</span>{t.per && <span className={`text-sm ${t.pop ? 'text-indigo-200' : txm}`}>{t.per}</span>}</div>
                                <ul className={`space-y-2.5 text-[13px] mb-8 flex-1 ${t.pop ? 'text-indigo-100' : t.cust ? 'text-slate-300' : txm}`}>
                                    {t.features.map((f, j) => (
                                        <li key={j} className="flex items-start gap-2"><CheckIcon size={14} className={`mt-0.5 shrink-0 ${t.pop ? 'text-emerald-300' : 'text-emerald-500'}`} />{f}</li>
                                    ))}
                                </ul>
                                <button onClick={() => t.cust ? (window.location.href = 'mailto:hello@sentinelsportslab.com') : nav('/login')}
                                    className={`w-full py-3 font-semibold rounded-xl text-sm transition-all ${
                                        t.pop ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                                        : t.cust ? 'bg-white text-slate-900 hover:bg-slate-100'
                                        : dark ? 'border border-white/10 hover:border-indigo-500/40 hover:text-indigo-400' : 'border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}>
                                    {t.cust ? 'Contact Us' : 'Start Free'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════ FINAL CTA ═══════ */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700" />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                <div ref={rCta.ref} style={rCta.style} className="relative max-w-3xl mx-auto px-4 sm:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                        Precision over convenience.<br />Impact over reach.
                    </h2>
                    <p className="mt-6 text-lg text-indigo-200 max-w-xl mx-auto leading-relaxed">
                        If you hold your program to a higher standard, Sentinel was built for you.
                    </p>
                    <button onClick={() => nav('/login')}
                        className="mt-10 px-10 py-4 bg-white text-indigo-600 font-bold rounded-xl shadow-2xl hover:shadow-[0_20px_60px_rgba(255,255,255,0.2)] hover:bg-indigo-50 transition-all active:scale-[0.97] text-[15px]">
                        Start Your Free Trial
                    </button>
                </div>
            </section>

            {/* ═══════ FOOTER ═══════ */}
            <footer className="bg-[#04040A] text-slate-500 py-14">
                <div className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center"><ActivityIcon size={13} className="text-white" /></div>
                            <span className="font-semibold text-sm text-white tracking-tight">Sentinel <span className="text-indigo-400">SportsLab</span></span>
                        </div>
                        <div className="flex items-center gap-8 text-[13px]">
                            <a href="#features" className="hover:text-white transition-colors">Features</a>
                            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                            <button onClick={() => nav('/login')} className="hover:text-white transition-colors">Login</button>
                        </div>
                    </div>
                    <div className="mt-10 pt-6 border-t border-slate-800/50 text-center text-xs text-slate-600">
                        &copy; {new Date().getFullYear()} Sentinel SportsTech. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
