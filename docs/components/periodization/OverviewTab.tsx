// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { CalendarDays, Users, User, Clock, Layers, Plus, X, Target, ChevronRight } from 'lucide-react';
import { formatDateShort, STANDARD_MODALITIES, isStandardModality, getModalityDescription, EVENT_TYPE_COLORS } from '../../utils/periodizationUtils';

function daysBetween(a, b) {
    if (!a || !b) return 0;
    return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function getWeeks(startStr, endStr) {
    if (!startStr || !endStr) return [];
    const weeks = [];
    const start = new Date(startStr + 'T12:00:00');
    const end   = new Date(endStr   + 'T12:00:00');
    const dow = start.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
    let n = 1;
    while (start <= end) {
        weeks.push({ date: start.toISOString().split('T')[0], month: start.toLocaleString('default', { month: 'short' }), year: start.getFullYear(), weekNum: n++ });
        start.setDate(start.getDate() + 7);
    }
    return weeks;
}

const STATUS_STYLES = {
    active:   'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40',
    draft:    'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]',
    upcoming: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
    at_risk:  'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40',
};
const STATUS_LABELS = { active: 'Active', draft: 'Draft', upcoming: 'Upcoming', at_risk: 'At Risk' };

function GanttPopup({ popup, onClose }) {
    if (!popup) return null;
    const safeX = Math.min(popup.x + 14, window.innerWidth - 248);
    const safeY = Math.min(popup.y - 8,  window.innerHeight - 200);
    return (
        <div className="fixed z-[700] bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl w-52 overflow-hidden"
            style={{ left: safeX + 'px', top: safeY + 'px' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#243A58]"
                style={{ borderLeftWidth: '3px', borderLeftColor: popup.accent }}>
                <p className="flex-1 text-[10px] font-bold text-slate-800 dark:text-[#E2E8F0] truncate">{popup.title}</p>
                <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600 dark:text-[#CBD5E1] dark:hover:text-slate-300"><X size={11} /></button>
            </div>
            <div className="px-3 py-2 space-y-1.5">
                {popup.rows.filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide shrink-0 w-14">{label}</span>
                        <span className="text-[9px] text-slate-600 dark:text-[#CBD5E1] leading-tight flex-1 min-w-0 break-words">{val}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export const OverviewTab = ({ plan, teams, onSwitchToTab }) => {
    const { handleUpdatePlan, setIsPlanPhaseModalOpen, setEditingPlanPhase } = useAppState();
    const [newModality, setNewModality] = useState('');
    const [newModalityDesc, setNewModalityDesc] = useState('');
    const [editingModalities, setEditingModalities] = useState(false);

    const [popup, setPopup] = useState(null);
    useEffect(() => {
        if (!popup) return;
        const close = () => setPopup(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [popup]);
    const openPopup = (e, id, title, rows, accent) => {
        e.stopPropagation();
        setPopup(p => p?.id === id ? null : { id, title, rows, accent, x: e.clientX, y: e.clientY });
    };

    const today         = new Date().toISOString().split('T')[0];
    const totalPeriods  = plan.phases.reduce((s, ph) => s + ph.blocks.length, 0);
    const totalWeeks    = plan.phases.reduce((s, ph) => ph.blocks.reduce((bs, b) => bs + (b.weeks || []).length, s), 0);
    const totalSessions = plan.phases.reduce((s, ph) =>
        s + ph.blocks.reduce((bs, b) =>
            bs + (b.weeks || []).reduce((ws, w) => ws + (w.sessions || []).length, 0), 0), 0);
    const avgSessionsPerWeek = totalWeeks > 0 ? (totalSessions / totalWeeks).toFixed(1) : '—';
    const totalEvents   = (plan.events || []).length;

    // Gantt data
    const ganttDates = useMemo(() => {
        const starts = [plan.startDate, ...plan.phases.map(ph => ph.startDate)].filter(Boolean).sort();
        const ends   = [plan.endDate,   ...plan.phases.map(ph => ph.endDate)].filter(Boolean).sort();
        return { start: starts[0] || null, end: ends[ends.length - 1] || null };
    }, [plan]);

    const weeks = useMemo(() =>
        ganttDates.start && ganttDates.end ? getWeeks(ganttDates.start, ganttDates.end) : [],
        [ganttDates]);

    const monthGroups = useMemo(() => {
        const groups = [];
        weeks.forEach((w, i) => {
            const label = `${w.month} ${w.year}`;
            if (!groups.length || groups[groups.length - 1].label !== label)
                groups.push({ label, startIdx: i, count: 1 });
            else groups[groups.length - 1].count++;
        });
        return groups;
    }, [weeks]);

    const WEEK_W    = 38;
    const ganttW    = Math.max(640, weeks.length * WEEK_W);
    const totalDays = Math.max(1, daysBetween(ganttDates.start, ganttDates.end));
    const pxLeft    = d => Math.max(0, daysBetween(ganttDates.start, d) / totalDays * ganttW);
    const pxWidth   = (s, e) => Math.max(4, (daysBetween(s, e || s) + 1) / totalDays * ganttW);
    // Week-aligned rect — phases/blocks extend to end of containing week (matches Timeline tab behavior)
    const weekRect = (startDate, endDate) => {
        if (!startDate) return null;
        const sWk = Math.floor(daysBetween(ganttDates.start, startDate) / 7);
        const eWk = endDate ? Math.floor(daysBetween(ganttDates.start, endDate) / 7) : sWk;
        return { left: sWk * WEEK_W, width: Math.max(WEEK_W, (eWk - sWk + 1) * WEEK_W) };
    };

    const showToday    = ganttDates.start && today >= ganttDates.start && today <= ganttDates.end;
    const todayWeekIdx = showToday ? Math.floor(daysBetween(ganttDates.start, today) / 7) : -1;
    const todayWeekLeft = todayWeekIdx * WEEK_W;

    const getTargetName = () => {
        if (plan.targetType === 'Team') return teams.find(t => t.id === plan.targetId)?.name || 'Unknown Team';
        return teams.flatMap(t => t.players || []).find(p => p.id === plan.targetId)?.name || 'Unknown Athlete';
    };

    const addModality = (preset) => {
        const m = (preset || newModality).trim();
        if (!m) return;
        const current = plan.modalities || [];
        if (current.includes(m)) return;
        const update: any = { modalities: [...current, m] };
        // If custom (no preset) and a description was provided, persist it
        if (!preset && newModalityDesc.trim()) {
            update.modalityDescriptions = {
                ...(plan.modalityDescriptions || {}),
                [m]: newModalityDesc.trim(),
            };
        }
        handleUpdatePlan(plan.id, update);
        if (!preset) {
            setNewModality('');
            setNewModalityDesc('');
        }
    };

    const removeModality = (mod) => {
        const updated: any = { modalities: (plan.modalities || []).filter(m => m !== mod) };
        // Also remove its description if it was a custom one
        if (plan.modalityDescriptions?.[mod]) {
            const { [mod]: _, ...rest } = plan.modalityDescriptions;
            updated.modalityDescriptions = rest;
        }
        handleUpdatePlan(plan.id, updated);
    };

    const STATS = [
        { label: 'Phases',       value: plan.phases.length,   sub: 'macro cycles' },
        { label: 'Blocks',       value: totalPeriods,         sub: 'mesocycles' },
        { label: 'Wks Planned',  value: totalWeeks,           sub: 'microcycles' },
        { label: 'Sessions',     value: totalSessions,        sub: 'planned total' },
        { label: 'Avg / Week',   value: avgSessionsPerWeek,   sub: 'sessions' },
        { label: 'Events',       value: totalEvents,          sub: 'on calendar' },
    ];

    return (
        <div className="space-y-4">
            {/* Plan info + stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Info */}
                <div className="md:col-span-2 bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">{plan.name}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                {plan.targetType === 'Team' ? <Users size={12} className="text-slate-400" /> : <User size={12} className="text-slate-400" />}
                                <span className="text-xs text-slate-500 dark:text-[#CBD5E1]">{getTargetName()}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${plan.targetType === 'Team' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/40' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800/40'}`}>
                                    {plan.targetType}
                                </span>
                            </div>
                        </div>
                        {plan.status && (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border ${STATUS_STYLES[plan.status] || STATUS_STYLES.draft}`}>
                                {STATUS_LABELS[plan.status] || plan.status}
                            </span>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 pt-4 border-t border-slate-100 dark:border-[#243A58]">
                        {STATS.map(({ label, value, sub }) => (
                            <div key={label}>
                                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-0.5">{label}</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-[#E2E8F0] leading-none">{value}</p>
                                <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">{sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Date + created */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-[#243A58]">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#CBD5E1]">
                            <CalendarDays size={12} />
                            <span>{formatDateShort(plan.startDate)}{plan.endDate ? ` — ${formatDateShort(plan.endDate)}` : ' — Open-ended'}</span>
                        </div>
                        {plan.createdAt && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#CBD5E1]">
                                <Clock size={12} />
                                <span>Created {formatDateShort(plan.createdAt.split('T')[0])}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modalities */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                            <Layers size={14} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-[#CBD5E1]">Training Modalities</span>
                        </div>
                        <button onClick={() => setEditingModalities(v => !v)}
                            className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                            {editingModalities ? 'Done' : 'Edit'}
                        </button>
                    </div>
                    {editingModalities && (
                        <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mb-3 leading-snug">
                            Deselecting removes from Timeline. Standard modalities can be re-added; custom ones are deleted permanently.
                        </p>
                    )}
                    {!editingModalities && (plan.modalities || []).length > 0 && <div className="mb-3" />}

                    <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
                        {(plan.modalities || []).length === 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] italic">No modalities set</span>
                        )}
                        {(plan.modalities || []).map(mod => {
                            const isStandard = isStandardModality(mod);
                            const desc = getModalityDescription(mod, plan.modalityDescriptions);
                            const tooltip = desc
                                ? `${mod} — ${desc}${isStandard ? '' : ' (custom)'}`
                                : (isStandard ? 'Standard modality' : 'Custom modality');
                            return (
                                <span key={mod}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                        isStandard
                                            ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
                                            : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-700 dark:text-[#E2E8F0] border-slate-200 dark:border-[#243A58]'
                                    }`}
                                    title={tooltip}>
                                    {mod}
                                    {editingModalities && (
                                        <button onClick={() => removeModality(mod)}
                                            className="hover:text-red-500 transition-colors"
                                            title={isStandard ? 'Hide from this plan (can be re-added)' : 'Delete custom modality'}>
                                            <X size={9} />
                                        </button>
                                    )}
                                </span>
                            );
                        })}
                    </div>

                    {editingModalities && (
                        <>
                            {/* Re-add standard modalities */}
                            {STANDARD_MODALITIES.filter(p => !(plan.modalities || []).includes(p)).length > 0 && (
                                <div className="mb-2">
                                    <p className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-1">Standard</p>
                                    <div className="flex flex-wrap gap-1">
                                        {STANDARD_MODALITIES.filter(p => !(plan.modalities || []).includes(p)).map(preset => (
                                            <button key={preset} onClick={() => addModality(preset)}
                                                className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors">
                                                + {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add custom modality */}
                            <div className="mt-3">
                                <p className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-1">Custom</p>
                                <div className="flex flex-col gap-1.5">
                                    <input
                                        className="w-full text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                                        placeholder="Name — e.g. Mobility, Tactical..."
                                        value={newModality}
                                        onChange={e => setNewModality(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addModality()}
                                    />
                                    <div className="flex gap-1.5">
                                        <input
                                            className="flex-1 text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                                            placeholder="Quality descriptor (optional) — e.g. Range of motion"
                                            value={newModalityDesc}
                                            onChange={e => setNewModalityDesc(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addModality()}
                                        />
                                        <button onClick={() => addModality()} className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-xs font-medium">Add</button>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-1 leading-snug">
                                    Custom modalities use free-text levels in Timeline. The descriptor shows on hover.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Plan Timeline Gantt ──────────────────────────────────── */}
            {ganttDates.start && weeks.length > 0 && (
                <><div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-5 py-2.5 border-b border-slate-100 dark:border-[#243A58] flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Plan Timeline</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">
                            {formatDateShort(ganttDates.start)} — {formatDateShort(ganttDates.end)}
                        </span>
                    </div>
                    <div className="flex">
                        <div className="shrink-0 w-16 border-r border-slate-100 dark:border-[#243A58] py-3 flex flex-col items-end pr-3">
                            <div style={{ height: '32px' }} />
                            <div className="flex items-center" style={{ height: '24px' }}>
                                <span className="text-[9px] font-semibold text-slate-700 dark:text-[#E2E8F0]">Phases</span>
                            </div>
                            <div className="flex items-center" style={{ height: '20px' }}>
                                <span className="text-[9px] font-semibold text-slate-700 dark:text-[#E2E8F0]">Blocks</span>
                            </div>
                            {(plan.events || []).length > 0 && (
                                <div className="flex items-center" style={{ height: '14px' }}>
                                    <span className="text-[9px] font-semibold text-slate-700 dark:text-[#E2E8F0]">Events</span>
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto flex-1">
                        <div style={{ width: ganttW + 32 + 'px' }} className="px-4 py-3">
                            {/* Month labels — bordered + nowrap (matches Timeline tab) */}
                            <div className="relative mb-0.5" style={{ height: '14px' }}>
                                {monthGroups.map((mg, i) => (
                                    <div key={i}
                                        className="absolute text-[9px] font-bold text-slate-600 dark:text-[#E2E8F0] uppercase tracking-wide whitespace-nowrap overflow-hidden border-r-2 border-slate-300 dark:border-[#243A58] bg-slate-50/60 dark:bg-[#0F1C30]/60 flex items-center justify-center"
                                        style={{ left: mg.startIdx * WEEK_W + 'px', width: mg.count * WEEK_W + 'px', height: '14px' }}>
                                        {mg.label}
                                    </div>
                                ))}
                            </div>
                            {/* Week numbers — today column highlight */}
                            <div className="relative" style={{ height: "16px" }}>
                                {showToday && (
                                    <div className="absolute top-0 bottom-0 bg-rose-50 dark:bg-rose-900/15 pointer-events-none z-0"
                                        style={{ left: todayWeekLeft + 'px', width: WEEK_W + 'px' }} />
                                )}
                                {weeks.map((w, i) => {
                                    const isToday = showToday && i === todayWeekIdx;
                                    return (
                                        <div key={i}
                                            className={`absolute text-[8px] text-center z-10 ${isToday ? 'text-rose-500 font-semibold' : 'text-slate-300 dark:text-[#475569]'}`}
                                            style={{ left: i * WEEK_W + 'px', width: WEEK_W + 'px' }}>
                                            W{w.weekNum}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Phase + Block + Events rows — wrapped for full-height today line */}
                            <div className="relative">
                                {showToday && (
                                    <div className="absolute top-0 bottom-0 bg-rose-50 dark:bg-rose-900/15 pointer-events-none z-0"
                                        style={{ left: todayWeekLeft + 'px', width: WEEK_W + 'px' }} />
                                )}
                            {/* Phase bars */}
                            <div className="relative" style={{ height: '24px' }}>
                                {plan.phases.map(ph => {
                                    if (!ph.startDate) return null;
                                    const rect = weekRect(ph.startDate, ph.endDate);
                                    const l = rect.left;
                                    const w = rect.width;
                                    const isOpen = popup?.id === ph.id;
                                    return (
                                        <button key={ph.id}
                                            onClick={e => openPopup(e, ph.id, ph.name, [
                                                ['Dates', [ph.startDate && formatDateShort(ph.startDate), ph.endDate && formatDateShort(ph.endDate)].filter(Boolean).join(' — ')],
                                                ['Goals', ph.goals],
                                                ['Focus', ph.focuses?.length ? ph.focuses.join(', ') : ph.trainingPhase],
                                                ['Blocks', ph.blocks.length + ' block' + (ph.blocks.length !== 1 ? 's' : '')],
                                            ], ph.color || '#6366f1')}
                                            title={ph.name}
                                            className="absolute h-full rounded-lg flex items-center px-2 overflow-hidden transition-all hover:opacity-80 cursor-pointer"
                                            style={{ left: l + 'px', width: w + 'px', backgroundColor: (ph.color || '#6366f1') + (isOpen ? '40' : '30'), border: `1.5px solid ${ph.color || '#6366f1'}${isOpen ? 'cc' : '80'}` }}>
                                            <span className="text-[9px] font-bold truncate" style={{ color: ph.color || '#6366f1' }}>{ph.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Block bars — back-to-back with phase row (no gap) */}
                            <div className="relative" style={{ height: '20px' }}>
                                {plan.phases.flatMap(ph => ph.blocks.map(b => ({ ...b, phaseColor: ph.color, phaseName: ph.name }))).map(b => {
                                    if (!b.startDate) return null;
                                    const rect = weekRect(b.startDate, b.endDate);
                                    const l = rect.left;
                                    const w = rect.width;
                                    const color = b.color || b.phaseColor || '#6366f1';
                                    const isOpen = popup?.id === b.id;
                                    return (
                                        <button key={b.id}
                                            onClick={e => openPopup(e, b.id, b.label || b.name, [
                                                ['Phase',    b.phaseName],
                                                ['Dates',    [b.startDate && formatDateShort(b.startDate), b.endDate && formatDateShort(b.endDate)].filter(Boolean).join(' — ')],
                                                ['Category', b.blockType],
                                                ['Intensity',b.intensityLevel],
                                                ['Goals',    b.goals],
                                            ], color)}
                                            title={`${b.label || b.name}${b.label && b.name ? ' · ' + b.name : ''}`}
                                            className="absolute h-full rounded flex items-center px-1.5 overflow-hidden transition-all hover:opacity-80 cursor-pointer"
                                            style={{ left: l + 'px', width: w + 'px', backgroundColor: color + (isOpen ? '40' : '28'), border: `1px solid ${color}${isOpen ? 'cc' : '60'}` }}>
                                            <span className="text-[8px] font-semibold truncate" style={{ color }}>{b.label || b.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Event bars — directly under blocks (no gap) */}
                            {(plan.events || []).length > 0 && (
                                <div className="relative" style={{ height: '14px' }}>
                                    {(plan.events || []).map(ev => {
                                        const l     = pxLeft(ev.date);
                                        const rawW  = ev.endDate ? pxWidth(ev.date, ev.endDate) : pxWidth(ev.date, ev.date);
                                        const w     = Math.max(rawW, 36);
                                        const color = ev.color || EVENT_TYPE_COLORS[ev.type] || '#6366f1';
                                        const isOpen = popup?.id === ev.id;
                                        return (
                                            <button key={ev.id}
                                                onClick={e => openPopup(e, ev.id, ev.label || ev.title || '', [
                                                    ['Type',     ev.type?.replace(/_/g, ' ')],
                                                    ['Date',     [ev.date && formatDateShort(ev.date), ev.endDate && formatDateShort(ev.endDate)].filter(Boolean).join(' — ')],
                                                    ['Impt.',    ev.importance],
                                                    ['Location', ev.location],
                                                    ['Notes',    ev.description],
                                                ], color)}
                                                title={ev.label || ev.title || ''}
                                                className="absolute h-full rounded flex items-center px-1 overflow-hidden transition-all hover:opacity-80 cursor-pointer"
                                                style={{ left: l + 'px', width: w + 'px', backgroundColor: color + (isOpen ? '50' : '30'), border: `1.5px solid ${color}` }}>
                                                <span className="text-[7px] font-semibold truncate" style={{ color }}>{ev.label || ev.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {/* Full-height today line — spans phase + block + events */}
                            {showToday && (
                                <div className="absolute top-0 bottom-0 w-0.5 bg-rose-400/60 dark:bg-rose-400/50 z-10 pointer-events-none rounded-full"
                                    style={{ left: pxLeft(today) + 'px' }} />
                            )}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
                <GanttPopup popup={popup} onClose={() => setPopup(null)} /></>
            )}

            {/* Phases summary */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#243A58]">
                    <h4 className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Phases</h4>
                    <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                        <Plus size={11} /> Add Phase
                    </button>
                </div>

                {plan.phases.length === 0 ? (
                    <div className="p-10 text-center">
                        <Target size={28} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1] mb-1">No phases yet</p>
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mb-4">Add your first phase to begin structuring the plan.</p>
                        <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors">
                            + Add First Phase
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-[#243A58]">
                        {plan.phases.map(phase => (
                            <div key={phase.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors group">
                                <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: phase.color }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{phase.name}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">
                                        {formatDateShort(phase.startDate)}{phase.endDate ? ` — ${formatDateShort(phase.endDate)}` : ''}
                                        {' · '}{phase.blocks.length} block{phase.blocks.length !== 1 ? 's' : ''}
                                        {phase.blocks.length > 0 && ' · ' + phase.blocks.reduce((s, b) => s + (b.weeks || []).length, 0) + ' weeks'}
                                    </p>
                                </div>
                                <button onClick={() => onSwitchToTab('periods')}
                                    className="text-[10px] font-semibold text-indigo-500 opacity-0 group-hover:opacity-100 transition-all hover:text-indigo-700">
                                    View Blocks →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
