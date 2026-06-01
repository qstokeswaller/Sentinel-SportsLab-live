// @ts-nocheck
/**
 * LegalLayout — shared chrome for all policy pages (Privacy, Terms, Cookies,
 * Data Processing). Provides: top nav with back-link, page title, last-updated
 * stamp, governing-law banner, and the SiteFooter at the bottom. Children are
 * rendered in a centered prose-styled container.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ActivityIcon, ShieldIcon } from 'lucide-react';
import SiteFooter from './SiteFooter';

interface Props {
    title: string;
    lastUpdated: string;
    summary?: string;
    children: React.ReactNode;
}

const LegalLayout: React.FC<Props> = ({ title, lastUpdated, summary, children }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Mini nav */}
            <nav className="border-b border-slate-200 bg-white sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5">
                        <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-12 w-auto select-none" />
                        <span className="font-semibold text-[15px] text-slate-900 tracking-tight">Sentinel <span className="text-indigo-600">SportsLab</span></span>
                    </Link>
                    <Link to="/" className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                        <ArrowLeftIcon size={14} /> Back to home
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <header className="bg-white border-b border-slate-100">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10.5px] font-bold uppercase tracking-wider text-indigo-600 mb-5">
                        <ShieldIcon size={11} /> Legal
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">{title}</h1>
                    <p className="text-[12.5px] text-slate-500"><strong>Last updated:</strong> {lastUpdated}</p>
                    {summary && (
                        <div className="mt-6 bg-indigo-50/60 border border-indigo-100 rounded-xl px-5 py-4 text-[13.5px] text-slate-700 leading-relaxed">
                            {summary}
                        </div>
                    )}
                </div>
            </header>

            {/* Body */}
            <main className="flex-1 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 prose-legal">
                    {children}
                </div>
            </main>

            <SiteFooter />

            <style>{`
                .prose-legal h2 { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin-top: 2.4rem; margin-bottom: 0.8rem; line-height: 1.3; }
                .prose-legal h3 { font-size: 1.05rem; font-weight: 600; color: #1e293b; margin-top: 1.6rem; margin-bottom: 0.6rem; }
                .prose-legal p { font-size: 0.95rem; color: #475569; line-height: 1.7; margin-bottom: 1rem; }
                .prose-legal ul, .prose-legal ol { font-size: 0.95rem; color: #475569; line-height: 1.7; margin-bottom: 1rem; padding-left: 1.4rem; }
                .prose-legal li { margin-bottom: 0.4rem; }
                .prose-legal a { color: #4f46e5; text-decoration: underline; }
                .prose-legal a:hover { color: #4338ca; }
                .prose-legal strong { color: #0f172a; font-weight: 600; }
                .prose-legal em { color: #334155; font-style: italic; }
                .prose-legal .callout { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 0.9rem 1.1rem; margin: 1.2rem 0; border-radius: 0.4rem; font-size: 0.9rem; color: #78350f; }
                .prose-legal table { width: 100%; border-collapse: collapse; margin: 1.2rem 0; font-size: 0.88rem; }
                .prose-legal th, .prose-legal td { border: 1px solid #e2e8f0; padding: 0.6rem 0.8rem; text-align: left; vertical-align: top; }
                .prose-legal th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
            `}</style>
        </div>
    );
};

export default LegalLayout;
