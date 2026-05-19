// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon, Trash2Icon, ChevronDownIcon, SearchIcon,
  SaveIcon, ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon,
  Activity as ActivityIcon,
  Timer as TimerIcon, CopyIcon, MoonIcon,
  Settings2 as Settings2Icon,
  GripVertical as GripVerticalIcon,
  Pencil as PencilIcon,
  X as XIcon,
  Share2 as Share2Icon,
  CalendarPlus as CalendarPlusIcon,
} from 'lucide-react';
import { useSmartSearch } from '../../hooks/useSmartSearch';

import { useExerciseMap } from '../../hooks/useExerciseMap';
import { useAppState } from '../../context/AppStateContext';
import { CustomSelect } from '../ui/CustomSelect';
import { LinkedSessionsPicker, LinkedSession } from '../conditioning/LinkedSessionsPicker';
import { ShareWorkoutPopover } from './ShareWorkoutPopover';
import { ProgramAssignModal } from './ProgramAssignModal';
import { useCollections } from '../../hooks/useCollections';
import {
  PresetSelect, IntensityPillEditor, DisplayOptionsModal, AddSectionPopover,
  SETS_PRESETS, REPS_PRESETS, REST_PRESETS, TEMPO_PRESETS,
  DEFAULT_DISPLAY_FIELDS, DEFAULT_SECTION_META, DEFAULT_SECTION_ORDER, isDefaultSection,
  type IntensityPill,
} from './exerciseRowShared';
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
  tempo: string;
  notes: string;
  // Legacy fields kept as mirrors for backward-compat with the workout_day_exercises table schema
  rir: string;
  rpe: string;
  weight: string;
  // Canonical going forward — stacked unit-specific intensity pills (kg, lb, %1RM, RPE, RIR, …)
  intensities: IntensityPill[];
  // Per-row override of which row fields render. Undefined = use DEFAULT_DISPLAY_FIELDS.
  displayFields?: string[];
}

interface LocalDay {
  tempId: string;
  name: string;
  instructions: string;
  isRestDay: boolean;
  // 0-indexed week this day belongs to. Lets weeks hold 1-7 days each (no auto-padding).
  weekIdx: number;
  // Dynamic colored sections per day (mirrors Packets). Keyed by sectionId.
  sections: Record<string, LocalExRow[]>;
  sectionMeta: Record<string, { label: string; color: string }>;
  sectionOrder: string[];
  // Tracks which section is "active" for picker-driven exercise insertion
  activeSection: string;
  linkedSessions: LinkedSession[];
}

// section IDs are dynamic strings now — kept as `string` for flexibility
type Section = string;

// ── Constants ──────────────────────────────────────────────────────────────

const DAYS_PER_WEEK = 7;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Training phase — same enum as Packets so the cross-page Phase Distribution metric is consistent
const TRAINING_PHASES = ['Strength', 'Power', 'Hypertrophy', 'Speed', 'Conditioning', 'Recovery', 'Technical', 'GPP'];

