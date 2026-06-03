// @ts-nocheck
import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { useWorkoutsLayout } from '../context/WorkoutsLayoutContext';
import { DatabaseService } from '../services/databaseService';
import { ShareWorkoutPopover } from '../components/workouts/ShareWorkoutPopover';
import { TemplateViewModal } from '../components/workouts/TemplateViewModal';
import { OwnershipFilter, matchesOwnershipScope, type OwnershipScope } from '../components/tier/OwnershipFilter';
import { CreatorBadge } from '../components/tier/CreatorBadge';
import { useAuth } from '../context/AuthContext';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { fuzzySearch } from '../utils/fuzzySearch';
import DidYouMeanBanner from '../components/library/DidYouMeanBanner';
import {
    PackageIcon, PlusIcon, PencilIcon, Trash2Icon,
    CalendarPlusIcon, Share2Icon, EyeIcon,
    ArrowLeftIcon, ChevronRightIcon,
    SlidersHorizontal as SlidersHorizontalIcon, X as XIcon,
} from 'lucide-react';

function timeAgo(iso: string) {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1) return 'Just now';
    if (h < 24) return `${h}h ago`;
    if (d < 30) return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const LOAD_COLORS: Record<string, string> = {
    Low:    'bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    Medium: 'bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400',
    High:   'bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400',
};

function loadBadge(load: string) {
    return LOAD_COLORS[load] ?? 'bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]';
}

// Descriptor section defaults — match TemplateViewModal so colours stay consistent across views
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
// Canonical training phases — same list used everywhere so filtering matches Create Packet options.
const TRAINING_PHASES = ['Strength', 'Power', 'Hypertrophy', 'Speed', 'Conditioning', 'Recovery', 'Technical', 'GPP'];

function formatShortDate(iso: string) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

