// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { DatabaseService } from '../services/databaseService';
import { TemplateViewModal } from '../components/workouts/TemplateViewModal';
import { ShareWorkoutPopover } from '../components/workouts/ShareWorkoutPopover';
import { WorkoutsTabsBar } from './WorkoutsPage';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { fuzzySearch } from '../utils/fuzzySearch';
import DidYouMeanBanner from '../components/library/DidYouMeanBanner';
import {
    PackageIcon, SearchIcon, PlusIcon, PencilIcon, Trash2Icon,
    EyeIcon, GridIcon, ListIcon, CalendarPlusIcon, Share2Icon,
    ClipboardListIcon, ArrowLeftIcon,
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

export const WorkoutSessionsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const assignCtx = (location.state as any)?.assignToPlanSession || null;
    const {
        workoutTemplates, setWorkoutTemplates, isLoading, showToast,
        scheduledSessions, teams, resolveTargetName,
    } = useAppState();

    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    // Tabs mirror Programs: Templates = all saved; Assigned = templates with at least one scheduled session
    const [activeTab, setActiveTab] = useState<'templates' | 'assigned'>('templates');
    const [viewingTemplate, setViewingTemplate] = useState(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [shareTarget, setShareTarget] = useState<{ type: 'template'; id: string; name: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    // Templates that are referenced by at least one scheduled session
    const assignedTemplateIds = useMemo(() => {
        const ids = new Set<string>();
        for (const s of scheduledSessions || []) {
            const tid = (s as any).workout_template_id || (s as any).workoutTemplateId;
            if (tid) ids.add(tid);
        }
        return ids;
    }, [scheduledSessions]);

    const { results: searchedTemplates, hasFuzzyResults, suggestions } = useMemo(
        () => fuzzySearch(workoutTemplates, search, (t) => [t.name, t.trainingPhase || '', t.load || ''].join(' '), (t) => t.name),
        [workoutTemplates, search]
    );
    // Templates tab = all saved; Assigned tab = templates that have at least one scheduled session
    const filteredTemplates = useMemo(
        () => activeTab === 'assigned'
            ? searchedTemplates.filter(t => assignedTemplateIds.has(t.id))
            : searchedTemplates,
        [searchedTemplates, activeTab, assignedTemplateIds]
    );

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

        // Most assigned (target name → count)
        const targetCounts: Record<string, { name: string; count: number; type: string }> = {};
        for (const s of allSessions) {
            const tid = s.target_id || s.targetId;
            const ttype = s.target_type || s.targetType || 'Individual';
            if (!tid) continue;
            const key = `${ttype}:${tid}`;
            if (!targetCounts[key]) {
                const name = resolveTargetName ? resolveTargetName(tid, ttype) : tid;
                targetCounts[key] = { name, count: 0, type: ttype };
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

    const handleEdit = (tpl) => {
        navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts/sessions' } });
    };

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
            <div className="flex gap-5 animate-in fade-in duration-300">
              <div className="flex-1 min-w-0 space-y-4">
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

                {/* Header */}
                <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                                <PackageIcon size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Packets</h2>
                                <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-0.5">Saved workout packets — assign & schedule to athletes</p>
                            </div>
                        </div>
                        {/* Workouts top-level tabs — embedded in the header to share one bar with the title */}
                        <WorkoutsTabsBar />

                        {/* Centered search */}
                        <div className="flex-1 flex justify-center px-4">
                            <div className="relative w-full max-w-md">
                                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#CBD5E1]" />
                                <input
                                    type="text"
                                    placeholder="Search packets..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-sm text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#64748B] outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-slate-100 dark:bg-[#1A2D48] rounded-lg p-0.5 gap-0.5">
                                <button
                                    onClick={() => setView('grid')}
                                    className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white dark:bg-[#243A58] text-slate-700 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#CBD5E1]'}`}
                                    title="Grid view"
                                >
                                    <GridIcon size={14} />
                                </button>
                                <button
                                    onClick={() => setView('list')}
                                    className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-[#243A58] text-slate-700 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#CBD5E1]'}`}
                                    title="List view"
                                >
                                    <ListIcon size={14} />
                                </button>
                            </div>
                            <button
                                onClick={() => navigate('/workouts/packets', assignCtx ? { state: { assignToPlanSession: assignCtx } } : undefined)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                            >
                                <PlusIcon size={14} /> New Packet
                            </button>
                        </div>
                    </div>

                    {hasFuzzyResults && suggestions.length > 0 && (
                        <div className="mt-3">
                            <DidYouMeanBanner suggestions={suggestions} onSelect={(name) => setSearch(name)} />
                        </div>
                    )}

                    {/* Templates / Assigned tabs */}
                    <div className="flex gap-0 mt-3 border-b border-slate-100 dark:border-[#1A2D48] -mx-5 px-5">
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
                </div>

                {/* Count bar */}
                <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">
                        {filteredTemplates.length} packet{filteredTemplates.length !== 1 ? 's' : ''}
                        {search ? ` matching "${search}"` : ' saved'}
                    </p>
                    {hasFuzzyResults && (
                        <p className="text-[10px] text-slate-300 dark:text-[#475569] italic">Showing closest matches</p>
                    )}
                </div>

                {/* Content */}
                {isLoading && workoutTemplates.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-emerald-200 dark:border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
                        <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading packets...</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full mt-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-4 space-y-3">
                                    <div className="h-4 w-28 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" />
                                    <div className="flex gap-2">
                                        <div className="h-4 w-16 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                                        <div className="h-4 w-12 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                                    </div>
                                    <div className="h-8 w-full bg-slate-50 dark:bg-[#0F1C30] rounded-lg animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="py-20 text-center">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {filteredTemplates.map(tpl => {
                            const ex = exCount(tpl);
                            return (
                                <div
                                    key={tpl.id}
                                    className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all group relative overflow-hidden cursor-pointer"
                                    onClick={() => { setViewingTemplate(tpl); setIsViewOpen(true); }}
                                >
                                    {/* Title row */}
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate flex-1 pr-2">
                                            {tpl.name}
                                        </h4>
                                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }}
                                                className="p-1 text-slate-300 dark:text-[#475569] hover:text-slate-600 dark:hover:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <PencilIcon size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: tpl.id, name: tpl.name }); }}
                                                className="p-1 text-slate-300 dark:text-[#475569] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-[#1A2D48] rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2Icon size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Meta badges */}
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
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
                                    </div>

                                    <div className="flex gap-2 mt-auto">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (assignCtx) {
                                                    navigate('/workouts/packets', { state: { editTemplate: tpl, assignToPlanSession: assignCtx } });
                                                } else {
                                                    navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts/sessions' } });
                                                }
                                            }}
                                            className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-emerald-700 dark:text-white rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-600"
                                        >
                                            <CalendarPlusIcon size={11} /> {assignCtx ? 'Assign to Plan' : 'Assign'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShareTarget({ type: 'template', id: tpl.id, name: tpl.name }); }}
                                            className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 text-slate-400 dark:text-white rounded-lg border border-slate-200 dark:border-indigo-600 transition-all flex items-center justify-center"
                                            title="Share"
                                        >
                                            <Share2Icon size={11} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* List view */
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]">
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Packet Name</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Phase</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Load</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Exercises</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                {filteredTemplates.map(tpl => {
                                    const ex = exCount(tpl);
                                    return (
                                        <tr
                                            key={tpl.id}
                                            className="group hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors cursor-pointer"
                                            onClick={() => { setViewingTemplate(tpl); setIsViewOpen(true); }}
                                        >
                                            <td className="px-5 py-3.5">
                                                <div className="font-medium text-slate-800 dark:text-[#E2E8F0] text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                                    {tpl.name}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {tpl.trainingPhase ? (
                                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-600 text-indigo-600 dark:text-white rounded text-[9px] font-semibold">
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
                                            <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-[#CBD5E1]">{ex}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setViewingTemplate(tpl); setIsViewOpen(true); }}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-all"
                                                        title="View"
                                                    >
                                                        <EyeIcon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-all"
                                                        title="Edit"
                                                    >
                                                        <PencilIcon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (assignCtx) {
                                                                navigate('/workouts/packets', { state: { editTemplate: tpl, assignToPlanSession: assignCtx } });
                                                            } else {
                                                                navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts/sessions' } });
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-emerald-600 dark:text-white border border-emerald-200 dark:border-emerald-600 transition-all"
                                                        title={assignCtx ? 'Assign to Plan' : 'Assign'}
                                                    >
                                                        <CalendarPlusIcon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShareTarget({ type: 'template', id: tpl.id, name: tpl.name }); }}
                                                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 text-slate-400 dark:text-white border border-slate-200 dark:border-indigo-600 transition-all"
                                                        title="Share"
                                                    >
                                                        <Share2Icon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: tpl.id, name: tpl.name }); }}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 dark:hover:bg-[#1A2D48] transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2Icon size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
              </div>{/* end main content */}

              {/* Right sidebar */}
              <div className="w-64 shrink-0 space-y-4">
                {/* Overview */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">Overview</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                        {[
                            { label: 'Total Packets', value: sidebarStats.total },
                            { label: 'Drafts', value: sidebarStats.drafts, hint: 'Saved but never scheduled' },
                            { label: 'This Week', value: sidebarStats.thisWeek, hint: 'Scheduled sessions this week' },
                        ].map(row => (
                            <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                                <span className="text-xs text-slate-500 dark:text-[#CBD5E1]" title={row.hint}>{row.label}</span>
                                <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most Assigned To */}
                {sidebarStats.mostAssigned.length > 0 && (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">Most Assigned To</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                            {sidebarStats.mostAssigned.map((entry, i) => (
                                <div key={`${entry.type}-${entry.name}-${i}`} className="flex items-center justify-between px-4 py-2.5 gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0] truncate">{entry.name}</div>
                                        <div className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mt-0.5">{entry.type}</div>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                        {entry.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Phase Distribution */}
                {sidebarStats.phaseDistribution.length > 0 && (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">Phase Distribution</span>
                        </div>
                        <div className="px-4 py-3 space-y-2.5">
                            {sidebarStats.phaseDistribution.map(([phase, count]) => (
                                <div key={phase}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-600 dark:text-[#CBD5E1]">{phase}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{count}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full"
                                            style={{ width: `${Math.round((count / sidebarStats.total) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            </div>

            {/* Modals */}
            <TemplateViewModal
                template={viewingTemplate}
                isOpen={isViewOpen}
                onClose={() => { setIsViewOpen(false); setViewingTemplate(null); }}
                onEdit={handleEdit}
                onDelete={(id) => setConfirmDelete({ id, name: viewingTemplate?.name ?? '' })}
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
