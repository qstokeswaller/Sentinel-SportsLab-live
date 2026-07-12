// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { useAuth } from '../context/AuthContext';
import { useSmartSearch } from '../hooks/useSmartSearch';
import { useExerciseMap } from '../hooks/useExerciseMap';
import { computePlannedTonnage } from '../utils/plannedTonnage';
import { DatabaseService } from '../services/databaseService';
import {
    ArrowLeft as ArrowLeftIcon,
    Printer as PrinterIcon,
    Search as SearchIcon,
    Plus as PlusIcon,
    Trash2 as Trash2Icon,
    ChevronDown as ChevronDownIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    CalendarPlus as CalendarPlusIcon,
    Save as SaveIcon,
    Dumbbell as DumbbellIcon,
    Clock as ClockIcon,
    Package as PackageIcon,
    RefreshCw as RefreshCwIcon,
    Copy as CopyIcon,
    Link as LinkIcon,
    ClipboardList as ClipboardListIcon,
    Activity as ActivityIcon,
    Timer as TimerIcon,
    Info as InfoIcon,
    Pencil as PencilIcon,
    X as XIcon,
    GripVertical as GripVerticalIcon,
    Settings2 as Settings2Icon,
    Share2 as Share2Icon,
} from 'lucide-react';
import WeightroomSheetPanel from '../components/workout/WeightroomSheetPanel';
import { CustomSelect } from '../components/ui/CustomSelect';
import { ShareToOrgToggle } from '../components/tier/ShareToOrgToggle';
import { ExerciseInfoModal } from '../components/library/ExerciseInfoModal';
import { LinkedSessionsPicker, LinkedSession } from '../components/conditioning/LinkedSessionsPicker';
import { ShareWorkoutPopover } from '../components/workouts/ShareWorkoutPopover';
import { useCollections } from '../hooks/useCollections';
import {
    PresetSelect, IntensityPillEditor, DisplayOptionsModal, AddSectionPopover,
    SETS_PRESETS, REPS_PRESETS, REST_PRESETS, TEMPO_PRESETS,
    DEFAULT_DISPLAY_FIELDS,
    type IntensityPill,
} from '../components/workouts/exerciseRowShared';
import { buildMaxLookup, computeAthleteWeightOverrides } from '../utils/weightroomUtils';
import TimePicker from '../components/ui/TimePicker';
import DatePicker from '../components/ui/DatePicker';

// ── Constants ────────────────────────────────────────────────────────────────

const TRAINING_PHASES = ['Strength', 'Power', 'Hypertrophy', 'Speed', 'Conditioning', 'Recovery', 'Technical', 'GPP'];

const EXERCISE_CATEGORIES = [
    'All', 'Upper Body', 'Lower Body', 'Core', 'Full Body',
    'Plyometric', 'Olympic Weightlifting', 'Powerlifting',
    'Mobility', 'Bodybuilding', 'Calisthenics', 'Balance',
    'Animal Flow', 'Ballistics', 'Grinds', 'Postural',
];

const SECTIONS = ['warmup', 'workout', 'cooldown'] as const;
const SECTION_LABELS = { warmup: 'Warm-Up', workout: 'Workout', cooldown: 'Cool-Down' };
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// SECTION_PRESETS moved to components/workouts/exerciseRowShared.tsx

// Presets + INTENSITY_UNITS now live in components/workouts/exerciseRowShared.tsx

