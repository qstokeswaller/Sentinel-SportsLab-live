// @ts-nocheck
/**
 * Landing Page V5 — Flip card features, visual Why Us
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ActivityIcon, CheckIcon, ArrowRightIcon, ChevronRightIcon,
    SparklesIcon, SunIcon, MoonIcon,
    GaugeIcon, HeartIcon, FlaskConicalIcon, BrainIcon, DumbbellIcon, BarChart3Icon,
    ShieldIcon, ZapIcon, TargetIcon, LayersIcon, MapPinIcon, ClipboardListIcon,
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

    const rHero = useReveal(100);
    const rStats = useReveal();
    const rFeatHead = useReveal();
    const rFeatGrid = useReveal(100);
    const rDiff = useReveal();
    const rVision = useReveal(100);
    const rPrice = useReveal();
    const rCta = useReveal();

    const bg = dark ? '#06060B' : '#FFFFFF';
    const tx = dark ? 'text-white' : 'text-slate-900';
    const txm = dark ? 'text-slate-400' : 'text-slate-500';
    const txs = dark ? 'text-slate-500' : 'text-slate-400';
    const card = dark ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-200';
    const cardH = dark ? 'hover:bg-white/[0.06] hover:border-white/[0.12]' : 'hover:shadow-xl hover:border-slate-300';
    const glass = dark ? 'bg-white/[0.05] backdrop-blur-2xl border-white/[0.08]' : 'bg-white/80 backdrop-blur-2xl border-slate-200/80';

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
                                <span key={m} className={`text-[7px] px-1.5 py-0.5 rounded font-medium ${dark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600'}`}>{m}</span>
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
                        <div key={r.label} className={`flex items-center justify-between px-2 py-1.5 border-b ${dark ? 'border-white/[0.05]' : 'border-slate-200'} last:border-0`}>
                            <span className={`text-[8px] font-semibold ${r.color}`}>{r.label}</span>
                            <span className="text-[7px] font-bold text-emerald-400">✓ mapped</span>
                        </div>
                    ))}
                    <div className={`text-[8px] text-center mt-1.5 ${txs}`}>Polar compatible · any GPS CSV export</div>
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
                    <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${dark ? 'rgba(255,255,255,0.03)' : 'rgba(99,102,241,0.04)'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
                </div>

                <div ref={rHero.ref} style={rHero.style} className="relative max-w-7xl mx-auto px-4 sm:px-8 text-center">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 ${dark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'} border rounded-full text-xs font-semibold mb-10`}>
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
                                        <div key={i} className={`bg-gradient-to-b ${c.c} rounded-xl px-4 py-3 ${dark ? '' : 'border border-slate-100'}`}>
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
                <style>{`@keyframes spin { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }`}</style>
            </section>

            {/* ═══════ STATS ═══════ */}
            <section className={`py-12 sm:py-20 border-y ${dark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                <div ref={rStats.ref} style={rStats.style} className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-3 gap-4 sm:gap-8 text-center">
                    {[
                        { end: 80, s: '+', l: 'Testing Protocol Documents' },
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
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${dark ? 'bg-white/[0.05] border-white/[0.08] text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'} border rounded-full text-xs font-semibold mb-5`}>
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
                                        <div className={`mt-5 pt-4 border-t ${dark ? 'border-white/[0.07]' : 'border-slate-100'} flex items-center gap-1.5`} style={{ color: f.gFrom }}>
                                            <span className="text-[11px] font-semibold">Explore feature</span>
                                            <ChevronRightIcon size={13} />
                                        </div>
                                    </div>

                                    {/* BACK */}
                                    <div
                                        style={{ backfaceVisibility: 'hidden' as any, WebkitBackfaceVisibility: 'hidden' as any, transform: 'rotateY(180deg)', position: 'absolute', inset: 0 }}
                                        className={`${dark ? 'bg-[#0e0e1a] border-white/[0.09]' : 'bg-slate-50 border-slate-200'} border rounded-2xl p-6 flex flex-col overflow-hidden`}
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
                    <div className="space-y-2">
                        <p className="text-xl sm:text-2xl font-semibold text-slate-500 line-through decoration-slate-600">We don't promise more data.</p>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">We deliver conviction in every decision.</p>
                    </div>
                </div>
            </section>

            {/* ═══════ PRICING ═══════ */}
            <section id="pricing" className="py-16 sm:py-32">
                <div ref={rPrice.ref} style={rPrice.style} className="max-w-7xl mx-auto px-4 sm:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Simple, transparent pricing</h2>
                        <p className={`mt-5 text-lg ${txm} max-w-lg mx-auto`}>Start free for 14 days. Choose the tier that fits your program.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        {[
                            {
                                name: 'Basic', price: 'R1,000', per: '/month',
                                desc: 'Core platform for individual practitioners',
                                features: ['Dashboard & squad readiness','Athlete roster management','Workout builder (3,700+ exercises)','Tonnage & session tracking','Testing Hub — 80+ protocols','Exercise library & catalogues','Session calendar & scheduling'],
                                pop: false, cust: false,
                            },
                            {
                                name: 'Performance', price: 'R7,500', per: '/month',
                                desc: 'Everything in Basic, plus welfare & conditioning',
                                features: ['Everything in Basic','Wellness Hub — daily & weekly forms','FIFA/IOC wellness surveillance','Auto-flag & medical alert system','Conditioning Hub','Wattbike & HR monitoring','Injury & illness tracking'],
                                pop: true, cust: false,
                            },
                            {
                                name: 'Elite', price: 'R12,550', per: '/month',
                                desc: 'Full platform — every feature unlocked',
                                features: ['Everything in Performance','ACWR load monitoring (EWMA)','GPS & load intelligence','Reporting Hub with GPS Insights','Analytics Hub (5 terminals)','Scenario modelling & F-V profiling','Periodization planner'],
                                pop: false, cust: false,
                            },
                            {
                                name: 'Custom', price: 'Contact us', per: '',
                                desc: 'Pick exactly the features you need — we quote accordingly',
                                features: ['Choose any combination of features','Pay only for what you use','Dedicated onboarding session','Priority support channel','Custom integrations on request','White-label options available'],
                                pop: false, cust: true,
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
                                    <span className="text-2xl font-bold">{t.price}</span>
                                    {t.per && <span className={`text-sm ml-1 ${t.pop ? 'text-indigo-200' : txm}`}>{t.per}</span>}
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
                                    onClick={() => t.cust ? (window.location.href = 'mailto:hello@sentinelsportslab.com') : nav('/login')}
                                    className={`w-full py-3 font-semibold rounded-xl text-sm transition-all ${
                                        t.pop
                                            ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                                            : t.cust
                                                ? 'bg-white text-slate-900 hover:bg-slate-100'
                                                : dark
                                                    ? 'border border-white/10 hover:border-indigo-500/40 hover:text-indigo-400'
                                                    : 'border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                                    }`}>
                                    {t.cust ? 'Get a Quote' : 'Start Free Trial'}
                                </button>
                                {t.cust && (
                                    <p className={`text-[10px] text-center mt-3 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Tell us which features you need.<br />We'll build a package around your program.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                    <p className={`text-center text-xs mt-10 ${txs}`}>All prices exclude VAT. Free 14-day trial on all tiers — no credit card required.</p>
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
