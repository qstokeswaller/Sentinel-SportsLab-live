// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import {
    ArrowLeft as ArrowLeftIcon,
    History as HistoryIcon,
    Clock as ClockIcon,
    Users as UsersIcon,
    User as UserIcon,
    Dumbbell as DumbbellIcon,
    ChevronDown as ChevronDownIcon,
    Repeat as RepeatIcon,
    PencilIcon,
    Trash2 as Trash2Icon,
    ClipboardList as ClipboardListIcon,
    Printer as PrinterIcon,
    X as XIcon,
    CheckCircle2 as CheckCircle2Icon,
} from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { buildMaxLookup, getSheetCellValue, printSheet } from '../utils/weightroomUtils';
import { CompleteSessionModal } from '../components/workouts/CompleteSessionModal';
import { CustomSelect } from '../components/ui/CustomSelect';

// ── Helper ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Page Component ───────────────────────────────────────────────────────────

export const WorkoutHistoryPage = () => {
    const navigate = useNavigate();
    const {
        scheduledSessions, setScheduledSessions, teams, resolveTargetName, showToast, maxHistory, isLoading,
    } = useAppState();

    const [teamFilter, setTeamFilter]       = useState('');
    const [athleteFilter, setAthleteFilter] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [viewingSheetSession, setViewingSheetSession] = useState(null);
    const [completingSession, setCompletingSession] = useState(null);

    const maxLookup = useMemo(() => buildMaxLookup(maxHistory), [maxHistory]);

    // ── Stat card derivations ────────────────────────────────────────────────
    const stats = useMemo(() => {
        const all = scheduledSessions || [];
        const completed = all.filter(s => s.status === 'Completed');
        const scheduled = all.filter(s => s.status === 'Scheduled');

        // Average RPE from exercise rows of completed sessions
        let rpeSum = 0, rpeCount = 0;
        for (const s of completed) {
            const exRaw = s.exercises;
            if (!exRaw) continue;
            const rows = Array.isArray(exRaw)
                ? exRaw
                : [...(exRaw.warmup || []), ...(exRaw.workout || []), ...(exRaw.cooldown || [])];
            for (const r of rows) {
                const rpe = parseFloat(r.rpe) || 0;
                if (rpe > 0) { rpeSum += rpe; rpeCount++; }
            }
        }

        // Phase distribution
        const phases: Record<string, number> = {};
        for (const s of all) {
            const p = s.trainingPhase || s.training_phase;
            if (p) phases[p] = (phases[p] || 0) + 1;
        }
        const topPhase = Object.entries(phases).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

        return {
            total: all.length,
            completed: completed.length,
            scheduled: scheduled.length,
            avgRpe: rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : '—',
            topPhase,
        };
    }, [scheduledSessions]);

    const allPlayers = useMemo(() => teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)), [teams]);

    // Athletes shown in the athlete dropdown — scoped to selected team when one is picked
    const filteredPlayerOptions = useMemo(() => {
        if (teamFilter) {
            const team = teams.find(t => t.id === teamFilter);
            return [...(team?.players || [])].sort((a, b) => a.name.localeCompare(b.name));
        }
        return allPlayers;
    }, [teamFilter, teams, allPlayers]);

    const historySessions = useMemo(() => {
        const sorted = [...(scheduledSessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        return sorted.filter(s => {
            const sid = s.targetId || s.target_id;
            const stype = s.targetType || s.target_type;
            // Athlete filter takes priority when set
            if (athleteFilter) return sid === athleteFilter;
            // Team filter
            if (teamFilter) return sid === teamFilter && stype === 'Team';
            return true;
        });
    }, [scheduledSessions, teamFilter, athleteFilter]);

    const handleEdit = (session) => {
        navigate('/workouts/packets', {
            state: {
                editSession: session,
                returnTo: '/workouts/history',
            },
        });
    };

    const handleCompleteSession = async (sessionId: string, actualResults: Record<string, any[]>, actualRpe: number | null) => {
        try {
            await DatabaseService.completeSession(sessionId, actualResults, actualRpe);
            setScheduledSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, status: 'Completed', actual_results: actualResults, actual_rpe: actualRpe } : s
            ));
            showToast('Session completed — tonnage recorded', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to complete session', 'error');
        } finally {
            setCompletingSession(null);
        }
    };

    const resolveAthletes = (session) => {
        const tid = session.target_id || session.targetId;
        const ttype = session.target_type || session.targetType;
        if (ttype === 'Team') {
            const team = teams.find(t => t.id === tid);
            return [...(team?.players || [])].sort((a, b) => a.name.localeCompare(b.name));
        }
        for (const t of teams) {
            const p = (t.players || []).find(p => p.id === tid);
            if (p) return [p];
        }
        return [];
    };

    const handleReassign = (session) => {
        navigate('/workouts/packets', {
            state: {
                editSession: session,
                returnTo: '/workouts/history',
            },
        });
    };

    const handleDelete = async (sessionId: string) => {
        setDeleting(true);
        try {
            await DatabaseService.deleteSession(sessionId);
            setScheduledSessions(prev => prev.filter(s => s.id !== sessionId));
            showToast('Session removed from history', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to delete session', 'error');
        } finally {
            setDeleting(false);
            setConfirmDeleteId(null);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/workouts')} className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 dark:text-[#CBD5E1] transition-all" title="Back to Workouts">
                            <ArrowLeftIcon size={18} />
                        </button>
                        <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <HistoryIcon size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Workout History</h2>
                            <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">All assigned workouts across athletes & teams</p>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-[#CBD5E1] font-medium">{historySessions.length} sessions</span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                {[
                    { label: 'Total Sessions', value: stats.total, color: 'text-slate-900 dark:text-[#E2E8F0]', sub: 'all time' },
                    { label: 'Completed', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400', sub: `${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% rate` },
                    { label: 'Scheduled', value: stats.scheduled, color: 'text-indigo-600 dark:text-indigo-400', sub: 'upcoming' },
                    { label: 'Avg RPE', value: stats.avgRpe, color: 'text-amber-600 dark:text-amber-400', sub: 'from completed' },
                    { label: 'Top Phase', value: stats.topPhase, color: 'text-purple-600 dark:text-purple-400', sub: 'most sessions' },
                ].map(card => (
                    <div key={card.label} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] px-4 py-3.5 shadow-sm">
                        <div className={`text-lg font-bold leading-tight ${card.color}`}>{card.value}</div>
                        <div className="text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1] mt-0.5">{card.label}</div>
                        <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">{card.sub}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest">Filter Sessions</span>
                    {(teamFilter || athleteFilter) && (
                        <button
                            onClick={() => { setTeamFilter(''); setAthleteFilter(''); }}
                            className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#CBD5E1] transition-colors"
                        >
                            <XIcon size={11} /> Clear filters
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Team/Squad filter */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] flex items-center gap-1">
                            <UsersIcon size={10} /> Team / Squad
                        </label>
                        <CustomSelect
                            variant="form"
                            value={teamFilter}
                            onChange={e => { setTeamFilter(e.target.value); setAthleteFilter(''); }}
                            placeholder="All Teams"
                        >
                            <option value="">All Teams</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </CustomSelect>
                    </div>
                    {/* Athlete filter */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] flex items-center gap-1">
                            <UserIcon size={10} /> Athlete
                        </label>
                        <CustomSelect
                            variant="form"
                            value={athleteFilter}
                            onChange={e => setAthleteFilter(e.target.value)}
                            placeholder={teamFilter ? `All in ${teams.find(t => t.id === teamFilter)?.name ?? 'Team'}` : 'All Athletes'}
                        >
                            <option value="">{teamFilter ? `All in ${teams.find(t => t.id === teamFilter)?.name ?? 'Team'}` : 'All Athletes'}</option>
                            {filteredPlayerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </CustomSelect>
                    </div>
                </div>
            </div>

            {/* Sessions table */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center py-16 gap-3">
                        <div className="w-6 h-6 border-2 border-emerald-200 dark:border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
                        <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading workout history...</span>
                    </div>
                ) : historySessions.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                        <ClockIcon size={32} className="text-slate-200 dark:text-[#243A58]" />
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">No workout sessions found</p>
                        <p className="text-[10px] text-slate-300 dark:text-[#475569]">Schedule workouts from the builder to see them here</p>
                        <button onClick={() => navigate('/workouts/packets')} className="mt-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-500 text-emerald-700 dark:text-white rounded-lg text-xs font-semibold transition-all">
                            Build a Session
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-200 dark:border-[#243A58]">
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Session</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Date & Time</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Team / Group</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Focus</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Tonnage</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">RPE</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Status</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                {historySessions.map(session => {
                                    const targetName = resolveTargetName(session.targetId || session.target_id, session.targetType || session.target_type);
                                    const phase = session.trainingPhase || session.training_phase || '';
                                    const exRaw = session.exercises;
                                    const isTeam = (session.targetType || session.target_type) === 'Team';

                                    // Compute tonnage from actual_results
                                    let tonnage = 0;
                                    if (session.actual_results && typeof session.actual_results === 'object') {
                                        for (const rows of Object.values(session.actual_results)) {
                                            if (Array.isArray(rows)) {
                                                for (const r of rows) {
                                                    tonnage += parseFloat(r.tonnage || 0) || (parseFloat(r.sets) * parseFloat(r.reps) * parseFloat(r.weight) || 0);
                                                }
                                            }
                                        }
                                    }

                                    const statusStyles: Record<string, string> = {
                                        Completed: 'bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
                                        Scheduled: 'bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300',
                                        Draft:     'bg-slate-100 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]',
                                        Missed:    'bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400',
                                    };
                                    const phaseStyles: Record<string, string> = {
                                        Strength:    'bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300',
                                        Hypertrophy: 'bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300',
                                        Power:       'bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-300',
                                        Speed:       'bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
                                    };

                                    return (
                                        <tr key={session.id} className="group hover:bg-slate-50 dark:hover:bg-[#1A2D48]/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    {exRaw?.weightroomSheet && (
                                                        <span className="w-4 h-4 rounded bg-teal-100 dark:bg-teal-900/25 flex items-center justify-center shrink-0">
                                                            <ClipboardListIcon size={9} className="text-teal-600 dark:text-teal-400" />
                                                        </span>
                                                    )}
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{session.title || 'Untitled'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-[#CBD5E1] whitespace-nowrap">
                                                {formatDate(session.date)}{session.time ? ` · ${session.time}` : ''}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    {isTeam ? <UsersIcon size={11} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" /> : <UserIcon size={11} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" />}
                                                    <span className="text-xs text-slate-600 dark:text-[#CBD5E1] truncate max-w-[100px]">{targetName || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {phase ? (
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${phaseStyles[phase] ?? 'bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]'}`}>
                                                        {phase}
                                                    </span>
                                                ) : <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-[#CBD5E1] font-medium">
                                                {tonnage > 0 ? `${Math.round(tonnage).toLocaleString()} kg` : '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-[#CBD5E1]">
                                                {session.actual_rpe ? (
                                                    <span className="font-semibold text-amber-600 dark:text-amber-400">{session.actual_rpe}</span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${statusStyles[session.status] ?? 'bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]'}`}>
                                                    {session.status || 'Scheduled'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {exRaw?.weightroomSheet && (
                                                        <>
                                                            <button
                                                                onClick={() => setViewingSheetSession(session)}
                                                                className="p-1.5 rounded-lg text-teal-500 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all"
                                                                title="View Sheet"
                                                            >
                                                                <ClipboardListIcon size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const tid = session.target_id || session.targetId;
                                                                    const ttype = session.target_type || session.targetType;
                                                                    let athletes = [];
                                                                    if (ttype === 'Team') {
                                                                        const team = teams.find(t => t.id === tid);
                                                                        athletes = [...(team?.players || [])].sort((a, b) => a.name.localeCompare(b.name));
                                                                    } else {
                                                                        for (const t of teams) {
                                                                            const p = (t.players || []).find(p => p.id === tid);
                                                                            if (p) { athletes = [p]; break; }
                                                                        }
                                                                    }
                                                                    printSheet(exRaw.weightroomSheet, athletes, maxLookup, session.title);
                                                                }}
                                                                className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-all"
                                                                title="Print Sheet"
                                                            >
                                                                <PrinterIcon size={13} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {session.status !== 'Completed' && (
                                                        <button
                                                            onClick={() => setCompletingSession(session)}
                                                            className="p-1.5 rounded-lg text-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                                                            title="Mark Complete"
                                                        >
                                                            <CheckCircle2Icon size={13} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleEdit(session)}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                                        title="Edit"
                                                    >
                                                        <PencilIcon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReassign(session)}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                                                        title="Reassign"
                                                    >
                                                        <RepeatIcon size={13} />
                                                    </button>
                                                    {confirmDeleteId === session.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => handleDelete(session.id)} disabled={deleting} className="px-2 py-1 bg-red-600 text-white rounded text-[9px] font-semibold hover:bg-red-700">
                                                                {deleting ? '…' : 'Delete'}
                                                            </button>
                                                            <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] rounded text-[9px] font-semibold">
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDeleteId(session.id)}
                                                            className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2Icon size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">
                                Showing {historySessions.length} session{historySessions.length !== 1 ? 's' : ''}
                                {(teamFilter || athleteFilter) ? ' (filtered)' : ''}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Complete Session Modal */}
            {completingSession && (
                <CompleteSessionModal
                    session={completingSession}
                    athletes={resolveAthletes(completingSession)}
                    onComplete={handleCompleteSession}
                    onClose={() => setCompletingSession(null)}
                />
            )}

            {/* View Sheet Modal */}
            {viewingSheetSession && (() => {
                const sheetConfig = viewingSheetSession.exercises?.weightroomSheet;
                if (!sheetConfig) return null;
                const tid = viewingSheetSession.target_id || viewingSheetSession.targetId;
                const ttype = viewingSheetSession.target_type || viewingSheetSession.targetType;
                let sheetAthletes = [];
                if (ttype === 'Team') {
                    const team = teams.find(t => t.id === tid);
                    sheetAthletes = [...(team?.players || [])].sort((a, b) => a.name.localeCompare(b.name));
                } else {
                    for (const t of teams) {
                        const p = (t.players || []).find(p => p.id === tid);
                        if (p) { sheetAthletes = [p]; break; }
                    }
                }

                return (
                    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-3xl shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden max-h-[80vh] flex flex-col">
                            <div className="px-5 py-3 bg-teal-700 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2.5 text-white">
                                    <ClipboardListIcon size={16} />
                                    <span className="text-xs font-black uppercase tracking-widest">Weightroom Sheet</span>
                                    <span className="text-[10px] text-teal-200">{viewingSheetSession.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => printSheet(sheetConfig, sheetAthletes, maxLookup, viewingSheetSession.title)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-semibold transition-all"
                                    >
                                        <PrinterIcon size={11} /> Print
                                    </button>
                                    <button onClick={() => setViewingSheetSession(null)} className="text-teal-200 hover:text-white transition-colors">
                                        <XIcon size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 overflow-y-auto">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-xs">
                                        <thead>
                                            <tr>
                                                <th className="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">Name</th>
                                                {sheetConfig.columns.map(col => (
                                                    <th key={col.id} className="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">
                                                        {col.label} ({col.percentage}%)
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sheetAthletes.length === 0 ? (
                                                <tr><td colSpan={sheetConfig.columns.length + 1} className="px-3 py-6 text-center text-slate-300 dark:text-[#475569] text-xs">No athletes found</td></tr>
                                            ) : sheetAthletes.map(a => (
                                                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                    <td className="px-3 py-2 font-semibold text-slate-800 dark:text-[#E2E8F0] uppercase text-[11px] border border-slate-200 dark:border-[#243A58] whitespace-nowrap">{a.name}</td>
                                                    {sheetConfig.columns.map(col => (
                                                        <td key={col.id} className="px-3 py-2 text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] text-center min-w-[80px]">
                                                            {getSheetCellValue(col, a.id, maxLookup) || '\u2014'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default WorkoutHistoryPage;
