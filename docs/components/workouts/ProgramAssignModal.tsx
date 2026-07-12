// @ts-nocheck
// Assign a saved Program to a team or individual on a start date.
// Creates a scheduled_session per non-rest day, dating Day N to startDate + N-1.
import React, { useMemo, useState } from 'react';
import { CalendarPlus as CalendarPlusIcon, XIcon } from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';
import { useAppState } from '../../context/AppStateContext';
import { useProgramWithDays } from '../../hooks/useWorkoutPrograms';
import { useExerciseMap } from '../../hooks/useExerciseMap';
import { computePlannedTonnage } from '../../utils/plannedTonnage';
import { DatabaseService } from '../../services/databaseService';

interface ProgramAssignModalProps {
    program: { id: string; name: string; training_phase?: string | null } | null;
    isOpen: boolean;
    onClose: () => void;
}

export const ProgramAssignModal: React.FC<ProgramAssignModalProps> = ({ program, isOpen, onClose }) => {
    const { teams, scheduleWorkoutSession, showToast, setPlannedTonnageLog } = useAppState();
    const { data: fullProgram, isLoading } = useProgramWithDays(isOpen ? program?.id ?? null : null);
    const { exerciseFullMap } = useExerciseMap();

    const [targetType, setTargetType] = useState<'Team' | 'Individual'>('Team');
    const [targetId, setTargetId] = useState('');
    const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [assigning, setAssigning] = useState(false);

    const allPlayers = useMemo(
        () => teams.flatMap(t => t.players || []).sort((a, b) => a.name.localeCompare(b.name)),
        [teams]
    );

    if (!isOpen || !program) return null;

    const totalDays = (fullProgram?.days ?? []).length;
    const restDays = (fullProgram?.days ?? []).filter((d: any) => d.is_rest_day).length;
    const trainingDays = totalDays - restDays;

    const handleAssign = async () => {
        if (!targetId) { showToast('Pick a team or athlete', 'error'); return; }
        if (!fullProgram) { showToast('Program still loading', 'error'); return; }

        setAssigning(true);
        try {
            // ── Single calendar entry at the program start date ─────────────
            // Previously this loop created N scheduled sessions (one per training day) and
            // cluttered the dashboard calendar. Now we create ONE entry that carries the
            // full program metadata (end date, week/day/rest counts) for the calendar popup.
            const start = new Date(startDate);
            const totalDays = (fullProgram.days ?? []).length;
            const endDate = new Date(start);
            endDate.setDate(start.getDate() + Math.max(0, totalDays - 1));
            const endDateStr = endDate.toISOString().split('T')[0];
            const totalWeeks = Math.ceil(totalDays / 7);

            const savedSession = await scheduleWorkoutSession({
                title: program.name,
                date: startDate,
                time,
                target_type: targetType,
                target_id: targetId,
                training_phase: program.training_phase || 'General',
                load: 'Medium',
                status: 'Scheduled',
                planned_duration: 60,
                session_type: 'program',
                program_id: program.id,
                program_end_date: endDateStr,
                program_meta: {
                    total_weeks: totalWeeks,
                    total_days: totalDays,
                    training_days: trainingDays,
                    rest_days: restDays,
                    program_name: program.name,
                    program_overview: (fullProgram as any).overview ?? null,
                },
                exercises: {}, // intentionally empty — calendar popup reads from the linked program
            });

            // ── Materialize planned tonnage per (athlete × non-rest day) ─────
            // Calendar still shows ONE entry for the program (clean UX), but
            // tonnage tracking needs per-day granularity so Tracking Hub / Data
            // Hub can chart progression. We compute each non-rest day's tonnage
            // and stamp the date as startDate + dayOffset.
            try {
                if ((fullProgram as any)?.track_tonnage !== false) {
                    const targetAthletes = targetType === 'Team'
                        ? (teams.find(t => t.id === targetId)?.players || [])
                        : allPlayers.filter(p => p.id === targetId);
                    const rows: Array<any> = [];
                    (fullProgram.days || []).forEach((d: any) => {
                        if (d.is_rest_day || !d.exercises || d.exercises.length === 0) return;
                        // Day's date = start + (day_number - 1). Use day_number 1-based.
                        const offset = Math.max(0, (d.day_number || 1) - 1);
                        const dDate = new Date(start);
                        dDate.setDate(start.getDate() + offset);
                        const dateStr = dDate.toISOString().split('T')[0];
                        // Map DB row shape (snake_case) → tonnage helper expectations
                        const prescriptionRows = (d.exercises || []).map((ex: any) => ({
                            exerciseId: ex.exercise_id,
                            exerciseName: ex.exercise_name,
                            sets: ex.sets,
                            reps: ex.reps,
                            weight: ex.weight,
                        }));
                        const perAthlete = computePlannedTonnage(prescriptionRows, targetAthletes as any, exerciseFullMap);
                        for (const p of perAthlete) {
                            rows.push({
                                athlete_id: p.athleteId,
                                date: dateStr,
                                source_type: 'program' as const,
                                source_id: program.id,
                                program_day_id: d.id || null,
                                total_tonnage: p.total,
                                by_body_part: p.byBodyPart,
                            });
                        }
                    });
                    if (rows.length > 0) {
                        await DatabaseService.insertPlannedTonnageRows(rows);
                        // Optimistic local update so Tracking Hub / Data Hub see new rows instantly
                        setPlannedTonnageLog?.((prev: any[]) => [...rows.map(r => ({ ...r, created_at: new Date().toISOString() })), ...prev]);
                    }
                }
            } catch (tonnageErr) {
                console.error('Program planned tonnage write failed (non-fatal):', tonnageErr);
            }

            showToast(`"${program.name}" scheduled — runs ${totalWeeks} week${totalWeeks !== 1 ? 's' : ''}`, 'success');
            onClose();
        } catch (e: any) {
            showToast(e.message || 'Failed to assign', 'error');
        } finally {
            setAssigning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58] flex items-start justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Assign Program</h3>
                        <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-0.5 truncate max-w-[260px]">{program.name}</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                        <XIcon size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">
                    {/* Target type toggle */}
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1] mb-1.5 block">Assign To</label>
                        <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                            {(['Team', 'Individual'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setTargetType(t); setTargetId(''); }}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                        targetType === t
                                            ? 'bg-white dark:bg-[#243A58] text-indigo-700 dark:text-indigo-300 shadow-sm'
                                            : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                                    }`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target picker */}
                    <div>
                        <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1] mb-1.5 block">{targetType}</label>
                        <CustomSelect value={targetId} onChange={(e: any) => setTargetId(e.target.value)} variant="form" size="sm" placeholder="Select...">
                            <option value="">Select...</option>
                            {targetType === 'Team'
                                ? teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                : allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                            }
                        </CustomSelect>
                    </div>

                    {/* Start date + Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1] mb-1.5 block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1] mb-1.5 block">Time</label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400"
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="px-3 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/25 text-[11px] text-indigo-700 dark:text-indigo-300">
                        {isLoading ? (
                            'Loading program…'
                        ) : (() => {
                            const totalDays = (fullProgram?.days ?? []).length;
                            const weeks = Math.ceil(totalDays / 7);
                            const endDate = new Date(startDate);
                            endDate.setDate(endDate.getDate() + Math.max(0, totalDays - 1));
                            return (
                                <>
                                    Adds <strong>one</strong> calendar entry on <strong>{startDate}</strong> covering <strong>{weeks}</strong> week{weeks !== 1 ? 's' : ''} ({trainingDays} training · {restDays} rest). Ends <strong>{endDate.toISOString().split('T')[0]}</strong>.
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-[#243A58] flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={assigning}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-[#243A58] text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] disabled:opacity-60 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssign}
                        disabled={assigning || !targetId || isLoading || trainingDays === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow-sm"
                    >
                        <CalendarPlusIcon size={13} />
                        {assigning ? 'Assigning…' : `Assign ${trainingDays} Session${trainingDays !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};
