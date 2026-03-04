// @ts-nocheck
import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { useExercises } from '../hooks/useExercises';
import { useWorkoutPrograms, useDeleteProgram } from '../hooks/useWorkoutPrograms';
import { ProgramBuilderModal } from '../components/workouts/ProgramBuilderModal';
import { ProgramViewModal } from '../components/workouts/ProgramViewModal';
import { MUSCLE_GROUPS } from '../utils/mocks';
import { Button } from '@/components/ui/button';
import {
    DumbbellIcon, SearchIcon, PlusIcon, XIcon, ChevronRightIcon, ArrowRightIcon,
    Trash2Icon, PencilIcon, ChevronLeftIcon, ChevronDownIcon,
    EyeIcon, InfoIcon, CheckIcon, ListIcon, GridIcon, SaveIcon,
    PlayCircleIcon, VideoOffIcon, LayersIcon, CalendarIcon, TagIcon,
    MoreVerticalIcon
} from 'lucide-react';

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

const ProgramCard = ({ program, onView, onEdit, onDelete }) => (
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
            <ProgramMenu onEdit={onEdit} onDelete={onDelete} />
        </div>

        {program.overview && (
            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">{program.overview}</p>
        )}

        <div className="mt-auto pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
            <div>
                <div className="text-[10px] font-medium text-slate-400 mb-0.5">Created</div>
                <div className="text-xs text-slate-600">{formatDate(program.created_at)}</div>
            </div>
            <div>
                <div className="text-[10px] font-medium text-slate-400 mb-0.5">Last edit</div>
                <div className="text-xs text-slate-600">{timeAgo(program.updated_at)}</div>
            </div>
        </div>

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

// ── Main Page ──────────────────────────────────────────────────────────────

export const ExerciseLibraryPage = () => {
    const {
        exercises, setExercises, librarySearch, setLibrarySearch,
        selectedCategory, setSelectedCategory, selectedMuscleGroup, setSelectedMuscleGroup,
        libraryPage, setLibraryPage, ITEMS_PER_PAGE,
        newExercise, setNewExercise, editingExercise, setEditingExercise,
        isLibrarySettingsModalOpen, setIsLibrarySettingsModalOpen,
        isExerciseInfoModalOpen, setIsExerciseInfoModalOpen,
        viewingExerciseInfo, setViewingExerciseInfo,
        deletingExercise, setDeletingExercise,
        isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen,
        isEditLiftModalOpen, setIsEditLiftModalOpen,
        exerciseCategories,
        showToast,
    } = useAppState();

    // ── Local tab state ──
    const [libraryViewMode, setLibraryViewMode] = useState<'exercises' | 'programs'>('exercises');

    // ── Programs state ──
    const [programsView, setProgramsView] = useState<'grid' | 'list'>('grid');
    const [programSearch, setProgramSearch] = useState('');
    const [viewingProgram, setViewingProgram] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isProgramBuilderOpen, setIsProgramBuilderOpen] = useState(false);
    const [editingProgram, setEditingProgram] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Alphabet filter (exercises only)
    const [alphabetLetter, setAlphabetLetter] = useState('All');

    const { data: exerciseData, isLoading: exercisesLoading } = useExercises({
        search: librarySearch,
        category: selectedCategory,
        muscleGroup: selectedMuscleGroup,
        alphabetLetter,
        page: libraryPage,
        pageSize: ITEMS_PER_PAGE,
    });

    const { data: programs = [], isLoading: programsLoading } = useWorkoutPrograms();
    const deleteProgram = useDeleteProgram();

    const dbExercises = exerciseData?.exercises ?? [];
    const totalPages = exerciseData?.totalPages ?? 1;
    const totalCount = exerciseData?.total ?? 0;

    const filteredPrograms = programs.filter((p) =>
        p.name.toLowerCase().includes(programSearch.toLowerCase())
    );

    const handleDeleteProgram = async (id: string) => {
        await deleteProgram.mutateAsync(id);
        setConfirmDeleteId(null);
    };

    // ── Programs view ──────────────────────────────────────────────────────

    const renderPrograms = () => (
        <div className="space-y-4 pb-4">
            {/* Programs header bar */}
            <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1 relative">
                    <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search programs..."
                        value={programSearch}
                        onChange={(e) => setProgramSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setProgramsView('list')}
                        className={`p-1.5 rounded-md transition-all ${programsView === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                        title="List view"
                    >
                        <ListIcon size={14} />
                    </button>
                    <button
                        onClick={() => setProgramsView('grid')}
                        className={`p-1.5 rounded-md transition-all ${programsView === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-700'}`}
                        title="Grid view"
                    >
                        <GridIcon size={14} />
                    </button>
                </div>
                <Button
                    onClick={() => { setEditingProgram(null); setIsProgramBuilderOpen(true); }}
                    size="sm"
                >
                    <PlusIcon size={14} className="mr-1.5" /> Add Program
                </Button>
            </div>

            {programsLoading ? (
                <div className="py-20 text-center text-sm text-slate-400">Loading programs...</div>
            ) : filteredPrograms.length === 0 ? (
                <div className="py-20 text-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                    <div className="w-12 h-12 bg-white rounded-xl mx-auto flex items-center justify-center shadow-sm mb-4">
                        <LayersIcon size={22} className="text-slate-300" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-700 mb-1">
                        {programSearch ? 'No programs found' : 'No programs yet'}
                    </h4>
                    <p className="text-sm text-slate-400 mb-5">
                        {programSearch ? 'Try a different search' : 'Create your first workout program'}
                    </p>
                    {!programSearch && (
                        <Button
                            onClick={() => { setEditingProgram(null); setIsProgramBuilderOpen(true); }}
                            size="sm"
                        >
                            <PlusIcon size={14} className="mr-1.5" /> Create Program
                        </Button>
                    )}
                </div>
            ) : programsView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredPrograms.map((p) => (
                        <ProgramCard
                            key={p.id}
                            program={p}
                            onView={() => { setViewingProgram(p); setIsViewModalOpen(true); }}
                            onEdit={() => { setEditingProgram(p); setIsProgramBuilderOpen(true); }}
                            onDelete={() => setConfirmDeleteId(p.id)}
                        />
                    ))}
                </div>
            ) : (
                /* List view */
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
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
                                            <button
                                                onClick={() => { setEditingProgram(p); setIsProgramBuilderOpen(true); }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                                title="Edit"
                                            >
                                                <PencilIcon size={13} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(p.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2Icon size={13} />
                                            </button>
                                            <button
                                                onClick={() => { setViewingProgram(p); setIsViewModalOpen(true); }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                                title="View"
                                            >
                                                <EyeIcon size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete confirm modal */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl p-6 shadow-xl border border-slate-200 max-w-sm w-full animate-in zoom-in-95">
                        <h3 className="text-base font-semibold text-slate-900 mb-1.5">Delete program?</h3>
                        <p className="text-sm text-slate-500 mb-5">This will permanently delete the program, all days, and all exercises. This cannot be undone.</p>
                        <div className="flex gap-2.5 justify-end">
                            <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteProgram(confirmDeleteId)}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // ── Exercises view ─────────────────────────────────────────────────────

    const renderExercises = () => (
        <>
            {/* Search Bar */}
            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 mb-4">
                <SearchIcon size={16} className="text-slate-400 shrink-0" />
                <input
                    type="text"
                    placeholder="Search exercises..."
                    value={librarySearch}
                    onChange={(e) => { setLibrarySearch(e.target.value); setLibraryPage(1); }}
                    className="flex-1 bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400"
                />
                <div className="text-xs text-slate-400 border-l border-slate-200 pl-3 shrink-0">
                    {exercisesLoading ? '...' : `${totalCount} results`}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-20">
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 w-1/3">Exercise</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Target Muscle</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Category</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Info</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center w-36">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {exercisesLoading ? (
                                <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">Loading exercises...</td></tr>
                            ) : dbExercises.map(ex => (
                                <tr key={ex.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-700 text-sm group-hover:text-indigo-700">{ex.name}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-xs font-medium text-slate-500 border border-slate-200">
                                            {ex.body_parts?.[0] || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex flex-wrap justify-center gap-1">
                                            {ex.categories && ex.categories.length > 0 ? (
                                                <>
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 text-xs font-medium text-indigo-600 border border-indigo-100">
                                                        {ex.categories[0]}
                                                    </span>
                                                    {ex.categories[1] && (
                                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-50 text-xs font-medium text-slate-500 border border-slate-200">
                                                            {ex.categories[1]}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {ex.video_url ? (
                                                <a href={ex.video_url} target="_blank" rel="noreferrer" title="Watch Video" className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100">
                                                    <PlayCircleIcon size={13} fill="currentColor" />
                                                </a>
                                            ) : (
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-300 flex items-center justify-center cursor-not-allowed">
                                                    <VideoOffIcon size={13} />
                                                </div>
                                            )}
                                            <button
                                                onClick={() => { setViewingExerciseInfo(ex); setIsExerciseInfoModalOpen(true); }}
                                                title="Exercise Info"
                                                className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all border border-indigo-100"
                                            >
                                                <InfoIcon size={13} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => {
                                                setEditingExercise(ex);
                                                setNewExercise({
                                                    name: ex.name,
                                                    bodyRegion: ex.categories?.[0] || 'Unsorted',
                                                    classification: ex.categories?.[1] || 'Unsorted',
                                                    posture: ex.options?.posture || 'Unsorted',
                                                    grip: ex.options?.grip || 'Unsorted',
                                                    mechanics: ex.options?.mechanics || 'Unsorted',
                                                    execution: ex.options?.alternating ? 'Alternating' : 'Unsorted',
                                                    primaryEquipment: ex.equipment?.[0] || 'Unsorted',
                                                    targetMuscle: ex.body_parts?.[0] || 'Unsorted',
                                                    videoUrl: ex.video_url || '',
                                                    description: ex.description || ''
                                                });
                                                setIsEditLiftModalOpen(true);
                                            }} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit">
                                                <PencilIcon size={13} />
                                            </button>
                                            <button onClick={() => { setDeletingExercise(ex); setIsDeleteConfirmModalOpen(true); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Delete">
                                                <Trash2Icon size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-3">
                    <button
                        onClick={() => setLibraryPage(p => Math.max(1, p - 1))}
                        disabled={libraryPage === 1}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                        <ChevronLeftIcon size={15} />
                    </button>
                    <span className="text-xs font-medium text-slate-500">
                        Page <span className="text-indigo-600 font-semibold">{libraryPage}</span> of {totalPages}
                    </span>
                    <button
                        onClick={() => setLibraryPage(p => Math.min(totalPages, p + 1))}
                        disabled={libraryPage === totalPages}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                        <ChevronRightIcon size={15} />
                    </button>
                </div>
            )}
        </>
    );

    // ── Main render ────────────────────────────────────────────────────────

    return (
        <>
            <div className="space-y-4 animate-in fade-in duration-300 h-[calc(100vh-80px)] flex flex-col">
                {/* Header */}
                <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <DumbbellIcon size={18} />
                                </div>
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-semibold text-slate-900">Exercise Library</h2>
                                    {/* Tab toggle */}
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                        <button
                                            onClick={() => { setLibraryViewMode('exercises'); setLibraryPage(1); }}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'exercises' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Exercises
                                        </button>
                                        <button
                                            onClick={() => setLibraryViewMode('programs')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'programs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Programs
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Filters + Add button row */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {libraryViewMode === 'exercises' && (
                                    <>
                                        {/* Alphabet Jump */}
                                        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                                            <span className="text-xs font-medium text-slate-400">Jump</span>
                                            <div className="h-3 w-px bg-slate-200" />
                                            <select
                                                onChange={(e) => { setAlphabetLetter(e.target.value || 'All'); setLibraryPage(1); }}
                                                className="bg-transparent text-xs font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer"
                                                defaultValue=""
                                            >
                                                <option value="">—</option>
                                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                                                    <option key={char} value={char}>{char}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>

                                        {/* Category Filter */}
                                        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                                            <span className="text-xs font-medium text-slate-400">Category</span>
                                            <div className="h-3 w-px bg-slate-200" />
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => { setSelectedCategory(e.target.value); setLibraryPage(1); }}
                                                className="bg-transparent text-xs font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer min-w-[60px]"
                                            >
                                                <option value="All">All</option>
                                                {exerciseCategories.map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>

                                        {/* Muscle Filter */}
                                        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                                            <span className="text-xs font-medium text-slate-400">Muscle</span>
                                            <div className="h-3 w-px bg-slate-200" />
                                            <select
                                                value={selectedMuscleGroup}
                                                onChange={(e) => { setSelectedMuscleGroup(e.target.value); setLibraryPage(1); }}
                                                className="bg-transparent text-xs font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer min-w-[60px]"
                                            >
                                                <option value="All">All</option>
                                                {MUSCLE_GROUPS.map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>

                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                setEditingExercise(null);
                                                setNewExercise({
                                                    name: '',
                                                    bodyRegion: 'Unsorted',
                                                    classification: 'Unsorted',
                                                    posture: 'Unsorted',
                                                    grip: 'Unsorted',
                                                    mechanics: 'Unsorted',
                                                    execution: 'Unsorted',
                                                    primaryEquipment: 'Unsorted',
                                                    targetMuscle: 'Unsorted',
                                                    videoUrl: '',
                                                    description: ''
                                                });
                                                setIsEditLiftModalOpen(true);
                                            }}
                                        >
                                            <PlusIcon size={14} className="mr-1.5" /> Add Exercise
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {libraryViewMode === 'programs' ? renderPrograms() : renderExercises()}
            </div>

            {/* Program Builder (full-screen overlay) */}
            <ProgramBuilderModal
                isOpen={isProgramBuilderOpen}
                onClose={() => { setIsProgramBuilderOpen(false); setEditingProgram(null); }}
                editingProgram={editingProgram}
            />

            {/* Program View Modal */}
            <ProgramViewModal
                program={viewingProgram}
                isOpen={isViewModalOpen}
                onClose={() => { setIsViewModalOpen(false); setViewingProgram(null); }}
            />
        </>
    );
};
