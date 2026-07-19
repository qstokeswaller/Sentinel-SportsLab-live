import React, { useState, useEffect, useRef } from 'react';
import { Copy, CheckCircle2, Share2, Link2, XIcon, Download, Loader2 } from 'lucide-react';
import { DatabaseService } from '../../services/databaseService';

/**
 * Share popover for Wattbike / Conditioning sessions. Those sessions live in
 * localStorage, so on open we snapshot the session JSON into a share row and
 * hand back a public link (/session-share/:id). Download PDF triggers the same
 * print the app uses, so PDF export now lives *inside* the share flow.
 */
interface ShareConditioningPopoverProps {
    shareType: 'wattbike' | 'conditioning';
    session: any;
    onDownloadPdf: () => void;
    onClose: () => void;
}

export const ShareConditioningPopover: React.FC<ShareConditioningPopoverProps> = ({
    shareType, session, onDownloadPdf, onClose,
}) => {
    const [copied, setCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [creating, setCreating] = useState(true);
    const [failed, setFailed] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Snapshot the session into a share row on open.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const row = await DatabaseService.createConditioningShare({
                    shareType,
                    title: session?.title || 'Session',
                    snapshotData: session,
                });
                if (!cancelled && row?.id) setShareUrl(`${window.location.origin}/session-share/${row.id}`);
                else if (!cancelled) setFailed(true);
            } catch {
                if (!cancelled) setFailed(true);
            } finally {
                if (!cancelled) setCreating(false);
            }
        })();
        return () => { cancelled = true; };
    }, []); // eslint-disable-line

    useEffect(() => {
        const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [onClose]);

    const handleCopy = async () => {
        if (!shareUrl) return;
        try { await navigator.clipboard.writeText(shareUrl); } catch { window.prompt('Copy this link:', shareUrl); }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsApp = () => {
        if (!shareUrl) return;
        const message = `Check out this session: ${session?.title || ''}\n${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-[2px] p-4">
            <div ref={ref} className="bg-white dark:bg-[#1A2D48] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-2xl w-full max-w-sm p-5 space-y-4 animate-in zoom-in-95 fade-in duration-150">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 rounded-lg flex items-center justify-center shrink-0">
                            <Link2 size={15} className="text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Share Session</h3>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] truncate">{session?.title}</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#243A58] transition-all shrink-0">
                        <XIcon size={14} />
                    </button>
                </div>

                {/* URL preview */}
                <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg p-3 flex items-center gap-2 min-h-[44px]">
                    {creating ? (
                        <span className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-[#CBD5E1]"><Loader2 size={12} className="animate-spin" /> Creating link…</span>
                    ) : failed ? (
                        <span className="text-[10px] text-rose-500">Couldn’t create a share link. Please try again.</span>
                    ) : (
                        <>
                            <p className="text-[10px] font-mono text-slate-500 dark:text-[#CBD5E1] truncate flex-1">{shareUrl}</p>
                            <button onClick={handleCopy} className={`p-1.5 rounded-md border transition-all shrink-0 ${copied ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-500/40'}`}>
                                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                            </button>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2.5">
                    <button onClick={handleCopy} disabled={!shareUrl} className="w-full py-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-black dark:hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                        {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
                    </button>
                    <button onClick={handleWhatsApp} disabled={!shareUrl} className="w-full py-3 bg-[#25D366] text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-[#1ebe5d] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Share2 size={14} /> Share via WhatsApp
                    </button>
                    <button onClick={onDownloadPdf} className="w-full py-3 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-700 dark:text-[#E2E8F0] rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                        <Download size={14} /> Download PDF
                    </button>
                </div>

                <p className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase text-center tracking-wide">
                    Anyone with this link can view the session
                </p>
            </div>
        </div>
    );
};

export default ShareConditioningPopover;
