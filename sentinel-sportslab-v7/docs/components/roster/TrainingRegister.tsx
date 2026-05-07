// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import {
    CalendarIcon, CheckCircle2Icon, ClipboardListIcon, ChevronDownIcon,
    ChevronUpIcon, SaveIcon, Loader2Icon, UsersIcon,
} from 'lucide-react';

interface AttendanceRecord {
    id: string;
    session_id: string;
    team_id: string;
    date: string;
    absent_athlete_ids: string[];
    attendance_count: number;
    attendance_total: number;
    notes: string | null;
}

interface TrainingRegisterProps {
    team: { id: string; name: string; players: any[] };
}

const TrainingRegister: React.FC<TrainingRegisterProps> = ({ team }) => {
    const { scheduledSessions, showToast } = useAppState();

    const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
    const [localAbsent, setLocalAbsent] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const players = team.players || [];

    // Filter sessions targeting this team
    const teamSessions = useMemo(() =>
        (scheduledSessions || [])
            .filter((s: any) => s.targetType === 'Team' && s.targetId === team.id)
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [scheduledSessions, team.id]
    );

    // Load attendance data
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const rows = await DatabaseService.fetchAttendanceByTeam(team.id);
                if (cancelled) return;
                const map: Record<string, AttendanceRecord> = {};
                rows.forEach((r: any) => { map[r.session_id] = r; });
                setAttendanceMap(map);
            } catch (err) {
                console.error('Failed to load attendance:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [team.id]);

    // When expanding a session, initialise local state from saved data
    const handleExpand = (sessionId: string) => {
        if (expandedSessionId === sessionId) {
            setExpandedSessionId(null);
            return;
        }
        setExpandedSessionId(sessionId);
        const saved = attendanceMap[sessionId];
        if (saved) {
            setLocalAbsent(new Set(saved.absent_athlete_ids || []));
            setNotes(saved.notes || '');
        } else {
            setLocalAbsent(new Set());
            setNotes('');
        }
    };

    const toggleAthlete = (athleteId: string) => {
        setLocalAbsent(prev => {
            const next = new Set(prev);
            if (next.has(athleteId)) next.delete(athleteId);
            else next.add(athleteId);
            return next;
        });
    };

    const presentCount = players.length - localAbsent.size;
    const progressPct = players.length > 0 ? (presentCount / players.length) * 100 : 0;

    const handleSave = async () => {
        if (!expandedSessionId) return;
        const session = teamSessions.find((s: any) => s.id === expandedSessionId);
        if (!session) return;

        setSaving(true);
        try {
            const record = {
                session_id: expandedSessionId,
                team_id: team.id,
                date: session.date,
                absent_athlete_ids: Array.from(localAbsent),
                attendance_count: presentCount,
                attendance_total: players.length,
                notes: notes.trim() || undefined,
            };
            const saved = await DatabaseService.saveAttendance(record);
            setAttendanceMap(prev => ({ ...prev, [expandedSessionId]: saved }));
            showToast?.('Attendance saved');
        } catch (err: any) {
            console.error('Save attendance failed:', err);
            showToast?.('Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    // Format helpers
    const fmtDate = (d: string) => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const loadColour = (load: string) => {
        switch (load) {
            case 'High': return 'bg-rose-100 text-rose-700';
            case 'Medium': return 'bg-amber-100 text-amber-700';
            case 'Low': return 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700';
            default: return 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]';
        }
    };

    const statusColour = (status: string) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700';
            case 'Missed': return 'bg-rose-100 text-rose-700';
            case 'Modified': return 'bg-amber-100 text-amber-700';
            default: return 'bg-sky-100 text-sky-700';
        }
    };

    // ── Empty state ──
    if (!loading && teamSessions.length === 0) {
        return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-dashed border-slate-200 dark:border-[#243A58] p-12 text-center">
                <ClipboardListIcon size={28} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400 dark:text-[#64748B]">No sessions scheduled for this team.</p>
                <p className="text-xs text-slate-300 dark:text-[#475569] mt-1">Schedule training sessions from the Calendar to track attendance here.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2Icon size={20} className="text-indigo-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {teamSessions.map((session: any) => {
                const isExpanded = expandedSessionId === session.id;
                const saved = attendanceMap[session.id];

                return (
                    <div key={session.id} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        {/* Session row */}
                        <button
                            onClick={() => handleExpand(session.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors text-left"
                        >
                            <CalendarIcon size={14} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                            <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] w-28 shrink-0">
                                {fmtDate(session.date)}
                            </span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] truncate flex-1">
                                {session.title || 'Untitled Session'}
                            </span>

                            {/* Load pill */}
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${loadColour(session.load)}`}>
                                {session.load}
                            </span>

                            {/* Status pill */}
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColour(session.status)}`}>
                                {session.status}
                            </span>

                            {/* Attendance badge */}
                            {saved && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full">
                                    <CheckCircle2Icon size={10} />
                                    {saved.attendance_count}/{saved.attendance_total}
                                </span>
                            )}

                            {isExpanded
                                ? <ChevronUpIcon size={14} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                                : <ChevronDownIcon size={14} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                            }
                        </button>

                        {/* Expanded attendance panel */}
                        {isExpanded && (
                            <div className="border-t border-slate-100 dark:border-[#1A2D48] px-4 py-4 space-y-4 bg-slate-50/50 dark:bg-[#132338]/40">
                                {/* Counter bar */}
                                <div className="flex items-center gap-3">
                                    <UsersIcon size={14} className="text-slate-400 dark:text-[#64748B]" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-[#E2E8F0]">
                                        {presentCount}/{players.length} Present
                                    </span>
                                    <div className="flex-1 h-2 bg-slate-200 dark:bg-[#243A58] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Athlete chips grid */}
                                {players.length === 0 ? (
                                    <p className="text-xs text-slate-400 dark:text-[#64748B] italic">No athletes in this team.</p>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {players.map((player: any) => {
                                            const isAbsent = localAbsent.has(player.id);
                                            return (
                                                <button
                                                    key={player.id}
                                                    onClick={() => toggleAthlete(player.id)}
                                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                                                        isAbsent
                                                            ? 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] opacity-50'
                                                            : 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/25 shadow-sm'
                                                    }`}
                                                >
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                        isAbsent
                                                            ? 'bg-slate-200 dark:bg-[#243A58] text-slate-400 dark:text-[#64748B]'
                                                            : 'bg-indigo-500 text-white'
                                                    }`}>
                                                        {player.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <span className={`text-sm font-medium truncate ${
                                                        isAbsent
                                                            ? 'text-slate-400 dark:text-[#64748B] line-through'
                                                            : 'text-slate-900 dark:text-[#E2E8F0]'
                                                    }`}>
                                                        {player.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Notes */}
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide block mb-1">
                                        Notes (optional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        rows={2}
                                        className="w-full bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors resize-none"
                                        placeholder="e.g. 3 players at physio, goalkeeper session split..."
                                    />
                                </div>

                                {/* Save button */}
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors w-full sm:w-auto"
                                >
                                    {saving
                                        ? <><Loader2Icon size={14} className="animate-spin" /> Saving...</>
                                        : <><SaveIcon size={14} /> Save Attendance</>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default TrainingRegister;
