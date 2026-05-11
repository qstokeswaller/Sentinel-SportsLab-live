// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { useWorkoutPrograms, useDeleteProgram, useProgramWithDays } from '../hooks/useWorkoutPrograms';
import { DatabaseService } from '../services/databaseService';
import { ProgramBuilderModal } from '../components/workouts/ProgramBuilderModal';
import { ProgramViewModal } from '../components/workouts/ProgramViewModal';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { ShareWorkoutPopover } from '../components/workouts/ShareWorkoutPopover';
import { fuzzySearch } from '../utils/fuzzySearch';
import DidYouMeanBanner from '../components/library/DidYouMeanBanner';
import {
    LayersIcon, PlusIcon, SearchIcon, GridIcon, ListIcon,
    PencilIcon, Trash2Icon, EyeIcon, Share2Icon, MoreVerticalIcon,
} from 'lucide-react';

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

// ── Program Menu ─────────────────────────────────────────────────────────────

const ProgramMenu = ({ onEdit, onDelete }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative shrink-0">
            <button
                onClick={e => { e.stopPropagation(); setOpen(p => !p); }}
                className="p-1.5 rounded-lg text-slate-400 dark:text-[#475569] hover:text-slate-600 dark:hover:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-all"
            >
                <MoreVerticalIcon size={15} />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl z-20 w-32 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                        <PencilIcon size={13} /> Edit
                    </button>
                    <button onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2Icon size={13} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
};

// ── Main Page ────────────────────────────────────────────────────────────────