const VOLUME_COLORS: Record<string, string> = {
    'Upper Body': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    'Lower Body': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    'Core': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    'Full Body': 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    'Plyometric': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    'Olympic Weightlifting': 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    'Powerlifting': 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    'Mobility': 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    'Bodybuilding': 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    'Calisthenics': 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

const BODY_PART_COLORS: Record<string, string> = {
    'Chest': 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    'Back': 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    'Shoulders': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    'Biceps': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
    'Triceps': 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    'Quadriceps': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    'Hamstrings': 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300',
    'Glutes': 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
    'Calves': 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
    'Abdominals': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    'Forearms': 'bg-stone-100 text-stone-600 dark:bg-stone-500/15 dark:text-stone-300',
    'Trapezius': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    'Hip Flexors': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
    'Adductors': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    'Abductors': 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
    'Shins': 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
};

const tempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ── Types ────────────────────────────────────────────────────────────────────
// IntensityPill, PresetSelect, IntensityPillEditor, DisplayOptionsModal,
// DEFAULT_DISPLAY_FIELDS, DISPLAY_FIELD_OPTIONS now live in
// components/workouts/exerciseRowShared.tsx and are imported above.

interface ExRow {
    tempId: string;
    exerciseId: string;
    exerciseName: string;
    exerciseBodyParts: string[];
    exerciseCategories: string[];
    sets: string;
    reps: string;
    rest: string;
    tempo: string;
    rpe: string;          // kept for backward-compat (mirrored from intensities)
    notes: string;
    weight: string;       // kept for backward-compat (mirrored from intensities)
    intensities: IntensityPill[]; // 1-3 prescription pills; canonical going forward
    displayFields?: string[]; // per-row override of which fields show; undefined = defaults
}

const emptyRow = (ex: { id: string; name: string; body_parts?: string[]; categories?: string[] }): ExRow => ({
    tempId: tempId(),
    exerciseId: ex.id,
    exerciseName: ex.name,
    exerciseBodyParts: ex.body_parts ?? [],
    exerciseCategories: ex.categories ?? [],
    sets: '3',
    reps: '10',
    rest: '60s',
    tempo: '',
    rpe: '7',
    notes: '',
    weight: '',
    intensities: [{ unit: 'kg', value: '' }, { unit: 'RPE', value: '7' }],
});

// AddSectionPopover moved to components/workouts/exerciseRowShared.tsx

// ── Page Component ───────────────────────────────────────────────────────────

export const WorkoutPacketsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user: authUser } = useAuth();
    const {
        teams, resolveTargetName,
        scheduleWorkoutSession, showToast,
        workoutTemplates, setWorkoutTemplates,
        handleUpdatePlanSession, periodizationPlans,
        maxHistory, scheduledSessions,
        wattbikeSessions, conditioningSessions,
        personalExerciseIds,
        setPlannedTonnageLog,
    } = useAppState();

    // ── Incoming edit state via router ───────────────────────────────────
    const routerState = location.state as {
        editTemplate?: any;
        editSession?: any;
        returnTo?: string;
        assignToPlanSession?: {
            sessionId: string;
            date: string;
            weekId: string;
            blockId: string;
            phaseId: string;
            planId: string;
        };
    } | null;

    const editingTemplateId = routerState?.editTemplate?.id || null;
    const assignCtx = routerState?.assignToPlanSession || null;
    // Fallback chain for back-navigation: explicit returnTo → last Workouts tab the user was on → safe default.
    // This is what fixes the long-standing bug where the back button always landed on Programs even when the
    // user originally came from the Packets or Sheets tab.
    const lastWorkoutsTab = (typeof window !== 'undefined' && window.sessionStorage?.getItem('sentinel:lastWorkoutsTab')) || '/workouts/sessions';
    const returnTo = assignCtx ? '/periodization' : (routerState?.returnTo || lastWorkoutsTab);

    // ── Session info state ─────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [targetType, setTargetType] = useState<'Team' | 'Individual'>('Team');
    const [targetId, setTargetId] = useState('');
    const [trainingPhase, setTrainingPhase] = useState('Strength');
    const [load, setLoad] = useState('Medium');
    const [trackTonnage, setTrackTonnage] = useState(true);
    // Personal vs Org — drives whether colleagues in the same org see this packet.
    const [visibility, setVisibility] = useState<'personal' | 'org'>('personal');

    // ── Workout builder state ──────────────────────────────────────────────
    const [sections, setSections] = useState<Record<string, ExRow[]>>({ warmup: [], workout: [], cooldown: [] });
    const [activeSection, setActiveSection] = useState<string>('workout');
    const [linkedSessions, setLinkedSessions] = useState<LinkedSession[]>([]);

    // ── Exercise picker state ──────────────────────────────────────────────
    const [exSearch, setExSearch] = useState('');
    const [exCategory, setExCategory] = useState('All');
    const [exLetter, setExLetter] = useState('');
    const [alphabetExpanded, setAlphabetExpanded] = useState(false);
    const [exPage, setExPage] = useState(1);

    const [scheduling, setScheduling] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [showLibraryPicker, setShowLibraryPicker] = useState(false);
    const [librarySearch, setLibrarySearch] = useState('');
    const [showWeightroomSheet, setShowWeightroomSheet] = useState(false);
    const [weightroomSheetConfig, setWeightroomSheetConfig] = useState(null);
    const [isSessionSummaryCollapsed, setIsSessionSummaryCollapsed] = useState(true);
    const [infoExercise, setInfoExercise] = useState<any | null>(null);
    // Share popover — opens via the top-bar Share button, only enabled after a template ID exists
    const [shareTarget, setShareTarget] = useState<{ type: 'template'; id: string; name: string } | null>(null);
    const [sectionMeta, setSectionMeta] = useState<Record<string, { label: string; color: string }>>({
        warmup:   { label: 'Warm-Up',  color: '#f59e0b' },
        workout:  { label: 'Main',     color: '#6366f1' },
        cooldown: { label: 'Cool-Down',color: '#0ea5e9' },
    });
    const [sectionOrder, setSectionOrder] = useState<string[]>(['warmup', 'workout', 'cooldown']);
    const [displayOptionsRow, setDisplayOptionsRow] = useState<{ section: string; tempId: string } | null>(null);
    const [addSectionOpen, setAddSectionOpen] = useState(false);
    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const [editSectionId, setEditSectionId] = useState<string | null>(null);
    const [draggedExId, setDraggedExId] = useState<string | null>(null);
    const [dropOverSection, setDropOverSection] = useState<string | null>(null);
    // Row drop indicator: which row is being hovered over and whether the drop will go before/after
    const [rowDropTarget, setRowDropTarget] = useState<{ tempId: string; pos: 'before' | 'after' } | null>(null);
    // Linked Sessions section can collapse to a thin bar so the main exercise area gets more room
    const [linkedSessionsExpanded, setLinkedSessionsExpanded] = useState(false);
    // Per-row collapse state: stores the tempIds of rows that should render header-only
    const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
    const toggleRowCollapsed = (tempId: string) => setCollapsedRows(prev => {
        const next = new Set(prev);
        if (next.has(tempId)) next.delete(tempId); else next.add(tempId);
        return next;
    });

    const isDefaultSection = (sec: string) => sec === 'warmup' || sec === 'workout' || sec === 'cooldown';

    const addCustomSection = (name: string, color: string) => {
        const trimmed = (name || '').trim();
        if (!trimmed) return;
        const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        setSectionMeta(prev => ({ ...prev, [id]: { label: trimmed, color: color || '#6366f1' } }));
        setSectionOrder(prev => [...prev, id]);
        setSections(prev => ({ ...prev, [id]: [] }));
        setActiveSection(id);
        setAddSectionOpen(false);
    };

    const updateSectionMeta = (id: string, patch: Partial<{ label: string; color: string }>) => {
        setSectionMeta(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    };

    const removeSection = (id: string) => {
        if (isDefaultSection(id)) return; // protect built-ins
        const { [id]: removed, ...restMeta } = sectionMeta;
        setSectionMeta(restMeta);
        setSectionOrder(prev => prev.filter(s => s !== id));
        setSections(prev => { const { [id]: _, ...rest } = prev; return rest; });
        if (activeSection === id) setActiveSection('workout');
    };

    // Serialize an ExRow for save. The `intensities[]` array is canonical going
    // forward; we mirror the first kg pill into the legacy `weight` field and the
    // first RPE pill into the legacy `rpe` field for backward-compat with code
    // that still reads those. If the user removed a kg or RPE pill, the legacy
    // mirror is written empty — never falling back to a stale value — so tonnage
    // and avg-RPE downstream stay accurate.
    const serializeRow = (r: ExRow) => {
        const kgPill = r.intensities?.find(p => p.unit === 'kg');
        const rpePill = r.intensities?.find(p => p.unit === 'RPE');
        return {
            exerciseId: r.exerciseId,
            exerciseName: r.exerciseName,
            sets: r.sets,
            reps: r.reps,
            rest: r.rest,
            tempo: r.tempo,
            notes: r.notes,
            weight: kgPill?.value ?? '',
            rpe: rpePill?.value ?? '',
            intensities: r.intensities,
            displayFields: r.displayFields,
        };
    };
    const { resolveExerciseName, exerciseFullMap } = useExerciseMap();
    const isAssigning = !!assignCtx;

    // Normalize an exercise row from any source format into ExRow shape.
    // Migrates legacy `weight`/`rpe` fields into the new `intensities` array.
    const normalizeRow = (r: any): ExRow => {
        const exId = r.exerciseId || r.exercise_id || r.id || '';
        const exInfo = exerciseFullMap[exId];
        const weight = String(r.weight || '');
        const rpe = String(r.rpe || '');
        // Build intensities: prefer explicit array if present, else migrate from weight/rpe legacy fields
        let intensities: IntensityPill[] = Array.isArray(r.intensities) && r.intensities.length > 0
            ? r.intensities.map((p: any) => ({ unit: String(p.unit || 'kg'), value: String(p.value || '') }))
            : [
                { unit: 'kg', value: weight },
                { unit: 'RPE', value: rpe },
            ];
        // Trim trailing empty pills so it doesn't look cluttered (but keep at least 1)
        while (intensities.length > 1 && !intensities[intensities.length - 1].value) intensities.pop();
        return {
            tempId: tempId(),
            exerciseId: exId,
            exerciseName: r.exerciseName || r.exercise_name || r.name || resolveExerciseName(exId),
            exerciseBodyParts: r.exerciseBodyParts || exInfo?.body_parts || [],
            exerciseCategories: r.exerciseCategories || exInfo?.categories || [],
            sets: String(r.sets || 3),
            reps: String(r.reps || 10),
            rest: String(r.rest || '60s'),
            tempo: String(r.tempo || ''),
            rpe: rpe || '7',
            notes: r.notes || '',
            weight,
            intensities,
            displayFields: Array.isArray(r.displayFields) ? r.displayFields : undefined,
        };
    };

    // ── Load an existing template into the builder ──────────────────────────
    const loadFromLibrary = (tpl: any) => {
        setTitle(tpl.name || '');
        setTrainingPhase(tpl.trainingPhase || tpl.training_phase || 'Strength');
        setLoad(tpl.load || 'Medium');
        setVisibility(tpl.visibility === 'org' ? 'org' : 'personal');
        const sd = tpl.sections || {};
        // Pull persisted meta from the reserved `_meta` key inside sections first
        // (that's where buildTemplatePayload puts it so it survives the workout_templates
        // single-column schema). Fall back to top-level fields for in-memory copies
        // and to canonical defaults for the very oldest rows.
        const persistedMeta = (sd && typeof sd._meta === 'object') ? sd._meta : null;
        const restoredMeta = (persistedMeta?.sectionMeta && typeof persistedMeta.sectionMeta === 'object')
            ? persistedMeta.sectionMeta
            : (tpl.sectionMeta && typeof tpl.sectionMeta === 'object')
                ? tpl.sectionMeta
                : { warmup: { label: 'Warm-Up', color: '#f59e0b' }, workout: { label: 'Main', color: '#6366f1' }, cooldown: { label: 'Cool-Down', color: '#0ea5e9' } };
        const restoredOrder = Array.isArray(persistedMeta?.sectionOrder) && persistedMeta.sectionOrder.length > 0
            ? persistedMeta.sectionOrder
            : Array.isArray(tpl.sectionOrder) && tpl.sectionOrder.length > 0
                ? tpl.sectionOrder
                : ['warmup', 'workout', 'cooldown'];
        const restoredLinked = Array.isArray(persistedMeta?.linkedSessions)
            ? persistedMeta.linkedSessions
            : Array.isArray(tpl.linkedSessions) ? tpl.linkedSessions : [];
        setSectionMeta(restoredMeta);
        setSectionOrder(restoredOrder);
        setLinkedSessions(restoredLinked);
        // Build sections map for every key in order (incl. customs)
        const nextSections: Record<string, ExRow[]> = {};
        for (const sec of restoredOrder) {
            nextSections[sec] = (sd[sec] || []).map(normalizeRow);
        }
        setSections(nextSections as any);
        setShowLibraryPicker(false);
        setLibrarySearch('');
    };

    // ── Populate form from incoming edit data ───────────────────────────────
    useEffect(() => {
        const src = routerState?.editTemplate || routerState?.editSession;
        if (!src) return;

        setTitle(src.name || src.title || '');
        setTrainingPhase(src.trainingPhase || src.training_phase || 'Strength');
        setLoad(src.load || 'Medium');
        setTrackTonnage(src.track_tonnage !== false);

        if (src.date) setDate(src.date);
        if (src.time) setTime(src.time);
        if (src.target_type || src.targetType) setTargetType(src.target_type || src.targetType);
        if (src.target_id || src.targetId) setTargetId(src.target_id || src.targetId);

        // Load sections from template shape (sections or exercises-as-sections)
        const sectionData = src.sections || (src.exercises && !Array.isArray(src.exercises) && src.exercises.warmup !== undefined ? src.exercises : null);
        if (sectionData) {
            // Restore section meta + order + linked sessions, preferring the reserved
            // _meta key embedded inside sections (survives the DB single-column schema),
            // then top-level legacy fields, then canonical defaults.
            const persistedMeta = (sectionData._meta && typeof sectionData._meta === 'object') ? sectionData._meta : null;
            const restoredMeta = (persistedMeta?.sectionMeta && typeof persistedMeta.sectionMeta === 'object')
                ? persistedMeta.sectionMeta
                : (src.sectionMeta && typeof src.sectionMeta === 'object')
                    ? src.sectionMeta
                    : { warmup: { label: 'Warm-Up', color: '#f59e0b' }, workout: { label: 'Main', color: '#6366f1' }, cooldown: { label: 'Cool-Down', color: '#0ea5e9' } };
            const restoredOrder = Array.isArray(persistedMeta?.sectionOrder) && persistedMeta.sectionOrder.length > 0
                ? persistedMeta.sectionOrder
                : Array.isArray(src.sectionOrder) && src.sectionOrder.length > 0
                    ? src.sectionOrder
                    : ['warmup', 'workout', 'cooldown'];
            const restoredLinked = Array.isArray(persistedMeta?.linkedSessions)
                ? persistedMeta.linkedSessions
                : Array.isArray(src.linkedSessions || src.linked_sessions) ? (src.linkedSessions || src.linked_sessions) : null;
            setSectionMeta(restoredMeta);
            setSectionOrder(restoredOrder);
            if (restoredLinked) setLinkedSessions(restoredLinked);
            const nextSections: Record<string, ExRow[]> = {};
            for (const sec of restoredOrder) {
                nextSections[sec] = (sectionData[sec] || []).map(normalizeRow);
            }
            setSections(nextSections as any);
            // Load attached weightroom sheet config
            if (sectionData.weightroomSheet) {
                setWeightroomSheetConfig(sectionData.weightroomSheet);
            }
        }
        // Load from session exercises (flat array → all go into workout section)
        else if (src.exercises && Array.isArray(src.exercises)) {
            setSections({
                warmup: [],
                workout: src.exercises.map(normalizeRow),
                cooldown: [],
            });
        }

        // Load linked sessions
        if (src.linkedSessions) setLinkedSessions(src.linkedSessions);
    }, []); // Run once on mount

    // ── Pre-populate from periodizer assign context ──────────────────────
    useEffect(() => {
        if (!assignCtx) return;
        setDate(assignCtx.date);
        // Find the session name from the plan to pre-fill title
        const plan = periodizationPlans.find(p => p.id === assignCtx.planId);
        if (plan) {
            for (const ph of plan.phases) {
                if (ph.id !== assignCtx.phaseId) continue;
                for (const bl of ph.blocks) {
                    if (bl.id !== assignCtx.blockId) continue;
                    for (const wk of bl.weeks) {
                        if (wk.id !== assignCtx.weekId) continue;
                        const sess = wk.sessions.find(s => s.id === assignCtx.sessionId);
                        if (sess?.name) setTitle(sess.name);
                    }
                }
            }
        }
    }, []); // Run once on mount

    // ── Assign workout to periodizer session ─────────────────────────────
    const handleAssignToPlan = async () => {
        if (!assignCtx) return;
        if (!title.trim()) { setDetailsExpanded(true); showToast('Enter a workout title', 'error'); return; }

        // 1. Save as template so we have a referenceable ID
        const payload = buildTemplatePayload();
        let templateId: string;

        try {
            const created = await DatabaseService.createWorkoutTemplate({
                name: payload.name,
                training_phase: payload.trainingPhase,
                load: payload.load,
                visibility: payload.visibility,
                sections: payload.sections,
            });
            templateId = created.id;
            setWorkoutTemplates(prev => [{
                id: templateId, ...payload, createdAt: created.created_at,
                user_id: created.user_id, visibility: created.visibility, organisation_id: created.organisation_id,
            }, ...prev]);
        } catch {
            templateId = `tpl_${Date.now()}`;
            setWorkoutTemplates(prev => [{
                id: templateId, ...payload, createdAt: new Date().toISOString(),
                user_id: authUser?.id, visibility: payload.visibility,
            }, ...prev]);
        }

        // 2. Write workoutTemplateId back to the plan session
        try {
            setAssigning(true);
            await handleUpdatePlanSession(
                assignCtx.phaseId,
                assignCtx.blockId,
                assignCtx.weekId,
                assignCtx.sessionId,
                { workoutTemplateId: templateId }
            );

            // 3. Also schedule on the dashboard calendar so the session appears there
            const plan = periodizationPlans.find(p => p.id === assignCtx.planId);
            if (plan) {
                const phase = plan.phases.find(ph => ph.id === assignCtx.phaseId);
                const block = phase?.blocks.find(b => b.id === assignCtx.blockId);
                const week  = block?.weeks.find(w => w.id === assignCtx.weekId);
                const sess  = week?.sessions.find(s => s.id === assignCtx.sessionId);
                const attachOverrides = (r: any) => r;
                // Merge custom-section rows into `workout` so downstream session
                // consumers (which only know warmup/workout/cooldown) see them.
                const customRowsForSchedule = sectionOrder
                    .filter(s => !isDefaultSection(s))
                    .flatMap(s => (sections[s] || []).map(attachOverrides));
                try {
                    await scheduleWorkoutSession({
                        title: title.trim(),
                        date: assignCtx.date,
                        time: '09:00',
                        target_type: plan.targetType,
                        target_id: plan.targetId,
                        training_phase: phase?.trainingPhase || 'General Preparation',
                        load: sess?.load || load || 'Medium',
                        status: 'Scheduled',
                        planned_duration: sess?.plannedDuration || 60,
                        session_type: 'workout',
                        workout_template_id: templateId,
                        exercises: {
                            warmup:   sections.warmup.map(attachOverrides),
                            workout:  [...sections.workout.map(attachOverrides), ...customRowsForSchedule],
                            cooldown: sections.cooldown.map(attachOverrides),
                        },
                    });
                } catch {
                    // Non-fatal — plan session link already saved
                }
            }

            showToast('Workout assigned to plan & added to calendar', 'success');
            // Navigate back with return coords so PeriodizationPage reopens the correct week/day
            navigate(returnTo, {
                state: assignCtx.returnWeekStart ? {
                    returnToMicrocycles: {
                        phaseId: assignCtx.returnPhaseId || assignCtx.phaseId,
                        blockId: assignCtx.returnBlockId || assignCtx.blockId,
                        weekStart: assignCtx.returnWeekStart,
                        selectedDate: assignCtx.returnSelectedDate || assignCtx.date,
                    }
                } : undefined
            });
        } catch (err) {
            showToast('Failed to assign workout', 'error');
        } finally {
            setAssigning(false);
        }
    };

    // ── Query ──────────────────────────────────────────────────────────────
    const { data: exData, isLoading: exLoading } = useSmartSearch({
        search: exSearch || undefined,
        category: exCategory !== 'All' ? exCategory : undefined,
        alphabetLetter: exLetter || undefined,
        page: exPage,
        pageSize: 25,
    });
    const exSuggestions = exData?.suggestions ?? [];
    const [pickerSource, setPickerSource] = useState<'all' | 'mine'>('all');
    // Optional sub-filter inside the Mine tab — narrows the picker to one saved collection.
    const [pickerCollectionId, setPickerCollectionId] = useState<string | null>(null);
    const { collections } = useCollections();
    const personalSet = useMemo(() => new Set(personalExerciseIds || []), [personalExerciseIds]);
    const collectionSet = useMemo(() => {
        if (!pickerCollectionId) return null;
        const col = collections.find(c => c.id === pickerCollectionId);
        return col ? new Set(col.exercise_ids) : null;
    }, [pickerCollectionId, collections]);
    const displayExercises = useMemo(() => {
        let list = exData?.exercises || [];
        if (pickerSource === 'mine') list = list.filter(ex => personalSet.has(ex.id));
        if (collectionSet) list = list.filter(ex => collectionSet.has(ex.id));
        // Always alphabetical so the picker stays predictable
        return [...list].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    }, [exData?.exercises, pickerSource, personalSet, collectionSet]);

    useEffect(() => { setExPage(1); }, [exSearch, exCategory, exLetter]);

    // ── Derived ────────────────────────────────────────────────────────────
    const allPlayers = useMemo(() => teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)), [teams]);
    // Flatten rows from every section in order (incl. customs) for derived counts/volume.
    const allSectionRows = useMemo(
        () => sectionOrder.flatMap(sec => sections[sec] || []),
        [sections, sectionOrder]
    );
    const totalExercises = allSectionRows.length;
    const isEditing = !!editingTemplateId;

    const packetVolume = useMemo(() => {
        const byRegion: Record<string, number> = {};
        const byBodyPart: Record<string, number> = {};
        for (const row of allSectionRows) {
            const sets = parseInt(row.sets) || 0;
            if (sets <= 0) continue;
            const region = row.exerciseCategories?.[0];
            if (region) byRegion[region] = (byRegion[region] ?? 0) + sets;
            const part = row.exerciseBodyParts?.[0];
            if (part) byBodyPart[part] = (byBodyPart[part] ?? 0) + sets;
        }
        return { byRegion, byBodyPart };
    }, [allSectionRows]);

    const sessionSummary = useMemo(() => {
        let totalSets = 0, estTonnage = 0, rpeSum = 0, rpeCount = 0;
        for (const row of allSectionRows) {
            const sets = parseInt(row.sets) || 0;
            const reps = parseInt(row.reps) || 0;
            // Read canonical intensity pills (legacy `weight`/`rpe` fields may be stale during editing)
            const pills = row.intensities || [];
            const kgPill = pills.find(p => p.unit === 'kg');
            const rpePill = pills.find(p => p.unit === 'RPE');
            const kg = kgPill ? (parseFloat(kgPill.value) || 0) : 0;
            const rpe = rpePill ? (parseFloat(rpePill.value) || 0) : 0;
            totalSets += sets;
            // Tonnage only counts when the user has applied a kg weight pill AND the toggle is on
            if (trackTonnage && kg > 0) estTonnage += sets * reps * kg;
            if (rpe > 0) { rpeSum += rpe; rpeCount++; }
        }
        return { totalSets, estTonnage, avgRpe: rpeCount > 0 ? rpeSum / rpeCount : 0 };
    }, [allSectionRows, trackTonnage]);

    const thisWeekSessions = useMemo(() => {
        if (!targetId) return [];
        const now = new Date();
        const dow = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        return (scheduledSessions || []).filter(s => {
            const sid = s.target_id || s.targetId;
            const d = new Date(s.date);
            return sid === targetId && d >= monday && d <= sunday;
        });
    }, [scheduledSessions, targetId]);

    // ── Exercise row handlers ──────────────────────────────────────────────
    const addExercise = (ex: { id: string; name: string; body_parts?: string[]; categories?: string[] }) => {
        setSections(prev => ({
            ...prev,
            [activeSection]: [...(prev[activeSection] || []), emptyRow(ex)]
        }));
    };

    const updateRow = (section: string, rowTempId: string, field: string, value: string) => {
        setSections(prev => ({
            ...prev,
            [section]: prev[section].map(r => r.tempId === rowTempId ? { ...r, [field]: value } : r)
        }));
    };

    const removeRow = (section: string, rowTempId: string) => {
        setSections(prev => ({
            ...prev,
            [section]: prev[section].filter(r => r.tempId !== rowTempId)
        }));
    };

    // Move a row from one position to another within the same section, or across sections.
    // Used by per-row drag-and-drop to reorder. Position is the index in the destination
    // section AFTER the source has been removed (callers can pass any int — clamped here).
    const moveRow = (fromSec: string, fromTempId: string, toSec: string, toIndex: number) => {
        setSections(prev => {
            const fromArr = prev[fromSec] || [];
            const row = fromArr.find(r => r.tempId === fromTempId);
            if (!row) return prev;
            const fromIdx = fromArr.findIndex(r => r.tempId === fromTempId);
            const filteredFrom = fromArr.filter(r => r.tempId !== fromTempId);
            if (fromSec === toSec) {
                // Re-insert into same section; adjust insert index if it was after the removed row
                const insertAt = Math.max(0, Math.min(filteredFrom.length, toIndex > fromIdx ? toIndex - 1 : toIndex));
                const next = [...filteredFrom];
                next.splice(insertAt, 0, row);
                return { ...prev, [fromSec]: next };
            }
            const toArr = [...(prev[toSec] || [])];
            const insertAt = Math.max(0, Math.min(toArr.length, toIndex));
            toArr.splice(insertAt, 0, row);
            return { ...prev, [fromSec]: filteredFrom, [toSec]: toArr };
        });
    };

    // ── Build template payload ──────────────────────────────────────────────
    // Serializes every section in sectionOrder (incl. customs) and persists
    // sectionMeta + sectionOrder + linkedSessions inside the `sections` JSONB
    // under the reserved key `_meta`. The workout_templates table only has the
    // single `sections` column, so without this embedding the custom section
    // colours/labels and the linked-sessions list would be silently dropped on
    // save — and the share view / PDF would render them as anonymous grey
    // blocks. Built-in warmup/workout/cooldown keys remain present even when
    // empty so older readers (and the legacy share view) still see the
    // familiar shape.
    const buildTemplatePayload = () => {
        const serializedSections: Record<string, any> = {};
        for (const sec of sectionOrder) {
            serializedSections[sec] = (sections[sec] || []).map(serializeRow);
        }
        if (weightroomSheetConfig) serializedSections.weightroomSheet = weightroomSheetConfig;
        // Reserved meta key — not an array, so it's safely ignored by any code
        // that iterates sections looking for exercise lists.
        serializedSections._meta = {
            sectionMeta,
            sectionOrder,
            linkedSessions,
        };
        return {
            name: title.trim(),
            trainingPhase,
            load,
            visibility,
            sections: serializedSections,
            sectionMeta,
            sectionOrder,
            linkedSessions,
            createdAt: new Date().toISOString(),
        };
    };

    // ── Schedule workout ─────────────────────────────────────────────────
    const handleSchedule = async () => {
        if (!title.trim()) { setDetailsExpanded(true); showToast('Please enter a workout title', 'error'); return; }
        if (!targetId) { setDetailsExpanded(true); showToast('Please select a target athlete or team', 'error'); return; }

        const stripTemp = serializeRow;

        // Compute per-athlete weight overrides from weightroom sheet 1RM data
        let sheetOverrides: Record<string, Record<string, string>> = {};
        if (weightroomSheetConfig) {
            const targetAthletes = targetType === 'Team'
                ? (teams.find(t => t.id === targetId)?.players || [])
                : allPlayers.filter(p => p.id === targetId);
            const maxLookup = buildMaxLookup(maxHistory);
            sheetOverrides = computeAthleteWeightOverrides(weightroomSheetConfig, targetAthletes, maxLookup);
        }

        const attachOverrides = (r) => {
            const base = stripTemp(r);
            // Match exercise to sheet column by name (sheet columns use canonical 1RM exercise names)
            const overrides = sheetOverrides[r.exerciseName]
                || Object.entries(sheetOverrides).find(([k]) => r.exerciseName.toLowerCase().includes(k.toLowerCase()))?.[1];
            if (overrides) base.athlete_weight_overrides = overrides;
            return base;
        };

        const payload = {
            title: title.trim(),
            date,
            time,
            target_type: targetType,
            target_id: targetId,
            training_phase: trainingPhase,
            load,
            status: 'Scheduled',
            planned_duration: 60,
            track_tonnage: trackTonnage,
            linked_sessions: linkedSessions,
            session_type: 'workout',
            // Custom-section rows merge into `workout` for the scheduled session
            // (downstream consumers only read warmup/workout/cooldown). The full
            // section layout is preserved in the auto-saved template payload.
            exercises: (() => {
                const customRowsForSchedule = sectionOrder
                    .filter(s => !isDefaultSection(s))
                    .flatMap(s => (sections[s] || []).map(attachOverrides));
                return {
                    warmup: sections.warmup.map(attachOverrides),
                    workout: [...sections.workout.map(attachOverrides), ...customRowsForSchedule],
                    cooldown: sections.cooldown.map(attachOverrides),
                    ...(weightroomSheetConfig ? { weightroomSheet: weightroomSheetConfig } : {}),
                };
            })(),
        };

        try {
            setScheduling(true);
            // Auto-save as template if not already editing one. Capture the resulting
            // templateId so we can stamp it onto the scheduled_session row below —
            // that link is what makes the packet appear under the Assigned tab.
            let resolvedTemplateId: string | null = editingTemplateId || null;
            if (!editingTemplateId) {
                const tplPayload = buildTemplatePayload();
                try {
                    const created = await DatabaseService.createWorkoutTemplate({
                        name: tplPayload.name,
                        training_phase: tplPayload.trainingPhase,
                        load: tplPayload.load,
                        visibility: tplPayload.visibility,
                        sections: tplPayload.sections,
                    });
                    resolvedTemplateId = created.id;
                    setWorkoutTemplates(prev => [{
                        id: created.id,
                        ...tplPayload,
                        createdAt: created.created_at,
                        user_id: created.user_id,
                        visibility: created.visibility,
                        organisation_id: created.organisation_id,
                    }, ...prev]);
                } catch {
                    const localId = `tpl_${Date.now()}`;
                    resolvedTemplateId = localId;
                    setWorkoutTemplates(prev => [{
                        id: localId,
                        ...tplPayload,
                        createdAt: new Date().toISOString(),
                        user_id: authUser?.id,
                        visibility: tplPayload.visibility,
                    }, ...prev]);
                }
            }
            const savedSession = await scheduleWorkoutSession({
                ...payload,
                workout_template_id: resolvedTemplateId,
            });

            // ── Write planned tonnage rows ───────────────────────────────────
            // New tracking model: compute per-athlete tonnage from the packet
            // prescription at schedule time and persist to planned_tonnage_log.
            // Coaches no longer mark sessions complete — this is the canonical
            // source for Tracking Hub and Data Hub tonnage.
            try {
                if (trackTonnage && savedSession?.id) {
                    const targetAthletes = targetType === 'Team'
                        ? (teams.find(t => t.id === targetId)?.players || [])
                        : allPlayers.filter(p => p.id === targetId);
                    // Flatten every section's rows — tonnage doesn't care which section
                    const allRows = sectionOrder.flatMap(sec => (sections[sec] || []).map(attachOverrides));
                    const perAthlete = computePlannedTonnage(allRows as any, targetAthletes as any, exerciseFullMap);
                    if (perAthlete.length > 0) {
                        const rowsToInsert = perAthlete.map(p => ({
                            athlete_id: p.athleteId,
                            date,
                            source_type: 'packet' as const,
                            source_id: savedSession.id,
                            program_day_id: null,
                            total_tonnage: p.total,
                            by_body_part: p.byBodyPart,
                        }));
                        await DatabaseService.insertPlannedTonnageRows(rowsToInsert);
                        // Optimistic local update so Tracking Hub / Data Hub see it instantly
                        setPlannedTonnageLog?.((prev: any[]) => [...rowsToInsert.map(r => ({ ...r, created_at: new Date().toISOString() })), ...prev]);
                    }
                }
            } catch (tonnageErr) {
                console.error('Planned tonnage write failed (non-fatal):', tonnageErr);
                // Don't block schedule — tonnage tracking is enhancement data
            }

            navigate(returnTo);
        } catch (err) {
            // toast already shown
        } finally {
            setScheduling(false);
        }
    };

    // ── Update existing template ─────────────────────────────────────────
    const handleUpdateTemplate = async () => {
        if (!title.trim()) { setDetailsExpanded(true); showToast('Enter a title', 'error'); return; }
        const payload = buildTemplatePayload();
        try {
            await DatabaseService.updateWorkoutTemplate(editingTemplateId, {
                name: payload.name,
                training_phase: payload.trainingPhase,
                load: payload.load,
                visibility: payload.visibility,
                sections: payload.sections,
            });
            setWorkoutTemplates(prev => prev.map(t =>
                t.id === editingTemplateId ? { ...t, ...payload } : t
            ));
            showToast('Template updated', 'success');
        } catch (e) {
            // Fallback: update local state anyway
            setWorkoutTemplates(prev => prev.map(t =>
                t.id === editingTemplateId ? { ...t, ...payload } : t
            ));
            showToast('Template updated locally', 'success');
        }
        navigate(returnTo);
    };

    // ── Save as new template ─────────────────────────────────────────────
    const handleSaveAsNew = async () => {
        if (!title.trim()) { setDetailsExpanded(true); showToast('Enter a title to save as template', 'error'); return; }
        const payload = buildTemplatePayload();
        try {
            const created = await DatabaseService.createWorkoutTemplate({
                name: payload.name,
                training_phase: payload.trainingPhase,
                load: payload.load,
                visibility: payload.visibility,
                sections: payload.sections,
            });
            const template = {
                id: created.id,
                ...payload,
                createdAt: created.created_at,
            };
            setWorkoutTemplates(prev => [template, ...prev]);
            showToast('Saved as new template', 'success');
        } catch (e) {
            // Fallback: save locally with temp ID
            const template = { id: `tpl_${Date.now()}`, ...payload, createdAt: new Date().toISOString() };
            setWorkoutTemplates(prev => [template, ...prev]);
            showToast('Saved locally', 'success');
        }
        navigate(returnTo);
    };

    // ── Print ────────────────────────────────────────────────────────────
    const handlePrint = () => {
        const targetName = targetId ? resolveTargetName(targetId, targetType) : '';
        const dateStr = new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        const buildTable = (rows: ExRow[]) => {
            if (!rows.length) return '';
            const trs = rows.map(r =>
                `<tr><td>${r.exerciseName}</td><td>${r.sets}</td><td>${r.reps}</td><td>${r.rest}s</td><td>${r.rpe}</td><td>${r.notes || ''}</td></tr>`
            ).join('');
            return `<table><thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Rest</th><th>RPE</th><th>Notes</th></tr></thead><tbody>${trs}</tbody></table>`;
        };

        let body = '';
        for (const sec of sectionOrder) {
            const rows = sections[sec] || [];
            if (rows.length > 0) {
                const label = sectionMeta[sec]?.label || SECTION_LABELS[sec] || sec;
                body += `<div class="section"><h2>${label}</h2>${buildTable(rows)}</div>`;
            }
        }

        const html = `<!DOCTYPE html><html><head><title>${title || 'Workout'}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
  h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 8px; }
  .meta-line { display: flex; gap: 16px; flex-wrap: wrap; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section h2 { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569; margin: 0 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1e293b; color: white; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  @media print { button { display: none; } }
</style></head><body>
<h1>${title || 'Workout Session'}</h1>
<div class="meta">
  <div class="meta-line">
    <span><strong>Date:</strong> ${dateStr}</span>
    <span><strong>Time:</strong> ${time}</span>
    ${targetName ? `<span><strong>Target:</strong> ${targetName}</span>` : ''}
    <span><strong>Phase:</strong> ${trainingPhase}</span>
    <span><strong>Load:</strong> ${load}</span>
  </div>
</div>
<hr style="border:none;border-top:2px solid #e2e8f0;margin:16px 0 24px;">
${body || '<p style="color:#94a3b8">No exercises added.</p>'}
</body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    // Renders inside the main app layout (NOT as a full-screen overlay), so the
    // sidebar nav stays visible for consistency with every other workflow page.
    return (
        <div className="flex flex-col h-[calc(100vh-40px)] bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden">
            <div className="flex-1 flex overflow-hidden">

                {/* ── LEFT: Main Panel ───────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="px-6 py-3 bg-white dark:bg-[#132338] border-b border-slate-200 dark:border-[#243A58] flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(returnTo)} className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 dark:text-[#CBD5E1] transition-all" title="Back">
                                <ArrowLeftIcon size={18} />
                            </button>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-600">
                                <PackageIcon size={14} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">
                                    {isAssigning ? 'Assign Workout to Plan' : isEditing ? 'Edit Workout Packet' : 'New Workout Packet'}
                                </h2>
                                <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">
                                    {isAssigning ? 'Build a workout and assign it to your periodization plan session' : 'Build, schedule & print one-off workouts'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAssigning ? (
                                <>
                                    <button onClick={handleSaveAsNew} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 transition-all" title="Save as template without assigning">
                                        <SaveIcon size={12} /> Save Template Only
                                    </button>
                                    <button onClick={handleAssignToPlan} disabled={assigning || !title.trim() || totalExercises === 0}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                        <CalendarPlusIcon size={12} /> {assigning ? 'Assigning...' : 'Assign & Return'}
                                    </button>
                                </>
                            ) : isEditing ? (
                                <>
                                    <button onClick={handleUpdateTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 transition-all">
                                        <RefreshCwIcon size={12} /> Update Template
                                    </button>
                                    <button onClick={handleSaveAsNew} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 transition-all">
                                        <CopyIcon size={12} /> Save as New
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleSaveAsNew} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 transition-all" title="Save as template">
                                    <SaveIcon size={12} /> Save Template
                                </button>
                            )}
                            {!isAssigning && (
                                <>
                                    <button
                                        onClick={() => setShowWeightroomSheet(true)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all ${
                                            weightroomSheetConfig
                                                ? 'bg-teal-600 hover:bg-teal-500 text-white'
                                                : 'bg-teal-50 dark:bg-teal-500/15 hover:bg-teal-100 dark:hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30'
                                        }`}
                                    >
                                        <ClipboardListIcon size={12} /> {weightroomSheetConfig ? 'Edit Sheet' : 'Attach Sheet'}
                                    </button>
                                    {/* Share button — opens the same Share popover used on the list page (preserves section colors + per-section exercise rows in the share view) */}
                                    <button
                                        onClick={() => editingTemplateId ? setShareTarget({ type: 'template', id: editingTemplateId, name: title || 'Workout' }) : showToast('Save the template first to share', 'info')}
                                        disabled={!editingTemplateId && !title.trim()}
                                        title={editingTemplateId ? 'Share this packet' : 'Save the template first to enable sharing'}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all ${editingTemplateId ? 'bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-700 dark:text-[#E2E8F0] border border-slate-200 dark:border-[#243A58]' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed opacity-60'}`}
                                    >
                                        <Share2Icon size={12} /> Share
                                    </button>
                                    <button onClick={handleSchedule} disabled={scheduling || !title.trim() || !targetId} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-semibold transition-all shadow-sm ${(scheduling || !title.trim() || !targetId) ? 'bg-indigo-300 dark:bg-indigo-500/30 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                                        <CalendarPlusIcon size={12} /> {scheduling ? 'Scheduling...' : 'Schedule Workout'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Session overview bar — compact context when session has data */}
                    {title.trim() && (
                        <div className="px-6 py-2 bg-slate-50 dark:bg-[#1A2D48] border-b border-slate-200 dark:border-[#243A58] flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
                            <span className="text-xs font-bold text-slate-700 dark:text-[#E2E8F0] whitespace-nowrap shrink-0">{title}</span>
                            {trainingPhase && (
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-bold whitespace-nowrap shrink-0">{trainingPhase}</span>
                            )}
                            {!isAssigning && date && (
                                <span className="text-[10px] text-slate-500 dark:text-[#CBD5E1] whitespace-nowrap shrink-0">
                                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    {time ? ` · ${time}` : ''}
                                </span>
                            )}
                            {targetId && (
                                <span className="text-[10px] text-slate-500 dark:text-[#CBD5E1] whitespace-nowrap shrink-0">
                                    {resolveTargetName(targetId, targetType)}
                                </span>
                            )}
                            {totalExercises > 0 && (
                                <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] whitespace-nowrap shrink-0">
                                    {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
                                </span>
                            )}
                            {sessionSummary.totalSets > 0 && (
                                <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] whitespace-nowrap shrink-0">
                                    {sessionSummary.totalSets} sets
                                </span>
                            )}
                            {sessionSummary.estTonnage > 0 && (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap shrink-0">
                                    ~{Math.round(sessionSummary.estTonnage).toLocaleString()} kg
                                </span>
                            )}
                            <span className={`ml-auto px-2 py-0.5 rounded text-[9px] font-bold shrink-0 border ${load === 'Low' ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : load === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'}`}>
                                {load}
                            </span>
                        </div>
                    )}

                    {/* Assignment context banner */}
                    {isAssigning && (() => {
                        const plan = periodizationPlans.find(p => p.id === assignCtx.planId);
                        const phase = plan?.phases.find(ph => ph.id === assignCtx.phaseId);
                        const block = phase?.blocks.find(b => b.id === assignCtx.blockId);
                        const week = block?.weeks.find(w => w.id === assignCtx.weekId);
                        const session = week?.sessions.find(s => s.id === assignCtx.sessionId);
                        const dayName = new Date(assignCtx.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                        return (
                            <div className="px-6 py-2.5 bg-emerald-50 dark:bg-emerald-500/15 border-b border-emerald-200 dark:border-emerald-500/30 flex items-center gap-3 shrink-0">
                                <LinkIcon size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <p className="text-[11px] text-emerald-800 font-medium">
                                    Assigning to: <span className="font-bold">{plan?.name || 'Plan'}</span>
                                    {' > '}<span className="font-bold">{phase?.name || 'Phase'}</span>
                                    {' > '}<span className="font-bold">{block?.label || block?.name || 'Block'}</span>
                                    {' > '}<span className="font-bold">{dayName}</span>
                                    {session?.name ? <span className="text-emerald-600 dark:text-emerald-400"> ({session.name})</span> : null}
                                </p>
                            </div>
                        );
                    })()}

                    {/* Library picker — only shown when assigning */}
                    {isAssigning && workoutTemplates.length > 0 && (
                        <div className="border-b border-slate-100 dark:border-[#243A58]">
                            <button
                                onClick={() => setShowLibraryPicker(v => !v)}
                                className="flex items-center gap-2 w-full px-6 py-2.5 text-[11px] font-semibold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]/40 transition-colors">
                                <span className={`transition-transform text-slate-400 ${showLibraryPicker ? 'rotate-90' : ''}`}>▶</span>
                                Load from existing workout template
                                <span className="ml-auto text-[10px] font-normal text-slate-400 dark:text-[#CBD5E1]">{workoutTemplates.length} saved</span>
                            </button>
                            {showLibraryPicker && (
                                <div className="px-6 pb-4">
                                    <input
                                        className="w-full mb-3 text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 outline-none focus:border-indigo-400 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400"
                                        placeholder="Search templates…"
                                        value={librarySearch}
                                        onChange={e => setLibrarySearch(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                                        {workoutTemplates
                                            .filter(t => !librarySearch || t.name?.toLowerCase().includes(librarySearch.toLowerCase()))
                                            .map(tpl => {
                                                const exCount = [
                                                    ...(tpl.sections?.warmup || []),
                                                    ...(tpl.sections?.workout || []),
                                                    ...(tpl.sections?.cooldown || []),
                                                ].length;
                                                return (
                                                    <button key={tpl.id} onClick={() => loadFromLibrary(tpl)}
                                                        className="text-left px-3 py-2.5 rounded-lg border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all bg-white dark:bg-[#0F1C30]">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] truncate">{tpl.name || 'Untitled'}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {tpl.load && <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{tpl.load}</span>}
                                                            {exCount > 0 && <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{exCount} exercise{exCount !== 1 ? 's' : ''}</span>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        {workoutTemplates.filter(t => !librarySearch || t.name?.toLowerCase().includes(librarySearch.toLowerCase())).length === 0 && (
                                            <p className="col-span-2 text-xs text-slate-400 dark:text-[#CBD5E1] italic py-2">No templates match.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Weightroom Sheet Panel */}
                    {showWeightroomSheet && (
                        <div className="px-6 pt-4">
                            <WeightroomSheetPanel
                                workoutExercises={sections.workout}
                                sheetConfig={weightroomSheetConfig}
                                targetType={targetType}
                                targetId={targetId}
                                // Provenance carried into the Sheets library row when "Save copy" is checked.
                                // Names are resolved here so deleting the target later doesn't break the saved display.
                                sourceContext={{
                                    packetName: title.trim() || 'Untitled Packet',
                                    sessionDate: date || undefined,
                                    targetType,
                                    targetId,
                                    targetName: targetType === 'Team'
                                        ? (teams.find(t => t.id === targetId)?.name || undefined)
                                        : (allPlayers.find(p => p.id === targetId)?.name || undefined),
                                }}
                                onSave={(config) => {
                                    setWeightroomSheetConfig(config);
                                    setShowWeightroomSheet(false);
                                    showToast('Weightroom sheet attached', 'success');
                                }}
                                onRemove={() => {
                                    setWeightroomSheetConfig(null);
                                    setShowWeightroomSheet(false);
                                    showToast('Sheet removed', 'info');
                                }}
                                onClose={() => setShowWeightroomSheet(false)}
                            />
                        </div>
                    )}

                    {/* Scrollable content — tightened spacing */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-slate-50/60 dark:bg-[#132338]/40 flex flex-col gap-2 min-h-0">
                        {/* Session Info Card — collapsible. Default = slim 1-row bar. Expanded = full editor. */}
                        <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl">
                          {/* Slim header bar — only the Details/Collapse button toggles the section.
                              The title input stays a regular text field; making the whole bar a toggle
                              caused click-bubble fights where the button's click + the parent's click
                              cancelled each other out, leaving the section stuck open. */}
                          <div className="flex items-center gap-2 px-3 py-2">
                            <ClockIcon size={11} className={isAssigning ? 'text-emerald-500' : 'text-indigo-500'} />
                            <input
                                type="text"
                                placeholder="Workout title..."
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] outline-none placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                            />
                            {/* Inline summary pills — read-only at-a-glance */}
                            {!detailsExpanded && (
                                <div className="hidden md:flex items-center gap-1.5 shrink-0">
                                    {!isAssigning && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]">
                                            {date} · {time}
                                        </span>
                                    )}
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">{trainingPhase}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${load === 'Low' ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : load === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400'}`}>{load}</span>
                                    {!isAssigning && targetId && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-[#1A2D48] text-slate-700 dark:text-[#CBD5E1] truncate max-w-[100px]">
                                            {resolveTargetName(targetId, targetType) || 'Target'}
                                        </span>
                                    )}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setDetailsExpanded(v => !v)}
                                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors">
                                {detailsExpanded ? 'Collapse' : 'Details'}
                                <ChevronDownIcon size={10} className={`transition-transform ${detailsExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>

                          {/* Expanded details — only renders when toggled open */}
                          {detailsExpanded && (
                            <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-100 dark:border-[#243A58]">

                            {/* Phase + Load — tighter grid */}
                            <div className={`grid gap-2 ${isAssigning ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                                {!isAssigning && (
                                    <>
                                        <div>
                                            <label className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-0.5 block">Date</label>
                                            <DatePicker value={date} onChange={e => setDate(e.target.value)} className="w-full" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-0.5 block">Time</label>
                                            <TimePicker value={time} onChange={e => setTime(e.target.value)} />
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-0.5 block">Phase</label>
                                    <CustomSelect value={trainingPhase} onChange={e => setTrainingPhase(e.target.value)} variant="form" size="xs">
                                        {TRAINING_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-0.5 block">Load</label>
                                    <div className="flex bg-slate-100 dark:bg-[#0F1C30] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                        {['Low', 'Medium', 'High'].map(l => (
                                            <button key={l} onClick={() => setLoad(l)} className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${load === l ? (l === 'Low' ? 'bg-emerald-500 text-white' : l === 'Medium' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white') : 'text-slate-500 hover:text-slate-700 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1]'}`}>
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-0.5 block">Tonnage</label>
                                    <div className="flex items-center gap-1.5 h-7">
                                        <button type="button" onClick={() => setTrackTonnage(v => !v)}
                                            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors shrink-0 ${trackTonnage ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-[#243A58]'}`}>
                                            <span className={`inline-block h-3 w-3 rounded-full bg-white dark:bg-[#132338] transition-transform ${trackTonnage ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
                                        </button>
                                        <span className="text-[9px] text-slate-500 dark:text-[#CBD5E1] truncate">
                                            {trackTonnage ? 'On' : 'Off'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3">
                                <ShareToOrgToggle value={visibility} onChange={setVisibility} />
                            </div>

                            {/* Row 3: Target Type + Target — only in normal mode */}
                            {!isAssigning && (
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-0.5 block">Target Type</label>
                                        <div className="flex bg-slate-100 dark:bg-[#0F1C30] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                            {['Team', 'Individual'].map(tt => (
                                                <button key={tt} onClick={() => { setTargetType(tt as any); setTargetId(''); }} className={`flex-1 py-1 rounded-md text-[10px] font-semibold transition-all ${targetType === tt ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>
                                                    {tt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wider mb-0.5 block">
                                            {targetType === 'Team' ? 'Select Team' : 'Select Athlete'}
                                        </label>
                                        <CustomSelect value={targetId} onChange={e => setTargetId(e.target.value)} variant="form" size="xs" placeholder="Select...">
                                            <option value="">Select...</option>
                                            {targetType === 'Team'
                                                ? teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                                : allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                            }
                                        </CustomSelect>
                                    </div>
                                </div>
                            )}
                            </div>
                          )}
                        </div>

                        {/* Workout Builder */}
                        <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden flex-1 flex flex-col min-h-[280px]">
                            {/* Section tabs — colored, renameable, with add/remove */}
                            <div className="flex border-b border-slate-100 dark:border-[#243A58] items-stretch">
                                {sectionOrder.map(sec => {
                                    const meta = sectionMeta[sec] || { label: sec, color: '#6366f1' };
                                    const isActive = activeSection === sec;
                                    const count = sections[sec]?.length || 0;
                                    const isEditing = editSectionId === sec;
                                    return (
                                        <div key={sec} className="relative group flex-1 min-w-0">
                                            <button
                                                onClick={() => { if (!isEditing) setActiveSection(sec); }}
                                                className={`w-full py-3 px-2 text-[10px] font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 ${
                                                    isActive
                                                        ? 'text-slate-900 dark:text-[#E2E8F0]'
                                                        : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                                                }`}
                                                style={{
                                                    borderBottom: `2px solid ${isActive ? meta.color : 'transparent'}`,
                                                    backgroundColor: isActive ? `${meta.color}14` : undefined,
                                                }}>
                                                {/* Colored dot indicator */}
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.color }} />
                                                {isEditing ? (
                                                    <input
                                                        autoFocus
                                                        value={meta.label}
                                                        onChange={e => updateSectionMeta(sec, { label: e.target.value })}
                                                        onBlur={() => setEditSectionId(null)}
                                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditSectionId(null); }}
                                                        onClick={e => e.stopPropagation()}
                                                        className="bg-transparent border-b border-indigo-400 text-[10px] font-bold uppercase tracking-wide outline-none w-24 text-center text-slate-900 dark:text-[#E2E8F0]"
                                                    />
                                                ) : (
                                                    <span className="truncate">{meta.label}</span>
                                                )}
                                                {count > 0 && !isEditing && (
                                                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-semibold"
                                                        style={{ backgroundColor: `${meta.color}26`, color: meta.color }}>
                                                        {count}
                                                    </span>
                                                )}
                                            </button>
                                            {/* Edit / remove controls — only show for active tab on hover */}
                                            {isActive && !isEditing && (
                                                <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setEditSectionId(sec); }}
                                                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]"
                                                        title="Rename section">
                                                        <PencilIcon size={9} />
                                                    </button>
                                                    {!isDefaultSection(sec) && (
                                                        <button onClick={(e) => { e.stopPropagation(); removeSection(sec); }}
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
                                {/* Add Section button — opens preset picker */}
                                <button
                                    onClick={() => setAddSectionOpen(true)}
                                    className="shrink-0 px-3 py-3 text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/15 transition-colors flex items-center gap-1"
                                    title="Add section">
                                    <PlusIcon size={11} /> Section
                                </button>
                            </div>

                            {/* Add Section popover */}
                            {addSectionOpen && (
                                <AddSectionPopover
                                    onSelect={(name, color) => addCustomSection(name, color)}
                                    onClose={() => setAddSectionOpen(false)}
                                />
                            )}

                            {/* Volume tracking */}
                            {(Object.keys(packetVolume.byBodyPart).length > 0 || Object.keys(packetVolume.byRegion).length > 0) && (
                                <div className="px-4 pt-3 space-y-2">
                                    {Object.keys(packetVolume.byBodyPart).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide mr-1">Body Part</span>
                                            {Object.entries(packetVolume.byBodyPart).sort((a, b) => b[1] - a[1]).map(([part, sets]) => {
                                                // Case-insensitive lookup so user-created sections like "core" (lowercase) still get the
                                                // canonical color. Fallback uses dark-mode-aware slate tokens so unmapped pills don't
                                                // light up bright white on the dark canvas.
                                                const titleCased = part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '';
                                                const color = BODY_PART_COLORS[part] ?? BODY_PART_COLORS[titleCased] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
                                                return (
                                                    <span key={part} className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${color}`}>
                                                        {part} {sets}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {Object.keys(packetVolume.byRegion).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide mr-1">Region</span>
                                            {Object.entries(packetVolume.byRegion).sort((a, b) => b[1] - a[1]).map(([region, sets]) => {
                                                const titleCasedRegion = region ? region.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';
                                                const color = VOLUME_COLORS[region] ?? VOLUME_COLORS[titleCasedRegion] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300';
                                                return (
                                                    <span key={region} className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase ${color}`}>
                                                        {region} {sets}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Exercise rows — drop zone for drag-from-picker.
                                Auto-scrolls when the cursor is near the top/bottom edge so the user can
                                always reach the position they want to drop to inside a tall list. */}
                            <div
                                className={`p-4 space-y-3 flex-1 min-h-[200px] overflow-y-auto custom-scrollbar transition-colors ${dropOverSection === activeSection ? 'bg-indigo-50/40 dark:bg-indigo-900/15 ring-2 ring-inset ring-indigo-300 dark:ring-indigo-700' : ''}`}
                                onDragOver={(e) => {
                                    if (!e.dataTransfer.types.includes('text/plain')) return;
                                    e.preventDefault();
                                    // Respect the drag source's effectAllowed — a row drag uses 'move' and the picker uses 'copy'.
                                    // Setting an incompatible dropEffect (e.g. 'copy' for a 'move' source) makes the browser
                                    // silently reject the drop and show the "not allowed" cursor, which is what was breaking
                                    // row-to-row reordering after we added the parent auto-scroll handler.
                                    const eff = e.dataTransfer.effectAllowed;
                                    e.dataTransfer.dropEffect = (eff === 'move' || eff === 'all' || eff === 'copyMove' || eff === 'linkMove') ? 'move' : 'copy';
                                    if (dropOverSection !== activeSection) setDropOverSection(activeSection);
                                    // Auto-scroll edges — kicks in when the cursor is within 60px of either edge
                                    const el = e.currentTarget as HTMLElement;
                                    const rect = el.getBoundingClientRect();
                                    const edge = 60;
                                    const speed = 14;
                                    if (e.clientY - rect.top < edge && el.scrollTop > 0) {
                                        el.scrollTop = Math.max(0, el.scrollTop - speed);
                                    } else if (rect.bottom - e.clientY < edge && el.scrollTop + el.clientHeight < el.scrollHeight) {
                                        el.scrollTop = Math.min(el.scrollHeight, el.scrollTop + speed);
                                    }
                                }}
                                onDragLeave={(e) => {
                                    // Only clear when leaving the drop zone, not when crossing inner elements
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setDropOverSection(null);
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDropOverSection(null);
                                    const data = e.dataTransfer.getData('text/plain') || '';
                                    if (data.startsWith('picker:')) {
                                        const exId = data.slice('picker:'.length);
                                        const ex = displayExercises.find((x: any) => x.id === exId);
                                        if (ex && !(sections[activeSection] || []).some(r => r.exerciseId === ex.id)) {
                                            addExercise(ex);
                                        }
                                    } else if (data.startsWith('row:')) {
                                        // Reorder support (within section): we just move it to the end for now
                                        const [, fromSec, rowTempId] = data.split(':');
                                        if (fromSec === activeSection) return; // can refine later
                                        // Cross-section move: remove from source, add to target end
                                        setSections(prev => {
                                            const fromArr = prev[fromSec] || [];
                                            const found = fromArr.find(r => r.tempId === rowTempId);
                                            if (!found) return prev;
                                            return {
                                                ...prev,
                                                [fromSec]: fromArr.filter(r => r.tempId !== rowTempId),
                                                [activeSection]: [...(prev[activeSection] || []), found],
                                            };
                                        });
                                    }
                                }}
                            >
                                {(sections[activeSection] || []).length === 0 ? (
                                    <div className="py-12 flex flex-col items-center text-slate-300 gap-2">
                                        <DumbbellIcon size={28} className="opacity-30" />
                                        <p className="text-[10px] text-slate-400">No exercises in {sectionMeta[activeSection]?.label || activeSection}</p>
                                        <p className="text-[9px] text-slate-300">Drag from the right panel or click to add</p>
                                    </div>
                                ) : (
                                    (sections[activeSection] || []).map((row, idx) => {
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
                                        const isDropBefore = rowDropTarget?.tempId === row.tempId && rowDropTarget?.pos === 'before';
                                        const isDropAfter = rowDropTarget?.tempId === row.tempId && rowDropTarget?.pos === 'after';
                                        return (
                                            <div
                                                key={row.tempId}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', `row:${activeSection}:${row.tempId}`);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                }}
                                                onDragEnd={() => setRowDropTarget(null)}
                                                onDragOver={(e) => {
                                                    if (!e.dataTransfer.types.includes('text/plain')) return;
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'move';
                                                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                    const pos: 'before' | 'after' = (e.clientY - rect.top) < rect.height / 2 ? 'before' : 'after';
                                                    if (rowDropTarget?.tempId !== row.tempId || rowDropTarget?.pos !== pos) {
                                                        setRowDropTarget({ tempId: row.tempId, pos });
                                                    }
                                                    // Let the parent drop zone also receive the dragover so it can auto-scroll the list.
                                                }}
                                                onDragLeave={(e) => {
                                                    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                                                        if (rowDropTarget?.tempId === row.tempId) setRowDropTarget(null);
                                                    }
                                                }}
                                                onDrop={(e) => {
                                                    const data = e.dataTransfer.getData('text/plain') || '';
                                                    const target = rowDropTarget?.tempId === row.tempId ? rowDropTarget : { tempId: row.tempId, pos: 'after' as const };
                                                    const baseIdx = (sections[activeSection] || []).findIndex(r => r.tempId === row.tempId);
                                                    if (baseIdx < 0) { setRowDropTarget(null); return; }
                                                    const insertIdx = target.pos === 'before' ? baseIdx : baseIdx + 1;
                                                    // Picker drop on a specific row — insert at the indicated position instead of appending at the end.
                                                    if (data.startsWith('picker:')) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        const exId = data.slice('picker:'.length);
                                                        const ex = displayExercises.find((x: any) => x.id === exId);
                                                        if (ex && !(sections[activeSection] || []).some(r => r.exerciseId === ex.id)) {
                                                            setSections(prev => {
                                                                const arr = [...(prev[activeSection] || [])];
                                                                arr.splice(Math.max(0, Math.min(arr.length, insertIdx)), 0, emptyRow(ex));
                                                                return { ...prev, [activeSection]: arr };
                                                            });
                                                        }
                                                        setRowDropTarget(null);
                                                        setDropOverSection(null);
                                                        return;
                                                    }
                                                    if (!data.startsWith('row:')) return;
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const [, fromSec, rowTempId] = data.split(':');
                                                    if (!fromSec || !rowTempId || rowTempId === row.tempId) {
                                                        setRowDropTarget(null);
                                                        return;
                                                    }
                                                    moveRow(fromSec, rowTempId, activeSection, insertIdx);
                                                    setRowDropTarget(null);
                                                    setDropOverSection(null);
                                                }}
                                                className={`relative bg-slate-50/50 dark:bg-[#1A2D48]/60 border border-slate-100 dark:border-[#243A58] rounded-xl p-2.5 hover:border-slate-200 dark:hover:border-[#364E6E] transition-all ${isDropBefore ? 'before:absolute before:-top-0.5 before:left-2 before:right-2 before:h-1 before:rounded-full before:bg-indigo-500' : ''} ${isDropAfter ? 'after:absolute after:-bottom-0.5 after:left-2 after:right-2 after:h-1 after:rounded-full after:bg-indigo-500' : ''}`}
                                            >
                                                {/* Header row: drag handle + number + name + (1RM badge) + collapse + display options + delete */}
                                                <div className={`flex items-center justify-between gap-2 ${collapsedRows.has(row.tempId) ? 'mb-0' : 'mb-2'}`}>
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <GripVerticalIcon size={12} className="text-slate-300 dark:text-[#475569] cursor-grab shrink-0" />
                                                        <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{idx + 1}</span>
                                                        <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{row.exerciseName}</span>
                                                        {weightroomSheetConfig?.columns?.some(c => c.exerciseId && (row.exerciseName === c.exerciseId || row.exerciseName.toLowerCase().includes(c.exerciseId.toLowerCase()))) && (
                                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-[8px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wide shrink-0">
                                                                <LinkIcon size={8} /> 1RM
                                                            </span>
                                                        )}
                                                        {/* Collapsed-only summary so the user sees the prescription at a glance */}
                                                        {collapsedRows.has(row.tempId) && (
                                                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] truncate">
                                                                {[row.sets && `${row.sets}×${row.reps || '—'}`, row.rest, (intensities[0]?.value && `${intensities[0].value}${intensities[0].unit ? ' ' + intensities[0].unit : ''}`)].filter(Boolean).join(' · ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                        <button
                                                            onClick={() => toggleRowCollapsed(row.tempId)}
                                                            className="p-1 text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-md transition-all"
                                                            title={collapsedRows.has(row.tempId) ? 'Expand' : 'Collapse'}>
                                                            <ChevronDownIcon size={12} className={`transition-transform ${collapsedRows.has(row.tempId) ? '-rotate-90' : ''}`} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDisplayOptionsRow({ section: activeSection, tempId: row.tempId })}
                                                            className="p-1 text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-md transition-all"
                                                            title="Display options">
                                                            <Settings2Icon size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => removeRow(activeSection, row.tempId)}
                                                            className="p-1 text-slate-400 dark:text-[#CBD5E1] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-md transition-all"
                                                            title="Remove exercise">
                                                            <Trash2Icon size={12} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Sets / Reps / Rest / Tempo — prefix-label dropdowns, single line */}
                                                {!collapsedRows.has(row.tempId) && (showSets || showReps || showRest || showTempo) && (
                                                    <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                                                        {showSets && (
                                                            <PresetSelect prefixLabel="Sets" size="xs" value={row.sets} onChange={v => updateRow(activeSection, row.tempId, 'sets', v)} presets={SETS_PRESETS} placeholder="—" />
                                                        )}
                                                        {showReps && (
                                                            <PresetSelect prefixLabel="Reps" size="xs" value={row.reps} onChange={v => updateRow(activeSection, row.tempId, 'reps', v)} presets={REPS_PRESETS} placeholder="—" />
                                                        )}
                                                        {showRest && (
                                                            <PresetSelect prefixLabel="Rest" size="xs" value={row.rest} onChange={v => updateRow(activeSection, row.tempId, 'rest', v)} presets={REST_PRESETS} placeholder="—" />
                                                        )}
                                                        {showTempo && (
                                                            <PresetSelect prefixLabel="Tempo" size="xs" value={row.tempo} onChange={v => updateRow(activeSection, row.tempId, 'tempo', v)} presets={TEMPO_PRESETS} placeholder="—" />
                                                        )}
                                                    </div>
                                                )}

                                                {/* Intensity pills row */}
                                                {!collapsedRows.has(row.tempId) && visibleIntensityCount > 0 && (
                                                    <div className="flex items-center gap-1.5 mb-1.5">
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
                                                                            updateRow(activeSection, row.tempId, 'intensities', next as any);
                                                                        }}
                                                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 transition-colors text-[10px] font-semibold">
                                                                        <PlusIcon size={10} /> Intensity {i + 1}
                                                                    </button>
                                                                );
                                                            }
                                                            return (
                                                                <div key={i} className="flex-1 min-w-0">
                                                                    <IntensityPillEditor
                                                                        pill={pill}
                                                                        onChange={next => {
                                                                            const arr = [...intensities];
                                                                            arr[i] = next;
                                                                            updateRow(activeSection, row.tempId, 'intensities', arr as any);
                                                                        }}
                                                                        onRemove={() => {
                                                                            const arr = intensities.filter((_, x) => x !== i);
                                                                            updateRow(activeSection, row.tempId, 'intensities', arr as any);
                                                                        }}
                                                                        canRemove={intensities.length > 1}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Notes — compact single input, no separate label */}
                                                {!collapsedRows.has(row.tempId) && showNotes && (
                                                    <input
                                                        type="text"
                                                        value={row.notes}
                                                        onChange={e => updateRow(activeSection, row.tempId, 'notes', e.target.value)}
                                                        placeholder="Notes — scaling, coaching cues, partner pairing…"
                                                        className="w-full bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400 placeholder:text-slate-300 dark:placeholder:text-[#475569]"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Linked Sessions (collapsible) ────────────────── */}
                    <div className="border-t border-slate-100 dark:border-[#243A58] shrink-0">
                        <button
                            type="button"
                            onClick={() => setLinkedSessionsExpanded(v => !v)}
                            className="w-full flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50 dark:hover:bg-[#1A2D48]/40 transition-colors text-left"
                        >
                            <ActivityIcon size={12} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-[#E2E8F0]">Linked Sessions</span>
                            {linkedSessions.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{linkedSessions.length}</span>
                            )}
                            <span className="ml-auto text-[9px] text-slate-400 dark:text-[#CBD5E1]">
                                {linkedSessionsExpanded ? 'Hide' : 'Show'}
                            </span>
                            <ChevronDownIcon size={12} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${linkedSessionsExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        {linkedSessionsExpanded && (
                            <div className="px-5 pb-4 pt-1">
                                <LinkedSessionsPicker
                                    linked={linkedSessions}
                                    onChange={setLinkedSessions}
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
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Exercise Picker + Session Summary ───────────── */}
                <div className="w-96 shrink-0 bg-white dark:bg-[#132338] border-l border-slate-200 dark:border-[#243A58] flex flex-col overflow-hidden">

                    {/* Session Summary — shown when exercises added */}
                    {totalExercises > 0 && (
                        <div className="border-b border-slate-200 dark:border-[#243A58] shrink-0 bg-slate-50 dark:bg-[#1A2D48]">
                            <button
                                type="button"
                                onClick={() => setIsSessionSummaryCollapsed(v => !v)}
                                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 hover:bg-slate-100 dark:hover:bg-[#243A58]/60 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <ActivityIcon size={11} className="text-indigo-500" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">Session Summary</span>
                                    <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">· {totalExercises} ex · {sessionSummary.totalSets} sets</span>
                                </div>
                                <ChevronDownIcon size={12} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform duration-200 ${isSessionSummaryCollapsed ? '-rotate-90' : ''}`} />
                            </button>
                            {!isSessionSummaryCollapsed && (
                            <div className="px-3.5 pb-3.5 space-y-3">
                            {/* Stat row */}
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { label: 'Exercises', value: totalExercises },
                                    { label: 'Total Sets', value: sessionSummary.totalSets },
                                    { label: 'Est. Tonnage', value: sessionSummary.estTonnage > 0 ? `${Math.round(sessionSummary.estTonnage).toLocaleString()} kg` : '—' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white dark:bg-[#132338] rounded-lg p-2 text-center border border-slate-200 dark:border-[#243A58]">
                                        <div className="text-xs font-bold text-slate-900 dark:text-[#E2E8F0] leading-tight">{s.value}</div>
                                        <div className="text-[7px] text-slate-400 dark:text-[#CBD5E1] mt-0.5 leading-tight">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                            {/* RPE + Load badge */}
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-500 dark:text-[#CBD5E1]">
                                    Avg RPE: <span className="font-semibold text-slate-700 dark:text-[#CBD5E1]">{sessionSummary.avgRpe > 0 ? sessionSummary.avgRpe.toFixed(1) : '—'}</span>
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-semibold ${load === 'Low' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : load === 'High' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                                    {load} Load
                                </span>
                            </div>
                            {/* Muscle breakdown */}
                            {Object.keys(packetVolume.byBodyPart).length > 0 && (
                                <div className="space-y-1.5">
                                    <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1]">Muscle Focus</span>
                                    {(() => {
                                        const total = Object.values(packetVolume.byBodyPart).reduce((s, v) => s + v, 0);
                                        return Object.entries(packetVolume.byBodyPart)
                                            .sort((a, b) => b[1] - a[1])
                                            .slice(0, 4)
                                            .map(([part, sets]) => {
                                                const pct = Math.round((sets / total) * 100);
                                                return (
                                                    <div key={part} className="flex items-center gap-2">
                                                        <span className="text-[9px] text-slate-500 dark:text-[#CBD5E1] w-16 truncate shrink-0">{part}</span>
                                                        <div className="flex-1 h-1.5 bg-slate-200 dark:bg-[#243A58] rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-[8px] text-slate-400 dark:text-[#CBD5E1] w-7 text-right shrink-0">{pct}%</span>
                                                    </div>
                                                );
                                            });
                                    })()}
                                </div>
                            )}
                            {/* This week context */}
                            {targetId && (
                                <div className="bg-white dark:bg-[#132338] rounded-lg p-2.5 border border-slate-200 dark:border-[#243A58]">
                                    <div className="text-[8px] text-slate-400 dark:text-[#CBD5E1] uppercase font-semibold tracking-wide mb-1.5">This Week</div>
                                    {thisWeekSessions.length === 0 ? (
                                        <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">No sessions this week</p>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-800 dark:text-[#E2E8F0]">{thisWeekSessions.length} scheduled</span>
                                            <span className="text-[9px] text-slate-500 dark:text-[#CBD5E1]">auto-tracked</span>
                                        </div>
                                    )}
                                    {thisWeekSessions.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {thisWeekSessions.slice(0, 3).map(s => (
                                                <span key={s.id} className="text-[8px] px-1.5 py-0.5 rounded font-medium bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                                                    {new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' })} · {s.load || 'Med'}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            </div>
                            )}
                        </div>
                    )}

                    <div className="px-4 py-3 border-b border-slate-200 dark:border-[#243A58] space-y-2.5 shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0]">Choose Exercise</h3>
                            <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{pickerSource === 'mine' ? displayExercises.length : (exData?.total ?? 0)} total</span>
                        </div>
                        {/* All / Mine toggle */}
                        <div className="flex bg-slate-100 dark:bg-[#0F1C30] rounded-lg p-0.5">
                            <button type="button" onClick={() => { setPickerSource('all'); setPickerCollectionId(null); }} className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all ${pickerSource === 'all' ? 'bg-white dark:bg-[#1A2D48] text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>All</button>
                            <button type="button" onClick={() => setPickerSource('mine')} className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all flex items-center justify-center gap-1 ${pickerSource === 'mine' ? 'bg-white dark:bg-[#1A2D48] text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>
                                Mine
                            </button>
                        </div>
                        {/* Collection sub-filter — only visible inside Mine, narrows to a saved collection */}
                        {pickerSource === 'mine' && collections.length > 0 && (
                            <CustomSelect
                                value={pickerCollectionId ?? ''}
                                onChange={e => setPickerCollectionId(e.target.value || null)}
                                variant="form" size="xs" prefixLabel="Collection"
                            >
                                <option value="">All in My Library</option>
                                {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </CustomSelect>
                        )}
                        <div className="relative">
                            <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#CBD5E1]" />
                            <input
                                type="text"
                                value={exSearch}
                                onChange={e => setExSearch(e.target.value)}
                                placeholder="Search exercises..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-700 dark:text-[#CBD5E1] rounded-xl text-xs font-medium outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400 dark:placeholder:text-[#475569]"
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
                        <CustomSelect value={exCategory} onChange={e => setExCategory(e.target.value)} variant="form" size="xs">
                            {EXERCISE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </CustomSelect>
                        <div>
                            <button
                                onClick={() => setAlphabetExpanded(v => !v)}
                                className="w-full flex items-center justify-between mb-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                            >
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] flex items-center gap-1">
                                    Browse A-Z {exLetter && <span className="text-indigo-500 dark:text-indigo-300">· {exLetter}</span>}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    {exLetter && (
                                        <span
                                            onClick={(e) => { e.stopPropagation(); setExLetter(''); }}
                                            className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 uppercase tracking-wide cursor-pointer"
                                        >Clear</span>
                                    )}
                                    <ChevronDownIcon size={12} className={`text-slate-500 dark:text-[#CBD5E1] transition-transform ${alphabetExpanded ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {alphabetExpanded && (
                                <div className="flex flex-wrap gap-1 animate-in fade-in duration-150 pt-1">
                                    <button
                                        onClick={() => { setExLetter(''); setExSearch(''); }}
                                        className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${!exLetter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 hover:text-indigo-700 dark:text-[#CBD5E1]'}`}
                                    >&#10005;</button>
                                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                                        <button
                                            key={l}
                                            onClick={() => { if (exLetter === l) setExLetter(''); else { setExLetter(l); setExSearch(''); } }}
                                            className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${exLetter === l ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 hover:text-indigo-700 dark:text-[#CBD5E1]'}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {(() => {
                            const meta = sectionMeta[activeSection];
                            const defaults: Record<string, string> = { warmup: '#f59e0b', workout: '#6366f1', cooldown: '#0ea5e9' };
                            const color = meta?.color || defaults[activeSection] || '#6366f1';
                            const label = meta?.label || SECTION_LABELS[activeSection] || activeSection;
                            return (
                                <div
                                    className="rounded-xl px-3 py-2 border flex items-center gap-2"
                                    style={{ backgroundColor: `${color}26`, borderColor: `${color}80` }}
                                >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <div className="flex-1 min-w-0 leading-tight">
                                        <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color }}>Adding to: </span>
                                        <strong className="text-[10px] font-bold uppercase tracking-wide text-slate-900 dark:text-white">{label}</strong>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                        {exLoading ? (
                            <div className="py-12 flex items-center justify-center text-slate-400 dark:text-[#CBD5E1] text-xs">Loading...</div>
                        ) : displayExercises.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-[#CBD5E1] text-xs gap-1">
                                {pickerSource === 'mine' ? <><span>No exercises in your library</span><span className="text-[9px]">Star exercises from the Exercise Library page</span></> : 'No exercises found'}
                            </div>
                        ) : (
                            displayExercises.map(ex => {
                                const already = sections[activeSection].some(r => r.exerciseId === ex.id);
                                const thumb = (ex.images || []).filter(Boolean)[0];
                                return (
                                    <div
                                        key={ex.id}
                                        role="button"
                                        tabIndex={already ? -1 : 0}
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
                                        className={`group w-full px-2.5 py-2 rounded-xl border transition-all flex items-center gap-2.5 ${already ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 cursor-default' : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 cursor-grab active:cursor-grabbing'} ${draggedExId === ex.id ? 'opacity-50' : ''}`}
                                    >
                                        {/* Thumbnail — only renders if exercise has an image */}
                                        {thumb && (
                                            <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] shrink-0 pointer-events-none">
                                                <img src={thumb} alt={ex.name} className="w-full h-full object-cover" loading="lazy" draggable={false} />
                                            </div>
                                        )}
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 pointer-events-none ${already ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-[#243A58] text-slate-500 dark:text-[#CBD5E1]'}`}>
                                            {already ? <span className="text-[8px]">&#10003;</span> : <PlusIcon size={10} />}
                                        </div>
                                        <div className="flex-1 min-w-0 pointer-events-none">
                                            <div className="text-[11px] font-semibold text-slate-700 dark:text-[#E2E8F0] leading-tight truncate">{ex.name}</div>
                                            {ex.categories?.[0] && (
                                                <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5 truncate">{ex.categories[0]}</div>
                                            )}
                                        </div>
                                        {/* Info (i) button — opens exercise info modal */}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setInfoExercise(ex); }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            draggable={false}
                                            className="shrink-0 p-1.5 rounded-md text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                            title="Exercise details">
                                            <InfoIcon size={13} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {(exData?.totalPages || 0) > 1 && (
                        <div className="border-t border-slate-200 dark:border-[#243A58] flex items-center justify-center gap-2 py-1.5 shrink-0">
                            <button onClick={() => setExPage(p => Math.max(1, p - 1))} disabled={exPage <= 1}
                                className="p-1 rounded bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                                <ChevronLeftIcon size={12} />
                            </button>
                            <span className="text-[11px] font-medium text-slate-500 dark:text-[#CBD5E1]">
                                Page <span className="text-indigo-600 dark:text-indigo-300 font-semibold">{exPage}</span> of {exData?.totalPages}
                            </span>
                            <button onClick={() => setExPage(p => Math.min(exData?.totalPages || 1, p + 1))} disabled={exPage >= (exData?.totalPages || 1)}
                                className="p-1 rounded bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                                <ChevronRightIcon size={12} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Exercise info modal — opens when "i" button is clicked on a right-panel exercise card */}
            <ExerciseInfoModal
                exercise={infoExercise}
                isOpen={!!infoExercise}
                onClose={() => setInfoExercise(null)}
            />
            {/* Share popover — wired to the Share button in the top bar */}
            {shareTarget && (
                <ShareWorkoutPopover
                    workoutType={shareTarget.type}
                    workoutId={shareTarget.id}
                    workoutName={shareTarget.name}
                    onClose={() => setShareTarget(null)}
                />
            )}
            {/* Per-exercise Display Options modal */}
            {displayOptionsRow && (() => {
                const row = sections[displayOptionsRow.section]?.find(r => r.tempId === displayOptionsRow.tempId);
                if (!row) return null;
                return (
                    <DisplayOptionsModal
                        row={row}
                        onSave={(fields) => updateRow(displayOptionsRow.section, displayOptionsRow.tempId, 'displayFields', fields as any)}
                        onClose={() => setDisplayOptionsRow(null)}
                    />
                );
            })()}
        </div>
    );
};

export default WorkoutPacketsPage;
