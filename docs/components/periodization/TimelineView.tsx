// @ts-nocheck
import React, { useRef, useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    Trophy, FlaskConical, Target, Zap, Dumbbell, Wind, Footprints,
    TrendingUp, TrendingDown, Plus, ChevronRight, Star,
    ArrowLeft, Clock, HelpCircle,
} from 'lucide-react';
import {
    dateToWeekIndex, weekIndexToDate, calculateTotalWeeks,
    getMonthLabels, calculateWeeklyVolume, calculateWeeklyIntensity,
    calculatePeakingIndex, formatDateShort,
} from '../../utils/periodizationUtils';

// ── Layout constants ─────────────────────────────────────────────────────────
const WEEK_WIDTH  = 56;   // px per week column
const LABEL_WIDTH = 160;  // px for sticky left sidebar
const H_MONTH     = 36;   // month header row height
const H_WEEK      = 28;   // week-number row height
const H_PHASE     = 44;   // phase / block row height
const H_MOD       = 32;   // modality row height
const H_EVENT     = 36;   // events row height
const H_SPARK     = 52;   // sparkline row height
const SPARK_H     = 46;   // SVG drawing height inside sparkline row

const MODALITY_ICON_MAP = {
    Strength:      Dumbbell,
    Plyometrics:   Zap,
    Speed:         Footprints,
    Conditioning:  Wind,
    'Loaded Power': Target,
};

