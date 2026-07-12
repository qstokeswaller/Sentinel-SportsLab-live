// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    Plus, PencilIcon, Trash2, MoreHorizontal, X,
    Layers, BookOpen, BarChart2, Target,
    CheckCircle2, Loader2, Timer, LayoutList,
} from 'lucide-react';
import { formatDateShort, EVENT_TYPE_COLORS } from '../../utils/periodizationUtils';

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

// ── Block status ───────────────────────────────────────────────────────────────
function getBlockStatus(block, today) {
    if (!block.startDate) return { label: 'No Date', cls: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]' };
    if (block.endDate && block.endDate < today) return { label: 'Completed', cls: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]' };
    if (block.startDate <= today && (!block.endDate || block.endDate >= today)) return { label: 'In Progress', cls: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40' };
    return { label: 'Upcoming', cls: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40' };
}

// ── Intensity badge ────────────────────────────────────────────────────────────
const INTENSITY_CLS = {
    'Low':      'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    'Moderate': 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    'High':     'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400',
    'Very High':'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
};

function IntensityBadge({ value }) {
    if (!value) return <span className="text-slate-300 dark:text-[#475569] text-[9px]">—</span>;
    return (
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${INTENSITY_CLS[value] || 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]'}`}>
            {value}
        </span>
    );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, valueClass = 'text-slate-800 dark:text-[#E2E8F0]' }) {
    return (
        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 flex items-center gap-3">
            <div className="text-slate-300 dark:text-[#475569] shrink-0">{icon}</div>
            <div>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-0.5">{label}</p>
                <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
            </div>
        </div>
    );
}

// ── Gantt popup ────────────────────────────────────────────────────────────────
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
                <button onClick={onClose} aria-label="Close" className="shrink-0 text-slate-400 hover:text-slate-600 dark:text-[#CBD5E1] dark:hover:text-slate-300"><X size={11} /></button>
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

// ── Main ───────────────────────────────────────────────────────────────────────
export const BlocksTab = ({ plan }) => {
    const {
        setIsPlanBlockModalOpenNew, setEditingPlanBlock,
        handleDeletePlanBlock,
    } = useAppState();

    const [selectedKey, setSelectedKey] = useState(null); // "phaseId:blockId"
    const [openMenuKey, setOpenMenuKey] = useState(null);
    const today = new Date().toISOString().split('T')[0];

    const [popup, setPopup] = useState(null);
    useEffect(() => {
        if (!popup) return;
        const close = () => setPopup(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [popup]);
    const openEvPopup = (e, ev) => {
        e.stopPropagation();
        const color = ev.color || EVENT_TYPE_COLORS[ev.type] || '#6366f1';
        const title = ev.label || ev.title || '';
        setPopup(p => p?.id === ev.id ? null : {
            id: ev.id, title, accent: color,
            rows: [
                ['Type',     ev.type?.replace(/_/g, ' ') || '—'],
                ['Date',     [ev.date && formatDateShort(ev.date), ev.endDate && formatDateShort(ev.endDate)].filter(Boolean).join(' — ') || '—'],
                ['Impt.',    ev.importance],
                ['Location', ev.location],
                ['Notes',    ev.description],
            ],
            x: e.clientX, y: e.clientY,
        });
    };

    // Flat list of all blocks with parent phase info
    const allBlocks = useMemo(() =>
        plan.phases.flatMap(ph =>
            ph.blocks.map(b => ({ ...b, phaseName: ph.name, phaseColor: ph.color, phaseId: ph.id }))
        ),
        [plan.phases]
    );

    // Stats
    const stats = useMemo(() => {
        const completed  = allBlocks.filter(b => b.endDate && b.endDate < today).length;
        const inProgress = allBlocks.filter(b => b.startDate && b.startDate <= today && (!b.endDate || b.endDate >= today)).length;
        const upcoming   = allBlocks.filter(b => b.startDate && b.startDate > today).length;
        return { total: allBlocks.length, completed, inProgress, upcoming };
    }, [allBlocks, today]);

    // Gantt date range (phases + blocks)
    const ganttDates = useMemo(() => {
        const starts = [plan.startDate, ...plan.phases.map(ph => ph.startDate), ...allBlocks.map(b => b.startDate)].filter(Boolean).sort();
        const ends   = [plan.endDate,   ...plan.phases.map(ph => ph.endDate),   ...allBlocks.map(b => b.endDate)].filter(Boolean).sort();
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
            else groups[groups.length - 1].count++;
        });
        return groups;
    }, [weeks]);

    const WEEK_W    = 38;
    const showToday     = ganttDates.start && today >= ganttDates.start && today <= ganttDates.end;
    const todayWeekIdx_ = showToday ? Math.floor(daysBetween(ganttDates.start, today) / 7) : -1;
    const todayWeekLeft = todayWeekIdx_ * WEEK_W;
    const ganttW    = Math.max(640, weeks.length * WEEK_W);
    const totalDays = Math.max(1, daysBetween(ganttDates.start, ganttDates.end));
    const pxLeft    = d => Math.max(0, daysBetween(ganttDates.start, d) / totalDays * ganttW);
    const pxWidth   = (s, e) => Math.max(4, (daysBetween(s, e || s) + 1) / totalDays * ganttW);
    const weekRect = (startDate, endDate) => {
        if (!startDate) return null;
        const sWk = Math.floor(daysBetween(ganttDates.start, startDate) / 7);
        const eWk = endDate ? Math.floor(daysBetween(ganttDates.start, endDate) / 7) : sWk;
        return { left: sWk * WEEK_W, width: Math.max(WEEK_W, (eWk - sWk + 1) * WEEK_W) };
    };

    const selectedBlock = allBlocks.find(b => `${b.phaseId}:${b.id}` === selectedKey);

    // ── Empty state ────────────────────────────────────────────────────────────
    if (plan.phases.length === 0 || allBlocks.length === 0) {
        return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 text-center">
                <Layers size={32} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1] mb-1">No training blocks yet</p>
                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mb-4">
                    {plan.phases.length === 0
                        ? 'Add phases first, then add training blocks (periods) within each phase.'
                        : 'Add training blocks within your phases to see them here.'}
                </p>
                <button onClick={() => { setEditingPlanBlock(null); setIsPlanBlockModalOpenNew(true); }}
                    disabled={plan.phases.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    + Add First Block
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4" onClick={() => setOpenMenuKey(null)}>

            {/* ── Stat cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={<LayoutList size={18} />}   label="Total Blocks"  value={stats.total} />
                <StatCard icon={<CheckCircle2 size={18} />} label="Completed"     value={stats.completed} />
                <StatCard icon={<Loader2 size={18} />}      label="In Progress"   value={stats.inProgress} valueClass="text-green-600 dark:text-green-400" />
                <StatCard icon={<Timer size={18} />}        label="Upcoming"      value={stats.upcoming}   valueClass="text-blue-600 dark:text-blue-400" />
            </div>

            {/* ── Gantt — phases + blocks ──────────────────────────────────── */}
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
                            <div className="flex items-center" style={{ height: '20px' }}>
                                <span className="text-[9px] font-semibold text-slate-700 dark:text-[#E2E8F0]">Phases</span>
                            </div>
                            <div className="flex items-center" style={{ height: '24px' }}>
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

                            {/* Month labels — bordered + nowrap */}
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
                                    const isToday = showToday && i === todayWeekIdx_;
                                    return (
                                        <div key={i}
                                            className={`absolute text-[8px] text-center z-10 ${isToday ? 'text-rose-500 font-semibold' : 'text-slate-300 dark:text-[#475569]'}`}
                                            style={{ left: i * WEEK_W + 'px', width: WEEK_W + 'px' }}>
                                            W{w.weekNum}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Phase + Block + Event rows — wrapped for full-height today line */}
                            <div className="relative">
                                {showToday && (
                                    <div className="absolute top-0 bottom-0 bg-rose-50 dark:bg-rose-900/15 pointer-events-none z-0"
                                        style={{ left: todayWeekLeft + 'px', width: WEEK_W + 'px' }} />
                                )}
                            {/* Phase bars (reference row) */}
                            <div className="relative" style={{ height: '20px' }}>
                                {plan.phases.map(ph => {
                                    if (!ph.startDate) return null;
                                    const rect = weekRect(ph.startDate, ph.endDate);
                                    const l = rect.left;
                                    const w = rect.width;
                                    return (
                                        <div key={ph.id} title={ph.name}
                                            className="absolute h-full rounded flex items-center px-2 overflow-hidden"
                                            style={{ left: l + 'px', width: w + 'px', backgroundColor: (ph.color || '#6366f1') + '20', border: `1px solid ${ph.color || '#6366f1'}60` }}>
                                            <span className="text-[8px] font-semibold text-slate-500 dark:text-[#CBD5E1] truncate">{ph.name}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Block bars — back-to-back with phase row */}
                            <div className="relative" style={{ height: '24px' }}>
                                {allBlocks.map(b => {
                                    if (!b.startDate) return null;
                                    const key  = `${b.phaseId}:${b.id}`;
                                    const rect = weekRect(b.startDate, b.endDate);
                                    const l    = rect.left;
                                    const w    = rect.width;
                                    const isSel = key === selectedKey;
                                    return (
                                        <button key={key}
                                            onClick={e => { e.stopPropagation(); setSelectedKey(isSel ? null : key); }}
                                            title={`${b.label || b.name}${b.label && b.name ? ' · ' + b.name : ''}`}
                                            className="absolute h-full rounded-lg flex items-center px-1.5 overflow-hidden transition-all hover:opacity-90"
                                            style={{
                                                left: l + 'px', width: w + 'px',
                                                backgroundColor: isSel ? (b.color || '#6366f1') : (b.color || '#6366f1') + '35',
                                                border: `1.5px solid ${b.color || '#6366f1'}${isSel ? 'ff' : '80'}`,
                                                outline: isSel ? `2px solid ${b.color || '#6366f1'}` : 'none',
                                                outlineOffset: '1px',
                                            }}>
                                            <span className="text-[8px] font-bold truncate"
                                                style={{ color: isSel ? 'white' : (b.color || '#6366f1') }}>
                                                {b.label || b.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Event bars — directly under blocks */}
                            {(plan.events || []).length > 0 && (
                                <div className="relative" style={{ height: '14px' }}>
                                    {(plan.events || []).map(ev => {
                                        const l     = pxLeft(ev.date);
                                        const rawW  = ev.endDate ? pxWidth(ev.date, ev.endDate) : pxWidth(ev.date, ev.date);
                                        const w     = Math.max(rawW, 36);
                                        const color = ev.color || EVENT_TYPE_COLORS[ev.type] || '#6366f1';
                                        const isOpen = popup?.id === ev.id;
                                        return (
                                            <button key={ev.id} onClick={e => openEvPopup(e, ev)}
                                                title={ev.label || ev.title || ''}
                                                className="absolute h-full rounded flex items-center px-1 overflow-hidden transition-all hover:opacity-80 cursor-pointer"
                                                style={{ left: l + 'px', width: w + 'px', backgroundColor: color + (isOpen ? '50' : '30'), border: `1.5px solid ${color}` }}>
                                                <span className="text-[7px] font-semibold truncate" style={{ color }}>{ev.label || ev.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {/* Full-height today line */}
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

            {/* ── Blocks table ─────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                    <h4 className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Training Blocks</h4>
                    <button onClick={() => { setEditingPlanBlock(null); setIsPlanBlockModalOpenNew(true); }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                        <Plus size={11} /> Add Block
                    </button>
                </div>

                {/* Table header */}
                <div className="hidden md:grid gap-2 px-5 py-2 border-b border-slate-100 dark:border-[#243A58] bg-slate-50/40 dark:bg-[#0F1C30]/20"
                    style={{ gridTemplateColumns: '28px 110px 1fr 130px 150px 44px 90px 90px 32px' }}>
                    {[
                        { h: '#',         cls: '' },
                        { h: 'Phase',     cls: '' },
                        { h: 'Block',     cls: 'pl-3' },
                        { h: 'Category',  cls: '' },
                        { h: 'Dates',     cls: '' },
                        { h: 'Wks',       cls: 'text-center' },
                        { h: 'Intensity', cls: '' },
                        { h: 'Status',    cls: '' },
                        { h: '',          cls: '' },
                    ].map(({ h, cls }) => (
                        <span key={h || 'actions'} className={`text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide ${cls}`}>{h}</span>
                    ))}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-[#243A58]">
                    {allBlocks.map((block, idx) => {
                        const key     = `${block.phaseId}:${block.id}`;
                        const status  = getBlockStatus(block, today);
                        const isSel   = key === selectedKey;

                        return (
                            <div key={key}
                                onClick={() => setSelectedKey(isSel ? null : key)}
                                className={`grid px-5 py-3.5 cursor-pointer transition-colors items-center gap-2 ${isSel ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-[#1A2D48]/50'}`}
                                style={{ gridTemplateColumns: '28px 110px 1fr 130px 150px 44px 90px 90px 32px' }}>

                                {/* # */}
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                    style={{ backgroundColor: block.color || '#6366f1' }}>
                                    {idx + 1}
                                </div>

                                {/* Phase */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: block.phaseColor || '#6366f1' }} />
                                    <span className="text-[10px] text-slate-500 dark:text-[#CBD5E1] truncate">{block.phaseName}</span>
                                </div>

                                {/* Block name + label */}
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: block.color || '#6366f1' }} />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">
                                            {block.name}{block.label ? <span className="font-normal text-slate-500 dark:text-[#CBD5E1]"> · {block.label}</span> : ''}
                                        </p>
                                        {block.goals && (
                                            <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] truncate">{block.goals}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Category */}
                                <div className="text-[10px] font-medium text-slate-600 dark:text-[#CBD5E1] truncate">
                                    {block.blockType || '—'}
                                </div>

                                {/* Dates */}
                                <div className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                                    {block.startDate ? formatDateShort(block.startDate) : '—'}
                                    {block.endDate ? ` — ${formatDateShort(block.endDate)}` : ''}
                                </div>

                                {/* Weeks */}
                                <div className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1] text-center">
                                    {(block.weeks || []).length > 0
                                        ? (block.weeks || []).length
                                        : <span className="text-slate-300 dark:text-[#475569]">—</span>}
                                </div>

                                {/* Intensity */}
                                <div><IntensityBadge value={block.intensityLevel} /></div>

                                {/* Status */}
                                <div>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide whitespace-nowrap ${status.cls}`}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="relative" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setOpenMenuKey(openMenuKey === key ? null : key)}
                                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-400 hover:text-slate-600 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1] transition-colors">
                                        <MoreHorizontal size={13} />
                                    </button>
                                    {openMenuKey === key && (
                                        <div className="absolute right-0 top-7 z-20 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-lg py-1.5 w-36">
                                            <button
                                                onClick={() => {
                                                    setEditingPlanBlock({ ...block, _phaseId: block.phaseId });
                                                    setIsPlanBlockModalOpenNew(true);
                                                    setOpenMenuKey(null);
                                                }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                <PencilIcon size={12} /> Edit Block
                                            </button>
                                            <div className="my-1 border-t border-slate-100 dark:border-[#243A58]" />
                                            <button
                                                onClick={() => {
                                                    handleDeletePlanBlock(block.phaseId, block.id);
                                                    setOpenMenuKey(null);
                                                    if (selectedKey === key) setSelectedKey(null);
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

            {/* ── Selected block detail panel ───────────────────────────────── */}
            {selectedBlock && (() => {
                const totalWeeks    = (selectedBlock.weeks || []).length;
                const totalSessions = (selectedBlock.weeks || []).reduce((s, w) => s + (w.sessions || []).length, 0);
                const modEntries    = Object.entries(selectedBlock.modalities || {});

                return (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#243A58]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-1.5 h-5 rounded-full shrink-0" style={{ backgroundColor: selectedBlock.color || '#6366f1' }} />
                                <div>
                                    <span className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0]">
                                        {selectedBlock.name}{selectedBlock.label ? ` · ${selectedBlock.label}` : ''}
                                    </span>
                                    <span className="text-xs text-slate-400 dark:text-[#CBD5E1] ml-2">
                                        {formatDateShort(selectedBlock.startDate)}
                                        {selectedBlock.endDate ? ` — ${formatDateShort(selectedBlock.endDate)}` : ''}
                                        {' · '}{selectedBlock.blockType}
                                        {' · '}{selectedBlock.phaseName}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setEditingPlanBlock({ ...selectedBlock, _phaseId: selectedBlock.phaseId }); setIsPlanBlockModalOpenNew(true); }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors border border-slate-200 dark:border-[#243A58]">
                                <PencilIcon size={12} /> Edit Block
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-[#243A58]">

                            {/* Goals */}
                            <div className="p-5">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <BookOpen size={12} className="text-slate-400" />
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Goals & Objectives</p>
                                </div>
                                {selectedBlock.goals ? (
                                    <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">{selectedBlock.goals}</p>
                                ) : (
                                    <p className="text-[10px] italic text-slate-300 dark:text-[#475569]">No goals set — edit block to add.</p>
                                )}
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#243A58]">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <p className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-0.5">Intensity</p>
                                            <IntensityBadge value={selectedBlock.intensityLevel} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-0.5">Volume</p>
                                            <IntensityBadge value={selectedBlock.volumeLevel} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Planning summary */}
                            <div className="p-5">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <BarChart2 size={12} className="text-slate-400" />
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Planning Summary</p>
                                </div>
                                <div className="space-y-2.5">
                                    {[
                                        { label: 'Microcycles', value: totalWeeks },
                                        { label: 'Sessions',    value: totalSessions },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">{label}</span>
                                            <span className="text-sm font-bold text-slate-700 dark:text-[#E2E8F0]">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modalities */}
                            <div className="p-5">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <Target size={12} className="text-slate-400" />
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Block Modalities</p>
                                </div>
                                {modEntries.length > 0 ? (
                                    <div className="space-y-1.5">
                                        {modEntries.map(([mod, desc]) => (
                                            <div key={mod} className="flex items-start gap-2">
                                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] shrink-0">{mod}</span>
                                                {desc && <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] leading-tight">{desc}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] italic text-slate-300 dark:text-[#475569]">
                                        No modalities assigned — configure them in the Microcycles tab.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
