// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';
import {
    ChevronLeft, ChevronRight, Plus, Trash2, PencilIcon,
    Check, X, LinkIcon, Clock, CalendarDays,
    Dumbbell, Activity, Target, Heart, Zap,
} from 'lucide-react';
import { formatDateShort } from '../../utils/periodizationUtils';
import { CustomSelect } from '../ui/CustomSelect';

// ── Constants ──────────────────────────────────────────────────────────────────
const MONTHS       = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS         = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const LOAD_OPTIONS = ['Low', 'Moderate', 'High', 'Very High'];

const LOAD_COLOR = {
    Low:        'bg-green-400',
    Moderate:   'bg-yellow-400',
    High:       'bg-orange-400',
    'Very High':'bg-red-400',
};
const LOAD_PILL = {
    Low:        'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    Moderate:   'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
    High:       'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    'Very High':'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};
const LOAD_BAR_HEIGHT = { Low: 25, Moderate: 48, High: 70, 'Very High': 90 };

// Modality → icon + color pill
const MODALITY_META = {
    'Strength':     { icon: Dumbbell,  color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
    'Loaded Power': { icon: Dumbbell,  color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' },
    'Plyometrics':  { icon: Zap,       color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
    'Speed':        { icon: Activity,  color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' },
    'Conditioning': { icon: Activity,  color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' },
    'Tactical':     { icon: Target,    color: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' },
    'Mobility':     { icon: Heart,     color: 'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' },
};
const DEFAULT_MODALITY = { icon: Activity, color: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]' };

function modalityMeta(mod) { return MODALITY_META[mod] || DEFAULT_MODALITY; }

// ── Date helpers ───────────────────────────────────────────────────────────────
function dayDate(weekStartStr, offset) {
    const d = new Date(weekStartStr + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    return d;
}

function daysBetween(a, b) {
    if (!a || !b) return 0;
    return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function getWeeks(startStr, endStr) {
    if (!startStr || !endStr) return [];
    const weeks = [];
    const start = new Date(startStr + 'T12:00:00');
    const end   = new Date(endStr   + 'T12:00:00');
    const dow   = start.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    let n = 1;
    while (start <= end) {
        weeks.push({ date: start.toISOString().split('T')[0], month: start.toLocaleString('default', { month: 'short' }), year: start.getFullYear(), weekNum: n++ });
        start.setDate(start.getDate() + 7);
    }
    return weeks;
}

const EMPTY_SESSION = { name: '', load: '', modality: '', duration: '' };

// ── Main component ─────────────────────────────────────────────────────────────
export const MicrocyclesTab = ({ plan, initialPhaseId = null, initialBlockId = null }) => {
    const navigate = useNavigate();
    const { handleUpdatePlanWeek, handleAddPlanSession, handleUpdatePlanSession, handleDeletePlanSession } = useAppState();
    const ganttRef = useRef(null);

    const [selPhaseId, setSelPhaseId] = useState(initialPhaseId || plan.phases[0]?.id || '');
    const [selBlockId, setSelBlockId] = useState(initialBlockId || '');
    const [weekIdx, setWeekIdx]       = useState(0);

    const [editingWeekId,    setEditingWeekId]    = useState(null);
    const [editWeekIntent,   setEditWeekIntent]   = useState('');
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editSD,           setEditSD]           = useState(EMPTY_SESSION);
    const [addingDate,       setAddingDate]       = useState(null);
    const [newSD,            setNewSD]            = useState(EMPTY_SESSION);

    // Sync jump from Periods tab
    useEffect(() => {
        if (initialPhaseId) setSelPhaseId(initialPhaseId);
        if (initialBlockId) setSelBlockId(initialBlockId);
        setWeekIdx(0);
    }, [initialPhaseId, initialBlockId]);

    const selPhase = plan.phases.find(ph => ph.id === selPhaseId);

    useEffect(() => {
        if (selPhase) {
            const hasCurrent = selPhase.blocks.find(b => b.id === selBlockId);
            if (!hasCurrent) { setSelBlockId(selPhase.blocks[0]?.id || ''); setWeekIdx(0); }
        }
    }, [selPhaseId]);

    const selBlock  = selPhase?.blocks.find(b => b.id === selBlockId);
    useEffect(() => { setWeekIdx(0); }, [selBlockId]);

    const week       = selBlock?.weeks[weekIdx] || null;
    const totalWeeks = selBlock?.weeks.length || 0;
    const planModalities = plan.modalities || [];

    // 7 date strings for the current week
    const weekDates = useMemo(() => {
        if (!week) return Array(7).fill(null);
        return Array.from({ length: 7 }, (_, i) => dayDate(week.startDate, i).toISOString().split('T')[0]);
    }, [week]);

    const weekEndStr = weekDates[6] || week?.startDate || '';

    // Match event in this week (for MD countdown)
    const matchEvent = useMemo(() =>
        (plan.events || []).find(e => e.type === 'competition' && weekDates.includes(e.date)),
        [plan.events, weekDates]);

    const getMdLabel = (dateStr) => {
        if (!matchEvent || !dateStr) return null;
        const diff = Math.round((new Date(matchEvent.date).getTime() - new Date(dateStr).getTime()) / 86400000);
        if (diff === 0) return 'MD';
        if (diff > 0 && diff <= 6) return `MD-${diff}`;
        if (diff < 0 && diff >= -2) return `MD+${Math.abs(diff)}`;
        return null;
    };

    // Per-day highest load (for load bar)
    const dayTopLoad = useMemo(() => {
        const RANK = { Low: 1, Moderate: 2, High: 3, 'Very High': 4 };
        return weekDates.map(dateStr => {
            if (!dateStr || !week) return null;
            const sessions = (week.sessions || []).filter(s => s.date === dateStr);
            if (!sessions.length) return null;
            return sessions.reduce((best, s) =>
                (!best || (RANK[s.load] || 0) > (RANK[best] || 0)) ? s.load : best, null);
        });
    }, [weekDates, week]);

    // Week summary by modality
    const weekStats = useMemo(() => {
        if (!week) return null;
        const sessions = week.sessions || [];
        const byModality = {};
        sessions.forEach(s => {
            if (s.modality) byModality[s.modality] = (byModality[s.modality] || 0) + 1;
        });
        return { total: sessions.length, byModality };
    }, [week]);

    // ── Gantt (all plan weeks) for navigation ──────────────────────────────────
    const ganttStart = plan.startDate || plan.phases[0]?.startDate || '';
    const ganttEnd   = plan.endDate   || plan.phases[plan.phases.length - 1]?.endDate || '';
    const allWeeks   = useMemo(() => ganttStart && ganttEnd ? getWeeks(ganttStart, ganttEnd) : [], [ganttStart, ganttEnd]);

    const monthGroups = useMemo(() => {
        const groups = [];
        allWeeks.forEach((w, i) => {
            const label = `${w.month} ${w.year}`;
            if (!groups.length || groups[groups.length - 1].label !== label)
                groups.push({ label, startIdx: i, count: 1 });
            else
                groups[groups.length - 1].count++;
        });
        return groups;
    }, [allWeeks]);

    const WEEK_W       = 38;
    const ganttW       = Math.max(640, allWeeks.length * WEEK_W);
    const totalDaysPlan = Math.max(1, daysBetween(ganttStart, ganttEnd));

    const currentGanttIdx = useMemo(() => {
        if (!week) return -1;
        return allWeeks.findIndex(w => w.date === week.startDate);
    }, [allWeeks, week]);

    // Auto-scroll gantt to active week
    useEffect(() => {
        if (ganttRef.current && currentGanttIdx >= 0) {
            ganttRef.current.scrollLeft = Math.max(0, currentGanttIdx * WEEK_W - 120);
        }
    }, [currentGanttIdx]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const saveWeekIntent = () => {
        if (!selPhase || !selBlock || !week) return;
        handleUpdatePlanWeek(selPhase.id, selBlock.id, week.id, { intent: editWeekIntent });
        setEditingWeekId(null);
    };

    const createSession = (dateStr) => {
        if (!newSD.name.trim() || !selPhase || !selBlock || !week) return;
        handleAddPlanSession(selPhase.id, selBlock.id, week.id, {
            date: dateStr, name: newSD.name.trim(),
            load: newSD.load || null, modality: newSD.modality || null,
            plannedDuration: newSD.duration ? parseInt(newSD.duration) : null,
            sections: [],
        });
        setAddingDate(null); setNewSD(EMPTY_SESSION);
    };

    const saveSession = (sessionId) => {
        if (!selPhase || !selBlock || !week) return;
        handleUpdatePlanSession(selPhase.id, selBlock.id, week.id, sessionId, {
            name: editSD.name, load: editSD.load || null,
            modality: editSD.modality || null,
            plannedDuration: editSD.duration ? parseInt(editSD.duration) : null,
        });
        setEditingSessionId(null);
    };

    const deleteSession = (sessionId) => {
        if (!selPhase || !selBlock || !week) return;
        handleDeletePlanSession(selPhase.id, selBlock.id, week.id, sessionId);
        setEditingSessionId(null);
    };

    const startAdd  = (dateStr) => { setAddingDate(dateStr); setEditingSessionId(null); setNewSD(EMPTY_SESSION); };
    const startEdit = (session) => {
        setEditingSessionId(session.id); setAddingDate(null);
        setEditSD({ name: session.name, load: session.load || '', modality: session.modality || '', duration: session.plannedDuration?.toString() || '' });
    };

    const today = new Date().toISOString().split('T')[0];

    // ── Empty state ─────────────────────────────────────────────────────────────
    if (plan.phases.length === 0) {
        return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 text-center">
                <CalendarDays size={32} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-[#94A3B8]">No phases set up yet.</p>
                <p className="text-xs text-slate-400 dark:text-[#64748B] mt-1">Add phases and periods first, then plan microcycles here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">

            {/* ── Gantt navigation ─────────────────────────────────────────── */}
            {ganttStart && allWeeks.length > 0 && (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div ref={ganttRef} className="overflow-x-auto">
                        <div style={{ width: ganttW + 32 + 'px' }} className="px-4 pt-3 pb-2.5">

                            {/* Month labels */}
                            <div className="relative mb-0.5" style={{ height: '13px' }}>
                                {monthGroups.map((mg, i) => (
                                    <div key={i} className="absolute text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide"
                                        style={{ left: mg.startIdx * WEEK_W + 'px', width: mg.count * WEEK_W + 'px' }}>
                                        {mg.label}
                                    </div>
                                ))}
                            </div>

                            {/* Clickable week buttons */}
                            <div className="relative mb-2" style={{ height: '20px' }}>
                                {allWeeks.map((w, i) => {
                                    const isActive     = i === currentGanttIdx;
                                    const inBlock      = selBlock?.weeks.some(bw => bw.startDate === w.date);
                                    return (
                                        <button key={i}
                                            onClick={() => {
                                                if (inBlock) {
                                                    const idx = selBlock.weeks.findIndex(bw => bw.startDate === w.date);
                                                    if (idx >= 0) setWeekIdx(idx);
                                                }
                                            }}
                                            className={`absolute h-full rounded text-[8px] font-semibold flex items-center justify-center transition-all
                                                ${isActive
                                                    ? 'bg-blue-500 text-white'
                                                    : inBlock
                                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 cursor-pointer'
                                                        : 'text-slate-300 dark:text-[#475569] cursor-default'}`}
                                            style={{ left: i * WEEK_W + 'px', width: WEEK_W - 2 + 'px' }}>
                                            W{w.weekNum}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Phase bars */}
                            <div className="relative" style={{ height: '18px' }}>
                                {plan.phases.map(ph => {
                                    if (!ph.startDate) return null;
                                    const lPx = daysBetween(ganttStart, ph.startDate) / totalDaysPlan * ganttW;
                                    const wPx = ph.endDate ? Math.max(20, daysBetween(ph.startDate, ph.endDate) / totalDaysPlan * ganttW) : 40;
                                    return (
                                        <div key={ph.id}
                                            className="absolute h-full rounded flex items-center px-1.5 overflow-hidden"
                                            style={{ left: lPx + 'px', width: wPx + 'px', backgroundColor: (ph.color || '#6366f1') + '25', border: `1px solid ${ph.color || '#6366f1'}50` }}>
                                            <span className="text-[8px] font-bold truncate" style={{ color: ph.color || '#6366f1' }}>{ph.name}</span>
                                        </div>
                                    );
                                })}
                                {/* Today marker */}
                                {today >= ganttStart && today <= ganttEnd && (
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                                        style={{ left: daysBetween(ganttStart, today) / totalDaysPlan * ganttW + 'px' }} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Phase / Period / Week selectors ──────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-5 py-3">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Phase</span>
                        <CustomSelect value={selPhaseId} onChange={e => setSelPhaseId(e.target.value)} variant="filter" size="xs">
                            {plan.phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                        </CustomSelect>
                    </div>
                    {selPhase && selPhase.blocks.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Period</span>
                            <CustomSelect value={selBlockId} onChange={e => setSelBlockId(e.target.value)} variant="filter" size="xs">
                                {selPhase.blocks.map(b => <option key={b.id} value={b.id}>{b.label || b.name}</option>)}
                            </CustomSelect>
                        </div>
                    )}
                    {selBlock && totalWeeks > 0 && (
                        <div className="flex items-center gap-2 ml-auto">
                            <button onClick={() => setWeekIdx(i => Math.max(0, i - 1))} disabled={weekIdx === 0}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] disabled:opacity-30 transition-colors">
                                <ChevronLeft size={14} className="text-slate-500 dark:text-[#94A3B8]" />
                            </button>
                            <span className="text-xs font-semibold text-slate-700 dark:text-[#E2E8F0] whitespace-nowrap">
                                Week {weekIdx + 1} of {totalWeeks}
                                {week && <span className="text-[10px] font-normal text-slate-400 dark:text-[#64748B] ml-1.5">({formatDateShort(week.startDate)} — {formatDateShort(weekEndStr)})</span>}
                            </span>
                            <button onClick={() => setWeekIdx(i => Math.min(totalWeeks - 1, i + 1))} disabled={weekIdx >= totalWeeks - 1}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] disabled:opacity-30 transition-colors">
                                <ChevronRight size={14} className="text-slate-500 dark:text-[#94A3B8]" />
                            </button>
                        </div>
                    )}
                </div>
                {selPhase && selPhase.blocks.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-[#64748B] mt-2">No periods in this phase — add them in the Periods tab.</p>
                )}
            </div>

            {week ? (
                <div className="flex gap-3 items-start">
                    {/* ── Left: focus bar + 7-day grid ────────────────────── */}
                    <div className="flex-1 min-w-0 space-y-3">

                        {/* Week focus bar */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-2.5 flex items-center gap-3">
                            <CalendarDays size={13} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                            {editingWeekId === week.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] shrink-0">Focus:</span>
                                    <input autoFocus value={editWeekIntent}
                                        onChange={e => setEditWeekIntent(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveWeekIntent(); if (e.key === 'Escape') setEditingWeekId(null); }}
                                        className="flex-1 text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1 outline-none focus:border-indigo-400 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0]"
                                        placeholder="e.g. High Load, Deload, Peak..." />
                                    <button onClick={saveWeekIntent} className="text-indigo-600 hover:text-indigo-700"><Check size={13} /></button>
                                    <button onClick={() => setEditingWeekId(null)} className="text-slate-400"><X size={13} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-1 group/edit">
                                    <span className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1]">
                                        {week.intent
                                            ? <><span className="text-[10px] text-slate-400 dark:text-[#64748B] mr-1">Focus:</span>{week.intent}</>
                                            : <span className="text-slate-300 dark:text-[#475569] italic">No weekly focus — click pencil to set</span>
                                        }
                                    </span>
                                    {matchEvent && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 ml-2">
                                            ⚽ {matchEvent.title}
                                        </span>
                                    )}
                                    <button onClick={() => { setEditingWeekId(week.id); setEditWeekIntent(week.intent || ''); }}
                                        className="opacity-0 group-hover/edit:opacity-100 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-all ml-1">
                                        <PencilIcon size={10} className="text-slate-400" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 7-day session grid */}
                        <div className="grid grid-cols-7 gap-1.5">
                            {DAYS.map((dayName, i) => {
                                const dateStr     = weekDates[i];
                                const d           = dateStr ? dayDate(week.startDate, i) : null;
                                const daySessions = (week.sessions || []).filter(s => s.date === dateStr);
                                const isAdd       = addingDate === dateStr;
                                const mdLabel     = getMdLabel(dateStr);
                                const isMatch     = mdLabel === 'MD';
                                const topLoad     = dayTopLoad[i];

                                return (
                                    <div key={i}
                                        className={`rounded-xl border shadow-sm overflow-hidden flex flex-col min-h-[140px]
                                            ${isMatch
                                                ? 'border-red-300 dark:border-red-800/60 bg-red-50/30 dark:bg-red-900/10'
                                                : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338]'}`}>

                                        {/* Day header */}
                                        <div className={`px-2 py-1.5 border-b flex flex-col gap-0.5
                                            ${isMatch
                                                ? 'border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20'
                                                : 'border-slate-100 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/30'}`}>
                                            <span className={`text-[9px] font-bold uppercase ${isMatch ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-[#94A3B8]'}`}>
                                                {dayName}
                                            </span>
                                            {d && <span className={`text-[8px] ${isMatch ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-[#64748B]'}`}>
                                                {d.getDate()} {MONTHS[d.getMonth()]}
                                            </span>}
                                            {mdLabel && <span className={`text-[8px] font-bold ${isMatch ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-[#64748B]'}`}>{mdLabel}</span>}
                                        </div>

                                        {/* Sessions */}
                                        <div className="p-1.5 flex-1 flex flex-col gap-1.5">
                                            {daySessions.map(session => {
                                                const meta = modalityMeta(session.modality);
                                                const Icon = meta.icon;
                                                const isEdit = editingSessionId === session.id;

                                                return isEdit ? (
                                                    <div key={session.id} className="space-y-1">
                                                        <input autoFocus value={editSD.name}
                                                            onChange={e => setEditSD(d => ({ ...d, name: e.target.value }))}
                                                            onKeyDown={e => { if (e.key === 'Enter') saveSession(session.id); if (e.key === 'Escape') setEditingSessionId(null); }}
                                                            className="w-full text-[9px] font-bold bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded px-1.5 py-1 outline-none focus:border-indigo-400 text-slate-800 dark:text-[#E2E8F0]"
                                                            placeholder="Session name" />
                                                        <CustomSelect value={editSD.modality} onChange={e => setEditSD(d => ({ ...d, modality: e.target.value }))} variant="form" size="xs">
                                                            <option value="">No modality</option>
                                                            {planModalities.map(m => <option key={m} value={m}>{m}</option>)}
                                                        </CustomSelect>
                                                        <CustomSelect value={editSD.load} onChange={e => setEditSD(d => ({ ...d, load: e.target.value }))} variant="form" size="xs">
                                                            <option value="">No load</option>
                                                            {LOAD_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                                        </CustomSelect>
                                                        <input type="number" value={editSD.duration}
                                                            onChange={e => setEditSD(d => ({ ...d, duration: e.target.value }))}
                                                            className="w-full text-[9px] bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded px-1.5 py-1 outline-none text-slate-700 dark:text-[#E2E8F0]"
                                                            placeholder="Duration (min)" />
                                                        <div className="flex gap-1">
                                                            <button onClick={() => saveSession(session.id)} className="flex-1 text-[9px] font-semibold bg-indigo-600 text-white rounded py-0.5 hover:bg-indigo-700">Save</button>
                                                            <button onClick={() => setEditingSessionId(null)} className="text-[9px] text-slate-400 px-1 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48]">✕</button>
                                                        </div>
                                                        <button onClick={() => deleteSession(session.id)} className="flex items-center gap-1 text-[8px] text-red-400 hover:text-red-600">
                                                            <Trash2 size={8} /> Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div key={session.id}
                                                        onClick={() => startEdit(session)}
                                                        className="group/card rounded-lg p-1.5 border border-slate-200 dark:border-[#243A58] bg-slate-50/60 dark:bg-[#0F1C30]/40 hover:border-indigo-200 dark:hover:border-indigo-800/40 transition-colors cursor-pointer">
                                                        {/* Modality badge with icon */}
                                                        {session.modality ? (
                                                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded mb-1 ${meta.color}`}>
                                                                <Icon size={8} />
                                                                <span className="text-[8px] font-bold">{session.modality}</span>
                                                            </div>
                                                        ) : null}
                                                        <p className="text-[9px] font-semibold text-slate-700 dark:text-[#CBD5E1] leading-tight truncate">{session.name}</p>
                                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                            {session.load && (
                                                                <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${LOAD_PILL[session.load] || ''}`}>{session.load}</span>
                                                            )}
                                                            {session.plannedDuration && (
                                                                <span className="text-[7px] text-slate-400 dark:text-[#64748B] flex items-center gap-0.5">
                                                                    <Clock size={6} />{session.plannedDuration}m
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={e => { e.stopPropagation(); navigate('/workouts/packets', { state: { assignToPlanSession: { sessionId: session.id, date: dateStr, weekId: week.id, blockId: selBlock.id, phaseId: selPhase.id, planId: plan.id } } }); }}
                                                            className="flex items-center gap-0.5 text-[7px] text-slate-400 dark:text-[#64748B] hover:text-indigo-500 dark:hover:text-indigo-400 font-medium mt-1 transition-colors">
                                                            <LinkIcon size={6} /> {session.workoutTemplateId ? 'View Workout' : 'Assign'}
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {/* Add form / button */}
                                            {isAdd ? (
                                                <div className="space-y-1 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/40 rounded-lg p-1.5">
                                                    <input autoFocus value={newSD.name}
                                                        onChange={e => setNewSD(d => ({ ...d, name: e.target.value }))}
                                                        onKeyDown={e => { if (e.key === 'Enter') createSession(dateStr); if (e.key === 'Escape') setAddingDate(null); }}
                                                        className="w-full text-[9px] font-bold bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded px-1.5 py-1 outline-none focus:border-indigo-400 text-slate-800 dark:text-[#E2E8F0]"
                                                        placeholder="Session name" />
                                                    <CustomSelect value={newSD.modality} onChange={e => setNewSD(d => ({ ...d, modality: e.target.value }))} variant="form" size="xs">
                                                        <option value="">No modality</option>
                                                        {planModalities.map(m => <option key={m} value={m}>{m}</option>)}
                                                    </CustomSelect>
                                                    <CustomSelect value={newSD.load} onChange={e => setNewSD(d => ({ ...d, load: e.target.value }))} variant="form" size="xs">
                                                        <option value="">No load</option>
                                                        {LOAD_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                                    </CustomSelect>
                                                    <input type="number" value={newSD.duration}
                                                        onChange={e => setNewSD(d => ({ ...d, duration: e.target.value }))}
                                                        className="w-full text-[9px] bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded px-1.5 py-1 outline-none text-slate-700 dark:text-[#E2E8F0]"
                                                        placeholder="Duration (min)" />
                                                    <div className="flex gap-1">
                                                        <button onClick={() => createSession(dateStr)} disabled={!newSD.name.trim()}
                                                            className="flex-1 text-[9px] font-semibold bg-indigo-600 text-white rounded py-0.5 hover:bg-indigo-700 disabled:opacity-40">Add</button>
                                                        <button onClick={() => setAddingDate(null)} className="text-[9px] text-slate-400 px-1 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48]">✕</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => startAdd(dateStr)}
                                                    className="flex items-center justify-center gap-0.5 text-[8px] font-medium text-slate-300 dark:text-[#475569] hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors w-full py-1 rounded border border-dashed border-slate-200 dark:border-[#243A58] hover:border-indigo-300 mt-auto">
                                                    <Plus size={8} /> {daySessions.length === 0 ? 'Add session' : 'Add'}
                                                </button>
                                            )}
                                        </div>

                                        {/* Daily load indicator */}
                                        <div className="px-1.5 pb-1.5">
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden">
                                                {topLoad && (
                                                    <div className={`h-full rounded-full ${LOAD_COLOR[topLoad] || 'bg-slate-300'}`}
                                                        style={{ width: (LOAD_BAR_HEIGHT[topLoad] || 25) + '%' }} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Right sidebar ─────────────────────────────────────── */}
                    <div className="w-44 shrink-0 space-y-3">

                        {/* Key information */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-3.5">
                            <h4 className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-2.5">Key Information</h4>
                            <div className="space-y-2">
                                {[
                                    { label: 'Phase',     value: selPhase?.name },
                                    { label: 'Period',    value: selBlock?.label || selBlock?.name },
                                    { label: 'Week',      value: `${weekIdx + 1} / ${totalWeeks}` },
                                    { label: 'Dates',     value: week ? `${formatDateShort(week.startDate)} — ${formatDateShort(weekEndStr)}` : '—' },
                                    { label: 'Intensity', value: selBlock?.intensityLevel || '—' },
                                    { label: 'Volume',    value: selBlock?.volumeLevel || '—' },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-start justify-between gap-2">
                                        <span className="text-[9px] text-slate-400 dark:text-[#64748B] shrink-0">{label}</span>
                                        <span className="text-[9px] font-semibold text-slate-700 dark:text-[#CBD5E1] text-right leading-snug">{value || '—'}</span>
                                    </div>
                                ))}
                                {matchEvent && (
                                    <div className="pt-1.5 border-t border-slate-100 dark:border-[#243A58]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] text-red-500 dark:text-red-400 font-bold">Match</span>
                                            <span className="text-[9px] font-semibold text-red-600 dark:text-red-400">{formatDateShort(matchEvent.date)}</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 dark:text-[#64748B] mt-0.5 text-right truncate">{matchEvent.title}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Week summary */}
                        {weekStats && (
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-3.5">
                                <h4 className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-2.5">Week Summary</h4>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-slate-500 dark:text-[#94A3B8]">Total Sessions</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-[#E2E8F0]">{weekStats.total}</span>
                                    </div>
                                    {Object.keys(weekStats.byModality).length > 0 && (
                                        <div className="pt-1.5 border-t border-slate-100 dark:divide-[#243A58] space-y-1">
                                            {Object.entries(weekStats.byModality).map(([mod, count]) => {
                                                const meta = modalityMeta(mod);
                                                const Icon = meta.icon;
                                                return (
                                                    <div key={mod} className="flex items-center justify-between gap-1">
                                                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${meta.color}`}>
                                                            <Icon size={7} />
                                                            <span className="text-[8px] font-semibold truncate">{mod}</span>
                                                        </div>
                                                        <span className="text-[9px] font-semibold text-slate-600 dark:text-[#CBD5E1] shrink-0">{count}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {weekStats.total === 0 && (
                                        <p className="text-[9px] text-slate-300 dark:text-[#475569] italic">No sessions planned</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Period modality loads */}
                        {selBlock && Object.keys(selBlock.modalities || {}).length > 0 && (
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-3.5">
                                <h4 className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-2.5">Period Modalities</h4>
                                <div className="space-y-1.5">
                                    {Object.entries(selBlock.modalities).map(([mod, level]) => {
                                        const meta = modalityMeta(mod);
                                        const Icon = meta.icon;
                                        return (
                                            <div key={mod} className="flex items-center justify-between gap-2">
                                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${meta.color}`}>
                                                    <Icon size={7} />
                                                    <span className="text-[8px] font-semibold truncate">{mod}</span>
                                                </div>
                                                <span className="text-[8px] font-semibold text-slate-500 dark:text-[#94A3B8] shrink-0">{level}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : selBlock ? (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-10 text-center">
                    <p className="text-sm text-slate-400 dark:text-[#64748B]">This period has no planned weeks.</p>
                    <p className="text-xs text-slate-400 dark:text-[#64748B] mt-1">Weeks are generated from the period date range. Edit the period to set dates.</p>
                </div>
            ) : null}
        </div>
    );
};
