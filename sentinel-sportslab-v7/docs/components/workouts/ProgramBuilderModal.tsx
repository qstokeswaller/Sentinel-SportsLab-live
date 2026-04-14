// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  XIcon, PlusIcon, Trash2Icon, ChevronDownIcon, SearchIcon,
  SaveIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon,
  Activity as ActivityIcon,
  Timer as TimerIcon, CopyIcon, MoonIcon,
} from 'lucide-react';
import { useSmartSearch } from '../../hooks/useSmartSearch';

import { useExerciseMap } from '../../hooks/useExerciseMap';
import { useAppState } from '../../context/AppStateContext';
import { LinkedSessionsPicker, LinkedSession } from '../conditioning/LinkedSessionsPicker';
import {
  useCreateProgram, useUpdateProgram, useSaveProgramFull,
  type WorkoutProgram, type FullProgram,
} from '../../hooks/useWorkoutPrograms';

// ── Types ──────────────────────────────────────────────────────────────────

interface LocalExRow {
  tempId: string;
  exerciseId: string;
  exerciseName: string;
  exerciseCategories: string[];
  exerciseBodyParts: string[];
  sets: string;
  reps: string;
  rest: string;
  rir: string;
  rpe: string;
  notes: string;
  weight: string;
}

interface LocalDay {
  tempId: string;
  name: string;
  instructions: string;
  isRestDay: boolean;
  warmup: LocalExRow[];
  workout: LocalExRow[];
  cooldown: LocalExRow[];
  linkedSessions: LinkedSession[];
}

type Section = 'warmup' | 'workout' | 'cooldown';

// ── Constants ──────────────────────────────────────────────────────────────

const DAYS_PER_WEEK = 7;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const SECTION_LABELS: Record<Section, string> = {
  warmup: 'Warm Up',
  workout: 'Workout',
  cooldown: 'Cool Down',
};

const VOLUME_COLORS: Record<string, string> = {
  'Upper Body': 'bg-indigo-100 text-indigo-700',
  'Lower Body': 'bg-emerald-100 text-emerald-700',
  'Core': 'bg-amber-100 text-amber-700',
  'Full Body': 'bg-purple-100 text-purple-700',
  'Plyometric': 'bg-orange-100 text-orange-700',
  'Olympic Weightlifting': 'bg-rose-100 text-rose-700',
  'Powerlifting': 'bg-red-100 text-red-700',
  'Mobility': 'bg-teal-100 text-teal-700',
  'Bodybuilding': 'bg-sky-100 text-sky-700',
  'Calisthenics': 'bg-violet-100 text-violet-700',
};

const BODY_PART_COLORS: Record<string, string> = {
  'Chest': 'bg-rose-100 text-rose-700',
  'Back': 'bg-sky-100 text-sky-700',
  'Shoulders': 'bg-amber-100 text-amber-700',
  'Biceps': 'bg-cyan-100 text-cyan-700',
  'Triceps': 'bg-violet-100 text-violet-700',
  'Quadriceps': 'bg-emerald-100 text-emerald-700',
  'Hamstrings': 'bg-lime-100 text-lime-700',
  'Glutes': 'bg-pink-100 text-pink-700',
  'Calves': 'bg-teal-100 text-teal-700',
  'Abdominals': 'bg-orange-100 text-orange-700',
  'Forearms': 'bg-stone-100 text-stone-600',
  'Trapezius': 'bg-indigo-100 text-indigo-700',
  'Hip Flexors': 'bg-fuchsia-100 text-fuchsia-700',
  'Adductors': 'bg-blue-100 text-blue-700',
  'Abductors': 'bg-purple-100 text-purple-700',
  'Shins': 'bg-green-100 text-green-700',
};

const EXERCISE_CATEGORIES = [
  'All', 'Upper Body', 'Lower Body', 'Core', 'Full Body',
  'Mobility', 'Conditioning',
  'Bodybuilding', 'Powerlifting', 'Olympic Weightlifting',
  'Calisthenics', 'Plyometric', 'Balance', 'Postural',
  'Ballistics', 'Grinds', 'Isolation', 'Compound',
];

