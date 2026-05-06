// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../context/AppStateContext';
import { useSmartSearch } from '../hooks/useSmartSearch';
import { useExerciseMap } from '../hooks/useExerciseMap';
import { supabase } from '../lib/supabase';
import { MUSCLE_GROUPS, BODY_REGIONS, CLASSIFICATIONS } from '../utils/mocks';
import DidYouMeanBanner from '../components/library/DidYouMeanBanner';
import { Button } from '@/components/ui/button';
import {
    DumbbellIcon, SearchIcon, PlusIcon, XIcon, ChevronRightIcon, ArrowRightIcon,
    Trash2Icon, PencilIcon, ChevronLeftIcon, ChevronDownIcon,
    EyeIcon, InfoIcon, CheckIcon, SaveIcon,
    PlayCircleIcon, VideoOffIcon, StarIcon, ClockIcon
} from 'lucide-react';
import { ExerciseInfoModal } from '../components/library/ExerciseInfoModal';
import { EditExerciseModal } from '../components/library/EditExerciseModal';
import { DeleteExerciseModal } from '../components/library/DeleteExerciseModal';
import { ProtocolLibrary } from '../components/library/ProtocolLibrary';
import { CustomSelect } from '../components/ui/CustomSelect';

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

    const {
        personalExerciseIds, addToPersonalLibrary, removeFromPersonalLibrary,
        isInPersonalLibrary, recentlyUsedExerciseIds,
    } = useAppState();
    const { exerciseFullMap } = useExerciseMap();

    const [libraryViewMode, setLibraryViewMode] = useState<'exercises' | 'protocols'>('exercises');
    const [librarySource, setLibrarySource] = useState<'full' | 'personal'>('full');

    // Alphabet filter
    const [alphabetLetter, setAlphabetLetter] = useState('All');
    const [selectedClassification, setSelectedClassification] = useState('All');
    const [personalPage, setPersonalPage] = useState(1);

    const { data: exerciseData, isLoading: exercisesLoading } = useSmartSearch({
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
    const hasFuzzyResults = exerciseData?.hasFuzzyResults ?? false;
    const suggestions = exerciseData?.suggestions ?? [];

    // ── Personal library — fetch full exercise objects from Supabase ────
    const [personalExercises, setPersonalExercises] = useState<any[]>([]);
    useEffect(() => {
        if (!(personalExerciseIds || []).length) { setPersonalExercises([]); return; }
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('exercises')
                .select('id, name, body_parts, categories, description, video_url, equipment, options')
                .in('id', personalExerciseIds);
            if (!cancelled && data) setPersonalExercises(data);
        })();
        return () => { cancelled = true; };
    }, [personalExerciseIds]);

    const filteredPersonalExercises = useMemo(() => {
        let list = personalExercises || [];
        const q = librarySearch?.toLowerCase().trim();
        if (q) list = list.filter(ex => ex.name?.toLowerCase().includes(q));
        if (selectedCategory && selectedCategory !== 'All') list = list.filter(ex => ex.categories?.[0] === selectedCategory);
        if (selectedClassification && selectedClassification !== 'All') list = list.filter(ex => ex.categories?.[1] === selectedClassification);
        if (selectedMuscleGroup && selectedMuscleGroup !== 'All') list = list.filter(ex => ex.body_parts?.includes(selectedMuscleGroup));
        if (alphabetLetter && alphabetLetter !== 'All') list = list.filter(ex => ex.name?.[0]?.toUpperCase() === alphabetLetter);
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [personalExercises, librarySearch, selectedCategory, selectedClassification, selectedMuscleGroup, alphabetLetter]);

    const personalTotalPages = Math.max(1, Math.ceil(filteredPersonalExercises.length / ITEMS_PER_PAGE));
    const pagedPersonalExercises = filteredPersonalExercises.slice((personalPage - 1) * ITEMS_PER_PAGE, personalPage * ITEMS_PER_PAGE);

    // Recently used exercises not already in personal library
    const [recentNotInPersonal, setRecentNotInPersonal] = useState<any[]>([]);
    useEffect(() => {
        if (!(recentlyUsedExerciseIds || []).length) { setRecentNotInPersonal([]); return; }
        const personalSet = new Set(personalExerciseIds || []);
        const needed = recentlyUsedExerciseIds.filter(id => !personalSet.has(id)).slice(0, 10);
        if (!needed.length) { setRecentNotInPersonal([]); return; }
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from('exercises')
                .select('id, name, body_parts, categories')
                .in('id', needed);
            if (!cancelled && data) setRecentNotInPersonal(data);
        })();
        return () => { cancelled = true; };
    }, [recentlyUsedExerciseIds, personalExerciseIds]);

    const handleTogglePersonal = (exId: string) => {
        if (isInPersonalLibrary(exId)) {
            removeFromPersonalLibrary(exId);
            showToast('Removed from My Library', 'info');
        } else {
            addToPersonalLibrary(exId);
            showToast('Added to My Library', 'success');
        }
    };

    // ── Personal Library view ─────────────────────────────────────────────

    const renderPersonalLibrary = () => (
        <>
            {/* Search Bar */}
            <div className="bg-white dark:bg-[#132338] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm flex items-center gap-3 mb-4">
                <SearchIcon size={16} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                <input
                    type="text"
                    placeholder="Search your library..."
                    value={librarySearch}
                    onChange={(e) => { setLibrarySearch(e.target.value); setPersonalPage(1); }}
                    className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400"
                />
                <div className="text-xs text-slate-400 dark:text-[#64748B] border-l border-slate-200 dark:border-[#243A58] pl-3 shrink-0">
                    {filteredPersonalExercises.length} of {(personalExerciseIds || []).length} saved
                </div>
            </div>

            {/* Recently Used Section */}
            {recentNotInPersonal.length > 0 && !librarySearch && (
                <div className="bg-amber-50/50 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ClockIcon size={13} className="text-amber-600" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Recently Used</span>
                        <span className="text-[9px] text-amber-500">Tap to add to your library</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {recentNotInPersonal.map(ex => (
                            <button
                                key={ex.id}
                                onClick={() => { addToPersonalLibrary(ex.id); showToast(`Added ${ex.name} to My Library`, 'success'); }}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-[#132338] border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs font-medium text-slate-700 dark:text-[#E2E8F0] hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/25 dark:bg-amber-900/20 transition-all group"
                            >
                                <span className="truncate max-w-[200px]">{ex.name}</span>
                                <PlusIcon size={11} className="text-amber-500 shrink-0 group-hover:text-amber-700 dark:text-amber-400" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Table */}
            {(personalExerciseIds || []).length === 0 ? (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm py-16 flex flex-col items-center gap-3">
                    <StarIcon size={32} className="text-slate-200" />
                    <p className="text-sm text-slate-400 dark:text-[#64748B]">Your personal library is empty</p>
                    <p className="text-xs text-slate-300 dark:text-[#475569]">Star exercises from the Full Library to add them here</p>
                    <button onClick={() => setLibrarySource('full')} className="mt-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/25 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 dark:bg-indigo-900/35 transition-all">
                        Browse Full Library
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#132338] rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse relative">
                            <thead className="sticky top-0 z-20">
                                <tr className="border-b border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]">
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Exercise</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center">Target Muscle</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center">Body Region</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center">Classification</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center">Info</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center w-36">Manage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48] bg-white dark:bg-[#132338]">
                                {pagedPersonalExercises.length === 0 ? (
                                    <tr><td colSpan={6} className="py-10 text-center">
                                        <div className="text-sm text-slate-400 dark:text-[#64748B]">No exercises match your filters</div>
                                    </td></tr>
                                ) : pagedPersonalExercises.map(ex => (
                                    <tr key={ex.id} className="group hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-700 dark:text-[#E2E8F0] text-sm group-hover:text-indigo-700 dark:text-indigo-400">{ex.name}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2D48] text-xs font-medium text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-[#243A58]">
                                                {ex.body_parts?.[0] || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {ex.categories?.[0] ? (
                                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/25 text-xs font-medium text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
                                                    {ex.categories[0]}
                                                </span>
                                            ) : <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {ex.categories?.[1] && ex.categories[1] !== 'Unsorted' ? (
                                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/25 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
                                                    {ex.categories[1]}
                                                </span>
                                            ) : <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {ex.video_url ? (
                                                    <a href={ex.video_url} target="_blank" rel="noreferrer" title="Watch Video" className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:border-red-900/40">
                                                        <PlayCircleIcon size={13} fill="currentColor" />
                                                    </a>
                                                ) : (
                                                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1A2D48] text-slate-300 dark:text-[#475569] flex items-center justify-center cursor-not-allowed">
                                                        <VideoOffIcon size={13} />
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => { setViewingExerciseInfo(ex); setIsExerciseInfoModalOpen(true); }}
                                                    title="Exercise Info"
                                                    className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/25 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all border border-indigo-100 dark:border-indigo-800/40"
                                                >
                                                    <InfoIcon size={13} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleTogglePersonal(ex.id)}
                                                    className="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 transition-all"
                                                    title="Remove from My Library">
                                                    <StarIcon size={13} fill="currentColor" />
                                                </button>
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
                                                }} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:bg-indigo-900/25 transition-all" title="Edit">
                                                    <PencilIcon size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {personalTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 py-3">
                    <button
                        onClick={() => setPersonalPage(p => Math.max(1, p - 1))}
                        disabled={personalPage === 1}
                        className="p-2 rounded-lg bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
                    >
                        <ChevronLeftIcon size={15} />
                    </button>
                    <span className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                        Page <span className="text-amber-600 font-semibold">{personalPage}</span> of {personalTotalPages}
                    </span>
                    <button
                        onClick={() => setPersonalPage(p => Math.min(personalTotalPages, p + 1))}
                        disabled={personalPage === personalTotalPages}
                        className="p-2 rounded-lg bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
                    >
                        <ChevronRightIcon size={15} />
                    </button>
                </div>
            )}
        </>
    );

    // ── Exercises view ─────────────────────────────────────────────────────

    const renderExercises = () => (
        <>
            {/* Search Bar */}
            <div className="bg-white dark:bg-[#132338] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm flex items-center gap-3 mb-4">
                <SearchIcon size={16} className="text-slate-400 dark:text-[#64748B] shrink-0" />
                <input
                    type="text"
                    placeholder="Search exercises..."
                    value={librarySearch}
                    onChange={(e) => { setLibrarySearch(e.target.value); setLibraryPage(1); }}
                    className="flex-1 bg-transparent text-sm outline-none text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400"
                />
                <div className="text-xs text-slate-400 dark:text-[#64748B] border-l border-slate-200 dark:border-[#243A58] pl-3 shrink-0">
                    {exercisesLoading ? '...' : `${totalCount} results`}
                </div>
            </div>

            {/* Did you mean? banner */}
            {hasFuzzyResults && suggestions.length > 0 && (
                <DidYouMeanBanner
                    suggestions={suggestions}
                    onSelect={(name) => { setLibrarySearch(name); setLibraryPage(1); }}
                />
            )}

            {/* Table */}
            <div className="bg-white dark:bg-[#132338] rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse relative">
                        <thead className="sticky top-0 z-20">
                            <tr className="border-b border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]">
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Exercise</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center">Target Muscle</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center">Body Region</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center">Classification</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center">Info</th>
                                <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8] text-center w-36">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48] bg-white dark:bg-[#132338]">
                            {exercisesLoading ? (
                                <>
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <tr key={i}>
                                            <td className="px-4 py-3"><div className="h-4 w-32 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" /></td>
                                            <td className="px-4 py-3 text-center"><div className="h-5 w-16 bg-slate-100 dark:bg-[#1A2D48] rounded-md animate-pulse mx-auto" /></td>
                                            <td className="px-4 py-3 text-center"><div className="h-5 w-20 bg-slate-50 dark:bg-[#0F1C30] rounded-full animate-pulse mx-auto" /></td>
                                            <td className="px-4 py-3 text-center"><div className="h-5 w-16 bg-slate-50 dark:bg-[#0F1C30] rounded-full animate-pulse mx-auto" /></td>
                                            <td className="px-4 py-3 text-center"><div className="h-4 w-8 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse mx-auto" /></td>
                                            <td className="px-4 py-3 text-center"><div className="h-6 w-20 bg-slate-50 dark:bg-[#0F1C30] rounded-lg animate-pulse mx-auto" /></td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={6} className="py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                                                <span className="text-xs font-medium text-slate-400 dark:text-[#64748B]">Loading exercise library...</span>
                                            </div>
                                        </td>
                                    </tr>
                                </>
                            ) : dbExercises.length === 0 ? (
                                <tr><td colSpan={6} className="py-10 text-center">
                                    <div className="text-sm text-slate-400 dark:text-[#64748B]">No exercises found{librarySearch ? ` for "${librarySearch}"` : ''}</div>
                                    {librarySearch && <div className="text-xs text-slate-300 dark:text-[#475569] mt-1">Try a different spelling or browse by category</div>}
                                </td></tr>
                            ) : dbExercises.map(ex => (
                                <tr key={ex.id} className="group hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-700 dark:text-[#E2E8F0] text-sm group-hover:text-indigo-700 dark:text-indigo-400">{ex.name}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2D48] text-xs font-medium text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-[#243A58]">
                                            {ex.body_parts?.[0] || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {ex.categories?.[0] ? (
                                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/25 text-xs font-medium text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
                                                {ex.categories[0]}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {ex.categories?.[1] && ex.categories[1] !== 'Unsorted' ? (
                                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/25 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
                                                {ex.categories[1]}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            {ex.video_url ? (
                                                <a href={ex.video_url} target="_blank" rel="noreferrer" title="Watch Video" className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:border-red-900/40">
                                                    <PlayCircleIcon size={13} fill="currentColor" />
                                                </a>
                                            ) : (
                                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1A2D48] text-slate-300 dark:text-[#475569] flex items-center justify-center cursor-not-allowed">
                                                    <VideoOffIcon size={13} />
                                                </div>
                                            )}
                                            <button
                                                onClick={() => { setViewingExerciseInfo(ex); setIsExerciseInfoModalOpen(true); }}
                                                title="Exercise Info"
                                                className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/25 text-indigo-500 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all border border-indigo-100 dark:border-indigo-800/40"
                                            >
                                                <InfoIcon size={13} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleTogglePersonal(ex.id)}
                                                className={`p-1.5 rounded-lg transition-all ${isInPersonalLibrary(ex.id) ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 dark:text-[#475569] hover:text-amber-400'}`}
                                                title={isInPersonalLibrary(ex.id) ? 'Remove from My Library' : 'Add to My Library'}>
                                                <StarIcon size={13} fill={isInPersonalLibrary(ex.id) ? 'currentColor' : 'none'} />
                                            </button>
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
                                            }} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:bg-indigo-900/25 transition-all" title="Edit">
                                                <PencilIcon size={13} />
                                            </button>
                                            <button onClick={() => { setDeletingExercise(ex); setIsDeleteConfirmModalOpen(true); }} className="p-1.5 rounded-lg text-slate-400 dark:text-[#64748B] hover:text-red-500 hover:bg-red-50 transition-all" title="Delete">
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
                        className="p-2 rounded-lg bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
                    >
                        <ChevronLeftIcon size={15} />
                    </button>
                    <span className="text-xs font-medium text-slate-500 dark:text-[#94A3B8]">
                        Page <span className="text-indigo-600 dark:text-indigo-300 font-semibold">{libraryPage}</span> of {totalPages}
                    </span>
                    <button
                        onClick={() => setLibraryPage(p => Math.min(totalPages, p + 1))}
                        disabled={libraryPage === totalPages}
                        className="p-2 rounded-lg bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#94A3B8] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
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
                <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm shrink-0">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <DumbbellIcon size={18} />
                                </div>
                                <div className="flex items-center gap-4">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Library</h2>
                                    <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                        <button
                                            onClick={() => { setLibraryViewMode('exercises'); setLibrarySource('full'); setLibraryPage(1); }}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'exercises' && librarySource === 'full' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-700'}`}
                                        >
                                            Exercises
                                        </button>
                                        <button
                                            data-tour="library-personal"
                                            onClick={() => { setLibraryViewMode('exercises'); setLibrarySource('personal'); setPersonalPage(1); }}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'exercises' && librarySource === 'personal' ? 'bg-white dark:bg-[#132338] text-amber-600 shadow-sm' : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-700'}`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <StarIcon size={11} fill="currentColor" />
                                                My Library
                                                {(personalExerciseIds || []).length > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[8px] font-bold">{(personalExerciseIds || []).length}</span>
                                                )}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setLibraryViewMode('protocols')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'protocols' ? 'bg-white dark:bg-[#132338] text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-700'}`}
                                        >
                                            Protocols
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Filters + Add button row */}
                            {libraryViewMode === 'exercises' && (
                            <div data-tour="library-search" className="flex items-center gap-2 flex-wrap">
                                        {/* Body Region Filter */}
                                        <CustomSelect
                                            value={selectedCategory}
                                            onChange={(e) => { setSelectedCategory(e.target.value); setLibraryPage(1); }}
                                            variant="filter" size="xs" prefixLabel="Region"
                                        >
                                            <option value="All">All</option>
                                            {BODY_REGIONS.filter(r => r !== 'Unsorted').map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </CustomSelect>

                                        {/* Classification Filter */}
                                        <CustomSelect
                                            value={selectedClassification}
                                            onChange={(e) => { setSelectedClassification(e.target.value); setLibraryPage(1); }}
                                            variant="filter" size="xs" prefixLabel="Class"
                                        >
                                            <option value="All">All</option>
                                            {CLASSIFICATIONS.filter(c => c !== 'Unsorted').map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </CustomSelect>

                                        {/* Muscle Filter */}
                                        <CustomSelect
                                            value={selectedMuscleGroup}
                                            onChange={(e) => { setSelectedMuscleGroup(e.target.value); setLibraryPage(1); }}
                                            variant="filter" size="xs" prefixLabel="Muscle"
                                        >
                                            <option value="All">All</option>
                                            {MUSCLE_GROUPS.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </CustomSelect>

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

                {/* A–Z Letter Strip */}
                {libraryViewMode === 'exercises' && (
                    <div className="bg-white dark:bg-[#132338] px-4 py-2 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm shrink-0 flex items-center gap-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#64748B] shrink-0">A–Z</span>
                        <div className="h-3 w-px bg-slate-200 dark:bg-[#243A58] shrink-0" />
                        <div className="flex flex-wrap gap-1">
                            <button
                                onClick={() => { setAlphabetLetter('All'); setLibraryPage(1); setPersonalPage(1); }}
                                className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${alphabetLetter === 'All' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#94A3B8] hover:bg-indigo-100 dark:hover:bg-indigo-900/40 dark:bg-indigo-900/35 hover:text-indigo-700 dark:text-indigo-400 border border-slate-200 dark:border-[#243A58]'}`}
                            >All</button>
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                                <button
                                    key={l}
                                    onClick={() => { setAlphabetLetter(alphabetLetter === l ? 'All' : l); setLibraryPage(1); setPersonalPage(1); }}
                                    className={`w-6 h-6 rounded text-[9px] font-bold transition-all ${alphabetLetter === l ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#94A3B8] hover:bg-indigo-100 dark:hover:bg-indigo-900/40 dark:bg-indigo-900/35 hover:text-indigo-700 dark:text-indigo-400 border border-slate-200 dark:border-[#243A58]'}`}
                                >{l}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content */}
                {libraryViewMode === 'protocols' ? (
                    <ProtocolLibrary />
                ) : librarySource === 'personal' ? renderPersonalLibrary() : renderExercises()}
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
