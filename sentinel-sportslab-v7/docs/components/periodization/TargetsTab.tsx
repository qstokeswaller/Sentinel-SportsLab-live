// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { METRIC_CATALOGUE, EVENT_TYPE_COLORS, formatDateShort } from '../../utils/periodizationUtils';
import {
    Plus, CheckCircle2, AlertTriangle, XCircle, Clock,
    PencilIcon, Trash2, MoreHorizontal, Target,
    ChevronDown, ChevronRight, CalendarDays,
} from 'lucide-react';

// ── Mini Gantt Strip ───────────────────────────────────────────────────────────

function daysBetweenGantt(a, b) {
    if (!a || !b) return 0;
    return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function getGanttWeeks(startStr, endStr) {
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

function GanttPopup({ popup, onClose }) {
    if (!popup) return null;
    const { kind, item, x, y } = popup;

    const accent = kind === 'phase' ? (item.color || '#6366f1')
                 : kind === 'block' ? (item.color || item.phaseColor || '#6366f1')
                 : (item.color || EVENT_TYPE_COLORS[item.type] || '#6366f1');

    const rows = [];
    if (kind === 'phase') {
        rows.push(['Dates', [item.startDate && formatDateShort(item.startDate), item.endDate && formatDateShort(item.endDate)].filter(Boolean).join(' — ') || '—']);
        if (item.goals)   rows.push(['Goals', item.goals]);
        if (item.focuses?.length) rows.push(['Focus', item.focuses.join(', ')]);
    } else if (kind === 'block') {
        rows.push(['Phase', item.phaseName || '—']);
        rows.push(['Dates', [item.startDate && formatDateShort(item.startDate), item.endDate && formatDateShort(item.endDate)].filter(Boolean).join(' — ') || '—']);
        if (item.blockType)      rows.push(['Category', item.blockType]);
        if (item.intensityLevel) rows.push(['Intensity', item.intensityLevel]);
        if (item.goals)          rows.push(['Goals', item.goals]);
    } else {
        rows.push(['Type', item.type?.replace(/_/g, ' ') || '—']);
        rows.push(['Date', [item.date && formatDateShort(item.date), item.endDate && formatDateShort(item.endDate)].filter(Boolean).join(' — ') || '—']);
        if (item.importance) rows.push(['Importance', item.importance]);
        if (item.location)   rows.push(['Location', item.location]);
        if (item.description) rows.push(['Notes', item.description]);
    }

    const safeX = Math.min(x + 14, window.innerWidth - 240);
    const safeY = Math.min(y - 8, window.innerHeight - 220);

    return (
        <div className="fixed z-[700] bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl w-52 overflow-hidden"
            style={{ left: safeX + 'px', top: safeY + 'px' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-[#243A58]"
                style={{ borderLeftWidth: '3px', borderLeftColor: accent }}>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-800 dark:text-[#E2E8F0] truncate">{item.label || item.name}</p>
                    <p className="text-[9px] text-slate-400 dark:text-[#64748B] capitalize">{kind}</p>
                </div>
                <button onClick={onClose} className="shrink-0 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48]">
                    <ChevronRight size={11} className="text-slate-400" />
                </button>
            </div>
            <div className="px-3 py-2 space-y-1.5">
                {rows.map(([label, val]) => (
                    <div key={label} className="flex gap-2">
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wide shrink-0 w-14">{label}</span>
                        <span className="text-[9px] text-slate-600 dark:text-[#CBD5E1] leading-tight flex-1 min-w-0 break-words">{val}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PlanGanttStrip({ plan }) {
    const [popup, setPopup] = useState(null);

    const ganttStart = plan.startDate || plan.phases[0]?.startDate;
    const ganttEnd   = plan.endDate   || plan.phases.reduce((l, ph) => {
        const e = ph.endDate || ph.blocks.reduce((bl, b) => (b.endDate && b.endDate > bl ? b.endDate : bl), '');
        return e > l ? e : l;
    }, '');

    React.useEffect(() => {
        if (!popup) return;
        const close = () => setPopup(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [popup]);

    if (!ganttStart || !ganttEnd) return null;

    const today      = new Date().toISOString().split('T')[0];
    const weeks      = getGanttWeeks(ganttStart, ganttEnd);
    const monthGroups = (() => {
        const groups = [];
        weeks.forEach((w, i) => {
            const label = `${w.month} ${w.year}`;
            if (!groups.length || groups[groups.length - 1].label !== label)
                groups.push({ label, startIdx: i, count: 1 });
            else groups[groups.length - 1].count++;
        });
        return groups;
    })();

    const WEEK_W     = 38;
    const ganttW     = Math.max(640, weeks.length * WEEK_W);
    const totalDays  = Math.max(1, daysBetweenGantt(ganttStart, ganttEnd));
    const pxLeft     = d => Math.max(0, (daysBetweenGantt(ganttStart, d) / totalDays) * ganttW);
    const pxWidth    = (s, e) => Math.max(4, (daysBetweenGantt(s, e || s) / totalDays) * ganttW);

    const openPopup = (e, kind, item) => {
        e.stopPropagation();
        setPopup(p => p?.item?.id === item.id ? null : { kind, item, x: e.clientX, y: e.clientY });
    };

    return (
        <>
        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
            <div className="px-5 py-2.5 border-b border-slate-100 dark:border-[#243A58] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <CalendarDays size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Plan Timeline</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                    {formatDateShort(ganttStart)} — {formatDateShort(ganttEnd)}
                </span>
            </div>
            <div className="flex">
                <div className="shrink-0 w-16 border-r border-slate-100 dark:border-[#243A58] py-3 flex flex-col items-end pr-3">
                    <div style={{ height: '39px' }} />
                    <div className="flex items-center" style={{ height: '24px', marginBottom: '8px' }}>
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-[#64748B]">Phases</span>
                    </div>
                    <div className="flex items-center" style={{ height: '18px', marginBottom: '6px' }}>
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-[#64748B]">Blocks</span>
                    </div>
                    {(plan.events || []).length > 0 && (
                        <div className="flex items-center" style={{ height: '14px' }}>
                            <span className="text-[9px] font-semibold text-slate-400 dark:text-[#64748B]">Events</span>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto flex-1">
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
                    {/* Phase bars */}
                    <div className="relative mb-2" style={{ height: '24px' }}>
                        {plan.phases.map(ph => {
                            if (!ph.startDate) return null;
                            const l = pxLeft(ph.startDate);
                            const w = ph.endDate ? pxWidth(ph.startDate, ph.endDate) : 60;
                            const isOpen = popup?.item?.id === ph.id;
                            return (
                                <button key={ph.id} onClick={e => openPopup(e, 'phase', ph)}
                                    className="absolute h-full rounded-lg flex items-center px-2 overflow-hidden transition-all hover:opacity-80 cursor-pointer"
                                    style={{ left: l + 'px', width: w + 'px', backgroundColor: (ph.color || '#6366f1') + (isOpen ? '40' : '28'), border: `1.5px solid ${ph.color || '#6366f1'}${isOpen ? 'cc' : '80'}` }}>
                                    <span className="text-[9px] font-bold truncate" style={{ color: ph.color || '#6366f1' }}>{ph.name}</span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Block bars + today line */}
                    <div className="relative mb-1.5" style={{ height: '18px' }}>
                        {plan.phases.flatMap(ph => ph.blocks.map(b => ({ ...b, phaseColor: ph.color, phaseName: ph.name }))).map(b => {
                            if (!b.startDate) return null;
                            const l = pxLeft(b.startDate);
                            const w = pxWidth(b.startDate, b.endDate || b.startDate);
                            const color = b.color || b.phaseColor || '#6366f1';
                            const isOpen = popup?.item?.id === b.id;
                            return (
                                <button key={b.id} onClick={e => openPopup(e, 'block', b)}
                                    className="absolute h-full rounded flex items-center px-1 overflow-hidden transition-all hover:opacity-80 cursor-pointer"
                                    style={{ left: l + 'px', width: w + 'px', backgroundColor: color + (isOpen ? '40' : '28'), border: `1px solid ${color}${isOpen ? 'cc' : '60'}` }}>
                                    <span className="text-[8px] font-semibold truncate" style={{ color }}>{b.name}</span>
                                </button>
                            );
                        })}
                        {today >= ganttStart && today <= ganttEnd && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 rounded-full"
                                style={{ left: pxLeft(today) + 'px' }} />
                        )}
                    </div>
                    {/* Event bars */}
                    {(plan.events || []).length > 0 && (
                        <div className="relative" style={{ height: '14px' }}>
                            {(plan.events || []).map(ev => {
                                const l     = pxLeft(ev.date);
                                const rawW  = ev.endDate ? pxWidth(ev.date, ev.endDate) : pxWidth(ev.date, ev.date);
                                const w     = Math.max(rawW, 36);
                                const color = ev.color || EVENT_TYPE_COLORS[ev.type] || '#6366f1';
                                const isOpen = popup?.item?.id === ev.id;
                                return (
                                    <button key={ev.id} onClick={e => openPopup(e, 'event', ev)}
                                        className="absolute h-full rounded flex items-center px-1 overflow-hidden transition-all hover:opacity-80 cursor-pointer"
                                        style={{ left: l + 'px', width: w + 'px', backgroundColor: color + (isOpen ? '50' : '30'), border: `1.5px solid ${color}` }}>
                                        <span className="text-[7px] font-semibold truncate" style={{ color }}>{ev.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                </div>
            </div>
        </div>
        <GanttPopup popup={popup} onClose={() => setPopup(null)} />
        </>
    );
}

// ── Config ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    on_track:  { label: 'On Track',  cls: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40',  Icon: CheckCircle2 },
    at_risk:   { label: 'At Risk',   cls: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',   Icon: AlertTriangle },
    off_track: { label: 'Off Track', cls: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/40',               Icon: XCircle },
    pending:   { label: 'Pending',   cls: 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]',         Icon: Clock },
};

const PRIORITY_CFG = {
    high:   { label: 'High',   dot: 'bg-red-500' },
    medium: { label: 'Med',    dot: 'bg-amber-400' },
    low:    { label: 'Low',    dot: 'bg-slate-300 dark:bg-[#475569]' },
};

const OP_LABEL = { '>=': '≥', '<=': '≤', '=': '=', between: '', qualitative: '' };

// ── Donut chart ────────────────────────────────────────────────────────────────

function DonutChart({ onTrack, atRisk, offTrack, pending }) {
    const total = onTrack + atRisk + offTrack + pending;
    const R = 40;
    const C = 2 * Math.PI * R;
    const segs = [
        { n: onTrack,  color: '#10b981' },
        { n: atRisk,   color: '#f59e0b' },
        { n: offTrack, color: '#ef4444' },
        { n: pending,  color: '#94a3b8' },
    ].filter(s => s.n > 0);

    let offset = 0;
    return (
        <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-24 h-24">
                <circle cx="50" cy="50" r={R} fill="none" strokeWidth="12"
                    className="stroke-slate-100 dark:stroke-[#1A2D48]" />
                {total > 0 && segs.map((s, i) => {
                    const dash = (s.n / total) * C;
                    const el = (
                        <circle key={i} cx="50" cy="50" r={R} fill="none"
                            stroke={s.color} strokeWidth="12"
                            strokeDasharray={`${dash} ${C - dash}`}
                            strokeDashoffset={C - offset}
                            transform="rotate(-90 50 50)"
                        />
                    );
                    offset += dash;
                    return el;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-slate-800 dark:text-[#E2E8F0] leading-none">{total}</span>
                <span className="text-[8px] text-slate-400 dark:text-[#64748B] mt-0.5">Total</span>
            </div>
        </div>
    );
}

// ── Target row ─────────────────────────────────────────────────────────────────

function TargetRow({ target, phases, onEdit, onDelete }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const catDef = METRIC_CATALOGUE[target.category];
    const statusCfg = STATUS_CONFIG[target.status] || STATUS_CONFIG.pending;
    const priorityCfg = PRIORITY_CFG[target.priority] || PRIORITY_CFG.medium;
    const { Icon: StatusIcon } = statusCfg;

    const block = useMemo(() => {
        if (!target.blockId) return null;
        for (const ph of phases) {
            const b = ph.blocks.find(b => b.id === target.blockId);
            if (b) return b;
        }
        return null;
    }, [target.blockId, phases]);

    const targetDisplay = () => {
        if (target.operator === 'between')
            return `${target.targetValue} — ${target.targetValueMax || '?'} ${target.metricUnit}`.trim();
        if (target.operator === 'qualitative')
            return target.targetValue;
        return `${OP_LABEL[target.operator] || target.operator} ${target.targetValue}${target.metricUnit ? ' ' + target.metricUnit : ''}`;
    };

    const progressPct = useMemo(() => {
        if (!target.currentValue || target.operator === 'qualitative') return null;
        const cur = parseFloat(target.currentValue);
        const tgt = parseFloat(target.targetValue);
        if (isNaN(cur) || isNaN(tgt) || tgt === 0) return null;
        if (target.operator === 'between') {
            const max = parseFloat(target.targetValueMax || String(tgt));
            const mid = (tgt + max) / 2;
            return Math.min(100, Math.round((cur / mid) * 100));
        }
        if (target.operator === '<=') return Math.min(100, Math.round((tgt / Math.max(cur, 0.001)) * 100));
        return Math.min(100, Math.round((cur / tgt) * 100));
    }, [target]);

    return (
        <div className="group flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-[#1A2D48]/40 transition-colors border-b border-slate-100 dark:border-[#243A58] last:border-b-0"
            onClick={() => menuOpen && setMenuOpen(false)}>

            {/* Category badge */}
            <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide whitespace-nowrap"
                style={{
                    color: catDef?.color || '#64748b',
                    backgroundColor: (catDef?.color || '#64748b') + '15',
                    borderColor: (catDef?.color || '#64748b') + '40',
                }}>
                {catDef?.label || target.category}
            </span>

            {/* Metric info */}
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] truncate leading-tight">{target.metricLabel}</p>
                <p className="text-[9px] text-slate-400 dark:text-[#64748B]">{target.metricSource}</p>
            </div>

            {/* Block scope */}
            <div className="shrink-0 hidden lg:flex w-32 justify-end">
                {block ? (
                    <span className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-[#243A58] truncate max-w-full">
                        {block.name}{block.label ? ` · ${block.label}` : ''}
                    </span>
                ) : (
                    <span className="text-[8px] text-slate-300 dark:text-[#475569]">Full Phase</span>
                )}
            </div>

            {/* Target value */}
            <div className="shrink-0 w-32 text-right">
                <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-[#CBD5E1]">{targetDisplay()}</span>
            </div>

            {/* Current + progress bar */}
            <div className="shrink-0 w-32 hidden xl:block">
                {target.currentValue ? (
                    <div>
                        <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-slate-400 dark:text-[#64748B]">Current</span>
                            <span className="text-[9px] font-semibold text-slate-700 dark:text-[#CBD5E1]">
                                {target.currentValue}{target.metricUnit ? ' ' + target.metricUnit : ''}
                            </span>
                        </div>
                        {progressPct !== null && (
                            <div className="h-1 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${progressPct}%`,
                                        backgroundColor: progressPct >= 80 ? '#10b981' : progressPct >= 50 ? '#f59e0b' : '#ef4444',
                                    }} />
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-[9px] italic text-slate-300 dark:text-[#475569]">No current value</span>
                )}
            </div>

            {/* Status */}
            <div className="shrink-0">
                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide whitespace-nowrap ${statusCfg.cls}`}>
                    <StatusIcon size={9} />
                    {statusCfg.label}
                </span>
            </div>

            {/* Priority dot */}
            <div className="shrink-0 flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full shrink-0 ${priorityCfg.dot}`} />
                <span className="text-[9px] text-slate-400 dark:text-[#64748B] hidden 2xl:block">{priorityCfg.label}</span>
            </div>

            {/* Actions menu */}
            <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
                <button onClick={() => setMenuOpen(v => !v)}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100">
                    <MoreHorizontal size={13} />
                </button>
                {menuOpen && (
                    <div className="absolute right-0 top-6 z-20 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-lg py-1.5 w-32">
                        <button onClick={() => { onEdit(target); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                            <PencilIcon size={12} /> Edit
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-[#243A58]" />
                        <button onClick={() => { onDelete(target.id); setMenuOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Phase group ────────────────────────────────────────────────────────────────

function PhaseGroup({ phase, targets, phases, onEdit, onDelete, onAddToPhase }) {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
            <button onClick={() => setCollapsed(v => !v)}
                className="w-full flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-[#243A58] hover:bg-slate-50/60 dark:hover:bg-[#1A2D48]/30 transition-colors"
                style={{ backgroundColor: (phase.color || '#6366f1') + '0d' }}>
                <div className="w-1.5 h-5 rounded-full shrink-0" style={{ backgroundColor: phase.color || '#6366f1' }} />
                <span className="text-xs font-bold text-slate-800 dark:text-[#E2E8F0] flex-1 text-left">{phase.name}</span>
                <span className="text-[9px] font-semibold text-slate-400 dark:text-[#64748B] bg-white/60 dark:bg-[#1A2D48] px-2 py-0.5 rounded-full">
                    {targets.length} target{targets.length !== 1 ? 's' : ''}
                </span>
                <button onClick={e => { e.stopPropagation(); onAddToPhase(phase.id); }}
                    className="flex items-center gap-1 text-[9px] font-semibold text-indigo-500 hover:text-indigo-700 px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    <Plus size={10} /> Add
                </button>
                {collapsed ? <ChevronRight size={13} className="text-slate-400 shrink-0" /> : <ChevronDown size={13} className="text-slate-400 shrink-0" />}
            </button>
            {!collapsed && targets.map(t => (
                <TargetRow key={t.id} target={t} phases={phases} onEdit={onEdit} onDelete={onDelete} />
            ))}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const TargetsTab = ({ plan }) => {
    const {
        setIsPlanTargetModalOpen, setEditingPlanTarget,
        handleDeletePlanTarget,
    } = useAppState();

    const [filterStatus,   setFilterStatus]   = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');

    const targets = plan.targets || [];

    const stats = useMemo(() => ({
        total:    targets.length,
        onTrack:  targets.filter(t => t.status === 'on_track').length,
        atRisk:   targets.filter(t => t.status === 'at_risk').length,
        offTrack: targets.filter(t => t.status === 'off_track').length,
        pending:  targets.filter(t => t.status === 'pending').length,
    }), [targets]);

    const filtered = useMemo(() => targets.filter(t => {
        if (filterStatus   !== 'all' && t.status   !== filterStatus)   return false;
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;
        return true;
    }), [targets, filterStatus, filterCategory]);

    const planWide = filtered.filter(t => t.scope === 'plan' || !t.phaseId);
    const byPhase  = plan.phases
        .map(ph => ({ phase: ph, targets: filtered.filter(t => t.phaseId === ph.id) }))
        .filter(g => g.targets.length > 0);

    const byCat = useMemo(() =>
        Object.entries(METRIC_CATALOGUE).map(([key, def]) => {
            const ct = targets.filter(t => t.category === key);
            return { key, label: def.label, color: def.color, total: ct.length, onTrack: ct.filter(t => t.status === 'on_track').length };
        }).filter(c => c.total > 0),
    [targets]);

    const topPriority = useMemo(() =>
        targets
            .filter(t => t.status === 'at_risk' || t.status === 'off_track')
            .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] ?? 1) - ({ high: 0, medium: 1, low: 2 }[b.priority] ?? 1))
            .slice(0, 5),
    [targets]);

    const openAdd = (phaseId = null) => {
        setEditingPlanTarget(phaseId ? { _phaseId: phaseId } : null);
        setIsPlanTargetModalOpen(true);
    };

    const openEdit = (target) => {
        setEditingPlanTarget(target);
        setIsPlanTargetModalOpen(true);
    };

    // ── Empty state ───────────────────────────────────────────────────────────
    if (targets.length === 0) {
        return (
            <div className="space-y-4">
            <PlanGanttStrip plan={plan} />
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-14 text-center">
                <Target size={36} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8] mb-1">No targets set</p>
                <p className="text-xs text-slate-400 dark:text-[#64748B] mb-5 max-w-xs mx-auto leading-relaxed">
                    Set measurable targets for phases and blocks — track performance, wellness, load, injury, and tactical outputs.
                </p>
                <button onClick={() => openAdd()}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors">
                    + Add First Target
                </button>
            </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* ── Plan Timeline Gantt ──────────────────────────────────────── */}
            <PlanGanttStrip plan={plan} />

            {/* ── Stat cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Targets', value: stats.total,    cls: 'text-slate-800 dark:text-[#E2E8F0]',    sub: 'Across all phases' },
                    { label: 'On Track',      value: stats.onTrack,  cls: 'text-green-600 dark:text-green-400',    sub: pct(stats.onTrack, stats.total) },
                    { label: 'At Risk',       value: stats.atRisk,   cls: 'text-amber-600 dark:text-amber-400',    sub: pct(stats.atRisk, stats.total) },
                    { label: 'Off Track',     value: stats.offTrack, cls: 'text-red-600 dark:text-red-400',        sub: pct(stats.offTrack, stats.total) },
                ].map(({ label, value, cls, sub }) => (
                    <div key={label} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-0.5">{label}</p>
                        <p className={`text-2xl font-bold ${cls}`}>{value}</p>
                        <p className="text-[9px] text-slate-400 dark:text-[#64748B] mt-0.5">{sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── Target list (2/3) ─────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-3">

                    {/* Filter bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">Status:</span>
                        {['all', 'on_track', 'at_risk', 'off_track', 'pending'].map(s => (
                            <button key={s} onClick={() => setFilterStatus(s)}
                                className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                                    filterStatus === s
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'text-slate-500 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58] hover:border-indigo-300'
                                }`}>
                                {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label}
                            </button>
                        ))}
                        {byCat.length > 1 && (
                            <>
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wide ml-2">Category:</span>
                                <button onClick={() => setFilterCategory('all')}
                                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                                        filterCategory === 'all'
                                            ? 'bg-slate-600 text-white border-slate-600'
                                            : 'text-slate-500 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]'
                                    }`}>All</button>
                                {byCat.map(({ key, label, color }) => (
                                    <button key={key} onClick={() => setFilterCategory(filterCategory === key ? 'all' : key)}
                                        className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                                            filterCategory === key ? 'text-white border-transparent' : 'text-slate-500 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]'
                                        }`}
                                        style={filterCategory === key ? { backgroundColor: color, borderColor: color } : {}}>
                                        {label}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>

                    {/* Column header */}
                    <div className="hidden lg:grid px-5 py-1.5"
                        style={{ gridTemplateColumns: 'auto 1fr 8rem 8rem 9rem 7rem 5rem 2rem' }}>
                        {['Category', 'Metric', 'Scope', 'Target', 'Current', 'Status', 'Priority', ''].map(h => (
                            <span key={h} className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide">{h}</span>
                        ))}
                    </div>

                    {/* Plan-wide targets */}
                    {planWide.length > 0 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 dark:border-[#243A58] bg-slate-50/60 dark:bg-[#0F1C30]/30">
                                <div className="w-1.5 h-4 rounded-full bg-slate-300 dark:bg-[#475569] shrink-0" />
                                <span className="text-xs font-bold text-slate-600 dark:text-[#CBD5E1] flex-1">Plan-wide</span>
                                <span className="text-[9px] font-semibold text-slate-400 dark:text-[#64748B] bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] px-1.5 py-0.5 rounded-full">
                                    {planWide.length}
                                </span>
                            </div>
                            {planWide.map(t => (
                                <TargetRow key={t.id} target={t} phases={plan.phases} onEdit={openEdit} onDelete={handleDeletePlanTarget} />
                            ))}
                        </div>
                    )}

                    {/* Phase groups */}
                    {byPhase.map(({ phase, targets: pt }) => (
                        <PhaseGroup
                            key={phase.id}
                            phase={phase}
                            targets={pt}
                            phases={plan.phases}
                            onEdit={openEdit}
                            onDelete={handleDeletePlanTarget}
                            onAddToPhase={openAdd}
                        />
                    ))}

                    {/* Empty filter state */}
                    {filtered.length === 0 && targets.length > 0 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-8 text-center">
                            <p className="text-sm text-slate-400 dark:text-[#64748B]">No targets match the current filters.</p>
                        </div>
                    )}
                </div>

                {/* ── Summary sidebar (1/3) ──────────────────────────────── */}
                <div className="space-y-4">

                    {/* Donut + legend */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-4">Target Summary</p>
                        <div className="flex items-center gap-4">
                            <DonutChart
                                onTrack={stats.onTrack}
                                atRisk={stats.atRisk}
                                offTrack={stats.offTrack}
                                pending={stats.pending}
                            />
                            <div className="space-y-2 flex-1 min-w-0">
                                {[
                                    { label: 'On Track',  count: stats.onTrack,  color: '#10b981' },
                                    { label: 'At Risk',   count: stats.atRisk,   color: '#f59e0b' },
                                    { label: 'Off Track', count: stats.offTrack, color: '#ef4444' },
                                    { label: 'Pending',   count: stats.pending,  color: '#94a3b8' },
                                ].map(({ label, count, color }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            <span className="text-[10px] text-slate-500 dark:text-[#94A3B8]">{label}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-bold text-slate-700 dark:text-[#E2E8F0]">{count}</span>
                                            <span className="text-[9px] text-slate-400 dark:text-[#64748B]">
                                                ({pct(count, stats.total, true)})
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* By category */}
                    {byCat.length > 0 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-3">By Category</p>
                            <div className="space-y-3">
                                {byCat.map(({ key, label, color, total, onTrack }) => (
                                    <div key={key}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-medium text-slate-600 dark:text-[#CBD5E1]">{label}</span>
                                            <span className="text-[9px] text-slate-400 dark:text-[#64748B]">{onTrack} / {total} on track</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${total ? Math.round(onTrack / total * 100) : 0}%`, backgroundColor: color }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Needs attention */}
                    {topPriority.length > 0 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-3">Needs Attention</p>
                            <div className="space-y-2.5">
                                {topPriority.map(t => {
                                    const catDef = METRIC_CATALOGUE[t.category];
                                    const sc = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
                                    const pr = PRIORITY_CFG[t.priority] || PRIORITY_CFG.medium;
                                    return (
                                        <div key={t.id} className="flex items-start gap-2.5">
                                            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${pr.dot}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-semibold text-slate-700 dark:text-[#CBD5E1] truncate">{t.metricLabel}</p>
                                                <p className="text-[9px] text-slate-400 dark:text-[#64748B]">{catDef?.label || t.category}</p>
                                            </div>
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border uppercase shrink-0 ${sc.cls}`}>
                                                {sc.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <p className="text-[9px] text-slate-400 dark:text-[#64748B] italic px-1 leading-relaxed">
                        Status is set manually. Future updates will auto-calculate from live testing, GPS, wellness, and injury data.
                    </p>
                </div>
            </div>
        </div>
    );
};

function pct(n, total, raw = false) {
    if (!total) return raw ? '0%' : '0% of targets';
    const v = Math.round(n / total * 100);
    return raw ? `${v}%` : `${v}% of targets`;
}
