import React, { useState, useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import { Button } from '@/components/ui/button';
import {
    ActivityIcon, ZapIcon, PlusIcon, Trash2Icon, SaveIcon, PrinterIcon,
    ClockIcon, FileEditIcon, Calculator as CalculatorIcon, ArrowLeftIcon,
    TimerIcon, HeartPulseIcon, RepeatIcon, CopyIcon, CalendarPlusIcon, SearchIcon,
} from 'lucide-react';
import { SupabaseStorageService as StorageService } from '../services/storageService';
import { CustomSelect } from '../components/ui/CustomSelect';
import { LinkedSessionsPicker } from '../components/conditioning/LinkedSessionsPicker';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { fuzzySearch } from '../utils/fuzzySearch';
import { SkTileGrid, SkListCards } from '../components/ui/Skeleton';
import TimePicker from '../components/ui/TimePicker';
import DatePicker from '../components/ui/DatePicker';

const ICON_MAP = {
    'Activity': ActivityIcon,
    'Zap': ZapIcon,
    'Calculator': CalculatorIcon,
    'Clock': ClockIcon,
    'FileEdit': FileEditIcon,
    'Plus': PlusIcon,
    'Trash2': Trash2Icon,
    'Save': SaveIcon,
    'Printer': PrinterIcon
};

export const ConditioningHubPage = () => {
    const {
        activeConditioningModule, setActiveConditioningModule, isLoading,
        isSecondaryLoading,
        wattbikeView, setWattbikeView,
        selectedWattbikeSession, setSelectedWattbikeSession,
        newWattbikeSession, setNewWattbikeSession,
        wattbikeSessions, setWattbikeSessions,
        conditioningSessions, setConditioningSessions,
        conditioningView, setConditioningView,
        selectedConditioningSession, setSelectedConditioningSession,
        newConditioningSession, setNewConditioningSession,
        workoutTemplates,
        showToast,
        setIsWattbikeMapCalculatorOpen,
        scheduleWorkoutSession, teams, resolveTargetName,
    } = useAppState();

    // Per-list search state. Wattbike ships with 26 defaults so search is always
    // on; Conditioning starts empty so we only show the search input when there
    // are enough sessions to make scanning slow (>=5). Both use the same fuzzy
    // util (exact-substring first, per-word trigram fallback for typos).
    const [wattbikeSearch, setWattbikeSearch] = useState('');
    const [conditioningSearch, setConditioningSearch] = useState('');

    const wattbikeSearchResult = useMemo(
        () => fuzzySearch(
            wattbikeSessions || [],
            wattbikeSearch,
            (s: any) => [s.title, s.type || '', s.duration || ''].join(' '),
            (s: any) => s.title,
        ),
        [wattbikeSessions, wattbikeSearch]
    );
    const filteredWattbikeSessions = wattbikeSearchResult.results;

    const conditioningSearchResult = useMemo(
        () => fuzzySearch(
            conditioningSessions || [],
            conditioningSearch,
            (s: any) => [s.title, s.modality || '', s.energySystem || '', s.notes || ''].join(' '),
            (s: any) => s.title,
        ),
        [conditioningSessions, conditioningSearch]
    );
    const filteredConditioningSessions = conditioningSearchResult.results;

    // --- SCHEDULING STATE ---
    const [scheduleOpen, setScheduleOpen] = React.useState<null | { type: 'wattbike' | 'conditioning'; session: any }>(null);
    const [schedDate, setSchedDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [schedTime, setSchedTime] = React.useState('09:00');
    const [schedTargetType, setSchedTargetType] = React.useState<'Team' | 'Individual'>('Team');
    const [schedTargetId, setSchedTargetId] = React.useState('');
    const [scheduling, setScheduling] = React.useState(false);

    // ── Confirm delete state ───────────────────────────────────────────
    const [confirmDeleteWattbike, setConfirmDeleteWattbike] = React.useState<{ id: string; title: string } | null>(null);
    const [confirmDeleteCond, setConfirmDeleteCond] = React.useState<{ id: string; title: string } | null>(null);

    const allPlayers = React.useMemo(() => teams.flatMap(t => t.players || []), [teams]);

    const handleScheduleSession = async () => {
        if (!scheduleOpen) return;
        if (!schedTargetId) { showToast('Please select a target', 'error'); return; }
        const s = scheduleOpen.session;
        const isWattbike = scheduleOpen.type === 'wattbike';
        const payload = {
            title: s.title || s.name,
            date: schedDate,
            time: schedTime,
            target_type: schedTargetType,
            target_id: schedTargetId,
            training_phase: isWattbike ? 'Conditioning' : (s.energySystem === 'alactic' ? 'Speed' : s.energySystem === 'glycolytic' ? 'Power' : 'Conditioning'),
            load: 'Medium',
            status: 'Scheduled',
            planned_duration: parseInt(s.duration || s.totalDuration) || 60,
            session_type: isWattbike ? 'wattbike' : 'conditioning',
            linked_sessions: s.linkedSessions || [],
            notes: isWattbike
                ? `Wattbike session: ${s.type || ''} · ${s.duration || ''}`
                : `Conditioning: ${s.modality || ''} · ${ENERGY_SYSTEMS.find(e => e.value === s.energySystem)?.label || s.energySystem}`,
            exercises: isWattbike
                ? { wattbike: s.sections || [], meta: { type: s.type, duration: s.duration } }
                : { conditioning: s.sets || [], meta: { energySystem: s.energySystem, modality: s.modality, totalDuration: s.totalDuration } },
        };
        try {
            setScheduling(true);
            await scheduleWorkoutSession(payload);
            setScheduleOpen(null);
        } catch { /* toast already shown */ } finally { setScheduling(false); }
    };

    const renderScheduleInline = () => {
        if (!scheduleOpen) return null;
        const targets = schedTargetType === 'Team' ? teams : allPlayers;
        return (
            <div className="bg-indigo-50 dark:bg-indigo-600 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5"><CalendarPlusIcon size={13} /> Schedule to Calendar</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase mb-1 block">Date</label>
                        <DatePicker value={schedDate} onChange={e => setSchedDate(e.target.value)} className="w-full" />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase mb-1 block">Time</label>
                        <TimePicker value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase mb-1 block">Assign to</label>
                        <CustomSelect value={schedTargetType} onChange={e => { setSchedTargetType(e.target.value as any); setSchedTargetId(''); }} size="sm">
                            <option value="Team">Team</option>
                            <option value="Individual">Individual</option>
                        </CustomSelect>
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase mb-1 block">{schedTargetType}</label>
                        <CustomSelect value={schedTargetId} onChange={e => setSchedTargetId(e.target.value)} size="sm">
                            <option value="">Select...</option>
                            {targets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </CustomSelect>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setScheduleOpen(null)}>Cancel</Button>
                    <Button size="sm" disabled={scheduling} onClick={handleScheduleSession}><CalendarPlusIcon size={13} className="mr-1.5" />{scheduling ? 'Scheduling...' : 'Schedule'}</Button>
                </div>
            </div>
        );
    };

    const GaugeIcon = () => null;

    // --- CONDITIONING SESSIONS ---
    const ENERGY_SYSTEMS = [
        { value: 'alactic', label: 'Alactic / Phosphocreatine', desc: '0–6s max efforts', color: 'bg-violet-500' },
        { value: 'glycolytic', label: 'Glycolytic / Lactic', desc: '6s–2min high intensity', color: 'bg-orange-500' },
        { value: 'aerobic', label: 'Aerobic / MAS-based', desc: '2min+ submaximal', color: 'bg-cyan-500' },
        { value: 'mixed', label: 'Mixed / Hybrid', desc: 'Multiple energy systems', color: 'bg-slate-500' },
    ];
    const MODALITIES = ['Running', 'Bike', 'Rowing', 'Sled', 'Ski Erg', 'Swimming', 'Mixed'];
    const INTENSITY_TYPES = ['% MAS', 'HR Zone', 'RPE', '% Max Sprint', 'Pace (m/s)', 'Pace (min/km)'];

    const emptyConditioningSession = { title: '', energySystem: 'aerobic', modality: 'Running', totalDuration: '', notes: '', sets: [], linkedSessions: [] };
    const emptySet = () => ({ id: 'cs_' + Date.now() + Math.random().toString(36).slice(2, 6), reps: '', workDuration: '', workDistance: '', intensityType: '% MAS', intensityValue: '', restDuration: '', interSetRest: '', notes: '' });

    const energyColor = (es) => {
        if (es === 'alactic')    return { bg: 'bg-violet-50 dark:bg-[#0F1C30]', border: 'border-violet-200 dark:border-violet-500/30', text: 'text-violet-700 dark:text-violet-300', badge: 'bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300', accent: 'bg-violet-500' };
        if (es === 'glycolytic')  return { bg: 'bg-orange-50 dark:bg-[#0F1C30]', border: 'border-orange-200 dark:border-orange-500/30', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 text-orange-700 dark:text-orange-400', accent: 'bg-orange-500' };
        if (es === 'aerobic')     return { bg: 'bg-cyan-50 dark:bg-[#0F1C30]',   border: 'border-cyan-200 dark:border-cyan-500/30',   text: 'text-cyan-700 dark:text-cyan-300',   badge: 'bg-cyan-50 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400',   accent: 'bg-cyan-500' };
        return { bg: 'bg-slate-50 dark:bg-[#0F1C30]', border: 'border-slate-200 dark:border-[#243A58]', text: 'text-slate-700 dark:text-[#E2E8F0]', badge: 'bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-700 dark:text-[#CBD5E1]', accent: 'bg-slate-500' };
    };

    const addCondSet = () => setNewConditioningSession(prev => ({ ...prev, sets: [...prev.sets, emptySet()] }));
    const removeCondSet = (id) => setNewConditioningSession(prev => ({ ...prev, sets: prev.sets.filter(s => s.id !== id) }));
    const updateCondSet = (id, field, value) => setNewConditioningSession(prev => ({ ...prev, sets: prev.sets.map(s => s.id === id ? { ...s, [field]: value } : s) }));
    const duplicateCondSet = (set) => setNewConditioningSession(prev => ({ ...prev, sets: [...prev.sets, { ...set, id: 'cs_' + Date.now() + Math.random().toString(36).slice(2, 6) }] }));

    const calcWorkRest = (work, rest) => {
        const parseSec = (v) => {
            if (!v) return 0;
            const str = String(v).trim();
            if (str.includes(':')) { const [m, s] = str.split(':'); return (parseInt(m) || 0) * 60 + (parseInt(s) || 0); }
            if (str.toLowerCase().endsWith('s')) return parseInt(str) || 0;
            if (str.toLowerCase().endsWith('min')) return (parseFloat(str) || 0) * 60;
            return parseInt(str) || 0;
        };
        const w = parseSec(work); const r = parseSec(rest);
        if (!w || !r) return null;
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const d = gcd(w, r);
        return `${w / d}:${r / d}`;
    };

    const totalCondVolume = (session) => {
        let totalWork = 0; let totalReps = 0;
        (session.sets || []).forEach(s => {
            const reps = parseInt(s.reps) || 1;
            totalReps += reps;
            if (s.workDistance) totalWork += reps * (parseFloat(s.workDistance) || 0);
        });
        return { totalReps, totalWork };
    };

    const handleSaveCondSession = () => {
        if (!newConditioningSession.title) { showToast("Please enter a session title."); return; }
        if (newConditioningSession.sets.length === 0) { showToast("Add at least one set."); return; }
        let updated;
        const isEdit = !!newConditioningSession.id;
        if (isEdit) {
            updated = conditioningSessions.map(s => s.id === newConditioningSession.id ? { ...newConditioningSession } : s);
        } else {
            updated = [{ ...newConditioningSession, id: 'cond_' + Date.now(), createdAt: new Date().toISOString() }, ...conditioningSessions];
        }
        setConditioningSessions(updated);
        StorageService.saveConditioningSessions(updated);
        setConditioningView('grid');
        setNewConditioningSession({ ...emptyConditioningSession });
        showToast(isEdit ? "Session updated" : "Session created", 'success');
    };

    const handlePrintCondSession = (session) => {
        const ec = energyColor(session.energySystem);
        const sysLabel = ENERGY_SYSTEMS.find(e => e.value === session.energySystem)?.label || session.energySystem;
        const vol = totalCondVolume(session);

        const setsHtml = (session.sets || []).map((s, idx) => {
            const wr = calcWorkRest(s.workDuration, s.restDuration);
            return `
              <div style="margin-bottom:10px;padding:14px 16px;border-radius:10px;border-left:5px solid #0891b2;background:#f0fdfa;page-break-inside:avoid;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="width:28px;height:28px;border-radius:6px;background:#1e293b;color:white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;flex-shrink:0;">S${idx + 1}</div>
                  <div style="flex:1;display:flex;flex-wrap:wrap;gap:20px;align-items:center;">
                    <div><span style="font-size:11px;color:#64748b;display:block;">Reps</span><strong style="font-size:16px;">${s.reps || '—'}</strong></div>
                    <div><span style="font-size:11px;color:#64748b;display:block;">Work</span><strong style="font-size:16px;">${s.workDuration || '—'}${s.workDistance ? ' / ' + s.workDistance + 'm' : ''}</strong></div>
                    <div><span style="font-size:11px;color:#64748b;display:block;">Intensity</span><strong style="font-size:16px;">${s.intensityValue || '—'} ${s.intensityType || ''}</strong></div>
                    <div><span style="font-size:11px;color:#64748b;display:block;">Rest</span><strong style="font-size:16px;">${s.restDuration || '—'}</strong></div>
                    ${wr ? `<div><span style="font-size:11px;color:#64748b;display:block;">W:R</span><strong style="font-size:16px;">${wr}</strong></div>` : ''}
                    ${s.interSetRest ? `<div><span style="font-size:11px;color:#64748b;display:block;">Inter-set Rest</span><strong style="font-size:16px;">${s.interSetRest}</strong></div>` : ''}
                  </div>
                </div>
                ${s.notes ? `<div style="margin-top:8px;margin-left:42px;font-size:12px;color:#64748b;font-style:italic;">${s.notes}</div>` : ''}
              </div>`;
        }).join('');

        const html = `<!DOCTYPE html><html><head><title>Conditioning: ${session.title}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;margin:32px 40px;color:#1e293b;background:white}h1{font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:3px;margin-bottom:6px}.meta{color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #f1f5f9}@media print{@page{margin:20mm}}</style>
</head><body>
<h1>${session.title}</h1>
<div class="meta">${sysLabel} &nbsp;·&nbsp; ${session.modality} &nbsp;·&nbsp; ${session.totalDuration || 'N/A'} &nbsp;·&nbsp; ${session.sets?.length || 0} Sets &nbsp;·&nbsp; ${vol.totalReps} Total Reps${vol.totalWork ? ' &nbsp;·&nbsp; ' + vol.totalWork + 'm Total' : ''}</div>
${session.notes ? `<div style="margin-bottom:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:13px;color:#475569;">${session.notes}</div>` : ''}
${setsHtml}
</body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
    };

    // --- LINKED SESSIONS SOURCE CONFIGS ---
    const wattbikeSource = {
        key: 'wattbike', label: 'Wattbike', icon: <ActivityIcon size={12} />,
        color: 'bg-indigo-100', textColor: 'text-indigo-600',
        items: wattbikeSessions.map(s => ({ id: s.id, title: s.title, meta: s.duration || s.type })),
    };
    const conditioningSource = {
        key: 'conditioning', label: 'Conditioning', icon: <TimerIcon size={12} />,
        color: 'bg-cyan-100', textColor: 'text-cyan-600',
        items: conditioningSessions.map(s => ({ id: s.id, title: s.title, meta: `${s.modality} · ${ENERGY_SYSTEMS.find(e => e.value === s.energySystem)?.label?.split('/')[0]?.trim() || s.energySystem}` })),
    };
    const workoutTemplateSource = {
        key: 'workout-template', label: 'Workout Packets', icon: <ZapIcon size={12} />,
        color: 'bg-amber-100', textColor: 'text-amber-600',
        items: (workoutTemplates || []).map(t => ({ id: t.id, title: t.name, meta: t.training_phase || t.trainingPhase || '' })),
    };

    const renderConditioningSessionCreator = () => {
        const inputCls = "w-full bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-lg px-2.5 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all";
        const labelCls = "text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0]";

        return (
            <div className="max-w-5xl mx-auto pb-10 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">{newConditioningSession.id ? 'Edit Session' : 'Create Conditioning Session'}</h3>
                            <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Prescribe sets, reps, intensity & work:rest ratios</p>
                        </div>
                        <div className="flex gap-2.5">
                            <Button variant="secondary" size="sm" onClick={() => { setConditioningView('grid'); setNewConditioningSession({ ...emptyConditioningSession }); }}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveCondSession}><SaveIcon size={13} className="mr-1.5" /> {newConditioningSession.id ? 'Update' : 'Save'}</Button>
                        </div>
                    </div>

                    {/* Meta Fields */}
                    <div data-tour="cond-meta-fields" className="bg-slate-50 dark:bg-[#0F1C30] p-4 rounded-xl border border-slate-100 dark:border-[#1A2D48] space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Session Name</label>
                                <input type="text" value={newConditioningSession.title} onChange={e => setNewConditioningSession(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. MAS 95% Aerobic Power" className={inputCls} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Modality</label>
                                <CustomSelect value={newConditioningSession.modality} onChange={e => setNewConditioningSession(prev => ({ ...prev, modality: e.target.value }))}>
                                    {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Total Duration</label>
                                <input type="text" value={newConditioningSession.totalDuration} onChange={e => setNewConditioningSession(prev => ({ ...prev, totalDuration: e.target.value }))} placeholder="e.g. 25 min" className={inputCls} />
                            </div>
                        </div>

                        {/* Energy System Selector */}
                        <div data-tour="cond-energy-system" className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Target Energy System</label>
                            <div className="grid grid-cols-4 gap-2">
                                {ENERGY_SYSTEMS.map(es => (
                                    <button key={es.value} onClick={() => setNewConditioningSession(prev => ({ ...prev, energySystem: es.value }))}
                                        className={`p-3 rounded-lg border text-left transition-all ${newConditioningSession.energySystem === es.value ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-600 ring-2 ring-indigo-500/20' : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] hover:border-slate-300'}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-2.5 h-2.5 rounded-full ${es.color}`} />
                                            <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{es.label}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{es.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Session Notes (optional)</label>
                            <textarea value={newConditioningSession.notes} onChange={e => setNewConditioningSession(prev => ({ ...prev, notes: e.target.value }))} placeholder="e.g. Athletes should be tested on MAS before this session. Stop set if rep drops below 90% target distance." rows={2} className={inputCls + ' resize-none'} />
                        </div>
                    </div>

                    {/* Sets */}
                    <div data-tour="cond-interval-sets" className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Interval Sets</h4>
                            <button onClick={addCondSet} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 transition-all"><PlusIcon size={13} /> Add Set</button>
                        </div>
                        <div className="space-y-2.5">
                            {newConditioningSession.sets.map((set, idx) => {
                                const wr = calcWorkRest(set.workDuration, set.restDuration);
                                return (
                                    <div key={set.id} className="bg-slate-50 dark:bg-[#0F1C30] p-4 rounded-xl border border-slate-200 dark:border-[#243A58] animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-bold text-slate-900 dark:text-[#E2E8F0]">SET {idx + 1}</span>
                                            <div className="flex items-center gap-1.5">
                                                {wr && <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold">W:R {wr}</span>}
                                                <button onClick={() => duplicateCondSet(set)} className="p-1.5 text-slate-300 dark:text-[#475569] hover:text-indigo-500 transition-all" title="Duplicate"><CopyIcon size={13} /></button>
                                                <button onClick={() => removeCondSet(set.id)} className="p-1.5 text-slate-300 dark:text-[#475569] hover:text-red-500 transition-all" title="Remove"><Trash2Icon size={13} /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-12 gap-3 items-end">
                                            <div className="col-span-1 space-y-1">
                                                <label className={labelCls}>Reps</label>
                                                <input type="text" value={set.reps} onChange={e => updateCondSet(set.id, 'reps', e.target.value)} placeholder="6" className={inputCls} />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className={labelCls}>Work Duration</label>
                                                <input type="text" value={set.workDuration} onChange={e => updateCondSet(set.id, 'workDuration', e.target.value)} placeholder="3:00 or 30s" className={inputCls} />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className={labelCls}>Distance (m)</label>
                                                <input type="text" value={set.workDistance} onChange={e => updateCondSet(set.id, 'workDistance', e.target.value)} placeholder="200" className={inputCls} />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className={labelCls}>Intensity Type</label>
                                                <CustomSelect value={set.intensityType} onChange={e => updateCondSet(set.id, 'intensityType', e.target.value)} size="sm">
                                                    {INTENSITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </CustomSelect>
                                            </div>
                                            <div className="col-span-1 space-y-1">
                                                <label className={labelCls}>Value</label>
                                                <input type="text" value={set.intensityValue} onChange={e => updateCondSet(set.id, 'intensityValue', e.target.value)} placeholder="95" className={inputCls} />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className={labelCls}>Rest (between reps)</label>
                                                <input type="text" value={set.restDuration} onChange={e => updateCondSet(set.id, 'restDuration', e.target.value)} placeholder="2:00" className={inputCls} />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className={labelCls}>Inter-set Rest</label>
                                                <input type="text" value={set.interSetRest} onChange={e => updateCondSet(set.id, 'interSetRest', e.target.value)} placeholder="3:00" className={inputCls} />
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <input type="text" value={set.notes || ''} onChange={e => updateCondSet(set.id, 'notes', e.target.value)} placeholder="Set notes (e.g. stop if rep drops below 90% target distance)" className="w-full bg-white dark:bg-[#132338] border border-slate-100 dark:border-[#1A2D48] rounded-lg px-2.5 py-1.5 text-xs text-slate-500 dark:text-[#CBD5E1] outline-none focus:border-indigo-300" />
                                        </div>
                                    </div>
                                );
                            })}
                            {newConditioningSession.sets.length === 0 && (
                                <div onClick={addCondSet} className="py-10 border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-[#CBD5E1] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-all">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-[#1A2D48] rounded-lg flex items-center justify-center"><PlusIcon size={20} /></div>
                                    <p className="text-xs font-medium">Click to add your first set</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Linked Sessions */}
                    <LinkedSessionsPicker
                        linked={newConditioningSession.linkedSessions || []}
                        onChange={ls => setNewConditioningSession(prev => ({ ...prev, linkedSessions: ls }))}
                        sources={[wattbikeSource, workoutTemplateSource]}
                    />
                </div>
            </div>
        );
    };

    const renderConditioningSessionDetail = () => {
        const session = selectedConditioningSession;
        if (!session) return null;
        const ec = energyColor(session.energySystem);
        const sysLabel = ENERGY_SYSTEMS.find(e => e.value === session.energySystem)?.label || session.energySystem;
        const vol = totalCondVolume(session);

        return (
            <div className="max-w-4xl mx-auto space-y-3 pb-10 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">{session.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${ec.badge}`}>{sysLabel}</span>
                            <span className="text-xs text-slate-400 dark:text-[#CBD5E1]">{session.modality}</span>
                            {session.totalDuration && <span className="text-xs text-slate-400 dark:text-[#CBD5E1]">· {session.totalDuration}</span>}
                            <span className="text-xs text-slate-400 dark:text-[#CBD5E1]">· {vol.totalReps} total reps</span>
                            {vol.totalWork > 0 && <span className="text-xs text-slate-400 dark:text-[#CBD5E1]">· {vol.totalWork}m total</span>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handlePrintCondSession(session)}><PrinterIcon size={13} className="mr-1.5" /> Print</Button>
                        <Button variant="secondary" size="sm" onClick={() => setScheduleOpen({ type: 'conditioning', session })}><CalendarPlusIcon size={13} className="mr-1.5" /> Schedule</Button>
                        <Button variant="secondary" size="sm" onClick={() => setConditioningView('grid')}>Back</Button>
                    </div>
                </div>
                {scheduleOpen?.type === 'conditioning' && renderScheduleInline()}
                {session.notes && (
                    <div className="bg-slate-50 dark:bg-[#0F1C30] px-5 py-3 rounded-xl border border-slate-200 dark:border-[#243A58] text-sm text-slate-600 dark:text-[#CBD5E1] italic">{session.notes}</div>
                )}
                <div className="space-y-2">
                    {(session.sets || []).map((set, idx) => {
                        const wr = calcWorkRest(set.workDuration, set.restDuration);
                        return (
                            <div key={set.id || idx} className={`${ec.bg} ${ec.border} border rounded-xl p-4 shadow-sm`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white shrink-0 ${ec.accent}`}>S{idx + 1}</div>
                                    <div className="flex-1 flex flex-wrap items-center gap-6">
                                        <div className="flex flex-col"><span className="text-[9px] text-slate-700 dark:text-[#E2E8F0] uppercase">Reps</span><span className={`text-base font-bold ${ec.text}`}>{set.reps || '—'}</span></div>
                                        <div className="flex flex-col"><span className="text-[9px] text-slate-700 dark:text-[#E2E8F0] uppercase">Work</span><span className={`text-base font-bold ${ec.text}`}>{set.workDuration || '—'}{set.workDistance ? ` / ${set.workDistance}m` : ''}</span></div>
                                        <div className="flex flex-col"><span className="text-[9px] text-slate-700 dark:text-[#E2E8F0] uppercase">Intensity</span><span className={`text-base font-bold ${ec.text}`}>{set.intensityValue || '—'} {set.intensityType || ''}</span></div>
                                        <div className="flex flex-col"><span className="text-[9px] text-slate-700 dark:text-[#E2E8F0] uppercase">Rest</span><span className={`text-base font-bold ${ec.text}`}>{set.restDuration || '—'}</span></div>
                                        {wr && <div className="flex flex-col"><span className="text-[9px] text-slate-700 dark:text-[#E2E8F0] uppercase">W:R</span><span className={`text-base font-bold ${ec.text}`}>{wr}</span></div>}
                                        {set.interSetRest && <div className="flex flex-col"><span className="text-[9px] text-slate-700 dark:text-[#E2E8F0] uppercase">Inter-set</span><span className={`text-base font-bold ${ec.text}`}>{set.interSetRest}</span></div>}
                                    </div>
                                </div>
                                {set.notes && <div className={`mt-2 ml-11 text-xs italic ${ec.text} opacity-60`}>{set.notes}</div>}
                            </div>
                        );
                    })}
                </div>
                {session.linkedSessions?.length > 0 && (
                    <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-2">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Linked Sessions</h4>
                        <div className="flex flex-wrap gap-2">
                            {session.linkedSessions.map(l => {
                                const src = [wattbikeSource, conditioningSource, workoutTemplateSource].find(s => s.key === l.source);
                                return (
                                    <div key={l.id} className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center ${src?.color || 'bg-slate-100 dark:bg-[#1A2D48]'} ${src?.textColor || 'text-slate-500 dark:text-[#CBD5E1]'}`}>{src?.icon}</div>
                                        <div><span className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">{l.title}</span>{l.meta && <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] ml-1.5">{l.meta}</span>}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderWattbikeSessionCreator = () => {
        const addSection = () => { setNewWattbikeSession(prev => ({ ...prev, sections: [...prev.sections, { id: 's' + Date.now(), name: '', duration: '', target: '', rpm: '', resistance: '', type: 'Power', rounds: '', subSections: [] }] })); };
        const addSubSection = (sectionId) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.map(s => s.id === sectionId ? { ...s, subSections: [...(s.subSections || []), { id: 'ss' + Date.now(), label: 'Work', duration: '', rpm: '', resistance: '' }] } : s) })); };
        const removeSubSection = (sectionId, subId) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.map(s => s.id === sectionId ? { ...s, subSections: s.subSections.filter(ss => ss.id !== subId) } : s) })); };
        const updateSubSection = (sectionId, subId, field, value) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.map(s => s.id === sectionId ? { ...s, subSections: s.subSections.map(ss => ss.id === subId ? { ...ss, [field]: value } : ss) } : s) })); };
        const removeSection = (id) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== id) })); };
        const updateSection = (id, field, value) => { setNewWattbikeSession(prev => ({ ...prev, sections: prev.sections.map(s => s.id === id ? { ...s, [field]: value } : s) })); };
        const handleSaveSession = () => {
            if (!newWattbikeSession.title) { showToast("Please enter a session title."); return; }
            let updatedSessions;
            const isEdit = !!newWattbikeSession.id;
            if (isEdit) {
                updatedSessions = wattbikeSessions.map(s => s.id === newWattbikeSession.id ? { ...newWattbikeSession, icon: newWattbikeSession.type === 'Power' ? 'Zap' : 'Activity' } : s);
            } else {
                updatedSessions = [{ ...newWattbikeSession, id: 'ws_' + Date.now(), icon: newWattbikeSession.type === 'Power' ? 'Zap' : 'Activity' }, ...wattbikeSessions];
            }
            setWattbikeSessions(updatedSessions);
            if (StorageService && StorageService.saveWattbikeSessions) StorageService.saveWattbikeSessions(updatedSessions);
            setWattbikeView('grid');
            setNewWattbikeSession({ title: '', duration: '', type: 'Conditioning', sections: [], linkedSessions: [] });
            showToast(isEdit ? "Session updated" : "Session created", 'success');
        };
        return (
            <div className="max-w-4xl mx-auto pb-10 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">{newWattbikeSession.id ? 'Edit Session' : 'Create New Session'}</h3>
                            <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Configure performance protocol parameters</p>
                        </div>
                        <div className="flex gap-2.5">
                            <Button variant="secondary" size="sm" onClick={() => { setWattbikeView('grid'); setNewWattbikeSession({ title: '', duration: '', type: 'Conditioning', sections: [], linkedSessions: [] }); }}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveSession}><SaveIcon size={13} className="mr-1.5" /> {newWattbikeSession.id ? 'Update' : 'Save'}</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-[#0F1C30] p-4 rounded-xl border border-slate-100 dark:border-[#1A2D48]">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Session Name</label>
                            <input type="text" value={newWattbikeSession.title} onChange={(e) => setNewWattbikeSession(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Multi-System Top Up" className="w-full bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">Total Duration</label>
                            <input type="text" value={newWattbikeSession.duration} onChange={(e) => setNewWattbikeSession(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g. 40 min" className="w-full bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Session Sections</h4>
                            <button onClick={addSection} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 transition-all"><PlusIcon size={13} /> Add Section</button>
                        </div>
                        <div className="space-y-2.5">
                            {newWattbikeSession.sections.map((section, idx) => (
                                <div key={section.id} className="bg-slate-50 dark:bg-[#0F1C30] p-4 rounded-xl border border-slate-200 dark:border-[#243A58] animate-in slide-in-from-bottom-2">
                                    <div className="grid grid-cols-12 gap-3 items-end">
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0]">Type</label>
                                            <CustomSelect value={section.type} onChange={(e) => updateSection(section.id, 'type', e.target.value)} size="sm">
                                                <option value="Power">Power</option>
                                                <option value="Rest">Rest</option>
                                                <option value="Max">Max Effort</option>
                                                <option value="Interval">Interval</option>
                                            </CustomSelect>
                                        </div>
                                        <div className={`${section.type === 'Interval' ? 'col-span-5' : 'col-span-3'} space-y-1.5`}>
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0]">Label</label>
                                            <input type="text" value={section.name} onChange={(e) => updateSection(section.id, 'name', e.target.value)} placeholder="e.g. Warm up" className="w-full bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-lg px-2.5 py-2 text-xs outline-none" />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0]">Duration</label>
                                            <input type="text" value={section.duration} onChange={(e) => updateSection(section.id, 'duration', e.target.value)} placeholder="5:00" className="w-full bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-lg px-2.5 py-2 text-xs outline-none" />
                                        </div>
                                        <div className="col-span-2 space-y-1.5">
                                            <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0]">{section.type === 'Interval' ? 'Sets/Rounds' : 'RPM'}</label>
                                            <input type="text" value={section.type === 'Interval' ? (section.rounds || '') : (section.rpm || '')} onChange={(e) => updateSection(section.id, section.type === 'Interval' ? 'rounds' : 'rpm', e.target.value)} placeholder={section.type === 'Interval' ? "8" : "70-75"} className="w-full bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-lg px-2.5 py-2 text-xs outline-none" />
                                        </div>
                                        {section.type !== 'Interval' && (
                                            <div className="col-span-2 space-y-1.5">
                                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0]">Resistance</label>
                                                <input type="text" value={section.resistance} onChange={(e) => updateSection(section.id, 'resistance', e.target.value)} placeholder="F2" className="w-full bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-lg px-2.5 py-2 text-xs outline-none" />
                                            </div>
                                        )}
                                        <div className="col-span-1 flex justify-center pb-1">
                                            <button onClick={() => removeSection(section.id)} className="p-1.5 text-slate-300 dark:text-[#475569] hover:text-red-500 transition-all"><Trash2Icon size={14} /></button>
                                        </div>
                                    </div>
                                    {section.type === 'Interval' && (
                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#243A58] space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0]">Interval Sub-sections</h5>
                                                <button onClick={() => addSubSection(section.id)} className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 transition-all"><PlusIcon size={10} /> Add Sub-segment</button>
                                            </div>
                                            <div className="space-y-1.5">
                                                {Array.isArray(section.subSections) && section.subSections.map((ss) => (
                                                    <div key={ss.id} className="grid grid-cols-12 gap-2 items-end bg-white dark:bg-[#132338] p-2.5 rounded-lg border border-slate-100 dark:border-[#1A2D48]">
                                                        <div className="col-span-3 space-y-1"><label className="text-[9px] font-medium text-slate-700 dark:text-[#E2E8F0]">Label</label><input type="text" value={ss.label} onChange={(e) => updateSubSection(section.id, ss.id, 'label', e.target.value)} placeholder="Work" className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#1A2D48] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-md px-2 py-1.5 text-xs outline-none" /></div>
                                                        <div className="col-span-3 space-y-1"><label className="text-[9px] font-medium text-slate-700 dark:text-[#E2E8F0]">Duration</label><input type="text" value={ss.duration} onChange={(e) => updateSubSection(section.id, ss.id, 'duration', e.target.value)} placeholder="30s" className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#1A2D48] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-md px-2 py-1.5 text-xs outline-none" /></div>
                                                        <div className="col-span-2 space-y-1"><label className="text-[9px] font-medium text-slate-700 dark:text-[#E2E8F0]">RPM</label><input type="text" value={ss.rpm} onChange={(e) => updateSubSection(section.id, ss.id, 'rpm', e.target.value)} placeholder="90-95" className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#1A2D48] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-md px-2 py-1.5 text-xs outline-none" /></div>
                                                        <div className="col-span-2 space-y-1"><label className="text-[9px] font-medium text-slate-700 dark:text-[#E2E8F0]">Resistance</label><input type="text" value={ss.resistance} onChange={(e) => updateSubSection(section.id, ss.id, 'resistance', e.target.value)} placeholder="F8" className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#1A2D48] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-md px-2 py-1.5 text-xs outline-none" /></div>
                                                        <div className="col-span-2 flex justify-center pb-0.5"><button onClick={() => removeSubSection(section.id, ss.id)} className="p-1.5 text-slate-200 hover:text-red-400 transition-all"><Trash2Icon size={12} /></button></div>
                                                    </div>
                                                ))}
                                                {(!section.subSections || section.subSections.length === 0) && (
                                                    <div className="py-3 border border-dashed border-slate-200 dark:border-[#243A58] rounded-lg flex items-center justify-center text-xs text-slate-400 dark:text-[#CBD5E1]">No sub-segments defined</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {newWattbikeSession.sections.length === 0 && (
                                <div onClick={addSection} className="py-10 border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 dark:text-[#CBD5E1] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-all">
                                    <div className="w-10 h-10 bg-slate-100 dark:bg-[#1A2D48] rounded-lg flex items-center justify-center"><PlusIcon size={20} /></div>
                                    <p className="text-xs font-medium">Click to add your first segment</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Linked Sessions */}
                    <LinkedSessionsPicker
                        linked={newWattbikeSession.linkedSessions || []}
                        onChange={ls => setNewWattbikeSession(prev => ({ ...prev, linkedSessions: ls }))}
                        sources={[conditioningSource, workoutTemplateSource]}
                    />
                </div>
            </div>
        );
    };

    const handlePrintSession = (session) => {
        const sectionColor = (s) => {
            const isRest = s.type === 'Rest' || s.name?.toLowerCase().includes('warm') || s.name?.toLowerCase().includes('recovery') || s.name?.toLowerCase().includes('cool');
            const isInterval = s.type === 'Interval' || s.type === 'Max';
            if (isRest) return { border: '#10b981', bg: '#f0fdf4', text: '#065f46' };
            if (isInterval) return { border: '#f43f5e', bg: '#fff1f2', text: '#9f1239' };
            return { border: '#f59e0b', bg: '#fffbeb', text: '#78350f' };
        };

        const sectionsHtml = (session.sections || []).map((s, idx) => {
            const col = sectionColor(s);
            const subsHtml = (s.subSections && s.subSections.length > 0)
                ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.08);margin-left:44px;">
                    ${s.subSections.map(ss => `
                      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:4px 0;color:${col.text};opacity:0.8;">
                        <span style="min-width:70px">${ss.label || 'WORK'}</span>
                        <span style="min-width:50px">${ss.duration}</span>
                        <span style="min-width:80px">${ss.rpm ? ss.rpm + ' RPM' : ''}</span>
                        <span>${ss.resistance || ''}</span>
                      </div>`).join('')}
                  </div>`
                : '';
            return `
              <div style="margin-bottom:10px;padding:14px 16px;border-radius:10px;border-left:5px solid ${col.border};background:${col.bg};page-break-inside:avoid;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="width:28px;height:28px;border-radius:6px;background:#1e293b;color:white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;flex-shrink:0;">${idx + 1}</div>
                  <div style="flex:1;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                    <div>
                      <div style="font-size:17px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:${col.text}">${s.duration} &nbsp; ${s.name || (s.type === 'Interval' ? 'INTERVAL BLOCK' : 'SEGMENT')}${s.type === 'Interval' && s.rounds ? ` <span style="font-size:11px;opacity:0.5">(${s.rounds} rounds)</span>` : ''}</div>
                    </div>
                    <div style="display:flex;gap:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${col.text};opacity:0.75;">
                      ${s.rpm ? `<span>${s.rpm} RPM</span>` : ''}
                      ${s.resistance ? `<span>${s.resistance}</span>` : ''}
                      ${s.target && !s.rpm ? `<span>${s.target}</span>` : ''}
                    </div>
                  </div>
                </div>
                ${subsHtml}
              </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html><head><title>Wattbike: ${session.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; margin: 32px 40px; color: #1e293b; background: white; }
  h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 6px; }
  .meta { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9; }
  @media print { @page { margin: 20mm; } }
</style>
</head><body>
<h1>${session.title}</h1>
<div class="meta">Total Duration: ${session.duration} &nbsp;·&nbsp; ${(session.sections || []).length} Sections</div>
${sectionsHtml}
</body></html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            setTimeout(() => { w.print(); }, 300);
        }
    };

    const renderWattbikeSessionDetail = () => {
        const session = selectedWattbikeSession;
        if (!session) return null;
        return (
            <div className="max-w-4xl mx-auto space-y-3 pb-10 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">{session.title}</h3>
                        <div className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Total duration: {session.duration}</div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handlePrintSession(session)}><PrinterIcon size={13} className="mr-1.5" /> Print</Button>
                        <Button variant="secondary" size="sm" onClick={() => setScheduleOpen({ type: 'wattbike', session })}><CalendarPlusIcon size={13} className="mr-1.5" /> Schedule</Button>
                        <Button variant="secondary" size="sm" onClick={() => setWattbikeView('grid')}>Back</Button>
                    </div>
                </div>
                {scheduleOpen?.type === 'wattbike' && renderScheduleInline()}
                <div className="space-y-2">
                    {Array.isArray(session.sections) && session.sections.map((section, idx) => {
                        const isWarmup = section.name?.toLowerCase().includes('warm') || section.name?.toLowerCase().includes('recovery');
                        const isRest = section.type === 'Rest';
                        const isInterval = section.type === 'Interval' || section.type === 'Max';
                        let cardColor = 'bg-amber-50/80 dark:bg-amber-600/15 border-amber-100 dark:border-amber-800/40';
                        let markerColor = 'bg-amber-500';
                        let textColor = 'text-amber-900 dark:text-amber-200';
                        if (isWarmup || isRest) { cardColor = 'bg-emerald-50/80 dark:bg-emerald-600/15 border-emerald-100 dark:border-emerald-800/40'; markerColor = 'bg-emerald-500'; textColor = 'text-emerald-900 dark:text-emerald-200'; }
                        else if (isInterval) { cardColor = 'bg-rose-50/80 dark:bg-rose-700/15 border-rose-100 dark:border-rose-900/40'; markerColor = 'bg-rose-500'; textColor = 'text-rose-900 dark:text-rose-200'; }
                        return (
                            <div key={section.id} className={`${cardColor} border rounded-xl p-4 shadow-sm print:shadow-none print:border-slate-200 break-inside-avoid`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white shrink-0 ${markerColor}`}>{idx + 1}</div>
                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <span className={`text-base font-semibold min-w-[60px] ${textColor}`}>{section.duration}</span>
                                            <h5 className={`text-base font-semibold ${textColor}`}>{section.name || (section.type === 'Interval' ? 'Interval Block' : 'Session Segment')}{section.type === 'Interval' && section.rounds && (<span className="ml-2 opacity-50 text-sm font-normal">({section.rounds} rounds)</span>)}</h5>
                                        </div>
                                        <div className={`flex items-center gap-6 text-xs font-medium ${textColor} opacity-70`}>
                                            {section.rpm && (<div className="flex flex-col items-end"><span className="text-[9px] opacity-50">Target Intensity</span><span>{section.rpm} RPM</span></div>)}
                                            {section.resistance && (<div className="flex flex-col items-end"><span className="text-[9px] opacity-50">Fan Resistance</span><span>{section.resistance}</span></div>)}
                                        </div>
                                    </div>
                                </div>
                                {section.type === 'Interval' && Array.isArray(section.subSections) && section.subSections.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-900/50 ml-11 space-y-1.5">
                                        {section.subSections.map((ss, ssIdx) => (
                                            <div key={ss.id} className="flex items-center justify-between text-xs text-rose-800/80 dark:text-rose-300/80">
                                                <div className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /><span className="min-w-[70px] font-medium text-rose-600 dark:text-rose-300">{ss.label || (ssIdx % 2 === 0 ? 'Work' : 'Rest')}</span><span className="min-w-[50px]">{ss.duration}</span></div>
                                                <div className="flex items-center gap-5 opacity-60"><span>{ss.rpm} RPM</span><span className="min-w-[30px] text-right">{ss.resistance}</span></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {session.linkedSessions?.length > 0 && (
                    <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-2">
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Linked Sessions</h4>
                        <div className="flex flex-wrap gap-2">
                            {session.linkedSessions.map(l => {
                                const src = [wattbikeSource, conditioningSource, workoutTemplateSource].find(s => s.key === l.source);
                                return (
                                    <div key={l.id} className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2">
                                        <div className={`w-5 h-5 rounded flex items-center justify-center ${src?.color || 'bg-slate-100 dark:bg-[#1A2D48]'} ${src?.textColor || 'text-slate-500 dark:text-[#CBD5E1]'}`}>{src?.icon}</div>
                                        <div><span className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">{l.title}</span>{l.meta && <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] ml-1.5">{l.meta}</span>}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header — only show when no module active */}
            {!activeConditioningModule && (
                <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-[#E2E8F0]">Conditioning</h2>
                    <p className="text-sm text-slate-500 dark:text-[#CBD5E1] mt-0.5">Performance conditioning monitoring & Wattbike protocols.</p>
                </div>
            )}

            {/* Modules Grid */}
            {!activeConditioningModule && isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2].map(i => (
                        <div key={i} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5 space-y-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-[#1A2D48] rounded-lg animate-pulse" />
                            <div className="h-4 w-32 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" />
                            <div className="h-3 w-full bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                            <div className="h-3 w-2/3 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                        </div>
                    ))}
                    <div className="col-span-full flex flex-col items-center py-4">
                        <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin mb-2" />
                        <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading conditioning data...</span>
                    </div>
                </div>
            )}
            {!activeConditioningModule && !isLoading && (
                <div data-tour="conditioning-main" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                        onClick={() => setActiveConditioningModule('wattbike')}
                        data-tour="conditioning-card-wattbike"
                        className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm hover:shadow-md hover:border-indigo-200 dark:border-indigo-800/50 transition-all overflow-hidden cursor-pointer group p-5 space-y-3"
                    >
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/15 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 dark:group-hover:text-white transition-all">
                            <ActivityIcon size={20} />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">Wattbike Hub</h3>
                        <p className="text-sm text-slate-500 dark:text-[#CBD5E1] leading-relaxed">High-fidelity Wattbike power profiling and protocol management.</p>
                    </div>
                    <div
                        onClick={() => setActiveConditioningModule('conditioning')}
                        data-tour="conditioning-card-sessions"
                        className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm hover:shadow-md hover:border-cyan-200 dark:border-cyan-800/50 transition-all overflow-hidden cursor-pointer group p-5 space-y-3"
                    >
                        <div className="w-10 h-10 bg-cyan-50 dark:bg-cyan-500/15 rounded-lg flex items-center justify-center text-cyan-600 dark:text-cyan-300 group-hover:bg-cyan-600 group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-white transition-all">
                            <TimerIcon size={20} />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">Conditioning Sessions</h3>
                        <p className="text-sm text-slate-500 dark:text-[#CBD5E1] leading-relaxed">Prescribe running, bike & sled sessions with sets, reps, intensity & work:rest ratios.</p>
                    </div>
                </div>
            )}

            {/* Wattbike Hub */}
            {activeConditioningModule === 'wattbike' && (
                <div className="space-y-5 animate-in slide-in-from-bottom-3">
                    {/* Hub Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                                <ActivityIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Wattbike Session Planner</h3>
                                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Plan, manage & print conditioning sessions</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Button size="sm" onClick={() => setIsWattbikeMapCalculatorOpen(true)}>
                                <CalculatorIcon size={13} className="mr-1.5" /> MAP Calculator
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => {
                                if (wattbikeView === 'grid') setActiveConditioningModule(null);
                                else { setWattbikeView('grid'); setNewWattbikeSession({ title: '', duration: '', type: 'Conditioning', sections: [], linkedSessions: [] }); }
                            }}>
                                {wattbikeView === 'grid' ? 'Back to Hub' : 'Back to List'}
                            </Button>
                        </div>
                    </div>

                    {wattbikeView === 'grid' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center gap-3 flex-wrap">
                                <h4 className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1]">
                                    Session Repository
                                    <span className="text-xs text-slate-400 dark:text-[#94A3B8] ml-2 font-normal">({filteredWattbikeSessions.length} of {wattbikeSessions.length})</span>
                                </h4>
                                <div className="flex items-center gap-2">
                                    <div className="relative w-full sm:w-64">
                                        <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#94A3B8]" />
                                        <input
                                            type="text"
                                            value={wattbikeSearch}
                                            onChange={e => setWattbikeSearch(e.target.value)}
                                            placeholder="Search sessions…"
                                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#94A3B8] rounded-lg text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                                        />
                                    </div>
                                    <Button size="sm" onClick={() => setWattbikeView('create')}>
                                        <PlusIcon size={13} className="mr-1.5" /> Add Session
                                    </Button>
                                </div>
                            </div>

                            {wattbikeSearchResult.hasFuzzyResults && filteredWattbikeSessions.length > 0 && (
                                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30 text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide rounded-lg">
                                    Showing closest matches for "{wattbikeSearch}"
                                </div>
                            )}

                            {filteredWattbikeSessions.length === 0 && wattbikeSearch && (
                                <div className="text-center py-8">
                                    <p className="text-sm text-slate-400 dark:text-[#CBD5E1]">No Wattbike sessions match "{wattbikeSearch}"</p>
                                    {wattbikeSearchResult.suggestions.length > 0 && (
                                        <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">
                                            Did you mean <button onClick={() => setWattbikeSearch(wattbikeSearchResult.suggestions[0].name)} className="font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200 underline">{wattbikeSearchResult.suggestions[0].name}</button>?
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Skeleton (Phase 2): wattbike sessions are background-tier —
                                mirror the real session-card grid while they load */}
                            {isSecondaryLoading && wattbikeSessions.length === 0 && (
                                <SkTileGrid count={4} />
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredWattbikeSessions.map(session => (
                                    <div
                                        key={session.id}
                                        onClick={() => { setSelectedWattbikeSession(session); setWattbikeView('view'); }}
                                        className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm hover:shadow-md hover:border-indigo-200 dark:border-indigo-800/50 transition-all overflow-hidden flex flex-col p-5 space-y-4 group cursor-pointer"
                                    >
                                        <div className="flex justify-end items-start">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#1A2D48] rounded-md text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">{session.type}</span>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{session.title}</h4>
                                            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-[#CBD5E1]">
                                                <span className="flex items-center gap-1"><ClockIcon size={11} /> {session.duration}</span>
                                                <span>·</span>
                                                <span>{Array.isArray(session.sections) ? session.sections.length : (session.sectionsCount || 0)} sections</span>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 dark:border-[#1A2D48] flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1 text-xs"
                                                onClick={(e) => { e.stopPropagation(); setSelectedWattbikeSession(session); setWattbikeView('view'); }}
                                            >
                                                View Session
                                            </Button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setNewWattbikeSession(session); setWattbikeView('create'); }}
                                                className="p-2 bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1] rounded-lg hover:bg-indigo-50 dark:hover:bg-[#1A2D48] hover:text-slate-700 dark:hover:text-[#CBD5E1] transition-all"
                                                title="Edit Session"
                                            >
                                                <FileEditIcon size={15} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteWattbike({ id: session.id, title: session.title });
                                                }}
                                                className="p-2 bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1] rounded-lg hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-500 dark:hover:text-red-400 transition-all"
                                                title="Delete Session"
                                            >
                                                <Trash2Icon size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {wattbikeView === 'view' && selectedWattbikeSession && renderWattbikeSessionDetail()}
                    {wattbikeView === 'create' && renderWattbikeSessionCreator()}
                </div>
            )}


            {/* Conditioning Sessions Hub */}
            {activeConditioningModule === 'conditioning' && (
                <div className="space-y-5 animate-in slide-in-from-bottom-3">
                    {/* Hub Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center text-white shrink-0">
                                <TimerIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Conditioning Session Planner</h3>
                                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Create interval prescriptions with energy system targeting</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <Button variant="secondary" size="sm" onClick={() => {
                                if (conditioningView === 'grid') setActiveConditioningModule(null);
                                else { setConditioningView('grid'); setNewConditioningSession({ ...emptyConditioningSession }); }
                            }}>
                                {conditioningView === 'grid' ? 'Back to Hub' : 'Back to List'}
                            </Button>
                        </div>
                    </div>

                    {conditioningView === 'grid' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center gap-3 flex-wrap">
                                <h4 className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1]">
                                    Session Repository
                                    <span className="text-xs text-slate-400 dark:text-[#94A3B8] ml-2 font-normal">
                                        ({conditioningSearch ? `${filteredConditioningSessions.length} of ${conditioningSessions.length}` : conditioningSessions.length})
                                    </span>
                                </h4>
                                <div className="flex items-center gap-2">
                                    {/* Search is hidden for tiny libraries to avoid empty-input clutter — appears once the user has built up a meaningful collection. */}
                                    {conditioningSessions.length >= 5 && (
                                        <div className="relative w-full sm:w-64">
                                            <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#94A3B8]" />
                                            <input
                                                type="text"
                                                value={conditioningSearch}
                                                onChange={e => setConditioningSearch(e.target.value)}
                                                placeholder="Search sessions…"
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#94A3B8] rounded-lg text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition-all"
                                            />
                                        </div>
                                    )}
                                    <Button size="sm" onClick={() => setConditioningView('create')}>
                                        <PlusIcon size={13} className="mr-1.5" /> Add Session
                                    </Button>
                                </div>
                            </div>

                            {conditioningSearchResult.hasFuzzyResults && filteredConditioningSessions.length > 0 && (
                                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30 text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide rounded-lg">
                                    Showing closest matches for "{conditioningSearch}"
                                </div>
                            )}

                            {conditioningSessions.length === 0 && (
                                <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-dashed border-slate-200 dark:border-[#243A58] py-16 flex flex-col items-center justify-center gap-3">
                                    <div className="w-14 h-14 bg-slate-100 dark:bg-[#1A2D48] rounded-xl flex items-center justify-center"><TimerIcon size={24} className="text-slate-300 dark:text-[#475569]" /></div>
                                    <p className="text-sm text-slate-400 dark:text-[#CBD5E1] font-medium">No conditioning sessions yet</p>
                                    <Button size="sm" onClick={() => setConditioningView('create')}><PlusIcon size={13} className="mr-1.5" /> Create Your First Session</Button>
                                </div>
                            )}

                            {conditioningSessions.length > 0 && filteredConditioningSessions.length === 0 && conditioningSearch && (
                                <div className="text-center py-8">
                                    <p className="text-sm text-slate-400 dark:text-[#CBD5E1]">No sessions match "{conditioningSearch}"</p>
                                    {conditioningSearchResult.suggestions.length > 0 && (
                                        <p className="text-xs text-slate-400 dark:text-[#94A3B8] mt-1">
                                            Did you mean <button onClick={() => setConditioningSearch(conditioningSearchResult.suggestions[0].name)} className="font-semibold text-indigo-500 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200 underline">{conditioningSearchResult.suggestions[0].name}</button>?
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Skeleton (Phase 2): conditioning sessions are background-tier */}
                            {isSecondaryLoading && conditioningSessions.length === 0 && (
                                <SkTileGrid count={4} />
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredConditioningSessions.map(session => {
                                    const ec = energyColor(session.energySystem);
                                    const sysLabel = ENERGY_SYSTEMS.find(e => e.value === session.energySystem)?.label?.split('/')[0]?.trim() || session.energySystem;
                                    const vol = totalCondVolume(session);
                                    return (
                                        <div key={session.id} onClick={() => { setSelectedConditioningSession(session); setConditioningView('view'); }}
                                            className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm hover:shadow-md hover:border-cyan-200 transition-all overflow-hidden flex flex-col p-5 space-y-4 group cursor-pointer">
                                            <div className="flex justify-between items-start">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ec.bg} ${ec.text} group-hover:scale-105 transition-transform`}>
                                                    <TimerIcon size={20} />
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${ec.badge}`}>{sysLabel}</span>
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{session.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-[#CBD5E1] flex-wrap">
                                                    <span>{session.modality}</span>
                                                    {session.totalDuration && <><span>·</span><span className="flex items-center gap-1"><ClockIcon size={11} /> {session.totalDuration}</span></>}
                                                    <span>·</span>
                                                    <span>{session.sets?.length || 0} sets · {vol.totalReps} reps</span>
                                                </div>
                                            </div>
                                            <div className="pt-3 border-t border-slate-100 dark:border-[#1A2D48] flex gap-2">
                                                <Button size="sm" className="flex-1 text-xs" onClick={e => { e.stopPropagation(); setSelectedConditioningSession(session); setConditioningView('view'); }}>View</Button>
                                                <button onClick={e => { e.stopPropagation(); setNewConditioningSession(session); setConditioningView('create'); }}
                                                    className="p-2 bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1] rounded-lg hover:bg-indigo-50 dark:hover:bg-[#1A2D48] hover:text-slate-700 dark:hover:text-[#CBD5E1] transition-all" title="Edit">
                                                    <FileEditIcon size={15} />
                                                </button>
                                                <button onClick={e => {
                                                    e.stopPropagation();
                                                    setConfirmDeleteCond({ id: session.id, title: session.title });
                                                }} className="p-2 bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1] rounded-lg hover:bg-red-50 dark:hover:bg-red-500/15 hover:text-red-500 dark:hover:text-red-400 transition-all" title="Delete">
                                                    <Trash2Icon size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {conditioningView === 'view' && selectedConditioningSession && renderConditioningSessionDetail()}
                    {conditioningView === 'create' && renderConditioningSessionCreator()}
                </div>
            )}

            {activeConditioningModule === 'metabolic' && (
                <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-6 animate-in slide-in-from-bottom-3">
                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-[#1A2D48] pb-5">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm"><ActivityIcon size={20} /></div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Metabolic Profiles</h3>
                            <p className="text-sm text-slate-400 dark:text-[#CBD5E1]">Lactate Threshold & Physiological Monitoring</p>
                        </div>
                    </div>
                    <div className="text-center py-16"><p className="text-slate-400 dark:text-[#CBD5E1] text-sm italic">Module coming soon...</p></div>
                </div>
            )}

            {/* ── Confirm delete modals ── */}
            <ConfirmDeleteModal
                isOpen={!!confirmDeleteWattbike}
                title="Delete Wattbike Session"
                message={`Delete "${confirmDeleteWattbike?.title}"?`}
                onConfirm={() => {
                    setWattbikeSessions(prev => {
                        const filtered = prev.filter(s => s.id !== confirmDeleteWattbike.id);
                        if (StorageService.saveWattbikeSessions) StorageService.saveWattbikeSessions(filtered);
                        return filtered;
                    });
                    showToast(`"${confirmDeleteWattbike.title}" deleted`, 'success');
                    setConfirmDeleteWattbike(null);
                }}
                onCancel={() => setConfirmDeleteWattbike(null)}
            />
            <ConfirmDeleteModal
                isOpen={!!confirmDeleteCond}
                title="Delete Conditioning Session"
                message={`Delete "${confirmDeleteCond?.title}"?`}
                onConfirm={() => {
                    setConditioningSessions(prev => {
                        const filtered = prev.filter(s => s.id !== confirmDeleteCond.id);
                        StorageService.saveConditioningSessions(filtered);
                        return filtered;
                    });
                    showToast(`"${confirmDeleteCond.title}" deleted`, 'success');
                    setConfirmDeleteCond(null);
                }}
                onCancel={() => setConfirmDeleteCond(null)}
            />
        </div>
    );
};
