// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { useSmartSearch } from '../hooks/useSmartSearch';
import { useExerciseMap } from '../hooks/useExerciseMap';
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
} from 'lucide-react';
import WeightroomSheetPanel from '../components/workout/WeightroomSheetPanel';
import { LinkedSessionsPicker, LinkedSession } from '../components/conditioning/LinkedSessionsPicker';
import { buildMaxLookup, computeAthleteWeightOverrides } from '../utils/weightroomUtils';

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

const tempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ── Types ────────────────────────────────────────────────────────────────────

interface ExRow {
    tempId: string;
    exerciseId: string;
    exerciseName: string;
    exerciseBodyParts: string[];
    exerciseCategories: string[];
    sets: string;
    reps: string;
    rest: string;
    rpe: string;
    notes: string;
    weight: string;
}

const emptyRow = (ex: { id: string; name: string; body_parts?: string[]; categories?: string[] }): ExRow => ({
    tempId: tempId(),
    exerciseId: ex.id,
    exerciseName: ex.name,
    exerciseBodyParts: ex.body_parts ?? [],
    exerciseCategories: ex.categories ?? [],
    sets: '3',
    reps: '10',
    rest: '60',
    rpe: '7',
    notes: '',
    weight: '',
});

// ── Page Component ───────────────────────────────────────────────────────────

