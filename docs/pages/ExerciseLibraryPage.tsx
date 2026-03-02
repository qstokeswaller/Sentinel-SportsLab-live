// @ts-nocheck
import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { useExercises } from '../hooks/useExercises';
import { useWorkoutPrograms, useDeleteProgram } from '../hooks/useWorkoutPrograms';
import { ProgramBuilderModal } from '../components/workouts/ProgramBuilderModal';
import { ProgramViewModal } from '../components/workouts/ProgramViewModal';
import { MUSCLE_GROUPS } from '../utils/mocks';
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
    if (h < 24) return `${h} Hour${h > 1 ? 's' : ''} Ago`;
    if (d < 30) return `${d} Day${d > 1 ? 's' : ''} Ago`;
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Program Card ──────────────────────────────────────────────────────────

const ProgramCard = ({ program, onView, onEdit, onDelete }) => (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex flex-col hover:shadow-xl hover:border-slate-300 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-indigo-900 transition-colors truncate">
                    {program.name}
                </h3>
                {(program.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {(program.tags ?? []).map((t: string) => (
                            <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </div>
            <ProgramMenu onEdit={onEdit} onDelete={onDelete} />
        </div>

        {program.overview && (
            <p className="text-xs font-medium text-slate-400 leading-relaxed line-clamp-2 mb-4">{program.overview}</p>
        )}

        <div className="mt-auto pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <div>
                <div className="text-slate-400 mb-0.5">Created</div>
                <div className="text-slate-700">{formatDate(program.created_at)}</div>
            </div>
            <div>
                <div className="text-slate-400 mb-0.5">Last Edit</div>
                <div className="text-slate-700">{timeAgo(program.updated_at)}</div>
            </div>
        </div>

        <button
            onClick={onView}
            className="mt-4 w-full py-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
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
                className="p-2 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
                <MoreVerticalIcon size={16} />
            </button>
            {open && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 w-32 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <PencilIcon size={13} /> Edit
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
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
            <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex-1 relative">
                    <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search programs..."
                        value={programSearch}
                        onChange={(e) => setProgramSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setProgramsView('list')}
                        className={`p-2 rounded-lg transition-all ${programsView === 'list' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-700'}`}
                        title="List view"
                    >
                        <ListIcon size={15} />
                    </button>
                    <button
                        onClick={() => setProgramsView('grid')}
                        className={`p-2 rounded-lg transition-all ${programsView === 'grid' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-700'}`}
                        title="Grid view"
                    >
                        <GridIcon size={15} />
                    </button>
                </div>
                <button
                    onClick={() => { setEditingProgram(null); setIsProgramBuilderOpen(true); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                >
                    <PlusIcon size={14} /> Add Workout Program
                </button>
            </div>

            {programsLoading ? (
                <div className="py-20 text-center text-[11px] font-black uppercase tracking-widest text-slate-300">
                    Loading programs...
                </div>
            ) : filteredPrograms.length === 0 ? (
                <div className="py-32 text-center rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
                    <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-sm mb-6">
                        <LayersIcon size={32} className="text-slate-300" />
                    </div>
                    <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">
                        {programSearch ? 'No Programs Found' : 'No Programs Yet'}
                    </h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                        {programSearch ? 'Try a different search' : 'Create your first workout program'}
                    </p>
                    {!programSearch && (
                        <button
                            onClick={() => { setEditingProgram(null); setIsProgramBuilderOpen(true); }}
                            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
                        >
                            <PlusIcon size={14} /> Create Program
                        </button>
                    )}
                </div>
            ) : programsView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Program Name</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Created</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Tags</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Last Edit</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPrograms.map((p) => (
                                <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-900">{p.name}</div>
                                        {p.overview && <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate max-w-xs">{p.overview}</div>}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{formatDate(p.created_at)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {(p.tags ?? []).map((t: string) => (
                                                <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">{t}</span>
                                            ))}
                                            {(p.tags ?? []).length === 0 && <span className="text-slate-300 text-xs italic">-</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{timeAgo(p.updated_at)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => { setEditingProgram(p); setIsProgramBuilderOpen(true); }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-200"
                                                title="Edit"
                                            >
                                                <PencilIcon size={14} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(p.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-200"
                                                title="Delete"
                                            >
                                                <Trash2Icon size={14} />
                                            </button>
                                            <button
                                                onClick={() => { setViewingProgram(p); setIsViewModalOpen(true); }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                                                title="View"
                                            >
                                                <EyeIcon size={14} />
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
                <div className="fixed inset-0 z-[800] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl border border-slate-200 max-w-sm w-full mx-4 animate-in zoom-in-95">
                        <h3 className="text-lg font-black text-slate-900 mb-2">Delete Program?</h3>
                        <p className="text-sm font-medium text-slate-500 mb-6">This will permanently delete the program, all days, and all exercises. This cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmDeleteId(null)} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 border border-slate-200 hover:bg-slate-50">Cancel</button>
                            <button onClick={() => handleDeleteProgram(confirmDeleteId)} className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 shadow">Delete</button>
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
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 mx-1 mb-4">
                <SearchIcon size={18} className="text-slate-400 ml-2" />
                <input
                    type="text"
                    placeholder="Search for Exercise..."
                    value={librarySearch}
                    onChange={(e) => { setLibrarySearch(e.target.value); setLibraryPage(1); }}
                    className="flex-1 bg-transparent text-sm font-medium outline-none text-slate-900 placeholder:text-slate-300"
                />
                <div className="text-xs font-bold text-slate-400 mr-2 border-l border-slate-200 pl-4 h-6 flex items-center">
                    {exercisesLoading ? '...' : `${totalCount} Results`}
                </div>
            </div>

            {/* Table */}
            <div className="bg-slate-100/50 rounded-xl overflow-hidden border border-slate-200 mx-1 flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-20 shadow-sm bg-slate-100">
                            <tr className="border-b border-slate-300">
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 w-1/3">Exercise Name</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-600 text-center bg-slate-100">Target Muscle</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-600 text-center bg-slate-100">Category</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-600 text-center bg-slate-100">Info</th>
                                <th className="p-4 text-[11px] font-black uppercase tracking-widest text-slate-600 text-center w-40 bg-slate-100">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {exercisesLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">Loading exercises...</td></tr>
                            ) : dbExercises.map(ex => (
                                <tr key={ex.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-700 text-sm group-hover:text-indigo-900">{ex.name}</div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-500 border border-slate-200">
                                            {ex.body_parts?.[0] || 'General'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-wrap justify-center gap-1.5">
                                            {ex.categories && ex.categories.length > 0 ? (
                                                <>
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 text-[9px] font-black text-indigo-500 border border-indigo-100 uppercase tracking-widest">
                                                        {ex.categories[0]}
                                                    </span>
                                                    {ex.categories[1] && (
                                                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-50 text-[9px] font-black text-slate-400 border border-slate-200 uppercase tracking-widest">
                                                            {ex.categories[1]}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-slate-300 text-[10px] font-medium italic">Uncategorized</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {ex.video_url ? (
                                                <a href={ex.video_url} target="_blank" rel="noreferrer" title="Watch Video" className="w-7 h-7 rounded-lg bg-red-400 text-white flex items-center justify-center hover:bg-red-500 shadow-sm hover:shadow-md transition-all ring-1 ring-red-200">
                                                    <PlayCircleIcon size={14} fill="currentColor" className="text-white" />
                                                </a>
                                            ) : (
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-300 flex items-center justify-center cursor-not-allowed">
                                                    <VideoOffIcon size={14} />
                                                </div>
                                            )}
                                            <button onClick={() => { setViewingExerciseInfo(ex); setIsExerciseInfoModalOpen(true); }} title="Exercise Info" className="w-7 h-7 rounded-lg bg-cyan-400 text-white flex items-center justify-center hover:bg-cyan-500 shadow-sm hover:shadow-md transition-all ring-1 ring-cyan-200">
                                                <InfoIcon size={14} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
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
                                            }} className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all border border-blue-100 shadow-sm" title="Edit">
                                                <PencilIcon size={14} />
                                            </button>
                                            <button onClick={() => { setDeletingExercise(ex); setIsDeleteConfirmModalOpen(true); }} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm" title="Delete">
                                                <Trash2Icon size={14} />
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
                <div className="flex items-center justify-center gap-4 mb-4 animate-in fade-in">
                    <button
                        onClick={() => setLibraryPage(p => Math.max(1, p - 1))}
                        disabled={libraryPage === 1}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                        <ChevronLeftIcon size={16} />
                    </button>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Page <span className="text-indigo-600">{libraryPage}</span> of {totalPages}
                    </span>
                    <button
                        onClick={() => setLibraryPage(p => Math.min(totalPages, p + 1))}
                        disabled={libraryPage === totalPages}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                        <ChevronRightIcon size={16} />
                    </button>
                </div>
            )}
        </>
    );

    // ── Main render ────────────────────────────────────────────────────────

    return (
        <>
            <div className="space-y-4 animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col">
                {/* Header */}
                <div className="bg-white p-6 rounded-t-[3rem] border-b border-slate-100 shrink-0">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0 rotate-3">
                                    <DumbbellIcon size={24} />
                                </div>
                                <div className="flex items-center gap-5">
                                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Master Database</h2>
                                    {/* Tab toggle */}
                                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50 shadow-inner">
                                        <button
                                            onClick={() => { setLibraryViewMode('exercises'); setLibraryPage(1); }}
                                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${libraryViewMode === 'exercises' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Exercises
                                        </button>
                                        <button
                                            onClick={() => setLibraryViewMode('programs')}
                                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${libraryViewMode === 'programs' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            Programs
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Filters (exercises only) */}
                            {libraryViewMode === 'exercises' && (
                                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                                    {/* Alphabet Jump */}
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200/60 shadow-sm relative group shrink-0">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Jump</span>
                                        <div className="h-3 w-px bg-slate-200 mx-1"></div>
                                        <select
                                            onChange={(e) => { setAlphabetLetter(e.target.value || 'All'); setLibraryPage(1); }}
                                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none appearance-none pr-6 cursor-pointer uppercase tracking-tight"
                                            defaultValue=""
                                        >
                                            <option value="">-</option>
                                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => (
                                                <option key={char} value={char}>{char}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>

                                    {/* Category Filter */}
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200/60 shadow-sm relative group shrink-0">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Category</span>
                                        <div className="h-3 w-px bg-slate-200 mx-1"></div>
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => { setSelectedCategory(e.target.value); setLibraryPage(1); }}
                                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none appearance-none pr-6 cursor-pointer uppercase tracking-tight min-w-[80px]"
                                        >
                                            <option value="All">All</option>
                                            {exerciseCategories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>

                                    {/* Muscle Filter */}
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2 border border-slate-200/60 shadow-sm relative group shrink-0">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Muscle</span>
                                        <div className="h-3 w-px bg-slate-200 mx-1"></div>
                                        <select
                                            value={selectedMuscleGroup}
                                            onChange={(e) => { setSelectedMuscleGroup(e.target.value); setLibraryPage(1); }}
                                            className="bg-transparent text-[11px] font-bold text-slate-700 outline-none appearance-none pr-6 cursor-pointer uppercase tracking-tight min-w-[80px]"
                                        >
                                            <option value="All">All</option>
                                            {MUSCLE_GROUPS.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <ChevronDownIcon size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Add Exercise button (exercises tab only) */}
                        {libraryViewMode === 'exercises' && (
                            <div className="flex justify-end">
                                <button
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
                                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all hover:bg-black"
                                >
                                    <PlusIcon size={14} /> Add Exercise
                                </button>
                            </div>
                        )}
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
