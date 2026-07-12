// @ts-nocheck — moved verbatim from SettingsPage.tsx (monolith restructure,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TIER_LABEL, type Tier } from '../../utils/tierFeatures';
import { inputCls } from './shared';
import { AlertCircleIcon, CheckCircle2Icon, LifeBuoyIcon, MailIcon, MessageSquareIcon, SendIcon } from 'lucide-react';


const SUPPORT_CATEGORIES = [
  { id: 'bug',      label: 'Report a bug',       icon: AlertCircleIcon,   desc: 'Something is broken or behaving unexpectedly' },
  { id: 'feature',  label: 'Feature request',    icon: MessageSquareIcon, desc: 'Idea or improvement you would like to see' },
  { id: 'support',  label: 'General support',    icon: LifeBuoyIcon,      desc: 'Need help using a feature, account, or data' },
  { id: 'sales',    label: 'Billing & plans',    icon: MailIcon,          desc: 'Tier changes, invoices, seats, renewals' },
] as const;

type SupportCategory = typeof SUPPORT_CATEGORIES[number]['id'];

interface SupportTabProps {
  currentOrg: any;
  authUserEmail?: string;
  authUserName?: string;
  currentUserRole?: 'admin' | 'member' | null;
  showToast?: (msg: string, kind?: string) => void;
}

const SupportTab: React.FC<SupportTabProps> = ({ currentOrg, authUserEmail, authUserName, currentUserRole, showToast }) => {
  const [category, setCategory]   = useState<SupportCategory>('support');
  const [name, setName]           = useState(authUserName || '');
  const [email, setEmail]         = useState(authUserEmail || '');
  const [subject, setSubject]     = useState('');
  const [message, setMessage]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Re-sync defaults when org/user info finishes loading
  useEffect(() => { if (authUserName && !name) setName(authUserName); }, [authUserName]);
  useEffect(() => { if (authUserEmail && !email) setEmail(authUserEmail); }, [authUserEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!message.trim()) { setError('Please describe your request.'); return; }
    setError(null);
    setSubmitting(true);
    // Compose a rich message body that includes platform context so support has
    // everything they need without asking follow-up questions.
    const contextLines = [
      `[Submitted from Settings → Help & Support]`,
      currentOrg?.name      ? `Organisation: ${currentOrg.name}`          : null,
      currentOrg?.tier      ? `Tier: ${currentOrg.tier}`                  : null,
      currentUserRole       ? `Role: ${currentUserRole}`                  : null,
      typeof window !== 'undefined' ? `Current URL: ${window.location.href}` : null,
      navigator?.userAgent  ? `User Agent: ${navigator.userAgent}`         : null,
    ].filter(Boolean).join('\n');
    const bodyText = `${subject ? `Subject: ${subject}\n\n` : ''}${message.trim()}\n\n---\n${contextLines}`;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: category,
          name: name.trim() || (authUserEmail?.split('@')[0] ?? 'Platform user'),
          email: email.trim() || authUserEmail,
          organisation: currentOrg?.name || '',
          message: bodyText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not send your message. Please try again.');
      } else {
        setSent(true);
        showToast?.('Message sent — we will reply soon', 'success');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error — check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white dark:bg-[#132338] border-2 border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-8 text-center shadow-sm">
        <CheckCircle2Icon size={42} className="text-emerald-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0] mb-1">Message received</h3>
        <p className="text-[13px] text-slate-500 dark:text-[#CBD5E1] leading-relaxed mb-5 max-w-md mx-auto">
          Thanks {name.split(' ')[0] || 'there'} — we'll reply within one business day. If urgent, email
          <a href="mailto:support@sentinelsportslab.com" className="text-indigo-600 dark:text-indigo-300 font-semibold"> support@sentinelsportslab.com</a>.
        </p>
        <button
          onClick={() => { setSent(false); setSubject(''); setMessage(''); }}
          className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700"
        >
          Send another message →
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Help & Support</h2>
        <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">
          Reach us directly from the platform. We auto-attach your organisation + tier so we have context.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 space-y-5 shadow-sm">
        {/* Context summary — read-only badges so user can confirm what we'll receive */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1]">
            <strong>Org:</strong> {currentOrg?.name || '—'}
          </span>
          {currentOrg?.tier && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold">
              {(TIER_LABEL[currentOrg.tier as Tier] || currentOrg.tier)} plan
            </span>
          )}
          {currentUserRole && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#94A3B8] capitalize">
              {currentUserRole}
            </span>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">What's this about?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUPPORT_CATEGORIES.map(c => {
              const isSel = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] text-left transition-all ${
                    isSel
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-500/40'
                  }`}
                >
                  <c.icon size={14} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold">{c.label}</div>
                    <div className="text-[10.5px] text-slate-500 dark:text-[#94A3B8] leading-snug mt-0.5">{c.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">Your name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">Reply-to email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
          </div>
        </div>

        {/* Subject (optional one-liner) */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">Subject (optional)</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={category === 'bug' ? 'e.g. ACWR chart blank for Tshepo' : category === 'feature' ? 'e.g. Add Catapult v2 column mapper' : 'A short headline for your message'}
            className={inputCls}
            maxLength={120}
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={6}
            maxLength={5000}
            placeholder={category === 'bug'
              ? 'Steps to reproduce, what you expected, what happened, any screenshots you can email us as a follow-up...'
              : 'Tell us what you need — the more detail the faster we can help.'}
            className={inputCls + ' resize-y'}
          />
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1">{message.length}/5000</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[12px]">
            <AlertCircleIcon size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1A2D48]">
          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8]">
            We reply within one business day. Reply-to is set to your email.
          </p>
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-[#243A58] dark:disabled:text-[#475569] text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <SendIcon size={13} /> {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </form>
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════
// Main Settings Page
// ══════════════════════════════════════════════════════════════════════

export const SettingsSupport: React.FC<any> = ({
    currentOrg,
    currentUserRole,
    showToast,
    user,
}) => {
    return (<>
          <SupportTab
            currentOrg={currentOrg}
            authUserEmail={user?.email}
            authUserName={user?.user_metadata?.full_name || ''}
            currentUserRole={currentUserRole}
            showToast={showToast}
          />
    </>);
};

export default SettingsSupport;