const VOLUME_COLORS: Record<string, string> = {
  'Upper Body': 'bg-indigo-100 dark:bg-indigo-600 text-indigo-700',
  'Lower Body': 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700',
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
  'Quadriceps': 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700',
  'Hamstrings': 'bg-lime-100 text-lime-700',
  'Glutes': 'bg-pink-100 text-pink-700',
  'Calves': 'bg-teal-100 text-teal-700',
  'Abdominals': 'bg-orange-100 text-orange-700',
  'Forearms': 'bg-stone-100 text-stone-600',
  'Trapezius': 'bg-indigo-100 dark:bg-indigo-600 text-indigo-700',
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

const newDay = (n: number, weekIdx: number = 0): LocalDay => ({
  tempId: tempId(),
  name: `Day ${n}`,
  instructions: '',
  isRestDay: false,
  weekIdx,
  sections: { warmup: [], workout: [], cooldown: [] },
  sectionMeta: { ...DEFAULT_SECTION_META },
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  activeSection: 'workout',
  linkedSessions: [],
});

const emptyRow = (ex: { id: string; name: string; categories: string[]; body_parts?: string[] }): LocalExRow => ({
  tempId: tempId(),
  exerciseId: ex.id,
  exerciseName: ex.name,
  exerciseCategories: ex.categories ?? [],
  exerciseBodyParts: ex.body_parts ?? [],
  sets: '3',
  reps: '10',
  rest: '60s',
  tempo: '',
  rir: '',
  rpe: '',
  notes: '',
  weight: '',
  intensities: [{ unit: 'kg', value: '' }, { unit: 'RPE', value: '' }],
});

// ── Volume calculator ──────────────────────────────────────────────────────

function computeVolume(day: LocalDay): { byRegion: Record<string, number>; byBodyPart: Record<string, number> } {
  const byRegion: Record<string, number> = {};
  const byBodyPart: Record<string, number> = {};
  const allRows = day.sectionOrder.flatMap(sec => day.sections[sec] || []);
  for (const row of allRows) {
    const sets = parseInt(row.sets) || 0;
    if (sets <= 0) continue;
    const region = row.exerciseCategories?.[0];
    if (region) byRegion[region] = (byRegion[region] ?? 0) + sets;
    const part = row.exerciseBodyParts?.[0];
    if (part) byBodyPart[part] = (byBodyPart[part] ?? 0) + sets;
  }
  return { byRegion, byBodyPart };
}

// ── Exercise Row — Packets-style (Sets/Reps/Rest/Tempo dropdowns + intensity pills + display options) ──

const ExRow = ({
  row, letter, onChange, onRemove, onOpenDisplayOptions, dayIdx, sec,
}: {
  row: LocalExRow;
  letter: string;
  onChange: (updated: LocalExRow) => void;
  onRemove: () => void;
  onOpenDisplayOptions: () => void;
  // Source coordinates so the row can be dragged to another section/day
  dayIdx: number;
  sec: string;
}) => {
  const visible = row.displayFields || DEFAULT_DISPLAY_FIELDS;
  const showSets    = visible.includes('sets');
  const showReps    = visible.includes('reps');
  const showRest    = visible.includes('rest');
  const showTempo   = visible.includes('tempo');
  const showInt1    = visible.includes('intensity1');
  const showInt2    = visible.includes('intensity2');
  const showInt3    = visible.includes('intensity3');
  const showNotes   = visible.includes('notes');
  const intensities = row.intensities || [];
  const visibleIntensityCount = [showInt1, showInt2, showInt3].filter(Boolean).length;

  const upd = (patch: Partial<LocalExRow>) => onChange({ ...row, ...patch });

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', `row:${dayIdx}:${sec}:${row.tempId}`);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="bg-slate-50/50 dark:bg-[#1A2D48]/60 border border-slate-100 dark:border-[#243A58] rounded-xl p-3 hover:border-slate-200 dark:hover:border-[#364E6E] transition-all"
    >
      {/* Header — drag handle + number + name + display options + delete */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripVerticalIcon size={12} className="text-slate-300 dark:text-[#475569] cursor-grab shrink-0" />
          <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{letter}</span>
          <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{row.exerciseName}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onOpenDisplayOptions}
            className="p-1.5 text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg transition-all"
            title="Display options">
            <Settings2Icon size={12} />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 text-slate-400 dark:text-[#CBD5E1] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-lg transition-all"
            title="Remove exercise">
            <Trash2Icon size={12} />
          </button>
        </div>
      </div>

      {/* Sets / Reps / Rest / Tempo — 4-col dropdowns */}
      {(showSets || showReps || showRest || showTempo) && (
        <div className="grid grid-cols-4 gap-2 mb-2">
          {showSets && (
            <div>
              <label className="text-[8px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Sets</label>
              <PresetSelect value={row.sets} onChange={v => upd({ sets: v })} presets={SETS_PRESETS} placeholder="—" />
            </div>
          )}
          {showReps && (
            <div>
              <label className="text-[8px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Reps</label>
              <PresetSelect value={row.reps} onChange={v => upd({ reps: v })} presets={REPS_PRESETS} placeholder="—" />
            </div>
          )}
          {showRest && (
            <div>
              <label className="text-[8px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Rest</label>
              <PresetSelect value={row.rest} onChange={v => upd({ rest: v })} presets={REST_PRESETS} placeholder="—" />
            </div>
          )}
          {showTempo && (
            <div>
              <label className="text-[8px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Tempo</label>
              <PresetSelect value={row.tempo} onChange={v => upd({ tempo: v })} presets={TEMPO_PRESETS} placeholder="—" />
            </div>
          )}
        </div>
      )}

      {/* Intensity pills — up to 3 stacked */}
      {visibleIntensityCount > 0 && (
        <div className="flex items-center gap-2 mb-2">
          {[0, 1, 2].map(i => {
            const allowed = (i === 0 && showInt1) || (i === 1 && showInt2) || (i === 2 && showInt3);
            if (!allowed) return null;
            const pill = intensities[i];
            if (!pill) {
              return (
                <button
                  key={`add-${i}`}
                  onClick={() => {
                    const next = [...intensities];
                    while (next.length < i) next.push({ unit: 'kg', value: '' });
                    next.push({ unit: i === 0 ? 'kg' : i === 1 ? 'RPE' : '%1RM', value: '' });
                    upd({ intensities: next });
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 transition-colors text-[10px] font-semibold">
                  <PlusIcon size={10} /> Intensity {i + 1}
                </button>
              );
            }
            return (
              <div key={i} className="flex-1 min-w-0">
                <label className="text-[8px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Intensity {i + 1}</label>
                <IntensityPillEditor
                  pill={pill}
                  onChange={next => {
                    const arr = [...intensities];
                    arr[i] = next;
                    upd({ intensities: arr });
                  }}
                  onRemove={() => {
                    const arr = intensities.filter((_, x) => x !== i);
                    upd({ intensities: arr });
                  }}
                  canRemove={intensities.length > 1}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      {showNotes && (
        <div>
          <label className="text-[8px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Notes</label>
          <input
            type="text"
            value={row.notes}
            onChange={e => upd({ notes: e.target.value })}
            placeholder="Coaching notes, scaling, partner pairing..."
            className="w-full bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-2 text-xs font-medium text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400 placeholder:text-slate-300 dark:placeholder:text-[#475569]"
          />
        </div>
      )}
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
  // Program start date — used to render real dates on Week/Day tabs (yyyy-mm-dd)
  const [startDate, setStartDate]             = useState<string>(() => new Date().toISOString().split('T')[0]);
  // Phase enum — drives the Phase Distribution panel on the Programs list page
  const [trainingPhase, setTrainingPhase]     = useState<string>('Strength');

  // Days (flat array — grouped visually into weeks of 7)
  const [days, setDays]               = useState<LocalDay[]>(() => Array.from({ length: DAYS_PER_WEEK }, (_, i) => newDay(i + 1, 0)));
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  // Active week tab (0-indexed). Replaces the stacked-weeks layout — only the active week renders.
  const [activeWeekIdx, setActiveWeekIdx] = useState(0);
  // Drag-over hint for the Rest tile drop target
  const [restDragTarget, setRestDragTarget] = useState<number | null>(null);
  // Accordion — Set of day tempIds that are currently expanded. Default collapsed for week-overview at a glance.
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  // Per-row Display Options modal — null when closed
  const [displayOptionsRow, setDisplayOptionsRow] = useState<{ dayIdx: number; sec: Section; tempId: string } | null>(null);
  // Section inline-rename state (per-day, per-section)
  const [renamingSection, setRenamingSection] = useState<{ dayIdx: number; sec: string } | null>(null);
  // Open AddSectionPopover for a specific day (null = closed)
  const [addSectionOpenFor, setAddSectionOpenFor] = useState<number | null>(null);
  // Setup card collapse state — matches the Packets builder Details pattern
  const [setupExpanded, setSetupExpanded] = useState(true);
  // Share popover for the top-bar Share button
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);
  // Assign modal — opens the standard ProgramAssignModal from the builder top bar
  const [assignTarget, setAssignTarget] = useState<{ id: string; name: string; training_phase?: string | null } | null>(null);
  // Exercise drag-and-drop hint state — { dayIdx, sec } that's currently hovered as a drop target
  const [exerciseDropTarget, setExerciseDropTarget] = useState<{ dayIdx: number; sec: string } | null>(null);
  // Picker drag-in-progress hint (matches Packets behavior)
  const [draggedExId, setDraggedExId] = useState<string | null>(null);
  // Tracks whether the current drag came from the Rest tile (so day-card amber ring only fires for rest drags, not picker/row)
  const [isDraggingRest, setIsDraggingRest] = useState(false);
  const toggleDayExpanded = (tempId: string) => setExpandedDays(prev => {
    const next = new Set(prev);
    if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
    return next;
  });
  const collapseAllDays = () => setExpandedDays(new Set());
  const expandAllInActiveWeek = () => {
    const ids = new Set<string>();
    const week = weeks[Math.min(activeWeekIdx, Math.max(0, weeks.length - 1))];
    if (week) for (const d of week.weekDays) ids.add(d.tempId);
    setExpandedDays(prev => new Set([...prev, ...ids]));
  };

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
      setStartDate(editingProgram.start_date || new Date().toISOString().split('T')[0]);
      setTrainingPhase(editingProgram.training_phase || 'Strength');

      const mapRow = (e: any): LocalExRow => {
        const exInfo = exerciseFullMap[e.exercise_id];
        const restSec = (e.rest_min ?? 0) * 60 + (e.rest_sec ?? 0);
        const weight = String(e.weight ?? '');
        const rpe = String(e.rpe ?? '');
        // Restore intensities array if persisted; else migrate from legacy weight/rpe fields
        const persistedIntensities: any = (e as any).intensities;
        let intensities: IntensityPill[] = Array.isArray(persistedIntensities) && persistedIntensities.length > 0
          ? persistedIntensities.map((p: any) => ({ unit: String(p.unit || 'kg'), value: String(p.value || '') }))
          : [
              { unit: 'kg', value: weight },
              { unit: 'RPE', value: rpe },
            ];
        // Trim trailing empty pills (keep at least one) so the row doesn't look cluttered
        while (intensities.length > 1 && !intensities[intensities.length - 1].value) intensities.pop();
        return {
          tempId: e.id, exerciseId: e.exercise_id,
          exerciseName: e.exercise_name || exInfo?.name || e.exercise_id,
          exerciseCategories: exInfo?.categories || e.categories || [],
          exerciseBodyParts: exInfo?.body_parts || e.body_parts || [],
          sets: String(e.sets ?? ''),
          reps: String(e.reps ?? ''),
          rest: restSec > 0 ? `${restSec}s` : '',
          tempo: String(e.tempo ?? ''),
          rir: String(e.rir ?? ''),
          rpe,
          notes: String(e.notes ?? ''),
          weight,
          intensities,
          displayFields: Array.isArray((e as any).display_fields) ? (e as any).display_fields : undefined,
        };
      };
      // Pad to full weeks of 7 days so the accordion always shows 7 slots per week,
      // even when editing a legacy program saved before the 7-days-per-week model.
      const loadedDays: LocalDay[] = (editingProgram.days ?? []).map((d: any) => {
        // Restore per-day section meta + order if persisted; else default to warmup/workout/cooldown
        const persistedMeta = (d.section_meta && typeof d.section_meta === 'object') ? d.section_meta : null;
        const persistedOrder = Array.isArray(d.section_order) && d.section_order.length > 0 ? d.section_order : null;
        const sectionMeta = persistedMeta || { ...DEFAULT_SECTION_META };
        const sectionOrder = persistedOrder || [...DEFAULT_SECTION_ORDER];
        // Group exercises by their `section` column (which now allows any string)
        const sections: Record<string, LocalExRow[]> = {};
        for (const sec of sectionOrder) sections[sec] = [];
        for (const e of d.exercises || []) {
          const sec = (e as any).section || 'workout';
          if (!sections[sec]) sections[sec] = []; // catch any stray section IDs not in order
          sections[sec].push(mapRow(e));
        }
        // weekIdx defaults to (week_number - 1) when present, else legacy floor((day_number - 1) / 7)
        const weekNum = typeof d.week_number === 'number' && d.week_number > 0
          ? d.week_number
          : Math.max(1, Math.ceil((d.day_number || 1) / 7));
        return {
          tempId: d.id,
          name: d.name ?? `Day ${d.day_number}`,
          instructions: d.instructions ?? '',
          isRestDay: d.is_rest_day ?? false,
          weekIdx: weekNum - 1,
          sections,
          sectionMeta,
          sectionOrder,
          activeSection: sectionOrder.includes('workout') ? 'workout' : sectionOrder[0],
          linkedSessions: Array.isArray(d.linked_sessions) ? d.linked_sessions : [],
        };
      });
      // No more pad-to-7 — load whatever was saved. New programs default to a 7-day week below; users can add/remove days freely.
      setDays(loadedDays.length > 0 ? loadedDays : Array.from({ length: DAYS_PER_WEEK }, (_, i) => newDay(i + 1, 0)));
    } else {
      setProgramName('');
      setProgramOverview('');
      setProgramTags('');
      setTrackTonnage(true);
      setStartDate(new Date().toISOString().split('T')[0]);
      setTrainingPhase('Strength');
      setDays(Array.from({ length: DAYS_PER_WEEK }, (_, i) => newDay(i + 1, 0)));
    }
    setActiveDayIdx(0);
    setActiveWeekIdx(0);
    setExpandedDays(new Set());
    // Setup card defaults: expanded for new programs (user needs to fill it in), collapsed for editing existing ones.
    setSetupExpanded(!editingProgram);
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
  // Sub-filter inside the Mine tab: narrow the picker to a saved collection
  const [pickerCollectionId, setPickerCollectionId] = useState<string | null>(null);
  const { collections } = useCollections();
  const personalSet = useMemo(() => new Set(personalExerciseIds), [personalExerciseIds]);
  const collectionSet = useMemo(() => {
    if (!pickerCollectionId) return null;
    const col = collections.find(c => c.id === pickerCollectionId);
    return col ? new Set(col.exercise_ids) : null;
  }, [pickerCollectionId, collections]);
  const searchResults = useMemo(() => {
    let list = exData?.exercises ?? [];
    if (pickerSource === 'mine') list = list.filter(ex => personalSet.has(ex.id));
    if (collectionSet) list = list.filter(ex => collectionSet.has(ex.id));
    return [...list].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
  }, [exData?.exercises, pickerSource, personalSet, collectionSet]);
  const totalPages    = exData?.totalPages ?? 1;
  const totalCount    = pickerSource === 'mine' ? searchResults.length : (exData?.total ?? 0);
  const exSuggestions = exData?.suggestions ?? [];

  // Weeks are derived by grouping `days` on `weekIdx`. This lets weeks have 1-7 days
  // each (no more auto-padding). `startIdx` is the position of the week's first day in
  // the flat `days` array — used so the existing day-tab handlers (which take a global
  // dayIdx) keep working unchanged.
  const weeks = useMemo(() => {
    if (days.length === 0) return [];
    const groups: Map<number, { startIdx: number; weekDays: LocalDay[] }> = new Map();
    days.forEach((d, i) => {
      const wi = d.weekIdx ?? 0;
      if (!groups.has(wi)) groups.set(wi, { startIdx: i, weekDays: [] });
      groups.get(wi)!.weekDays.push(d);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([, v]) => v);
  }, [days]);

  // ── Date helper: returns yyyy-mm-dd for the dayIdx-th day from startDate ──
  const dateForDay = (dayIdx: number): string => {
    if (!startDate) return '';
    const base = new Date(startDate);
    base.setDate(base.getDate() + dayIdx);
    return base.toISOString().split('T')[0];
  };
  const formatShortDate = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  // Keep active week + day in sync — clamp on changes
  const safeActiveWeekIdx = Math.min(activeWeekIdx, Math.max(0, weeks.length - 1));
  const activeWeek = weeks[safeActiveWeekIdx];
  const activeWeekStartIdx = activeWeek?.startIdx ?? 0;
  const activeWeekDays = activeWeek?.weekDays ?? [];
  // If activeDayIdx fell outside the active week (e.g. after week tab change), snap to first day of week
  const clampedActiveDayIdx = (activeDayIdx >= activeWeekStartIdx && activeDayIdx < activeWeekStartIdx + activeWeekDays.length)
    ? activeDayIdx
    : activeWeekStartIdx;

  if (!isOpen) return null;

  // ── Day helpers ──────────────────────────────────────────────────────────
  // Days array stays grouped by weekIdx — we insert/remove at the right position
  // so the `weeks` derivation can rely on contiguous slices.

  // Add a day to the currently-active week, immediately after that week's last day.
  // Disabled at 7 days (one full week).
  const addDayToActiveWeek = () => {
    if (activeWeekDays.length >= DAYS_PER_WEEK) return;
    const insertAt = activeWeekStartIdx + activeWeekDays.length;
    const newDayName = activeWeekDays.length + 1;
    const created = newDay(newDayName, safeActiveWeekIdx);
    setDays((prev) => [...prev.slice(0, insertAt), created, ...prev.slice(insertAt)]);
    setActiveDayIdx(insertAt);
  };

  const addWeek = () => {
    // The new week gets the next weekIdx after the current max.
    const nextWeekIdx = Math.max(-1, ...days.map(d => d.weekIdx ?? 0)) + 1;
    const newDays: LocalDay[] = [];
    for (let i = 0; i < DAYS_PER_WEEK; i++) newDays.push(newDay(i + 1, nextWeekIdx));
    const insertAt = days.length; // weeks are sorted; new week always goes at the end
    setDays((prev) => [...prev, ...newDays]);
    setActiveWeekIdx(nextWeekIdx);
    setActiveDayIdx(insertAt);
  };

  const removeWeek = (targetWeekIdx: number) => {
    if (weeks.length <= 1) return; // keep at least one week
    setDays((prev) => prev
      .filter(d => (d.weekIdx ?? 0) !== targetWeekIdx)
      // After removal, shift any higher weekIdx down by 1 so the sequence stays contiguous (0..N-1)
      .map(d => (d.weekIdx ?? 0) > targetWeekIdx ? { ...d, weekIdx: (d.weekIdx ?? 0) - 1 } : d)
    );
    const newActiveWeek = Math.max(0, Math.min(activeWeekIdx, weeks.length - 2));
    setActiveWeekIdx(newActiveWeek);
    setActiveDayIdx(0); // safe default — clampedActiveDayIdx will snap to the right position next render
  };

  // Mark a day as rest (called from the picker's Rest tile, or its drag-drop).
  // Clears every section's exercises and linked sessions on enable.
  const applyRestDay = (dayIdx: number) => {
    setDays((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      const wasRest = d.isRestDay;
      const dayNum = i + 1;
      if (wasRest) {
        // Convert back to a training day — keep section layout, sections were already empty
        return { ...d, isRestDay: false, name: d.name === 'Rest Day' ? `Day ${dayNum}` : d.name };
      }
      // Becoming a rest day — wipe all sections + linked sessions but keep the section layout
      const wipedSections: Record<string, LocalExRow[]> = {};
      for (const sec of d.sectionOrder) wipedSections[sec] = [];
      return {
        ...d,
        isRestDay: true,
        name: 'Rest Day',
        sections: wipedSections,
        linkedSessions: [],
      };
    }));
  };

  const removeDay = (idx: number) => {
    if (days.length <= 1) return;
    setDays((prev) => prev.filter((_, i) => i !== idx));
    setActiveDayIdx((prev) => Math.max(0, prev > idx ? prev - 1 : Math.min(prev, days.length - 2)));
  };

  const updateDay = (idx: number, field: keyof LocalDay, val: string) =>
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: val } : d)));

  // ── Exercise + Section helpers ────────────────────────────────────────────

  // Adds an exercise to the active day's currently-active section.
  const addExercise = (ex: { id: string; name: string; categories: string[]; body_parts?: string[] }) => {
    const row = emptyRow(ex);
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        const sec = d.activeSection || d.sectionOrder[0];
        return { ...d, sections: { ...d.sections, [sec]: [...(d.sections[sec] || []), row] } };
      })
    );
  };

  // Switch the active section for a specific day (used by section tabs).
  const setDayActiveSection = (dayIdx: number, sectionId: string) => {
    setDays((prev) => prev.map((d, i) => i === dayIdx ? { ...d, activeSection: sectionId } : d));
  };

  // Add a new section to a specific day's layout. ID is generated; label/color come from the popover.
  const addSectionToDay = (dayIdx: number, name: string, color: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setDays((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      return {
        ...d,
        sectionMeta: { ...d.sectionMeta, [id]: { label: trimmed, color: color || '#6366f1' } },
        sectionOrder: [...d.sectionOrder, id],
        sections: { ...d.sections, [id]: [] },
        activeSection: id,
      };
    }));
  };

  const updateDaySectionMeta = (dayIdx: number, sectionId: string, patch: Partial<{ label: string; color: string }>) => {
    setDays((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      return { ...d, sectionMeta: { ...d.sectionMeta, [sectionId]: { ...d.sectionMeta[sectionId], ...patch } } };
    }));
  };

  const removeSectionFromDay = (dayIdx: number, sectionId: string) => {
    if (isDefaultSection(sectionId)) return; // built-ins are protected
    setDays((prev) => prev.map((d, i) => {
      if (i !== dayIdx) return d;
      const { [sectionId]: _removed, ...restMeta } = d.sectionMeta;
      const { [sectionId]: _removedRows, ...restSections } = d.sections;
      const newOrder = d.sectionOrder.filter(s => s !== sectionId);
      return {
        ...d,
        sectionMeta: restMeta,
        sections: restSections,
        sectionOrder: newOrder,
        activeSection: d.activeSection === sectionId ? (newOrder.includes('workout') ? 'workout' : newOrder[0]) : d.activeSection,
      };
    }));
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  // Parse rest strings like "60s", "90s", "2min", "2.5min", or a bare number (seconds)
  const parseRest = (s: string): { rest_min: number; rest_sec: number } => {
    if (!s || !s.trim()) return { rest_min: 0, rest_sec: 0 };
    const v = s.trim().toLowerCase();
    const minMatch = v.match(/^([\d.]+)\s*min$/);
    if (minMatch) {
      const totalSec = Math.round(parseFloat(minMatch[1]) * 60);
      return { rest_min: Math.floor(totalSec / 60), rest_sec: totalSec % 60 };
    }
    const secMatch = v.match(/^([\d.]+)\s*s?$/);
    if (secMatch) {
      const totalSec = Math.round(parseFloat(secMatch[1]));
      return { rest_min: Math.floor(totalSec / 60), rest_sec: totalSec % 60 };
    }
    return { rest_min: 0, rest_sec: 0 };
  };

  // Serialize a row for save. The intensities[] array is canonical; mirror the
  // first kg pill into legacy `weight` and first RPE pill into legacy `rpe` for
  // backward-compat with any code still reading those columns.
  const rowToPayload = (r: LocalExRow, section: Section, oi: number) => {
    const kgPill = r.intensities?.find(p => p.unit === 'kg');
    const rpePill = r.intensities?.find(p => p.unit === 'RPE');
    return {
      exercise_id: r.exerciseId,
      section,
      order_index: oi,
      sets: r.sets, reps: r.reps,
      ...parseRest(r.rest),
      rir: r.rir,
      rpe: rpePill?.value ?? '',
      intensity: null,
      tempo: r.tempo ?? '',
      notes: r.notes,
      weight: kgPill?.value ?? '',
      // Persist canonical pills + display overrides via the JSON-bag fields on
      // workout_day_exercises (added previously). If those columns don't exist,
      // Supabase will ignore the extra keys silently.
      intensities: r.intensities,
      display_fields: r.displayFields,
    };
  };

  const handleSave = async () => {
    if (!programName.trim()) { setError('Program name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const tags = programTags.split(',').map((t) => t.trim()).filter(Boolean);
      let programId: string;

      if (editingProgram) {
        await updateProgram.mutateAsync({ id: editingProgram.id, name: programName.trim(), overview: programOverview, tags, track_tonnage: trackTonnage, start_date: startDate || null, training_phase: trainingPhase || null });
        programId = editingProgram.id;
      } else {
        const created = await createProgram.mutateAsync({ name: programName.trim(), overview: programOverview, tags, track_tonnage: trackTonnage, start_date: startDate || null, training_phase: trainingPhase || null });
        programId = created.id;
      }

      const dayPayloads = days.map((d, i) => ({
        day_number: i + 1,
        week_number: (d.weekIdx ?? 0) + 1,
        name: d.name,
        instructions: d.instructions,
        is_rest_day: d.isRestDay,
        section_meta: d.sectionMeta,
        section_order: d.sectionOrder,
        linked_sessions: d.linkedSessions,
        // Flatten exercises across every section in sectionOrder, preserving order
        exercises: d.isRestDay ? [] : d.sectionOrder.flatMap(sec =>
          (d.sections[sec] || []).map((r, oi) => rowToPayload(r, sec, oi))
        ),
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
      const created = await createProgram.mutateAsync({ name: programName.trim(), overview: programOverview, tags, track_tonnage: trackTonnage, start_date: startDate || null, training_phase: trainingPhase || null });

      const dayPayloads = days.map((d, i) => ({
        day_number: i + 1,
        week_number: (d.weekIdx ?? 0) + 1,
        name: d.name,
        instructions: d.instructions,
        is_rest_day: d.isRestDay,
        section_meta: d.sectionMeta,
        section_order: d.sectionOrder,
        linked_sessions: d.linkedSessions,
        exercises: d.isRestDay ? [] : d.sectionOrder.flatMap(sec =>
          (d.sections[sec] || []).map((r, oi) => rowToPayload(r, sec, oi))
        ),
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
    // Renders inside the main app layout (NOT a full-screen overlay) so the
    // sidebar nav stays visible for consistency with every other workflow page.
    <div className="flex items-stretch bg-white dark:bg-[#0A1628] animate-in fade-in duration-200 rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden h-[calc(100vh-7rem)]">

      {/* ── Main Panel ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="flex items-center gap-2 text-slate-600 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-colors text-sm font-bold">
              <ArrowLeftIcon size={18} /> Back
            </button>
            <div className="h-5 w-px bg-slate-200 dark:bg-[#243A58]" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-tight">
              {editingProgram ? 'Edit Program' : 'Create a Program'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Save Template — saves the program as a template without assigning. Visible whether creating or editing. */}
            <button
              onClick={handleSaveAsNew}
              disabled={saving || !programName.trim()}
              title={editingProgram ? 'Save a copy of this program as a new template' : 'Save as a new template without assigning'}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
            >
              <CopyIcon size={13} /> Save Template
            </button>
            {/* Share — opens the standard Share popover (same as list-page share). Requires saved program ID. */}
            <button
              onClick={() => editingProgram?.id ? setShareTarget({ id: editingProgram.id, name: programName || 'Program' }) : showToast('Save the template first to share', 'info')}
              disabled={!editingProgram?.id && !programName.trim()}
              title={editingProgram?.id ? 'Share this program' : 'Save the template first to enable sharing'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border ${editingProgram?.id ? 'bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-700 dark:text-[#E2E8F0] border-slate-200 dark:border-[#243A58]' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border-slate-200 dark:border-[#243A58] cursor-not-allowed opacity-60'}`}
            >
              <Share2Icon size={13} /> Share
            </button>
            {/* Assign — Team/Individual + Start Date picker that creates a single calendar entry for the program */}
            <button
              onClick={() => editingProgram?.id ? setAssignTarget({ id: editingProgram.id, name: programName || 'Program', training_phase: trainingPhase }) : showToast('Save the template first to assign', 'info')}
              disabled={!editingProgram?.id && !programName.trim()}
              title={editingProgram?.id ? 'Assign this program to an athlete or team' : 'Save the template first to enable assigning'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${editingProgram?.id ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed opacity-60'}`}
            >
              <CalendarPlusIcon size={13} /> Assign
            </button>
            <button
              data-tour="program-save-button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wide shadow-sm hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-50"
            >
              <SaveIcon size={14} />
              {saving ? 'Saving...' : editingProgram ? 'Save Changes' : 'Save & Close'}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">

            {/* Setup card — collapsible (matches Packets `Details` UX). Slim summary always visible, full form on expand. */}
            <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl">
              {/* Whole bar toggles collapse — there's no input here, so no stopPropagation needed */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSetupExpanded(v => !v)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSetupExpanded(v => !v); } }}
                className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-[#1A2D48]/50 rounded-xl transition-colors"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-[#E2E8F0]">Program Setup</span>
                {!setupExpanded && (
                  <div className="hidden md:flex items-center gap-1.5 ml-2 min-w-0">
                    <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{programName || 'Untitled'}</span>
                    {startDate && <span className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">· {startDate}</span>}
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">{trainingPhase}</span>
                    <span className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">· {weeks.length} week{weeks.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSetupExpanded(v => !v)}
                  className="ml-auto shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors">
                  {setupExpanded ? 'Collapse' : 'Details'}
                  <ChevronDownIcon size={10} className={`transition-transform ${setupExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {setupExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-[#243A58]">
            {/* Program meta — Setup card */}
            <div data-tour="program-meta" className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] mb-1 block">Program Name *</label>
                <input
                  data-tour="program-name-input"
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g. Push Pull Legs 2 Rotations"
                  className="w-full border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white dark:bg-[#0F1C30] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-slate-200 dark:border-[#243A58] rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white dark:bg-[#0F1C30] text-slate-900 dark:text-[#E2E8F0]"
                />
              </div>
              <div className="col-span-6 md:col-span-3">
                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] mb-1 block">Phase</label>
                <CustomSelect
                  value={trainingPhase}
                  onChange={(e: any) => setTrainingPhase(e.target.value)}
                  variant="form"
                  size="md"
                  className="h-[46px]"
                >
                  {TRAINING_PHASES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </CustomSelect>
              </div>
              <div className="col-span-12 md:col-span-9">
                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] mb-1 block">Tags (comma separated)</label>
                <input
                  value={programTags}
                  onChange={(e) => setProgramTags(e.target.value)}
                  placeholder="e.g. Strength, Hypertrophy, Off-Season"
                  className="w-full border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white dark:bg-[#0F1C30] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                />
              </div>
              <div className="col-span-12 md:col-span-3 flex items-end">
                <div className="w-full border border-slate-200 dark:border-[#243A58] rounded-xl bg-white dark:bg-[#0F1C30] px-3 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] truncate">Track Tonnage</span>
                  <button
                    type="button"
                    onClick={() => setTrackTonnage((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${trackTonnage ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-[#243A58]'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${trackTonnage ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              </div>
              <div className="col-span-12">
                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] mb-1 block">Program Overview</label>
                <textarea
                  value={programOverview}
                  onChange={(e) => setProgramOverview(e.target.value)}
                  placeholder="Brief description of goals, phase, periodization context..."
                  rows={2}
                  className="w-full border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 bg-white dark:bg-[#0F1C30] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] resize-none"
                />
              </div>
            </div>
              </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-bold px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* ── Week Tabs — only one week visible at a time ── */}
            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden">

              {/* Week tab strip */}
              <div className="flex items-center gap-0.5 px-2 pt-2 bg-slate-100/70 dark:bg-[#132338] border-b border-slate-200 dark:border-[#243A58] overflow-x-auto no-scrollbar">
                {weeks.map(({ startIdx }, wi) => {
                  const weekNum = wi + 1;
                  const isActive = safeActiveWeekIdx === wi;
                  const weekStart = formatShortDate(dateForDay(startIdx));
                  return (
                    <button
                      key={`weektab-${wi}`}
                      onClick={() => {
                        setActiveWeekIdx(wi);
                        setActiveDayIdx(startIdx);
                      }}
                      className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap rounded-t-lg transition-all border-b-2 flex flex-col items-start ${
                        isActive
                          ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-[#0F1C30]'
                          : 'border-transparent text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                      }`}
                      title={`Week ${weekNum}`}
                    >
                      <span>Wk {weekNum}</span>
                      {weekStart && <span className="text-[8px] font-medium text-slate-500 dark:text-[#CBD5E1] normal-case">{weekStart}</span>}
                    </button>
                  );
                })}
                <button
                  onClick={addWeek}
                  className="px-3 py-2 text-slate-400 hover:text-indigo-600 dark:text-indigo-300 transition-colors shrink-0 flex items-center gap-1"
                  title="Add another week"
                >
                  <PlusIcon size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Week</span>
                </button>
                {weeks.length > 1 && (
                  <button
                    onClick={() => removeWeek(safeActiveWeekIdx)}
                    className="ml-auto px-3 py-2 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors shrink-0"
                    title="Remove this week"
                  >
                    <Trash2Icon size={13} />
                  </button>
                )}
              </div>

              {/* Active week label + Collapse-all controls */}
              <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-100/40 dark:bg-[#132338]/40 border-b border-slate-200 dark:border-[#243A58]">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Week {safeActiveWeekIdx + 1}</span>
                {dateForDay(activeWeekStartIdx) && (
                  <span className="text-[9px] font-semibold text-slate-400">
                    · {formatShortDate(dateForDay(activeWeekStartIdx))} — {formatShortDate(dateForDay(activeWeekStartIdx + activeWeekDays.length - 1))}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={expandAllInActiveWeek}
                    className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                    title="Expand all days in this week">
                    Expand all
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={collapseAllDays}
                    className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                    title="Collapse every day">
                    Collapse all
                  </button>
                </div>
              </div>

              {/* Day accordion — each day is its own collapsible card */}
              <div className="p-3 space-y-2">
                {activeWeekDays.map((day, i) => {
                  const globalIdx = activeWeekStartIdx + i;
                  const dDate = formatShortDate(dateForDay(globalIdx));
                  const isExpanded = expandedDays.has(day.tempId);
                  const dayVolume = computeVolume(day);
                  // Per-section counts for the collapsed summary
                  const sectionCountsList = day.sectionOrder.map(sec => ({
                    id: sec,
                    label: day.sectionMeta[sec]?.label || sec,
                    color: day.sectionMeta[sec]?.color || '#6366f1',
                    count: (day.sections[sec] || []).length,
                  })).filter(s => s.count > 0);
                  const totalEx = sectionCountsList.reduce((sum, s) => sum + s.count, 0);
                  const isDropTarget = restDragTarget === globalIdx;
                  return (
                    <div
                      key={day.tempId}
                      className={`bg-white dark:bg-[#132338] border rounded-xl transition-all ${isDropTarget && isDraggingRest ? 'border-amber-400 ring-2 ring-amber-200 dark:ring-amber-500/30' : day.isRestDay ? 'border-slate-300 dark:border-[#243A58] bg-slate-50/60 dark:bg-[#0F1C30]/40' : 'border-slate-200 dark:border-[#243A58]'}`}
                      onDragOver={(e) => {
                        // Only show the amber rest-drop ring when the Rest tile is being dragged
                        if (!isDraggingRest) return;
                        if (e.dataTransfer.types.includes('text/plain')) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                          if (restDragTarget !== globalIdx) setRestDragTarget(globalIdx);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setRestDragTarget(null);
                      }}
                      onDrop={(e) => {
                        // Inner section drop zones handle picker/row drops; only respond here for rest tile
                        if (!isDraggingRest) return;
                        e.preventDefault();
                        const data = e.dataTransfer.getData('text/plain') || '';
                        if (data === 'rest' && !days[globalIdx].isRestDay) {
                          applyRestDay(globalIdx);
                        }
                        setRestDragTarget(null);
                        setIsDraggingRest(false);
                      }}
                    >
                      {/* Day header — always visible */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleDayExpanded(day.tempId);
                          setActiveDayIdx(globalIdx);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors rounded-xl"
                      >
                        <span className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black uppercase shrink-0 ${day.isRestDay ? 'bg-slate-200 dark:bg-[#243A58] text-slate-500 dark:text-[#CBD5E1]' : 'bg-indigo-600 text-white'}`}>
                          D{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold truncate ${day.isRestDay ? 'text-slate-500 dark:text-[#CBD5E1]' : 'text-slate-800 dark:text-[#E2E8F0]'}`}>{day.name}</span>
                            {dDate && <span className="text-[10px] font-medium text-slate-500 dark:text-[#CBD5E1]">{dDate}</span>}
                          </div>
                          {/* Summary row */}
                          <div className="flex items-center gap-2 mt-0.5">
                            {day.isRestDay ? (
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] flex items-center gap-1">
                                <MoonIcon size={10} /> Rest day
                              </span>
                            ) : totalEx > 0 ? (
                              <>
                                {sectionCountsList.map(s => (
                                  <span
                                    key={s.id}
                                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{ color: s.color, backgroundColor: `${s.color}1A` }}>
                                    {s.label} {s.count}
                                  </span>
                                ))}
                                {day.linkedSessions && day.linkedSessions.length > 0 && (
                                  <span className="text-[9px] font-semibold text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/15 px-1.5 py-0.5 rounded-full">{day.linkedSessions.length} linked</span>
                                )}
                              </>
                            ) : (
                              <span className="text-[9px] font-medium text-slate-500 dark:text-[#CBD5E1] italic">No exercises yet — expand to add</span>
                            )}
                          </div>
                        </div>
                        <ChevronDownIcon size={16} className={`text-slate-400 dark:text-[#CBD5E1] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Expanded body */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-100 dark:border-[#243A58] space-y-5 pt-4">
                          {/* Day name input + rest toggle + delete */}
                          <div className="flex items-center gap-2">
                            <input
                              value={day.name}
                              onChange={(e) => updateDay(globalIdx, 'name', e.target.value)}
                              placeholder="Day Name *"
                              className={`flex-1 border rounded-lg px-3 py-2 text-sm font-bold outline-none transition-colors bg-white dark:bg-[#0F1C30] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] ${day.isRestDay ? 'border-slate-300 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] focus:border-slate-400' : 'border-slate-200 dark:border-[#243A58] focus:border-indigo-500'}`}
                            />
                            <button
                              type="button"
                              onClick={() => applyRestDay(globalIdx)}
                              title={day.isRestDay ? 'Convert to training day' : 'Mark as rest day'}
                              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-semibold border transition-all shrink-0 ${
                                day.isRestDay
                                  ? 'bg-slate-800 dark:bg-indigo-600 text-white border-slate-800 dark:border-indigo-600 hover:bg-slate-700 dark:hover:bg-indigo-500'
                                  : 'bg-white dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-slate-400 dark:hover:border-[#364E6E] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                              }`}
                            >
                              <MoonIcon size={11} />
                              Rest
                            </button>
                            {days.length > 1 && (
                              <button
                                onClick={() => removeDay(globalIdx)}
                                className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15 dark:hover:text-red-400 transition-all border border-slate-200"
                                title="Remove this day"
                              >
                                <Trash2Icon size={13} />
                              </button>
                            )}
                          </div>

                          {/* Rest Day display block */}
                          {day.isRestDay && (
                            <div className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] text-center space-y-2">
                              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                                <MoonIcon size={18} className="text-slate-400" />
                              </div>
                              <p className="text-xs font-semibold text-slate-600 dark:text-[#CBD5E1]">Rest Day</p>
                              <p className="text-[10px] text-slate-400">Recovery is part of the plan.</p>
                              <button
                                type="button"
                                onClick={() => applyRestDay(globalIdx)}
                                className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 underline underline-offset-2 transition-colors"
                              >
                                Convert to training day
                              </button>
                            </div>
                          )}

                          {/* Volume pills */}
                          {!day.isRestDay && (Object.keys(dayVolume.byBodyPart).length > 0 || Object.keys(dayVolume.byRegion).length > 0) && (
                            <div className="space-y-1.5">
                              {Object.keys(dayVolume.byBodyPart).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[8px] font-semibold uppercase text-slate-400 tracking-wide mr-1">Body Part</span>
                                  {Object.entries(dayVolume.byBodyPart).sort((a, b) => b[1] - a[1]).map(([part, sets]) => {
                                    const color = BODY_PART_COLORS[part] ?? 'bg-slate-100 text-slate-600 dark:text-[#CBD5E1]';
                                    return (
                                      <span key={part} className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${color}`}>
                                        {part} {sets}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {Object.keys(dayVolume.byRegion).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[8px] font-semibold uppercase text-slate-400 tracking-wide mr-1">Region</span>
                                  {Object.entries(dayVolume.byRegion).sort((a, b) => b[1] - a[1]).map(([region, sets]) => {
                                    const color = VOLUME_COLORS[region] ?? 'bg-slate-100 text-slate-600 dark:text-[#CBD5E1]';
                                    return (
                                      <span key={region} className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase ${color}`}>
                                        {region} {sets}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Section tabs — per-day, colored, renameable (Packets-style) */}
                          {!day.isRestDay && (
                            <div data-tour="program-day-sections" className="border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden bg-white dark:bg-[#132338]">
                              {/* Tabs strip */}
                              <div className="relative flex border-b border-slate-100 dark:border-[#243A58] items-stretch">
                                {day.sectionOrder.map(sec => {
                                  const meta = day.sectionMeta[sec] || { label: sec, color: '#6366f1' };
                                  const isActive = day.activeSection === sec;
                                  const count = (day.sections[sec] || []).length;
                                  const isRenaming = renamingSection?.dayIdx === globalIdx && renamingSection?.sec === sec;
                                  return (
                                    <div key={sec} className="relative group flex-1 min-w-0">
                                      <button
                                        onClick={() => { if (!isRenaming) setDayActiveSection(globalIdx, sec); }}
                                        className={`w-full py-2.5 px-2 text-[10px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                                          isActive
                                            ? 'text-slate-900 dark:text-[#E2E8F0]'
                                            : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                                        }`}
                                        style={{
                                          borderBottom: `2px solid ${isActive ? meta.color : 'transparent'}`,
                                          backgroundColor: isActive ? `${meta.color}14` : undefined,
                                        }}>
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                                        {isRenaming ? (
                                          <input
                                            autoFocus
                                            value={meta.label}
                                            onChange={e => updateDaySectionMeta(globalIdx, sec, { label: e.target.value })}
                                            onBlur={() => setRenamingSection(null)}
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setRenamingSection(null); }}
                                            onClick={e => e.stopPropagation()}
                                            className="bg-transparent border-b border-indigo-400 text-[10px] font-bold uppercase tracking-wide outline-none w-24 text-center text-slate-900 dark:text-[#E2E8F0]"
                                          />
                                        ) : (
                                          <span className="truncate">{meta.label}</span>
                                        )}
                                        {count > 0 && !isRenaming && (
                                          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold"
                                            style={{ backgroundColor: `${meta.color}26`, color: meta.color }}>
                                            {count}
                                          </span>
                                        )}
                                      </button>
                                      {isActive && !isRenaming && (
                                        <div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={(e) => { e.stopPropagation(); setRenamingSection({ dayIdx: globalIdx, sec }); }}
                                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]"
                                            title="Rename section">
                                            <PencilIcon size={9} />
                                          </button>
                                          {!isDefaultSection(sec) && (
                                            <button onClick={(e) => { e.stopPropagation(); removeSectionFromDay(globalIdx, sec); }}
                                              className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-500/15 text-slate-400 dark:text-[#CBD5E1] hover:text-rose-600 dark:hover:text-rose-400"
                                              title="Remove section">
                                              <XIcon size={9} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                <button
                                  onClick={() => setAddSectionOpenFor(globalIdx)}
                                  className="shrink-0 px-2.5 py-2.5 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/15 transition-colors flex items-center gap-1"
                                  title="Add section">
                                  <PlusIcon size={11} /> Section
                                </button>
                                {addSectionOpenFor === globalIdx && (
                                  <AddSectionPopover
                                    onSelect={(name, color) => { addSectionToDay(globalIdx, name, color); setAddSectionOpenFor(null); }}
                                    onClose={() => setAddSectionOpenFor(null)}
                                  />
                                )}
                              </div>

                              {/* Active section exercises — drop zone for drag-from-picker and cross-section/day moves */}
                              {(() => {
                                const sec = day.activeSection;
                                const rows = day.sections[sec] || [];
                                const isDropTarget = exerciseDropTarget?.dayIdx === globalIdx && exerciseDropTarget?.sec === sec;
                                return (
                                  <div
                                    className={`p-3 space-y-3 min-h-[120px] transition-colors ${isDropTarget ? 'bg-indigo-50/40 dark:bg-indigo-900/15 ring-2 ring-inset ring-indigo-300 dark:ring-indigo-700' : ''}`}
                                    onDragOver={(e) => {
                                      const types = e.dataTransfer.types;
                                      if (!types.includes('text/plain')) return;
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = types.includes('text/plain') ? 'copy' : 'move';
                                      if (!isDropTarget) setExerciseDropTarget({ dayIdx: globalIdx, sec });
                                    }}
                                    onDragLeave={(e) => {
                                      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                                        setExerciseDropTarget(null);
                                      }
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      setExerciseDropTarget(null);
                                      const data = e.dataTransfer.getData('text/plain') || '';
                                      // 'rest' is handled by the day-card wrapper; ignore here so we don't conflict
                                      if (data === 'rest') return;
                                      if (data.startsWith('picker:')) {
                                        const exId = data.slice('picker:'.length);
                                        const ex = searchResults.find((x: any) => x.id === exId);
                                        if (ex && !(day.sections[sec] || []).some(r => r.exerciseId === ex.id)) {
                                          // Add to THIS section (not the global activeSection) — that's the whole point of drag
                                          const newRow = emptyRow(ex);
                                          setDays(prev => prev.map((d, di) => di === globalIdx
                                            ? { ...d, sections: { ...d.sections, [sec]: [...(d.sections[sec] || []), newRow] }, activeSection: sec }
                                            : d
                                          ));
                                          // Move picker focus to the day we just dropped on so the indicator stays accurate
                                          setActiveDayIdx(globalIdx);
                                        }
                                      } else if (data.startsWith('row:')) {
                                        // row:<sourceDayIdx>:<sourceSec>:<rowTempId>  →  move into this day+section
                                        const [, fromDayIdxStr, fromSec, rowTempId] = data.split(':');
                                        const fromDayIdx = parseInt(fromDayIdxStr, 10);
                                        if (Number.isNaN(fromDayIdx)) return;
                                        if (fromDayIdx === globalIdx && fromSec === sec) return; // same spot, no-op
                                        setDays(prev => {
                                          const fromDay = prev[fromDayIdx];
                                          if (!fromDay) return prev;
                                          const movingRow = (fromDay.sections[fromSec] || []).find(r => r.tempId === rowTempId);
                                          if (!movingRow) return prev;
                                          return prev.map((d, di) => {
                                            if (di === fromDayIdx && di === globalIdx) {
                                              // Same day, different sections — drop from source, add to target
                                              return {
                                                ...d,
                                                sections: {
                                                  ...d.sections,
                                                  [fromSec]: (d.sections[fromSec] || []).filter(r => r.tempId !== rowTempId),
                                                  [sec]: [...(d.sections[sec] || []), movingRow],
                                                },
                                              };
                                            }
                                            if (di === fromDayIdx) {
                                              return { ...d, sections: { ...d.sections, [fromSec]: (d.sections[fromSec] || []).filter(r => r.tempId !== rowTempId) } };
                                            }
                                            if (di === globalIdx) {
                                              return { ...d, sections: { ...d.sections, [sec]: [...(d.sections[sec] || []), movingRow] } };
                                            }
                                            return d;
                                          });
                                        });
                                      }
                                    }}
                                  >
                                    {rows.length === 0 ? (
                                      <div className="py-6 flex flex-col items-center text-slate-300 gap-1.5">
                                        <p className="text-[10px] font-medium text-slate-400">No exercises in {day.sectionMeta[sec]?.label || sec}</p>
                                        <p className="text-[9px] text-slate-300">Click or drag an exercise from the right panel</p>
                                      </div>
                                    ) : rows.map((row, idx) => (
                                      <ExRow
                                        key={row.tempId}
                                        row={row}
                                        letter={String(idx + 1)}
                                        dayIdx={globalIdx}
                                        sec={sec}
                                        onChange={(updated) => setDays(prev => prev.map((d, di) => di === globalIdx ? { ...d, sections: { ...d.sections, [sec]: d.sections[sec].map(r => r.tempId === row.tempId ? updated : r) } } : d))}
                                        onRemove={() => setDays(prev => prev.map((d, di) => di === globalIdx ? { ...d, sections: { ...d.sections, [sec]: d.sections[sec].filter(r => r.tempId !== row.tempId) } } : d))}
                                        onOpenDisplayOptions={() => setDisplayOptionsRow({ dayIdx: globalIdx, sec, tempId: row.tempId })}
                                      />
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Day instructions */}
                          <div>
                            <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Day Instructions</label>
                            <textarea
                              value={day.instructions}
                              onChange={(e) => updateDay(globalIdx, 'instructions', e.target.value)}
                              placeholder={day.isRestDay ? "Optional notes, e.g. light walk, mobility work..." : "Coaching notes, warm-up protocol, session intent..."}
                              rows={2}
                              className="w-full border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] resize-none"
                            />
                          </div>

                          {/* Linked Sessions — only training days */}
                          {!day.isRestDay && (
                            <LinkedSessionsPicker
                              linked={day.linkedSessions}
                              onChange={(updated) => setDays(prev => prev.map((d, di) => di === globalIdx ? { ...d, linkedSessions: updated } : d))}
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
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* + Day — adds a day to this week, capped at 7. Disabled at the cap. */}
                {activeWeekDays.length < DAYS_PER_WEEK && (
                  <button
                    type="button"
                    onClick={addDayToActiveWeek}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#243A58] text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all">
                    <PlusIcon size={11} /> Add Day ({activeWeekDays.length} / {DAYS_PER_WEEK})
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Right Panel: Exercise Chooser ── */}
      <div className="w-72 border-l border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] flex flex-col shrink-0 overflow-hidden">

        {/* Header / filters */}
        <div className="px-4 py-4 border-b border-slate-200 dark:border-[#243A58] space-y-3 shrink-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-[#CBD5E1]">Choose Exercise</h3>

          {/* All / Mine toggle */}
          <div className="flex bg-slate-100 dark:bg-[#1A2D48] rounded-lg p-0.5">
            <button type="button" onClick={() => { setPickerSource('all'); setPickerCollectionId(null); }} className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all ${pickerSource === 'all' ? 'bg-white dark:bg-[#243A58] text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>All</button>
            <button type="button" onClick={() => setPickerSource('mine')} className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all flex items-center justify-center gap-1 ${pickerSource === 'mine' ? 'bg-white dark:bg-[#243A58] text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>
              Mine
            </button>
          </div>
          {/* Collection sub-filter inside Mine */}
          {pickerSource === 'mine' && collections.length > 0 && (
            <CustomSelect
              value={pickerCollectionId ?? ''}
              onChange={(e: any) => setPickerCollectionId(e.target.value || null)}
              variant="form" size="xs" prefixLabel="Collection"
            >
              <option value="">All in My Library</option>
              {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </CustomSelect>
          )}

          {/* Search */}
          <div className="relative">
            <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={exSearch}
              onChange={(e) => { setExSearch(e.target.value); setExLetter(''); }}
              placeholder="Search by name..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 dark:border-[#243A58] rounded-xl text-xs font-bold outline-none focus:border-indigo-400 bg-slate-50 dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569]"
            />
          </div>

          {/* Did you mean? */}
          {exSuggestions.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-3 py-2 text-xs text-amber-800">
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
          <CustomSelect
            variant="form"
            size="xs"
            value={exCategory}
            onChange={(e) => setExCategory(e.target.value)}
          >
            {EXERCISE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </CustomSelect>

          {/* A–Z letter browser */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Browse A–Z</span>
              {exLetter && (
                <button
                  onClick={() => setExLetter('')}
                  className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 uppercase tracking-wide"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => { setExLetter(''); setExSearch(''); }}
                className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${
                  !exLetter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 hover:text-indigo-700'
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
                      : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 hover:text-indigo-700'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Adding to indicator — reads from the active day's active section */}
          <div className="bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 rounded-xl px-3 py-2">
            <span className="text-[9px] font-semibold uppercase text-indigo-500 dark:text-indigo-300 tracking-wide">Adding to: </span>
            <span className="text-[9px] font-semibold uppercase text-indigo-700 dark:text-white tracking-wide">
              {activeDay?.sectionMeta?.[activeDay?.activeSection]?.label || activeDay?.activeSection || ''}
            </span>
            <span className="text-[9px] text-indigo-500 dark:text-indigo-300 ml-1">
              — {activeDay?.name ?? ''}
            </span>
          </div>
        </div>

        {/* Exercise list + pagination */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Rest Day tile — pinned at top, draggable onto any day header to mark as rest */}
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', 'rest');
                e.dataTransfer.effectAllowed = 'copy';
                setIsDraggingRest(true);
              }}
              onDragEnd={() => setIsDraggingRest(false)}
              onClick={() => {
                // Click-to-apply: marks the active day as rest (only if not already rest)
                if (!days[clampedActiveDayIdx]?.isRestDay) {
                  applyRestDay(clampedActiveDayIdx);
                }
              }}
              className="w-full text-left px-4 py-3 border-b border-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-[#1A2D48]/40 dark:hover:bg-[#1A2D48] transition-colors group flex items-center gap-3 cursor-grab active:cursor-grabbing"
              title="Drag onto a day, or click to mark the active day as rest"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] flex items-center justify-center shrink-0">
                <MoonIcon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-700 dark:text-[#E2E8F0] leading-tight">Rest Day</div>
                <div className="text-[9px] font-medium text-slate-400 mt-0.5">Drag onto any day · or click for active</div>
              </div>
            </button>
            {exLoading ? (
              <div className="p-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide">Loading...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-6 text-center text-[10px] font-bold text-slate-300 tracking-wide">
                {pickerSource === 'mine' ? <><div className="uppercase">No exercises in your library</div><div className="text-[9px] font-medium normal-case mt-1">Star exercises from the Exercise Library page</div></> : <span className="uppercase">No exercises found</span>}
              </div>
            ) : (
              searchResults.map((ex) => {
                // Already-added check uses the ACTIVE day's active section (matches picker indicator)
                const activeSecOnActiveDay = activeDay?.activeSection;
                const already = !!activeDay && !!activeSecOnActiveDay
                  && (activeDay.sections[activeSecOnActiveDay] || []).some((r: any) => r.exerciseId === ex.id);
                return (
                  <div
                    key={ex.id}
                    role="button"
                    tabIndex={0}
                    draggable={!already}
                    onDragStart={(e) => {
                      if (already) { e.preventDefault(); return; }
                      setDraggedExId(ex.id);
                      e.dataTransfer.setData('text/plain', `picker:${ex.id}`);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onDragEnd={() => setDraggedExId(null)}
                    onClick={() => !already && addExercise(ex)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !already) { e.preventDefault(); addExercise(ex); } }}
                    className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-[#243A58] transition-colors group flex items-start gap-3 ${already ? 'bg-emerald-50/60 dark:bg-emerald-500/10 cursor-default' : 'hover:bg-indigo-50 dark:hover:bg-indigo-500/15 cursor-grab active:cursor-grabbing'} ${draggedExId === ex.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold leading-tight truncate ${already ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-[#E2E8F0] group-hover:text-indigo-800 dark:group-hover:text-indigo-300'}`}>
                        {ex.name}
                      </div>
                      {ex.categories?.[0] && (
                        <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                          {ex.categories[0]}
                        </div>
                      )}
                    </div>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all mt-0.5 ${already ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-[#243A58] text-slate-400 dark:text-[#CBD5E1] group-hover:bg-indigo-600 group-hover:text-white'}`}>
                      {already ? <span className="text-[9px]">&#10003;</span> : <PlusIcon size={12} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="shrink-0 border-t border-slate-100 dark:border-[#243A58] px-3 py-2.5 flex items-center justify-between bg-white dark:bg-[#132338]">
              <button
                onClick={() => setExPage((p) => Math.max(1, p - 1))}
                disabled={exPage === 1 || exLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#243A58] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeftIcon size={11} /> Prev
              </button>
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1]">{exPage} / {totalPages}</div>
                <div className="text-[8px] text-slate-300 dark:text-[#475569] font-semibold">{totalCount} total</div>
              </div>
              <button
                onClick={() => setExPage((p) => Math.min(totalPages, p + 1))}
                disabled={exPage === totalPages || exLoading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#243A58] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next <ChevronRightIcon size={11} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share popover — wired to the Share button in the top bar */}
      {shareTarget && (
        <ShareWorkoutPopover
          workoutType="program"
          workoutId={shareTarget.id}
          workoutName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Assign modal — same component used by the list page */}
      <ProgramAssignModal
        program={assignTarget}
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
      />

      {/* Per-exercise Display Options modal */}
      {displayOptionsRow && (() => {
        const targetDay = days[displayOptionsRow.dayIdx];
        const targetRow = targetDay?.sections?.[displayOptionsRow.sec]?.find(r => r.tempId === displayOptionsRow.tempId);
        if (!targetRow) return null;
        return (
          <DisplayOptionsModal
            row={targetRow}
            onSave={(fields) => setDays(prev => prev.map((d, di) =>
              di === displayOptionsRow.dayIdx
                ? { ...d, sections: { ...d.sections, [displayOptionsRow.sec]: d.sections[displayOptionsRow.sec].map(r => r.tempId === displayOptionsRow.tempId ? { ...r, displayFields: fields } : r) } }
                : d
            ))}
            onClose={() => setDisplayOptionsRow(null)}
          />
        );
      })()}
    </div>
  );
};
