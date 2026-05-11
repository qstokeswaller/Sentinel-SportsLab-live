// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { useWorkoutPrograms } from '../hooks/useWorkoutPrograms';
import {
    DumbbellIcon, PackageIcon, PrinterIcon, HistoryIcon,
    CalendarPlusIcon, PlusIcon, ChevronRightIcon, ArrowRightIcon,
    BookOpenIcon, SearchIcon, FilterIcon, ChevronDownIcon,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
    Completed:    'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    Scheduled:    'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300',
    'In Progress':'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    Draft:        'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8]',
    Missed:       'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
};

const TYPE_STYLES: Record<string, string> = {
    Strength:    'bg-indigo-100 dark:bg-indigo-900/25 text-indigo-700 dark:text-indigo-300',
    Hypertrophy: 'bg-purple-100 dark:bg-purple-900/25 text-purple-700 dark:text-purple-300',
    Power:       'bg-orange-100 dark:bg-orange-900/25 text-orange-700 dark:text-orange-300',
    Speed:       'bg-cyan-100 dark:bg-cyan-900/25 text-cyan-700 dark:text-cyan-300',
    Conditioning:'bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400',
};

const LOAD_DOT: Record<string, string> = {
    Low:    'bg-emerald-400',
    Medium: 'bg-amber-400',
    High:   'bg-rose-400',
};

