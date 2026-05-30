// @ts-nocheck
/**
 * ContactPage — public contact form.
 *
 * Until you've set up your support inbox + a server-side handler, submit
 * opens the user's mail client with the form contents pre-filled (mailto
 * link). Swap the `handleSubmit` body for an API call when the backend is
 * ready (Supabase Edge Function, Vercel serverless, etc.).
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityIcon, ArrowLeftIcon, MailIcon, MessageSquareIcon, AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import SiteFooter from '../components/layout/SiteFooter';

const SUBJECTS = [
    { id: 'sales',    label: 'Sales / Pilot enquiry',  icon: MessageSquareIcon, mailto: 'Sales%20Enquiry' },
    { id: 'support',  label: 'Support request',         icon: MailIcon,           mailto: 'Support%20Request' },
    { id: 'bug',      label: 'Report a bug',            icon: AlertCircleIcon,    mailto: 'Bug%20Report' },
    { id: 'feature',  label: 'Feature request',         icon: MessageSquareIcon, mailto: 'Feature%20Request' },
] as const;

const inputCls = 'w-full px-3.5 py-2.5 bg-white border-[1.5px] border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 transition-all';
const labelCls = 'block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 mb-1.5';

const ContactPage: React.FC = () => {
    const [subject, setSubject] = useState<typeof SUBJECTS[number]['id']>('sales');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [organisation, setOrganisation] = useState('');
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const subj = SUBJECTS.find(s => s.id === subject);
        const body = `Name: ${name}%0AEmail: ${email}%0AOrganisation: ${organisation}%0A%0A${encodeURIComponent(message)}`;
        window.location.href = `mailto:hello@sentinelsportslab.com?subject=${subj?.mailto}&body=${body}`;
        setSent(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Mini nav */}
            <nav className="border-b border-slate-200 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><ActivityIcon size={15} className="text-white" /></div>
                        <span className="font-semibold text-[15px] text-slate-900 tracking-tight">Sentinel <span className="text-indigo-600">SportsLab</span></span>
                    </Link>
                    <Link to="/" className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeftIcon size={14} /> Back to home
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <header className="bg-white border-b border-slate-100">
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
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Your mail client is open</h2>
                            <p className="text-[14px] text-slate-500 leading-relaxed mb-6">If nothing appeared, email us directly at <a href="mailto:hello@sentinelsportslab.com" className="text-indigo-600 font-semibold">hello@sentinelsportslab.com</a>.</p>
                            <button onClick={() => { setSent(false); setName(''); setEmail(''); setOrganisation(''); setMessage(''); }} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700">Send another message →</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 shadow-sm space-y-5">
                            <div>
                                <label className={labelCls}>What's this about? *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {SUBJECTS.map(s => {
                                        const isSel = subject === s.id;
                                        return (
                                            <button key={s.id} type="button" onClick={() => setSubject(s.id)}
                                                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-lg border-[1.5px] text-left text-[13px] font-medium transition-all ${
                                                    isSel ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50'
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

                            <button type="submit" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                                <MailIcon size={14} /> Send message
                            </button>

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
