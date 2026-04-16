// @ts-nocheck
import React, { useRef, useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    Trophy, FlaskConical, Target, Zap, Dumbbell, Wind, Footprints,
    TrendingUp, TrendingDown, Plus, ChevronRight, Star, X,
    ArrowLeft, Clock, Edit3, Trash2
} from 'lucide-react';
import {
    dateToWeekIndex, weekIndexToDate, calculateTotalWeeks,
    getMonthLabels, calculateWeeklyVolume, calculateWeeklyIntensity,
    calculatePeakingIndex, formatDateShort,
} from '../../utils/periodizationUtils';

const WEEK_WIDTH = 40;
const LABEL_WIDTH = 140;

const MODALITY_ICON_MAP = {
    Strength: Dumbbell,
    Plyometrics: Zap,
    Speed: Footprints,
    Conditioning: Wind,
    'Loaded Power': Target,
};

const hexToTailwind = (hex, opacity = 0.15) => ({
    backgroundColor: `${hex}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    borderColor: hex,
    color: hex,
});

// ─── WEEK VIEW (drill-down into a block) ─────────────────────────────────
const BlockWeekView = ({ plan, phase, block }) => {
    const { setPlanDrillPath, planDrillPath } = useAppState();

    return (
        <div className="space-y-3 animate-in fade-in duration-200">
            {/* Block Header */}
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
                {/* Modalities summary */}
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

            {/* Week Cards */}
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

// ─── DAILY VIEW (drill-down into a week) ─────────────────────────────────
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

// ─── MAIN TIMELINE VIEW ──────────────────────────────────────────────────
export const TimelineView = ({ plan }) => {
    const {
        planDrillPath, setPlanDrillPath,
        setIsPlanPhaseModalOpen, setEditingPlanPhase,
        setIsPlanBlockModalOpenNew, setEditingPlanBlock,
        setIsPlanEventModalOpen, setEditingPlanEvent,
        handleUpdateBlockModality,
    } = useAppState();
    const scrollRef = useRef(null);
    const [editingModality, setEditingModality] = useState(null); // { phaseId, blockId, modality, value }

    // If drilled into a block
    if (planDrillPath.length >= 2) {
        const phase = plan.phases.find(p => p.id === planDrillPath[0]);
        const block = phase?.blocks.find(b => b.id === planDrillPath[1]);
        if (!phase || !block) return null;

        if (planDrillPath.length >= 3) {
            return <WeekDayView plan={plan} phase={phase} block={block} weekNumber={planDrillPath[2]} />;
        }
        return <BlockWeekView plan={plan} phase={phase} block={block} />;
    }

    // ─── GANTT VIEW ──────────────────────────────────────────────────
    const totalWeeks = calculateTotalWeeks(plan);
    const monthLabels = getMonthLabels(plan.startDate, totalWeeks);

    const volume = useMemo(() => calculateWeeklyVolume(plan, totalWeeks), [plan, totalWeeks]);
    const intensity = useMemo(() => calculateWeeklyIntensity(plan, totalWeeks), [plan, totalWeeks]);
    const peaking = useMemo(() => calculatePeakingIndex(volume, intensity), [volume, intensity]);

    const renderSparkline = (data, color, maxVal = 10) => {
        const h = 24;
        const segments = [];
        let current = [];

        data.forEach((v, i) => {
            if (v !== null) {
                current.push({ x: i * WEEK_WIDTH + WEEK_WIDTH / 2, y: h - (v / maxVal) * (h - 4), i });
            } else {
                if (current.length > 0) segments.push(current);
                current = [];
            }
        });
        if (current.length > 0) segments.push(current);

        return (
            <svg width={totalWeeks * WEEK_WIDTH} height={h} className="absolute top-0 left-0">
                {segments.map((seg, si) => (
                    <polyline key={si}
                        points={seg.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
                ))}
            </svg>
        );
    };

    const handlePhaseClick = (e, phase) => {
        e.stopPropagation();
        setEditingPlanPhase(phase);
        setIsPlanPhaseModalOpen(true);
    };

    const handlePhaseRowClick = (e) => {
        if (e.target === e.currentTarget || e.target.closest('[data-phase-bar]') === null) {
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
        e.stopPropagation();
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
            handleUpdateBlockModality(
                editingModality.phaseId,
                editingModality.blockId,
                editingModality.modality,
                editingModality.value
            );
            setEditingModality(null);
        }
    };

    const modalities = plan.modalities || [];

    // Collect all blocks flat for rendering
    const allBlocks = plan.phases.flatMap(ph =>
        ph.blocks.map(b => ({ ...b, _phaseId: ph.id, _phaseColor: ph.color }))
    );

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex">
                {/* STICKY LEFT LABELS */}
                <div className="shrink-0 bg-white z-20 border-r border-slate-200" style={{ width: `${LABEL_WIDTH}px` }}>
                    {/* Month row */}
                    <div className="h-8 border-b border-slate-100 bg-slate-50" />
                    {/* Week row */}
                    <div className="h-6 border-b border-slate-200 bg-slate-50" />
                    {/* Phase row */}
                    <div className="h-9 border-b border-slate-100 flex items-center px-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Phase</span>
                        <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                            className="ml-auto p-0.5 rounded hover:bg-indigo-50 text-slate-300 hover:text-indigo-500 transition-colors">
                            <Plus size={10} />
                        </button>
                    </div>
                    {/* Block row */}
                    <div className="h-9 border-b border-slate-100 flex items-center px-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Training Block</span>
                        <button onClick={() => { setEditingPlanBlock(null); setIsPlanBlockModalOpenNew(true); }}
                            className="ml-auto p-0.5 rounded hover:bg-indigo-50 text-slate-300 hover:text-indigo-500 transition-colors">
                            <Plus size={10} />
                        </button>
                    </div>
                    {/* Separator */}
                    <div className="h-px bg-slate-300" />
                    {/* Modality rows */}
                    {modalities.map(mod => {
                        const Icon = MODALITY_ICON_MAP[mod] || Star;
                        return (
                            <div key={mod} className="h-7 border-b border-slate-100 flex items-center gap-2 px-3">
                                <Icon size={11} className="text-slate-400" />
                                <span className="text-[10px] font-semibold text-slate-600 truncate">{mod}</span>
                            </div>
                        );
                    })}
                    {/* Separator */}
                    {modalities.length > 0 && <div className="h-px bg-slate-300" />}
                    {/* Events */}
                    <div className="h-8 border-b border-slate-100 flex items-center gap-2 px-3">
                        <Trophy size={11} className="text-yellow-500" />
                        <span className="text-[10px] font-semibold text-slate-600">Events</span>
                        <button onClick={() => { setEditingPlanEvent(null); setIsPlanEventModalOpen(true); }}
                            className="ml-auto p-0.5 rounded hover:bg-indigo-50 text-slate-300 hover:text-indigo-500 transition-colors">
                            <Plus size={10} />
                        </button>
                    </div>
                    {/* Volume */}
                    <div className="h-7 border-b border-slate-100 flex items-center gap-2 px-3">
                        <TrendingDown size={11} className="text-blue-400" />
                        <span className="text-[10px] font-semibold text-slate-600">Volume</span>
                    </div>
                    {/* Intensity */}
                    <div className="h-7 border-b border-slate-100 flex items-center gap-2 px-3">
                        <TrendingUp size={11} className="text-red-400" />
                        <span className="text-[10px] font-semibold text-slate-600">Intensity</span>
                    </div>
                    {/* Peaking */}
                    <div className="h-7 border-b border-slate-100 flex items-center gap-2 px-3">
                        <Target size={11} className="text-violet-400" />
                        <span className="text-[10px] font-semibold text-slate-600">Peaking</span>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="flex-1 overflow-x-auto custom-scrollbar" ref={scrollRef}>
                    <div style={{ width: `${totalWeeks * WEEK_WIDTH}px` }}>
                        {/* Month header */}
                        <div className="h-8 flex border-b border-slate-100 bg-slate-50">
                            {monthLabels.map((m, i) => (
                                <div key={i} className="border-r border-slate-200 flex items-center justify-center"
                                    style={{ width: `${m.weekSpan * WEEK_WIDTH}px` }}>
                                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{m.label}</span>
                                </div>
                            ))}
                        </div>
                        {/* Week numbers */}
                        <div className="h-6 flex border-b border-slate-200 bg-slate-50/50">
                            {Array.from({ length: totalWeeks }, (_, i) => (
                                <div key={i} className="border-r border-slate-100/50 flex items-center justify-center"
                                    style={{ width: `${WEEK_WIDTH}px` }}>
                                    <span className="text-[8px] font-medium text-slate-400">{i + 1}</span>
                                </div>
                            ))}
                        </div>
                        {/* Phase row */}
                        <div className="h-9 border-b border-slate-100 relative cursor-pointer" onClick={handlePhaseRowClick}>
                            {plan.phases.map(phase => {
                                const startWk = dateToWeekIndex(phase.startDate, plan.startDate);
                                // If no end date, extend to last block end or +4 weeks minimum
                                const phaseEndDate = phase.endDate
                                    || (phase.blocks.length > 0 ? phase.blocks.reduce((latest, b) => (b.endDate && b.endDate > latest) ? b.endDate : latest, phase.startDate) : undefined);
                                const endWk = phaseEndDate
                                    ? dateToWeekIndex(phaseEndDate, plan.startDate)
                                    : startWk + 3; // default 4-week minimum display
                                const left = startWk * WEEK_WIDTH;
                                const width = Math.max((endWk - startWk + 1) * WEEK_WIDTH, WEEK_WIDTH);
                                return (
                                    <div key={phase.id} data-phase-bar
                                        onClick={(e) => handlePhaseClick(e, phase)}
                                        className="absolute top-1 bottom-1 rounded-lg border-2 flex items-center justify-center shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
                                        style={{ left: `${left}px`, width: `${width}px`, ...hexToTailwind(phase.color, 0.2) }}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider truncate px-2" style={{ color: phase.color }}>{phase.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Blocks row */}
                        <div className="h-9 border-b border-slate-100 relative cursor-pointer" onClick={handleBlockRowClick}>
                            {allBlocks.map(block => {
                                const startWk = dateToWeekIndex(block.startDate, plan.startDate);
                                const endWk = block.endDate
                                    ? dateToWeekIndex(block.endDate, plan.startDate)
                                    : startWk + Math.max(block.weeks?.length || 1, 1) - 1;
                                const left = startWk * WEEK_WIDTH;
                                const width = Math.max((endWk - startWk + 1) * WEEK_WIDTH, WEEK_WIDTH);
                                return (
                                    <div key={block.id}
                                        onClick={(e) => handleBlockClick(e, { id: block._phaseId }, block)}
                                        onContextMenu={(e) => handleBlockContextMenu(e, { id: block._phaseId }, block)}
                                        className="absolute top-1 bottom-1 rounded-lg border-2 flex flex-col items-center justify-center shadow-sm cursor-pointer hover:scale-[1.02] transition-transform"
                                        style={{ left: `${left}px`, width: `${width}px`, ...hexToTailwind(block.color, 0.2) }}>
                                        <span className="text-[9px] font-bold uppercase tracking-wide truncate px-1" style={{ color: block.color }}>{block.name}</span>
                                        <span className="text-[8px] opacity-70 truncate px-1" style={{ color: block.color }}>{block.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Separator */}
                        <div className="h-px bg-slate-300" />
                        {/* Modality rows */}
                        {modalities.map(mod => (
                            <div key={mod} className="h-7 border-b border-slate-100 relative">
                                {allBlocks.map(block => {
                                    const startWk = dateToWeekIndex(block.startDate, plan.startDate);
                                    const endWk = block.endDate
                                        ? dateToWeekIndex(block.endDate, plan.startDate)
                                        : startWk + Math.max(block.weeks?.length || 1, 1) - 1;
                                    const left = startWk * WEEK_WIDTH;
                                    const width = Math.max((endWk - startWk + 1) * WEEK_WIDTH, WEEK_WIDTH);
                                    const val = block.modalities?.[mod] || '';
                                    const isEditing = editingModality?.blockId === block.id && editingModality?.modality === mod;

                                    return (
                                        <div key={block.id}
                                            onClick={() => handleModalityCellClick(block._phaseId, block.id, mod, val)}
                                            className="absolute top-0.5 bottom-0.5 rounded border border-slate-200/60 flex items-center justify-center cursor-pointer hover:bg-indigo-50/30 transition-colors"
                                            style={{ left: `${left}px`, width: `${width}px`, backgroundColor: val ? `${block.color}10` : 'transparent' }}>
                                            {isEditing ? (
                                                <input autoFocus
                                                    className="w-full h-full text-[8px] text-center bg-white border-2 border-indigo-400 rounded px-1 focus:outline-none"
                                                    value={editingModality.value}
                                                    onChange={e => setEditingModality({ ...editingModality, value: e.target.value })}
                                                    onBlur={saveModality}
                                                    onKeyDown={e => { if (e.key === 'Enter') saveModality(); if (e.key === 'Escape') setEditingModality(null); }}
                                                />
                                            ) : (
                                                <span className="text-[8px] font-medium text-slate-600 truncate px-1">{val || '—'}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        {/* Separator */}
                        {modalities.length > 0 && <div className="h-px bg-slate-300" />}
                        {/* Events row */}
                        <div className="h-8 border-b border-slate-100 relative flex">
                            {Array.from({ length: totalWeeks }, (_, i) => {
                                const weekDate = weekIndexToDate(i, plan.startDate);
                                const event = plan.events.find(e => {
                                    const evtWk = dateToWeekIndex(e.date, plan.startDate);
                                    return evtWk === i;
                                });
                                return (
                                    <div key={i} className="border-r border-slate-100/30 flex items-center justify-center cursor-pointer hover:bg-indigo-50/20 transition-colors"
                                        style={{ width: `${WEEK_WIDTH}px` }}
                                        onClick={() => event ? handleEventClick(null, event) : handleEventRowClick(i)}>
                                        {event && (
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${event.type === 'competition' ? 'bg-yellow-100 border border-yellow-300' : event.type === 'testing' ? 'bg-indigo-100 border border-indigo-300' : 'bg-emerald-100 border border-emerald-300'}`}
                                                title={event.label}>
                                                {event.type === 'competition'
                                                    ? <Trophy size={9} className="text-yellow-600" />
                                                    : event.type === 'testing'
                                                        ? <FlaskConical size={9} className="text-indigo-600" />
                                                        : <Star size={9} className="text-emerald-600" />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Volume sparkline */}
                        <div className="h-7 border-b border-slate-100 relative">
                            {renderSparkline(volume, '#60a5fa')}
                        </div>
                        {/* Intensity sparkline */}
                        <div className="h-7 border-b border-slate-100 relative">
                            {renderSparkline(intensity, '#f87171')}
                        </div>
                        {/* Peaking Index sparkline */}
                        <div className="h-7 border-b border-slate-100 relative">
                            {renderSparkline(peaking, '#8b5cf6')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 px-4 py-2 border-t border-slate-100 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300" />
                        <span className="text-[10px] text-slate-500">Competition</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300" />
                        <span className="text-[10px] text-slate-500">Testing</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-blue-400 rounded" />
                        <span className="text-[10px] text-slate-400">Volume</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-red-400 rounded" />
                        <span className="text-[10px] text-slate-400">Intensity</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-0.5 bg-violet-400 rounded" />
                        <span className="text-[10px] text-slate-400">Peaking</span>
                    </div>
                </div>
                <span className="text-[9px] text-slate-300 ml-auto">Click block to drill down · Right-click to edit · Click + to add</span>
            </div>
        </div>
    );
};
