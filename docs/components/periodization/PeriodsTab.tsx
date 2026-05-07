// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    Plus, PencilIcon, Trash2, Target,
    MoreHorizontal, CheckCircle2, Loader2, Timer, LayoutList,
    CalendarDays, BookOpen, MessageSquare, BarChart2,
} from 'lucide-react';
import { formatDateShort } from '../../utils/periodizationUtils';

// ── Date helpers ───────────────────────────────────────────────────────────────
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

// ── Phase status from dates ────────────────────────────────────────────────────
function getPhaseStatus(phase, today) {
    if (!phase.startDate) return { label: 'No Date', cls: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]' };
    if (phase.endDate && phase.endDate < today)   return { label: 'Completed',  cls: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]' };
    if (phase.startDate <= today && (!phase.endDate || phase.endDate >= today)) return { label: 'In Progress', cls: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40' };
    return { label: 'Upcoming', cls: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40' };
}

// ── Phase stats helpers ────────────────────────────────────────────────────────
function phaseTotalWeeks(phase) {
    return phase.blocks.reduce((sum, b) => sum + (b.weeks || []).length, 0);
}

function phaseTotalSessions(phase) {
    return phase.blocks.reduce((sum, b) =>
        sum + b.blocks?.reduce?.((ws, w) => ws + (w.sessions || []).length, 0) ||
        b.weeks?.reduce?.((ws, w) => ws + (w.sessions || []).length, 0) || 0
    , 0);
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, valueClass = 'text-slate-800 dark:text-[#E2E8F0]' }) {
    return (
        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 flex items-center gap-3">
            <div className="text-slate-300 dark:text-[#475569] shrink-0">{icon}</div>
            <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-0.5">{label}</p>
                <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export const PeriodsTab = ({ plan, onViewInMicrocycles }) => {
    const {
        setIsPlanPhaseModalOpen, setEditingPlanPhase,
        handleDeletePlanPhase,
    } = useAppState();

    const [selectedId, setSelectedId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const today = new Date().toISOString().split('T')[0];

    // Stats across all phases
    const stats = useMemo(() => {
        const completed  = plan.phases.filter(ph => ph.endDate && ph.endDate < today).length;
        const inProgress = plan.phases.filter(ph => ph.startDate && ph.startDate <= today && (!ph.endDate || ph.endDate >= today)).length;
        const upcoming   = plan.phases.filter(ph => ph.startDate && ph.startDate > today).length;
        return { total: plan.phases.length, completed, inProgress, upcoming };
    }, [plan.phases, today]);

    // Date range for Gantt (all phases)
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
            else
                groups[groups.length - 1].count++;
        });
        return groups;
    }, [weeks]);

    const WEEK_W    = 38;
    const ganttW    = Math.max(640, weeks.length * WEEK_W);
    const totalDays = Math.max(1, daysBetween(ganttDates.start, ganttDates.end));
    const pxLeft    = d => Math.max(0, daysBetween(ganttDates.start, d) / totalDays * ganttW);
    const pxWidth   = (s, e) => Math.max(4, daysBetween(s, e || s) / totalDays * ganttW);

    const selectedPhase = plan.phases.find(ph => ph.id === selectedId);

    // ── Empty state ────────────────────────────────────────────────────────────
    if (plan.phases.length === 0) {
        return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 text-center">
                <Target size={32} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-[#94A3B8] mb-1">No phases yet</p>
                <p className="text-xs text-slate-400 dark:text-[#64748B] mb-4">Add your first phase to begin structuring this plan.</p>
                <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors">
                    + Add First Phase
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4" onClick={() => setOpenMenuId(null)}>

            {/* ── Stat cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<LayoutList size={18} />}   label="Total Phases"  value={stats.total} />
                <StatCard icon={<CheckCircle2 size={18} />} label="Completed"     value={stats.completed} />
                <StatCard icon={<Loader2 size={18} />}      label="In Progress"   value={stats.inProgress} valueClass="text-green-600 dark:text-green-400" />
                <StatCard icon={<Timer size={18} />}        label="Upcoming"      value={stats.upcoming}   valueClass="text-blue-600 dark:text-blue-400" />
            </div>

            {/* ── Gantt — phases only ──────────────────────────────────────── */}
            {ganttDates.start && weeks.length > 0 && (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-5 py-2.5 border-b border-slate-100 dark:border-[#243A58] flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Plan Timeline</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                            {formatDateShort(ganttDates.start)} — {formatDateShort(ganttDates.end)}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <div style={{ width: ganttW + 32 + 'px' }} className="px-4 py-3">

                            {/* Month labels */}
                            <div className="relative mb-0.5" style={{ height: '13px' }}>
                                {monthGroups.map((mg, i) => (
                                    <div key={i} className="absolute text-[9px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide"
                                        style={{ left: mg.startIdx * WEEK_W + 'px', width: mg.count * WEEK_W + 'px' }}>
                                        {mg.label}
                                    </div>
                                ))}
                            </div>

                            {/* Week numbers */}
                            <div className="relative mb-3" style={{ height: '12px' }}>
                                {weeks.map((w, i) => (
                                    <div key={i} className="absolute text-[8px] text-slate-300 dark:text-[#475569] text-center"
                                        style={{ left: i * WEEK_W + 'px', width: WEEK_W + 'px' }}>
                                        W{w.weekNum}
                                    </div>
                                ))}
                            </div>

                            {/* Phase bars — click to select */}
                            <div className="relative" style={{ height: '28px' }}>
                                {plan.phases.map((ph, idx) => {
                                    if (!ph.startDate) return null;
                                    const l    = pxLeft(ph.startDate);
                                    const w    = ph.endDate ? pxWidth(ph.startDate, ph.endDate) : 60;
                                    const isSel = ph.id === selectedId;
                                    return (
                                        <button key={ph.id}
                                            onClick={e => { e.stopPropagation(); setSelectedId(isSel ? null : ph.id); }}
                                            title={ph.name}
                                            className="absolute h-full rounded-lg flex items-center px-2 overflow-hidden transition-all hover:opacity-90"
                                            style={{
                                                left: l + 'px', width: w + 'px',
                                                backgroundColor: isSel ? (ph.color || '#6366f1') : (ph.color || '#6366f1') + '30',
                                                border: `1.5px solid ${ph.color || '#6366f1'}${isSel ? 'ff' : '80'}`,
                                                outline: isSel ? `2px solid ${ph.color || '#6366f1'}` : 'none',
                                                outlineOffset: '1px',
                                            }}>
                                            <span className="text-[9px] font-bold truncate"
                                                style={{ color: isSel ? 'white' : (ph.color || '#6366f1') }}>
                                                {ph.name}
                                            </span>
                                        </button>
                                    );
                                })}
                                {/* Today line */}
                                {today >= ganttDates.start && today <= ganttDates.end && (
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 rounded-full"
                                        style={{ left: pxLeft(today) + 'px' }} />
                                )}
                            </div>

                            {/* Legend */}
                            <div className="flex items-center gap-4 mt-2.5 pt-2 border-t border-slate-100 dark:border-[#243A58]">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-0.5 bg-blue-500 rounded" />
                                    <span className="text-[8px] text-slate-400 dark:text-[#64748B]">Today</span>
                                </div>
                                {plan.phases.map(ph => (
                                    <div key={ph.id} className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: ph.color || '#6366f1' }} />
                                        <span className="text-[8px] text-slate-400 dark:text-[#64748B]">{ph.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Phases table ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Phases</h4>
                    <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                        <Plus size={11} /> Add Phase
                    </button>
                </div>

                {/* Table header */}
                <div className="hidden md:grid px-5 py-2 border-b border-slate-100 dark:border-[#243A58] bg-slate-50/40 dark:bg-[#0F1C30]/20"
                    style={{ gridTemplateColumns: '28px 1fr 190px 150px 52px 80px 100px 32px' }}>
                    {[
                        { h: '#',       cls: '' },
                        { h: 'Phase',   cls: '' },
                        { h: 'Focuses', cls: '' },
                        { h: 'Dates',   cls: '' },
                        { h: 'Wks',     cls: 'text-center' },
                        { h: 'Blocks',  cls: 'text-center' },
                        { h: 'Status',  cls: '' },
                        { h: '',        cls: '' },
                    ].map(({ h, cls }) => (
                        <span key={h || 'actions'} className={`text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide ${cls}`}>{h}</span>
                    ))}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-[#243A58]">
                    {plan.phases.map((phase, idx) => {
                        const status    = getPhaseStatus(phase, today);
                        const totalWeeks = phaseTotalWeeks(phase);
                        const isSel     = phase.id === selectedId;

                        return (
                            <div key={phase.id}
                                onClick={() => setSelectedId(isSel ? null : phase.id)}
                                className={`grid px-5 py-3 cursor-pointer transition-colors items-center gap-2 ${isSel ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-[#1A2D48]/50'}`}
                                style={{ gridTemplateColumns: '28px 1fr 190px 150px 52px 80px 100px 32px' }}>

                                {/* # badge */}
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                    style={{ backgroundColor: phase.color || '#6366f1' }}>
                                    {idx + 1}
                                </div>

                                {/* Phase name */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-1 h-full min-h-[36px] rounded-full shrink-0" style={{ backgroundColor: phase.color || '#6366f1' }} />
                                    <div className="min-w-0 py-0.5">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate leading-tight">{phase.name}</p>
                                        {phase.goals && (
                                            <p className="text-[9px] text-slate-400 dark:text-[#64748B] truncate mt-0.5">{phase.goals}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Training Focuses */}
                                <div className="flex flex-wrap gap-1">
                                    {(phase.focuses?.length ? phase.focuses : phase.trainingPhase ? [phase.trainingPhase] : []).map((f, fi) => (
                                        <span key={f} className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border ${
                                            fi === 0
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800/40'
                                                : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]'
                                        }`}>
                                            {f}
                                        </span>
                                    ))}
                                </div>

                                {/* Dates */}
                                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                                    {phase.startDate ? formatDateShort(phase.startDate) : '—'}
                                    {phase.endDate ? ` — ${formatDateShort(phase.endDate)}` : ''}
                                </div>

                                {/* Weeks */}
                                <div className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] text-center">
                                    {totalWeeks > 0 ? totalWeeks : <span className="text-slate-300 dark:text-[#475569]">—</span>}
                                </div>

                                {/* Blocks count */}
                                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] text-center">
                                    {phase.blocks.length} block{phase.blocks.length !== 1 ? 's' : ''}
                                </div>

                                {/* Status */}
                                <div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide whitespace-nowrap ${status.cls}`}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === phase.id ? null : phase.id)}
                                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-400 hover:text-slate-600 transition-colors">
                                        <MoreHorizontal size={13} />
                                    </button>
                                    {openMenuId === phase.id && (
                                        <div className="absolute right-0 top-7 z-20 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-lg py-1.5 w-36">
                                            <button
                                                onClick={() => { setEditingPlanPhase(phase); setIsPlanPhaseModalOpen(true); setOpenMenuId(null); }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                <PencilIcon size={12} /> Edit Phase
                                            </button>
                                            <div className="my-1 border-t border-slate-100 dark:border-[#243A58]" />
                                            <button
                                                onClick={() => {
                                                    handleDeletePlanPhase(phase.id);
                                                    setOpenMenuId(null);
                                                    if (selectedId === phase.id) setSelectedId(null);
                                                }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Selected phase detail panel ───────────────────────────────── */}
            {selectedPhase && (() => {
                const totalWeeks    = phaseTotalWeeks(selectedPhase);
                const totalSessions = selectedPhase.blocks.reduce((sum, b) =>
                    sum + (b.weeks || []).reduce((ws, w) => ws + (w.sessions || []).length, 0), 0);

                return (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#243A58]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1.5 h-5 rounded-full shrink-0" style={{ backgroundColor: selectedPhase.color }} />
                                <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0]">{selectedPhase.name}</span>
                                    <span className="text-xs text-slate-400 dark:text-[#64748B] ml-2">
                                        {formatDateShort(selectedPhase.startDate)}
                                        {selectedPhase.endDate ? ` — ${formatDateShort(selectedPhase.endDate)}` : ''}
                                        {' · '}{(selectedPhase.focuses?.length ? selectedPhase.focuses : [selectedPhase.trainingPhase]).join(' + ')}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setEditingPlanPhase(selectedPhase); setIsPlanPhaseModalOpen(true); }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#94A3B8] hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors border border-slate-200 dark:border-[#243A58]">
                                <PencilIcon size={12} /> Edit Phase
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-[#243A58]">

                            {/* Goals */}
                            <div className="p-5">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <BookOpen size={12} className="text-slate-400" />
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Goals & Objectives</p>
                                </div>
                                {selectedPhase.goals ? (
                                    <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">{selectedPhase.goals}</p>
                                ) : (
                                    <p className="text-[10px] italic text-slate-300 dark:text-[#475569]">No goals set — edit phase to add.</p>
                                )}
                                {selectedPhase.notes && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#243A58]">
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <MessageSquare size={11} className="text-slate-400" />
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Notes</p>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">{selectedPhase.notes}</p>
                                    </div>
                                )}
                                {!selectedPhase.notes && (
                                    <p className="text-[10px] italic text-slate-300 dark:text-[#475569] mt-3 pt-3 border-t border-slate-100 dark:border-[#243A58]">No notes — edit phase to add.</p>
                                )}
                            </div>

                            {/* Planning stats */}
                            <div className="p-5">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <BarChart2 size={12} className="text-slate-400" />
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Planning Summary</p>
                                </div>
                                <div className="space-y-2.5">
                                    {[
                                        { label: 'Blocks',      value: selectedPhase.blocks.length },
                                        { label: 'Microcycles', value: totalWeeks },
                                        { label: 'Sessions',    value: totalSessions },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500 dark:text-[#94A3B8]">{label}</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-[#E2E8F0]">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Key metric targets — foundation */}
                            <div className="p-5">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <CalendarDays size={12} className="text-slate-400" />
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Key Metric Targets</p>
                                </div>
                                <p className="text-[10px] italic text-slate-300 dark:text-[#475569] leading-relaxed">
                                    Target metrics (ACWR range, weekly load, intensity %) will be configurable here in a future update.
                                </p>
                                <div className="mt-3 space-y-1.5">
                                    {selectedPhase.blocks.length > 0 && selectedPhase.blocks.slice(0, 3).map(b => (
                                        <div key={b.id} className="flex items-center justify-between">
                                            <span className="text-[9px] text-slate-400 dark:text-[#64748B] truncate">{b.label || b.name}</span>
                                            <span className="text-[9px] font-medium text-slate-600 dark:text-[#CBD5E1] shrink-0 ml-2">
                                                {b.intensityLevel || '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
