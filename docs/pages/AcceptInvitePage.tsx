// @ts-nocheck
/**
 * AcceptInvitePage — landing page for /accept-invite/:token magic links.
 *
 * Flow:
 *   1. Read token from URL, call get_invitation_info() RPC (public, no auth).
 *   2. If invalid (expired / revoked / already accepted / not found) → show the reason.
 *   3. If valid AND no user is signed in → prompt sign-in with the invited email
 *      and remember the token via localStorage so we can resume after signin.
 *   4. If valid AND signed in with wrong email → prompt sign-out + correct sign-in.
 *   5. If valid AND signed in with correct email → "Accept invitation" button →
 *      accept_org_invitation() RPC → redirect to /dashboard.
 *
 * Light-mode locked via useForceLightMode (it's a public-facing link page).
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ActivityIcon, MailIcon, CheckCircle2Icon, AlertCircleIcon, ArrowRightIcon, LogOutIcon } from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { useAuth } from '../context/AuthContext';
import { useForceLightMode } from '../hooks/useForceLightMode';
import { supabase } from '../lib/supabase';

const TOKEN_STORAGE_KEY = 'sentinel_pending_invite_token';

const AcceptInvitePage: React.FC = () => {
    useForceLightMode();
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    const [info, setInfo] = useState<any>(null);
    const [infoLoading, setInfoLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [acceptError, setAcceptError] = useState<string | null>(null);
    const [accepted, setAccepted] = useState(false);

    // Fetch the invitation info on mount
    useEffect(() => {
        let cancelled = false;
        if (!token) {
            setInfoLoading(false);
            return;
        }
        (async () => {
            try {
                const data = await DatabaseService.getInvitationInfo(token);
                if (!cancelled) setInfo(data);
            } catch (err) {
                if (!cancelled) setInfo({ is_valid: false, invalid_reason: (err as any)?.message || 'Failed to load invitation' });
            } finally {
                if (!cancelled) setInfoLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    // Stash the token in localStorage so /login or signup can pick it back up.
    // We retain it until acceptance completes or the user explicitly cancels.
    useEffect(() => {
        if (token) try { localStorage.setItem(TOKEN_STORAGE_KEY, token); } catch {}
    }, [token]);

    const emailMatches = info?.email && user?.email
        && info.email.toLowerCase() === user.email.toLowerCase();

    const handleAccept = async () => {
        if (!token) return;
        setAccepting(true);
        setAcceptError(null);
        try {
            await DatabaseService.acceptOrgInvitation(token);
            try { localStorage.removeItem(TOKEN_STORAGE_KEY); } catch {}
            setAccepted(true);
            // Brief celebration, then redirect into the app
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err: any) {
            setAcceptError(err?.message || 'Failed to accept invitation');
            setAccepting(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        // Stay on this page; once signed out, the UI re-renders to "sign in" prompt
    };

    // ── Render states ────────────────────────────────────────────────────

    const Shell = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 dark:border-[#243A58] p-8">
                <Link to="/" className="flex items-center justify-center gap-2.5 mb-6">
                    <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-12 w-auto select-none" />
                    <span className="font-bold text-slate-900">Sentinel <span className="text-indigo-600">SportsLab</span></span>
                </Link>
                {children}
            </div>
        </div>
    );

    if (infoLoading || authLoading) {
        return (
            <Shell>
                <p className="text-center text-sm text-slate-500">Loading invitation…</p>
            </Shell>
        );
    }

    if (!info || !info.is_valid) {
        // CRITICAL: clear the pending token so Router doesn't loop us back here.
        // Without this, navigating "Back to home" while signed in re-redirects to
        // /accept-invite/:token (Router reads the same stale token from localStorage).
        try { localStorage.removeItem(TOKEN_STORAGE_KEY); } catch {}
        return (
            <Shell>
                <div className="text-center">
                    <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircleIcon size={28} className="text-rose-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Invitation not available</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        {info?.invalid_reason || 'We couldn’t find this invitation. The link may have been mistyped.'}
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                        Back to home
                    </Link>
                </div>
            </Shell>
        );
    }

    if (accepted) {
        return (
            <Shell>
                <div className="text-center">
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2Icon size={28} className="text-emerald-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">You're in!</h1>
                    <p className="text-sm text-slate-500 mb-2">Welcome to <strong className="text-slate-900">{info.organisation_name}</strong>.</p>
                    <p className="text-xs text-slate-400">Redirecting to your dashboard…</p>
                </div>
            </Shell>
        );
    }

    // Valid invitation + not signed in
    if (!user) {
        return (
            <Shell>
                <div className="text-center">
                    <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MailIcon size={28} className="text-indigo-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-1">You've been invited</h1>
                    <p className="text-sm text-slate-500 mb-1">
                        to join <strong className="text-slate-900">{info.organisation_name}</strong>
                    </p>
                    <p className="text-xs text-slate-400 mb-6">
                        as a <span className="font-semibold uppercase tracking-wider">{info.role}</span>
                    </p>
                    <div className="bg-slate-50 border border-slate-200 dark:border-[#243A58] rounded-lg p-4 mb-5 text-left">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Invited email</p>
                        <p className="text-sm font-semibold text-slate-900">{info.email}</p>
                        <p className="text-[11px] text-slate-500 mt-1">Sign in or sign up with this email to accept.</p>
                    </div>
                    <button
                        onClick={() => navigate(`/login?mode=signup&email=${encodeURIComponent(info.email)}`)}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors mb-2"
                    >
                        Continue <ArrowRightIcon size={14} />
                    </button>
                    <p className="text-[11px] text-slate-400">
                        Already have an account?{' '}
                        <button onClick={() => navigate(`/login?email=${encodeURIComponent(info.email)}`)} className="text-indigo-600 hover:underline font-semibold">
                            Sign in
                        </button>
                    </p>
                </div>
            </Shell>
        );
    }

    // Signed in with the wrong email
    if (!emailMatches) {
        return (
            <Shell>
                <div className="text-center">
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircleIcon size={28} className="text-amber-600" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Email mismatch</h1>
                    <p className="text-sm text-slate-500 mb-1">
                        This invitation is for <strong className="text-slate-900">{info.email}</strong>
                    </p>
                    <p className="text-sm text-slate-500 mb-6">
                        You're signed in as <strong className="text-slate-900">{user.email}</strong>.
                    </p>
                    <button
                        onClick={handleSignOut}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition-colors mb-2"
                    >
                        <LogOutIcon size={14} /> Sign out and use {info.email}
                    </button>
                    {/* Dismiss escape — clears the pending token so Router stops
                        bouncing them back here every time they navigate. */}
                    <button
                        onClick={() => {
                            try { localStorage.removeItem(TOKEN_STORAGE_KEY); } catch {}
                            navigate('/dashboard');
                        }}
                        className="w-full py-2 text-[12px] text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]"
                    >
                        Dismiss this invitation
                    </button>
                </div>
            </Shell>
        );
    }

    // Valid + signed in with right email — accept!
    return (
        <Shell>
            <div className="text-center">
                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MailIcon size={28} className="text-indigo-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">Ready to join</h1>
                <p className="text-sm text-slate-500 mb-1">
                    Accept your invitation to <strong className="text-slate-900">{info.organisation_name}</strong>
                </p>
                <p className="text-xs text-slate-400 mb-6">
                    as a <span className="font-semibold uppercase tracking-wider">{info.role}</span>
                </p>
                {acceptError && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 text-left">
                        <p className="text-[12px] text-rose-700 font-medium mb-1">{acceptError}</p>
                        {/* The accept_org_invitation RPC raises this exact message when the
                            user is already in an org that has athletes/teams/wellness/loads.
                            Surface a clear next-step so users aren't stuck. */}
                        {acceptError.toLowerCase().includes('already belong') && (
                            <p className="text-[11px] text-rose-600 leading-relaxed">
                                Multi-org membership isn't supported yet. Ask an admin in your current organisation
                                to remove your data + membership before accepting this invitation. Alternatively,
                                contact <a href="mailto:support@sentinelsportslab.com" className="underline font-semibold">support@sentinelsportslab.com</a> and
                                we'll help you migrate.
                            </p>
                        )}
                    </div>
                )}
                <button
                    onClick={handleAccept}
                    disabled={accepting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {accepting ? 'Accepting…' : 'Accept invitation'}{!accepting && <ArrowRightIcon size={14} />}
                </button>
                {/* Escape hatch — if accept keeps failing (e.g. unresolvable "already belong"
                    case), let the user dismiss so Router stops looping them back to this page. */}
                {acceptError && (
                    <button
                        onClick={() => {
                            try { localStorage.removeItem(TOKEN_STORAGE_KEY); } catch {}
                            navigate('/dashboard');
                        }}
                        className="w-full mt-2 py-2 text-[12px] text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]"
                    >
                        Dismiss this invitation
                    </button>
                )}
            </div>
        </Shell>
    );
};

export default AcceptInvitePage;
