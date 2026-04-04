// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ActivityIcon, ShieldIcon, FlaskConicalIcon, GaugeIcon, HeartIcon,
    DumbbellIcon, BarChart3Icon, ZapIcon, CheckIcon, ArrowRightIcon,
    UsersIcon, TrendingUpIcon, ChevronRightIcon, MessageCircleIcon,
    SparklesIcon, LayersIcon, BrainIcon, TargetIcon,
} from 'lucide-react';

// ── Animated counter hook ──
const useCounter = (end: number, duration = 2000, start = 0) => {
    const [count, setCount] = useState(start);
    const ref = useRef<HTMLDivElement>(null);
    const started = useRef(false);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !started.current) {
                started.current = true;
                const startTime = Date.now();
                const tick = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
                    setCount(Math.round(start + (end - start) * eased));
                    if (progress < 1) requestAnimationFrame(tick);
                };
                tick();
            }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration, start]);
    return { count, ref };
};

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const stat1 = useCounter(80, 1800);
    const stat2 = useCounter(3700, 2200);
    const stat3 = useCounter(45, 1500);

    return (
        <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
            {/* ══════════ NAV ══════════ */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100/50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200">
                            <ActivityIcon size={16} className="text-white" />
                        </div>
                        <span className="font-bold text-base tracking-tight">
                            Sentinel <span className="text-indigo-600">SportsLab</span>
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
                        <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
                        <a href="#differentiators" className="hover:text-slate-900 transition-colors">Why Us</a>
                        <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2">Log in</button>
                        <button onClick={() => navigate('/login')} className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md">Get Started</button>
                    </div>
                </div>
            </nav>

            {/* ══════════ HERO ══════════ */}
            <section className="relative min-h-[90vh] flex items-center pt-16">
                {/* Animated background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50" />
                    {/* Floating orbs */}
                    <div className="absolute top-20 right-[10%] w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                    <div className="absolute top-1/2 right-[30%] w-48 h-48 bg-violet-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
                    {/* Grid pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                </div>

                <div className="relative max-w-6xl mx-auto px-6 w-full">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100/80 backdrop-blur-sm border border-indigo-200/50 rounded-full text-xs font-semibold text-indigo-600 mb-6">
                                <SparklesIcon size={12} /> Sports Science Intelligence Platform
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08]">
                                Monitor athletes.
                                <br />
                                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
                                    Optimise performance.
                                </span>
                            </h1>
                            <p className="mt-6 text-lg text-slate-500 leading-relaxed max-w-lg">
                                The all-in-one platform for sport scientists, S&C coaches, and trainers.
                                ACWR monitoring, wellness surveillance, 80+ testing protocols, and performance intelligence — all built on published research.
                            </p>
                            <div className="mt-8 flex flex-wrap items-center gap-4">
                                <button onClick={() => navigate('/login')}
                                    className="group flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-xl shadow-indigo-200/50 transition-all hover:shadow-2xl hover:shadow-indigo-300/50 active:scale-[0.98]">
                                    Start Free Trial <ArrowRightIcon size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                                <a href="#features" className="flex items-center gap-2 px-6 py-3.5 text-slate-600 font-medium hover:text-slate-900 transition-colors">
                                    Explore Features <ChevronRightIcon size={16} />
                                </a>
                            </div>
                            <div className="mt-10 flex items-center gap-6 text-sm text-slate-400">
                                <span className="flex items-center gap-1.5"><CheckIcon size={14} className="text-emerald-500" /> Free 14-day trial</span>
                                <span className="flex items-center gap-1.5"><CheckIcon size={14} className="text-emerald-500" /> No credit card</span>
                            </div>
                        </div>

                        {/* Visual — floating dashboard mockup with 3D perspective */}
                        <div className="hidden lg:block relative">
                            <div className="relative" style={{ perspective: '1000px' }}>
                                {/* Main card */}
                                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/50 p-5 transform rotate-y-[-3deg] rotate-x-[2deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700" style={{ transform: 'rotateY(-3deg) rotateX(2deg)' }}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-rose-400" />
                                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                                        <span className="text-[10px] text-slate-300 ml-2">sentinelsportslab.com/dashboard</span>
                                    </div>
                                    {/* Mock dashboard content */}
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-4 gap-2">
                                            {[{ label: 'Athletes', val: '42', color: 'bg-indigo-50 text-indigo-600' }, { label: 'Available', val: '38', color: 'bg-emerald-50 text-emerald-600' }, { label: 'Modified', val: '3', color: 'bg-amber-50 text-amber-600' }, { label: 'Flagged', val: '2', color: 'bg-rose-50 text-rose-600' }].map((c, i) => (
                                                <div key={i} className={`${c.color} rounded-lg px-3 py-2 text-center`}>
                                                    <div className="text-lg font-bold">{c.val}</div>
                                                    <div className="text-[8px] font-semibold uppercase tracking-wide opacity-60">{c.label}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3">
                                            <div className="text-[9px] font-semibold text-slate-400 uppercase mb-2">ACWR Distribution</div>
                                            <div className="flex items-end gap-1 h-16">
                                                {[35, 55, 70, 85, 95, 80, 65, 90, 75, 60, 50, 40].map((h, i) => (
                                                    <div key={i} className={`flex-1 rounded-t-sm transition-all duration-1000 ${h > 80 ? 'bg-emerald-400' : h > 60 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                                        style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 bg-indigo-50 rounded-lg p-2.5">
                                                <div className="text-[8px] font-semibold text-indigo-400 uppercase">Readiness</div>
                                                <div className="text-xl font-bold text-indigo-600">82<span className="text-xs">/100</span></div>
                                            </div>
                                            <div className="flex-1 bg-emerald-50 rounded-lg p-2.5">
                                                <div className="text-[8px] font-semibold text-emerald-400 uppercase">Compliance</div>
                                                <div className="text-xl font-bold text-emerald-600">91<span className="text-xs">%</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Shadow card behind */}
                                <div className="absolute -bottom-4 -right-4 -z-10 w-full h-full bg-indigo-100/50 rounded-2xl blur-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ STATS BAR ══════════ */}
            <section className="border-y border-slate-100 bg-white">
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <div className="grid grid-cols-3 gap-8 text-center" ref={stat1.ref}>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold text-indigo-600">{stat1.count}+</div>
                            <div className="text-sm text-slate-500 mt-1 font-medium">Testing Protocols</div>
                        </div>
                        <div ref={stat2.ref}>
                            <div className="text-4xl md:text-5xl font-bold text-indigo-600">{stat2.count.toLocaleString()}+</div>
                            <div className="text-sm text-slate-500 mt-1 font-medium">Exercise Library</div>
                        </div>
                        <div ref={stat3.ref}>
                            <div className="text-4xl md:text-5xl font-bold text-indigo-600">{stat3.count}+</div>
                            <div className="text-sm text-slate-500 mt-1 font-medium">GPS Data Fields Supported</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ FEATURES ══════════ */}
            <section id="features" className="py-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                            <LayersIcon size={12} /> Platform Features
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything you need, one platform</h2>
                        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
                            From daily wellness check-ins to advanced force-velocity profiling — built for sport science professionals.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            { icon: GaugeIcon, title: 'ACWR Monitoring', desc: 'Acute:chronic workload ratios with EWMA, individualized load thresholds, and scenario modelling.', gradient: 'from-indigo-500 to-violet-500' },
                            { icon: HeartIcon, title: 'Wellness Surveillance', desc: 'FIFA/IOC-aligned daily wellness forms with auto-flag detection. Red and amber flags trigger deep checks.', gradient: 'from-rose-500 to-pink-500' },
                            { icon: FlaskConicalIcon, title: 'Testing Hub', desc: '80+ protocols — CMJ, IMTP, NordBord, sprints, FMS, InBody. Normative data and benchmarking built in.', gradient: 'from-emerald-500 to-teal-500' },
                            { icon: BrainIcon, title: 'Performance Intelligence', desc: 'Readiness composites, dose-response analysis, and force-velocity profiling from existing test data.', gradient: 'from-cyan-500 to-blue-500' },
                            { icon: DumbbellIcon, title: 'Workout Builder', desc: 'Programs, packets, and periodization with 3,700+ exercises. Assign to teams or individuals.', gradient: 'from-amber-500 to-orange-500' },
                            { icon: BarChart3Icon, title: 'GPS & Load Data', desc: 'Smart CSV import auto-detects columns from Catapult, STATSports, Polar, and more.', gradient: 'from-violet-500 to-purple-500' },
                        ].map((f, i) => (
                            <div key={i} className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:border-transparent transition-all duration-300 overflow-hidden">
                                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                                    <f.icon size={20} className="text-white" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ DIFFERENTIATORS ══════════ */}
            <section id="differentiators" className="py-24 bg-slate-950 text-white relative overflow-hidden">
                {/* Background effect */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 50%, #06b6d4 0%, transparent 50%)' }} />
                <div className="relative max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold text-indigo-300 mb-4">
                            <TargetIcon size={12} /> What Makes Us Different
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Enterprise depth. Accessible pricing.</h2>
                        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                            Features that cost $10K+ per year on enterprise platforms — available from day one.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { title: 'Individualized Load Thresholds', desc: 'Personal ACWR safe bands per athlete — not generic zones.' },
                            { title: 'Force-Velocity Profiling', desc: 'F-V profiles from existing tests. No specialized hardware.' },
                            { title: 'Dose-Response Analysis', desc: 'Did the training block work? Load vs. performance delta.' },
                            { title: 'Smart CSV Auto-Detection', desc: 'Upload any CSV. System detects and maps columns.' },
                            { title: 'FIFA/IOC Wellness System', desc: 'Research-grade forms aligned with Waldén et al. (2023).' },
                            { title: 'Scenario Modelling', desc: 'Project future ACWR from planned loads.' },
                        ].map((item, i) => (
                            <div key={i} className="group p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-3">
                                    <CheckIcon size={16} className="text-white" />
                                </div>
                                <h4 className="font-semibold text-white mb-1.5">{item.title}</h4>
                                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════ PRICING ══════════ */}
            <section id="pricing" className="py-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                            Simple Pricing
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Start free. Scale as you grow.</h2>
                        <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">No hidden fees. Annual billing saves 20%.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Starter */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col hover:shadow-lg transition-shadow">
                            <h3 className="text-lg font-semibold text-slate-900">Starter</h3>
                            <p className="text-sm text-slate-400 mt-1 mb-5">Personal trainers & small teams</p>
                            <div className="mb-6"><span className="text-4xl font-bold">$3</span><span className="text-sm text-slate-400">/athlete/mo</span></div>
                            <ul className="space-y-2.5 text-sm text-slate-600 mb-8 flex-1">
                                {['Athlete roster', 'Exercise library (3,700+)', 'Workout builder', 'Basic testing', 'Session scheduling', 'CSV import'].map((f, i) => (
                                    <li key={i} className="flex items-start gap-2"><CheckIcon size={14} className="text-emerald-500 mt-0.5 shrink-0" />{f}</li>
                                ))}
                            </ul>
                            <button onClick={() => navigate('/login')} className="w-full py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all text-sm">Start Free Trial</button>
                        </div>

                        {/* Pro */}
                        <div className="relative bg-indigo-600 text-white rounded-2xl p-6 flex flex-col shadow-2xl shadow-indigo-200/50 ring-1 ring-indigo-500 scale-[1.02]">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">Most Popular</div>
                            <h3 className="text-lg font-semibold">Pro</h3>
                            <p className="text-sm text-indigo-200 mt-1 mb-5">Sport scientists & S&C coaches</p>
                            <div className="mb-6"><span className="text-4xl font-bold">$6</span><span className="text-sm text-indigo-200">/athlete/mo</span></div>
                            <ul className="space-y-2.5 text-sm text-indigo-100 mb-8 flex-1">
                                {['Everything in Starter', 'ACWR monitoring', 'Wellness Hub + forms', 'GPS smart mapping', '80+ test protocols', 'Injury tracking', 'Analytics hub', 'Smart CSV detection'].map((f, i) => (
                                    <li key={i} className="flex items-start gap-2"><CheckIcon size={14} className="text-emerald-300 mt-0.5 shrink-0" />{f}</li>
                                ))}
                            </ul>
                            <button onClick={() => navigate('/login')} className="w-full py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-all text-sm">Start Free Trial</button>
                        </div>

                        {/* Elite */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col hover:shadow-lg transition-shadow">
                            <h3 className="text-lg font-semibold text-slate-900">Elite</h3>
                            <p className="text-sm text-slate-400 mt-1 mb-5">Pro clubs & federations</p>
                            <div className="mb-6"><span className="text-4xl font-bold">$10</span><span className="text-sm text-slate-400">/athlete/mo</span></div>
                            <ul className="space-y-2.5 text-sm text-slate-600 mb-8 flex-1">
                                {['Everything in Pro', 'Individualized thresholds', 'F-V profiling', 'Dose-response analysis', 'Scenario modelling', 'Performance Intelligence', 'Benchmarking engine', 'FIFA wellness system'].map((f, i) => (
                                    <li key={i} className="flex items-start gap-2"><CheckIcon size={14} className="text-emerald-500 mt-0.5 shrink-0" />{f}</li>
                                ))}
                            </ul>
                            <button onClick={() => navigate('/login')} className="w-full py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all text-sm">Start Free Trial</button>
                        </div>

                        {/* Custom */}
                        <div className="bg-slate-950 text-white rounded-2xl p-6 flex flex-col relative overflow-hidden">
                            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #6366f1 0%, transparent 70%)' }} />
                            <div className="relative">
                                <h3 className="text-lg font-semibold">Custom</h3>
                                <p className="text-sm text-slate-400 mt-1 mb-5">Tailored to your needs</p>
                                <div className="mb-6"><span className="text-2xl font-bold">Let's talk</span></div>
                                <ul className="space-y-2.5 text-sm text-slate-300 mb-8 flex-1">
                                    {['Pick features you need', 'Remove what you don\'t', 'Custom integrations', 'White-label option', 'Dedicated onboarding', 'Priority support', 'API access', 'Multi-team management'].map((f, i) => (
                                        <li key={i} className="flex items-start gap-2"><CheckIcon size={14} className="text-emerald-400 mt-0.5 shrink-0" />{f}</li>
                                    ))}
                                </ul>
                                <button onClick={() => window.location.href = 'mailto:hello@sentinelsportslab.com'} className="w-full py-2.5 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all text-sm flex items-center justify-center gap-2"><MessageCircleIcon size={14} /> Contact Us</button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ FINAL CTA ══════════ */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700" />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                <div className="relative max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Ready to elevate your sport science?</h2>
                    <p className="mt-4 text-lg text-indigo-200 max-w-xl mx-auto">
                        Join sport scientists and S&C coaches using research-backed tools to monitor, test, and optimise athlete performance.
                    </p>
                    <button onClick={() => navigate('/login')}
                        className="mt-8 px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl shadow-xl hover:shadow-2xl hover:bg-indigo-50 transition-all active:scale-[0.98] text-base">
                        Start Your Free Trial
                    </button>
                </div>
            </section>

            {/* ══════════ FOOTER ══════════ */}
            <footer className="bg-slate-950 text-slate-400 py-12">
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
