// @ts-nocheck
/**
 * ContactPage — public contact form. Submits via /api/contact (Vercel serverless
 * function → Resend → support@sentinelsportslab.com). Reply-To is set to the
 * submitter's address so hitting Reply in Zoho replies straight to them.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityIcon, ArrowLeftIcon, MailIcon, MessageSquareIcon, AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import SiteFooter from '../components/layout/SiteFooter';

const SUBJECTS = [
    { id: 'sales',    label: 'Sales / Pilot enquiry',  icon: MessageSquareIcon },
    { id: 'support',  label: 'Support request',         icon: MailIcon },
    { id: 'bug',      label: 'Report a bug',            icon: AlertCircleIcon },
    { id: 'feature',  label: 'Feature request',         icon: MessageSquareIcon },
] as const;

// TODO: replace with real WhatsApp number, e.g. '27821234567' (no +, no spaces).
const WHATSAPP_NUMBER = '';
const WHATSAPP_PREFILL = encodeURIComponent("Hi Sentinel SportsLab — I'd like to chat about ");

const inputCls = 'w-full px-3.5 py-2.5 bg-white border-[1.5px] border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 transition-all';
const labelCls = 'block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1.5';

const ContactPage: React.FC = () => {
    const [subject, setSubject] = useState<typeof SUBJECTS[number]['id']>('sales');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [organisation, setOrganisation] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        setError(null);
        setSubmitting(true);
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, name, email, organisation, message }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data?.error || 'Could not send your message. Please try again.');
            } else {
                setSent(true);
            }
        } catch (err: any) {
            setError(err?.message || 'Network error — check your connection and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Mini nav */}
            <nav className="border-b border-slate-200 dark:border-[#243A58] bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-12 w-auto select-none" />
                        <span className="font-semibold text-[15px] text-slate-900 tracking-tight">Sentinel <span className="text-indigo-600">SportsLab</span></span>
                    </Link>
                    <Link to="/" className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 transition-colors">
                        <ArrowLeftIcon size={14} /> Back to home
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <header className="bg-white border-b border-slate-100 dark:border-[#243A58]">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10.5px] font-bold uppercase tracking-wider text-indigo-600 mb-5">
                        <MailIcon size={11} /> Contact
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">Get in touch</h1>
                    <p className="text-[15px] text-slate-500 leading-relaxed max-w-xl mx-auto">
                        Questions about pricing, the 21-day pilot, integrations, or support — drop a note below and we'll respond within one business day.
                    </p>
                </div>
            </header>

            {/* Form */}
            <main className="flex-1 bg-slate-50">
                <div className="max-w-2xl mx-auto px-4 sm:px-8 py-12">
                    {sent ? (
                        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-10 text-center shadow-sm">
                            <CheckCircle2Icon size={48} className="text-emerald-500 mx-auto mb-4" />
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Message received</h2>
                            <p className="text-[14px] text-slate-500 leading-relaxed mb-6">Thanks {name.split(' ')[0] || 'there'} — we'll reply within one business day. If urgent, email us at <a href="mailto:support@sentinelsportslab.com" className="text-indigo-600 font-semibold">support@sentinelsportslab.com</a>.</p>
                            <button onClick={() => { setSent(false); setName(''); setEmail(''); setOrganisation(''); setMessage(''); }} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700">Send another message →</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 dark:border-[#243A58] rounded-2xl p-8 sm:p-10 shadow-sm space-y-5">
                            <div>
                                <label className={labelCls}>What's this about? *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {SUBJECTS.map(s => {
                                        const isSel = subject === s.id;
                                        return (
                                            <button key={s.id} type="button" onClick={() => setSubject(s.id)}
                                                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-lg border-[1.5px] text-left text-[13px] font-medium transition-all ${
                                                    isSel ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 dark:border-[#243A58] bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50'
                                                }`}>
                                                <s.icon size={14} /> {s.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className={labelCls}>Your name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputCls} placeholder="Alex Smith" /></div>
                                <div><label className={labelCls}>Email address *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} placeholder="alex@club.com" /></div>
                            </div>

                            <div><label className={labelCls}>Organisation</label><input type="text" value={organisation} onChange={e => setOrganisation(e.target.value)} className={inputCls} placeholder="Tuks FC, Northside Academy, etc." /></div>

                            <div>
                                <label className={labelCls}>Message *</label>
                                <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={6} className={`${inputCls} resize-none`} placeholder="Tell us what you're trying to solve, what tier you're considering, or what's broken…" />
                            </div>

                            {error && (
                                <div className="px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[13px] text-rose-700 flex items-start gap-2">
                                    <AlertCircleIcon size={14} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button type="submit" disabled={submitting} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                                <MailIcon size={14} /> {submitting ? 'Sending…' : 'Send message'}
                            </button>

                            {WHATSAPP_NUMBER && (
                                <a
                                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_PREFILL}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 bg-white hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-emerald-700 border-[1.5px] border-emerald-300 hover:border-emerald-400 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                                    Prefer WhatsApp? Message us
                                </a>
                            )}

                            <p className="text-[11.5px] text-slate-400 text-center">
                                By submitting you agree to our <Link to="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
                            </p>
                        </form>
                    )}
                </div>
            </main>

            <SiteFooter />
        </div>
    );
};

export default ContactPage;