export const WorkoutPacketsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        teams, resolveTargetName,
        scheduleWorkoutSession, showToast,
        workoutTemplates, setWorkoutTemplates,
        handleUpdatePlanSession, periodizationPlans,
        maxHistory,
        wattbikeSessions, conditioningSessions,
        personalExerciseIds,
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
    const returnTo = assignCtx ? '/periodization' : (routerState?.returnTo || '/workouts');

    // ── Session info state ─────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [targetType, setTargetType] = useState<'Team' | 'Individual'>('Team');
    const [targetId, setTargetId] = useState('');
    const [trainingPhase, setTrainingPhase] = useState('Strength');
    const [load, setLoad] = useState('Medium');
    const [trackTonnage, setTrackTonnage] = useState(true);

    // ── Workout builder state ──────────────────────────────────────────────
    const [sections, setSections] = useState<Record<string, ExRow[]>>({ warmup: [], workout: [], cooldown: [] });
    const [activeSection, setActiveSection] = useState<string>('workout');
    const [linkedSessions, setLinkedSessions] = useState<LinkedSession[]>([]);

    // ── Exercise picker state ──────────────────────────────────────────────
    const [exSearch, setExSearch] = useState('');
    const [exCategory, setExCategory] = useState('All');
    const [exLetter, setExLetter] = useState('');
    const [exPage, setExPage] = useState(1);

    const [scheduling, setScheduling] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [showWeightroomSheet, setShowWeightroomSheet] = useState(false);
    const [weightroomSheetConfig, setWeightroomSheetConfig] = useState(null);
    const { resolveExerciseName, exerciseFullMap } = useExerciseMap();
    const isAssigning = !!assignCtx;

    // Normalize an exercise row from any source format into ExRow shape
    const normalizeRow = (r: any): ExRow => {
        const exId = r.exerciseId || r.exercise_id || r.id || '';
        const exInfo = exerciseFullMap[exId];
        return {
            tempId: tempId(),
            exerciseId: exId,
            exerciseName: r.exerciseName || r.exercise_name || r.name || resolveExerciseName(exId),
            exerciseBodyParts: r.exerciseBodyParts || exInfo?.body_parts || [],
            exerciseCategories: r.exerciseCategories || exInfo?.categories || [],
            sets: String(r.sets || 3),
            reps: String(r.reps || 10),
            rest: String(r.rest || 60),
            rpe: String(r.rpe || 7),
            notes: r.notes || '',
            weight: String(r.weight || ''),
        };
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
            setSections({
                warmup: (sectionData.warmup || []).map(normalizeRow),
                workout: (sectionData.workout || []).map(normalizeRow),
                cooldown: (sectionData.cooldown || []).map(normalizeRow),
            });
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
        if (!title.trim()) { showToast('Enter a workout title', 'error'); return; }

        // 1. Save as template so we have a referenceable ID
        const payload = buildTemplatePayload();
        let templateId: string;

        try {
            const created = await DatabaseService.createWorkoutTemplate({
                name: payload.name,
                training_phase: payload.trainingPhase,
                load: payload.load,
                sections: payload.sections,
            });
            templateId = created.id;
            setWorkoutTemplates(prev => [{ id: templateId, ...payload, createdAt: created.created_at }, ...prev]);
        } catch {
            templateId = `tpl_${Date.now()}`;
            setWorkoutTemplates(prev => [{ id: templateId, ...payload, createdAt: new Date().toISOString() }, ...prev]);
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
            showToast('Workout assigned to plan', 'success');
            navigate(returnTo);
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
    const personalSet = useMemo(() => new Set(personalExerciseIds || []), [personalExerciseIds]);
    const displayExercises = pickerSource === 'mine'
        ? (exData?.exercises || []).filter(ex => personalSet.has(ex.id))
        : (exData?.exercises || []);

    useEffect(() => { setExPage(1); }, [exSearch, exCategory, exLetter]);

    // ── Derived ────────────────────────────────────────────────────────────
    const allPlayers = useMemo(() => teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)), [teams]);
    const totalExercises = SECTIONS.reduce((sum, s) => sum + sections[s].length, 0);
    const isEditing = !!editingTemplateId;

    const packetVolume = useMemo(() => {
        const byRegion: Record<string, number> = {};
        const byBodyPart: Record<string, number> = {};
        const allRows = [...sections.warmup, ...sections.workout, ...sections.cooldown];
        for (const row of allRows) {
            const sets = parseInt(row.sets) || 0;
            if (sets <= 0) continue;
            const region = row.exerciseCategories?.[0];
            if (region) byRegion[region] = (byRegion[region] ?? 0) + sets;
            const part = row.exerciseBodyParts?.[0];
            if (part) byBodyPart[part] = (byBodyPart[part] ?? 0) + sets;
        }
        return { byRegion, byBodyPart };
    }, [sections]);

    // ── Exercise row handlers ──────────────────────────────────────────────
    const addExercise = (ex: { id: string; name: string; body_parts?: string[]; categories?: string[] }) => {
        setSections(prev => ({
            ...prev,
            [activeSection]: [...prev[activeSection], emptyRow(ex)]
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

    // ── Build template payload ──────────────────────────────────────────────
    const buildTemplatePayload = () => ({
        name: title.trim(),
        trainingPhase,
        load,
        sections: {
            warmup: sections.warmup.map(r => ({ exerciseId: r.exerciseId, exerciseName: r.exerciseName, sets: r.sets, reps: r.reps, rest: r.rest, rpe: r.rpe, notes: r.notes, weight: r.weight })),
            workout: sections.workout.map(r => ({ exerciseId: r.exerciseId, exerciseName: r.exerciseName, sets: r.sets, reps: r.reps, rest: r.rest, rpe: r.rpe, notes: r.notes, weight: r.weight })),
            cooldown: sections.cooldown.map(r => ({ exerciseId: r.exerciseId, exerciseName: r.exerciseName, sets: r.sets, reps: r.reps, rest: r.rest, rpe: r.rpe, notes: r.notes, weight: r.weight })),
            ...(weightroomSheetConfig ? { weightroomSheet: weightroomSheetConfig } : {}),
        },
        linkedSessions,
        createdAt: new Date().toISOString(),
    });

    // ── Schedule workout ─────────────────────────────────────────────────
    const handleSchedule = async () => {
        if (!title.trim()) { showToast('Please enter a workout title', 'error'); return; }
        if (!targetId) { showToast('Please select a target athlete or team', 'error'); return; }

        const stripTemp = (r) => ({ exerciseId: r.exerciseId, exerciseName: r.exerciseName, sets: r.sets, reps: r.reps, rest: r.rest, rpe: r.rpe, notes: r.notes, weight: r.weight });

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
            exercises: {
                warmup: sections.warmup.map(attachOverrides),
                workout: sections.workout.map(attachOverrides),
                cooldown: sections.cooldown.map(attachOverrides),
                ...(weightroomSheetConfig ? { weightroomSheet: weightroomSheetConfig } : {}),
            },
        };

        try {
            setScheduling(true);
            // Auto-save as template if not already editing one
            if (!editingTemplateId) {
                const tplPayload = buildTemplatePayload();
                try {
                    const created = await DatabaseService.createWorkoutTemplate({
                        name: tplPayload.name,
                        training_phase: tplPayload.trainingPhase,
                        load: tplPayload.load,
                        sections: tplPayload.sections,
                    });
                    setWorkoutTemplates(prev => [{ id: created.id, ...tplPayload, createdAt: created.created_at }, ...prev]);
                } catch {
                    // Fallback: save locally
                    const localId = `tpl_${Date.now()}`;
                    setWorkoutTemplates(prev => [{ id: localId, ...tplPayload, createdAt: new Date().toISOString() }, ...prev]);
                }
            }
            await scheduleWorkoutSession(payload);
            navigate(returnTo);
        } catch (err) {
            // toast already shown
        } finally {
            setScheduling(false);
        }
    };

    // ── Update existing template ─────────────────────────────────────────
    const handleUpdateTemplate = async () => {
        if (!title.trim()) { showToast('Enter a title', 'error'); return; }
        const payload = buildTemplatePayload();
        try {
            await DatabaseService.updateWorkoutTemplate(editingTemplateId, {
                name: payload.name,
                training_phase: payload.trainingPhase,
                load: payload.load,
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
        if (!title.trim()) { showToast('Enter a title to save as template', 'error'); return; }
        const payload = buildTemplatePayload();
        try {
            const created = await DatabaseService.createWorkoutTemplate({
                name: payload.name,
                training_phase: payload.trainingPhase,
                load: payload.load,
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
        for (const sec of SECTIONS) {
            if (sections[sec].length > 0) {
                body += `<div class="section"><h2>${SECTION_LABELS[sec]}</h2>${buildTable(sections[sec])}</div>`;
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
    return (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-50">
            <div className="flex-1 flex overflow-hidden">

                {/* ── LEFT: Main Panel ───────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(returnTo)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all" title="Back">
                                <ArrowLeftIcon size={18} />
                            </button>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAssigning ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                                <PackageIcon size={14} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">
                                    {isAssigning ? 'Assign Workout to Plan' : isEditing ? 'Edit Workout Packet' : 'New Workout Packet'}
                                </h2>
                                <p className="text-[10px] text-slate-400">
                                    {isAssigning ? 'Build a workout and assign it to your periodization plan session' : 'Build, schedule & print one-off workouts'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAssigning ? (
                                <>
                                    <button onClick={handleSaveAsNew} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-semibold text-emerald-700 transition-all" title="Save as template without assigning">
                                        <SaveIcon size={12} /> Save Template Only
                                    </button>
                                    <button onClick={handleAssignToPlan} disabled={assigning || !title.trim() || totalExercises === 0}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                        <CalendarPlusIcon size={12} /> {assigning ? 'Assigning...' : 'Assign & Return'}
                                    </button>
                                </>
                            ) : isEditing ? (
                                <>
                                    <button onClick={handleUpdateTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-semibold text-emerald-700 transition-all">
                                        <RefreshCwIcon size={12} /> Update Template
                                    </button>
                                    <button onClick={handleSaveAsNew} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-semibold text-emerald-700 transition-all">
                                        <CopyIcon size={12} /> Save as New
                                    </button>
                                </>
                            ) : (
                                <button onClick={handleSaveAsNew} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-semibold text-emerald-700 transition-all" title="Save as template">
                                    <SaveIcon size={12} /> Save Template
                                </button>
                            )}
                            {!isAssigning && (
                                <>
                                    <button
                                        onClick={() => setShowWeightroomSheet(true)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all ${
                                            weightroomSheetConfig
                                                ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                                : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200'
                                        }`}
                                    >
                                        <ClipboardListIcon size={12} /> {weightroomSheetConfig ? 'Edit Sheet' : 'Attach Sheet'}
                                    </button>
                                    <button onClick={handlePrint} disabled={totalExercises === 0} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold transition-all shadow-sm ${totalExercises === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800 text-white'}`}>
                                        <PrinterIcon size={12} /> Print
                                    </button>
                                    <button onClick={handleSchedule} disabled={scheduling || !title.trim() || !targetId} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-semibold transition-all shadow-sm ${(scheduling || !title.trim() || !targetId) ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                                        <CalendarPlusIcon size={12} /> {scheduling ? 'Scheduling...' : 'Schedule Workout'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Assignment context banner */}
                    {isAssigning && (() => {
                        const plan = periodizationPlans.find(p => p.id === assignCtx.planId);
                        const phase = plan?.phases.find(ph => ph.id === assignCtx.phaseId);
                        const block = phase?.blocks.find(b => b.id === assignCtx.blockId);
                        const week = block?.weeks.find(w => w.id === assignCtx.weekId);
                        const session = week?.sessions.find(s => s.id === assignCtx.sessionId);
                        const dayName = new Date(assignCtx.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                        return (
                            <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center gap-3 shrink-0">
                                <LinkIcon size={14} className="text-emerald-600 shrink-0" />
                                <p className="text-[11px] text-emerald-800 font-medium">
                                    Assigning to: <span className="font-bold">{plan?.name || 'Plan'}</span>
                                    {' > '}<span className="font-bold">{phase?.name || 'Phase'}</span>
                                    {' > '}<span className="font-bold">{block?.label || block?.name || 'Block'}</span>
                                    {' > '}<span className="font-bold">{dayName}</span>
                                    {session?.name ? <span className="text-emerald-600"> ({session.name})</span> : null}
                                </p>
                            </div>
                        );
                    })()}

                    {/* Weightroom Sheet Panel */}
                    {showWeightroomSheet && (
                        <div className="px-6 pt-4">
                            <WeightroomSheetPanel
                                workoutExercises={sections.workout}
                                sheetConfig={weightroomSheetConfig}
                                targetType={targetType}
                                targetId={targetId}
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

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/60">
                        {/* Session Info Card */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <ClockIcon size={14} className={isAssigning ? 'text-emerald-500' : 'text-indigo-500'} />
                                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                    {isAssigning ? 'Workout Details' : 'Session Details'}
                                </h3>
                            </div>

                            {/* Title */}
                            <input
                                type="text"
                                placeholder="Workout title (e.g. Upper Body Power)"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none hover:border-slate-300 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                            />

                            {/* Phase + Load (always shown) */}
                            <div className={`grid gap-3 ${isAssigning ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
                                {!isAssigning && (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Date</label>
                                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-400 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Time</label>
                                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-400 transition-all" />
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Phase</label>
                                    <div className="relative">
                                        <select value={trainingPhase} onChange={e => setTrainingPhase(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none appearance-none pr-8 focus:border-indigo-400 transition-all">
                                            {TRAINING_PHASES.map(p => <option key={p}>{p}</option>)}
                                        </select>
                                        <ChevronDownIcon size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Load</label>
                                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                        {['Low', 'Medium', 'High'].map(l => (
                                            <button key={l} onClick={() => setLoad(l)} className={`flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all ${load === l ? (l === 'Low' ? 'bg-emerald-500 text-white' : l === 'Medium' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white') : 'text-slate-500 hover:text-slate-700'}`}>
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Track Tonnage</label>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <button type="button" onClick={() => setTrackTonnage(v => !v)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${trackTonnage ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${trackTonnage ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                                        </button>
                                        <span className="text-[10px] text-slate-400">
                                            {trackTonnage ? 'Feeds Tracking Hub' : 'Tracking off'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Target Type + Target — only in normal mode */}
                            {!isAssigning && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Target Type</label>
                                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                                            {['Team', 'Individual'].map(tt => (
                                                <button key={tt} onClick={() => { setTargetType(tt as any); setTargetId(''); }} className={`flex-1 py-2 rounded-lg text-[10px] font-semibold transition-all ${targetType === tt ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                                                    {tt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">
                                            {targetType === 'Team' ? 'Select Team' : 'Select Athlete'}
                                        </label>
                                        <div className="relative">
                                            <select value={targetId} onChange={e => setTargetId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none appearance-none pr-8 focus:border-indigo-400 transition-all">
                                                <option value="">Select...</option>
                                                {targetType === 'Team'
                                                    ? teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                                    : allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                                }
                                            </select>
                                            <ChevronDownIcon size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Workout Builder */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            {/* Section tabs */}
                            <div className="flex border-b border-slate-100">
                                {SECTIONS.map(sec => (
                                    <button key={sec} onClick={() => setActiveSection(sec)} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wide transition-all border-b-2 ${activeSection === sec ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                        {SECTION_LABELS[sec]}
                                        {sections[sec].length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 rounded-full text-[8px]">{sections[sec].length}</span>}
                                    </button>
                                ))}
                            </div>

                            {/* Volume tracking */}
                            {(Object.keys(packetVolume.byBodyPart).length > 0 || Object.keys(packetVolume.byRegion).length > 0) && (
                                <div className="px-4 pt-3 space-y-2">
                                    {Object.keys(packetVolume.byBodyPart).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 items-center">
                                            <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide mr-1">Body Part</span>
                                            {Object.entries(packetVolume.byBodyPart).sort((a, b) => b[1] - a[1]).map(([part, sets]) => {
                                                const color = BODY_PART_COLORS[part] ?? 'bg-slate-100 text-slate-600';
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
                                                const color = VOLUME_COLORS[region] ?? 'bg-slate-100 text-slate-600';
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

                            {/* Exercise rows */}
                            <div className="p-4 space-y-3 min-h-[200px]">
                                {sections[activeSection].length === 0 ? (
                                    <div className="py-12 flex flex-col items-center text-slate-300 gap-2">
                                        <DumbbellIcon size={28} className="opacity-30" />
                                        <p className="text-[10px] text-slate-400">No exercises in {SECTION_LABELS[activeSection]}</p>
                                        <p className="text-[9px] text-slate-300">Select exercises from the right panel</p>
                                    </div>
                                ) : (
                                    sections[activeSection].map((row, idx) => (
                                        <div key={row.tempId} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                                                    <span className="text-xs font-semibold text-slate-800">{row.exerciseName}</span>
                                                    {weightroomSheetConfig?.columns?.some(c => c.exerciseId && (row.exerciseName === c.exerciseId || row.exerciseName.toLowerCase().includes(c.exerciseId.toLowerCase()))) && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[8px] font-bold text-indigo-600 uppercase tracking-wide">
                                                            <LinkIcon size={8} /> 1RM
                                                        </span>
                                                    )}
                                                </div>
                                                <button onClick={() => removeRow(activeSection, row.tempId)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                                    <Trash2Icon size={12} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-6 gap-2">
                                                {[
                                                    { key: 'sets', label: 'Sets', placeholder: '3' },
                                                    { key: 'reps', label: 'Reps', placeholder: '10' },
                                                    { key: 'rest', label: 'Rest (s)', placeholder: '60' },
                                                    { key: 'rpe', label: 'RPE', placeholder: '7' },
                                                    { key: 'weight', label: 'Weight (kg)', placeholder: '80' },
                                                    { key: 'notes', label: 'Notes', placeholder: '—' },
                                                ].map(f => (
                                                    <div key={f.key}>
                                                        <label className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">{f.label}</label>
                                                        <input
                                                            type="text"
                                                            value={row[f.key]}
                                                            onChange={e => updateRow(activeSection, row.tempId, f.key, e.target.value)}
                                                            placeholder={f.placeholder}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Linked Sessions ────────────────────────────── */}
                    <div className="px-5 py-4 border-t border-slate-100">
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
                </div>

                {/* ── RIGHT: Exercise Picker ─────────────────────────────── */}
                <div className="w-72 shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
                    <div className="px-4 py-4 border-b border-slate-200 space-y-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-slate-700">Choose Exercise</h3>
                            <span className="text-[9px] text-slate-400">{pickerSource === 'mine' ? displayExercises.length : (exData?.total ?? 0)} total</span>
                        </div>
                        {/* All / Mine toggle */}
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button type="button" onClick={() => setPickerSource('all')} className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all ${pickerSource === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>All</button>
                            <button type="button" onClick={() => setPickerSource('mine')} className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-all flex items-center justify-center gap-1 ${pickerSource === 'mine' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" /></svg>
                                Mine
                            </button>
                        </div>
                        <div className="relative">
                            <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={exSearch}
                                onChange={e => setExSearch(e.target.value)}
                                placeholder="Search exercises..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-400 transition-all"
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
                        <div className="relative">
                            <select value={exCategory} onChange={e => setExCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none appearance-none pr-8 focus:border-indigo-400 transition-all">
                                {EXERCISE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <ChevronDownIcon size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Browse A-Z</span>
                                {exLetter && (
                                    <button onClick={() => setExLetter('')} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wide">Clear</button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <button
                                    onClick={() => { setExLetter(''); setExSearch(''); }}
                                    className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${!exLetter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'}`}
                                >&#10005;</button>
                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                                    <button
                                        key={l}
                                        onClick={() => { if (exLetter === l) setExLetter(''); else { setExLetter(l); setExSearch(''); } }}
                                        className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${exLetter === l ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'}`}
                                    >{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="text-[9px] font-medium text-indigo-500 bg-indigo-50 rounded-lg px-3 py-1.5">
                            Adding to: <strong>{SECTION_LABELS[activeSection]}</strong>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {exLoading ? (
                            <div className="py-12 flex items-center justify-center text-slate-400 text-xs">Loading...</div>
                        ) : displayExercises.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                                {pickerSource === 'mine' ? <><span>No exercises in your library</span><span className="text-[9px]">Star exercises from the Exercise Library page</span></> : 'No exercises found'}
                            </div>
                        ) : (
                            displayExercises.map(ex => {
                                const already = sections[activeSection].some(r => r.exerciseId === ex.id);
                                return (
                                    <button
                                        key={ex.id}
                                        onClick={() => !already && addExercise(ex)}
                                        disabled={already}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${already ? 'border-emerald-200 bg-emerald-50 cursor-default' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${already ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {already ? <span className="text-[8px]">&#10003;</span> : <PlusIcon size={10} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-semibold text-slate-700 leading-tight truncate">{ex.name}</div>
                                            {ex.categories?.[0] && (
                                                <div className="text-[8px] text-slate-400 mt-0.5">{ex.categories[0]}</div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {(exData?.totalPages || 0) > 1 && (
                        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
                            <button onClick={() => setExPage(p => Math.max(1, p - 1))} disabled={exPage <= 1} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all">
                                <ChevronLeftIcon size={14} className="text-slate-500" />
                            </button>
                            <span className="text-[10px] font-medium text-slate-500">{exPage} / {exData?.totalPages}</span>
                            <button onClick={() => setExPage(p => Math.min(exData?.totalPages || 1, p + 1))} disabled={exPage >= (exData?.totalPages || 1)} className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-all">
                                <ChevronRightIcon size={14} className="text-slate-500" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkoutPacketsPage;
