// @ts-nocheck
/**
 * LoginPage — split-panel auth with sliding indigo overlay.
 *
 * Pattern ported from Sentinel Football Hub's login.html (two form panels
 * always rendered side-by-side; a single overlay panel slides between them
 * to reveal the relevant form). Repalette'd to indigo/cyan for SportsLab.
 *
 * Modes: signin | signup | reset | update-password.
 * Signup additionally captures: first name, surname, organisation, plan tier.
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ActivityIcon, ArrowRightIcon, CheckIcon, ShieldIcon, UsersIcon, MailIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Mode = 'signin' | 'signup' | 'reset' | 'update-password';

interface PlanTier {
    id: 'basic' | 'performance' | 'elite' | 'custom';
    label: string;
    price: string;
    seats: string;          // Display label shown in the tile, e.g. "1 user"
    seatCap: number | null; // Numeric cap saved to user_metadata (null = custom)
    popular?: boolean;
}

const PLANS: PlanTier[] = [
    { id: 'basic',       label: 'Basic',       price: 'R1,449/mo',  seats: '1 user',      seatCap: 1 },
    { id: 'performance', label: 'Performance', price: 'R5,449/mo',  seats: 'Up to 3',     seatCap: 3, popular: true },
    { id: 'elite',       label: 'Elite',       price: 'R12,499/mo', seats: 'Up to 4',     seatCap: 4 },
    { id: 'custom',      label: 'Custom',      price: 'Contact us', seats: 'Custom seats', seatCap: null },
];

const inputCls = 'w-full px-3.5 py-2.5 bg-slate-50 border-[1.5px] border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 focus:bg-white transition-all';
const labelCls = 'block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1.5';

const LoginPage: React.FC<{ forceMode?: 'update-password' }> = ({ forceMode }) => {
    const { clearPasswordUpdate } = useAuth();
    const [searchParams] = useSearchParams();

    // Initial mode: forceMode wins (password recovery), then ?mode=signup
    // from the URL (used by "Get Started" CTAs in the nav, footer, hero, and
    // pricing tiles), otherwise default to sign-in.
    const initialMode: Mode = forceMode
        ?? (searchParams.get('mode') === 'signup' ? 'signup' : 'signin');
    const [mode, setMode] = useState<Mode>(initialMode);

    // When the page is opened from an invitation link, the accept-invite page
    // redirects with ?email=<the invited email>. We pre-fill it and lock the
    // field so the user can't accidentally sign up with a different address
    // (which would create a separate org instead of joining the inviting one).
    const lockedEmail = searchParams.get('email') || '';
    // Detect invite-signup mode: either an email is pre-filled from the
    // accept-invite redirect, OR there's a pending invite token still in
    // localStorage. In either case the user is joining an existing org —
    // they should NOT pick a new tier or type a new org name, both of which
    // are ignored by handle_new_user_signup() when an invitation exists
    // for the email and would otherwise just confuse the user.
    const hasPendingInviteToken = (() => {
        try { return !!localStorage.getItem('sentinel_pending_invite_token'); } catch { return false; }
    })();
    const isInviteSignup = !!lockedEmail || hasPendingInviteToken;

    // Shared fields
    const [email, setEmail] = useState(lockedEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const emailReadOnly = !!lockedEmail;

    // Signup-only fields
    const [firstName, setFirstName] = useState('');
    const [surname, setSurname] = useState('');
    const [organisation, setOrganisation] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<PlanTier['id']>('performance');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const switchMode = (m: Mode) => { setMode(m); setError(null); setMessage(null); };
    const isSignup = mode === 'signup';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const siteUrl = (import.meta as any).env?.VITE_SITE_URL || window.location.origin;

        try {
            if (mode === 'update-password') {
                if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
                if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
                const { error: err } = await supabase.auth.updateUser({ password });
                if (err) setError(err.message);
                else { setMessage('Password updated. Redirecting…'); clearPasswordUpdate(); }
            } else if (mode === 'signin') {
                const { error: err } = await supabase.auth.signInWithPassword({ email, password });
                if (err) setError(err.message);
            } else if (mode === 'signup') {
                if (!firstName.trim() || !surname.trim()) { setError('First name and surname are required.'); return; }
                // Org name is only required when self-serve signing up; invite signup
                // inherits the org from the invitation so we don't ask for it.
                if (!isInviteSignup && !organisation.trim()) { setError('Organisation is required.'); return; }
                if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
                if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
                const { error: err } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: siteUrl,
                        data: {
                            full_name: `${firstName.trim()} ${surname.trim()}`,
                            first_name: firstName.trim(),
                            surname: surname.trim(),
                            // For invite signups, omit org/plan metadata so
                            // handle_new_user_signup() skips the create-org block
                            // and the accept_org_invitation RPC handles membership.
                            ...(isInviteSignup ? {} : {
                                organization: organisation.trim(),
                                selected_plan: selectedPlan,
                                // Seat cap captured at signup so it can be enforced once
                                // the org/multi-user phase ships (see Gate 2.2 of
                                // plans/COMPLIANCE-LAUNCH-PLAN.md). null = custom tier.
                                selected_seat_cap: PLANS.find(p => p.id === selectedPlan)?.seatCap ?? null,
                            }),
                        },
                    },
                });
                if (err) setError(err.message);
                else setMessage('Check your email to confirm your account, then sign in.');
            } else if (mode === 'reset') {
                const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteUrl });
                if (err) setError(err.message);
                else setMessage('Password reset link sent — check your email.');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Update-password mode renders a simple single card (no split overlay) ──
    if (mode === 'update-password') {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                    <div className="flex items-center gap-2.5 mb-6">
                        <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-12 w-auto select-none" />
                        <span className="font-bold text-slate-900">Sentinel <span className="text-indigo-600">SportsLab</span></span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Set new password</h2>
                    <p className="text-sm text-slate-500 mb-6">Choose a new password for your account.</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className={labelCls}>New password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="Min 8 characters" /></div>
                        <div><label className={labelCls}>Confirm new password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="Repeat password" /></div>
                        {error && <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 text-[12px] text-rose-700 font-medium">{error}</div>}
                        {message && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-[12px] text-emerald-700 font-medium">{message}</div>}
                        <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm disabled:opacity-60 transition-colors">{loading ? 'Please wait…' : 'Update password'}</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e1b4b 40%, #312e81 100%)' }}
        >
            {/* Photo backdrop — null-safe. Missing file = gradient stays visible.
                Photo sits at ~30% opacity with a blur so the form card on top
                remains the focal point and text stays crisp. */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: 'url(/images/landing/auth-bg.jpg)', filter: 'blur(2px)' }}
            />
            {/* Vignette overlay — darkens edges so the card has clean separation */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(10,22,40,0) 30%, rgba(10,22,40,0.55) 100%)' }} />

            <div className="relative w-full max-w-5xl min-h-[640px] bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col lg:flex-row">

                {/* ── SIGN IN FORM (always left half on lg+) ───────────────────────
                    On mobile (<lg) only the active form renders — avoids a long
                    dual-form scroll. The overlay panel is hidden on mobile, so
                    the inline "Create an account →" button handles the switch. */}
                <div className={`lg:w-1/2 p-8 sm:p-12 lg:flex flex-col justify-center order-2 lg:order-1 ${isSignup ? 'hidden' : 'flex'}`}>
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Sign In</h1>
                    <p className="text-sm text-slate-500 mb-8">Welcome back to your performance dashboard.</p>
                    {!isSignup && error && <div className="bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-3 text-[12px] text-rose-700 font-medium mb-4">{error}</div>}
                    {!isSignup && message && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-3 text-[12px] text-emerald-700 font-medium mb-4">{message}</div>}

                    {mode !== 'reset' ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className={labelCls}>Email address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required readOnly={emailReadOnly} className={`${inputCls} ${emailReadOnly ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`} placeholder="coach@club.com" autoComplete="email" />
                                {emailReadOnly && <p className="text-[11px] text-slate-400 mt-1">From your invitation — can't be changed</p>}
                            </div>
                            <div><label className={labelCls}>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputCls} placeholder="Your password" autoComplete="current-password" /></div>
                            <button type="button" onClick={() => switchMode('reset')} className="block text-right text-[12px] text-indigo-600 hover:text-indigo-700 font-medium ml-auto -mt-1.5">Forgot password?</button>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm disabled:opacity-60 transition-colors">{loading ? 'Signing in…' : 'Sign In'}</button>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <p className="text-[12px] text-slate-600 mb-3">Enter your email — we'll send a reset link.</p>
                            <div>
                                <label className={labelCls}>Email address</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required readOnly={emailReadOnly} className={`${inputCls} ${emailReadOnly ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`} placeholder="coach@club.com" autoComplete="email" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm disabled:opacity-60 transition-colors">{loading ? 'Sending…' : 'Send reset link'}</button>
                            <button type="button" onClick={() => switchMode('signin')} className="w-full text-[12px] text-slate-500 hover:text-slate-700 mt-1">Back to sign in</button>
                        </form>
                    )}

                    {/* Mobile-only inline switch to signup */}
                    <div className="lg:hidden mt-6 pt-5 border-t border-slate-100 text-center">
                        <button onClick={() => switchMode('signup')} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700">Don't have an account? Create one →</button>
                    </div>
                </div>

                {/* ── SIGN UP FORM (always right half on lg+) ─────────────────────
                    On mobile (<lg) only renders when mode === 'signup'. */}
                <div className={`lg:w-1/2 p-5 sm:p-8 md:p-12 lg:flex flex-col justify-center order-3 lg:order-2 ${isSignup ? 'flex' : 'hidden'}`}>
                    {/* SUCCESS STATE — full panel takeover so the confirm-email step is impossible to miss.
                        For invite signups especially, the user needs to know they MUST verify before they can log in. */}
                    {isSignup && message && isInviteSignup ? (
                        <div className="text-center">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MailIcon size={26} className="text-emerald-600" />
                            </div>
                            <h2 className="text-xl font-extrabold text-slate-900 mb-2">Check your inbox</h2>
                            <p className="text-sm text-slate-600 leading-relaxed mb-1">
                                We've sent a confirmation link to
                            </p>
                            <p className="text-sm font-bold text-slate-900 mb-3">{email}</p>
                            <p className="text-[13px] text-slate-500 leading-relaxed mb-5 max-w-sm mx-auto">
                                Click the link in that email to verify your account, then sign in here — you'll be added to your organisation automatically.
                            </p>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3 text-left text-[11.5px] text-amber-800 leading-relaxed">
                                Didn't get the email? Check your spam folder, or ask the admin who invited you to resend the invitation if it's been more than a few minutes.
                            </div>
                        </div>
                    ) : (
                    <>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-1">
                        {isInviteSignup ? 'Join your organisation' : 'Create Account'}
                    </h1>
                    <p className="text-[13px] sm:text-sm text-slate-500 mb-5 sm:mb-6">
                        {isInviteSignup
                            ? 'Just set your name and password — your organisation and plan are inherited from the invitation.'
                            : 'Start managing your program smarter today.'}
                    </p>
                    {isSignup && error && <div className="bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-3 text-[12px] text-rose-700 font-medium mb-4">{error}</div>}
                    {isSignup && message && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-3 text-[12px] text-emerald-700 font-medium mb-4">{message}</div>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>First name *</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required className={inputCls} placeholder="First name" autoComplete="given-name" /></div>
                            <div><label className={labelCls}>Surname *</label><input type="text" value={surname} onChange={e => setSurname(e.target.value)} required className={inputCls} placeholder="Surname" autoComplete="family-name" /></div>
                        </div>
                        <div>
                            <label className={labelCls}>Email address *</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required readOnly={emailReadOnly} className={`${inputCls} ${emailReadOnly ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`} placeholder="coach@club.com" autoComplete="email" />
                            {emailReadOnly && <p className="text-[11px] text-slate-400 mt-1">From your invitation — can't be changed</p>}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className={labelCls}>Password *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="Min 8 characters" autoComplete="new-password" /></div>
                            <div><label className={labelCls}>Confirm *</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} className={inputCls} placeholder="Repeat password" autoComplete="new-password" /></div>
                        </div>
                        {/* Org name + plan picker only shown for self-serve signup — for
                            invite signup, the org and tier come from the inviting org and
                            handle_new_user_signup() skips the org-creation block entirely. */}
                        {!isInviteSignup && (
                            <>
                                <div><label className={labelCls}>Organisation *</label><input type="text" value={organisation} onChange={e => setOrganisation(e.target.value)} required={!isInviteSignup} className={inputCls} placeholder="e.g. Tuks FC, Northside Academy" autoComplete="organization" /></div>

                                {/* Plan picker */}
                                <div>
                                    <label className={labelCls}>Choose your plan</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PLANS.map(p => {
                                            const isSel = selectedPlan === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setSelectedPlan(p.id)}
                                                    className={`relative text-left px-3 py-2.5 rounded-lg border-[1.5px] transition-all ${
                                                        isSel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50'
                                                    }`}
                                                >
                                                    {p.popular && (
                                                        <span className="absolute -top-px right-2 text-[8.5px] font-bold uppercase tracking-wider bg-indigo-600 text-white px-1.5 py-0.5 rounded-b">Popular</span>
                                                    )}
                                                    {isSel && (
                                                        <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                                            <CheckIcon size={9} className="text-white" strokeWidth={3} />
                                                        </span>
                                                    )}
                                                    <span className="block text-[12.5px] font-bold text-slate-900 leading-tight">{p.label}</span>
                                                    <span className={`block text-[11px] ${isSel ? 'text-indigo-700 font-semibold' : 'text-slate-500'}`}>{p.price}</span>
                                                    <span className={`block text-[9.5px] font-bold uppercase tracking-wider mt-0.5 ${isSel ? 'text-indigo-600/80' : 'text-slate-400'}`}>{p.seats}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                            <ShieldIcon size={14} /> {loading ? 'Creating…' : (isInviteSignup ? 'Create Account & Join' : 'Create Account')}
                        </button>
                    </form>

                    {/* Mobile-only inline switch to signin */}
                    <div className="lg:hidden mt-6 pt-5 border-t border-slate-100 text-center">
                        <button onClick={() => switchMode('signin')} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700">Already have an account? Sign in →</button>
                    </div>
                    </>
                    )}
                </div>

                {/* ── SLIDING OVERLAY (lg+ only) ────────────────────────────────── */}
                <div
                    className="hidden lg:flex absolute top-0 right-0 w-1/2 h-full z-20 items-center justify-center overflow-hidden order-1 lg:order-3 transition-transform duration-[600ms]"
                    style={{
                        background: 'linear-gradient(150deg, #4338ca 0%, #6366f1 55%, #818cf8 100%)',
                        transform: isSignup ? 'translateX(-100%)' : 'translateX(0)',
                        transitionTimingFunction: 'cubic-bezier(0.76, 0, 0.24, 1)',
                    }}
                >
                    {/* Subtle dot pattern */}
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='20'/%3E%3C/g%3E%3C/svg%3E")` }} />

                    {/* Two overlay-content blocks, only one visible at a time */}
                    <div className={`absolute w-full px-10 py-12 text-center text-white transition-opacity duration-300 ${!isSignup ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <div className="flex items-center justify-center gap-2.5 mb-6">
                            <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-14 w-auto select-none brightness-0 invert opacity-95" />
                            <span className="text-sm font-bold opacity-90">Sentinel SportsLab</span>
                        </div>
                        <div className="mb-4"><UsersIcon size={42} className="mx-auto opacity-90" /></div>
                        <h2 className="text-2xl font-extrabold mb-3">Hey There!</h2>
                        <p className="text-sm opacity-85 leading-relaxed mb-7 max-w-[280px] mx-auto">
                            Begin your 21-day guided pilot.<br />
                            Monitor athletes, manage load, optimise performance — all in one place.
                        </p>
                        <button onClick={() => switchMode('signup')} className="inline-flex items-center gap-2 px-7 py-2.5 border-2 border-white/70 hover:border-white hover:bg-white/15 text-white text-sm font-bold rounded-full transition-all">
                            Get Started <ArrowRightIcon size={14} />
                        </button>
                    </div>

                    <div className={`absolute w-full px-10 py-12 text-center text-white transition-opacity duration-300 ${isSignup ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        <div className="flex items-center justify-center gap-2.5 mb-6">
                            <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-14 w-auto select-none brightness-0 invert opacity-95" />
                            <span className="text-sm font-bold opacity-90">Sentinel SportsLab</span>
                        </div>
                        <div className="mb-4"><ShieldIcon size={42} className="mx-auto opacity-90" /></div>
                        <h2 className="text-2xl font-extrabold mb-3">Welcome Back!</h2>
                        <p className="text-sm opacity-85 leading-relaxed mb-7 max-w-[280px] mx-auto">
                            Stay connected by signing in with your credentials and continue where you left off.
                        </p>
                        <button onClick={() => switchMode('signin')} className="inline-flex items-center gap-2 px-7 py-2.5 border-2 border-white/70 hover:border-white hover:bg-white/15 text-white text-sm font-bold rounded-full transition-all">
                            Sign In <ArrowRightIcon size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