const hexToTailwind = (hex, opacity = 0.15) => ({
    backgroundColor: `${hex}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    borderColor: hex,
    color: hex,
});

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── BLOCK WEEK VIEW (drill-down level 1) ────────────────────────────────────
const BlockWeekView = ({ plan, phase, block }) => {
    const { setPlanDrillPath, planDrillPath } = useAppState();
    return (
        <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{block.name}</span>
                        <h3 className="text-sm font-bold text-slate-900">{block.label}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock size={12} />
                        {formatDateShort(block.startDate)}{block.endDate ? ` — ${formatDateShort(block.endDate)}` : ' — Open'}
                    </div>
                </div>
                {block.goals && (
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">{block.goals}</p>
                )}
                {Object.keys(block.modalities || {}).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(block.modalities).map(([key, val]) => (
                            <span key={key} className="text-[10px] px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600">
                                <span className="font-semibold">{key}:</span> {val}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {block.weeks.map(week => (
                    <div key={week.id}
                        onClick={() => setPlanDrillPath([...planDrillPath, week.weekNumber])}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700">Week {week.weekNumber}</span>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <p className="text-[10px] text-slate-400 mb-2">{formatDateShort(week.startDate)}</p>
                        {week.intent && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                                {week.intent}
                            </span>
                        )}
                        <div className="mt-2 text-[10px] text-slate-400">
                            {week.sessions.length} session{week.sessions.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── WEEK DAY VIEW (drill-down level 2) ──────────────────────────────────────
const WeekDayView = ({ plan, phase, block, weekNumber }) => {
    const week = block.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) return <div className="text-sm text-slate-400 p-4">Week not found.</div>;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekStart = new Date(week.startDate);
    return (
        <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Week {week.weekNumber} — {block.name}</span>
                        <h3 className="text-sm font-bold text-slate-900">{formatDateShort(week.startDate)}</h3>
                    </div>
                    {week.intent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
                            {week.intent}
                        </span>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {days.map((dayName, i) => {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(weekStart.getDate() + i);
                    const dateStr = dayDate.toISOString().split('T')[0];
                    const session = week.sessions.find(s => s.date === dateStr);
                    return (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[120px]">
                            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100">
                                <span className="text-[10px] font-bold text-slate-500">{dayName}</span>
                                <span className="text-[9px] text-slate-400 ml-1">{dayDate.getDate()}</span>
                            </div>
                            <div className="p-2">
                                {session ? (
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-semibold text-slate-700 truncate">{session.name}</p>
                                        {session.plannedDuration && (
                                            <p className="text-[9px] text-slate-400">{session.plannedDuration} min</p>
                                        )}
                                        <p className="text-[9px] text-slate-400">
                                            {session.sections.reduce((sum, s) => sum + s.exercises.length, 0)} exercises
                                        </p>
                                    </div>
                                ) : (
                                    <button className="w-full h-full min-h-[60px] flex items-center justify-center text-slate-300 hover:text-indigo-400 transition-colors">
                                        <Plus size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── MAIN TIMELINE (GANTT) VIEW ───────────────────────────────────────────────
export const TimelineView = ({ plan }) => {
    const {
        planDrillPath, setPlanDrillPath,
        setIsPlanPhaseModalOpen, setEditingPlanPhase,
        setIsPlanBlockModalOpenNew, setEditingPlanBlock,
        setIsPlanEventModalOpen, setEditingPlanEvent,
        handleUpdateBlockModality,
        handleUpdatePlan,
    } = useAppState();

    const scrollRef = useRef(null);
    const [editingModality, setEditingModality] = useState(null);
    const [editingMetric, setEditingMetric]     = useState(null);
    const [hoveredMetric, setHoveredMetric]     = useState(null);
    const [showHelp, setShowHelp]               = useState(false);

    // ── All useMemo / derived values MUST come before any conditional returns ──
    const totalWeeks  = calculateTotalWeeks(plan);
    const monthLabels = getMonthLabels(plan.startDate, totalWeeks);

    const volume    = useMemo(() => calculateWeeklyVolume(plan, totalWeeks),    [plan, totalWeeks]);
    const intensity = useMemo(() => calculateWeeklyIntensity(plan, totalWeeks), [plan, totalWeeks]);
    const peaking   = useMemo(() => calculatePeakingIndex(volume, intensity),   [volume, intensity]);

    const allBlocks = useMemo(() =>
        plan.phases.flatMap(ph => ph.blocks.map(b => ({ ...b, _phaseId: ph.id, _phaseColor: ph.color })))
    , [plan]);

    // Today marker
    const todayStr    = new Date().toISOString().split('T')[0];
    const todayWkIdx  = dateToWeekIndex(todayStr, plan.startDate);
    const showToday   = todayWkIdx >= 0 && todayWkIdx < totalWeeks;
    const todayLeft   = todayWkIdx * WEEK_WIDTH + Math.floor(WEEK_WIDTH / 2);

    // ── Drill-down guard (after all hooks) ──────────────────────────────────
    if (planDrillPath.length >= 2) {
        const phase = plan.phases.find(p => p.id === planDrillPath[0]);
        const block = phase?.blocks.find(b => b.id === planDrillPath[1]);
        if (!phase || !block) return null;
        if (planDrillPath.length >= 3) {
            return <WeekDayView plan={plan} phase={phase} block={block} weekNumber={planDrillPath[2]} />;
        }
        return <BlockWeekView plan={plan} phase={phase} block={block} />;
    }

    // ── SVG sparkline renderer ────────────────────────────────────────────────
    const renderSparkline = (data, color) => {
        const segments = [];
        let current = [];
        data.forEach((v, i) => {
            if (v !== null) {
                current.push({ x: i * WEEK_WIDTH + WEEK_WIDTH / 2, y: SPARK_H - (v / 10) * (SPARK_H - 6) });
            } else {
                if (current.length > 0) segments.push(current);
                current = [];
            }
        });
        if (current.length > 0) segments.push(current);
        return (
            <svg width={totalWeeks * WEEK_WIDTH} height={SPARK_H} className="absolute top-0 left-0">
                {segments.map((seg, si) => (
                    <polyline key={si}
                        points={seg.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                ))}
            </svg>
        );
    };

    // ── Metric info for tooltips ──────────────────────────────────────────────
    const getMetricInfo = (type, weekIdx) => {
        if (type === 'volume') {
            const isOverride = plan.volumeOverrides?.[weekIdx] !== undefined;
            const val = volume[weekIdx];
            let rawSets = 0, sessionCount = 0;
            for (const ph of plan.phases) for (const bl of ph.blocks) for (const wk of bl.weeks) {
                if (dateToWeekIndex(wk.startDate, plan.startDate) !== weekIdx) continue;
                sessionCount += wk.sessions.length;
                for (const s of wk.sessions) for (const sec of s.sections) for (const ex of sec.exercises)
                    rawSets += ex.sets * (parseInt(ex.reps) || 0);
            }
            return {
                val, isOverride,
                detail: isOverride
                    ? 'Manual override — clear to restore auto'
                    : sessionCount > 0
                        ? `Auto: ${rawSets} total reps across ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`
                        : 'No session data yet — click to set manually',
            };
        }
        if (type === 'intensity') {
            const isOverride = plan.intensityOverrides?.[weekIdx] !== undefined;
            const val = intensity[weekIdx];
            const rpes = [];
            for (const ph of plan.phases) for (const bl of ph.blocks) for (const wk of bl.weeks) {
                if (dateToWeekIndex(wk.startDate, plan.startDate) !== weekIdx) continue;
                for (const s of wk.sessions) if (s.plannedRPE) rpes.push(s.plannedRPE);
            }
            const avgRpe = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : null;
            return {
                val, isOverride,
                detail: isOverride
                    ? 'Manual override — clear to restore auto'
                    : rpes.length > 0
                        ? `Auto: avg RPE ${avgRpe} from ${rpes.length} session${rpes.length !== 1 ? 's' : ''}`
                        : 'No RPE set in sessions yet — click to set manually',
            };
        }
        if (type === 'peaking') {
            const v = volume[weekIdx], iv = intensity[weekIdx], val = peaking[weekIdx];
            return {
                val, isOverride: false,
                detail: v !== null && iv !== null
                    ? `Derived: Intensity(${iv}) − Volume(${v}) + 5 = ${val}`
                    : 'Requires both volume and intensity data',
            };
        }
        return null;
    };

    const handleMetricCellClick = (type, weekIdx) => {
        if (type === 'peaking') return;
        const current = type === 'volume' ? volume[weekIdx] : intensity[weekIdx];
        setEditingMetric({ type, weekIdx, value: current !== null ? String(current) : '' });
    };

    const saveMetricOverride = () => {
        if (!editingMetric) return;
        const num = parseFloat(editingMetric.value);
        const clamped = isNaN(num) ? undefined : Math.max(0, Math.min(10, Math.round(num)));
        if (editingMetric.type === 'volume') {
            const next = { ...(plan.volumeOverrides || {}) };
            if (clamped === undefined || editingMetric.value.trim() === '') delete next[editingMetric.weekIdx];
            else next[editingMetric.weekIdx] = clamped;
            handleUpdatePlan(plan.id, { volumeOverrides: next });
        } else {
            const next = { ...(plan.intensityOverrides || {}) };
            if (clamped === undefined || editingMetric.value.trim() === '') delete next[editingMetric.weekIdx];
            else next[editingMetric.weekIdx] = clamped;
            handleUpdatePlan(plan.id, { intensityOverrides: next });
        }
        setEditingMetric(null);
        setHoveredMetric(null);
    };

    // ── Interactive sparkline row ─────────────────────────────────────────────
    const renderInteractiveSparkline = (data, color, type) => {
        const LABELS = { volume: 'Volume', intensity: 'Intensity', peaking: 'Peaking Index' };
        return (
            <div className="border-b border-slate-100 relative" style={{ height: `${H_SPARK}px` }}>
                {/* Per-week clickable cells — rendered behind the SVG */}
                <div className="absolute inset-0 flex">
                    {Array.from({ length: totalWeeks }, (_, weekIdx) => {
                        const isEditing = editingMetric?.type === type && editingMetric.weekIdx === weekIdx;
                        const isHovered = hoveredMetric?.type === type && hoveredMetric.weekIdx === weekIdx;
                        const hasOverride = type === 'volume'
                            ? plan.volumeOverrides?.[weekIdx] !== undefined
                            : type === 'intensity'
                                ? plan.intensityOverrides?.[weekIdx] !== undefined
                                : false;
                        const info = isHovered ? getMetricInfo(type, weekIdx) : null;
                        const wkDate = weekIndexToDate(weekIdx, plan.startDate);

                        return (
                            <div key={weekIdx}
                                className={`relative flex items-center justify-center transition-colors ${type !== 'peaking' ? 'cursor-pointer' : 'cursor-default'}`}
                                style={{ width: `${WEEK_WIDTH}px`, flex: 'none', backgroundColor: isHovered ? `${color}15` : 'transparent' }}
                                onClick={() => type !== 'peaking' && handleMetricCellClick(type, weekIdx)}
                                onMouseEnter={() => setHoveredMetric({ type, weekIdx })}
                                onMouseLeave={() => { if (!isEditing) setHoveredMetric(null); }}
                            >
                                {/* Override dot indicator */}
                                {hasOverride && !isEditing && (
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full z-10" style={{ backgroundColor: color }} />
                                )}
                                {/* Inline edit input */}
                                {isEditing && (
                                    <input autoFocus
                                        className="absolute inset-1 text-xs text-center bg-white rounded-md focus:outline-none z-20 font-semibold"
                                        style={{ border: `2px solid ${color}` }}
                                        value={editingMetric.value}
                                        placeholder="0–10"
                                        onChange={e => setEditingMetric({ ...editingMetric, value: e.target.value })}
                                        onBlur={saveMetricOverride}
                                        onKeyDown={e => { if (e.key === 'Enter') saveMetricOverride(); if (e.key === 'Escape') setEditingMetric(null); }}
                                    />
                                )}
                                {/* Tooltip — renders above, z-50 so it overlaps rows above */}
                                {isHovered && !isEditing && info && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none" style={{ minWidth: '180px' }}>
                                        <div className="bg-slate-900 text-white rounded-xl px-3 py-2.5 shadow-2xl border border-slate-700">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">{LABELS[type]}</span>
                                                <span className="text-[9px] text-slate-500">·</span>
                                                <span className="text-[9px] text-slate-400">
                                                    Wk {weekIdx + 1} · {MONTHS_SHORT[wkDate.getMonth()]} {wkDate.getDate()}
                                                </span>
                                                {info.isOverride && (
                                                    <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[8px] font-semibold">OVERRIDE</span>
                                                )}
                                            </div>
                                            <div className="text-xl font-bold mb-1" style={{ color }}>
                                                {info.val !== null ? `${info.val}/10` : '—'}
                                            </div>
                                            <div className="text-[9px] text-slate-400 leading-snug">{info.detail}</div>
                                            {type !== 'peaking' && (
                                                <div className="text-[8px] text-indigo-300 mt-2 pt-1.5 border-t border-slate-700">
                                                    Click to {info.val !== null ? 'override · leave blank to reset auto' : 'set value manually'}
                                                </div>
                                            )}
                                        </div>
                                        {/* Caret */}
                                        <div className="flex justify-center overflow-hidden h-2">
                                            <div className="w-3 h-3 bg-slate-900 rotate-45 -translate-y-1.5 border-r border-b border-slate-700" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* SVG line on top — pointer-events-none so clicks reach cells */}
                <div className="absolute inset-0 pointer-events-none">
                    {renderSparkline(data, color)}
                </div>
                {/* Today marker */}
                {showToday && (
                    <div className="absolute top-0 bottom-0 w-px bg-rose-400/40 pointer-events-none z-10" style={{ left: `${todayLeft}px` }} />
                )}
            </div>
        );
    };

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handlePhaseClick = (e, phase) => {
        e.stopPropagation();
        setEditingPlanPhase(phase);
        setIsPlanPhaseModalOpen(true);
    };

    const handlePhaseRowClick = (e) => {
        if (e.target === e.currentTarget || !e.target.closest('[data-phase-bar]')) {
            setEditingPlanPhase(null);
            setIsPlanPhaseModalOpen(true);
        }
    };

    const handleBlockClick = (e, phase, block) => {
        e.stopPropagation();
        setPlanDrillPath([phase.id, block.id]);
    };

    const handleBlockContextMenu = (e, phase, block) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingPlanBlock({ ...block, _phaseId: phase.id });
        setIsPlanBlockModalOpenNew(true);
    };

    const handleBlockRowClick = (e) => {
        if (e.target === e.currentTarget) {
            setEditingPlanBlock(null);
            setIsPlanBlockModalOpenNew(true);
        }
    };

    const handleEventClick = (e, event) => {
        if (e) e.stopPropagation();
        setEditingPlanEvent(event);
        setIsPlanEventModalOpen(true);
    };

    const handleEventRowClick = (weekIdx) => {
        const date = weekIndexToDate(weekIdx, plan.startDate);
        setEditingPlanEvent({ _prefillDate: date });
        setIsPlanEventModalOpen(true);
    };

    const handleModalityCellClick = (phaseId, blockId, modality, currentValue) => {
        setEditingModality({ phaseId, blockId, modality, value: currentValue || '' });
    };

    const saveModality = () => {
        if (editingModality) {
            handleUpdateBlockModality(editingModality.phaseId, editingModality.blockId, editingModality.modality, editingModality.value);
            setEditingModality(null);
        }
    };

    const modalities = plan.modalities || [];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex overflow-hidden rounded-t-xl">

                {/* ── STICKY LEFT SIDEBAR ─────────────────────────────────── */}
                <div className="shrink-0 bg-white z-20 border-r border-slate-200" style={{ width: `${LABEL_WIDTH}px` }}>
                    {/* Month header spacer */}
                    <div className="bg-slate-50 border-b border-slate-200" style={{ height: `${H_MONTH}px` }} />
                    {/* Week number spacer */}
                    <div className="bg-slate-50/70 border-b border-slate-200" style={{ height: `${H_WEEK}px` }} />

                    {/* Phase label */}
                    <div className="border-b border-slate-100 flex items-center px-3 gap-2" style={{ height: `${H_PHASE}px` }}>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Phase</span>
                        <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                            className="ml-auto p-1 rounded-md hover:bg-indigo-50 text-slate-300 hover:text-indigo-500 transition-colors" title="Add phase">
                            <Plus size={11} />
                        </button>
                    </div>

                    {/* Training Block label */}
                    <div className="border-b border-slate-200 flex items-center px-3 gap-2" style={{ height: `${H_PHASE}px` }}>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide truncate">Training Block</span>
                        <button onClick={() => { setEditingPlanBlock(null); setIsPlanBlockModalOpenNew(true); }}
                            className="ml-auto p-1 rounded-md hover:bg-indigo-50 text-slate-300 hover:text-indigo-500 transition-colors shrink-0" title="Add block">
                            <Plus size={11} />
                        </button>
                    </div>

                    {/* Separator */}
                    <div className="h-px bg-slate-300" />

                    {/* Modality labels */}
                    {modalities.map(mod => {
                        const Icon = MODALITY_ICON_MAP[mod] || Star;
                        return (
                            <div key={mod} className="border-b border-slate-100 flex items-center gap-2 px-3" style={{ height: `${H_MOD}px` }}>
                                <Icon size={12} className="text-slate-400 shrink-0" />
                                <span className="text-[11px] font-semibold text-slate-600 truncate">{mod}</span>
                            </div>
                        );
                    })}
                    {modalities.length > 0 && <div className="h-px bg-slate-300" />}

                    {/* Events label */}
                    <div className="border-b border-slate-100 flex items-center gap-2 px-3" style={{ height: `${H_EVENT}px` }}>
                        <Trophy size={12} className="text-yellow-500 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-600">Events</span>
                        <button onClick={() => { setEditingPlanEvent(null); setIsPlanEventModalOpen(true); }}
                            className="ml-auto p-1 rounded-md hover:bg-indigo-50 text-slate-300 hover:text-indigo-500 transition-colors" title="Add event">
                            <Plus size={11} />
                        </button>
                    </div>

                    {/* Volume label */}
                    <div className="border-b border-slate-100 flex items-center gap-1.5 px-3" style={{ height: `${H_SPARK}px` }}>
                        <TrendingDown size={12} className="text-blue-400 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-600">Volume</div>
                            <div className="text-[9px] text-slate-300 leading-none mt-0.5">sets × reps</div>
                        </div>
                    </div>

                    {/* Intensity label */}
                    <div className="border-b border-slate-100 flex items-center gap-1.5 px-3" style={{ height: `${H_SPARK}px` }}>
                        <TrendingUp size={12} className="text-red-400 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-600">Intensity</div>
                            <div className="text-[9px] text-slate-300 leading-none mt-0.5">avg session RPE</div>
                        </div>
                    </div>

                    {/* Peaking label */}
                    <div className="border-b border-slate-100 flex items-center gap-1.5 px-3" style={{ height: `${H_SPARK}px` }}>
                        <Target size={12} className="text-violet-400 shrink-0" />
                        <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-600">Peaking</div>
                            <div className="text-[9px] text-slate-300 leading-none mt-0.5">derived</div>
                        </div>
                    </div>
                </div>

                {/* ── SCROLLABLE CONTENT ──────────────────────────────────── */}
                <div className="flex-1 overflow-x-auto" ref={scrollRef}
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                    <div style={{ width: `${totalWeeks * WEEK_WIDTH}px`, position: 'relative' }}>

                        {/* Month header */}
                        <div className="flex border-b border-slate-200 bg-slate-50" style={{ height: `${H_MONTH}px` }}>
                            {monthLabels.map((m, i) => (
                                <div key={i} className="border-r border-slate-200 flex items-center justify-center"
                                    style={{ width: `${m.weekSpan * WEEK_WIDTH}px` }}>
                                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{m.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Week numbers + dates */}
                        <div className="flex border-b border-slate-200 bg-slate-50/60" style={{ height: `${H_WEEK}px` }}>
                            {Array.from({ length: totalWeeks }, (_, i) => {
                                const wkDate = weekIndexToDate(i, plan.startDate);
                                const isToday = showToday && i === todayWkIdx;
                                return (
                                    <div key={i}
                                        className={`border-r border-slate-100/60 flex flex-col items-center justify-center ${isToday ? 'bg-rose-50' : ''}`}
                                        style={{ width: `${WEEK_WIDTH}px` }}>
                                        <span className={`text-[9px] font-bold leading-none ${isToday ? 'text-rose-500' : 'text-slate-400'}`}>{i + 1}</span>
                                        <span className={`text-[8px] leading-none mt-0.5 ${isToday ? 'text-rose-400' : 'text-slate-300'}`}>
                                            {wkDate.getDate()} {MONTHS_SHORT[wkDate.getMonth()]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Phase bars */}
                        <div className="border-b border-slate-100 relative overflow-hidden" style={{ height: `${H_PHASE}px` }}
                            onClick={handlePhaseRowClick}>
                            {plan.phases.map(phase => {
                                const startWk = dateToWeekIndex(phase.startDate, plan.startDate);
                                const phaseEndDate = phase.endDate
                                    || (phase.blocks.length > 0
                                        ? phase.blocks.reduce((latest, b) => (b.endDate && b.endDate > latest) ? b.endDate : latest, phase.startDate)
                                        : undefined);
                                const endWk = phaseEndDate ? dateToWeekIndex(phaseEndDate, plan.startDate) : startWk + 3;
                                const left  = startWk * WEEK_WIDTH;
                                const width = Math.max((endWk - startWk + 1) * WEEK_WIDTH, WEEK_WIDTH);
                                return (
                                    <div key={phase.id} data-phase-bar
                                        onClick={e => handlePhaseClick(e, phase)}
                                        className="absolute top-1.5 bottom-1.5 rounded-lg border-2 flex items-center justify-center shadow-sm cursor-pointer hover:shadow-md hover:brightness-95 transition-all overflow-hidden"
                                        style={{ left: `${left}px`, width: `${width}px`, ...hexToTailwind(phase.color, 0.18) }}>
                                        <span className="text-[11px] font-bold uppercase tracking-wider truncate min-w-0 w-full text-center px-2"
                                            style={{ color: phase.color }}>{phase.name}</span>
                                    </div>
                                );
                            })}
                            {/* Today line */}
                            {showToday && <div className="absolute top-0 bottom-0 w-0.5 bg-rose-400/50 z-10 pointer-events-none" style={{ left: `${todayLeft}px` }} />}
                        </div>

                        {/* Block bars */}
                        <div className="border-b border-slate-200 relative overflow-hidden" style={{ height: `${H_PHASE}px` }}
                            onClick={handleBlockRowClick}>
                            {allBlocks.map(block => {
                                const startWk = dateToWeekIndex(block.startDate, plan.startDate);
                                const endWk   = block.endDate
                                    ? dateToWeekIndex(block.endDate, plan.startDate)
                                    : startWk + Math.max(block.weeks?.length || 1, 1) - 1;
                                const left    = startWk * WEEK_WIDTH;
                                const width   = Math.max((endWk - startWk + 1) * WEEK_WIDTH, WEEK_WIDTH);
                                const isNarrow = width < 90;
                                return (
                                    <div key={block.id}
                                        onClick={e => handleBlockClick(e, { id: block._phaseId }, block)}
                                        onContextMenu={e => handleBlockContextMenu(e, { id: block._phaseId }, block)}
                                        className="absolute top-1.5 bottom-1.5 rounded-lg border-2 flex flex-col items-center justify-center shadow-sm cursor-pointer hover:shadow-md hover:brightness-95 transition-all overflow-hidden"
                                        style={{ left: `${left}px`, width: `${width}px`, ...hexToTailwind(block.color, 0.18) }}>
                                        <span className="text-[10px] font-bold uppercase tracking-wide truncate min-w-0 w-full text-center px-1.5"
                                            style={{ color: block.color }}>{block.name}</span>
                                        {!isNarrow && (
                                            <span className="text-[9px] opacity-75 truncate min-w-0 w-full text-center px-1.5"
                                                style={{ color: block.color }}>{block.label}</span>
                                        )}
                                    </div>
                                );
                            })}
                            {showToday && <div className="absolute top-0 bottom-0 w-0.5 bg-rose-400/50 z-10 pointer-events-none" style={{ left: `${todayLeft}px` }} />}
                        </div>

                        {/* Separator */}
                        <div className="h-px bg-slate-300" />

                        {/* Modality rows */}
                        {modalities.map(mod => (
                            <div key={mod} className="border-b border-slate-100 relative" style={{ height: `${H_MOD}px` }}>
                                {allBlocks.map(block => {
                                    const startWk = dateToWeekIndex(block.startDate, plan.startDate);
                                    const endWk   = block.endDate
                                        ? dateToWeekIndex(block.endDate, plan.startDate)
                                        : startWk + Math.max(block.weeks?.length || 1, 1) - 1;
                                    const left    = startWk * WEEK_WIDTH;
                                    const width   = Math.max((endWk - startWk + 1) * WEEK_WIDTH, WEEK_WIDTH);
                                    const val     = block.modalities?.[mod] || '';
                                    const isEditing = editingModality?.blockId === block.id && editingModality?.modality === mod;
                                    return (
                                        <div key={block.id}
                                            onClick={() => handleModalityCellClick(block._phaseId, block.id, mod, val)}
                                            className="absolute top-1 bottom-1 rounded-md border border-slate-200/60 flex items-center justify-center cursor-pointer hover:bg-indigo-50/40 transition-colors"
                                            style={{ left: `${left}px`, width: `${width}px`, backgroundColor: val ? `${block.color}12` : 'transparent' }}>
                                            {isEditing ? (
                                                <input autoFocus
                                                    className="w-full h-full text-[9px] text-center bg-white border-2 border-indigo-400 rounded px-1 focus:outline-none"
                                                    value={editingModality.value}
                                                    onChange={e => setEditingModality({ ...editingModality, value: e.target.value })}
                                                    onBlur={saveModality}
                                                    onKeyDown={e => { if (e.key === 'Enter') saveModality(); if (e.key === 'Escape') setEditingModality(null); }}
                                                />
                                            ) : (
                                                <span className="text-[9px] font-semibold text-slate-600 truncate px-1.5">{val || '—'}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        {modalities.length > 0 && <div className="h-px bg-slate-300" />}

                        {/* Events row */}
                        <div className="border-b border-slate-100 relative flex" style={{ height: `${H_EVENT}px` }}>
                            {Array.from({ length: totalWeeks }, (_, i) => {
                                const event = plan.events?.find(ev => dateToWeekIndex(ev.date, plan.startDate) === i);
                                return (
                                    <div key={i}
                                        className="border-r border-slate-100/40 flex items-center justify-center cursor-pointer hover:bg-indigo-50/20 transition-colors"
                                        style={{ width: `${WEEK_WIDTH}px` }}
                                        onClick={() => event ? handleEventClick(null, event) : handleEventRowClick(i)}>
                                        {event && (
                                            <div title={event.label}
                                                className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm
                                                    ${event.type === 'competition' ? 'bg-yellow-100 border border-yellow-300'
                                                    : event.type === 'testing'     ? 'bg-indigo-100 border border-indigo-300'
                                                    :                                'bg-emerald-100 border border-emerald-300'}`}>
                                                {event.type === 'competition'
                                                    ? <Trophy size={10} className="text-yellow-600" />
                                                    : event.type === 'testing'
                                                        ? <FlaskConical size={10} className="text-indigo-600" />
                                                        : <Star size={10} className="text-emerald-600" />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {showToday && <div className="absolute top-0 bottom-0 w-0.5 bg-rose-400/50 z-10 pointer-events-none" style={{ left: `${todayLeft}px` }} />}
                        </div>

                        {/* Interactive sparkline rows */}
                        {renderInteractiveSparkline(volume,    '#60a5fa', 'volume')}
                        {renderInteractiveSparkline(intensity, '#f87171', 'intensity')}
                        {renderInteractiveSparkline(peaking,   '#8b5cf6', 'peaking')}

                    </div>
                </div>
            </div>

            {/* ── LEGEND ──────────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex-wrap rounded-b-xl">

                {/* Event types */}
                <div className="flex items-center gap-3">
                    {[
                        { type: 'competition', icon: Trophy,     bg: 'bg-yellow-100', border: 'border-yellow-300', iconColor: 'text-yellow-600', label: 'Competition' },
                        { type: 'testing',     icon: FlaskConical, bg: 'bg-indigo-100', border: 'border-indigo-300', iconColor: 'text-indigo-600', label: 'Testing' },
                    ].map(({ type, icon: Icon, bg, border, iconColor, label }) => (
                        <div key={type} className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${bg} border ${border}`}>
                                <Icon size={9} className={iconColor} />
                            </div>
                            <span className="text-[10px] text-slate-500">{label}</span>
                        </div>
                    ))}
                </div>

                <div className="w-px h-4 bg-slate-200 shrink-0" />

                {/* Sparkline legend */}
                <div className="flex items-center gap-4">
                    {[
                        { color: '#60a5fa', label: 'Volume',    desc: 'sets × reps, hover to inspect', canEdit: true  },
                        { color: '#f87171', label: 'Intensity', desc: 'avg session RPE, hover to inspect', canEdit: true  },
                        { color: '#8b5cf6', label: 'Peaking',   desc: 'RPE − Vol + 5 (auto-derived)',  canEdit: false },
                    ].map(({ color, label, desc, canEdit }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <div className="w-6 h-0.5 rounded shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-semibold text-slate-600">{label}</span>
                            <span className="text-[9px] text-slate-400 hidden sm:inline">({desc})</span>
                        </div>
                    ))}
                </div>

                <div className="w-px h-4 bg-slate-200 shrink-0" />

                {/* Today marker legend */}
                {showToday && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-0.5 h-4 bg-rose-400 rounded shrink-0" />
                        <span className="text-[10px] text-slate-500">Today</span>
                    </div>
                )}

                {/* Override indicator */}
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-[9px] text-slate-400">Manual override</span>
                </div>

                {/* Help button — replaces the confusing raw hint text */}
                <div className="ml-auto relative">
                    <button
                        className="flex items-center gap-1.5 text-[9px] text-slate-300 hover:text-slate-500 transition-colors"
                        onMouseEnter={() => setShowHelp(true)}
                        onMouseLeave={() => setShowHelp(false)}>
                        <HelpCircle size={13} />
                        <span>How to use</span>
                    </button>
                    {showHelp && (
                        <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none" style={{ minWidth: '240px' }}>
                            <div className="bg-slate-900 text-white rounded-xl px-4 py-3 shadow-2xl border border-slate-700 space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-200 mb-2">Timeline interactions</p>
                                {[
                                    ['Click phase bar',            'Edit phase details'],
                                    ['Click training block bar',   'Drill into week-by-week view'],
                                    ['Right-click block bar',      'Edit block details'],
                                    ['Click modality cell',        'Set modality value for that block'],
                                    ['Click event slot',           'Add or edit a competition/test'],
                                    ['Click sparkline (Vol/Int)',  'Override value for that week'],
                                    ['Hover sparkline',            'See data source and calculation'],
                                    ['Click + on any row label',   'Add a new item to that row'],
                                ].map(([action, result]) => (
                                    <div key={action} className="flex gap-2 text-[9px]">
                                        <span className="text-indigo-300 shrink-0 font-medium">{action}</span>
                                        <span className="text-slate-400">→ {result}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pr-3 overflow-hidden h-2">
                                <div className="w-3 h-3 bg-slate-900 rotate-45 -translate-y-1.5 border-r border-b border-slate-700" />
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
