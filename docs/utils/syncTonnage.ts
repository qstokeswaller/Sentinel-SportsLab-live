// @ts-nocheck
// ── Tonnage re-sync helpers ───────────────────────────────────────────────
// Called after a packet/program is edited so future-dated tonnage rows
// reflect the latest prescription. Past-dated rows are preserved per the
// "if its done before the assigned date" rule — historical tonnage is
// frozen as it was originally prescribed.
//
// All helpers are best-effort: failures log but don't throw, so a failing
// resync never blocks the save action that triggered it.

import { DatabaseService } from '../services/databaseService';
import { computePlannedTonnage } from './plannedTonnage';

/** Local YYYY-MM-DD for today — used as the "freeze cutoff" for future filtering */
export const todayLocalDate = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Walk a program's day structure and produce the future-dated tonnage rows that
 *  would be written for an assignment starting on `startDate`. Mirrors the
 *  ProgramAssignModal.handleAssign logic but only emits rows for dates > today. */
export function buildFutureProgramTonnageRows({
    programId,
    fullProgram,
    startDate,
    athletes,
    exerciseFullMap,
}: {
    programId: string;
    fullProgram: any;
    startDate: string;
    athletes: Array<{ id: string }>;
    exerciseFullMap: Record<string, any>;
}): Array<any> {
    const out: Array<any> = [];
    if (!fullProgram?.days || !startDate) return out;
    if (fullProgram.track_tonnage === false) return out; // honoured at the source level
    const today = todayLocalDate();
    const start = new Date(startDate);
    for (const d of fullProgram.days) {
        if (d.is_rest_day || !d.exercises || d.exercises.length === 0) continue;
        const offset = Math.max(0, (d.day_number || 1) - 1);
        const dDate = new Date(start);
        dDate.setDate(start.getDate() + offset);
        const dateStr = dDate.toISOString().split('T')[0];
        if (dateStr <= today) continue; // historical day — leave frozen
        const prescriptionRows = (d.exercises || []).map((ex: any) => ({
            exerciseId: ex.exercise_id,
            exerciseName: ex.exercise_name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
        }));
        const perAthlete = computePlannedTonnage(prescriptionRows, athletes as any, exerciseFullMap);
        for (const p of perAthlete) {
            out.push({
                athlete_id: p.athleteId,
                date: dateStr,
                source_type: 'program' as const,
                source_id: programId,
                program_day_id: d.id || null,
                total_tonnage: p.total,
                by_body_part: p.byBodyPart,
            });
        }
    }
    return out;
}

/** Re-sync tonnage for a single program assignment after the program is edited.
 *  Deletes the assignment's future tonnage rows, recomputes from the latest
 *  program structure, inserts new rows. Past rows untouched. */
export async function resyncProgramAssignmentTonnage(opts: {
    programId: string;
    fullProgram: any;
    startDate: string;
    athletes: Array<{ id: string }>;
    exerciseFullMap: Record<string, any>;
    /** Append-to-state callback (optimistic update) */
    onApplyLocal?: (newRows: any[], removedFilter: (row: any) => boolean) => void;
}): Promise<void> {
    try {
        const newRows = buildFutureProgramTonnageRows({
            programId: opts.programId,
            fullProgram: opts.fullProgram,
            startDate: opts.startDate,
            athletes: opts.athletes,
            exerciseFullMap: opts.exerciseFullMap,
        });
        // Delete current future rows for this program source — programs all share
        // `source_id = program.id`, so one delete clears every assignment's future
        // rows for this program. Callers that want per-assignment scope should
        // narrow themselves before calling.
        await DatabaseService.deleteFutureTonnageForSource(opts.programId, todayLocalDate());
        if (newRows.length > 0) {
            await DatabaseService.insertPlannedTonnageRows(newRows);
        }
        if (opts.onApplyLocal) {
            const today = todayLocalDate();
            const removedFilter = (row: any) => !(row.source_id === opts.programId && row.date > today);
            opts.onApplyLocal(newRows.map(r => ({ ...r, created_at: new Date().toISOString() })), removedFilter);
        }
    } catch (err) {
        console.error('resyncProgramAssignmentTonnage failed (non-fatal):', err);
    }
}

/** Optimistic local-state mutator: drop future rows for a source then prepend new ones */
export function applyTonnageResyncToState(
    setPlannedTonnageLog: ((updater: (prev: any[]) => any[]) => void) | undefined,
    sourceId: string,
    newRows: any[],
): void {
    if (!setPlannedTonnageLog) return;
    const today = todayLocalDate();
    setPlannedTonnageLog((prev: any[]) => {
        const kept = prev.filter(r => !(r.source_id === sourceId && r.date > today));
        return [...newRows, ...kept];
    });
}
