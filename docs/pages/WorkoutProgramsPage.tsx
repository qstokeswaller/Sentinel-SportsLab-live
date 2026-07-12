// @ts-nocheck
import React, { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { useWorkoutsLayout } from '../context/WorkoutsLayoutContext';
import { useExerciseMap } from '../hooks/useExerciseMap';
import { useWorkoutPrograms, useDeleteProgram, useProgramWithDays, useProgramWeekCounts } from '../hooks/useWorkoutPrograms';
import { ProgramBuilderModal } from '../components/workouts/ProgramBuilderModal';
import { ProgramViewModal } from '../components/workouts/ProgramViewModal';
import { ProgramAssignModal } from '../components/workouts/ProgramAssignModal';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { ShareWorkoutPopover } from '../components/workouts/ShareWorkoutPopover';
import { OwnershipFilter, matchesOwnershipScope, type OwnershipScope } from '../components/tier/OwnershipFilter';
import { CreatorBadge } from '../components/tier/CreatorBadge';
import { useAuth } from '../context/AuthContext';
import { fuzzySearch } from '../utils/fuzzySearch';
import DidYouMeanBanner from '../components/library/DidYouMeanBanner';
import {
    LayersIcon, PlusIcon,
    PencilIcon, Trash2Icon, Share2Icon, EyeIcon,
    CalendarPlus as CalendarPlusIcon, ChevronRightIcon, ChevronLeftIcon,
    SlidersHorizontal as SlidersHorizontalIcon, XIcon,
} from 'lucide-react';

// Section defaults — mirror TemplateViewModal so colours stay consistent
const DEFAULT_SECTION_LABELS: Record<string, string> = {
    warmup: 'Warm Up',
    workout: 'Workout',
    cooldown: 'Cool Down',
};
const DEFAULT_SECTION_COLORS: Record<string, string> = {
    warmup: '#f59e0b',
    workout: '#6366f1',
    cooldown: '#0ea5e9',
};
// Canonical training phases — same list used by ProgramBuilderModal so filtering and creation stay in sync.
const TRAINING_PHASES = ['Strength', 'Power', 'Hypertrophy', 'Speed', 'Conditioning', 'Recovery', 'Technical', 'GPP'];

// ── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── (ProgramMenu removed — actions moved into right-rail descriptor footer) ─

// ── Main Page ────────────────────────────────────────────────────────────────

export const WorkoutProgramsPage = () => {
    const { showToast, scheduledSessions, resolveTargetName, setPlannedTonnageLog } = useAppState();
    const { user: authUser } = useAuth();
    const location = useLocation();
    const [ownershipScope, setOwnershipScope] = useState<OwnershipScope>('all');
    // Pull the memoized id→name map (NOT resolveExerciseName, which isn't memoized in the hook
    // and would invalidate the descriptor's useMemo every render → infinite loop).
    const { exerciseMap } = useExerciseMap();
    // search + view live in the Workouts shell layout (persistent across tab switches).
    // We register our "Create" handler with the shell so its Create Program button can fire it.
    const { search, setSearch, view, registerCreate, setHideShell, setOverviewRows, setSidebarExtra } = useWorkoutsLayout();

    // Tabs:
    //  - 'templates' (formerly 'active'): every saved program — they're all reusable templates regardless of assignment
    //  - 'assigned'  (formerly 'archived'): only programs that have at least one scheduled session referencing them
    const [activeTab, setActiveTab] = useState<'templates' | 'assigned'>('templates');
    const [assignedTargetFilter, setAssignedTargetFilter] = useState<'all' | 'Team' | 'Individual'>('all');
    // Popover filters
    const [phaseFilter, setPhaseFilter] = useState<string>('All');
    const [durationFilter, setDurationFilter] = useState<'All' | 'Short' | 'Medium' | 'Long'>('All');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Past' | 'Upcoming'>('All');
    const [targetFilter, setTargetFilter] = useState<string>('All'); // 'All' | targetId
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
    const filterPopoverRef = useRef<HTMLDivElement | null>(null);
    const { data: weekCounts = {} } = useProgramWeekCounts();
    // Selected program drives the right-rail descriptor; selectedDayId drills into one
    // day inside the descriptor (Library-style swap with breadcrumb back).
    const [selectedProgram, setSelectedProgram] = useState<any | null>(null);
    const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const { data: selectedFullProgram } = useProgramWithDays(selectedProgram?.id ?? null);
    const [isProgramBuilderOpen, setIsProgramBuilderOpen] = useState(false);
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [editingProgramBasic, setEditingProgramBasic] = useState(null);
    const { data: editingFullProgram } = useProgramWithDays(editingProgramId);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [shareTarget, setShareTarget] = useState<{ type: 'program'; id: string; name: string } | null>(null);
    const [assignTarget, setAssignTarget] = useState<{ id: string; name: string; training_phase?: string | null } | null>(null);
    // "View Full" modal — opens from descriptor footer for the deep-dive program view
    const [viewModalProgram, setViewModalProgram] = useState<any | null>(null);

    const { data: programs = [], isLoading } = useWorkoutPrograms();
    const deleteProgram = useDeleteProgram();

    // When navigated here from Dashboard → "View Workout" on a program-linked
    // calendar session, land on the Assigned tab and pre-select the source program
    // so the user sees its days/exercises immediately. Same UX as if they
    // clicked the program card themselves. Placed AFTER the programs query so
    // it can read the loaded list without hitting a TDZ on the closure.
    React.useEffect(() => {
        const focusProgramId = (location.state as any)?.focusProgramId;
        if (!focusProgramId || programs.length === 0) return;
        const match = programs.find((p: any) => p.id === focusProgramId);
        if (match) {
            setActiveTab('assigned');
            setSelectedProgram(match);
            // Clear the state once consumed so a manual tab change doesn't re-trigger
            window.history.replaceState({}, '');
        }
    }, [programs, location.state]);

    // A program is "Assigned" if at least one scheduled_session references it via program_id.
    // assignedProgramIds (unfiltered) drives the tab count; assignedProgramIdsFiltered
    // respects the Team/Individual pill filter and is used to filter the list itself.
    const assignedProgramIds = useMemo(() => {
        const ids = new Set<string>();
        for (const s of scheduledSessions || []) {
            const pid = (s as any).program_id || (s as any).programId;
            if (pid) ids.add(pid);
        }
        return ids;
    }, [scheduledSessions]);

    const assignedProgramIdsFiltered = useMemo(() => {
        const ids = new Set<string>();
        for (const s of scheduledSessions || []) {
            const pid = (s as any).program_id || (s as any).programId;
            if (!pid) continue;
            const ttype = (s as any).target_type || (s as any).targetType || 'Individual';
            if (assignedTargetFilter !== 'all' && ttype !== assignedTargetFilter) continue;
            ids.add(pid);
        }
        return ids;
    }, [scheduledSessions, assignedTargetFilter]);

    // ── Sidebar stats ──────────────────────────────────────────────────────
    // Phase distribution is driven by the new `training_phase` enum (not free-text tags),
    // so the count is always clean — no duplicate "Off-Season" vs "Off Season" buckets.
    // Drafts = programs without a `start_date` set (saved but not yet scheduled to start).
    const sidebarStats = useMemo(() => {
        const total = programs.length;
        const drafts = programs.filter(p => !p.start_date).length;
        const phaseCounts: Record<string, number> = {};
        for (const p of programs) {
            const phase = p.training_phase || 'Unassigned';
            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
        }
        const phaseDistribution = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1]);
        return { total, drafts, phaseDistribution };
    }, [programs]);

    const programSearch = useMemo(
        () => fuzzySearch(programs, search, p => [p.name, p.overview || '', ...(p.tags ?? [])].join(' '), p => p.name),
        [programs, search]
    );
    // Per-program assignment summary — used by Status + Target filters.
    // Maps program_id → { firstDate, lastDate, targetIds[] } from all scheduled sessions.
    const programAssignmentInfo = useMemo(() => {
        const map: Record<string, { firstDate: string | null; lastDate: string | null; targetIds: Set<string> }> = {};
        for (const s of scheduledSessions || []) {
            const pid = (s as any).program_id || (s as any).programId;
            if (!pid) continue;
            const date = s.date;
            const tid = (s as any).target_id || (s as any).targetId;
            if (!map[pid]) map[pid] = { firstDate: null, lastDate: null, targetIds: new Set() };
            if (date && (!map[pid].firstDate || date < map[pid].firstDate!)) map[pid].firstDate = date;
            if (date && (!map[pid].lastDate || date > map[pid].lastDate!)) map[pid].lastDate = date;
            if (tid) map[pid].targetIds.add(tid);
        }
        return map;
    }, [scheduledSessions]);

    // Build target option list from teams + all athletes (within the chosen Team/Individual pill scope).
    const targetOptions = useMemo(() => {
        const opts: { id: string; label: string; type: 'Team' | 'Individual' }[] = [];
        if (assignedTargetFilter === 'all' || assignedTargetFilter === 'Team') {
            (scheduledSessions || []).forEach(() => {/* placeholder for upstream usage if needed */});
        }
        // teams isn't directly imported here — derive targets from scheduledSessions' resolveTargetName.
        // Build a unique set keyed by target_id, capturing type + resolved name.
        const seen: Record<string, { id: string; label: string; type: 'Team' | 'Individual' }> = {};
        (scheduledSessions || []).forEach((s: any) => {
            const tid = s.target_id || s.targetId;
            const ttype = (s.target_type || s.targetType || 'Individual') as 'Team' | 'Individual';
            if (!tid || seen[tid]) return;
            if (assignedTargetFilter !== 'all' && ttype !== assignedTargetFilter) return;
            const label = resolveTargetName ? (resolveTargetName(tid, ttype) || tid) : tid;
            // Skip stale UUID-shaped names (target deleted)
            const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label);
            if (looksLikeUuid) return;
            seen[tid] = { id: tid, label, type: ttype };
        });
        return Object.values(seen).sort((a, b) => a.label.localeCompare(b.label));
    }, [scheduledSessions, assignedTargetFilter]);

    // Apply tab + phase + duration + status + target filters on top of search.
    const filteredPrograms = useMemo(() => {
        let list = activeTab === 'assigned'
            ? programSearch.results.filter(p => assignedProgramIdsFiltered.has(p.id))
            : programSearch.results;
        if (phaseFilter !== 'All') list = list.filter(p => (p.training_phase || '') === phaseFilter);
        if (durationFilter !== 'All') {
            list = list.filter(p => {
                const weeks = weekCounts[p.id];
                if (weeks == null) return false; // unclassifiable → exclude (real filter, not best-effort)
                if (durationFilter === 'Short') return weeks <= 2;
                if (durationFilter === 'Medium') return weeks >= 3 && weeks <= 6;
                if (durationFilter === 'Long') return weeks >= 7;
                return true;
            });
        }
        if (activeTab === 'assigned' && statusFilter !== 'All') {
            const today = new Date().toISOString().slice(0, 10);
            list = list.filter(p => {
                const info = programAssignmentInfo[p.id];
                if (!info) return false;
                if (statusFilter === 'Active') return info.firstDate! <= today && info.lastDate! >= today;
                if (statusFilter === 'Upcoming') return info.firstDate! > today;
                if (statusFilter === 'Past') return info.lastDate! < today;
                return true;
            });
        }
        if (activeTab === 'assigned' && targetFilter !== 'All') {
            list = list.filter(p => programAssignmentInfo[p.id]?.targetIds.has(targetFilter));
        }
        // Ownership scope filter (All / Mine / Org). No-op on single-user orgs.
        if (ownershipScope !== 'all') {
            list = list.filter(p => matchesOwnershipScope(p, ownershipScope, authUser?.id));
        }
        return list;
    }, [programSearch.results, activeTab, assignedProgramIdsFiltered, phaseFilter, durationFilter, statusFilter, targetFilter, weekCounts, programAssignmentInfo, ownershipScope, authUser?.id]);

    // Use the canonical list (same as Create Program) so every phase a user could possibly
    // assign is filterable, even if no current program uses it yet.
    const availablePhases = TRAINING_PHASES;

    const activeFilterCount =
        (phaseFilter !== 'All' ? 1 : 0) +
        (durationFilter !== 'All' ? 1 : 0) +
        (activeTab === 'assigned' && statusFilter !== 'All' ? 1 : 0) +
        (activeTab === 'assigned' && targetFilter !== 'All' ? 1 : 0);

    const clearAllFilters = () => {
        setPhaseFilter('All');
        setDurationFilter('All');
        setStatusFilter('All');
        setTargetFilter('All');
    };

    // Click outside the popover closes it
    useEffect(() => {
        if (!filterPopoverOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
                setFilterPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [filterPopoverOpen]);

    const handleDelete = async (id: string) => {
        const name = programs.find(p => p.id === id)?.name;
        try {
            await deleteProgram.mutateAsync(id);
            // Optimistic prune of future tonnage rows for this program — DB-side
            // delete inside useDeleteProgram already happened; this keeps state in sync.
            const d = new Date();
            const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            setPlannedTonnageLog?.((prev: any[]) => prev.filter(r => !(r.source_id === id && r.date > today)));
            showToast(name ? `"${name}" deleted` : 'Program deleted', 'success');
        } catch {
            showToast('Failed to delete program', 'error');
        }
        setConfirmDeleteId(null);
    };

    const openEdit = (p) => {
        setEditingProgramBasic(p);
        setEditingProgramId(p.id);
        setIsProgramBuilderOpen(true);
    };

    // Wire the shell's "Create Program" button to open a fresh builder
    useEffect(() => {
        return registerCreate(() => {
            setEditingProgramBasic(null);
            setEditingProgramId(null);
            setIsProgramBuilderOpen(true);
        });
    }, [registerCreate]);

    // When the builder takes over, hide the shell header so it has the full canvas
    useEffect(() => {
        setHideShell(isProgramBuilderOpen);
    }, [isProgramBuilderOpen, setHideShell]);

    // Push Overview rows to the shell's top-right tile.
    // useLayoutEffect (not useEffect) so the populated rows land in the FIRST paint —
    // otherwise the tile is missing for one frame on first navigation to this page.
    // Cleanup clears the rows on unmount so the next tab doesn't see stale Programs data.
    useLayoutEffect(() => {
        setOverviewRows([
            { label: 'Total Programs', value: sidebarStats.total },
            { label: 'Drafts', value: sidebarStats.drafts, hint: 'No start date set' },
        ]);
        return () => setOverviewRows([]);
    }, [sidebarStats.total, sidebarStats.drafts, setOverviewRows]);

    // Scheduled instances for the selected program (drives Assigned-tab descriptor copy)
    const selectedProgramAssignments = useMemo(() => {
        if (!selectedProgram) return [];
        return (scheduledSessions || [])
            .filter((s: any) => (s.program_id || s.programId) === selectedProgram.id)
            .map((s: any) => ({
                targetType: s.target_type || s.targetType,
                targetId:   s.target_id || s.targetId,
                date:       s.date,
            }));
    }, [selectedProgram, scheduledSessions]);

    // Right-rail descriptor — program-level by default, with drill-down into a single day.
    // Replaces the old Phase Distribution tile. Empty state when no program is selected.
    const sidebarExtraNode = useMemo<React.ReactNode>(() => {
        if (!selectedProgram) {
            return (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-4 py-8 text-center">
                        <LayersIcon size={28} className="mx-auto mb-2 text-slate-300 dark:text-[#475569]" />
                        <div className="text-xs font-semibold text-slate-500 dark:text-[#CBD5E1]">No program selected</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1 leading-relaxed">Click a program on the left to see weeks, days and exercises.</div>
                    </div>
                </div>
            );
        }

        const p = selectedProgram;
        const days = (selectedFullProgram as any)?.days ?? [];
        const weeksCount = days.length > 0
            ? Math.max(...days.map((d: any) => d.week_number || 1))
            : 0;
        const isLoading = !selectedFullProgram && !!selectedProgram;
        const availableWeeks: number[] = weeksCount > 0
            ? Array.from({ length: weeksCount }, (_, i) => i + 1)
            : [1];
        const activeWeek = Math.min(selectedWeek, weeksCount || 1);
        const daysInActiveWeek = days.filter((d: any) => (d.week_number || 1) === activeWeek);

        // ── Drill-down view: one specific day ──────────────────────────────
        const drilledDay = selectedDayId ? days.find((d: any) => d.id === selectedDayId) : null;

        if (drilledDay) {
            const exGroups: Record<string, any[]> = {};
            (drilledDay.exercises || []).forEach((ex: any) => {
                const sec = ex.section || 'workout';
                if (!exGroups[sec]) exGroups[sec] = [];
                exGroups[sec].push(ex);
            });
            const persistedMeta = drilledDay.section_meta as Record<string, { label: string; color: string }> | undefined;
            const persistedOrder = drilledDay.section_order as string[] | undefined;
            const dayOrder = (persistedOrder && persistedOrder.length > 0) ? persistedOrder : ['warmup', 'workout', 'cooldown'];
            const totalDayEx = dayOrder.reduce((sum, sec) => sum + (exGroups[sec]?.length || 0), 0);

            return (
                <div className="relative bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                    {/* Sticky back bar — prominent, full-width, mirrors common drill-down patterns */}
                    <button
                        onClick={() => setSelectedDayId(null)}
                        className="w-full flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 border-b border-indigo-200 dark:border-indigo-500/30 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 transition-colors shrink-0"
                    >
                        <ChevronLeftIcon size={14} /> Back to Program
                    </button>

                    {/* Day header */}
                    <div className="px-4 pt-3 pb-2.5 border-b border-slate-100 dark:border-[#1A2D48] shrink-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">
                            Week {drilledDay.week_number || 1} · Day {drilledDay.day_number || 1}
                            {drilledDay.name ? <span className="text-slate-500 dark:text-[#CBD5E1] font-normal"> — {drilledDay.name}</span> : null}
                        </h3>
                        <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-1">
                            {drilledDay.is_rest_day ? 'Rest day' : `${totalDayEx} exercise${totalDayEx !== 1 ? 's' : ''}`}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                        {drilledDay.is_rest_day ? (
                            <div className="flex flex-col items-center gap-2 py-8">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#1A2D48] flex items-center justify-center text-slate-400 dark:text-[#94A3B8] text-lg">💤</div>
                                <div className="text-[11px] italic text-slate-400 dark:text-[#94A3B8]">Rest day — no exercises</div>
                            </div>
                        ) : dayOrder.map((sec: string) => {
                            const exs = exGroups[sec] || [];
                            if (exs.length === 0) return null;
                            const meta = persistedMeta?.[sec];
                            const label = meta?.label || DEFAULT_SECTION_LABELS[sec] || sec;
                            const color = meta?.color || DEFAULT_SECTION_COLORS[sec] || '#6366f1';
                            return (
                                <div key={sec}>
                                    <div
                                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md mb-1.5"
                                        style={{ backgroundColor: `${color}1A`, borderLeft: `2px solid ${color}` }}
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                                        <span className="ml-auto text-[9px] font-medium" style={{ color }}>{exs.length}</span>
                                    </div>
                                    <div className="space-y-1.5 pl-1.5">
                                        {exs.map((ex: any, idx: number) => {
                                            // Resolve UUID/internal id → human name via the memoized map. Fall back gracefully.
                                            const name = exerciseMap[ex.exercise_id] || ex.exercise_name || ex.name || ex.exercise_id || 'Exercise';
                                            // Build a compact metadata line: "3 × 8 @ 70% · RPE 7 · 60s rest"
                                            const meta: string[] = [];
                                            if (ex.sets || ex.reps) meta.push(`${ex.sets || '?'} × ${ex.reps || '?'}`);
                                            if (ex.weight) meta.push(ex.weight);
                                            if (ex.intensity) meta.push(ex.intensity);
                                            if (ex.rpe) meta.push(`RPE ${ex.rpe}`);
                                            if (ex.rir) meta.push(`RIR ${ex.rir}`);
                                            if (ex.tempo) meta.push(`tempo ${ex.tempo}`);
                                            const rest = (ex.rest_min || 0) * 60 + (ex.rest_sec || 0);
                                            if (rest > 0) meta.push(`${rest}s rest`);
                                            return (
                                                <div key={ex.id || `${sec}_${idx}`} className="pl-2 border-l-2 border-slate-100 dark:border-[#1A2D48]">
                                                    <div className="text-[11px] font-medium text-slate-800 dark:text-[#E2E8F0] leading-snug truncate" title={name}>
                                                        {name}
                                                    </div>
                                                    {meta.length > 0 && (
                                                        <div className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-0.5 leading-snug">
                                                            {meta.join(' · ')}
                                                        </div>
                                                    )}
                                                    {ex.notes && (
                                                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] italic mt-0.5 truncate" title={ex.notes}>{ex.notes}</div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // ── Program-level view ────────────────────────────────────────────
        // Only the original creator can edit/delete a shared program (matches RLS).
        // Hide destructive actions when viewing a colleague's shared program so we
        // never present an action that would silently fail.
        const canModify = !p.user_id || !authUser?.id || p.user_id === authUser.id;
        return (
            <div className="relative bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                {canModify && (
                    <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-slate-300 dark:text-[#475569] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-all z-10"
                        title="Delete program"
                    >
                        <Trash2Icon size={12} />
                    </button>
                )}

                <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-[#1A2D48] shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] pr-7 leading-tight">{p.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {p.training_phase && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                                {p.training_phase}
                            </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]">
                            {activeTab === 'assigned'
                                ? `${selectedProgramAssignments.length} assignment${selectedProgramAssignments.length !== 1 ? 's' : ''}`
                                : 'Template'}
                        </span>
                    </div>
                    {p.overview && (
                        <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-2 leading-relaxed line-clamp-2">{p.overview}</p>
                    )}
                    <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-2">
                        {weeksCount > 0 ? `${weeksCount} week${weeksCount !== 1 ? 's' : ''} · ` : ''}{days.length} day{days.length !== 1 ? 's' : ''}
                        {p.start_date ? ` · starts ${new Date(p.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}` : ''}
                    </div>
                </div>

                {/* Week tabs + day list (filtered to the active week) */}
                <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                    {isLoading ? (
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] italic text-center py-4">Loading days…</div>
                    ) : days.length === 0 ? (
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] italic text-center py-4">No days configured</div>
                    ) : (
                        <>
                            {/* Week tab strip — solid indigo highlight on active week so it reads
                                as a clear toggle. Tabs distribute evenly across the descriptor width. */}
                            {availableWeeks.length > 1 && (
                                <div className="flex items-center gap-1 mb-2.5 bg-slate-100 dark:bg-[#0F1C30] p-1 rounded-lg border border-slate-200 dark:border-[#243A58] w-full overflow-x-auto">
                                    {availableWeeks.map(w => {
                                        const isActive = w === activeWeek;
                                        return (
                                            <button
                                                key={w}
                                                onClick={() => setSelectedWeek(w)}
                                                className={`flex-1 min-w-0 px-2 py-1.5 rounded-md text-[10px] font-bold text-center transition-all ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'text-slate-500 dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#1A2D48] hover:text-indigo-700 dark:hover:text-indigo-300'
                                                }`}
                                            >
                                                Wk{w}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#CBD5E1] mb-2">
                                {availableWeeks.length > 1 ? `Wk${activeWeek} · Days` : 'Days'}
                            </div>
                            <div className="space-y-1.5">
                                {daysInActiveWeek.length === 0 ? (
                                    <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] italic text-center py-2">No days in this week</div>
                                ) : daysInActiveWeek.map((d: any) => {
                                    const isRest = d.is_rest_day;
                                    return (
                                        <button
                                            key={d.id}
                                            onClick={() => setSelectedDayId(d.id)}
                                            className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#1A2D48] hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition-all text-left group"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="text-[11px] font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">
                                                        Day {d.day_number || 1}{d.name ? ` — ${d.name}` : ''}
                                                    </div>
                                                    {isRest && (
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-[#1A2D48] text-slate-600 dark:text-[#94A3B8]">Rest</span>
                                                    )}
                                                </div>
                                                <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                                                    {isRest ? 'Recovery / no exercises' : `${(d.exercises || []).length} exercise${(d.exercises || []).length !== 1 ? 's' : ''}`}
                                                </div>
                                            </div>
                                            <ChevronRightIcon size={12} className="shrink-0 text-slate-300 dark:text-[#475569] group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="border-t border-slate-100 dark:border-[#1A2D48] p-2.5 flex items-center gap-1.5 shrink-0 bg-slate-50/40 dark:bg-[#0F1C30]/40">
                    <button
                        onClick={() => setAssignTarget({ id: p.id, name: p.name, training_phase: p.training_phase })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
                    >
                        <CalendarPlusIcon size={12} /> Assign
                    </button>
                    <button
                        onClick={() => setViewModalProgram(p)}
                        className="px-2.5 py-2 bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#364E6E] text-slate-600 dark:text-[#CBD5E1] rounded-lg hover:border-sky-400 dark:hover:border-sky-500/60 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/15 transition-all"
                        title="Open full view"
                    >
                        <EyeIcon size={13} />
                    </button>
                    {canModify && (
                        <button
                            onClick={() => openEdit(p)}
                            className="px-2.5 py-2 bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#364E6E] text-slate-600 dark:text-[#CBD5E1] rounded-lg hover:border-amber-400 dark:hover:border-amber-500/60 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-all"
                            title="Edit"
                        >
                            <PencilIcon size={13} />
                        </button>
                    )}
                    <button
                        onClick={() => setShareTarget({ type: 'program', id: p.id, name: p.name })}
                        className="px-2.5 py-2 bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#364E6E] text-slate-600 dark:text-[#CBD5E1] rounded-lg hover:border-violet-400 dark:hover:border-violet-500/60 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/15 transition-all"
                        title="Share"
                    >
                        <Share2Icon size={13} />
                    </button>
                </div>
            </div>
        );
    }, [selectedProgram, selectedFullProgram, selectedDayId, selectedWeek, activeTab, selectedProgramAssignments, exerciseMap]);

    useLayoutEffect(() => {
        setSidebarExtra(sidebarExtraNode);
        return () => setSidebarExtra(null);
    }, [sidebarExtraNode, setSidebarExtra]);

    // Reset drill-down + week pick when a new program is selected
    useEffect(() => {
        setSelectedDayId(null);
        setSelectedWeek(1);
    }, [selectedProgram?.id]);

    // When the builder is open, render IT instead of the list so the sidebar nav stays visible
    // and we don't end up with a full-screen overlay that hides everything else.
    if (isProgramBuilderOpen) {
        return (
            <ProgramBuilderModal
                isOpen={isProgramBuilderOpen}
                onClose={() => { setIsProgramBuilderOpen(false); setEditingProgramId(null); setEditingProgramBasic(null); }}
                editingProgram={editingFullProgram ?? editingProgramBasic}
            />
        );
    }

    return (
        <>
            <div className="flex-1 min-h-0 flex flex-col gap-4">

                {/* "Did you mean…" suggestion strip (search lives in the persistent shell header above) */}
                {programSearch.hasFuzzyResults && programSearch.suggestions.length > 0 && (
                    <DidYouMeanBanner suggestions={programSearch.suggestions} onSelect={name => setSearch(name)} />
                )}

                {/* Sub-tabs row — Tabs (left) · Team/Individual pill (centered, Assigned only) · Filter button (right) */}
                <div className="bg-white dark:bg-[#132338] px-5 pt-2 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div className="flex items-end gap-3 border-b border-slate-100 dark:border-[#1A2D48] -mx-5 px-5">
                        <div className="flex gap-0 shrink-0">
                            {[
                                { key: 'templates', label: 'Templates', count: programs.length },
                                { key: 'assigned',  label: 'Assigned',  count: assignedProgramIds.size },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                        activeTab === tab.key
                                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 rounded-full text-[9px] font-bold">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex-1 flex justify-center mb-1.5">
                            {activeTab === 'assigned' && (
                                <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#0F1C30] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                    {(['all', 'Team', 'Individual'] as const).map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setAssignedTargetFilter(opt)}
                                            className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                                                assignedTargetFilter === opt
                                                    ? 'bg-white dark:bg-[#1A2D48] text-slate-900 dark:text-[#E2E8F0] shadow-sm'
                                                    : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                                            }`}
                                        >
                                            {opt === 'all' ? 'All' : opt + 's'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Ownership scope — only renders when org has more than 1 user */}
                        <div className="shrink-0 mb-1.5">
                            <OwnershipFilter value={ownershipScope} onChange={setOwnershipScope} />
                        </div>
                        {/* Filter button — popover anchored here */}
                        <div className="shrink-0 mb-1.5 relative" ref={filterPopoverRef}>
                            <button
                                onClick={() => setFilterPopoverOpen(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                                    filterPopoverOpen || activeFilterCount > 0
                                        ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-[#364E6E]'
                                }`}
                            >
                                <SlidersHorizontalIcon size={12} />
                                Filter
                                {activeFilterCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold leading-none">{activeFilterCount}</span>
                                )}
                            </button>

                            {filterPopoverOpen && (
                                <div className="absolute top-full right-0 mt-1.5 w-80 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl z-30 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">Filters</span>
                                        <div className="flex items-center gap-2">
                                            {activeFilterCount > 0 && (
                                                <button onClick={clearAllFilters} className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Clear all</button>
                                            )}
                                            <button onClick={() => setFilterPopoverOpen(false)} aria-label="Close" className="p-1 rounded text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48]">
                                                <XIcon size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <CustomSelect value={phaseFilter} onChange={(e: any) => setPhaseFilter(e.target.value)} variant="filter" size="xs" prefixLabel="Phase">
                                            <option value="All">All phases</option>
                                            {availablePhases.map(p => <option key={p} value={p}>{p}</option>)}
                                        </CustomSelect>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#CBD5E1] block mb-1">Duration</label>
                                        <div className="grid grid-cols-4 gap-1">
                                            {(['All', 'Short', 'Medium', 'Long'] as const).map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setDurationFilter(opt)}
                                                    className={`px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                                        durationFilter === opt
                                                            ? 'bg-indigo-600 text-white shadow-sm'
                                                            : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48]'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="text-[9px] text-slate-400 dark:text-[#94A3B8] mt-1.5 leading-snug">Short ≤ 2 wk · Medium 3–6 wk · Long ≥ 7 wk</div>
                                    </div>
                                    {activeTab === 'assigned' && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#CBD5E1] block mb-1">Status</label>
                                                <div className="grid grid-cols-4 gap-1">
                                                    {(['All', 'Active', 'Upcoming', 'Past'] as const).map(opt => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => setStatusFilter(opt)}
                                                            className={`px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                                                statusFilter === opt
                                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                                    : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48]'
                                                            }`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <CustomSelect value={targetFilter} onChange={(e: any) => setTargetFilter(e.target.value)} variant="filter" size="xs" prefixLabel="Target">
                                                    <option value="All">Any team or athlete</option>
                                                    {targetOptions.map(t => <option key={t.id} value={t.id}>{t.type === 'Team' ? '🟦 ' : '👤 '}{t.label}</option>)}
                                                </CustomSelect>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Persistent list container — fills available height, scrolls internally.
                    Empty / loading states render INSIDE the container so the shell stays present. */}
                <div className="bg-white dark:bg-[#132338] rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-xs text-slate-400 dark:text-[#CBD5E1]">Loading programs...</span>
                    </div>
                ) : filteredPrograms.length === 0 ? (
                    <div className="py-16 px-5 flex flex-col items-center text-slate-300 dark:text-[#475569] gap-2">
                        <LayersIcon size={32} className="opacity-40" />
                        <p className="text-sm text-slate-500 dark:text-[#CBD5E1]">
                            {search
                                ? `No programs matching "${search}"`
                                : activeTab === 'assigned'
                                    ? 'No programs assigned yet'
                                    : 'No programs yet'}
                        </p>
                        {!search && activeTab === 'templates' && (
                            <button onClick={() => setIsProgramBuilderOpen(true)} className="mt-3 px-4 py-2 bg-indigo-50 dark:bg-[#1A2D48] hover:bg-indigo-100 dark:hover:bg-indigo-500/15 text-indigo-700 dark:text-white rounded-lg text-xs font-semibold transition-all">
                                <PlusIcon size={12} className="inline mr-1" /> Create Program
                            </button>
                        )}
                        {!search && activeTab === 'assigned' && (
                            <p className="text-xs text-slate-400 dark:text-[#94A3B8]">Assign a template from the Templates tab to see it here</p>
                        )}
                    </div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-3">
                        {filteredPrograms.map(p => {
                            const isSelected = selectedProgram?.id === p.id;
                            return (
                            <div
                                key={p.id}
                                onClick={() => setSelectedProgram(p)}
                                className={`bg-white dark:bg-[#132338] rounded-xl border p-5 flex flex-col hover:shadow-md transition-all relative overflow-hidden group cursor-pointer ${
                                    isSelected
                                        ? 'border-indigo-400 dark:border-indigo-500/60 ring-2 ring-indigo-500/15'
                                        : 'border-slate-200 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-[#364E6E]'
                                }`}
                            >
                                <h3 className={`text-sm font-semibold truncate transition-colors mb-1.5 ${
                                    isSelected
                                        ? 'text-indigo-700 dark:text-indigo-400'
                                        : 'text-slate-900 dark:text-[#E2E8F0] group-hover:text-indigo-700 dark:group-hover:text-indigo-400'
                                }`}>{p.name}</h3>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {p.training_phase && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                                            {p.training_phase}
                                        </span>
                                    )}
                                    {(p.tags ?? []).slice(0, 2).map(t => (
                                        <span key={t} className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-600 dark:text-[#CBD5E1] rounded text-[9px] font-medium">{t}</span>
                                    ))}
                                    <CreatorBadge
                                        creatorUserId={p.user_id}
                                        lastModifiedByUserId={(p as any).last_modified_by}
                                        visibility={(p as any).visibility}
                                    />
                                </div>
                                {p.overview && (
                                    <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] leading-relaxed mt-2 line-clamp-2">{p.overview}</p>
                                )}
                            </div>
                            );
                        })}
                    </div>
                ) : (
                    <table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-[#0F1C30] z-10">
                                <tr className="border-b border-slate-200 dark:border-[#243A58]">
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Program</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Phase</th>
                                    <th className="px-3 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                {filteredPrograms.map(p => {
                                    const isSelected = selectedProgram?.id === p.id;
                                    return (
                                    <tr
                                        key={p.id}
                                        className={`group transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-indigo-50/60 dark:bg-indigo-500/10'
                                                : 'hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                                        }`}
                                        onClick={() => setSelectedProgram(p)}
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className={`font-medium text-sm transition-colors ${
                                                isSelected
                                                    ? 'text-indigo-700 dark:text-indigo-400'
                                                    : 'text-slate-800 dark:text-[#E2E8F0] group-hover:text-indigo-700 dark:group-hover:text-indigo-400'
                                            }`}>{p.name}</div>
                                            {p.overview && <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5 truncate max-w-xs">{p.overview}</div>}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {p.training_phase ? (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                                                    {p.training_phase}
                                                </span>
                                            ) : <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>}
                                        </td>
                                        <td className="px-3 py-3.5 text-right">
                                            <ChevronRightIcon size={14} className="inline text-slate-300 dark:text-[#475569] group-hover:text-slate-500 dark:group-hover:text-[#CBD5E1] group-hover:translate-x-0.5 transition-all" />
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                )}
                    </div>{/* end scroll area */}
                </div>{/* end persistent list container */}

            </div>{/* end main content */}

            {/* Builder renders inline (see early-return above) when isProgramBuilderOpen so the sidebar stays visible */}
            <ProgramViewModal
                program={viewModalProgram}
                isOpen={!!viewModalProgram}
                onClose={() => setViewModalProgram(null)}
            />
            <ConfirmDeleteModal
                isOpen={!!confirmDeleteId}
                title="Delete Program"
                message="This will permanently delete the program, all days, and all exercises."
                onConfirm={() => handleDelete(confirmDeleteId)}
                onCancel={() => setConfirmDeleteId(null)}
            />
            {shareTarget && (
                <ShareWorkoutPopover
                    workoutType={shareTarget.type}
                    workoutId={shareTarget.id}
                    workoutName={shareTarget.name}
                    onClose={() => setShareTarget(null)}
                />
            )}
            <ProgramAssignModal
                program={assignTarget}
                isOpen={!!assignTarget}
                onClose={() => setAssignTarget(null)}
            />
        </>
    );
};

export default WorkoutProgramsPage;