export const WorkoutSessionsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const assignCtx = (location.state as any)?.assignToPlanSession || null;
    const {
        workoutTemplates, setWorkoutTemplates, isLoading, showToast,
        scheduledSessions, teams, resolveTargetName,
    } = useAppState();
    const { user: authUser } = useAuth();
    const [ownershipScope, setOwnershipScope] = useState<OwnershipScope>('all');
    // search + view live in the Workouts shell layout (persistent across tab switches).
    const { search, setSearch, view, registerCreate, setOverviewRows, setSidebarExtra } = useWorkoutsLayout();

    // Tabs mirror Programs: Templates = all saved; Assigned = templates with at least one scheduled session
    const [activeTab, setActiveTab] = useState<'templates' | 'assigned'>('templates');
    // Within the Assigned tab — narrow by target type
    const [assignedTargetFilter, setAssignedTargetFilter] = useState<'all' | 'Team' | 'Individual'>('all');
    // Popover filters — Phase + Load (both tabs), Time window + Target (Assigned only).
    const [phaseFilter, setPhaseFilter] = useState<string>('All');
    const [loadFilter, setLoadFilter] = useState<string>('All');
    const [timeWindowFilter, setTimeWindowFilter] = useState<'All' | 'Upcoming' | 'ThisWeek' | 'Past'>('All');
    const [targetFilter, setTargetFilter] = useState<string>('All');
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
    const filterPopoverRef = useRef<HTMLDivElement | null>(null);
    // Selected packet drives the right-rail descriptor (replaces the old "Most Assigned" tiles).
    // Click a row → it populates here, descriptor renders breakdown. Click another row → swap.
    const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

    // When navigated here from Dashboard → "View Workout" on a packet-linked
    // calendar session, land on the Assigned tab and pre-select the source packet.
    // Mirrors the same UX as Programs page so View Workout behaves consistently
    // for both packet- and program-linked sessions.
    React.useEffect(() => {
        const focusTemplateId = (location.state as any)?.focusTemplateId;
        if (!focusTemplateId || !workoutTemplates || workoutTemplates.length === 0) return;
        const match = workoutTemplates.find((t: any) => t.id === focusTemplateId);
        if (match) {
            setActiveTab('assigned');
            setSelectedTemplate(match);
            window.history.replaceState({}, '');
        }
    }, [workoutTemplates, location.state]);

    const [shareTarget, setShareTarget] = useState<{ type: 'template'; id: string; name: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
    // "View Full" modal — opens from descriptor footer for the deep-dive read-only view
    // (sections + exercises with expandable descriptions / videos / safety cues).
    const [viewModalTemplate, setViewModalTemplate] = useState<any | null>(null);

    // Templates that are referenced by at least one scheduled session.
    // When the assigned-tab filter is active, restrict to sessions whose target_type matches.
    const assignedTemplateIds = useMemo(() => {
        const ids = new Set<string>();
        for (const s of scheduledSessions || []) {
            const tid = (s as any).workout_template_id || (s as any).workoutTemplateId;
            if (!tid) continue;
            const ttype = (s as any).target_type || (s as any).targetType;
            if (assignedTargetFilter !== 'all' && ttype !== assignedTargetFilter) continue;
            ids.add(tid);
        }
        return ids;
    }, [scheduledSessions, assignedTargetFilter]);

    const { results: searchedTemplates, hasFuzzyResults, suggestions } = useMemo(
        () => fuzzySearch(workoutTemplates, search, (t) => [t.name, t.trainingPhase || '', t.load || ''].join(' '), (t) => t.name),
        [workoutTemplates, search]
    );
    // Per-template assignment summary — drives Time-window + Target filters on the Assigned tab.
    const templateAssignmentInfo = useMemo(() => {
        const map: Record<string, { dates: string[]; targetIds: Set<string> }> = {};
        for (const s of scheduledSessions || []) {
            const tid = (s as any).workout_template_id || (s as any).workoutTemplateId;
            if (!tid) continue;
            const target = (s as any).target_id || (s as any).targetId;
            if (!map[tid]) map[tid] = { dates: [], targetIds: new Set() };
            if (s.date) map[tid].dates.push(s.date);
            if (target) map[tid].targetIds.add(target);
        }
        return map;
    }, [scheduledSessions]);

    // Templates tab = all saved; Assigned tab = templates that have at least one scheduled session.
    // Phase + Load (both tabs), Time window + Target (Assigned only) apply on top of search.
    const filteredTemplates = useMemo(() => {
        let list = activeTab === 'assigned'
            ? searchedTemplates.filter(t => assignedTemplateIds.has(t.id))
            : searchedTemplates;
        if (phaseFilter !== 'All') list = list.filter(t => (t.trainingPhase || '') === phaseFilter);
        if (loadFilter !== 'All') list = list.filter(t => (t.load || '') === loadFilter);
        if (activeTab === 'assigned' && timeWindowFilter !== 'All') {
            const today = new Date().toISOString().slice(0, 10);
            const now = new Date();
            const dow = now.getDay();
            const monday = new Date(now);
            monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
            const mondayStr = monday.toISOString().slice(0, 10);
            const sundayStr = sunday.toISOString().slice(0, 10);
            list = list.filter(t => {
                const dates = templateAssignmentInfo[t.id]?.dates || [];
                if (timeWindowFilter === 'Upcoming') return dates.some(d => d > today);
                if (timeWindowFilter === 'Past') return dates.some(d => d < today);
                if (timeWindowFilter === 'ThisWeek') return dates.some(d => d >= mondayStr && d <= sundayStr);
                return true;
            });
        }
        if (activeTab === 'assigned' && targetFilter !== 'All') {
            list = list.filter(t => templateAssignmentInfo[t.id]?.targetIds.has(targetFilter));
        }
        // Ownership scope filter (All / Mine / Org). No-op on single-user orgs.
        if (ownershipScope !== 'all') {
            list = list.filter(t => matchesOwnershipScope(t as any, ownershipScope, authUser?.id));
        }
        return list;
    }, [searchedTemplates, activeTab, assignedTemplateIds, phaseFilter, loadFilter, timeWindowFilter, targetFilter, templateAssignmentInfo, ownershipScope, authUser?.id]);

    // Use the canonical list (same as Create Packet) so every phase a user could possibly
    // assign is filterable, even if no current packet uses it yet.
    const availablePhases = TRAINING_PHASES;

    // Target options for the dropdown — within the Team/Individual pill scope.
    const targetOptions = useMemo(() => {
        const seen: Record<string, { id: string; label: string; type: 'Team' | 'Individual' }> = {};
        (scheduledSessions || []).forEach((s: any) => {
            const tid = s.target_id || s.targetId;
            const ttype = (s.target_type || s.targetType || 'Individual') as 'Team' | 'Individual';
            if (!tid || seen[tid]) return;
            if (assignedTargetFilter !== 'all' && ttype !== assignedTargetFilter) return;
            const label = resolveTargetName ? (resolveTargetName(tid, ttype) || tid) : tid;
            const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label);
            if (looksLikeUuid) return;
            seen[tid] = { id: tid, label, type: ttype };
        });
        return Object.values(seen).sort((a, b) => a.label.localeCompare(b.label));
    }, [scheduledSessions, assignedTargetFilter, resolveTargetName]);

    const activeFilterCount =
        (phaseFilter !== 'All' ? 1 : 0) +
        (loadFilter !== 'All' ? 1 : 0) +
        (activeTab === 'assigned' && timeWindowFilter !== 'All' ? 1 : 0) +
        (activeTab === 'assigned' && targetFilter !== 'All' ? 1 : 0);

    const clearAllFilters = () => {
        setPhaseFilter('All');
        setLoadFilter('All');
        setTimeWindowFilter('All');
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

    // ── Sidebar stats ──────────────────────────────────────────────────────
    // Drafts = templates with zero scheduled sessions referencing them.
    // This Week = scheduled sessions within the current Monday→Sunday window.
    // Most Assigned To = top 3 targets (teams/individuals) by scheduled-session count.
    // Phase Distribution = grouping by `trainingPhase` enum on each template.
    const sidebarStats = useMemo(() => {
        const total = workoutTemplates.length;
        const allSessions = scheduledSessions || [];
        const usedTemplateIds = new Set(allSessions.map(s => s.workout_template_id || s.workoutTemplateId).filter(Boolean));
        const drafts = workoutTemplates.filter(t => !usedTemplateIds.has(t.id)).length;

        // This-week count
        const now = new Date();
        const dow = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        const thisWeek = allSessions.filter(s => {
            const d = new Date(s.date);
            return d >= monday && d <= sunday;
        }).length;

        // Most assigned (target name → count). Drops entries whose target_id no longer
        // resolves to a real athlete/team — otherwise stale sessions show raw UUIDs.
        const targetCounts: Record<string, { name: string; count: number; type: string }> = {};
        const looksLikeUuid = (v: string) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
        for (const s of allSessions) {
            const tid = s.target_id || s.targetId;
            const ttype = s.target_type || s.targetType || 'Individual';
            if (!tid) continue;
            const resolved = resolveTargetName ? resolveTargetName(tid, ttype) : tid;
            // Skip if name is empty, equal to the raw id, or still UUID-shaped (athlete/team deleted)
            if (!resolved || resolved === tid || looksLikeUuid(resolved)) continue;
            const key = `${ttype}:${tid}`;
            if (!targetCounts[key]) {
                targetCounts[key] = { name: resolved, count: 0, type: ttype };
            }
            targetCounts[key].count += 1;
        }
        const mostAssigned = Object.values(targetCounts).sort((a, b) => b.count - a.count).slice(0, 3);

        // Phase distribution
        const phaseCounts: Record<string, number> = {};
        for (const t of workoutTemplates) {
            const phase = t.trainingPhase || 'Unassigned';
            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
        }
        const phaseDistribution = Object.entries(phaseCounts).sort((a, b) => b[1] - a[1]);

        return { total, drafts, thisWeek, mostAssigned, phaseDistribution };
    }, [workoutTemplates, scheduledSessions, resolveTargetName]);

    // useCallback so the descriptor's useMemo doesn't see a fresh function on every render
    // (which would re-render the sidebarExtra, retrigger context, and feedback-loop forever).
    const handleEdit = useCallback((tpl: any) => {
        navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts/sessions' } });
    }, [navigate]);

    // Wire the shell's "Create Packet" button — opens the dedicated builder route.
    // assignCtx is forwarded so the builder can finish the deep-link flow from the Planner.
    // Always pass returnTo so the builder's back button takes the user back to THIS tab
    // (not the default `/workouts` which silently lands on Programs).
    useEffect(() => {
        return registerCreate(() => {
            navigate('/workouts/packets', {
                state: assignCtx
                    ? { assignToPlanSession: assignCtx, returnTo: '/workouts/sessions' }
                    : { returnTo: '/workouts/sessions' },
            });
        });
    }, [registerCreate, navigate, assignCtx]);

    // Push Overview rows to the shell's top-right tile.
    // Standardized to Total + Drafts (matches Programs / Sheets) — "This Week" was removed.
    // useLayoutEffect so the rows land in the first paint (not one frame late on initial nav).
    useLayoutEffect(() => {
        setOverviewRows([
            { label: 'Total Packets', value: sidebarStats.total },
            { label: 'Drafts', value: sidebarStats.drafts, hint: 'Saved but never scheduled' },
        ]);
        return () => setOverviewRows([]);
    }, [sidebarStats.total, sidebarStats.drafts, setOverviewRows]);

    // Assignments for the currently-selected packet — only meaningful in the Assigned tab,
    // but cheap enough to compute always.
    const selectedTemplateAssignments = useMemo(() => {
        if (!selectedTemplate) return [];
        return (scheduledSessions || [])
            .filter((s: any) => (s.workout_template_id || s.workoutTemplateId) === selectedTemplate.id)
            .map((s: any) => ({
                targetType: s.target_type || s.targetType,
                targetId:   s.target_id || s.targetId,
                targetName: resolveTargetName ? resolveTargetName(s.target_id || s.targetId, s.target_type || s.targetType) : null,
                date:       s.date,
                status:     s.status,
            }))
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    }, [selectedTemplate, scheduledSessions, resolveTargetName]);

    // Right-rail descriptor — replaces the old Most Assigned / Phase Distribution tiles.
    // Empty state when no packet is selected; full breakdown (sections + exercises + provenance)
    // when one is. All actions (Assign / Edit / Share / Delete) live in this descriptor now —
    // the row itself is just a click-to-select surface (Library-style master-detail).
    const sidebarExtraNode = useMemo(() => {
        if (!selectedTemplate) {
            return (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-4 py-8 text-center">
                        <PackageIcon size={28} className="mx-auto mb-2 text-slate-300 dark:text-[#475569]" />
                        <div className="text-xs font-semibold text-slate-500 dark:text-[#CBD5E1]">No packet selected</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1 leading-relaxed">Click a packet on the left to see its sections, exercises and metadata.</div>
                    </div>
                </div>
            );
        }

        const tpl = selectedTemplate;
        const sections = tpl.sections || {};
        const persistedMeta = tpl.sectionMeta as Record<string, { label: string; color: string }> | undefined;
        const persistedOrder = tpl.sectionOrder as string[] | undefined;
        const sectionOrder = (persistedOrder && persistedOrder.length > 0) ? persistedOrder : ['warmup', 'workout', 'cooldown'];
        const totalExercises = sectionOrder.reduce((sum, sec) => sum + ((sections[sec] || []).length || 0), 0);
        // Only the original creator can edit/delete a shared packet (matches RLS).
        const canModify = !(tpl as any).user_id || !authUser?.id || (tpl as any).user_id === authUser.id;

        return (
            <div className="relative bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Subtle delete — top-right corner, kept out of the primary action flow */}
                {canModify && (
                    <button
                        onClick={() => setConfirmDelete({ id: tpl.id, name: tpl.name })}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-slate-300 dark:text-[#475569] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-all z-10"
                        title="Delete packet"
                    >
                        <Trash2Icon size={12} />
                    </button>
                )}

                {/* Header — name, pills, created date, assignment summary if applicable */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-[#1A2D48] shrink-0">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] pr-7 leading-tight">{tpl.name}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        {tpl.trainingPhase && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                                {tpl.trainingPhase}
                            </span>
                        )}
                        {tpl.load && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${loadBadge(tpl.load)}`}>
                                {tpl.load}
                            </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]">
                            {activeTab === 'assigned'
                                ? `${selectedTemplateAssignments.length} assignment${selectedTemplateAssignments.length !== 1 ? 's' : ''}`
                                : 'Template'}
                        </span>
                    </div>
                    {(tpl.createdAt || tpl.created_at) && (
                        <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-2">
                            Created {formatShortDate(tpl.createdAt || tpl.created_at)} · {totalExercises} exercise{totalExercises !== 1 ? 's' : ''}
                        </div>
                    )}
                    {activeTab === 'assigned' && selectedTemplateAssignments.length > 0 && (
                        <div className="mt-2.5 space-y-1 max-h-24 overflow-y-auto">
                            {selectedTemplateAssignments.slice(0, 4).map((a, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                                    <span className="truncate">{a.targetName || 'Unknown target'}</span>
                                    <span className="shrink-0 text-slate-400 dark:text-[#94A3B8]">{formatShortDate(a.date)}</span>
                                </div>
                            ))}
                            {selectedTemplateAssignments.length > 4 && (
                                <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] italic">+{selectedTemplateAssignments.length - 4} more</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sections — each with its colored header + exercise list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                    {sectionOrder.map((sec: string) => {
                        const exercises = sections[sec] || [];
                        if (exercises.length === 0) return null;
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
                                    <span className="ml-auto text-[9px] font-medium" style={{ color }}>{exercises.length}</span>
                                </div>
                                <div className="space-y-1.5 pl-1.5">
                                    {exercises.map((ex: any, idx: number) => {
                                        const name = ex.exerciseName || ex.exercise_name || ex.name || 'Exercise';
                                        // Compact metadata line: "3 × 8 @ 70% · RPE 7 · 60s rest"
                                        const meta: string[] = [];
                                        if (ex.sets || ex.reps) meta.push(`${ex.sets || '?'} × ${ex.reps || '?'}`);
                                        if (ex.weight) meta.push(String(ex.weight));
                                        if (ex.intensity) meta.push(String(ex.intensity));
                                        if (ex.rpe) meta.push(`RPE ${ex.rpe}`);
                                        if (ex.rir) meta.push(`RIR ${ex.rir}`);
                                        if (ex.tempo) meta.push(`tempo ${ex.tempo}`);
                                        const restSec = (Number(ex.rest_min) || 0) * 60 + (Number(ex.rest_sec) || 0);
                                        if (restSec > 0) meta.push(`${restSec}s rest`);
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
                    {totalExercises === 0 && (
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] italic text-center py-6">
                            No exercises in this packet yet
                        </div>
                    )}
                </div>

                {/* Footer — primary Assign + secondary View/Edit/Share */}
                <div className="border-t border-slate-100 dark:border-[#1A2D48] p-2.5 flex items-center gap-1.5 shrink-0 bg-slate-50/40 dark:bg-[#0F1C30]/40">
                    <button
                        onClick={() => {
                            if (assignCtx) {
                                navigate('/workouts/packets', { state: { editTemplate: tpl, assignToPlanSession: assignCtx } });
                            } else {
                                navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts/sessions' } });
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
                    >
                        <CalendarPlusIcon size={12} /> {assignCtx ? 'Assign to Plan' : 'Assign'}
                    </button>
                    <button
                        onClick={() => setViewModalTemplate(tpl)}
                        className="px-2.5 py-2 bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#364E6E] text-slate-600 dark:text-[#CBD5E1] rounded-lg hover:border-sky-400 dark:hover:border-sky-500/60 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/15 transition-all"
                        title="Open full view (expandable exercises)"
                    >
                        <EyeIcon size={13} />
                    </button>
                    <button
                        onClick={() => handleEdit(tpl)}
                        className="px-2.5 py-2 bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#364E6E] text-slate-600 dark:text-[#CBD5E1] rounded-lg hover:border-amber-400 dark:hover:border-amber-500/60 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-all"
                        title="Edit"
                    >
                        <PencilIcon size={13} />
                    </button>
                    <button
                        onClick={() => setShareTarget({ type: 'template', id: tpl.id, name: tpl.name })}
                        className="px-2.5 py-2 bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#364E6E] text-slate-600 dark:text-[#CBD5E1] rounded-lg hover:border-violet-400 dark:hover:border-violet-500/60 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/15 transition-all"
                        title="Share"
                    >
                        <Share2Icon size={13} />
                    </button>
                </div>
            </div>
        );
    }, [selectedTemplate, activeTab, selectedTemplateAssignments, navigate, assignCtx, handleEdit]);

    useLayoutEffect(() => {
        setSidebarExtra(sidebarExtraNode);
        return () => setSidebarExtra(null);
    }, [sidebarExtraNode, setSidebarExtra]);

    const handleDeleteConfirmed = async () => {
        if (!confirmDelete) return;
        const { id, name } = confirmDelete;
        setWorkoutTemplates(prev => prev.filter(t => t.id !== id));
        setConfirmDelete(null);
        try {
            await DatabaseService.deleteWorkoutTemplate(id);
            showToast(`"${name}" deleted`, 'success');
        } catch (e) {
            showToast('Failed to delete — please try again', 'error');
        }
    };

    const exCount = (tpl) =>
        (tpl.sections?.warmup?.length || 0) +
        (tpl.sections?.workout?.length || 0) +
        (tpl.sections?.cooldown?.length || 0);

    return (
        <>
            <div className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Assign-mode banner */}
                {assignCtx && (
                    <div className="flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl">
                        <div className="flex items-center gap-2.5">
                            <CalendarPlusIcon size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <div>
                                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Assigning to plan session</p>
                                <p className="text-[10px] text-indigo-500 dark:text-indigo-400">Pick a saved packet below to assign, or build a new one</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/periodization')}
                            className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                            <ArrowLeftIcon size={12} /> Back to Planner
                        </button>
                    </div>
                )}

                {/* "Did you mean…" suggestion strip (search lives in the persistent shell header above) */}
                {hasFuzzyResults && suggestions.length > 0 && (
                    <DidYouMeanBanner suggestions={suggestions} onSelect={(name) => setSearch(name)} />
                )}

                {/* Sub-tabs row — Tabs (left) · Team/Individual pill (centered, Assigned only) · Filter button (right) */}
                <div className="bg-white dark:bg-[#132338] px-5 pt-2 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div className="flex items-end gap-3 border-b border-slate-100 dark:border-[#1A2D48] -mx-5 px-5">
                        <div className="flex gap-0 shrink-0">
                            {[
                                { key: 'templates', label: 'Templates', count: workoutTemplates.length },
                                { key: 'assigned',  label: 'Assigned',  count: assignedTemplateIds.size },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                        activeTab === tab.key
                                            ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                                            : 'border-transparent text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 rounded-full text-[9px] font-bold">
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
                        <div className="shrink-0 mb-1.5 relative" ref={filterPopoverRef}>
                            <button
                                onClick={() => setFilterPopoverOpen(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                                    filterPopoverOpen || activeFilterCount > 0
                                        ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-[#364E6E]'
                                }`}
                            >
                                <SlidersHorizontalIcon size={12} />
                                Filter
                                {activeFilterCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold leading-none">{activeFilterCount}</span>
                                )}
                            </button>

                            {filterPopoverOpen && (
                                <div className="absolute top-full right-0 mt-1.5 w-80 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl z-30 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">Filters</span>
                                        <div className="flex items-center gap-2">
                                            {activeFilterCount > 0 && (
                                                <button onClick={clearAllFilters} className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Clear all</button>
                                            )}
                                            <button onClick={() => setFilterPopoverOpen(false)} className="p-1 rounded text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48]">
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
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#CBD5E1] block mb-1">Load</label>
                                        <div className="grid grid-cols-4 gap-1">
                                            {(['All', 'Low', 'Medium', 'High'] as const).map(opt => (
                                                <button
                                                    key={opt}
                                                    onClick={() => setLoadFilter(opt)}
                                                    className={`px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                                        loadFilter === opt
                                                            ? 'bg-emerald-600 text-white shadow-sm'
                                                            : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48]'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    {activeTab === 'assigned' && (
                                        <>
                                            <div>
                                                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#CBD5E1] block mb-1">Time window</label>
                                                <div className="grid grid-cols-4 gap-1">
                                                    {([
                                                        { v: 'All', label: 'All' },
                                                        { v: 'Upcoming', label: 'Upcoming' },
                                                        { v: 'ThisWeek', label: 'This wk' },
                                                        { v: 'Past', label: 'Past' },
                                                    ] as const).map(opt => (
                                                        <button
                                                            key={opt.v}
                                                            onClick={() => setTimeWindowFilter(opt.v as any)}
                                                            className={`px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                                                timeWindowFilter === opt.v
                                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                                    : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48]'
                                                            }`}
                                                        >
                                                            {opt.label}
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


                {/* Persistent list container — fills available height, scrolls internally (Library pattern).
                    Empty / loading states render INSIDE the white container so the shell never collapses. */}
                <div className="bg-white dark:bg-[#132338] rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                {isLoading && workoutTemplates.length === 0 ? (
                    <div className="py-16 px-5 flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-emerald-200 dark:border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
                        <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading packets...</span>
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="py-20 px-5 text-center">
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <PackageIcon size={24} className="text-emerald-400 dark:text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1]">
                            {search ? `No packets matching "${search}"` : 'No packets saved yet'}
                        </p>
                        {!search && (
                            <>
                                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-1 mb-4">Build a workout and save it as a template to see it here</p>
                                <button
                                    onClick={() => navigate('/workouts/packets', assignCtx ? { state: { assignToPlanSession: assignCtx } } : undefined)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all"
                                >
                                    <PlusIcon size={13} /> Build Your First Packet
                                </button>
                            </>
                        )}
                    </div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
                        {filteredTemplates.map(tpl => {
                            const ex = exCount(tpl);
                            const isSelected = selectedTemplate?.id === tpl.id;
                            return (
                                <div
                                    key={tpl.id}
                                    className={`bg-white dark:bg-[#132338] rounded-xl border p-4 hover:shadow-md transition-all group relative overflow-hidden cursor-pointer ${
                                        isSelected
                                            ? 'border-emerald-400 dark:border-emerald-500/60 ring-2 ring-emerald-500/15'
                                            : 'border-slate-200 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-[#364E6E]'
                                    }`}
                                    onClick={() => setSelectedTemplate(tpl)}
                                >
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate mb-2">
                                        {tpl.name}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {tpl.trainingPhase && (
                                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 rounded text-[9px] font-semibold">
                                                {tpl.trainingPhase}
                                            </span>
                                        )}
                                        {tpl.load && (
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${loadBadge(tpl.load)}`}>
                                                {tpl.load}
                                            </span>
                                        )}
                                        <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{ex} exercise{ex !== 1 ? 's' : ''}</span>
                                        <CreatorBadge
                                            creatorUserId={(tpl as any).user_id}
                                            lastModifiedByUserId={(tpl as any).last_modified_by}
                                            visibility={(tpl as any).visibility}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List view */
                    <table className="w-full text-left">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-[#0F1C30] z-10">
                                <tr className="border-b border-slate-200 dark:border-[#243A58]">
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Packet Name</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Phase</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Load</th>
                                    <th className="px-5 py-3 w-8" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                {filteredTemplates.map(tpl => {
                                    const isSelected = selectedTemplate?.id === tpl.id;
                                    return (
                                        <tr
                                            key={tpl.id}
                                            className={`group transition-colors cursor-pointer ${
                                                isSelected
                                                    ? 'bg-emerald-50/60 dark:bg-emerald-500/10'
                                                    : 'hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                                            }`}
                                            onClick={() => setSelectedTemplate(tpl)}
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className={`font-medium text-sm transition-colors ${
                                                    isSelected
                                                        ? 'text-emerald-700 dark:text-emerald-400'
                                                        : 'text-slate-800 dark:text-[#E2E8F0] group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                                                }`}>
                                                    {tpl.name}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {tpl.trainingPhase ? (
                                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 rounded text-[9px] font-semibold">
                                                        {tpl.trainingPhase}
                                                    </span>
                                                ) : <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {tpl.load ? (
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${loadBadge(tpl.load)}`}>
                                                        {tpl.load}
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
            </div>

            {/* Modals */}
            <TemplateViewModal
                template={viewModalTemplate}
                isOpen={!!viewModalTemplate}
                onClose={() => setViewModalTemplate(null)}
                onEdit={handleEdit}
                onDelete={(id) => setConfirmDelete({ id, name: viewModalTemplate?.name ?? '' })}
            />

            {shareTarget && (
                <ShareWorkoutPopover
                    workoutType={shareTarget.type}
                    workoutId={shareTarget.id}
                    workoutName={shareTarget.name}
                    onClose={() => setShareTarget(null)}
                />
            )}

            <ConfirmDeleteModal
                isOpen={!!confirmDelete}
                title="Delete Packet"
                message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setConfirmDelete(null)}
            />
        </>
    );
};

export default WorkoutSessionsPage;
