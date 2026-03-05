// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import { useExercises } from '../hooks/useExercises';
import {
    X as XIcon,
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
    Layers as LayersIcon,
    Clock as ClockIcon,
} from 'lucide-react';

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

const tempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// ── Types ────────────────────────────────────────────────────────────────────

interface ExRow {
    tempId: string;
    exerciseId: string;
    exerciseName: string;
    sets: string;
    reps: string;
    rest: string;
    rpe: string;
    notes: string;
}

const emptyRow = (ex: { id: string; name: string }): ExRow => ({
    tempId: tempId(),
    exerciseId: ex.id,
    exerciseName: ex.name,
    sets: '3',
    reps: '10',
    rest: '60',
    rpe: '7',
    notes: '',
});

// ── Component ────────────────────────────────────────────────────────────────

const WorkoutPacketModal = () => {
    const {
        isWorkoutPacketModalOpen, setIsWorkoutPacketModalOpen,
        teams, resolveTargetName,
        scheduleWorkoutSession, showToast,
        workoutTemplates, setWorkoutTemplates,
    } = useAppState();

    // ── Session info state ─────────────────────────────────────────────────
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [targetType, setTargetType] = useState<'Team' | 'Individual'>('Team');
    const [targetId, setTargetId] = useState('');
    const [trainingPhase, setTrainingPhase] = useState('Strength');
    const [load, setLoad] = useState('Medium');

    // ── Workout builder state ──────────────────────────────────────────────
    const [sections, setSections] = useState<Record<string, ExRow[]>>({ warmup: [], workout: [], cooldown: [] });
    const [activeSection, setActiveSection] = useState<string>('workout');

    // ── Exercise picker state ──────────────────────────────────────────────
    const [exSearch, setExSearch] = useState('');
    const [exCategory, setExCategory] = useState('All');
    const [exLetter, setExLetter] = useState('');
    const [exPage, setExPage] = useState(1);

    // ── View mode ──────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'builder' | 'templates'>('builder');
    const [scheduling, setScheduling] = useState(false);

    // ── Query ──────────────────────────────────────────────────────────────
    const { data: exData, isLoading: exLoading } = useExercises({
        search: exSearch || undefined,
        category: exCategory !== 'All' ? exCategory : undefined,
        alphabetLetter: exLetter || undefined,
        page: exPage,
        pageSize: 25,
    });

    useEffect(() => { setExPage(1); }, [exSearch, exCategory, exLetter]);

    // ── Derived ────────────────────────────────────────────────────────────
    const allPlayers = useMemo(() => teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)), [teams]);

    const totalExercises = SECTIONS.reduce((sum, s) => sum + sections[s].length, 0);

    // ── Reset ──────────────────────────────────────────────────────────────
    const resetForm = () => {
        setTitle('');
        setDate(new Date().toISOString().split('T')[0]);
        setTime('09:00');
        setTargetType('Team');
        setTargetId('');
        setTrainingPhase('Strength');
        setLoad('Medium');
        setSections({ warmup: [], workout: [], cooldown: [] });
        setActiveSection('workout');
        setExSearch('');
        setExCategory('All');
        setExPage(1);
        setViewMode('builder');
    };

    const handleClose = () => {
        setIsWorkoutPacketModalOpen(false);
        resetForm();
    };

    // ── Exercise row handlers ──────────────────────────────────────────────
    const addExercise = (ex: { id: string; name: string }) => {
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

    // ── Schedule workout ───────────────────────────────────────────────────
    const handleSchedule = async () => {
        if (!title.trim()) { showToast('Please enter a workout title', 'error'); return; }
        if (!targetId) { showToast('Please select a target athlete or team', 'error'); return; }

        const allExs = [...sections.warmup, ...sections.workout, ...sections.cooldown];
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
            exercises: allExs.map(r => ({
                id: r.exerciseId,
                name: r.exerciseName,
                sets: parseInt(r.sets) || 3,
                reps: r.reps || '10',
                weight: '-',
                rpe: parseInt(r.rpe) || 7,
                notes: r.notes || '',
            })),
        };

        try {
            setScheduling(true);
            await scheduleWorkoutSession(payload);
            handleClose();
        } catch (err) {
            // toast already shown by scheduleWorkoutSession
        } finally {
            setScheduling(false);
        }
    };

    // ── Save as template ───────────────────────────────────────────────────
    const handleSaveTemplate = () => {
        if (!title.trim()) { showToast('Enter a title to save as template', 'error'); return; }
        const template = {
            id: `tpl_${Date.now()}`,
            name: title.trim(),
            trainingPhase,
            load,
            sections: {
                warmup: sections.warmup.map(r => ({ exerciseId: r.exerciseId, exerciseName: r.exerciseName, sets: r.sets, reps: r.reps, rest: r.rest, rpe: r.rpe, notes: r.notes })),
                workout: sections.workout.map(r => ({ exerciseId: r.exerciseId, exerciseName: r.exerciseName, sets: r.sets, reps: r.reps, rest: r.rest, rpe: r.rpe, notes: r.notes })),
                cooldown: sections.cooldown.map(r => ({ exerciseId: r.exerciseId, exerciseName: r.exerciseName, sets: r.sets, reps: r.reps, rest: r.rest, rpe: r.rpe, notes: r.notes })),
            },
            createdAt: new Date().toISOString(),
        };
        setWorkoutTemplates(prev => [template, ...prev]);
        showToast('Template saved', 'success');
    };

    // ── Load template ──────────────────────────────────────────────────────
    const loadTemplate = (tpl) => {
        setTitle(tpl.name);
        setTrainingPhase(tpl.trainingPhase || 'Strength');
        setLoad(tpl.load || 'Medium');
        setSections({
            warmup: (tpl.sections?.warmup || []).map(r => ({ ...r, tempId: tempId() })),
            workout: (tpl.sections?.workout || []).map(r => ({ ...r, tempId: tempId() })),
            cooldown: (tpl.sections?.cooldown || []).map(r => ({ ...r, tempId: tempId() })),
        });
        setViewMode('builder');
    };

    const deleteTemplate = (id: string) => {
        setWorkoutTemplates(prev => prev.filter(t => t.id !== id));
    };

    // ── Print ──────────────────────────────────────────────────────────────
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

    // ── Early return ───────────────────────────────────────────────────────
    if (!isWorkoutPacketModalOpen) return null;

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[600] bg-black/50 backdrop-blur-sm flex animate-in fade-in duration-200">
            <div className="flex-1 flex overflow-hidden m-4 bg-white rounded-2xl shadow-2xl border border-slate-200">

                {/* ── LEFT: Main Panel ───────────────────────────────────── */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <DumbbellIcon size={16} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Workout Packets</h2>
                                <p className="text-[10px] text-slate-400">Build, schedule & print one-off workouts</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* View toggle */}
                            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                                <button onClick={() => setViewMode('builder')} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${viewMode === 'builder' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Builder</button>
                                <button onClick={() => setViewMode('templates')} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${viewMode === 'templates' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                                    Templates {workoutTemplates.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full text-[8px]">{workoutTemplates.length}</span>}
                                </button>
                            </div>
                            <button onClick={handleSaveTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-semibold text-slate-600 transition-all" title="Save as template">
                                <SaveIcon size={12} /> Save Template
                            </button>
                            <button onClick={handlePrint} disabled={totalExercises === 0} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-semibold disabled:opacity-40 transition-all">
                                <PrinterIcon size={12} /> Print
                            </button>
                            <button onClick={handleSchedule} disabled={scheduling || !title.trim() || !targetId} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-semibold disabled:opacity-40 transition-all">
                                <CalendarPlusIcon size={12} /> {scheduling ? 'Scheduling...' : 'Schedule Workout'}
                            </button>
                            <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                                <XIcon size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">

                        {viewMode === 'templates' ? (
                            /* ── Templates View ──────────────────────────────── */
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saved Templates</h3>
                                {workoutTemplates.length === 0 ? (
                                    <div className="py-16 flex flex-col items-center text-slate-300 gap-2">
                                        <LayersIcon size={36} />
                                        <p className="text-xs text-slate-400">No templates saved yet</p>
                                        <p className="text-[10px] text-slate-300">Build a workout and click "Save Template"</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                                        {workoutTemplates.map(tpl => {
                                            const exCount = (tpl.sections?.warmup?.length || 0) + (tpl.sections?.workout?.length || 0) + (tpl.sections?.cooldown?.length || 0);
                                            return (
                                                <div key={tpl.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-200 transition-all group">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div>
                                                            <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{tpl.name}</h4>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-semibold">{tpl.trainingPhase}</span>
                                                                <span className="text-[9px] text-slate-400">{exCount} exercises</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => deleteTemplate(tpl.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                            <Trash2Icon size={12} />
                                                        </button>
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mb-3">
                                                        Created {new Date(tpl.createdAt).toLocaleDateString()}
                                                    </div>
                                                    <button onClick={() => loadTemplate(tpl)} className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-semibold transition-all">
                                                        Load Template
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* ── Builder View ────────────────────────────────── */
                            <>
                                {/* Session Info Card */}
                                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ClockIcon size={14} className="text-indigo-500" />
                                        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Session Details</h3>
                                    </div>

                                    {/* Title */}
                                    <input
                                        type="text"
                                        placeholder="Workout title (e.g. Upper Body Power)"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none hover:border-slate-300 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                    />

                                    {/* Row 2: Date, Time, Phase, Load */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Date</label>
                                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-400 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Time</label>
                                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:border-indigo-400 transition-all" />
                                        </div>
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
                                    </div>

                                    {/* Row 3: Target Type + Target */}
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
                                                    {/* Exercise header */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">{LETTERS[idx] || idx + 1}</span>
                                                            <span className="text-xs font-semibold text-slate-800">{row.exerciseName}</span>
                                                        </div>
                                                        <button onClick={() => removeRow(activeSection, row.tempId)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                                                            <Trash2Icon size={12} />
                                                        </button>
                                                    </div>
                                                    {/* Fields */}
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {[
                                                            { key: 'sets', label: 'Sets', placeholder: '3' },
                                                            { key: 'reps', label: 'Reps', placeholder: '10' },
                                                            { key: 'rest', label: 'Rest (s)', placeholder: '60' },
                                                            { key: 'rpe', label: 'RPE', placeholder: '7' },
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
                            </>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Exercise Picker ─────────────────────────────── */}
                <div className="w-72 shrink-0 bg-slate-50 border-l border-slate-200 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-4 border-b border-slate-200 space-y-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-slate-700">Choose Exercise</h3>
                            <span className="text-[9px] text-slate-400">{exData?.total ?? 0} total</span>
                        </div>
                        {/* Search */}
                        <div className="relative">
                            <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={exSearch}
                                onChange={e => setExSearch(e.target.value)}
                                placeholder="Search exercises..."
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-400 transition-all"
                            />
                        </div>
                        {/* Category */}
                        <div className="relative">
                            <select value={exCategory} onChange={e => setExCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none appearance-none pr-8 focus:border-indigo-400 transition-all">
                                {EXERCISE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                            <ChevronDownIcon size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        {/* A–Z letter browser */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Browse A–Z</span>
                                {exLetter && (
                                    <button onClick={() => setExLetter('')} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wide">Clear</button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <button
                                    onClick={() => { setExLetter(''); setExSearch(''); }}
                                    className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${!exLetter ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'}`}
                                >✕</button>
                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                                    <button
                                        key={l}
                                        onClick={() => { if (exLetter === l) setExLetter(''); else { setExLetter(l); setExSearch(''); } }}
                                        className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${exLetter === l ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-700'}`}
                                    >{l}</button>
                                ))}
                            </div>
                        </div>

                        {/* Adding to indicator */}
                        <div className="text-[9px] font-medium text-indigo-500 bg-indigo-50 rounded-lg px-3 py-1.5">
                            Adding to: <strong>{SECTION_LABELS[activeSection]}</strong>
                        </div>
                    </div>

                    {/* Exercise list */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        {exLoading ? (
                            <div className="py-12 flex items-center justify-center text-slate-400 text-xs">Loading...</div>
                        ) : (exData?.exercises || []).length === 0 ? (
                            <div className="py-12 flex items-center justify-center text-slate-400 text-xs">No exercises found</div>
                        ) : (
                            (exData?.exercises || []).map(ex => {
                                const already = sections[activeSection].some(r => r.exerciseId === ex.id);
                                return (
                                    <button
                                        key={ex.id}
                                        onClick={() => !already && addExercise(ex)}
                                        disabled={already}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${already ? 'border-emerald-200 bg-emerald-50 cursor-default' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${already ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {already ? <span className="text-[8px]">✓</span> : <PlusIcon size={10} />}
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

                    {/* Pagination */}
                    {(exData?.totalPages || 0) > 1 && (
                        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
                            <button onClick={() => setExPage(p => Math.max(1, p - 1))} disabled={exPage <= 1} className="p-1.5 hover:bg-white rounded-lg disabled:opacity-30 transition-all">
                                <ChevronLeftIcon size={14} className="text-slate-500" />
                            </button>
                            <span className="text-[10px] font-medium text-slate-500">{exPage} / {exData?.totalPages}</span>
                            <button onClick={() => setExPage(p => Math.min(exData?.totalPages || 1, p + 1))} disabled={exPage >= (exData?.totalPages || 1)} className="p-1.5 hover:bg-white rounded-lg disabled:opacity-30 transition-all">
                                <ChevronRightIcon size={14} className="text-slate-500" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkoutPacketModal;