// ── Helpers ────────────────────────────────────────────────────────────────

const tempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const newDay = (n: number): LocalDay => ({
  tempId: tempId(),
  name: `Day ${n}`,
  instructions: '',
  isRestDay: false,
  warmup: [],
  workout: [],
  cooldown: [],
  linkedSessions: [],
});

const emptyRow = (ex: { id: string; name: string; categories: string[]; body_parts?: string[] }): LocalExRow => ({
  tempId: tempId(),
  exerciseId: ex.id,
  exerciseName: ex.name,
  exerciseCategories: ex.categories ?? [],
  exerciseBodyParts: ex.body_parts ?? [],
  sets: '',
  reps: '',
  rest: '',
  rir: '',
  rpe: '',
  notes: '',
  weight: '',
});

// ── Volume calculator ──────────────────────────────────────────────────────

function computeVolume(day: LocalDay): { byRegion: Record<string, number>; byBodyPart: Record<string, number> } {
  const byRegion: Record<string, number> = {};
  const byBodyPart: Record<string, number> = {};
  const allRows = [...day.warmup, ...day.workout, ...day.cooldown];
  for (const row of allRows) {
    const sets = parseInt(row.sets) || 0;
    if (sets <= 0) continue;
    const region = row.exerciseCategories[0];
    if (region) byRegion[region] = (byRegion[region] ?? 0) + sets;
    const part = row.exerciseBodyParts?.[0];
    if (part) byBodyPart[part] = (byBodyPart[part] ?? 0) + sets;
  }
  return { byRegion, byBodyPart };
}

// ── Exercise Row ───────────────────────────────────────────────────────────

const ExRow = ({
  row, letter, onChange, onRemove,
}: {
  row: LocalExRow;
  letter: string;
  onChange: (updated: LocalExRow) => void;
  onRemove: () => void;
}) => {
  const upd = (field: keyof LocalExRow, val: string | number) =>
    onChange({ ...row, [field]: val });

  const inputCls =
    'w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none focus:border-indigo-400 transition-colors';

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <span className="w-6 h-6 bg-slate-900 text-white rounded-md flex items-center justify-center text-[10px] font-semibold shrink-0">
          {letter}
        </span>
        <span className="flex-1 text-sm font-bold text-slate-800 truncate">{row.exerciseName}</span>
        <div className="flex flex-wrap gap-1">
          {row.exerciseCategories.slice(0, 2).map((c) => (
            <span key={c} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
              {c}
            </span>
          ))}
        </div>
        <button onClick={onRemove} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all ml-1">
          <Trash2Icon size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3">
        <div>
          <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Sets</label>
          <input className={inputCls} placeholder="3" value={row.sets} onChange={(e) => upd('sets', e.target.value)} />
        </div>
        <div>
          <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Reps</label>
          <input className={inputCls} placeholder="8-12" value={row.reps} onChange={(e) => upd('reps', e.target.value)} />
        </div>
        <div>
          <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Rest (s)</label>
          <input className={inputCls} placeholder="90" value={row.rest} onChange={(e) => upd('rest', e.target.value)} />
        </div>
        <div>
          <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">RIR</label>
          <input className={inputCls} placeholder="2" value={row.rir} onChange={(e) => upd('rir', e.target.value)} />
        </div>
        <div>
          <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">RPE</label>
          <input className={inputCls} placeholder="8" value={row.rpe} onChange={(e) => upd('rpe', e.target.value)} />
        </div>
        <div>
          <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Weight (kg)</label>
          <input className={inputCls} placeholder="80" value={row.weight} onChange={(e) => upd('weight', e.target.value)} />
        </div>
        <div className="col-span-3 lg:col-span-6">
          <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Notes</label>
          <input className={inputCls} placeholder="e.g. Full ROM, control the eccentric" value={row.notes}
            onChange={(e) => upd('notes', e.target.value)} />
        </div>
      </div>
    </div>
  );
};

