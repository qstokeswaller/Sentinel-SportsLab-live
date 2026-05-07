// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    Plus, PencilIcon, Trash2, Eye, Target,
    MoreHorizontal, CheckCircle2, Loader2, Timer, LayoutList,
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
        weeks.push({
            date:    start.toISOString().split('T')[0],
            month:   start.toLocaleString('default', { month: 'short' }),
            year:    start.getFullYear(),
            weekNum: n++,
        });
        start.setDate(start.getDate() + 7);
    }
    return weeks;
}

// ── Block status ───────────────────────────────────────────────────────────────
function getBlockStatus(block, today) {
    if (!block.startDate) return { label: 'No Date', cls: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]' };
    if (block.endDate && block.endDate < today)   return { label: 'Completed',  cls: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]' };
    if (block.startDate <= today && (!block.endDate || block.endDate >= today)) return { label: 'In Progress', cls: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40' };
    return { label: 'Upcoming', cls: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40' };
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
        setIsPlanBlockModalOpenNew, setEditingPlanBlock,
        setIsPlanPhaseModalOpen,    setEditingPlanPhase,
        handleDeletePlanBlock,
    } = useAppState();

    const [selectedId, setSelectedId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const today = new Date().toISOString().split('T')[0];

    // Flatten all blocks across phases, sorted by start date
    const allBlocks = useMemo(() => {
        let num = 0;
        return plan.phases
            .flatMap(phase => phase.blocks.map(block => ({ ...block, phase, globalNum: ++num })))
            .sort((a, b) => (a.startDate || 'zzz') < (b.startDate || 'zzz') ? -1 : 1);
    }, [plan.phases]);

    // Stats
    const stats = useMemo(() => {
        const completed  = allBlocks.filter(b => b.endDate && b.endDate < today).length;
        const inProgress = allBlocks.filter(b => b.startDate && b.startDate <= today && (!b.endDate || b.endDate >= today)).length;
        const upcoming   = allBlocks.filter(b => b.startDate && b.startDate > today).length;
        return { total: allBlocks.length, completed, inProgress, upcoming };
    }, [allBlocks, today]);

    // Date range for Gantt
    const ganttDates = useMemo(() => {
        const starts = [plan.startDate, ...allBlocks.map(b => b.startDate)].filter(Boolean).sort();
        const ends   = [plan.endDate,   ...allBlocks.map(b => b.endDate)].filter(Boolean).sort();
        return { start: starts[0] || null, end: ends[ends.length - 1] || null };
    }, [plan, allBlocks]);

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
    const pxWidth   = (s, e) => Math.max(2, daysBetween(s, e || s) / totalDays * ganttW);

    const selectedBlock = allBlocks.find(b => b.id === selectedId);

    // ── Empty state ────────────────────────────────────────────────────────────
    if (plan.phases.length === 0) {
        return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 text-center">
                <Target size={32} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-[#94A3B8] mb-1">No phases yet</p>
                <p className="text-xs text-slate-400 dark:text-[#64748B] mb-4">Add a phase first, then create periods within it.</p>
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
                <StatCard icon={<LayoutList size={18} />}   label="Total Periods" value={stats.total} />
                <StatCard icon={<CheckCircle2 size={18} />} label="Completed"     value={stats.completed} />
                <StatCard icon={<Loader2 size={18} />}      label="In Progress"   value={stats.inProgress} valueClass="text-green-600 dark:text-green-400" />
                <StatCard icon={<Timer size={18} />}        label="Upcoming"      value={stats.upcoming}   valueClass="text-blue-600 dark:text-blue-400" />
            </div>

            {/* ── Mini Gantt ───────────────────────────────────────────────── */}
            {ganttDates.start && weeks.length > 0 && (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-5 py-2.5 border-b border-slate-100 dark:border-[#243A58] flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Timeline</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                            {formatDateShort(ganttDates.start)} — {formatDateShort(ganttDates.end)}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <div style={{ width: ganttW + 32 + 'px' }} className="px-4 py-3 relative">

                            {/* Month labels */}
                            <div className="relative mb-0.5" style={{ height: '13px' }}>
                                {monthGroups.map((mg, i) => (
                                    <div key={i} className="absolute text-[9px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide"
                                        style={{ left: mg.startIdx * WEEK_W + 'px', width: mg.count * WEEK_W + 'px' }}>
                                        {mg.label}
                                    </div>
                                ))}
                            </div>

                            {/* Week labels */}
                            <div className="relative mb-2.5" style={{ height: '12px' }}>
                                {weeks.map((w, i) => (
                                    <div key={i} className="absolute text-[8px] text-slate-300 dark:text-[#475569] text-center"
                                        style={{ left: i * WEEK_W + 'px', width: WEEK_W + 'px' }}>
                                        W{w.weekNum}
                                    </div>
                                ))}
                            </div>

                            {/* Phase bars */}
                            <div className="relative mb-1.5" style={{ height: '20px' }}>
                                {plan.phases.map(ph => {
                                    if (!ph.startDate) return null;
                                    const l = pxLeft(ph.startDate);
                                    const w = ph.endDate ? pxWidth(ph.startDate, ph.endDate) : 40;
                                    return (
                                        <div key={ph.id}
                                            className="absolute h-full rounded flex items-center px-2 overflow-hidden"
                                            style={{ left: l + 'px', width: w + 'px', backgroundColor: (ph.color || '#6366f1') + '25', border: `1px solid ${ph.color || '#6366f1'}50` }}>
                                            <span className="text-[9px] font-bold truncate" style={{ color: ph.color || '#6366f1' }}>{ph.name}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Period bars — click to select */}
                            <div className="relative" style={{ height: '22px' }}>
                                {allBlocks.map(block => {
                                    if (!block.startDate) return null;
                                    const l    = pxLeft(block.startDate);
                                    const w    = block.endDate ? Math.max(20, pxWidth(block.startDate, block.endDate)) : 28;
                                    const isSel = block.id === selectedId;
                                    return (
                                        <button key={block.id}
                                            onClick={e => { e.stopPropagation(); setSelectedId(isSel ? null : block.id); }}
                                            title={block.label || block.name}
                                            className="absolute h-full rounded flex items-center justify-center transition-all hover:opacity-90"
                                            style={{
                                                left: l + 'px', width: w + 'px',
                                                backgroundColor: isSel ? (block.phase.color || '#6366f1') : (block.phase.color || '#6366f1') + '20',
                                                border: `1px solid ${block.phase.color || '#6366f1'}${isSel ? 'ff' : '60'}`,
                                                outline: isSel ? `2px solid ${block.phase.color || '#6366f1'}` : 'none',
                                                outlineOffset: '1px',
                                            }}>
                                            <span className="text-[8px] font-bold px-1 truncate"
                                                style={{ color: isSel ? 'white' : (block.phase.color || '#6366f1') }}>
                                                {block.globalNum}
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
                            <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-[#243A58]">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-0.5 bg-blue-500 rounded" />
                                    <span className="text-[8px] text-slate-400 dark:text-[#64748B]">Today</span>
                                </div>
                                {plan.phases.map(ph => (
                                    <div key={ph.id} className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ph.color || '#6366f1' }} />
                                        <span className="text-[8px] text-slate-400 dark:text-[#64748B]">{ph.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Flat table ───────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">All Periods</h4>
                    <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                        <Plus size={11} /> Add Phase
                    </button>
                </div>

                {/* Table header */}
                <div className="hidden md:grid px-5 py-2 border-b border-slate-100 dark:border-[#243A58] bg-slate-50/40 dark:bg-[#0F1C30]/20"
                    style={{ gridTemplateColumns: '32px 1fr 130px 44px 140px 100px 32px' }}>
                    {['#', 'Period', 'Dates', 'Wks', 'Block Type', 'Status', ''].map(h => (
                        <span key={h} className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">{h}</span>
                    ))}
                </div>

                {allBlocks.length === 0 && (
                    <div className="px-5 py-10 text-center">
                        <p className="text-xs text-slate-400 dark:text-[#64748B]">No periods yet. Add periods within each phase.</p>
                    </div>
                )}

                <div className="divide-y divide-slate-100 dark:divide-[#243A58]">
                    {allBlocks.map(block => {
                        const status = getBlockStatus(block, today);
                        const isSel  = block.id === selectedId;

                        return (
                            <div key={block.id}
                                onClick={() => setSelectedId(isSel ? null : block.id)}
                                className={`grid px-5 py-3 cursor-pointer transition-colors items-center gap-2 ${isSel ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-[#1A2D48]/50'}`}
                                style={{ gridTemplateColumns: '32px 1fr 130px 44px 140px 100px 32px' }}>

                                {/* # badge */}
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                    style={{ backgroundColor: block.phase.color || '#6366f1' }}>
                                    {block.globalNum}
                                </div>

                                {/* Period name + phase */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: block.phase.color || '#6366f1' }} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{block.label || block.name}</p>
                                        <p className="text-[9px] text-slate-400 dark:text-[#64748B] truncate">{block.phase.name}</p>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="text-[10px] text-slate-500 dark:text-[#94A3B8]">
                                    {block.startDate ? formatDateShort(block.startDate) : '—'}
                                    {block.endDate ? ` — ${formatDateShort(block.endDate)}` : ''}
                                </div>

                                {/* Weeks */}
                                <div className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] text-center">
                                    {(block.weeks || []).length}
                                </div>

                                {/* Block type */}
                                <div className="min-w-0">
                                    <p className="text-[10px] font-medium text-slate-600 dark:text-[#CBD5E1] truncate">
                                        {block.blockType || '—'}
                                    </p>
                                </div>

                                {/* Status */}
                                <div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide whitespace-nowrap ${status.cls}`}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Actions menu */}
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === block.id ? null : block.id)}
                                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-400 hover:text-slate-600 transition-colors">
                                        <MoreHorizontal size={13} />
                                    </button>
                                    {openMenuId === block.id && (
                                        <div className="absolute right-0 top-7 z-20 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-lg py-1.5 w-44">
                                            <button
                                                onClick={() => { onViewInMicrocycles(block.phase.id, block.id); setOpenMenuId(null); }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                <Eye size={12} /> View Microcycles
                                            </button>
                                            <button
                                                onClick={() => { setEditingPlanBlock({ ...block, _phaseId: block.phase.id }); setIsPlanBlockModalOpenNew(true); setOpenMenuId(null); }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                <PencilIcon size={12} /> Edit Period
                                            </button>
                                            <div className="my-1 border-t border-slate-100 dark:border-[#243A58]" />
                                            <button
                                                onClick={() => {
                                                    handleDeletePlanBlock(block.phase.id, block.id);
                                                    setOpenMenuId(null);
                                                    if (selectedId === block.id) setSelectedId(null);
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

                {/* Per-phase add-period buttons */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-[#243A58] flex flex-wrap gap-2">
                    {plan.phases.map(ph => (
                        <button key={ph.id}
                            onClick={() => { setEditingPlanBlock({ _phaseId: ph.id }); setIsPlanBlockModalOpenNew(true); }}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-dashed hover:border-solid transition-all"
                            style={{ color: ph.color || '#6366f1', borderColor: (ph.color || '#6366f1') + '60' }}>
                            <Plus size={10} /> Add to {ph.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Selected period detail panel ──────────────────────────────── */}
            {selectedBlock && (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#243A58]">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1.5 h-5 rounded-full shrink-0" style={{ backgroundColor: selectedBlock.phase.color }} />
                            <div>
                                <span className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0]">{selectedBlock.label || selectedBlock.name}</span>
                                <span className="text-xs text-slate-400 dark:text-[#64748B] ml-2">
                                    {formatDateShort(selectedBlock.startDate)}
                                    {selectedBlock.endDate ? ` — ${formatDateShort(selectedBlock.endDate)}` : ''}
                                    {(selectedBlock.weeks || []).length > 0 ? ` · ${(selectedBlock.weeks || []).length} weeks` : ''}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onViewInMicrocycles(selectedBlock.phase.id, selectedBlock.id)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border border-indigo-200 dark:border-indigo-800/40">
                                <Eye size={12} /> View Microcycles
                            </button>
                            <button
                                onClick={() => { setEditingPlanBlock({ ...selectedBlock, _phaseId: selectedBlock.phase.id }); setIsPlanBlockModalOpenNew(true); }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#94A3B8] hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors border border-slate-200 dark:border-[#243A58]">
                                <PencilIcon size={12} /> Edit Period
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-[#243A58]">
                        {/* Goals */}
                        <div className="p-5">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-2">Goals & Objectives</p>
                            {selectedBlock.goals ? (
                                <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">{selectedBlock.goals}</p>
                            ) : (
                                <p className="text-[10px] italic text-slate-300 dark:text-[#475569]">No goals set — edit period to add.</p>
                            )}
                        </div>

                        {/* Modality mix */}
                        <div className="p-5">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-2">Training Modalities</p>
                            {Object.keys(selectedBlock.modalities || {}).length > 0 ? (
                                <div className="space-y-1.5">
                                    {Object.entries(selectedBlock.modalities).map(([mod, level]) => (
                                        <div key={mod} className="flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-slate-600 dark:text-[#CBD5E1]">{mod}</span>
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-[#243A58]">{level}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] italic text-slate-300 dark:text-[#475569]">No modality loads set — edit period to add.</p>
                            )}
                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-[#243A58] grid grid-cols-2 gap-2 text-[10px]">
                                <div>
                                    <span className="text-slate-400 dark:text-[#64748B]">Intensity</span>
                                    <p className="font-semibold text-slate-700 dark:text-[#CBD5E1]">{selectedBlock.intensityLevel || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-slate-400 dark:text-[#64748B]">Volume</span>
                                    <p className="font-semibold text-slate-700 dark:text-[#CBD5E1]">{selectedBlock.volumeLevel || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Microcycles */}
                        <div className="p-5">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-2">Microcycles</p>
                            <div className="flex items-baseline gap-1.5 mb-3">
                                <span className="text-3xl font-bold text-slate-800 dark:text-[#E2E8F0]">{(selectedBlock.weeks || []).length}</span>
                                <span className="text-xs text-slate-400 dark:text-[#64748B]">weeks planned</span>
                            </div>
                            <button
                                onClick={() => onViewInMicrocycles(selectedBlock.phase.id, selectedBlock.id)}
                                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border border-indigo-200 dark:border-indigo-800/40 w-full">
                                <Eye size={12} /> View Microcycles
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
