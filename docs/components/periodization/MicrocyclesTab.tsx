// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';
import {
    ChevronLeft, ChevronRight, Plus, Trash2, PencilIcon,
    Check, X, LinkIcon, Clock, CalendarDays, AlertTriangle,
    Dumbbell, Activity, Target, Heart, Zap,
} from 'lucide-react';
import { formatDateShort, EVENT_TYPE_COLORS } from '../../utils/periodizationUtils';
import { CustomSelect } from '../ui/CustomSelect';
import DatePicker from '../../components/ui/DatePicker';

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

// Monday of the week containing dateStr
function weekMonday(dateStr) {
    const d   = new Date(dateStr + 'T12:00:00');
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return d.toISOString().split('T')[0];
}

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

const EMPTY_SESSION = { name: '', load: '', modality: '', duration: '' };
const INPUT_CLS = 'w-full text-[9px] bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded px-1.5 py-1 outline-none focus:border-indigo-400 text-slate-800 dark:text-[#E2E8F0]';

// ── Main component ─────────────────────────────────────────────────────────────
export const MicrocyclesTab = ({ plan, initialPhaseId = null, initialBlockId = null, initialWeekStart = null, initialSelectedDate = null }) => {
    const navigate = useNavigate();
    const {
        handleUpdatePlanWeek, handleAddPlanSession,
        handleUpdatePlanSession, handleDeletePlanSession,
        handleAddSessionWithWeek, workoutTemplates,
        handleUpdatePlan,
        setIsPlanEventModalOpen, setEditingPlanEvent,
    } = useAppState();
    const ganttRef = useRef(null);
    const skipNextBlockJump = useRef(false);

    const [ganttPopup, setGanttPopup] = useState(null);
    useEffect(() => {
        if (!ganttPopup) return;
        const close = () => setGanttPopup(null);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [ganttPopup]);
    const openGanttEvPopup = (e, ev) => {
        e.stopPropagation();
        const color = ev.color || EVENT_TYPE_COLORS[ev.type] || '#6366f1';
        const title = ev.label || ev.title || '';
        setGanttPopup(p => p?.id === ev.id ? null : {
            id: ev.id, title, accent: color,
            rows: [
                ['Type',     ev.type?.replace(/_/g, ' ')],
                ['Date',     [ev.date && formatDateShort(ev.date), ev.endDate && formatDateShort(ev.endDate)].filter(Boolean).join(' — ')],
                ['Impt.',    ev.importance],
                ['Location', ev.location],
                ['Notes',    ev.description],
            ],
            x: e.clientX, y: e.clientY,
        });
    };

    const [selPhaseId, setSelPhaseId]       = useState(initialPhaseId || plan.phases[0]?.id || '');
    const [selBlockId, setSelBlockId]       = useState(initialBlockId || '');
    const [currentWeekStart, setCurrentWeekStart] = useState(initialWeekStart || null);

    // Inline session editing
    const [editingWeekId,    setEditingWeekId]    = useState(null);
    const [editWeekIntent,   setEditWeekIntent]   = useState('');
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editSD,           setEditSD]           = useState(EMPTY_SESSION);
    const [addingDate,       setAddingDate]       = useState(null);
    const [newSD,            setNewSD]            = useState(EMPTY_SESSION);
    const [selectedDate,     setSelectedDate]     = useState(initialSelectedDate || null);

    // Quick add session form (above sidebar)
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickSD,      setQuickSD]      = useState({ date: '', name: '', load: '', modality: '', duration: '' });

    // Sync jump from Periods/Blocks tabs or return from WorkoutPackets
    useEffect(() => {
        if (initialPhaseId) setSelPhaseId(initialPhaseId);
        if (initialBlockId) setSelBlockId(initialBlockId);
        if (initialWeekStart) {
            skipNextBlockJump.current = true;
            setCurrentWeekStart(initialWeekStart);
        } else {
            setCurrentWeekStart(null);
        }
        if (initialSelectedDate) setSelectedDate(initialSelectedDate);
    }, [initialPhaseId, initialBlockId, initialWeekStart, initialSelectedDate]);

    const selPhase = plan.phases.find(ph => ph.id === selPhaseId);

    useEffect(() => {
        if (selPhase && !selPhase.blocks.find(b => b.id === selBlockId)) {
            setSelBlockId(selPhase.blocks[0]?.id || '');
        }
    }, [selPhaseId]);

    const selBlock = selPhase?.blocks.find(b => b.id === selBlockId);

    // When block changes, jump to its first calendar week (skip if returning from packets)
    useEffect(() => {
        if (skipNextBlockJump.current) { skipNextBlockJump.current = false; return; }
        if (selBlock?.startDate) {
            setCurrentWeekStart(weekMonday(selBlock.startDate));
        } else {
            setCurrentWeekStart(null);
        }
    }, [selBlockId]);

    // ── All plan weeks (for gantt + navigation) ─────────────────────────────────
    const ganttStart = plan.startDate || plan.phases[0]?.startDate || '';
    const ganttEnd   = plan.endDate   || plan.phases[plan.phases.length - 1]?.endDate || '';
    const allWeeks   = useMemo(() => ganttStart && ganttEnd ? getWeeks(ganttStart, ganttEnd) : [], [ganttStart, ganttEnd]);

    // Block calendar weeks (full date range, regardless of PlanWeek records)
    const blockNavWeeks = useMemo(() => {
        if (!selBlock?.startDate) return [];
        const end = selBlock.endDate || selBlock.startDate;
        return getWeeks(selBlock.startDate, end);
    }, [selBlock]);

    // Current week index in allWeeks (for Gantt highlight + nav)
    const currentNavIdx = useMemo(() =>
        allWeeks.findIndex(w => w.date === currentWeekStart),
        [allWeeks, currentWeekStart]);

    // Position within block's weeks
    const blockWeekIdx = useMemo(() =>
        blockNavWeeks.findIndex(w => w.date === currentWeekStart),
        [blockNavWeeks, currentWeekStart]);

    // Look up persisted PlanWeek record for this date
    const week = useMemo(() =>
        selBlock?.weeks.find(w => w.startDate === currentWeekStart) || null,
        [selBlock, currentWeekStart]);

    // Detect which phase/block the current week actually falls in
    const contextInfo = useMemo(() => {
        if (!currentWeekStart) return null;
        for (const ph of plan.phases) {
            if (!ph.startDate) continue;
            const phEnd = ph.endDate || '9999-12-31';
            if (currentWeekStart >= ph.startDate && currentWeekStart <= phEnd) {
                for (const b of ph.blocks) {
                    if (!b.startDate) continue;
                    const bEnd = b.endDate || '9999-12-31';
                    if (currentWeekStart >= b.startDate && currentWeekStart <= bEnd) {
                        return { phase: ph, block: b };
                    }
                }
                return { phase: ph, block: null };
            }
        }
        return null;
    }, [currentWeekStart, plan.phases]);

    const isOutsideBlock = currentWeekStart && (contextInfo?.block?.id !== selBlockId || contextInfo?.phase?.id !== selPhaseId);

    // The "effective" phase/block for session creation — use selected unless outside
    const effectivePhase = isOutsideBlock && contextInfo?.phase ? contextInfo.phase : selPhase;
    const effectiveBlock = isOutsideBlock && contextInfo?.block ? contextInfo.block : selBlock;
    const effectiveWeek  = isOutsideBlock && contextInfo?.block
        ? contextInfo.block.weeks.find(w => w.startDate === currentWeekStart) || null
        : week;

    const planModalities = plan.modalities || [];
    const today = new Date().toISOString().split('T')[0];

    // 7 date strings for this week
    const weekDates = useMemo(() => {
        if (!currentWeekStart) return Array(7).fill(null);
        return Array.from({ length: 7 }, (_, i) => dayDate(currentWeekStart, i).toISOString().split('T')[0]);
    }, [currentWeekStart]);

    const weekEndStr = weekDates[6] || currentWeekStart || '';

    const matchEvent = useMemo(() =>
        (plan.events || []).find(e => e.type === 'competition' && weekDates.some(d => d && d >= e.date && d <= (e.endDate || e.date))),
        [plan.events, weekDates]);

    // All events that overlap any day in this week
    const weekEvents = useMemo(() =>
        (plan.events || []).filter(e => weekDates.some(d => d && d >= e.date && d <= (e.endDate || e.date))),
        [plan.events, weekDates]);

    const getMdLabel = (dateStr) => {
        if (!matchEvent || !dateStr) return null;
        const diff = Math.round((new Date(matchEvent.date).getTime() - new Date(dateStr).getTime()) / 86400000);
        if (diff === 0) return 'MD';
        if (diff > 0 && diff <= 6) return `MD-${diff}`;
        if (diff < 0 && diff >= -2) return `MD+${Math.abs(diff)}`;
        return null;
    };

    // Sessions for current week (from the effective week, whether persisted or not)
    const currentSessions = useMemo(() => effectiveWeek?.sessions || [], [effectiveWeek]);

    const dayTopLoad = useMemo(() => {
        const RANK = { Low: 1, Moderate: 2, High: 3, 'Very High': 4 };
        return weekDates.map(dateStr => {
            if (!dateStr) return null;
            const sessions = currentSessions.filter(s => s.date === dateStr);
            if (!sessions.length) return null;
            return sessions.reduce((best, s) =>
                (!best || (RANK[s.load] || 0) > (RANK[best] || 0)) ? s.load : best, null);
        });
    }, [weekDates, currentSessions]);

    const weekStats = useMemo(() => {
        const sessions = currentSessions;
        const byModality = {};
        sessions.forEach(s => { if (s.modality) byModality[s.modality] = (byModality[s.modality] || 0) + 1; });
        return { total: sessions.length, byModality };
    }, [currentSessions]);

    // ── Gantt ──────────────────────────────────────────────────────────────────
    const monthGroups = useMemo(() => {
        const groups = [];
        allWeeks.forEach((w, i) => {
            const label = `${w.month} ${w.year}`;
            if (!groups.length || groups[groups.length - 1].label !== label)
                groups.push({ label, startIdx: i, count: 1 });
            else groups[groups.length - 1].count++;
        });
        return groups;
    }, [allWeeks]);

    const WEEK_W        = 38;
    const ganttW        = Math.max(640, allWeeks.length * WEEK_W);
    const totalDaysPlan = Math.max(1, daysBetween(ganttStart, ganttEnd));
    const showToday     = today >= ganttStart && today <= ganttEnd;
    const todayWeekIdx_ = showToday ? Math.floor(daysBetween(ganttStart, today) / 7) : -1;
    const todayWeekLeft = todayWeekIdx_ * WEEK_W;

    useEffect(() => {
        if (ganttRef.current && currentNavIdx >= 0) {
            ganttRef.current.scrollLeft = Math.max(0, currentNavIdx * WEEK_W - 120);
        }
    }, [currentNavIdx]);

    // ── Navigation ─────────────────────────────────────────────────────────────
    const goToPrev = () => {
        if (!currentWeekStart) return;
        const d = new Date(currentWeekStart + 'T12:00:00');
        d.setDate(d.getDate() - 7);
        setCurrentWeekStart(d.toISOString().split('T')[0]);
    };
    const goToNext = () => {
        if (!currentWeekStart) return;
        const d = new Date(currentWeekStart + 'T12:00:00');
        d.setDate(d.getDate() + 7);
        setCurrentWeekStart(d.toISOString().split('T')[0]);
    };

    const isOutsidePlanRange = !!(currentWeekStart && ganttStart && ganttEnd &&
        (currentWeekStart < ganttStart || currentWeekStart > ganttEnd));

    // Jump to a specific week, updating selPhaseId/selBlockId to match.
    // Uses overlap logic: week [wDate, wDate+6] overlaps range [start, end].
    const jumpToGanttWeek = (wDate: string) => {
        setCurrentWeekStart(wDate);
        const wEnd = new Date(wDate + 'T12:00:00');
        wEnd.setDate(wEnd.getDate() + 6);
        const wEndStr = wEnd.toISOString().split('T')[0];
        for (const ph of plan.phases) {
            if (!ph.startDate) continue;
            const phEnd = ph.endDate || '9999-12-31';
            if (wDate <= phEnd && wEndStr >= ph.startDate) {
                setSelPhaseId(ph.id);
                for (const b of ph.blocks) {
                    if (!b.startDate) continue;
                    const bEnd = b.endDate || '9999-12-31';
                    if (wDate <= bEnd && wEndStr >= b.startDate) {
                        skipNextBlockJump.current = true;
                        setSelBlockId(b.id);
                        return;
                    }
                }
                skipNextBlockJump.current = true;
                setSelBlockId(ph.blocks[0]?.id || '');
                return;
            }
        }
    };

    // Jump directly to a phase — lands on its first week, selects first block
    const jumpToPhase = (ph) => {
        if (!ph.startDate) return;
        setSelPhaseId(ph.id);
        setSelBlockId(ph.blocks[0]?.id || '');
        setCurrentWeekStart(weekMonday(ph.startDate));
    };

    // Jump directly to a block — lands on its first week
    const jumpToBlock = (phaseId: string, block) => {
        if (!block.startDate) return;
        setSelPhaseId(phaseId);
        setSelBlockId(block.id);
        setCurrentWeekStart(weekMonday(block.startDate));
    };

    // ── Session handlers ────────────────────────────────────────────────────────
    const saveWeekIntent = () => {
        if (!effectivePhase || !effectiveBlock || !effectiveWeek) return;
        handleUpdatePlanWeek(effectivePhase.id, effectiveBlock.id, effectiveWeek.id, { intent: editWeekIntent });
        setEditingWeekId(null);
    };

    const createSession = (dateStr) => {
        if (!newSD.name.trim() || !effectivePhase || !effectiveBlock) return;
        const sessionData = {
            date: dateStr, name: newSD.name.trim(),
            load: newSD.load || null, modality: newSD.modality || null,
            plannedDuration: newSD.duration ? parseInt(newSD.duration) : null,
        };
        if (effectiveWeek) {
            handleAddPlanSession(effectivePhase.id, effectiveBlock.id, effectiveWeek.id, sessionData);
        } else {
            handleAddSessionWithWeek(effectivePhase.id, effectiveBlock.id, currentWeekStart, sessionData);
        }
        setAddingDate(null); setNewSD(EMPTY_SESSION);
    };

    const saveSession = (sessionId) => {
        if (!effectivePhase || !effectiveBlock || !effectiveWeek) return;
        handleUpdatePlanSession(effectivePhase.id, effectiveBlock.id, effectiveWeek.id, sessionId, {
            name: editSD.name, load: editSD.load || null,
            modality: editSD.modality || null,
            plannedDuration: editSD.duration ? parseInt(editSD.duration) : null,
        });
        setEditingSessionId(null);
    };

    const deleteSession = (sessionId) => {
        if (!effectivePhase || !effectiveBlock || !effectiveWeek) return;
        handleDeletePlanSession(effectivePhase.id, effectiveBlock.id, effectiveWeek.id, sessionId);
        setEditingSessionId(null);
    };

    // Build full assign context for navigating to WorkoutPackets, includes return coords
    const buildAssignCtx = (session, date) => ({
        sessionId: session.id, date,
        weekId: effectiveWeek?.id,
        blockId: effectiveBlock?.id,
        phaseId: effectivePhase?.id,
        planId: plan.id,
        returnWeekStart: currentWeekStart,
        returnSelectedDate: date,
        returnPhaseId: selPhaseId,
        returnBlockId: selBlockId,
    });

    const startAdd  = (dateStr) => { setAddingDate(dateStr); setEditingSessionId(null); setNewSD(EMPTY_SESSION); setSelectedDate(dateStr); };
    const startEdit = (session, dateStr)  => {
        setEditingSessionId(session.id); setAddingDate(null); setSelectedDate(dateStr);
        setEditSD({ name: session.name, load: session.load || '', modality: session.modality || '', duration: session.plannedDuration?.toString() || '' });
    };

    const createQuickSession = () => {
        if (!quickSD.name.trim() || !quickSD.date) return;
        const monDate = weekMonday(quickSD.date);
        // Find the correct phase/block for this date
        let targetPhase = null, targetBlock = null;
        for (const ph of plan.phases) {
            if (!ph.startDate) continue;
            const phEnd = ph.endDate || '9999-12-31';
            if (quickSD.date >= ph.startDate && quickSD.date <= phEnd) {
                targetPhase = ph;
                for (const b of ph.blocks) {
                    if (!b.startDate) continue;
                    const bEnd = b.endDate || '9999-12-31';
                    if (quickSD.date >= b.startDate && quickSD.date <= bEnd) {
                        targetBlock = b;
                        break;
                    }
                }
                break;
            }
        }
        if (!targetPhase || !targetBlock) return;
        handleAddSessionWithWeek(targetPhase.id, targetBlock.id, monDate, {
            date: quickSD.date, name: quickSD.name.trim(),
            load: quickSD.load || null, modality: quickSD.modality || null,
            plannedDuration: quickSD.duration ? parseInt(quickSD.duration) : null,
        });
        // Navigate to that week
        setSelPhaseId(targetPhase.id);
        setSelBlockId(targetBlock.id);
        setCurrentWeekStart(monDate);
        setQuickAddOpen(false);
        setQuickSD({ date: '', name: '', load: '', modality: '', duration: '' });
    };

    // ── Empty state ─────────────────────────────────────────────────────────────
    if (plan.phases.length === 0) {
        return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 text-center">
                <CalendarDays size={32} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1]">No phases set up yet.</p>
                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-1">Add phases and periods first, then plan microcycles here.</p>
            </div>
        );
    }

    // Week label for the nav bar
    const weekLabel = (() => {
        if (!currentWeekStart) return null;
        if (isOutsidePlanRange) return formatDateShort(currentWeekStart);
        if (blockWeekIdx >= 0) return `Block Week ${blockWeekIdx + 1} of ${blockNavWeeks.length}`;
        if (currentNavIdx >= 0) return `Plan Week ${currentNavIdx + 1} of ${allWeeks.length}`;
        return formatDateShort(currentWeekStart);
    })();

    return (
        <div className="space-y-3">

            {/* ── Gantt navigation ─────────────────────────────────────────── */}
            {ganttStart && allWeeks.length > 0 && (
                <><div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="flex">

                        {/* ── Left row labels ───────────────────────────────── */}
                        <div className="shrink-0 border-r border-slate-100 dark:border-[#243A58] pt-3 pb-2.5 flex flex-col" style={{ width: '52px' }}>
                            {/* Spacer: month row 13px + mb-0.5 2px + week row 20px + mb-2 8px = 43px */}
                            <div style={{ height: '43px' }} />
                            <div className="flex items-center justify-center" style={{ height: '18px', marginBottom: '4px' }}>
                                <span className="text-[8px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Phases</span>
                            </div>
                            <div className="flex items-center justify-center" style={{ height: '18px' }}>
                                <span className="text-[8px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Blocks</span>
                            </div>
                            {(plan.events || []).length > 0 && (
                                <div className="flex items-center justify-center" style={{ height: '14px', marginTop: '4px' }}>
                                    <span className="text-[8px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Events</span>
                                </div>
                            )}
                        </div>

                        {/* ── Scrollable gantt content ──────────────────────── */}
                        <div ref={ganttRef} className="flex-1 overflow-x-auto">
                            <div style={{ width: ganttW + 16 + 'px' }} className="px-2 pt-3 pb-2.5">

                                {/* Month labels — bordered + nowrap (fixes Jul 2026 overflow) */}
                                <div className="relative mb-0.5" style={{ height: '14px' }}>
                                    {monthGroups.map((mg, i) => (
                                        <div key={i}
                                            className="absolute text-[9px] font-bold text-slate-600 dark:text-[#E2E8F0] uppercase tracking-wide whitespace-nowrap overflow-hidden border-r-2 border-slate-300 dark:border-[#243A58] bg-slate-50/60 dark:bg-[#0F1C30]/60 flex items-center justify-center"
                                            style={{ left: mg.startIdx * WEEK_W + 'px', width: mg.count * WEEK_W + 'px', height: '14px' }}>
                                            {mg.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Clickable week buttons — ALL plan weeks */}
                                <div className="relative mb-1.5" style={{ height: '20px' }}>
                                    {showToday && (
                                        <div className="absolute top-0 bottom-0 bg-rose-50 dark:bg-rose-900/15 pointer-events-none z-0 rounded"
                                            style={{ left: todayWeekLeft + 'px', width: WEEK_W + 'px' }} />
                                    )}
                                    {allWeeks.map((w, i) => {
                                        const isActive  = w.date === currentWeekStart;
                                        const inSelBlock = selBlock?.startDate && selBlock?.endDate
                                            ? (w.date >= selBlock.startDate && w.date <= selBlock.endDate)
                                            : selBlock?.weeks.some(bw => bw.startDate === w.date);
                                        const hasSessions = plan.phases.some(ph =>
                                            ph.blocks.some(b => b.weeks.some(bw => bw.startDate === w.date && bw.sessions?.length > 0))
                                        );
                                        return (
                                            <button key={i}
                                                onClick={() => jumpToGanttWeek(w.date)}
                                                title={formatDateShort(w.date)}
                                                className={`absolute h-full rounded text-[8px] font-semibold flex items-center justify-center transition-all cursor-pointer
                                                    ${isActive
                                                        ? 'bg-blue-500 text-white'
                                                        : inSelBlock
                                                            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                                                            : 'text-slate-300 dark:text-[#475569] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-500'
                                                    }`}
                                                style={{ left: i * WEEK_W + 'px', width: WEEK_W - 2 + 'px' }}>
                                                W{w.weekNum}
                                                {hasSessions && !isActive && (
                                                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Phase + Block + Event rows — wrapped for full-height today line */}
                                <div className="relative">
                                    {showToday && (
                                        <div className="absolute top-0 bottom-0 bg-rose-50 dark:bg-rose-900/15 pointer-events-none z-0"
                                            style={{ left: todayWeekLeft + 'px', width: WEEK_W + 'px' }} />
                                    )}
                                {/* Phase bars */}
                                <div className="relative" style={{ height: '18px' }}>
                                    {plan.phases.map(ph => {
                                        if (!ph.startDate) return null;
                                        const isSel = ph.id === selPhaseId;
                                        // Week-aligned to match Timeline tab — phases extend to end of containing week
                                        const sWk = Math.floor(daysBetween(ganttStart, ph.startDate) / 7);
                                        const eWk = ph.endDate ? Math.floor(daysBetween(ganttStart, ph.endDate) / 7) : sWk;
                                        const lPx = sWk * WEEK_W;
                                        const wPx = Math.max(WEEK_W, (eWk - sWk + 1) * WEEK_W);
                                        return (
                                            <button key={ph.id}
                                                onClick={() => jumpToPhase(ph)}
                                                title={ph.name}
                                                className="absolute h-full rounded flex items-center px-1.5 overflow-hidden transition-all hover:opacity-90 cursor-pointer"
                                                style={{
                                                    left: lPx + 'px', width: wPx + 'px',
                                                    backgroundColor: isSel ? (ph.color || '#6366f1') + '50' : (ph.color || '#6366f1') + '20',
                                                    border: `1px solid ${ph.color || '#6366f1'}${isSel ? '90' : '40'}`,
                                                }}>
                                                <span className="text-[8px] font-bold truncate" style={{ color: ph.color || '#6366f1' }}>{ph.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Block bars */}
                                <div className="relative" style={{ height: '18px' }}>
                                    {(plan.phases || []).flatMap(ph => (ph.blocks || []).map(b => ({ ...b, phaseColor: ph.color || '#6366f1', phaseId: ph.id }))).map(b => {
                                        if (!b.startDate) return null;
                                        const isSel = b.id === selBlockId;
                                        const bColor = b.color || b.phaseColor;
                                        const sWk = Math.floor(daysBetween(ganttStart, b.startDate) / 7);
                                        const eWk = b.endDate ? Math.floor(daysBetween(ganttStart, b.endDate) / 7) : sWk;
                                        const lPx = sWk * WEEK_W;
                                        const wPx = Math.max(WEEK_W, (eWk - sWk + 1) * WEEK_W);
                                        return (
                                            <button key={b.id}
                                                onClick={() => jumpToBlock(b.phaseId, b)}
                                                title={b.label || b.name}
                                                className="absolute h-full rounded flex items-center px-1 overflow-hidden transition-all hover:opacity-90 cursor-pointer"
                                                style={{
                                                    left: lPx + 'px', width: wPx + 'px',
                                                    backgroundColor: isSel ? bColor : bColor + '28',
                                                    border: `1px solid ${bColor}${isSel ? 'ff' : '80'}`,
                                                    outline: isSel ? `2px solid ${bColor}` : 'none',
                                                    outlineOffset: '1px',
                                                }}>
                                                <span className="text-[7px] font-bold truncate" style={{ color: isSel ? 'white' : bColor }}>
                                                    {b.label || b.name}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Events row — directly under blocks */}
                                {(plan.events || []).length > 0 && (
                                    <div className="relative" style={{ height: '14px' }}>
                                        {(plan.events || []).map(e => {
                                            const color = e.color || EVENT_TYPE_COLORS[e.type] || '#6366f1';
                                            const lPx = daysBetween(ganttStart, e.date) / totalDaysPlan * ganttW;
                                            const rawW = e.endDate ? daysBetween(e.date, e.endDate) / totalDaysPlan * ganttW : 0;
                                            const wPx = Math.max(rawW, 36);
                                            const isOpen = ganttPopup?.id === e.id;
                                            return (
                                                <button key={e.id} onClick={ev => openGanttEvPopup(ev, e)}
                                                    title={e.label || e.title || ''}
                                                    className="absolute h-full rounded flex items-center px-1 overflow-hidden transition-all hover:opacity-80 cursor-pointer"
                                                    style={{ left: lPx + 'px', width: wPx + 'px', backgroundColor: color + (isOpen ? '50' : '30'), border: `1.5px solid ${color}` }}>
                                                    <span className="text-[7px] font-semibold truncate" style={{ color }}>{e.label || e.title}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {/* Full-height today line — spans phase + block + events */}
                                {showToday && (
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-rose-400/60 dark:bg-rose-400/50 z-10 pointer-events-none rounded-full"
                                        style={{ left: daysBetween(ganttStart, today) / totalDaysPlan * ganttW + 'px' }} />
                                )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <GanttPopup popup={ganttPopup} onClose={() => setGanttPopup(null)} /></>
            )}

            {/* ── Phase / Period / Week selectors ──────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-5 py-3">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Phase</span>
                        <CustomSelect value={selPhaseId} onChange={e => setSelPhaseId(e.target.value)} variant="filter" size="xs">
                            {plan.phases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                        </CustomSelect>
                    </div>
                    {selPhase?.blocks.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Block</span>
                            <CustomSelect value={selBlockId} onChange={e => setSelBlockId(e.target.value)} variant="filter" size="xs">
                                {selPhase.blocks.map(b => <option key={b.id} value={b.id}>{b.label || b.name}</option>)}
                            </CustomSelect>
                        </div>
                    )}
                    {currentWeekStart && (
                        <div className="flex items-center gap-2 ml-auto">
                            <button onClick={goToPrev}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                                <ChevronLeft size={14} className="text-slate-500 dark:text-[#CBD5E1]" />
                            </button>
                            <span className={`text-xs font-semibold whitespace-nowrap ${isOutsidePlanRange ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-[#E2E8F0]'}`}>
                                {weekLabel}
                                <span className="text-[10px] font-normal text-slate-400 dark:text-[#CBD5E1] ml-1.5">
                                    ({formatDateShort(currentWeekStart)} — {formatDateShort(weekEndStr)})
                                </span>
                            </span>
                            <button onClick={goToNext}
                                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                                <ChevronRight size={14} className="text-slate-500 dark:text-[#CBD5E1]" />
                            </button>
                        </div>
                    )}
                </div>
                {selPhase?.blocks.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-2">No blocks in this phase — add them in the Blocks tab.</p>
                )}
            </div>

            {/* ── Outside plan range banner ────────────────────────────────── */}
            {isOutsidePlanRange && currentWeekStart && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-2.5 flex items-center gap-2.5 flex-wrap">
                    <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 flex-1">
                        {currentWeekStart < ganttStart
                            ? 'This week is before the plan start date.'
                            : 'This week is beyond the plan end date.'
                        }
                        {' '}Extend the plan to include it or navigate back within the plan.
                    </p>
                    <button
                        onClick={() => {
                            if (currentWeekStart < ganttStart) {
                                handleUpdatePlan(plan.id, { startDate: currentWeekStart });
                            } else {
                                handleUpdatePlan(plan.id, { endDate: weekEndStr });
                            }
                        }}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors shrink-0">
                        Extend Plan
                    </button>
                </div>
            )}

            {/* ── Context info strip ───────────────────────────────────────── */}
            {isOutsideBlock && !isOutsidePlanRange && currentWeekStart && (
                contextInfo ? (
                    // In a different (but valid) phase/block — soft info
                    <div className="bg-slate-50 dark:bg-[#1A2D48]/60 border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1]">
                            Now viewing <span className="font-semibold text-slate-700 dark:text-[#CBD5E1]">{contextInfo.phase.name}</span>
                            {contextInfo.block && (
                                <> › <span className="font-semibold text-slate-700 dark:text-[#CBD5E1]">{contextInfo.block.label || contextInfo.block.name}</span></>
                            )}
                            {!contextInfo.block && <span className="italic text-slate-400 dark:text-[#CBD5E1]"> — no block covers this week</span>}
                            {contextInfo.block && (
                                <span className="text-slate-400 dark:text-[#CBD5E1]"> — sessions saved here go to this block</span>
                            )}
                        </p>
                    </div>
                ) : (
                    // Fully outside all planned phases but within plan range — amber warning
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                        <AlertTriangle size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            This week is outside all planned phases — no sessions can be saved here yet.
                        </p>
                    </div>
                )
            )}

            {currentWeekStart ? (
                <div className="flex gap-3 items-start">
                    {/* ── Left: focus bar + 7-day grid ────────────────────── */}
                    <div className="flex-1 min-w-0 space-y-3">

                        {/* Week focus bar */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-2.5 flex items-center gap-3">
                            <CalendarDays size={13} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" />
                            {effectiveWeek && editingWeekId === effectiveWeek.id ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] shrink-0">Focus:</span>
                                    <input autoFocus value={editWeekIntent}
                                        onChange={e => setEditWeekIntent(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveWeekIntent(); if (e.key === 'Escape') setEditingWeekId(null); }}
                                        className="flex-1 text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1 outline-none focus:border-indigo-400 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0]"
                                        placeholder="e.g. High Load, Deload, Peak..." />
                                    <button onClick={saveWeekIntent} className="text-indigo-600 hover:text-indigo-700"><Check size={13} /></button>
                                    <button onClick={() => setEditingWeekId(null)} aria-label="Close" className="text-slate-400"><X size={13} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-1 group/edit">
                                    <span className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1]">
                                        {effectiveWeek?.intent
                                            ? <><span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mr-1">Focus:</span>{effectiveWeek.intent}</>
                                            : <span className="text-slate-300 dark:text-[#475569] italic">
                                                {effectiveWeek ? 'No weekly focus — click pencil to set' : 'Unplanned week — add a session below to create it'}
                                              </span>
                                        }
                                    </span>
                                    {matchEvent && (
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 ml-2">
                                            ⚽ {matchEvent.label}
                                        </span>
                                    )}
                                    {effectiveWeek && (
                                        <button
                                            onClick={() => { setEditingWeekId(effectiveWeek.id); setEditWeekIntent(effectiveWeek.intent || ''); }}
                                            className="opacity-0 group-hover/edit:opacity-100 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-all ml-1">
                                            <PencilIcon size={10} className="text-slate-400" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 7-day session grid */}
                        <div className="grid grid-cols-7 gap-1.5" onClick={e => { if (e.target === e.currentTarget) setSelectedDate(null); }}>
                            {DAYS.map((dayName, i) => {
                                const dateStr     = weekDates[i];
                                const d           = dateStr ? dayDate(currentWeekStart, i) : null;
                                const daySessions = currentSessions.filter(s => s.date === dateStr);
                                const isAdd       = addingDate === dateStr;
                                const mdLabel     = getMdLabel(dateStr);
                                const isMatch     = mdLabel === 'MD';
                                const topLoad     = dayTopLoad[i];

                                const isSelDay = selectedDate === dateStr;
                                return (
                                    <div key={i}
                                        className={`rounded-xl border shadow-sm overflow-hidden flex flex-col min-h-[140px] transition-all
                                            ${isSelDay
                                                ? 'border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-200 dark:ring-indigo-800'
                                                : isMatch
                                                    ? 'border-red-300 dark:border-red-800/60 bg-red-50/30 dark:bg-red-900/10'
                                                    : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338]'}`}>

                                        <button
                                            onClick={() => setSelectedDate(isSelDay ? null : dateStr)}
                                            className={`px-2 py-1.5 border-b flex flex-col gap-0.5 w-full text-left transition-colors
                                                ${isSelDay
                                                    ? 'border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20'
                                                    : isMatch
                                                        ? 'border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20'
                                                        : 'border-slate-100 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/30 hover:bg-slate-100 dark:hover:bg-[#1A2D48]/50'}`}>
                                            <span className={`text-[9px] font-bold uppercase ${isSelDay ? 'text-indigo-600 dark:text-indigo-400' : isMatch ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-[#CBD5E1]'}`}>
                                                {dayName}
                                            </span>
                                            {d && <span className={`text-[8px] ${isSelDay ? 'text-indigo-500 dark:text-indigo-400' : isMatch ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>
                                                {d.getDate()} {MONTHS[d.getMonth()]}
                                            </span>}
                                            {mdLabel && <span className={`text-[8px] font-bold ${isMatch ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>{mdLabel}</span>}
                                        </button>

                                        {/* Event badges for this day */}
                                        {(() => {
                                            const dayEvts = weekEvents.filter(e => dateStr && dateStr >= e.date && dateStr <= (e.endDate || e.date));
                                            if (!dayEvts.length) return null;
                                            return (
                                                <div className="px-1.5 pt-1 flex flex-col gap-0.5">
                                                    {dayEvts.map(ev => {
                                                        const color = ev.color || EVENT_TYPE_COLORS[ev.type] || '#6366f1';
                                                        return (
                                                            <button key={ev.id} type="button"
                                                                onClick={e => { e.stopPropagation(); setEditingPlanEvent(ev); setIsPlanEventModalOpen(true); }}
                                                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[7px] font-semibold truncate w-full text-left hover:brightness-95 transition-all"
                                                                style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}>
                                                                <span className="truncate">{ev.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}

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
                                                            className={INPUT_CLS + ' font-bold'}
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
                                                            className={INPUT_CLS}
                                                            placeholder="Duration (min)" />
                                                        <div className="flex gap-1">
                                                            <button onClick={() => saveSession(session.id)} className="flex-1 text-[9px] font-semibold bg-indigo-600 text-white rounded py-0.5 hover:bg-indigo-500">Save</button>
                                                            <button onClick={() => setEditingSessionId(null)} className="text-[9px] text-slate-400 dark:text-[#94A3B8] px-1 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48]">✕</button>
                                                        </div>
                                                        <button onClick={() => deleteSession(session.id)} className="flex items-center gap-1 text-[8px] text-red-400 hover:text-red-600">
                                                            <Trash2 size={8} /> Remove
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div key={session.id}
                                                        onClick={() => startEdit(session, dateStr)}
                                                        className="group/card rounded-lg p-1.5 border border-slate-200 dark:border-[#243A58] bg-slate-50/60 dark:bg-[#0F1C30]/40 hover:border-indigo-200 dark:hover:border-indigo-800/40 transition-colors cursor-pointer">
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
                                                                <span className="text-[7px] text-slate-400 dark:text-[#CBD5E1] flex items-center gap-0.5">
                                                                    <Clock size={6} />{session.plannedDuration}m
                                                                </span>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                if (session.workoutTemplateId) {
                                                                    const tpl = (workoutTemplates || []).find(t => t.id === session.workoutTemplateId);
                                                                    navigate('/workouts/packets', { state: { editTemplate: tpl ? { ...tpl } : { id: session.workoutTemplateId }, returnTo: '/periodization', returnToMicrocycles: { phaseId: selPhaseId, blockId: selBlockId, weekStart: currentWeekStart, selectedDate: dateStr } } });
                                                                } else {
                                                                    navigate('/workouts/packets', { state: { assignToPlanSession: buildAssignCtx(session, dateStr) } });
                                                                }
                                                            }}
                                                            className="flex items-center gap-0.5 text-[7px] text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-500 dark:hover:text-indigo-400 font-medium mt-1 transition-colors">
                                                            <LinkIcon size={6} /> {session.workoutTemplateId ? 'View Workout' : 'Assign'}
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {isAdd ? (
                                                <div className="space-y-1 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/40 rounded-lg p-1.5">
                                                    <input autoFocus value={newSD.name}
                                                        onChange={e => setNewSD(d => ({ ...d, name: e.target.value }))}
                                                        onKeyDown={e => { if (e.key === 'Enter') createSession(dateStr); if (e.key === 'Escape') setAddingDate(null); }}
                                                        className={INPUT_CLS + ' font-bold'}
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
                                                        className={INPUT_CLS}
                                                        placeholder="Duration (min)" />
                                                    <div className="flex gap-1">
                                                        <button onClick={() => createSession(dateStr)} disabled={!newSD.name.trim()}
                                                            className="flex-1 text-[9px] font-semibold bg-indigo-600 text-white rounded py-0.5 hover:bg-indigo-500 disabled:opacity-40">Add</button>
                                                        <button onClick={() => setAddingDate(null)} className="text-[9px] text-slate-400 dark:text-[#94A3B8] px-1 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48]">✕</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => startAdd(dateStr)}
                                                    className="flex items-center justify-center gap-0.5 text-[8px] font-medium text-slate-300 dark:text-[#475569] hover:text-indigo-400 dark:hover:text-indigo-400 transition-colors w-full py-1 rounded border border-dashed border-slate-200 dark:border-[#243A58] hover:border-indigo-300 mt-auto">
                                                    <Plus size={8} /> {daySessions.length === 0 ? 'Add session' : 'Add'}
                                                </button>
                                            )}
                                        </div>

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

                        {/* ── Day detail panel ──────────────────────────────── */}
                        {selectedDate && (() => {
                            const d = new Date(selectedDate + 'T12:00:00');
                            const daySessions = currentSessions.filter(s => s.date === selectedDate);
                            return (
                                <div className="bg-white dark:bg-[#132338] rounded-xl border border-indigo-200 dark:border-indigo-800/40 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-indigo-100 dark:border-indigo-800/30 bg-indigo-50/60 dark:bg-indigo-900/10">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays size={12} className="text-indigo-500 dark:text-indigo-400" />
                                            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                                {DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]} {d.getDate()} {MONTHS[d.getMonth()]} — {daySessions.length} session{daySessions.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <button onClick={() => setSelectedDate(null)} aria-label="Close" className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/20 text-indigo-400">
                                            <X size={11} />
                                        </button>
                                    </div>
                                    {daySessions.length === 0 ? (
                                        <div className="px-4 py-4 flex items-center justify-between">
                                            <p className="text-xs text-slate-400 dark:text-[#CBD5E1] italic">No sessions planned — add one below or use Quick Add.</p>
                                            <button onClick={() => startAdd(selectedDate)}
                                                className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-white px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-[#1A2D48] hover:bg-indigo-100 dark:hover:bg-indigo-500/15 transition-colors">
                                                <Plus size={10} /> Add Session
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-[#243A58]">
                                            {daySessions.map(session => {
                                                const meta = modalityMeta(session.modality);
                                                const Icon = meta.icon;
                                                const linkedTpl = session.workoutTemplateId
                                                    ? (workoutTemplates || []).find(t => t.id === session.workoutTemplateId)
                                                    : null;
                                                const allExercises = linkedTpl ? [
                                                    ...(linkedTpl.sections?.warmup   || []),
                                                    ...(linkedTpl.sections?.workout  || []),
                                                    ...(linkedTpl.sections?.cooldown || []),
                                                ] : [];
                                                return (
                                                    <div key={session.id} className="px-4 pt-3 pb-3.5">
                                                        {/* Session info row — spread across full width */}
                                                        <div className="flex items-center gap-3">
                                                            {/* Modality pill */}
                                                            <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg shrink-0 ${meta.color}`}>
                                                                <Icon size={11} />
                                                                <span className="text-[10px] font-bold">{session.modality || 'General'}</span>
                                                            </div>
                                                            {/* Name — takes remaining space */}
                                                            <p className="flex-1 min-w-0 text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{session.name}</p>
                                                            {/* Load badge */}
                                                            {session.load && (
                                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-full shrink-0 ${LOAD_PILL[session.load] || ''}`}>
                                                                    {session.load}
                                                                </span>
                                                            )}
                                                            {/* Duration */}
                                                            {session.plannedDuration && (
                                                                <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] flex items-center gap-1 shrink-0">
                                                                    <Clock size={10} /> {session.plannedDuration} min
                                                                </span>
                                                            )}
                                                            {/* Edit */}
                                                            <button
                                                                onClick={() => startEdit(session, selectedDate)}
                                                                className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-300 hover:text-slate-600 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1] transition-colors">
                                                                <PencilIcon size={12} />
                                                            </button>
                                                        </div>

                                                        {session.notes && (
                                                            <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-1.5 ml-1 leading-relaxed">{session.notes}</p>
                                                        )}

                                                        {/* Workout packet section */}
                                                        {allExercises.length > 0 ? (
                                                            <div className="mt-3 bg-slate-50 dark:bg-[#0F1C30]/50 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-[#243A58]">
                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mb-2.5">
                                                                    {allExercises.map((ex, i) => (
                                                                        <p key={i} className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-snug flex items-baseline gap-1.5">
                                                                            <span className="text-slate-300 dark:text-[#475569] tabular-nums shrink-0">{i + 1}.</span>
                                                                            <span className="font-medium truncate">{ex.exerciseName || ex.name || 'Exercise'}</span>
                                                                            {(ex.sets || ex.reps) && (
                                                                                <span className="text-slate-400 dark:text-[#CBD5E1] shrink-0">{ex.sets && `${ex.sets}×`}{ex.reps}</span>
                                                                            )}
                                                                        </p>
                                                                    ))}
                                                                </div>
                                                                <button
                                                                    onClick={() => navigate('/workouts/packets', { state: { editTemplate: { ...linkedTpl }, returnTo: '/periodization', returnToMicrocycles: { phaseId: selPhaseId, blockId: selBlockId, weekStart: currentWeekStart, selectedDate } } })}
                                                                    className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                                                                    <LinkIcon size={10} /> View full workout packet
                                                                </button>
                                                            </div>
                                                        ) : session.workoutTemplateId ? (
                                                            <div className="mt-3">
                                                                <button
                                                                    onClick={() => navigate('/workouts/packets', { state: { editTemplate: { id: session.workoutTemplateId }, returnTo: '/periodization', returnToMicrocycles: { phaseId: selPhaseId, blockId: selBlockId, weekStart: currentWeekStart, selectedDate } } })}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-600 border border-indigo-100 dark:border-indigo-800/40 transition-colors">
                                                                    <LinkIcon size={10} /> View Workout Packet
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-3">
                                                                <button
                                                                    onClick={() => navigate('/workouts/packets', { state: { assignToPlanSession: buildAssignCtx({ id: session.id }, selectedDate) } })}
                                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold transition-colors shadow-sm">
                                                                    <Plus size={11} /> Assign Workout Packet
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            <div className="px-4 py-2">
                                                <button onClick={() => startAdd(selectedDate)}
                                                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-500 transition-colors">
                                                    <Plus size={10} /> Add another session
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* ── Right sidebar ─────────────────────────────────────── */}
                    <div className="w-44 shrink-0 space-y-3">

                        {/* Quick Add Session */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                            <button
                                onClick={() => {
                                    setQuickAddOpen(v => !v);
                                    if (!quickSD.date) setQuickSD(d => ({ ...d, date: weekDates.find(Boolean) || '' }));
                                }}
                                className="flex items-center gap-1.5 w-full px-3.5 py-2.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors">
                                <Plus size={11} />
                                Quick Add Session
                                <ChevronRight size={10} className={`ml-auto transition-transform ${quickAddOpen ? 'rotate-90' : ''}`} />
                            </button>
                            {quickAddOpen && (
                                <div className="px-3.5 pb-3.5 space-y-2 border-t border-slate-100 dark:border-[#243A58] pt-3">
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Date</label>
                                        <DatePicker value={quickSD.date} onChange={e => setQuickSD(d => ({ ...d, date: e.target.value }))} />
                                    </div>
                                    <input value={quickSD.name}
                                        onChange={e => setQuickSD(d => ({ ...d, name: e.target.value }))}
                                        className={INPUT_CLS + ' font-semibold'}
                                        placeholder="Session name" />
                                    <CustomSelect value={quickSD.modality} onChange={e => setQuickSD(d => ({ ...d, modality: e.target.value }))} variant="form" size="xs">
                                        <option value="">No modality</option>
                                        {planModalities.map(m => <option key={m} value={m}>{m}</option>)}
                                    </CustomSelect>
                                    <CustomSelect value={quickSD.load} onChange={e => setQuickSD(d => ({ ...d, load: e.target.value }))} variant="form" size="xs">
                                        <option value="">No load</option>
                                        {LOAD_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                    </CustomSelect>
                                    <input type="number" value={quickSD.duration}
                                        onChange={e => setQuickSD(d => ({ ...d, duration: e.target.value }))}
                                        className={INPUT_CLS}
                                        placeholder="Duration (min)" />
                                    {quickSD.date && !plan.phases.some(ph => ph.blocks.some(b => {
                                        const bEnd = b.endDate || '9999-12-31';
                                        return quickSD.date >= (b.startDate || '') && quickSD.date <= bEnd;
                                    })) && (
                                        <p className="text-[8px] text-amber-500 dark:text-amber-400">Date is outside all planned blocks.</p>
                                    )}
                                    <button
                                        onClick={createQuickSession}
                                        disabled={!quickSD.name.trim() || !quickSD.date}
                                        className="w-full text-[9px] font-semibold bg-indigo-600 text-white rounded-lg py-1.5 hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                                        Add & Navigate
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Key information */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-3.5">
                            <h4 className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2.5">Key Information</h4>
                            <div className="space-y-2">
                                {[
                                    { label: 'Phase',     value: (isOutsideBlock && effectivePhase?.name !== selPhase?.name) ? effectivePhase?.name : selPhase?.name },
                                    { label: 'Block',     value: (isOutsideBlock && effectiveBlock?.id !== selBlock?.id) ? (effectiveBlock?.label || effectiveBlock?.name) : (selBlock?.label || selBlock?.name) },
                                    { label: 'Week',      value: blockWeekIdx >= 0 ? `${blockWeekIdx + 1} / ${blockNavWeeks.length}` : '—' },
                                    { label: 'Dates',     value: `${formatDateShort(currentWeekStart)} — ${formatDateShort(weekEndStr)}` },
                                    { label: 'Intensity', value: effectiveBlock?.intensityLevel || selBlock?.intensityLevel || '—' },
                                    { label: 'Volume',    value: effectiveBlock?.volumeLevel || selBlock?.volumeLevel || '—' },
                                ].map(({ label, value }) => (
                                    <div key={label} className="flex items-start justify-between gap-2">
                                        <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] shrink-0">{label}</span>
                                        <span className="text-[9px] font-semibold text-slate-700 dark:text-[#CBD5E1] text-right leading-snug">{value || '—'}</span>
                                    </div>
                                ))}
                                {matchEvent && (
                                    <div className="pt-1.5 border-t border-slate-100 dark:border-[#243A58]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] text-red-500 dark:text-red-400 font-bold">Match</span>
                                            <span className="text-[9px] font-semibold text-red-600 dark:text-red-400">{formatDateShort(matchEvent.date)}</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 dark:text-[#CBD5E1] mt-0.5 text-right truncate">{matchEvent.title}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Week summary */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-3.5">
                            <h4 className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2.5">Week Summary</h4>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-slate-500 dark:text-[#CBD5E1]">Total Sessions</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-[#E2E8F0]">{weekStats.total}</span>
                                </div>
                                {Object.keys(weekStats.byModality).length > 0 && (
                                    <div className="pt-1.5 border-t border-slate-100 dark:border-[#243A58] dark:divide-[#243A58] space-y-1">
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

                        {/* Period modality loads */}
                        {(() => {
                            const displayBlock = (isOutsideBlock ? effectiveBlock : selBlock);
                            return displayBlock && Object.keys(displayBlock.modalities || {}).length > 0 ? (
                                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-3.5">
                                    <h4 className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2.5">Block Modality Emphasis</h4>
                                    <div className="space-y-1.5">
                                        {Object.entries(displayBlock.modalities).map(([mod, level]) => {
                                            const meta = modalityMeta(mod);
                                            const Icon = meta.icon;
                                            return (
                                                <div key={mod} className="flex items-center justify-between gap-2">
                                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${meta.color}`}>
                                                        <Icon size={7} />
                                                        <span className="text-[8px] font-semibold truncate">{mod}</span>
                                                    </div>
                                                    <span className="text-[8px] font-semibold text-slate-500 dark:text-[#CBD5E1] shrink-0">{level}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-10 text-center">
                    {selPhase?.blocks.length === 0
                        ? <p className="text-sm text-slate-400 dark:text-[#CBD5E1]">This phase has no blocks — add some in the Blocks tab.</p>
                        : <p className="text-sm text-slate-400 dark:text-[#CBD5E1]">Select a phase and block to view microcycles.</p>
                    }
                </div>
            )}
        </div>
    );
};