// ── Main Modal ─────────────────────────────────────────────────────────────

interface ProgramBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProgram?: FullProgram | null;
}

export const ProgramBuilderModal = ({
  isOpen,
  onClose,
  editingProgram = null,
}: ProgramBuilderModalProps) => {
  const { wattbikeSessions, conditioningSessions, personalExerciseIds, showToast } = useAppState();

  // Program meta
  const [programName, setProgramName]         = useState('');
  const [programOverview, setProgramOverview] = useState('');
  const [programTags, setProgramTags]         = useState('');
  const [trackTonnage, setTrackTonnage]       = useState(true);

  // Days (flat array — grouped visually into weeks of 7)
  const [days, setDays]               = useState<LocalDay[]>([newDay(1)]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // Active section
  const [activeSection, setActiveSection] = useState<Section>('workout');

  // Exercise sidebar filters
  const [exSearch, setExSearch]     = useState('');
  const [exCategory, setExCategory] = useState('All');
  const [exLetter, setExLetter]     = useState('');   // '' = no letter filter
  const [exPage, setExPage]         = useState(1);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const createProgram = useCreateProgram();
  const updateProgram = useUpdateProgram();
  const saveFull      = useSaveProgramFull();
  const { exerciseFullMap } = useExerciseMap();

  // Reset page when any filter changes
  useEffect(() => { setExPage(1); }, [exSearch, exCategory, exLetter]);

  // Populate when editing
  useEffect(() => {
    if (!isOpen) return;
    if (editingProgram) {
      setProgramName(editingProgram.name);
      setProgramOverview(editingProgram.overview ?? '');
      setProgramTags((editingProgram.tags ?? []).join(', '));
      setTrackTonnage(editingProgram.track_tonnage !== false);

      const mapRow = (e: any): LocalExRow => {
        const exInfo = exerciseFullMap[e.exercise_id];
        const restSec = (e.rest_min ?? 0) * 60 + (e.rest_sec ?? 0);
        return {
          tempId: e.id, exerciseId: e.exercise_id,
          exerciseName: e.exercise_name || exInfo?.name || e.exercise_id,
          exerciseCategories: exInfo?.categories || e.categories || [],
          exerciseBodyParts: exInfo?.body_parts || e.body_parts || [],
          sets: e.sets ?? '', reps: e.reps ?? '',
          rest: restSec > 0 ? String(restSec) : '',
          rir: e.rir ?? '', rpe: e.rpe ?? '',
          notes: e.notes ?? '',
          weight: e.weight ?? '',
        };
      };
      const loadedDays: LocalDay[] = (editingProgram.days ?? []).map((d) => ({
        tempId: d.id,
        name: d.name ?? `Day ${d.day_number}`,
        instructions: d.instructions ?? '',
        isRestDay: d.is_rest_day ?? false,
        warmup: d.exercises.filter((e) => e.section === 'warmup').map(mapRow),
        workout: d.exercises.filter((e) => e.section === 'workout').map(mapRow),
        cooldown: d.exercises.filter((e) => e.section === 'cooldown').map(mapRow),
        linkedSessions: d.linked_sessions || [],
      }));
      setDays(loadedDays.length > 0 ? loadedDays : [newDay(1)]);
    } else {
      setProgramName('');
      setProgramOverview('');
      setProgramTags('');
      setTrackTonnage(true);
      setDays([newDay(1)]);
    }
    setActiveDayIdx(0);
    setActiveSection('workout');
    setExSearch('');
    setExCategory('All');
    setExLetter('');
    setExPage(1);
    setError('');
  }, [isOpen, editingProgram]);

  // Exercise search (right panel) — paginated, 25 per page, with fuzzy fallback
  const { data: exData, isLoading: exLoading } = useSmartSearch({
    search: exSearch,
    category: exCategory === 'All' ? undefined : exCategory,
    alphabetLetter: exLetter || undefined,
    page: exPage,
    pageSize: 25,
  });
  const [pickerSource, setPickerSource] = useState<'all' | 'mine'>('all');
  const personalSet = useMemo(() => new Set(personalExerciseIds), [personalExerciseIds]);
  const searchResults = pickerSource === 'mine'
    ? (exData?.exercises ?? []).filter(ex => personalSet.has(ex.id))
    : (exData?.exercises ?? []);
  const totalPages    = exData?.totalPages ?? 1;
  const totalCount    = pickerSource === 'mine' ? searchResults.length : (exData?.total ?? 0);
  const exSuggestions = exData?.suggestions ?? [];

  // Volume for active day
  const volume = useMemo(
    () => (days[activeDayIdx] ? computeVolume(days[activeDayIdx]) : { byRegion: {}, byBodyPart: {} }),
    [days, activeDayIdx]
  );

  // Week groupings (derived — no extra state needed)
  const weeks = useMemo(() => {
    const result: { startIdx: number; weekDays: LocalDay[] }[] = [];
    for (let i = 0; i < days.length; i += DAYS_PER_WEEK) {
      result.push({ startIdx: i, weekDays: days.slice(i, i + DAYS_PER_WEEK) });
    }
    return result;
  }, [days]);

  const lastWeekFull = days.length > 0 && days.length % DAYS_PER_WEEK === 0;

  if (!isOpen) return null;

  // ── Day helpers ──────────────────────────────────────────────────────────

  const addDay = () => {
    const n = days.length + 1;
    setDays((prev) => [...prev, newDay(n)]);
    setActiveDayIdx(days.length); // index of the new day
  };

  const addWeek = () => {
    const remainder = days.length % DAYS_PER_WEEK;
    const padding = remainder === 0 ? 0 : DAYS_PER_WEEK - remainder;
    const newDays: LocalDay[] = [];
    for (let i = 0; i < padding + 1; i++) {
      newDays.push(newDay(days.length + i + 1));
    }
    setDays((prev) => [...prev, ...newDays]);
    setActiveDayIdx(days.length + padding); // jump to first day of new week
  };

  const removeDay = (idx: number) => {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, i) => i !== idx));
    setActiveDayIdx((prev) => Math.max(0, prev > idx ? prev - 1 : Math.min(prev, days.length - 2)));
  };

  const updateDay = (idx: number, field: keyof LocalDay, val: string) =>
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: val } : d)));

  const toggleRestDay = (idx: number) =>
    setDays((prev) => prev.map((d, i) => {
      if (i !== idx) return d;
      const nowRest = !d.isRestDay;
      return {
        ...d,
        isRestDay: nowRest,
        name: nowRest ? 'Rest Day' : (d.name === 'Rest Day' ? `Day ${idx + 1}` : d.name),
      };
    }));

  // ── Exercise helpers ─────────────────────────────────────────────────────

  const addExercise = (ex: { id: string; name: string; categories: string[]; body_parts?: string[] }) => {
    const row = emptyRow(ex);
    setDays((prev) =>
      prev.map((d, i) =>
        i === activeDayIdx ? { ...d, [activeSection]: [...d[activeSection], row] } : d
      )
    );
  };

  const updateRow = (sec: Section, rowTempId: string, updated: LocalExRow) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === activeDayIdx
          ? { ...d, [sec]: d[sec].map((r) => (r.tempId === rowTempId ? updated : r)) }
          : d
      )
    );

  const removeRow = (sec: Section, rowTempId: string) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === activeDayIdx
          ? { ...d, [sec]: d[sec].filter((r) => r.tempId !== rowTempId) }
          : d
      )
    );

  // ── Save ─────────────────────────────────────────────────────────────────

  const parseRest = (s: string): { rest_min: number; rest_sec: number } => {
    if (!s || !s.trim()) return { rest_min: 0, rest_sec: 0 };
    const totalSec = parseInt(s) || 0;
    return { rest_min: Math.floor(totalSec / 60), rest_sec: totalSec % 60 };
  };

  const rowToPayload = (r: LocalExRow, section: Section, oi: number) => ({
    exercise_id: r.exerciseId,
    section,
    order_index: oi,
    sets: r.sets, reps: r.reps,
    ...parseRest(r.rest),
    rir: r.rir, rpe: r.rpe,
    intensity: null, tempo: null, notes: r.notes,
    weight: r.weight,
  });

  const handleSave = async () => {
    if (!programName.trim()) { setError('Program name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const tags = programTags.split(',').map((t) => t.trim()).filter(Boolean);
      let programId: string;

      if (editingProgram) {
        await updateProgram.mutateAsync({ id: editingProgram.id, name: programName.trim(), overview: programOverview, tags, track_tonnage: trackTonnage });
        programId = editingProgram.id;
      } else {
        const created = await createProgram.mutateAsync({ name: programName.trim(), overview: programOverview, tags, track_tonnage: trackTonnage });
        programId = created.id;
      }

      const dayPayloads = days.map((d, i) => ({
        day_number: i + 1,
        name: d.name,
        instructions: d.instructions,
        is_rest_day: d.isRestDay,
        linked_sessions: d.linkedSessions,
        exercises: d.isRestDay ? [] : [
          ...d.warmup.map((r, oi) => rowToPayload(r, 'warmup', oi)),
          ...d.workout.map((r, oi) => rowToPayload(r, 'workout', oi)),
          ...d.cooldown.map((r, oi) => rowToPayload(r, 'cooldown', oi)),
        ],
      }));

      await saveFull.mutateAsync({ programId, days: dayPayloads });
      showToast(editingProgram ? `"${programName}" updated` : `"${programName}" created`, 'success');
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Save as new program (duplicate) — always creates, never updates
  const handleSaveAsNew = async () => {
    if (!programName.trim()) { setError('Program name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const tags = programTags.split(',').map((t) => t.trim()).filter(Boolean);
      const created = await createProgram.mutateAsync({ name: programName.trim(), overview: programOverview, tags, track_tonnage: trackTonnage });

      const dayPayloads = days.map((d, i) => ({
        day_number: i + 1,
        name: d.name,
        instructions: d.instructions,
        is_rest_day: d.isRestDay,
        linked_sessions: d.linkedSessions,
        exercises: d.isRestDay ? [] : [
          ...d.warmup.map((r, oi) => rowToPayload(r, 'warmup', oi)),
          ...d.workout.map((r, oi) => rowToPayload(r, 'workout', oi)),
          ...d.cooldown.map((r, oi) => rowToPayload(r, 'cooldown', oi)),
        ],
      }));

      await saveFull.mutateAsync({ programId: created.id, days: dayPayloads });
      showToast(`"${programName}" saved as new program`, 'success');
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const activeDay = days[activeDayIdx];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[700] flex items-stretch bg-white animate-in fade-in duration-200">

      {/* ── Main Panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-bold">
              <ArrowLeftIcon size={18} /> Back
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <h2 className="text-lg font-semibold text-slate-900 uppercase tracking-tight">
              {editingProgram ? 'Edit Program' : 'Create a Program'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {editingProgram && (
              <button
                onClick={handleSaveAsNew}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              >
                <CopyIcon size={14} />
                Save as New
              </button>
            )}
            <button
              data-tour="program-save-button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wide shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <SaveIcon size={16} />
              {saving ? 'Saving...' : editingProgram ? 'Save Changes' : 'Save & Close'}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">

            {/* Program meta */}
            <div data-tour="program-meta" className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 block">Program Name *</label>
                <input
                  data-tour="program-name-input"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g. Push Pull Legs 2 Rotations"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 block">Tags (comma separated)</label>
                <input
                  value={programTags}
                  onChange={(e) => setProgramTags(e.target.value)}
                  placeholder="e.g. Strength, Hypertrophy, Off-Season"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white"
                />
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Track Tonnage</label>
                <button
                  type="button"
                  onClick={() => setTrackTonnage((v) => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${trackTonnage ? 'bg-indigo-600' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${trackTonnage ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                </button>
                <span className="text-[10px] text-slate-400 font-medium">
                  {trackTonnage ? 'Completed sessions feed the Tracking Hub' : 'Tonnage tracking disabled for this program'}
                </span>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 block">Program Overview</label>
                <textarea
                  value={programOverview}
                  onChange={(e) => setProgramOverview(e.target.value)}
                  placeholder="Brief description of goals, phase, periodization context..."
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* ── Week Blocks ── */}
            {weeks.map(({ startIdx, weekDays }, wi) => {
              const weekNum     = wi + 1;
              const isLastWeek  = wi === weeks.length - 1;
              const isActiveWeek = activeDayIdx >= startIdx && activeDayIdx < startIdx + weekDays.length;

              return (
                <div key={`week-${weekNum}-${startIdx}`} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">

                  {/* Week header */}
                  <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-100/70 border-b border-slate-200">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Week {weekNum}</span>
                    <span className="text-[9px] font-semibold text-slate-400">
                      · {weekDays.length} of {DAYS_PER_WEEK} days
                    </span>
                    {weekDays.length === DAYS_PER_WEEK && (
                      <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        Full
                      </span>
                    )}
                  </div>

                  {/* Day tabs */}
                  <div className="flex items-center gap-1 px-4 pt-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
                    {weekDays.map((d, i) => {
                      const globalIdx = startIdx + i;
                      return (
                        <button
                          key={d.tempId}
                          onClick={() => setActiveDayIdx(globalIdx)}
                          className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 ${
                            activeDayIdx === globalIdx
                              ? d.isRestDay
                                ? 'border-slate-400 text-slate-500 bg-white'
                                : 'border-indigo-600 text-indigo-600 bg-white'
                              : 'border-transparent text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          Day {i + 1}
                          {d.isRestDay && (
                            <span className="w-3.5 h-3.5 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-[7px] font-black shrink-0">R</span>
                          )}
                        </button>
                      );
                    })}
                    {/* + Add Day — only show in last incomplete week */}
                    {isLastWeek && weekDays.length < DAYS_PER_WEEK && (
                      <button
                        onClick={addDay}
                        className="px-3 py-2.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                        title="Add day to this week"
                      >
                        <PlusIcon size={16} />
                      </button>
                    )}
                  </div>

                  {/* Active day content — only rendered for the week that owns it */}
                  {isActiveWeek && activeDay && (
                    <div className="p-6 space-y-6">
                      {/* Day name + rest day toggle + delete */}
                      <div className="flex items-center gap-3">
                        <input
                          value={activeDay.name}
                          onChange={(e) => updateDay(activeDayIdx, 'name', e.target.value)}
                          placeholder="Day Name *"
                          className={`flex-1 border rounded-xl px-4 py-2.5 text-sm font-bold outline-none transition-colors bg-white ${activeDay.isRestDay ? 'border-slate-300 text-slate-500 focus:border-slate-400' : 'border-slate-200 focus:border-indigo-500'}`}
                        />
                        <button
                          type="button"
                          onClick={() => toggleRestDay(activeDayIdx)}
                          title={activeDay.isRestDay ? 'Convert to training day' : 'Mark as rest day'}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                            activeDay.isRestDay
                              ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-700'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                          }`}
                        >
                          <MoonIcon size={13} />
                          {activeDay.isRestDay ? 'Rest Day' : 'Rest Day'}
                        </button>
                        {days.length > 1 && (
                          <button
                            onClick={() => removeDay(activeDayIdx)}
                            className="p-2.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all border border-slate-200"
                            title="Remove this day"
                          >
                            <Trash2Icon size={16} />
                          </button>
                        )}
                      </div>

                      {/* Rest Day block */}
                      {activeDay.isRestDay && (
                        <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center space-y-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                            <MoonIcon size={22} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-600">Rest Day</p>
                            <p className="text-xs text-slate-400 mt-0.5">No exercises scheduled — recovery is part of the plan.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleRestDay(activeDayIdx)}
                            className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition-colors"
                          >
                            Convert to training day
                          </button>
                        </div>
                      )}

                      {/* Volume sets */}
                      {!activeDay.isRestDay && (Object.keys(volume.byBodyPart).length > 0 || Object.keys(volume.byRegion).length > 0) && (
                        <div className="space-y-2">
                          {Object.keys(volume.byBodyPart).length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide mr-1">Body Part Volume</span>
                              {Object.entries(volume.byBodyPart).sort((a, b) => b[1] - a[1]).map(([part, sets]) => {
                                const color = BODY_PART_COLORS[part] ?? 'bg-slate-100 text-slate-600';
                                return (
                                  <span key={part} className={`px-3 py-1 rounded-full text-[10px] font-semibold ${color}`}>
                                    {part} {sets}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {Object.keys(volume.byRegion).length > 0 && (
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide mr-1">Region Volume</span>
                              {Object.entries(volume.byRegion).sort((a, b) => b[1] - a[1]).map(([region, sets]) => {
                                const color = VOLUME_COLORS[region] ?? 'bg-slate-100 text-slate-600';
                                return (
                                  <span key={region} className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase ${color}`}>
                                    {region} {sets}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sections */}
                      {!activeDay.isRestDay && <div data-tour="program-day-sections">
                      {(['warmup', 'workout', 'cooldown'] as Section[]).map((sec) => (
                        <div key={sec} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{SECTION_LABELS[sec]}</h4>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                          {activeDay[sec].map((row, idx) => (
                            <ExRow
                              key={row.tempId}
                              row={row}
                              letter={String(idx + 1)}
                              onChange={(updated) => updateRow(sec, row.tempId, updated)}
                              onRemove={() => removeRow(sec, row.tempId)}
                            />
                          ))}
                          <button
                            onClick={() => setActiveSection(sec)}
                            className={`w-full py-3 rounded-xl text-xs font-semibold uppercase tracking-wide border-2 border-dashed transition-all ${
                              activeSection === sec
                                ? 'border-indigo-400 text-indigo-500 bg-indigo-50'
                                : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                            }`}
                          >
                            <PlusIcon size={12} className="inline mr-1.5" />
                            Add an Exercise{activeSection === sec ? ' (Select from panel →)' : ''}
                          </button>
                        </div>
                      ))}

                      </div>}
                      {/* Day instructions — visible for all day types */}
                      <div>
                        <label className="text-[10px] font-semibold uppercase text-slate-400 mb-1.5 block">Day Instructions</label>
                        <textarea
                          value={activeDay.instructions}
                          onChange={(e) => updateDay(activeDayIdx, 'instructions', e.target.value)}
                          placeholder={activeDay.isRestDay ? "Optional notes, e.g. light walk, mobility work..." : "Coaching notes, warm-up protocol, session intent..."}
                          rows={3}
                          className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-indigo-500 bg-white resize-none"
                        />
                      </div>

                      {/* Linked Sessions — only for training days */}
                      {!activeDay.isRestDay && <LinkedSessionsPicker
                        linked={activeDay.linkedSessions}
                        onChange={(updated) => setDays(prev => prev.map((d, i) => i === activeDayIdx ? { ...d, linkedSessions: updated } : d))}
                        label="Linked Sessions"
                        sources={[
                          {
                            key: 'wattbike',
                            label: 'Wattbike',
                            icon: <ActivityIcon size={12} />,
                            color: 'bg-emerald-100',
                            textColor: 'text-emerald-700',
                            items: (wattbikeSessions || []).map(s => ({ id: s.id, title: s.title || s.name, meta: s.mapType || s.type })),
                          },
                          {
                            key: 'conditioning',
                            label: 'Conditioning',
                            icon: <TimerIcon size={12} />,
                            color: 'bg-orange-100',
                            textColor: 'text-orange-700',
                            items: (conditioningSessions || []).map(s => ({ id: s.id, title: s.title, meta: s.energySystem })),
                          },
                        ]}
                      />}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Week button — always visible */}
            <button
              onClick={addWeek}
              className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-xs font-bold uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <PlusIcon size={14} />
              Add Week {weeks.length + 1}
            </button>

          </div>
        </div>
      </div>

      {/* ── Right Panel: Exercise Chooser ── */}
      <div className={`w-72 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden ${activeDay?.isRestDay ? 'pointer-events-none opacity-40' : ''}`}>

        {/* Header / filters */}
        <div className="px-4 py-4 border-b border-slate-200 space-y-3 shrink-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Choose Exercise</h3>

          {/* All / Mine toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button type="button" onClick={() => setPickerSource('all')} className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all ${pickerSource === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>All</button>
            <button type="button" onClick={() => setPickerSource('mine')} className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all flex items-center justify-center gap-1 ${pickerSource === 'mine' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>
              Mine
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={exSearch}
              onChange={(e) => { setExSearch(e.target.value); setExLetter(''); }}
              placeholder="Search by name..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 bg-slate-50"
            />
          </div>

          {/* Did you mean? */}
          {exSuggestions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              Did you mean:{' '}
              {exSuggestions.map((s, i) => (
                <React.Fragment key={s.name}>
                  {i > 0 && ', '}
                  <button type="button" onClick={() => { setExSearch(s.name); setExPage(1); }} className="font-semibold underline underline-offset-2 hover:text-amber-900">{s.name}</button>
                </React.Fragment>
              ))}?
            </div>
          )}

          {/* Category filter */}
          <div className="relative">
            <select
              value={exCategory}
              onChange={(e) => setExCategory(e.target.value)}
              className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-400 bg-slate-50 pr-7"
            >
              {EXERCISE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDownIcon size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* A–Z letter browser */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Browse A–Z</span>
              {exLetter && (
                <button
                  onClick={() => setExLetter('')}
                  className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wide"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => { setExLetter(''); setExSearch(''); }}
                className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${
                  !exLetter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                }`}
              >
                ✕
              </button>
              {LETTERS.map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    if (exLetter === l) { setExLetter(''); }
                    else { setExLetter(l); setExSearch(''); }
                  }}
                  className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${
                    exLetter === l
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Adding to indicator */}
          <div className="bg-indigo-50 rounded-xl px-3 py-2">
            <span className="text-[9px] font-semibold uppercase text-indigo-400 tracking-wide">Adding to: </span>
            <span className="text-[9px] font-semibold uppercase text-indigo-700 tracking-wide">{SECTION_LABELS[activeSection]}</span>
            <span className="text-[9px] text-indigo-400 ml-1">
              — {activeDay?.name ?? ''}
            </span>
          </div>
        </div>

        {/* Exercise list + pagination */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {exLoading ? (
              <div className="p-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide">Loading...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-6 text-center text-[10px] font-bold text-slate-300 tracking-wide">
                {pickerSource === 'mine' ? <><div className="uppercase">No exercises in your library</div><div className="text-[9px] font-medium normal-case mt-1">Star exercises from the Exercise Library page</div></> : <span className="uppercase">No exercises found</span>}
              </div>
            ) : (
              searchResults.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => addExercise(ex)}
                  className="w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-indigo-50 transition-colors group flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-800 leading-tight truncate">
                      {ex.name}
                    </div>
                    {ex.categories?.[0] && (
                      <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                        {ex.categories[0]}
                      </div>
                    )}
                  </div>
                  <div className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-400 flex items-center justify-center shrink-0 transition-all mt-0.5">
                    <PlusIcon size={12} />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="shrink-0 border-t border-slate-100 px-3 py-2.5 flex items-center justify-between bg-white">
              <button
                onClick={() => setExPage((p) => Math.max(1, p - 1))}
                disabled={exPage === 1 || exLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeftIcon size={11} /> Prev
              </button>
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500">{exPage} / {totalPages}</div>
                <div className="text-[8px] text-slate-300 font-semibold">{totalCount} total</div>
              </div>
              <button
                onClick={() => setExPage((p) => Math.min(totalPages, p + 1))}
                disabled={exPage === totalPages || exLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRightIcon size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
