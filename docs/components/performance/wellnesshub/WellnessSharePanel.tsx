// Share Check-in Link panel — extracted verbatim from WellnessHub.tsx
// (restructure step 2, 2026-07-12). State intentionally stays in the parent so
// behaviour is identical (tracking badge persists across view switches).
import React from 'react';
import {
    ArrowLeft, Activity, Shield as ShieldIcon, ClipboardList, CheckCircle2,
    X, Plus, Link2, Copy, Share2, Clock, Zap,
} from 'lucide-react';
import { DatabaseService } from '../../../services/databaseService';
import { localDateStr } from './shared';

interface ShareSession { id: string; template_id: string; shared_at: string }

interface Props {
    selectedTemplate: any;
    setSelectedTemplate: (t: any) => void;
    selectedTeamId: string | null;
    activeTeamName?: string;
    wellnessTemplates: any[];
    shareSessions: ShareSession[];
    setShareSessions: React.Dispatch<React.SetStateAction<ShareSession[]>>;
    copied: boolean;
    setCopied: (b: boolean) => void;
    sharingInProgress: boolean;
    setSharingInProgress: (b: boolean) => void;
    setViewMode: (m: string) => void;
}

export const WellnessSharePanel: React.FC<Props> = ({
    selectedTemplate, setSelectedTemplate, selectedTeamId, activeTeamName,
    wellnessTemplates, shareSessions, setShareSessions,
    copied, setCopied, sharingInProgress, setSharingInProgress, setViewMode,
}) => {
    const previewLink = selectedTemplate
        ? selectedTemplate.id === '__wellness_check__'
            ? `${window.location.origin}/daily-wellness/${selectedTeamId}`
            : selectedTemplate.id === '__weekly_health__'
                ? `${window.location.origin}/weekly-wellness/${selectedTeamId}`
                : `${window.location.origin}/wellness-form/${selectedTemplate.id}/${selectedTeamId}`
        : '';

    const todayStr = localDateStr();
    const isBuiltInTemplate = selectedTemplate?.id === '__wellness_check__' || selectedTemplate?.id === '__weekly_health__';
    // Built-in forms are always "tracked" — they're permanent links, responses are recorded by date
    const isTrackedToday = isBuiltInTemplate || shareSessions.some(s => s.shared_at?.split('T')[0] === todayStr);

    const handleCopy = async () => {
        if (!previewLink) return;
        await navigator.clipboard.writeText(previewLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsApp = () => {
        if (!previewLink) return;
        const waUrl = `https://wa.me/?text=${encodeURIComponent(`Complete your wellness check-in here: ${previewLink}`)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
    };

    const handleTrackToday = async () => {
        if (!selectedTemplate || !selectedTeamId || isTrackedToday) return;
        try {
            setSharingInProgress(true);
            const session = await DatabaseService.createShareSession(selectedTemplate.id, selectedTeamId);
            setShareSessions(prev => [{ id: session.id, template_id: selectedTemplate.id, shared_at: new Date().toISOString() }, ...prev]);
        } catch (err) {
            console.error('Failed to create tracking session:', err);
        } finally {
            setSharingInProgress(false);
        }
    };

    return (
        <div className="space-y-8 animate-in zoom-in-95 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center gap-6">
                <button
                    onClick={() => setViewMode('dashboard')}
                    aria-label="Back to dashboard"
                    className="w-12 h-12 bg-white dark:bg-[#132338] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl flex items-center justify-center text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] hover:text-slate-900 transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-3xl font-semibold text-slate-900 dark:text-[#E2E8F0] tracking-tighter">Share Check-in Link</h2>
                    <p className="text-slate-400 dark:text-[#CBD5E1] font-bold uppercase text-[10px] tracking-wide mt-1">
                        Share link and track daily responses
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Template list + create card */}
                <div data-tour="share-template-picker" className="space-y-4">
                    <label className="text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide ml-1">Select Questionnaire</label>
                    <div className="space-y-3">
                        {/* Built-in: Daily Wellness Check */}
                        <div
                            onClick={() => setSelectedTemplate({ id: '__wellness_check__', name: 'Wellness Check', questions: [] })}
                            className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                selectedTemplate?.id === '__wellness_check__'
                                    ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200 dark:shadow-none text-white'
                                    : 'bg-white dark:bg-[#132338] border-indigo-100 dark:border-indigo-800/40 text-slate-900 dark:text-[#E2E8F0] hover:border-indigo-200'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTemplate?.id === '__wellness_check__' ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300'}`}>
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-base">Wellness Check</div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wide ${selectedTemplate?.id === '__wellness_check__' ? 'text-indigo-100' : 'text-indigo-400'}`}>
                                        Daily check-in · 8 questions · &lt;2 min
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Built-in: Deep Health Check */}
                        <div
                            onClick={() => setSelectedTemplate({ id: '__weekly_health__', name: 'Deep Health Check', questions: [] })}
                            className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                selectedTemplate?.id === '__weekly_health__'
                                    ? 'bg-amber-600 border-amber-600 shadow-xl shadow-amber-200 dark:shadow-none text-white'
                                    : 'bg-white dark:bg-[#132338] border-amber-100 dark:border-amber-800/40 text-slate-900 dark:text-[#E2E8F0] hover:border-amber-200'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTemplate?.id === '__weekly_health__' ? 'bg-white/20' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                                    <ShieldIcon size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-base">Deep Health Check</div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wide ${selectedTemplate?.id === '__weekly_health__' ? 'text-amber-100' : 'text-amber-400'}`}>
                                        Deep check · FIFA/IOC aligned · 2–5 min
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom templates */}
                        {wellnessTemplates.map((t: any) => {
                            const isSelected = selectedTemplate?.id === t.id;
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(isSelected ? null : t)}
                                    className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-cyan-600 border-cyan-600 shadow-xl shadow-cyan-200 dark:shadow-none text-white'
                                            : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#1A2D48] text-slate-900 dark:text-[#E2E8F0] hover:border-cyan-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-400 dark:text-[#CBD5E1]'}`}>
                                                <ClipboardList size={20} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-base">{t.name || t.title}</div>
                                                <div className={`text-[9px] font-bold uppercase tracking-wide ${isSelected ? 'text-cyan-100' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>
                                                    {t.questions?.length || 0} questions
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 size={18} />
                                                <div className="w-6 h-6 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-all" title="Deselect">
                                                    <X size={12} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Create new template card */}
                        <div
                            onClick={() => setViewMode('templates')}
                            className="p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#132338]/40 hover:border-slate-300 hover:bg-white transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] flex items-center justify-center text-slate-300 dark:text-[#475569] group-hover:text-slate-500 transition-colors">
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm text-slate-500 dark:text-[#CBD5E1] group-hover:text-slate-700 dark:group-hover:text-[#CBD5E1] transition-colors">Create New Template</div>
                                    <div className="text-[9px] font-bold uppercase tracking-wide text-slate-300 dark:text-[#475569]">
                                        Build a custom questionnaire to share
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Link panel — only shown when a template is selected */}
                <div className="flex flex-col">
                    {selectedTemplate ? (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-xl p-8 flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
                            {/* Link ready indicator */}
                            <div className="flex flex-col items-center text-center gap-3 py-6">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/25 border-2 border-emerald-100 dark:border-emerald-800/40 rounded-xl flex items-center justify-center">
                                    <Link2 size={28} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-[#E2E8F0] text-lg">Link Ready</p>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mt-1">
                                        {selectedTemplate.name || selectedTemplate.title} · {activeTeamName}
                                    </p>
                                </div>
                            </div>

                            {/* URL preview row */}
                            <div className="bg-slate-50 dark:bg-[#0F1C30] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl p-4 flex items-center gap-3">
                                <p className="text-[10px] font-mono text-slate-400 dark:text-[#CBD5E1] truncate flex-1">{previewLink}</p>
                                <button
                                    onClick={handleCopy}
                                    aria-label="Copy link"
                                    className={`p-2 rounded-lg border transition-all shrink-0 ${copied ? 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50 text-emerald-600' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:text-cyan-600 hover:border-cyan-200'}`}
                                >
                                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                </button>
                            </div>

                            {/* Share actions */}
                            <div data-tour="share-actions" className="flex flex-col gap-3">
                                <button
                                    onClick={handleCopy}
                                    className="w-full py-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-indigo-500 dark:hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Copy size={14} /> {copied ? 'Copied!' : 'Copy Link'}
                                </button>
                                <button
                                    onClick={handleWhatsApp}
                                    className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-[#1ebe5d] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Share2 size={14} /> Share via WhatsApp
                                </button>
                            </div>

                            {/* Tracking */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="h-px bg-slate-100 dark:bg-[#1A2D48] flex-1" />
                                    <span className="text-[9px] font-bold text-slate-300 dark:text-[#475569] uppercase tracking-wide">Response Tracking</span>
                                    <div className="h-px bg-slate-100 dark:bg-[#1A2D48] flex-1" />
                                </div>
                                {isTrackedToday ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/25 border-2 border-emerald-100 dark:border-emerald-800/40 rounded-xl p-4 text-center space-y-1">
                                        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={16} />
                                            <span className="text-xs font-bold uppercase tracking-wide">Tracking Today</span>
                                        </div>
                                        <p className="text-[9px] font-semibold text-emerald-500">
                                            Responses submitted today are being recorded
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <button
                                            onClick={handleTrackToday}
                                            disabled={sharingInProgress}
                                            className="w-full py-3 rounded-xl font-semibold text-[10px] uppercase tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-2 bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:border-cyan-300 hover:text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
                                        >
                                            {sharingInProgress ? (
                                                <><Clock size={14} className="animate-spin" /> Creating...</>
                                            ) : (
                                                <><Zap size={14} /> Start Tracking Today</>
                                            )}
                                        </button>
                                        <p className="text-[9px] font-bold text-slate-300 dark:text-[#475569] uppercase text-center tracking-wide">
                                            Click to start tracking responses for today
                                        </p>
                                    </div>
                                )}
                                <p className="text-[8px] font-medium text-slate-300 dark:text-[#475569] text-center">
                                    Athletes can bookmark this link for daily use — tracking also starts automatically when the first response is submitted
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="hidden md:flex flex-col items-center justify-center h-full text-center py-16 opacity-30">
                            <Share2 size={32} className="text-slate-300 dark:text-[#475569] mb-3" />
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1]">Select a questionnaire<br />to generate a share link</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WellnessSharePanel;