function formatDateShort(iso: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatDateTime(iso: string, time?: string) {
    if (!iso) return '—';
    const d = formatDateShort(iso);
    return time ? `${d} · ${time}` : d;
}

// ── Main Page ──────────────────────────────────────────────────────────────

export const WorkoutsPage = () => {
    const navigate = useNavigate();
    const { scheduledSessions, workoutTemplates } = useAppState();
    const { data: programs = [] } = useWorkoutPrograms();

    const [sessionTab, setSessionTab] = useState<'Upcoming' | 'Completed' | 'Draft'>('Upcoming');

    const tabSessions = useMemo(() => {
        const all = [...(scheduledSessions || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (sessionTab === 'Upcoming') return all.filter(s => s.status === 'Scheduled' || s.status === 'In Progress');
        if (sessionTab === 'Completed') return all.filter(s => s.status === 'Completed');
        return all.filter(s => s.status === 'Draft');
    }, [scheduledSessions, sessionTab]);

    const tabCounts = useMemo(() => {
        const all = scheduledSessions || [];
        return {
            Upcoming:  all.filter(s => s.status === 'Scheduled' || s.status === 'In Progress').length,
            Completed: all.filter(s => s.status === 'Completed').length,
            Draft:     all.filter(s => s.status === 'Draft').length,
        };
    }, [scheduledSessions]);

    const previewPrograms = programs.slice(0, 4);

    const completionRate = useMemo(() => {
        const all = scheduledSessions || [];
        if (!all.length) return 0;
        return Math.round((all.filter(s => s.status === 'Completed').length / all.length) * 100);
    }, [scheduledSessions]);

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Page header */}
            <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                            <DumbbellIcon size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Workouts</h2>
                            <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">
                                Plan, prescribe, and track weightroom training.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => navigate('/workouts/packets')}
                            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all"
                        >
                            <PlusIcon size={13} /> Create New
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions — 4 cards matching screenshot */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700/50 transition-all group flex flex-col">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/25 rounded-xl flex items-center justify-center mb-3">
                        <PackageIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] mb-1">Create New Session</div>
                        <div className="text-[11px] text-slate-400 dark:text-[#64748B] leading-relaxed">Build a workout from scratch with exercises, sets & targets.</div>
                    </div>
                    <button
                        onClick={() => navigate('/workouts/packets')}
                        className="mt-4 text-left text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                        Create Session <ArrowRightIcon size={11} />
                    </button>
                </div>

                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-all group flex flex-col">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/25 rounded-xl flex items-center justify-center mb-3">
                        <CalendarPlusIcon size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] mb-1">Schedule Session</div>
                        <div className="text-[11px] text-slate-400 dark:text-[#64748B] leading-relaxed">Assign sessions to athletes or teams on the calendar.</div>
                    </div>
                    <button
                        onClick={() => navigate('/workouts/sessions')}
                        className="mt-4 text-left text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
                    >
                        Schedule Now <ArrowRightIcon size={11} />
                    </button>
                </div>

                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700/50 transition-all group flex flex-col">
                    <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/25 rounded-xl flex items-center justify-center mb-3">
                        <PrinterIcon size={18} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] mb-1">Generate Sheets</div>
                        <div className="text-[11px] text-slate-400 dark:text-[#64748B] leading-relaxed">Create and print daily weightroom sheets.</div>
                    </div>
                    <button
                        onClick={() => navigate('/workouts/sheets')}
                        className="mt-4 text-left text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 transition-colors flex items-center gap-1"
                    >
                        Generate Sheets <ArrowRightIcon size={11} />
                    </button>
                </div>

                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-700/50 transition-all group flex flex-col">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/25 rounded-xl flex items-center justify-center mb-3">
                        <HistoryIcon size={18} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] mb-1">View History</div>
                        <div className="text-[11px] text-slate-400 dark:text-[#64748B] leading-relaxed">Review completed sessions and athlete performance.</div>
                    </div>
                    <button
                        onClick={() => navigate('/workouts/history')}
                        className="mt-4 text-left text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors flex items-center gap-1"
                    >
                        View History <ArrowRightIcon size={11} />
                    </button>
                </div>
            </div>

            {/* Active Programs preview */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpenIcon size={15} className="text-indigo-500 dark:text-indigo-400" />
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Active Programs</h3>
                        <span className="text-[10px] text-slate-400 dark:text-[#64748B]">Multi-week structured training programs</span>
                    </div>
                    <button
                        onClick={() => navigate('/workouts/programs')}
                        className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                        View All Programs <ArrowRightIcon size={11} />
                    </button>
                </div>

                {programs.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-xs text-slate-400 dark:text-[#64748B]">No programs yet</p>
                        <button
                            onClick={() => navigate('/workouts/programs')}
                            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors"
                        >
                            <PlusIcon size={12} /> Create a program
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto px-5 py-4 no-scrollbar">
                        {previewPrograms.map(p => (
                            <div
                                key={p.id}
                                onClick={() => navigate('/workouts/programs')}
                                className="flex-shrink-0 w-56 bg-slate-50 dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] rounded-xl p-4 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-700/50 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors leading-tight flex-1 pr-2 line-clamp-2">
                                        {p.name}
                                    </h4>
                                </div>
                                {(p.tags ?? []).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {(p.tags ?? []).slice(0, 3).map(t => (
                                            <span key={t} className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-semibold">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                {p.overview && (
                                    <p className="text-[10px] text-slate-400 dark:text-[#64748B] leading-relaxed line-clamp-2 mb-2">
                                        {p.overview}
                                    </p>
                                )}
                                <div className="text-[9px] text-slate-400 dark:text-[#64748B] mt-auto">
                                    Updated {new Date(p.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                </div>
                            </div>
                        ))}
                        {programs.length > 4 && (
                            <div
                                className="flex-shrink-0 w-40 border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                onClick={() => navigate('/workouts/programs')}
                            >
                                <span className="text-2xl font-bold text-slate-300 dark:text-[#475569]">+{programs.length - 4}</span>
                                <span className="text-[10px] text-slate-400 dark:text-[#64748B] mt-1">more programs</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Recent Sessions — table with tabs */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="px-5 pt-4 pb-0 border-b border-slate-100 dark:border-[#1A2D48]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Recent Sessions</h3>
                        <button
                            onClick={() => navigate('/workouts/history')}
                            className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                        >
                            View history <ChevronRightIcon size={12} />
                        </button>
                    </div>
                    <div className="flex gap-0">
                        {(['Upcoming', 'Completed', 'Draft'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSessionTab(tab)}
                                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                    sessionTab === tab
                                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#94A3B8]'
                                }`}
                            >
                                {tab}
                                {tabCounts[tab] > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                        sessionTab === tab
                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                            : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8]'
                                    }`}>
                                        {tabCounts[tab]}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {tabSessions.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-xs text-slate-400 dark:text-[#64748B]">No {sessionTab.toLowerCase()} sessions</p>
                        {sessionTab === 'Upcoming' && (
                            <button
                                onClick={() => navigate('/workouts/packets')}
                                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors"
                            >
                                <CalendarPlusIcon size={12} /> Schedule a session
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-200 dark:border-[#243A58]">
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Session</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Date & Time</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Type</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Focus</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Load</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                {tabSessions.slice(0, 8).map(s => {
                                    const phase = s.training_phase || s.trainingPhase || '';
                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]/60 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{s.title || 'Untitled'}</div>
                                                {s.target_id && (
                                                    <div className="text-[10px] text-slate-400 dark:text-[#64748B] mt-0.5">
                                                        {(s.target_type || s.targetType) === 'Team' ? 'Team' : 'Individual'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-[#94A3B8] whitespace-nowrap">
                                                {formatDateTime(s.date, s.time)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {phase ? (
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${TYPE_STYLES[phase] ?? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8]'}`}>
                                                        {phase}
                                                    </span>
                                                ) : <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 dark:text-[#94A3B8]">
                                                {phase || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {s.load ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-2 h-2 rounded-full ${LOAD_DOT[s.load] ?? 'bg-slate-300 dark:bg-[#475569]'}`} />
                                                        <span className="text-xs text-slate-500 dark:text-[#94A3B8]">{s.load}</span>
                                                    </div>
                                                ) : <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${STATUS_STYLES[s.status] ?? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8]'}`}>
                                                    {s.status || 'Scheduled'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {tabSessions.length > 8 && (
                            <div className="px-5 py-3 border-t border-slate-100 dark:border-[#1A2D48] text-center">
                                <button
                                    onClick={() => navigate('/workouts/history')}
                                    className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 transition-colors"
                                >
                                    View all {tabSessions.length} sessions →
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Saved Sessions quick strip */}
            {workoutTemplates.length > 0 && (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <PackageIcon size={15} className="text-emerald-500 dark:text-emerald-400" />
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Saved Sessions</h3>
                            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] rounded text-[10px] font-semibold">
                                {workoutTemplates.length}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/workouts/sessions')}
                                className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                            >
                                View all <ChevronRightIcon size={12} />
                            </button>
                            <button
                                onClick={() => navigate('/workouts/packets')}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold transition-all"
                            >
                                <PlusIcon size={11} /> New
                            </button>
                        </div>
                    </div>
                    <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
                        {workoutTemplates.slice(0, 6).map(tpl => {
                            const exCount = (tpl.sections?.warmup?.length || 0) + (tpl.sections?.workout?.length || 0) + (tpl.sections?.cooldown?.length || 0);
                            return (
                                <div
                                    key={tpl.id}
                                    onClick={() => navigate('/workouts/sessions')}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#1A2D48] hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-200 dark:border-[#243A58] hover:border-emerald-200 dark:hover:border-emerald-700/50 rounded-lg cursor-pointer transition-all group"
                                >
                                    <span className="text-xs font-medium text-slate-700 dark:text-[#CBD5E1] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{tpl.name}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-[#64748B]">{exCount}ex</span>
                                </div>
                            );
                        })}
                        {workoutTemplates.length > 6 && (
                            <button
                                onClick={() => navigate('/workouts/sessions')}
                                className="px-3 py-2 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 transition-colors"
                            >
                                +{workoutTemplates.length - 6} more
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkoutsPage;