export const WorkoutProgramsPage = () => {
    const navigate = useNavigate();
    const { showToast, scheduledSessions } = useAppState();

    const [view, setView] = useState<'grid' | 'list'>('list');
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [viewingProgram, setViewingProgram] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isProgramBuilderOpen, setIsProgramBuilderOpen] = useState(false);
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const [editingProgramBasic, setEditingProgramBasic] = useState(null);
    const { data: editingFullProgram } = useProgramWithDays(editingProgramId);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [shareTarget, setShareTarget] = useState<{ type: 'program'; id: string; name: string } | null>(null);

    const { data: programs = [], isLoading } = useWorkoutPrograms();
    const deleteProgram = useDeleteProgram();

    // ── Sidebar stats ──────────────────────────────────────────────────────
    const sidebarStats = useMemo(() => {
        const total = programs.length;
        // Tag distribution
        const tagCounts: Record<string, number> = {};
        for (const p of programs) {
            for (const t of (p.tags ?? [])) {
                tagCounts[t] = (tagCounts[t] || 0) + 1;
            }
        }
        const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        // Sessions linked to programs (sessions that have a training_phase matching program tags)
        const allSessions = scheduledSessions || [];
        const completedCount = allSessions.filter(s => s.status === 'Completed').length;
        return { total, topTags, completedCount, totalSessions: allSessions.length };
    }, [programs, scheduledSessions]);

    const programSearch = useMemo(
        () => fuzzySearch(programs, search, p => [p.name, p.overview || '', ...(p.tags ?? [])].join(' '), p => p.name),
        [programs, search]
    );
    const filteredPrograms = programSearch.results;

    const handleDelete = async (id: string) => {
        const name = programs.find(p => p.id === id)?.name;
        try {
            await deleteProgram.mutateAsync(id);
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

    return (
        <>
            <div className="flex gap-5 animate-in fade-in duration-300">
                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-4">

                {/* Header */}
                <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                            <LayersIcon size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">Workout Programs</h2>
                            <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">Build, manage and periodize long-term training programs.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#64748B] hover:text-slate-700'}`} title="List view"><ListIcon size={13} /></button>
                                <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#64748B] hover:text-slate-700'}`} title="Grid view"><GridIcon size={13} /></button>
                            </div>
                            <button
                                onClick={() => { setEditingProgramBasic(null); setEditingProgramId(null); setIsProgramBuilderOpen(true); }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all"
                            >
                                <PlusIcon size={13} /> Create Program
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mt-3">
                        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748B]" />
                        <input
                            type="text"
                            placeholder="Search programs..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-sm text-slate-800 dark:text-[#E2E8F0] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-colors placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                        />
                    </div>
                    {programSearch.hasFuzzyResults && programSearch.suggestions.length > 0 && (
                        <div className="mt-2">
                            <DidYouMeanBanner suggestions={programSearch.suggestions} onSelect={name => setSearch(name)} />
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-0 mt-3 border-b border-slate-100 dark:border-[#1A2D48] -mx-5 px-5">
                        {[
                            { key: 'active', label: 'Active Programs' },
                            { key: 'archived', label: 'Archived' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-[#94A3B8]'
                                }`}
                            >
                                {tab.label}
                                {tab.key === 'active' && programs.length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-bold">
                                        {programs.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Archived placeholder or active content */}
                {activeTab === 'archived' ? (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] py-16 flex flex-col items-center gap-2 shadow-sm">
                        <LayersIcon size={28} className="text-slate-200 dark:text-[#243A58]" />
                        <p className="text-sm text-slate-400 dark:text-[#64748B]">No archived programs</p>
                        <p className="text-xs text-slate-300 dark:text-[#475569]">Archived programs will appear here</p>
                    </div>
                ) : isLoading ? (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-12 flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-xs text-slate-400 dark:text-[#64748B]">Loading programs...</span>
                    </div>
                ) : filteredPrograms.length === 0 ? (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] py-16 flex flex-col items-center text-slate-300 dark:text-[#475569] gap-2">
                        <LayersIcon size={32} className="opacity-40" />
                        <p className="text-sm text-slate-400 dark:text-[#64748B]">{search ? `No programs matching "${search}"` : 'No programs yet'}</p>
                        {!search && (
                            <button onClick={() => setIsProgramBuilderOpen(true)} className="mt-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/25 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-semibold transition-all">
                                <PlusIcon size={12} className="inline mr-1" /> Create Program
                            </button>
                        )}
                    </div>
                ) : view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredPrograms.map(p => (
                            <div key={p.id} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 flex flex-col hover:shadow-md hover:border-slate-300 dark:hover:border-[#364E6E] transition-all relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{p.name}</h3>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {(p.tags ?? []).map(t => (
                                                <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] rounded-md text-[9px] font-medium">{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <ProgramMenu onEdit={() => openEdit(p)} onDelete={() => setConfirmDeleteId(p.id)} />
                                </div>
                                {p.overview && <p className="text-xs text-slate-400 dark:text-[#64748B] leading-relaxed mb-3">{p.overview}</p>}
                                <div className="mt-auto text-[9px] text-slate-400 dark:text-[#64748B] mb-3">Last edited {timeAgo(p.updated_at)}</div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setViewingProgram(p); setIsViewModalOpen(true); }} className="flex-1 py-2 bg-slate-50 dark:bg-[#0F1C30] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-[#243A58] hover:border-indigo-200 dark:hover:border-indigo-800/50 text-slate-600 dark:text-[#CBD5E1] hover:text-indigo-700 dark:hover:text-indigo-400 rounded-lg text-[10px] font-medium transition-all">
                                        View
                                    </button>
                                    <button onClick={() => setShareTarget({ type: 'program', id: p.id, name: p.name })} className="p-2 bg-slate-50 dark:bg-[#0F1C30] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-[#243A58] rounded-lg text-slate-400 dark:text-[#64748B] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                                        <Share2Icon size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]">
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Program</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Tags</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Created</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Last Edit</th>
                                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                {filteredPrograms.map(p => (
                                    <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors cursor-pointer" onClick={() => { setViewingProgram(p); setIsViewModalOpen(true); }}>
                                        <td className="px-5 py-3.5">
                                            <div className="font-medium text-slate-800 dark:text-[#E2E8F0] text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{p.name}</div>
                                            {p.overview && <div className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5 truncate max-w-xs">{p.overview}</div>}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {(p.tags ?? []).map(t => (
                                                    <span key={t} className="px-2 py-0.5 bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] rounded-md text-[9px] font-medium">{t}</span>
                                                ))}
                                                {(p.tags ?? []).length === 0 && <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-[#94A3B8]">{formatDate(p.created_at)}</td>
                                        <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-[#94A3B8]">{timeAgo(p.updated_at)}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button onClick={e => { e.stopPropagation(); setShareTarget({ type: 'program', id: p.id, name: p.name }); }} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"><Share2Icon size={13} /></button>
                                                <button onClick={e => { e.stopPropagation(); openEdit(p); }} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"><PencilIcon size={13} /></button>
                                                <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(p.id); }} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2Icon size={13} /></button>
                                                <button onClick={e => { e.stopPropagation(); setViewingProgram(p); setIsViewModalOpen(true); }} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-all"><EyeIcon size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                </div>{/* end main content */}

                {/* Right sidebar */}
                <div className="w-64 shrink-0 space-y-4">

                    {/* Program Overview */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#94A3B8]">Program Overview</span>
                            <div className="text-[9px] text-slate-400 dark:text-[#64748B] mt-0.5">All Active Programs</div>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                            {[
                                { label: 'Total Programs', value: sidebarStats.total },
                                { label: 'Total Sessions', value: sidebarStats.totalSessions },
                                { label: 'Sessions Completed', value: sidebarStats.completedCount },
                                { label: 'Completion Rate', value: sidebarStats.totalSessions > 0 ? `${Math.round((sidebarStats.completedCount / sidebarStats.totalSessions) * 100)}%` : '—' },
                            ].map(row => (
                                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs text-slate-500 dark:text-[#94A3B8]">{row.label}</span>
                                    <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tag Distribution */}
                    {sidebarStats.topTags.length > 0 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#94A3B8]">Goal Distribution</span>
                            </div>
                            <div className="px-4 py-3 space-y-2.5">
                                {sidebarStats.topTags.map(([tag, count]) => (
                                    <div key={tag}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-slate-600 dark:text-[#CBD5E1]">{tag}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-[#64748B]">{count}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full"
                                                style={{ width: `${Math.round((count / sidebarStats.total) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick action */}
                    <button
                        onClick={() => { setEditingProgramBasic(null); setEditingProgramId(null); setIsProgramBuilderOpen(true); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                    >
                        <PlusIcon size={13} /> Create New Program
                    </button>
                </div>

            </div>{/* end flex */}

            <ProgramBuilderModal
                isOpen={isProgramBuilderOpen}
                onClose={() => { setIsProgramBuilderOpen(false); setEditingProgramId(null); setEditingProgramBasic(null); }}
                editingProgram={editingFullProgram ?? editingProgramBasic}
            />
            <ProgramViewModal
                program={viewingProgram}
                isOpen={isViewModalOpen}
                onClose={() => { setIsViewModalOpen(false); setViewingProgram(null); }}
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
        </>
    );
};

export default WorkoutProgramsPage;
