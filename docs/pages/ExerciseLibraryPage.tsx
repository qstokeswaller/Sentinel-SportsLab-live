// @ts-nocheck
import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import { useExercises } from '../hooks/useExercises';
import { MUSCLE_GROUPS, BODY_REGIONS, CLASSIFICATIONS } from '../utils/mocks';
import { Button } from '@/components/ui/button';
import {
    DumbbellIcon, SearchIcon, PlusIcon, XIcon, ChevronRightIcon, ArrowRightIcon,
    Trash2Icon, PencilIcon, ChevronLeftIcon, ChevronDownIcon,
    EyeIcon, InfoIcon, CheckIcon, SaveIcon,
    PlayCircleIcon, VideoOffIcon
} from 'lucide-react';
import { ExerciseInfoModal } from '../components/library/ExerciseInfoModal';
import { EditExerciseModal } from '../components/library/EditExerciseModal';
import { DeleteExerciseModal } from '../components/library/DeleteExerciseModal';
import { ProtocolLibrary } from '../components/library/ProtocolLibrary';

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

    const [libraryViewMode, setLibraryViewMode] = useState<'exercises' | 'protocols'>('exercises');

    // Alphabet filter
    const [alphabetLetter, setAlphabetLetter] = useState('All');
    const [selectedClassification, setSelectedClassification] = useState('All');

    const { data: exerciseData, isLoading: exercisesLoading } = useExercises({
        search: librarySearch,
        category: selectedCategory,
        classification: selectedClassification,
        muscleGroup: selectedMuscleGroup,
        alphabetLetter,
        page: libraryPage,
        pageSize: ITEMS_PER_PAGE,
    });

    const dbExercises = exerciseData?.exercises ?? [];
    const totalPages = exerciseData?.totalPages ?? 1;
    const totalCount = exerciseData?.total ?? 0;

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
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Exercise</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Target Muscle</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Body Region</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Classification</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center">Info</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 text-center w-28">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {exercisesLoading ? (
                                <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">Loading exercises...</td></tr>
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
                                        {ex.categories?.[0] ? (
                                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 text-xs font-medium text-indigo-600 border border-indigo-100">
                                                {ex.categories[0]}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {ex.categories?.[1] ? (
                                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-xs font-medium text-emerald-600 border border-emerald-100">
                                                {ex.categories[1]}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 text-xs">—</span>
                                        )}
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
                                    <h2 className="text-lg font-semibold text-slate-900">Library</h2>
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                        <button
                                            onClick={() => { setLibraryViewMode('exercises'); setLibraryPage(1); }}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'exercises' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Exercises
                                        </button>
                                        <button
                                            onClick={() => setLibraryViewMode('protocols')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'protocols' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Protocols
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Filters + Add button row */}
                            {libraryViewMode === 'exercises' && (
                            <div className="flex items-center gap-2 flex-wrap">
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

                                        {/* Body Region Filter */}
                                        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                                            <span className="text-xs font-medium text-slate-400">Region</span>
                                            <div className="h-3 w-px bg-slate-200" />
                                            <select
                                                value={selectedCategory}
                                                onChange={(e) => { setSelectedCategory(e.target.value); setLibraryPage(1); }}
                                                className="bg-transparent text-xs font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer min-w-[60px]"
                                            >
                                                <option value="All">All</option>
                                                {BODY_REGIONS.filter(r => r !== 'Unsorted').map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                            <ChevronDownIcon size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>

                                        {/* Classification Filter */}
                                        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                                            <span className="text-xs font-medium text-slate-400">Class</span>
                                            <div className="h-3 w-px bg-slate-200" />
                                            <select
                                                value={selectedClassification}
                                                onChange={(e) => { setSelectedClassification(e.target.value); setLibraryPage(1); }}
                                                className="bg-transparent text-xs font-medium text-slate-700 outline-none appearance-none pr-5 cursor-pointer min-w-[60px]"
                                            >
                                                <option value="All">All</option>
                                                {CLASSIFICATIONS.filter(c => c !== 'Unsorted').map(c => (
                                                    <option key={c} value={c}>{c}</option>
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
                            </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                {libraryViewMode === 'protocols' ? (
                    <ProtocolLibrary />
                ) : renderExercises()}
            </div>

            {/* Exercise Modals */}
            <ExerciseInfoModal
                exercise={viewingExerciseInfo}
                isOpen={isExerciseInfoModalOpen}
                onClose={() => { setIsExerciseInfoModalOpen(false); setViewingExerciseInfo(null); }}
            />
            <EditExerciseModal
                isOpen={isEditLiftModalOpen}
                onClose={() => { setIsEditLiftModalOpen(false); setEditingExercise(null); }}
                exercise={editingExercise}
                initialForm={newExercise}
                showToast={showToast}
            />
            <DeleteExerciseModal
                exercise={deletingExercise}
                isOpen={isDeleteConfirmModalOpen}
                onClose={() => { setIsDeleteConfirmModalOpen(false); setDeletingExercise(null); }}
                showToast={showToast}
            />
        </>
    );
};
