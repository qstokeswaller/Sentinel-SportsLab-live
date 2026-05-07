// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
  XIcon, CheckCircle2Icon, ChevronDownIcon, LockIcon,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface ExerciseRow {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  fromSheet?: boolean;
}

interface AthleteResult {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  tonnage: number;
}

interface Props {
  session: any;
  athletes: { id: string; name: string }[];
  onComplete: (sessionId: string, actualResults: Record<string, AthleteResult[]>, actualRpe: number | null) => void;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function parseExercises(session: any): ExerciseRow[] {
  const exRaw = session.exercises;
  if (!exRaw) return [];

  // Flat array format (from programs/packets)
  if (Array.isArray(exRaw)) {
    return exRaw.map((ex: any) => ({
      exerciseId: ex.exercise_id || ex.exerciseId || '',
      exerciseName: ex.exercise_name || ex.exerciseName || ex.name || 'Unknown',
      sets: parseInt(ex.sets) || 0,
      reps: parseInt(ex.reps) || 0,
      weight: parseFloat(ex.weight) || 0,
    }));
  }

  // Sectioned format { warmup: [], workout: [], cooldown: [] }
  const sections = ['warmup', 'workout', 'cooldown'];
  const rows: ExerciseRow[] = [];
  for (const sec of sections) {
    if (Array.isArray(exRaw[sec])) {
      for (const ex of exRaw[sec]) {
        rows.push({
          exerciseId: ex.exercise_id || ex.exerciseId || '',
          exerciseName: ex.exercise_name || ex.exerciseName || ex.name || 'Unknown',
          sets: parseInt(ex.sets) || 0,
          reps: parseInt(ex.reps) || 0,
          weight: parseFloat(ex.weight) || 0,
        });
      }
    }
  }
  return rows;
}

// ── Modal Component ────────────────────────────────────────────────────────

export const CompleteSessionModal = ({ session, athletes, onComplete, onClose }: Props) => {
  const isTeam = athletes.length > 1;
  const [selectedAthleteId, setSelectedAthleteId] = useState(athletes[0]?.id || '');
  const [rpe, setRpe] = useState('');
  const [saving, setSaving] = useState(false);

  // Build per-athlete editable data from the session's prescribed exercises
  const baseExercises = useMemo(() => parseExercises(session), [session]);

  const hasSheet = !!session.exercises?.weightroomSheet;

  // State: { athleteId -> ExerciseRow[] }
  const [athleteData, setAthleteData] = useState<Record<string, ExerciseRow[]>>(() => {
    const init: Record<string, ExerciseRow[]> = {};
    for (const a of athletes) {
      init[a.id] = baseExercises.map((ex) => {
        const exRaw = session.exercises;
        let weight = ex.weight;
        let fromSheet = false;

        // Find the original exercise data to check for athlete_weight_overrides
        let orig: any = null;
        if (Array.isArray(exRaw)) {
          orig = exRaw.find((e: any) => (e.exercise_id || e.exerciseId) === ex.exerciseId);
        } else {
          // Sectioned format { warmup: [], workout: [], cooldown: [] }
          for (const sec of ['warmup', 'workout', 'cooldown']) {
            if (Array.isArray(exRaw?.[sec])) {
              orig = exRaw[sec].find((e: any) => (e.exercise_id || e.exerciseId) === ex.exerciseId);
              if (orig) break;
            }
          }
        }

        if (orig?.athlete_weight_overrides?.[a.id]) {
          weight = parseFloat(orig.athlete_weight_overrides[a.id]) || weight;
          fromSheet = hasSheet;
        }

        return { ...ex, weight, fromSheet };
      });
    }
    return init;
  });

  const currentRows = athleteData[selectedAthleteId] || [];

  const updateRow = (idx: number, field: keyof ExerciseRow, value: string) => {
    setAthleteData((prev) => {
      const rows = [...(prev[selectedAthleteId] || [])];
      const row = { ...rows[idx] };
      if (field === 'sets' || field === 'reps') {
        (row as any)[field] = parseInt(value) || 0;
      } else if (field === 'weight') {
        (row as any)[field] = parseFloat(value) || 0;
      }
      rows[idx] = row;
      return { ...prev, [selectedAthleteId]: rows };
    });
  };

  const totalTonnage = useMemo(
    () => currentRows.reduce((sum, r) => sum + r.sets * r.reps * r.weight, 0),
    [currentRows]
  );

  const handleComplete = async () => {
    setSaving(true);
    // Build actual_results keyed by athleteId
    const results: Record<string, AthleteResult[]> = {};
    for (const a of athletes) {
      const rows = athleteData[a.id] || [];
      results[a.id] = rows.map((r) => ({
        exerciseId: r.exerciseId,
        exerciseName: r.exerciseName,
        sets: r.sets,
        reps: r.reps,
        weight: r.weight,
        tonnage: r.sets * r.reps * r.weight,
      }));
    }
    const actualRpe = rpe ? parseInt(rpe) : null;
    onComplete(session.id, results, actualRpe);
  };

  const inputCls =
    'w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-indigo-400 transition-colors text-center';

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="px-5 py-3.5 bg-emerald-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-white">
            <CheckCircle2Icon size={16} />
            <span className="text-xs font-black uppercase tracking-widest">Complete Session</span>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        {/* Session info */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">{session.title || 'Untitled Session'}</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {new Date(session.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            {session.time ? ` at ${session.time}` : ''}
          </p>
        </div>

        {/* Athlete selector (team sessions) */}
        {isTeam && (
          <div className="px-5 py-3 border-b border-slate-200 flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Athlete</span>
            <div className="relative flex-1 max-w-xs">
              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none appearance-none pr-8 focus:border-indigo-400"
              >
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDownIcon size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Exercise table */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {currentRows.length === 0 ? (
            <div className="text-center py-8 text-slate-300 text-xs">No exercises in this session</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-[9px] font-semibold uppercase text-slate-400 tracking-wider pb-2 pr-3">Exercise</th>
                  <th className="text-center text-[9px] font-semibold uppercase text-slate-400 tracking-wider pb-2 w-16">Sets</th>
                  <th className="text-center text-[9px] font-semibold uppercase text-slate-400 tracking-wider pb-2 w-16">Reps</th>
                  <th className="text-center text-[9px] font-semibold uppercase text-slate-400 tracking-wider pb-2 w-20">Weight (kg)</th>
                  <th className="text-center text-[9px] font-semibold uppercase text-slate-400 tracking-wider pb-2 w-20">Tonnage</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row, idx) => {
                  const tonnage = row.sets * row.reps * row.weight;
                  return (
                    <tr key={`${row.exerciseId}-${idx}`} className="border-b border-slate-100">
                      <td className="py-2.5 pr-3 font-semibold text-slate-800">{row.exerciseName}</td>
                      <td className="py-2.5">
                        <input
                          className={inputCls}
                          value={row.sets || ''}
                          onChange={(e) => updateRow(idx, 'sets', e.target.value)}
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          className={inputCls}
                          value={row.reps || ''}
                          onChange={(e) => updateRow(idx, 'reps', e.target.value)}
                        />
                      </td>
                      <td className="py-2.5">
                        {row.fromSheet ? (
                          <div className="relative" title="Weight from 1RM sheet — edit the sheet to change">
                            <input className={`${inputCls} bg-indigo-50 border-indigo-200 text-indigo-700 pr-7`} value={row.weight || ''} readOnly />
                            <LockIcon size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400" />
                          </div>
                        ) : (
                          <input
                            className={inputCls}
                            value={row.weight || ''}
                            onChange={(e) => updateRow(idx, 'weight', e.target.value)}
                          />
                        )}
                      </td>
                      <td className="py-2.5 text-center font-bold text-slate-600">
                        {tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-wider">Total Tonnage</span>
                <div className="text-lg font-black text-slate-900">{totalTonnage.toLocaleString()} kg</div>
              </div>
              <div>
                <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wider block mb-1">Session RPE</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  placeholder="1-10"
                  className="w-20 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-400 text-center"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold uppercase tracking-wide shadow-lg transition-all disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2Icon size={14} />
                {saving ? 'Saving...' : 'Mark Complete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteSessionModal;
