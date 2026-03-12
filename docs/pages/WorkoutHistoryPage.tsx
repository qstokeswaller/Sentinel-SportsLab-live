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
} from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { buildMaxLookup, getSheetCellValue, printSheet } from '../utils/weightroomUtils';

// ── Helper ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Page Component ───────────────────────────────────────────────────────────

export const WorkoutHistoryPage = () => {
    const navigate = useNavigate();
    const {
        scheduledSessions, setScheduledSessions, teams, resolveTargetName, showToast, maxHistory,
    } = useAppState();

    const [historyFilter, setHistoryFilter] = useState('All');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [viewingSheetSession, setViewingSheetSession] = useState(null);

    const maxLookup = useMemo(() => buildMaxLookup(maxHistory), [maxHistory]);

    const allPlayers = useMemo(() => teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)), [teams]);

    const historySessions = useMemo(() => {
        const sorted = [...(scheduledSessions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (historyFilter === 'All') return sorted;
        if (historyFilter.startsWith('team_')) {
            const teamId = historyFilter.replace('team_', '');
            return sorted.filter(s => s.targetId === teamId || s.target_id === teamId);
        }
        return sorted.filter(s => s.targetId === historyFilter || s.target_id === historyFilter);
    }, [scheduledSessions, historyFilter]);

    const handleEdit = (session) => {
        navigate('/workouts/packets', {
            state: {
                editSession: session,
                returnTo: '/workouts/history',
            },
        });
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
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/workouts')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all" title="Back to Workouts">
                            <ArrowLeftIcon size={18} />
                        </button>
                        <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <HistoryIcon size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Workout History</h2>
                            <p className="text-[10px] text-slate-400 mt-0.5">All assigned workouts across athletes & teams</p>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{historySessions.length} sessions</span>
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2 block">Filter by Athlete or Team</label>
                <div className="relative max-w-md">
                    <select
                        value={historyFilter}
                        onChange={e => setHistoryFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 outline-none appearance-none pr-10 hover:border-slate-300 focus:border-emerald-400 transition-all"
                    >
                        <option value="All">All Athletes & Teams</option>
                        <optgroup label="Teams">
                            {teams.map(t => <option key={t.id} value={`team_${t.id}`}>{t.name}</option>)}
                        </optgroup>
                        <optgroup label="Athletes">
                            {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                    </select>
                    <ChevronDownIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Sessions list */}
            <div className="space-y-2">
                {historySessions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 flex flex-col items-center text-slate-300 gap-2">
                        <ClockIcon size={32} className="opacity-40" />
                        <p className="text-xs text-slate-400">No workout sessions found</p>
                        <p className="text-[10px] text-slate-300">Schedule workouts from Workout Packets to see them here</p>
                        <button onClick={() => navigate('/workouts/packets')} className="mt-3 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all">
                            Go to Workout Packets
                        </button>
                    </div>
                ) : (
                    historySessions.map(session => {
                        const targetName = resolveTargetName(session.targetId || session.target_id, session.targetType || session.target_type);
                        const phase = session.trainingPhase || session.training_phase || '';
                        const exRaw = session.exercises;
                        const exCount = exRaw
                            ? (Array.isArray(exRaw) ? exRaw.length : (exRaw.warmup?.length || 0) + (exRaw.workout?.length || 0) + (exRaw.cooldown?.length || 0))
                            : (session.exercise_ids || []).length;
                        const isTeam = (session.targetType || session.target_type) === 'Team';
                        const statusColor = session.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' : session.status === 'Cancelled' ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600';

                        return (
                            <div key={session.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all group shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${statusColor}`}>{session.status || 'Scheduled'}</span>
                                            {phase && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-semibold">{phase}</span>}
                                            {session.load && <span className="text-[9px] text-slate-400">{session.load} Load</span>}
                                        </div>
                                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">{session.title || 'Untitled Session'}</h4>
                                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <ClockIcon size={10} />
                                                {formatDate(session.date)}{session.time ? ` at ${session.time}` : ''}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                {isTeam ? <UsersIcon size={10} /> : <UserIcon size={10} />}
                                                {targetName}
                                            </span>
                                            {exCount > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <DumbbellIcon size={10} />
                                                    {exCount} exercises
                                                </span>
                                            )}
                                            {exRaw?.weightroomSheet && (
                                                <span className="flex items-center gap-1 text-teal-600 font-semibold">
                                                    <ClipboardListIcon size={10} />
                                                    Sheet
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {exRaw?.weightroomSheet && (
                                            <>
                                                <button
                                                    onClick={() => setViewingSheetSession(session)}
                                                    className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5"
                                                >
                                                    <ClipboardListIcon size={11} /> View Sheet
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
                                                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5"
                                                >
                                                    <PrinterIcon size={11} /> Print Sheet
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleEdit(session)}
                                            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5"
                                            title="Edit workout"
                                        >
                                            <PencilIcon size={11} /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleReassign(session)}
                                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5"
                                        >
                                            <RepeatIcon size={11} /> Reassign
                                        </button>
                                        {confirmDeleteId === session.id ? (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] font-semibold text-red-600">Delete?</span>
                                                <button
                                                    onClick={() => handleDelete(session.id)}
                                                    disabled={deleting}
                                                    className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-semibold transition-all hover:bg-red-700"
                                                >
                                                    {deleting ? '...' : 'Yes'}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold transition-all hover:bg-slate-200"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDeleteId(session.id)}
                                                className="px-3 py-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5"
                                                title="Remove from history"
                                            >
                                                <Trash2Icon size={11} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

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
                        <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl border border-slate-200 overflow-hidden max-h-[80vh] flex flex-col">
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
                                                <tr><td colSpan={sheetConfig.columns.length + 1} className="px-3 py-6 text-center text-slate-300 text-xs">No athletes found</td></tr>
                                            ) : sheetAthletes.map(a => (
                                                <tr key={a.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 font-semibold text-slate-800 uppercase text-[11px] border border-slate-200 whitespace-nowrap">{a.name}</td>
                                                    {sheetConfig.columns.map(col => (
                                                        <td key={col.id} className="px-3 py-2 text-slate-600 border border-slate-200 text-center min-w-[80px]">
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
