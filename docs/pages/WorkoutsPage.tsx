// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { useWorkoutPrograms, useDeleteProgram, useProgramWithDays } from '../hooks/useWorkoutPrograms';
import { DatabaseService } from '../services/databaseService';
import { ProgramBuilderModal } from '../components/workouts/ProgramBuilderModal';
import { ProgramViewModal } from '../components/workouts/ProgramViewModal';
import { TemplateViewModal } from '../components/workouts/TemplateViewModal';
import {
    DumbbellIcon, SearchIcon, PlusIcon,
    Trash2Icon, PencilIcon,
    EyeIcon, ListIcon, GridIcon,
    LayersIcon, MoreVerticalIcon,
    PackageIcon, PrinterIcon, HistoryIcon,
    ChevronDownIcon, ChevronUpIcon, CalendarPlusIcon,
    Share2Icon,
} from 'lucide-react';
import { ShareWorkoutPopover } from '../components/workouts/ShareWorkoutPopover';
import { fuzzySearch } from '../utils/fuzzySearch';
import DidYouMeanBanner from '../components/library/DidYouMeanBanner';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';

// ── Helpers ────────────────────────────────────────────────────────────────

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

// ── Program Card ──────────────────────────────────────────────────────────

const ProgramCard = ({ program, onView, onEdit, onDelete, onShare }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md hover:border-slate-300 transition-all duration-200 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-sm font-semibold text-slate-900 leading-tight group-hover:text-indigo-700 transition-colors truncate">
                    {program.name}
                </h3>
                {(program.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {(program.tags ?? []).map((t: string) => (
                            <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onShare(); }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100"
                    title="Share"
                >
                    <Share2Icon size={13} />
                </button>
                <ProgramMenu onEdit={onEdit} onDelete={onDelete} />
            </div>
        </div>

        {program.overview && (
            <p className="text-xs text-slate-400 leading-relaxed mb-3">{program.overview}</p>
        )}

        <div className="mt-auto" />

        <button
            onClick={onView}
            className="mt-3 w-full py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 rounded-lg text-xs font-medium transition-all"
        >
            View Program
        </button>
    </div>
);

// ── 3-dot menu ────────────────────────────────────────────────────────────

const ProgramMenu = ({ onEdit, onDelete }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative shrink-0">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
                <MoreVerticalIcon size={15} />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 w-32 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <PencilIcon size={13} /> Edit
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <Trash2Icon size={13} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
};

// ── View Toggle ──────────────────────────────────────────────────────────

const ViewToggle = ({ view, setView }) => (
    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
        <button
            onClick={(e) => { e.stopPropagation(); setView('list'); }}
            className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
            title="List view"
        >
            <ListIcon size={13} />
        </button>
        <button
            onClick={(e) => { e.stopPropagation(); setView('grid'); }}
            className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
            title="Grid view"
        >
            <GridIcon size={13} />
        </button>
    </div>
);

// ── Collapsible Section Header (with inline controls) ────────────────────

const SectionHeader = ({ title, subtitle, count, collapsed, onToggle, icon: Icon, accentColor, controls, children }) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div
            className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
        >
            <button onClick={onToggle} className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${accentColor}`}>
                    <Icon size={15} />
                </div>
                <div className="text-left">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                        {count > 0 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold">{count}</span>
                        )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
                </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
                {!collapsed && controls}
                <button onClick={onToggle} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                    {collapsed ? <ChevronDownIcon size={16} /> : <ChevronUpIcon size={16} />}
                </button>
            </div>
        </div>
        {!collapsed && <div className="border-t border-slate-100">{children}</div>}
    </div>
);

// ── Main Page ──────────────────────────────────────────────────────────────

export const WorkoutsPage = () => {
    const navigate = useNavigate();
    const {
        workoutTemplates, setWorkoutTemplates, isLoading,
    } = useAppState();

    // ── Section collapse state ─────────────────────────────────────────
    const [programsCollapsed, setProgramsCollapsed] = useState(false);
    const [singlesCollapsed, setSinglesCollapsed] = useState(false);
    const [singlesView, setSinglesView] = useState<'grid' | 'list'>('grid');

    // ── Programs state ─────────────────────────────────────────────────
    const [programsView, setProgramsView] = useState<'grid' | 'list'>('grid');
    const [viewingProgram, setViewingProgram] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isProgramBuilderOpen, setIsProgramBuilderOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState(null);
    const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
    const { data: editingFullProgram } = useProgramWithDays(editingProgramId);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<{ id: string; name: string } | null>(null);

    // ── Template view state ─────────────────────────────────────────────
    const [viewingTemplate, setViewingTemplate] = useState(null);
    const [isTemplateViewOpen, setIsTemplateViewOpen] = useState(false);

    // ── Share popover ──────────────────────────────────────────────────
    const [shareTarget, setShareTarget] = useState<{ type: 'program' | 'template'; id: string; name: string } | null>(null);

    // ── Shared search ──────────────────────────────────────────────────
    const [search, setSearch] = useState('');

    // ── Query hooks ────────────────────────────────────────────────────
    const { data: programs = [], isLoading: programsLoading } = useWorkoutPrograms();
    const deleteProgram = useDeleteProgram();

    const programSearch = useMemo(
        () => fuzzySearch(programs, search, (p) => [p.name, p.overview || '', ...(p.tags ?? [])].join(' '), (p) => p.name),
        [programs, search]
    );
    const filteredPrograms = programSearch.results;

    const templateSearch = useMemo(
        () => fuzzySearch(workoutTemplates, search, (t) => [t.name, t.trainingPhase || '', t.load || ''].join(' '), (t) => t.name),
        [workoutTemplates, search]
    );
    const filteredTemplates = templateSearch.results;

    const hasFuzzy = programSearch.hasFuzzyResults || templateSearch.hasFuzzyResults;
    const allSuggestions = useMemo(() => {
        const combined = [...programSearch.suggestions, ...templateSearch.suggestions];
        combined.sort((a, b) => b.score - a.score);
        const seen = new Set<string>();
        return combined.filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; }).slice(0, 3);
    }, [programSearch.suggestions, templateSearch.suggestions]);

    const handleDeleteProgram = async (id: string) => {
        await deleteProgram.mutateAsync(id);
        setConfirmDeleteId(null);
    };

    const handleDeleteTemplate = async (id: string) => {
        setWorkoutTemplates(prev => prev.filter(t => t.id !== id));
        try {
            await DatabaseService.deleteWorkoutTemplate(id);
        } catch (e) {
            console.warn("Could not delete template from DB:", e.message);
        }
    };

    const handleEditTemplate = (tpl) => {
        navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts' } });
    };

    return (
        <>
            <div className="space-y-4 animate-in fade-in duration-300">
                {/* Header with centered search */}
                <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                                <DumbbellIcon size={18} />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Workouts</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Create and manage workout programs & one-off sessions</p>
                            </div>
                        </div>
                        <div className="flex-1 flex justify-center px-4">
                            <div className="relative w-full max-w-md">
                                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search programs & packets..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="w-9 shrink-0" /> {/* Spacer for balance */}
                    </div>
                    {hasFuzzy && allSuggestions.length > 0 && (
                        <div className="mt-3">
                            <DidYouMeanBanner suggestions={allSuggestions} onSelect={(name) => setSearch(name)} />
                        </div>
                    )}
                </div>

                {/* Quick Actions — 3 cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => navigate('/workouts/packets')} className="bg-indigo-600 p-5 rounded-xl shadow-sm space-y-3 hover:bg-indigo-700 transition-colors text-left">
                        <div className="flex justify-between items-center text-indigo-200">
                            <h3 className="text-xs font-medium">Workout Packets</h3>
                            <PackageIcon size={14} />
                        </div>
                        <div className="text-white">
                            <div className="text-sm font-semibold leading-tight">Build & Schedule</div>
                            <div className="text-xs opacity-70 mt-1 leading-relaxed">
                                Create one-off workouts, assign to athletes or teams, and schedule onto the calendar.
                            </div>
                        </div>
                    </button>

                    <button onClick={() => navigate('/workouts/weightroom-sheets')} className="bg-slate-800 p-5 rounded-xl shadow-sm space-y-3 hover:bg-slate-900 transition-colors text-left">
                        <div className="flex justify-between items-center text-slate-400">
                            <h3 className="text-xs font-medium">Weightroom Sheets</h3>
                            <PrinterIcon size={14} />
                        </div>
                        <div className="text-white">
                            <div className="text-sm font-semibold leading-tight">Generate Sheets</div>
                            <div className="text-xs opacity-60 mt-1 leading-relaxed">
                                Daily prescribed loads for squads with calculated percentages from 1RM data.
                            </div>
                        </div>
                    </button>

                    <button onClick={() => navigate('/workouts/history')} className="bg-emerald-600 p-5 rounded-xl shadow-sm space-y-3 hover:bg-emerald-700 transition-colors text-left">
                        <div className="flex justify-between items-center text-emerald-200">
                            <h3 className="text-xs font-medium">Workout History</h3>
                            <HistoryIcon size={14} />
                        </div>
                        <div className="text-white">
                            <div className="text-sm font-semibold leading-tight">View & Reassign</div>
                            <div className="text-xs opacity-70 mt-1 leading-relaxed">
                                Browse all assigned workouts by athlete or team. Reassign or adjust past sessions.
                            </div>
                        </div>
                    </button>
                </div>

                {/* ──────── PROGRAMS SECTION (collapsible) ──────── */}
                <div data-tour="workout-programs">
                <SectionHeader
                    title="Workout Programs"
                    subtitle="Multi-day structured programs"
                    count={programs.length}
                    collapsed={programsCollapsed}
                    onToggle={() => setProgramsCollapsed(p => !p)}
                    icon={LayersIcon}
                    accentColor="bg-indigo-600"
                    controls={
                        <>
                            <ViewToggle view={programsView} setView={setProgramsView} />
                            <button
                                data-tour="workout-create"
                                onClick={(e) => { e.stopPropagation(); setEditingProgram(null); setIsProgramBuilderOpen(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-all"
                            >
                                <PlusIcon size={13} /> Add Program
                            </button>
                        </>
                    }
                >
                    <div className="p-4 space-y-4">
                        {programSearch.hasFuzzyResults && filteredPrograms.length > 0 && (
                            <div className="text-xs text-slate-400 italic">Showing closest matches for "{search}"</div>
                        )}
                        {/* Content */}
                        {programsLoading ? (
                            <div className="py-10 flex flex-col items-center justify-center gap-3">
                                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                <span className="text-xs font-medium text-slate-400">Loading workout programs...</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full mt-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                                            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
                                            <div className="h-3 w-full bg-slate-50 rounded animate-pulse" />
                                            <div className="flex gap-2">
                                                <div className="h-5 w-14 bg-slate-50 rounded-full animate-pulse" />
                                                <div className="h-5 w-14 bg-slate-50 rounded-full animate-pulse" />
                                            </div>
                                            <div className="h-8 w-full bg-slate-50 rounded-lg animate-pulse mt-2" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : filteredPrograms.length === 0 ? (
                            <div className="py-12 text-center">
                                <LayersIcon size={28} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-400">{search ? `No programs matching "${search}"` : 'No programs yet'}</p>
                                {!search && (
                                    <button onClick={() => { setEditingProgram(null); setIsProgramBuilderOpen(true); }} className="mt-3 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-all">
                                        <PlusIcon size={12} className="inline mr-1" /> Create Program
                                    </button>
                                )}
                            </div>
                        ) : programsView === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredPrograms.map((p) => (
                                    <ProgramCard
                                        key={p.id}
                                        program={p}
                                        onView={() => { setViewingProgram(p); setIsViewModalOpen(true); }}
                                        onEdit={() => { setEditingProgram(null); setEditingProgramId(p.id); setIsProgramBuilderOpen(true); }}
                                        onDelete={() => setConfirmDeleteId(p.id)}
                                        onShare={() => setShareTarget({ type: 'program', id: p.id, name: p.name })}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Program Name</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Created</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tags</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last edit</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredPrograms.map((p) => (
                                            <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="font-medium text-slate-800 text-sm group-hover:text-indigo-700">{p.name}</div>
                                                    {p.overview && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{p.overview}</div>}
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(p.created_at)}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(p.tags ?? []).map((t: string) => (
                                                            <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">{t}</span>
                                                        ))}
                                                        {(p.tags ?? []).length === 0 && <span className="text-slate-300 text-xs">—</span>}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-xs text-slate-500">{timeAgo(p.updated_at)}</td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button onClick={() => setShareTarget({ type: 'program', id: p.id, name: p.name })} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Share"><Share2Icon size={13} /></button>
                                                        <button onClick={() => { setEditingProgram(null); setEditingProgramId(p.id); setIsProgramBuilderOpen(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit"><PencilIcon size={13} /></button>
                                                        <button onClick={() => setConfirmDeleteId(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete"><Trash2Icon size={13} /></button>
                                                        <button onClick={() => { setViewingProgram(p); setIsViewModalOpen(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all" title="View"><EyeIcon size={13} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </SectionHeader>

                </div>
                {/* ──────── WORKOUT PACKETS SECTION (collapsible) ──────── */}
                <div data-tour="workout-packets">
                <SectionHeader
                    title="Workout Packets"
                    subtitle="One-off workout templates — assign & schedule to athletes"
                    count={workoutTemplates.length}
                    collapsed={singlesCollapsed}
                    onToggle={() => setSinglesCollapsed(p => !p)}
                    icon={PackageIcon}
                    accentColor="bg-emerald-600"
                    controls={
                        <>
                            <ViewToggle view={singlesView} setView={setSinglesView} />
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate('/workouts/packets'); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all"
                            >
                                <PlusIcon size={13} /> Add Packet
                            </button>
                        </>
                    }
                >
                    <div className="p-4 space-y-4">
                        {templateSearch.hasFuzzyResults && filteredTemplates.length > 0 && (
                            <div className="text-xs text-slate-400 italic">Showing closest matches for "{search}"</div>
                        )}
                        {/* Content */}
                        {isLoading && filteredTemplates.length === 0 ? (
                            <div className="py-10 flex flex-col items-center justify-center gap-3">
                                <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                                <span className="text-xs font-medium text-slate-400">Loading workout packets...</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 w-full mt-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                                            <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                                            <div className="flex gap-2">
                                                <div className="h-4 w-16 bg-slate-50 rounded animate-pulse" />
                                                <div className="h-4 w-12 bg-slate-50 rounded animate-pulse" />
                                            </div>
                                            <div className="h-8 w-full bg-slate-50 rounded-lg animate-pulse" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="py-12 text-center">
                                <PackageIcon size={28} className="text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-400">{search ? `No packets matching "${search}"` : 'No workout packets saved yet'}</p>
                                {!search && <p className="text-xs text-slate-300 mt-1">Build a workout and save it as a template to see it here</p>}
                                {!search && (
                                    <button onClick={() => navigate('/workouts/packets')} className="mt-3 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-all">
                                        <PlusIcon size={12} className="inline mr-1" /> Create Workout
                                    </button>
                                )}
                            </div>
                        ) : singlesView === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredTemplates.map(tpl => {
                                    const exCount = (tpl.sections?.warmup?.length || 0) + (tpl.sections?.workout?.length || 0) + (tpl.sections?.cooldown?.length || 0);
                                    return (
                                        <div key={tpl.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-emerald-200 transition-all group relative overflow-hidden cursor-pointer"
                                            onClick={() => { setViewingTemplate(tpl); setIsTemplateViewOpen(true); }}>
                                            <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate flex-1 pr-2">{tpl.name}</h4>
                                                <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setShareTarget({ type: 'template', id: tpl.id, name: tpl.name }); }} className="p-1 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Share">
                                                        <Share2Icon size={12} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditTemplate(tpl); }} className="p-1 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                                                        <PencilIcon size={12} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteTemplate({ id: tpl.id, name: tpl.name }); }} className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                                                        <Trash2Icon size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-semibold">{tpl.trainingPhase}</span>
                                                <span className="text-[9px] text-slate-400">{exCount} exercises</span>
                                                <span className="text-[9px] text-slate-300">·</span>
                                                <span className="text-[9px] text-slate-400">{tpl.load}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-300 mb-3">
                                                Created {new Date(tpl.createdAt).toLocaleDateString()}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts' } }); }}
                                                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <CalendarPlusIcon size={11} /> Assign & Schedule
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* List view */
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50">
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Workout Name</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Phase</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Load</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Exercises</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Created</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredTemplates.map(tpl => {
                                            const exCount = (tpl.sections?.warmup?.length || 0) + (tpl.sections?.workout?.length || 0) + (tpl.sections?.cooldown?.length || 0);
                                            return (
                                                <tr key={tpl.id} className="group hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setViewingTemplate(tpl); setIsTemplateViewOpen(true); }}>
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-medium text-slate-800 text-sm group-hover:text-emerald-700">{tpl.name}</div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-semibold">{tpl.trainingPhase}</span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-slate-500">{tpl.load}</td>
                                                    <td className="px-5 py-3.5 text-xs text-slate-500">{exCount}</td>
                                                    <td className="px-5 py-3.5 text-xs text-slate-500">{new Date(tpl.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button onClick={(e) => { e.stopPropagation(); setShareTarget({ type: 'template', id: tpl.id, name: tpl.name }); }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Share">
                                                                <Share2Icon size={13} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleEditTemplate(tpl); }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Edit">
                                                                <PencilIcon size={13} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); navigate('/workouts/packets', { state: { editTemplate: tpl, returnTo: '/workouts' } }); }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" title="Assign">
                                                                <CalendarPlusIcon size={13} />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteTemplate({ id: tpl.id, name: tpl.name }); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete">
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
                </SectionHeader>
                </div>

                {/* Delete confirm modal */}
                <ConfirmDeleteModal
                    isOpen={!!confirmDeleteId}
                    title="Delete Program"
                    message="This will permanently delete the program, all days, and all exercises."
                    onConfirm={() => handleDeleteProgram(confirmDeleteId)}
                    onCancel={() => setConfirmDeleteId(null)}
                />
                <ConfirmDeleteModal
                    isOpen={!!confirmDeleteTemplate}
                    title="Delete Workout Packet"
                    message={`Are you sure you want to delete "${confirmDeleteTemplate?.name}"?`}
                    onConfirm={() => { handleDeleteTemplate(confirmDeleteTemplate.id); setConfirmDeleteTemplate(null); }}
                    onCancel={() => setConfirmDeleteTemplate(null)}
                />
            </div>

            {/* Program Builder (full-screen overlay) */}
            <ProgramBuilderModal
                isOpen={isProgramBuilderOpen}
                onClose={() => { setIsProgramBuilderOpen(false); setEditingProgram(null); setEditingProgramId(null); }}
                editingProgram={editingFullProgram ?? editingProgram}
            />

            {/* Program View Modal */}
            <ProgramViewModal
                program={viewingProgram}
                isOpen={isViewModalOpen}
                onClose={() => { setIsViewModalOpen(false); setViewingProgram(null); }}
            />

            {/* Template View Modal */}
            <TemplateViewModal
                template={viewingTemplate}
                isOpen={isTemplateViewOpen}
                onClose={() => { setIsTemplateViewOpen(false); setViewingTemplate(null); }}
                onEdit={handleEditTemplate}
                onDelete={handleDeleteTemplate}
            />

            {/* Share Popover */}
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

export default WorkoutsPage;
