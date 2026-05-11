// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { DatabaseService } from '../services/databaseService';
import { TemplateViewModal } from '../components/workouts/TemplateViewModal';
import { ShareWorkoutPopover } from '../components/workouts/ShareWorkoutPopover';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { fuzzySearch } from '../utils/fuzzySearch';
import DidYouMeanBanner from '../components/library/DidYouMeanBanner';
import {
    PackageIcon, SearchIcon, PlusIcon, PencilIcon, Trash2Icon,
    EyeIcon, GridIcon, ListIcon, CalendarPlusIcon, Share2Icon,
    ClipboardListIcon,
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
    Low:    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    Medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
    High:   'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
};

function loadBadge(load: string) {
    return LOAD_COLORS[load] ?? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8]';
}

export const WorkoutSessionsPage = () => {
    const navigate = useNavigate();
    const {
        workoutTemplates, setWorkoutTemplates, isLoading, showToast,
    } = useAppState();

    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [viewingTemplate, setViewingTemplate] = useState(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [shareTarget, setShareTarget] = useState<{ type: 'template'; id: string; name: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    const { results: filteredTemplates, hasFuzzyResults, suggestions } = useMemo(
        () => fuzzySearch(workoutTemplates, search, (t) => [t.name, t.trainingPhase || '', t.load || ''].join(' '), (t) => t.name),
        [workoutTemplates, search]
    );

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
            <div className="space-y-4 animate-in fade-in duration-300">
                {/* Header */}
                <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 shrink-0">
                            <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                                <PackageIcon size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Sessions</h2>
                                <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">Saved workout packets — assign & schedule to athletes</p>
                            </div>
                        </div>

                        {/* Centered search */}
                        <div className="flex-1 flex justify-center px-4">
                            <div className="relative w-full max-w-md">
                                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748B]" />
                                <input
                                    type="text"
                                    placeholder="Search sessions..."
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
                                    className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white dark:bg-[#243A58] text-slate-700 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#CBD5E1]'}`}
                                    title="Grid view"
                                >
                                    <GridIcon size={14} />
                                </button>
                                <button
                                    onClick={() => setView('list')}
                                    className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-[#243A58] text-slate-700 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#CBD5E1]'}`}
                                    title="List view"
                                >
                                    <ListIcon size={14} />
                                </button>
                            </div>
                            <button
                                onClick={() => navigate('/workouts/packets')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
                            >
                                <PlusIcon size={14} /> New Session
                            </button>
                        </div>
                    </div>

                    {hasFuzzyResults && suggestions.length > 0 && (
                        <div className="mt-3">
                            <DidYouMeanBanner suggestions={suggestions} onSelect={(name) => setSearch(name)} />
                        </div>
                    )}
                </div>

                {/* Count bar */}
                <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-slate-400 dark:text-[#64748B]">
                        {filteredTemplates.length} session{filteredTemplates.length !== 1 ? 's' : ''}
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
                        <span className="text-xs font-medium text-slate-400 dark:text-[#64748B]">Loading sessions...</span>
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
                        <p className="text-sm font-medium text-slate-500 dark:text-[#94A3B8]">
                            {search ? `No sessions matching "${search}"` : 'No sessions saved yet'}
                        </p>
                        {!search && (
                            <>
                                <p className="text-xs text-slate-400 dark:text-[#64748B] mt-1 mb-4">Build a workout and save it as a template to see it here</p>
                                <button
                                    onClick={() => navigate('/workouts/packets')}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all"
                                >
                                    <PlusIcon size={13} /> Build Your First Session
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
                                    className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-4 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-all group relative overflow-hidden cursor-pointer"
                                    onClick={() => { setViewingTemplate(tpl); setIsViewOpen(true); }}
                                >
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Title row */}
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate flex-1 pr-2">
                                            {tpl.name}
                                        </h4>
                                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShareTarget({ type: 'template', id: tpl.id, name: tpl.name }); }}
                                                className="p-1 text-slate-300 dark:text-[#475569] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-all"
                                                title="Share"
                                            >
                                                <Share2Icon size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }}
                                                className="p-1 text-slate-300 dark:text-[#475569] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <PencilIcon size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: tpl.id, name: tpl.name }); }}
                                                className="p-1 text-slate-300 dark:text-[#475569] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/25 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2Icon size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Meta badges */}
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                        {tpl.trainingPhase && (
                                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-600 dark:text-indigo-300 rounded text-[9px] font-semibold">
                                                {tpl.trainingPhase}
                                            </span>
                                        )}
                                        {tpl.load && (
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${loadBadge(tpl.load)}`}>
                                                {tpl.load}
                                            </span>
                                        )}
                                        <span className="text-[9px] text-slate-400 dark:text-[#64748B]">{ex} exercise{ex !== 1 ? 's' : ''}</span>
                                    </div>

                                    <div className="text-[10px] text-slate-300 dark:text-[#475569] mb-3">
                                        {timeAgo(tpl.createdAt)}
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts/sessions' } }); }}
                                        className="w-full py-2 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <CalendarPlusIcon size={11} /> Assign & Schedule
                                    </button>
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
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Session Name</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Phase</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Load</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Exercises</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Created</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-right">Actions</th>
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
                                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-600 dark:text-indigo-300 rounded text-[9px] font-semibold">
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
                                            <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-[#94A3B8]">{ex}</td>
                                            <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-[#94A3B8]">{timeAgo(tpl.createdAt)}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setViewingTemplate(tpl); setIsViewOpen(true); }}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-all"
                                                        title="View"
                                                    >
                                                        <EyeIcon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(tpl); }}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-all"
                                                        title="Edit"
                                                    >
                                                        <PencilIcon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts/sessions' } }); }}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-all"
                                                        title="Assign & Schedule"
                                                    >
                                                        <CalendarPlusIcon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setShareTarget({ type: 'template', id: tpl.id, name: tpl.name }); }}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-all"
                                                        title="Share"
                                                    >
                                                        <Share2Icon size={13} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: tpl.id, name: tpl.name }); }}
                                                        className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-red-500 hover:bg-red-50 dark:hover:bg-rose-900/25 transition-all"
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
                title="Delete Session"
                message={`Are you sure you want to delete "${confirmDelete?.name}"? This cannot be undone.`}
                onConfirm={handleDeleteConfirmed}
                onCancel={() => setConfirmDelete(null)}
            />
        </>
    );
};

export default WorkoutSessionsPage;
