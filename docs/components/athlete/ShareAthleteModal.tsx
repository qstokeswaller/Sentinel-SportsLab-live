// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
    XIcon, CopyIcon, CheckIcon, Trash2Icon, Loader2Icon,
    Link2Icon, ClockIcon, Share2Icon, InfoIcon,
} from 'lucide-react';
import { DatabaseService } from '../../services/databaseService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    athlete: { id: string; name: string };
    buildSnapshot: () => any; // called when generating a new snapshot share
}

type Expiry = 'never' | '7d' | '30d';

const computeExpiryISO = (e: Expiry): string | null => {
    if (e === 'never') return null;
    const days = e === '7d' ? 7 : 30;
    return new Date(Date.now() + days * 86400000).toISOString();
};

export const ShareAthleteModal: React.FC<Props> = ({ isOpen, onClose, athlete, buildSnapshot }) => {
    const [shares, setShares] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [expiry, setExpiry] = useState<Expiry>('30d');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const refresh = async () => {
        if (!athlete?.id) return;
        setLoading(true);
        try {
            const rows = await DatabaseService.listAthleteShares(athlete.id);
            setShares(rows);
        } catch (e) {
            console.error('Failed to load shares:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) refresh();
    }, [isOpen, athlete?.id]);

    if (!isOpen) return null;

    const buildShareUrl = (id: string) => `${window.location.origin}/athlete-share/${id}`;

    const handleCreate = async () => {
        if (!athlete?.id) return;
        setCreating(true);
        try {
            const snapshot = buildSnapshot();
            const created = await DatabaseService.createAthleteShare({
                athleteId: athlete.id,
                athleteName: athlete.name,
                mode: 'snapshot',
                snapshotData: snapshot,
                expiresAt: computeExpiryISO(expiry),
            });
            await refresh();
            // Auto-copy the new link
            const url = buildShareUrl(created.id);
            try {
                await navigator.clipboard.writeText(url);
                setCopiedId(created.id);
                setTimeout(() => setCopiedId(null), 2000);
            } catch {}
        } catch (e) {
            console.error('Create share failed:', e);
            alert('Failed to create share link.');
        } finally {
            setCreating(false);
        }
    };

    const handleCopy = async (id: string) => {
        const url = buildShareUrl(id);
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // Fallback: prompt with the URL
            window.prompt('Copy this link:', url);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Revoke this share link? It will stop working immediately.')) return;
        try {
            await DatabaseService.deleteAthleteShare(id);
            await refresh();
        } catch (e) {
            console.error('Delete share failed:', e);
            alert('Failed to revoke link.');
        }
    };

    const fmtDateShort = (s?: string | null) => {
        if (!s) return null;
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return s;
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    };

    const isExpired = (expiresAt?: string | null) => expiresAt && new Date(expiresAt).getTime() < Date.now();

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-lg max-h-[90vh] shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <Share2Icon size={16} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">Share Athlete Profile</h3>
                            <span className="text-xs text-slate-500 dark:text-[#CBD5E1]">{athlete?.name}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 transition-colors">
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {/* Create new */}
                    <div className="p-5 border-b border-slate-100 dark:border-[#1A2D48]">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-3">Create Share Link</div>

                        {/* Mode picker — snapshot only for v1 */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-slate-600 dark:text-[#CBD5E1] mb-1.5">Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    className="px-3 py-2 rounded-lg border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-600/15 text-left"
                                >
                                    <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Snapshot</div>
                                    <div className="text-[10px] text-indigo-600/80 dark:text-indigo-300/70 mt-0.5">Freezes data at share-time</div>
                                </button>
                                <button
                                    disabled
                                    title="Coming soon"
                                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] text-left opacity-60 cursor-not-allowed"
                                >
                                    <div className="text-xs font-semibold text-slate-500 dark:text-[#CBD5E1]">Live</div>
                                    <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-0.5">Always shows latest · soon</div>
                                </button>
                            </div>
                        </div>

                        {/* Expiry */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-slate-600 dark:text-[#CBD5E1] mb-1.5">Expires</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['7d', '30d', 'never'] as Expiry[]).map(e => (
                                    <button
                                        key={e}
                                        onClick={() => setExpiry(e)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                            expiry === e
                                                ? 'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300'
                                                : 'border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                                        }`}
                                    >
                                        {e === '7d' ? '7 days' : e === '30d' ? '30 days' : 'Never'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {creating ? <Loader2Icon size={14} className="animate-spin" /> : <Link2Icon size={14} />}
                            {creating ? 'Generating…' : 'Generate Share Link'}
                        </button>

                        <p className="mt-3 text-[10px] text-slate-400 dark:text-[#94A3B8] flex items-start gap-1.5">
                            <InfoIcon size={11} className="shrink-0 mt-0.5" />
                            <span>Anyone with the link can view this athlete's dossier without logging in. Revoke a link any time below.</span>
                        </p>
                    </div>

                    {/* Existing shares */}
                    <div className="p-5">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-3">Active Links · {shares.filter(s => !isExpired(s.expires_at)).length}</div>

                        {loading ? (
                            <div className="text-xs text-slate-400 dark:text-[#94A3B8] italic">Loading…</div>
                        ) : shares.length === 0 ? (
                            <div className="text-xs text-slate-400 dark:text-[#94A3B8] italic">No share links yet — create one above.</div>
                        ) : (
                            <div className="space-y-2">
                                {shares.map(s => {
                                    const expired = isExpired(s.expires_at);
                                    return (
                                        <div
                                            key={s.id}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${expired ? 'border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] opacity-60' : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30]'}`}
                                        >
                                            <Link2Icon size={14} className="text-indigo-500 dark:text-indigo-300 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-mono text-slate-700 dark:text-[#E2E8F0] truncate">
                                                    {buildShareUrl(s.id)}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-[#94A3B8] mt-0.5">
                                                    <span className="capitalize">{s.mode}</span>
                                                    <span>·</span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <ClockIcon size={10} />
                                                        {expired ? 'Expired' : s.expires_at ? `Expires ${fmtDateShort(s.expires_at)}` : 'Never expires'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(s.id)}
                                                title="Copy link"
                                                disabled={expired}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors disabled:opacity-30"
                                            >
                                                {copiedId === s.id ? <CheckIcon size={14} className="text-emerald-500" /> : <CopyIcon size={14} />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                title="Revoke link"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                            >
                                                <Trash2Icon size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
