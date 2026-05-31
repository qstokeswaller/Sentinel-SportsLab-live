// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppState } from '../context/AppStateContext';
import { useSmartSearch } from '../hooks/useSmartSearch';

import { useCollections } from '../hooks/useCollections';
import { supabase } from '../lib/supabase';
import { MUSCLE_GROUPS, BODY_REGIONS, CLASSIFICATIONS, MOVEMENT_PATTERNS, EQUIPMENT_LIST, FORCE_TYPES } from '../utils/mocks';
import DidYouMeanBanner from '../components/library/DidYouMeanBanner';
import { Button } from '@/components/ui/button';
import {
    DumbbellIcon, SearchIcon, PlusIcon, XIcon,
    ChevronRightIcon, ChevronLeftIcon,
    Trash2Icon, PencilIcon, StarIcon, ClockIcon,
    FolderIcon, FolderPlusIcon, CheckIcon, SlidersHorizontalIcon,
    ArrowLeftIcon, MoreHorizontalIcon,
    RotateCcwIcon,
} from 'lucide-react';
import { useResetExerciseToDefault } from '../hooks/useExercises';
import { ExerciseDetailPanel, ExerciseDetailEmptyState } from '../components/library/ExerciseDetailPanel';
import { ExerciseInfoModal } from '../components/library/ExerciseInfoModal';
import { EditExerciseModal } from '../components/library/EditExerciseModal';
import { DeleteExerciseModal } from '../components/library/DeleteExerciseModal';
import { ProtocolLibrary } from '../components/library/ProtocolLibrary';
import { CustomSelect } from '../components/ui/CustomSelect';

// ── CNS dots ─────────────────────────────────────────────────────────────────

const LEVEL_DOTS: Record<string, number> = { Low: 1, Moderate: 2, High: 3, 'Very High': 4 };
const DOT_COLORS: Record<string, string> = {
    Low: 'bg-emerald-500', Moderate: 'bg-amber-400', High: 'bg-orange-500', 'Very High': 'bg-red-500',
};

function CnsDots({ value }: { value: string | null }) {
    if (!value) return <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>;
    const filled = LEVEL_DOTS[value] ?? 0;
    const color = DOT_COLORS[value] ?? 'bg-slate-400';
    return (
        <span className="flex items-center gap-0.5 justify-center">
            {[1, 2, 3, 4].map(i => (
                <span key={i} className={`w-2 h-2 rounded-full ${i <= filled ? color : 'bg-slate-200 dark:bg-[#243A58]'}`} />
            ))}
        </span>
    );
}

// ── Collection colour map ─────────────────────────────────────────────────────

const COLLECTION_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-500/15',   border: 'border-indigo-200 dark:border-indigo-500/30',   text: 'text-indigo-700 dark:text-indigo-300',  dot: 'bg-indigo-500' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-500/15',       border: 'border-blue-200 dark:border-blue-500/30',       text: 'text-blue-700 dark:text-blue-300',      dot: 'bg-blue-500' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/15', border: 'border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-500/15',     border: 'border-amber-200 dark:border-amber-500/30',     text: 'text-amber-700 dark:text-amber-400',    dot: 'bg-amber-500' },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-500/15',       border: 'border-rose-200 dark:border-rose-500/30',       text: 'text-rose-700 dark:text-rose-400',      dot: 'bg-rose-500' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-500/15',   border: 'border-violet-200 dark:border-violet-500/30',   text: 'text-violet-700 dark:text-violet-300',  dot: 'bg-violet-500' },
    teal:    { bg: 'bg-teal-50 dark:bg-teal-500/15',       border: 'border-teal-200 dark:border-teal-500/30',       text: 'text-teal-700 dark:text-teal-400',      dot: 'bg-teal-500' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-500/15',   border: 'border-orange-200 dark:border-orange-500/30',   text: 'text-orange-700 dark:text-orange-400',  dot: 'bg-orange-500' },
};
const COLOR_KEYS = Object.keys(COLLECTION_COLORS);
const getColColor = (color: string) => COLLECTION_COLORS[color] ?? COLLECTION_COLORS.indigo;

// ── New Collection modal ──────────────────────────────────────────────────────

function NewCollectionModal({ onClose, onSave }: { onClose: () => void; onSave: (name: string, color: string, description: string) => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('indigo');
    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-sm shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-[#E2E8F0] text-sm">New Collection</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors"><XIcon size={14} /></button>
                </div>
                <div className="px-5 py-4 space-y-4">
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1 block">Collection Name *</label>
                        <input
                            autoFocus type="text" value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onSave(name.trim(), color, description); }}
                            placeholder="e.g. Lower Body Power"
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400 transition-all"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1 block">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            placeholder="What is this collection for? (optional)"
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400 transition-all resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-2 block">Colour</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_KEYS.map(c => (
                                <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full ${getColColor(c).dot} border-2 transition-all ${color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`} />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 dark:border-[#1A2D48] flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" onClick={() => name.trim() && onSave(name.trim(), color, description)} disabled={!name.trim()}>Create Collection</Button>
                </div>
            </div>
        </div>
    );
}

// ── Shared table header ───────────────────────────────────────────────────────

function ExerciseTableHeader({ showCheckbox = false }: { showCheckbox?: boolean }) {
    return (
        <thead className="sticky top-0 z-20">
            <tr className="border-b border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]">
                {showCheckbox && <th className="w-8 px-3 py-2" />}
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Exercise</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] text-center">Movement</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] text-center">Primary Muscle</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] text-center">Classification</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] text-center">CNS Demand</th>
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] text-center w-24">Manage</th>
            </tr>
        </thead>
    );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
    if (total <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-2 py-1.5 shrink-0">
            <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
                className="p-1 rounded bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                <ChevronLeftIcon size={12} />
            </button>
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#CBD5E1]">
                Page <span className="text-indigo-600 dark:text-indigo-300 font-semibold">{page}</span> of {total}
            </span>
            <button onClick={() => onChange(Math.min(total, page + 1))} disabled={page === total}
                className="p-1 rounded bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                <ChevronRightIcon size={12} />
            </button>
        </div>
    );
}

// ── Exercise row ──────────────────────────────────────────────────────────────

interface ExerciseRowProps {
    ex: any;
    showDelete?: boolean;
    onRemoveFromCollection?: () => void;
    isSelected: boolean;
    onSelect: (ex: any) => void;
    isInLibrary: (id: string) => boolean;
    onTogglePersonal: (id: string) => void;
    onEdit: (ex: any) => void;
    onDelete: (ex: any) => void;
    onReset?: (ex: any) => void;
    bulkMode?: boolean;
    isChecked?: boolean;
    onToggleCheck?: () => void;
}

function ExerciseRow({
    ex, showDelete = false, onRemoveFromCollection,
    isSelected, onSelect, isInLibrary, onTogglePersonal, onEdit, onDelete, onReset,
    bulkMode = false, isChecked = false, onToggleCheck,
}: ExerciseRowProps) {
    const isCustom = !!ex.__custom;
    const isOverride = isCustom && !!ex.__original_id;
    const isOrgNew = isCustom && !ex.__original_id;
    const inLib = isInLibrary(ex.id);
    const handleClick = () => {
        if (bulkMode) { onToggleCheck?.(); } else { onSelect(ex); }
    };
    return (
        <tr
            onClick={handleClick}
            className={`group cursor-pointer ${
                bulkMode && isChecked
                    ? 'bg-indigo-50/70 dark:bg-indigo-500/15'
                    : isSelected && !bulkMode
                        ? 'bg-indigo-100/60 dark:bg-indigo-500/20 shadow-[inset_0_0_0_2px_#6366f1] dark:shadow-[inset_0_0_0_2px_#818cf8]'
                        : 'hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
            }`}
        >
            {/* Checkbox cell (bulk mode) */}
            {bulkMode && (
                <td className="px-3 py-2 w-8" onClick={e => { e.stopPropagation(); onToggleCheck?.(); }}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-[#365880] bg-white dark:bg-[#0F1C30]'}`}>
                        {isChecked && <CheckIcon size={10} className="text-white" />}
                    </div>
                </td>
            )}
            {/* Exercise name */}
            <td className="px-3 py-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <div className={`font-semibold text-xs leading-snug ${isSelected && !bulkMode ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-[#E2E8F0]'}`}>
                        {ex.name}
                    </div>
                    {isCustom && (
                        <span
                            title={isOverride ? 'Customised — your org has edited this Platform Library exercise' : 'Your organisation’s own exercise'}
                            className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/30"
                        >
                            {isOverride ? 'Customised' : 'Custom'}
                        </span>
                    )}
                </div>
                {(ex.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-1">
                        {ex.tags.map((t: string) => (
                            <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-600 dark:text-[#CBD5E1]">{t}</span>
                        ))}
                    </div>
                )}
            </td>
            <td className="px-3 py-2 text-center">
                {ex.options?.movementPattern && ex.options.movementPattern !== 'Unsorted' ? (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-[11px] font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                        {ex.options.movementPattern}
                    </span>
                ) : <span className="text-slate-300 dark:text-[#475569] text-[11px]">—</span>}
            </td>
            <td className="px-3 py-2 text-center">
                {ex.body_parts?.[0] ? (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/15 text-[11px] font-medium text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
                        {ex.body_parts[0]}
                    </span>
                ) : <span className="text-slate-300 dark:text-[#475569] text-[11px]">—</span>}
            </td>
            <td className="px-3 py-2 text-center">
                {ex.categories?.[1] && ex.categories[1] !== 'Unsorted' ? (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-[11px] font-medium text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/30">
                        {ex.categories[1]}
                    </span>
                ) : <span className="text-slate-300 dark:text-[#475569] text-[11px]">—</span>}
            </td>
            <td className="px-3 py-2 text-center">
                <CnsDots value={ex.options?.cnsDemand ?? null} />
            </td>
            <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                {!bulkMode && (
                    <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onTogglePersonal(ex.id)}
                            className={`p-1.5 rounded-lg transition-all ${inLib ? 'text-amber-500' : 'text-slate-300 dark:text-[#475569] hover:text-amber-400'}`}
                            title={inLib ? 'Remove from My Library' : 'Add to My Library'}
                        >
                            <StarIcon size={13} fill={inLib ? 'currentColor' : 'none'} />
                        </button>
                        {/* Edit is allowed on every row — platform-default edits insert an org override. */}
                        <button
                            onClick={() => onEdit(ex)}
                            className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/25 transition-all"
                            title={isCustom ? 'Edit your version' : 'Customise for your organisation'}
                        >
                            <PencilIcon size={13} />
                        </button>
                        {/* Reset is available for overrides (deletes the override row → default reappears). */}
                        {isOverride && onReset && (
                            <button
                                onClick={() => onReset(ex)}
                                className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-all"
                                title="Reset to Platform Library default"
                            >
                                <RotateCcwIcon size={13} />
                            </button>
                        )}
                        {/* Delete is only for org-new exercises (platform defaults can't be deleted). */}
                        {showDelete && isOrgNew && (
                            <button onClick={() => onDelete(ex)} className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15 dark:hover:text-red-400 transition-all" title="Delete">
                                <Trash2Icon size={13} />
                            </button>
                        )}
                        {onRemoveFromCollection && (
                            <button onClick={onRemoveFromCollection} className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15 dark:hover:text-red-400 transition-all" title="Remove from collection">
                                <XIcon size={13} />
                            </button>
                        )}
                    </div>
                )}
            </td>
        </tr>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const ExerciseLibraryPage = () => {
    const {
        librarySearch, setLibrarySearch,
        selectedCategory, setSelectedCategory, selectedMuscleGroup, setSelectedMuscleGroup,
        libraryPage, setLibraryPage, ITEMS_PER_PAGE,
        newExercise, setNewExercise, editingExercise, setEditingExercise,
        isExerciseInfoModalOpen, setIsExerciseInfoModalOpen,
        viewingExerciseInfo, setViewingExerciseInfo,
        deletingExercise, setDeletingExercise,
        isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen,
        isEditLiftModalOpen, setIsEditLiftModalOpen,
        showToast,
    } = useAppState();

    const {
        personalExerciseIds, addToPersonalLibrary, removeFromPersonalLibrary,
        isInPersonalLibrary, recentlyUsedExerciseIds,
    } = useAppState();

    const {
        collections, createCollection, deleteCollection, renameCollection,
        addExerciseToCollection, addManyToCollection, removeExerciseFromCollection, isInCollection,
    } = useCollections();

    // ── View state ────────────────────────────────────────────────────────
    const [libraryViewMode, setLibraryViewMode] = useState<'exercises' | 'myLibrary' | 'protocols'>('exercises');
    const [selectedExercise, setSelectedExercise] = useState<any | null>(null);
    const [alphabetLetter, setAlphabetLetter] = useState('All');
    const [selectedClassification, setSelectedClassification] = useState('All');
    const [personalPage, setPersonalPage] = useState(1);

    // ── Extra client-side filters ─────────────────────────────────────────
    const [filterMovement, setFilterMovement] = useState('All');
    const [filterEquipment, setFilterEquipment] = useState('All');
    const [filterForceType, setFilterForceType] = useState('All');
    // Filter the exercise list by a saved collection (null = no filter)
    const [filterCollectionId, setFilterCollectionId] = useState<string | null>(null);
    // Restrict view to org-customised rows (overrides + org-new) only
    const [customOnly, setCustomOnly] = useState(false);
    const [showMoreFilters, setShowMoreFilters] = useState(false);

    const resetExercise = useResetExerciseToDefault();
    const handleResetExercise = (ex: any) => {
        resetExercise.mutate(
            { id: ex.id, __override_id: ex.__override_id ?? null },
            {
                onSuccess: () => showToast(`${ex.name} reset to Platform Library default`, 'success'),
                onError: (err: any) => showToast(err?.message || 'Failed to reset exercise', 'error'),
            }
        );
    };

    // ── My Library sub-state ──────────────────────────────────────────────
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
    const [showNewCollectionModal, setShowNewCollectionModal] = useState(false);
    const [collectionMenuId, setCollectionMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // ── Bulk select (add to collection) ──────────────────────────────────
    const [bulkSelectMode, setBulkSelectMode] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
    const [bulkTargetCollectionId, setBulkTargetCollectionId] = useState<string>('');

    const toggleBulkId = (id: string) => {
        setBulkSelectedIds(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const exitBulkMode = () => {
        setBulkSelectMode(false);
        setBulkSelectedIds(new Set());
        setBulkTargetCollectionId('');
    };

    const handleBulkAddToCollection = () => {
        if (!bulkTargetCollectionId || bulkSelectedIds.size === 0) return;
        const col = collections.find(c => c.id === bulkTargetCollectionId);
        const count = bulkSelectedIds.size;
        addManyToCollection.mutate(
            { collectionId: bulkTargetCollectionId, exerciseIds: [...bulkSelectedIds] },
            { onSuccess: () => showToast(`${count} exercise${count !== 1 ? 's' : ''} added to "${col?.name ?? 'collection'}"`, 'success') }
        );
        exitBulkMode();
    };

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCollectionMenuId(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Smart search (server) ─────────────────────────────────────────────
    const { data: exerciseData, isLoading: exercisesLoading } = useSmartSearch({
        search: librarySearch,
        category: selectedCategory,
        classification: selectedClassification,
        muscleGroup: selectedMuscleGroup,
        alphabetLetter,
        page: libraryPage,
        pageSize: ITEMS_PER_PAGE,
        customOnly,
    });

    const dbExercises = exerciseData?.exercises ?? [];
    const totalPages = exerciseData?.totalPages ?? 1;
    const totalCount = exerciseData?.total ?? 0;
    const hasFuzzyResults = exerciseData?.hasFuzzyResults ?? false;
    const suggestions = exerciseData?.suggestions ?? [];

    // Pre-compute the active collection's exercise ID set so the filter is O(1) per row
    const filterCollectionSet = useMemo(() => {
        if (!filterCollectionId) return null;
        const col = collections.find(c => c.id === filterCollectionId);
        return col ? new Set(col.exercise_ids) : null;
    }, [filterCollectionId, collections]);

    const filteredExercises = useMemo(() => {
        let list = dbExercises;
        if (filterMovement !== 'All') list = list.filter(ex => ex.options?.movementPattern === filterMovement);
        if (filterEquipment !== 'All') list = list.filter(ex => ex.equipment?.includes(filterEquipment));
        if (filterForceType !== 'All') list = list.filter(ex => ex.options?.forceType === filterForceType);
        if (filterCollectionSet) list = list.filter(ex => filterCollectionSet.has(ex.id));
        // customOnly is now applied server-side via smart_exercise_search.p_custom_only, no client filter.
        return list;
    }, [dbExercises, filterMovement, filterEquipment, filterForceType, filterCollectionSet]);

    const hasActiveFilters = selectedCategory !== 'All' || selectedClassification !== 'All' || selectedMuscleGroup !== 'All'
        || filterMovement !== 'All' || filterEquipment !== 'All' || filterForceType !== 'All' || alphabetLetter !== 'All'
        || filterCollectionId !== null || customOnly;

    const clearAllFilters = () => {
        setSelectedCategory('All'); setSelectedClassification('All'); setSelectedMuscleGroup('All');
        setFilterMovement('All'); setFilterEquipment('All'); setFilterForceType('All');
        setAlphabetLetter('All'); setFilterCollectionId(null); setCustomOnly(false); setLibraryPage(1);
    };

    // ── Personal library exercises ────────────────────────────────────────
    const [personalExercises, setPersonalExercises] = useState<any[]>([]);
    useEffect(() => {
        if (!(personalExerciseIds || []).length) { setPersonalExercises([]); return; }
        let cancelled = false;
        (async () => {
            const { data } = await (supabase as any).rpc('get_exercises_overlay', { p_ids: personalExerciseIds });
            if (!cancelled && data) {
                setPersonalExercises(data.map((r: any) => ({
                    ...r,
                    __custom: !!r.is_custom,
                    __override_id: r.override_id ?? null,
                    __original_id: r.original_id ?? undefined,
                })));
            }
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

    // ── Recently used suggestions ──────────────────────────────────────────
    const [recentNotInPersonal, setRecentNotInPersonal] = useState<any[]>([]);
    useEffect(() => {
        if (!(recentlyUsedExerciseIds || []).length) { setRecentNotInPersonal([]); return; }
        const personalSet = new Set(personalExerciseIds || []);
        const needed = recentlyUsedExerciseIds.filter(id => !personalSet.has(id)).slice(0, 8);
        if (!needed.length) { setRecentNotInPersonal([]); return; }
        let cancelled = false;
        (async () => {
            const { data } = await (supabase as any).rpc('get_exercises_overlay', { p_ids: needed });
            if (!cancelled && data) {
                setRecentNotInPersonal(data.map((r: any) => ({
                    ...r,
                    __custom: !!r.is_custom,
                    __override_id: r.override_id ?? null,
                    __original_id: r.original_id ?? undefined,
                })));
            }
        })();
        return () => { cancelled = true; };
    }, [recentlyUsedExerciseIds, personalExerciseIds]);

    // ── Collection drilldown exercises ────────────────────────────────────
    const activeCollection = collections.find(c => c.id === activeCollectionId) ?? null;
    const [collectionExercises, setCollectionExercises] = useState<any[]>([]);
    useEffect(() => {
        if (!activeCollection || !activeCollection.exercise_ids.length) { setCollectionExercises([]); return; }
        let cancelled = false;
        (async () => {
            const { data } = await (supabase as any).rpc('get_exercises_overlay', { p_ids: activeCollection.exercise_ids });
            if (!cancelled && data) {
                setCollectionExercises(data.map((r: any) => ({
                    ...r,
                    __custom: !!r.is_custom,
                    __override_id: r.override_id ?? null,
                    __original_id: r.original_id ?? undefined,
                })));
            }
        })();
        return () => { cancelled = true; };
    }, [activeCollection?.id, activeCollection?.exercise_ids.length]);

    // ── Helpers ───────────────────────────────────────────────────────────

    const handleTogglePersonal = (exId: string) => {
        if (isInPersonalLibrary(exId)) {
            removeFromPersonalLibrary(exId);
            showToast('Removed from My Library', 'info');
        } else {
            addToPersonalLibrary(exId);
            showToast('Added to My Library', 'success');
        }
    };

    const handleAddToCollection = (exId: string, collectionId: string) => {
        addExerciseToCollection.mutate({ collectionId, exerciseId: exId });
        showToast('Added to collection', 'success');
    };

    const handleCreateCollection = (name: string, color: string, description: string) => {
        createCollection.mutate({ name, color, description: description.trim() || undefined }, {
            onSuccess: () => showToast(`Collection "${name}" created`, 'success'),
            onError: (err: any) => showToast(err?.message || 'Failed to create collection', 'error'),
        });
        setShowNewCollectionModal(false);
    };

    const openEditModal = (ex: any) => {
        setEditingExercise(ex);
        setNewExercise({
            name: ex.name,
            bodyRegion: ex.categories?.[0] || 'Unsorted',
            classification: ex.categories?.[1] || 'Unsorted',
            primaryMuscle: ex.body_parts?.[0] || 'Unsorted',
            secondaryMuscles: Array.isArray(ex.body_parts) ? ex.body_parts.slice(1) : [],
            posture: ex.options?.posture || 'Unsorted',
            grip: ex.options?.grip || 'Unsorted',
            mechanics: ex.options?.mechanics || 'Unsorted',
            execution: ex.options?.alternating ? 'Alternating' : 'Unsorted',
            primaryEquipment: ex.equipment?.[0] || 'Unsorted',
            movementPattern: ex.options?.movementPattern || 'Unsorted',
            forceType: ex.options?.forceType || 'Unsorted',
            cnsDemand: ex.options?.cnsDemand || '',
            difficulty: ex.options?.difficulty || '',
            videoUrl: ex.video_url || '',
            description: ex.description || '',
            safetyCues: ex.safety_cues || '',
            images: Array.isArray(ex.images) ? ex.images : [],
            tags: Array.isArray(ex.tags) ? ex.tags : [],
        });
        setIsEditLiftModalOpen(true);
    };

    const handleDeleteExercise = (ex: any) => {
        setDeletingExercise(ex);
        setIsDeleteConfirmModalOpen(true);
    };

    const rowProps = (ex: any) => ({
        isSelected: selectedExercise?.id === ex.id,
        onSelect: (e: any) => setSelectedExercise(selectedExercise?.id === e.id ? null : e),
        isInLibrary: isInPersonalLibrary,
        onTogglePersonal: handleTogglePersonal,
        onEdit: openEditModal,
        onDelete: handleDeleteExercise,
        onReset: handleResetExercise,
    });

    // ── Exercises tab ─────────────────────────────────────────────────────

    const renderExercises = () => (
        <div className="flex gap-2 flex-1 min-h-0">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
                {hasFuzzyResults && suggestions.length > 0 && (
                    <DidYouMeanBanner suggestions={suggestions} onSelect={n => { setLibrarySearch(n); setLibraryPage(1); }} />
                )}
                <div className="bg-white dark:bg-[#132338] rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col flex-1 min-h-0">
                    {/* ── Embedded filter + alphabet header ── */}
                    <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 dark:border-[#1A2D48] shrink-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1.5 flex-1 min-w-[160px]">
                                <SearchIcon size={12} className="text-slate-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search exercises..."
                                    value={librarySearch}
                                    onChange={e => { setLibrarySearch(e.target.value); setLibraryPage(1); setPersonalPage(1); }}
                                    className="flex-1 bg-transparent text-xs outline-none text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400"
                                />
                                {librarySearch && (
                                    <button onClick={() => setLibrarySearch('')} className="text-slate-400 hover:text-slate-600 dark:text-[#CBD5E1]">
                                        <XIcon size={10} />
                                    </button>
                                )}
                            </div>
                            <CustomSelect value={filterMovement} onChange={e => { setFilterMovement(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Movement">
                                <option value="All">All</option>
                                {MOVEMENT_PATTERNS.filter(m => m !== 'Unsorted').map(m => <option key={m} value={m}>{m}</option>)}
                            </CustomSelect>
                            <CustomSelect value={filterEquipment} onChange={e => { setFilterEquipment(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Equipment">
                                <option value="All">All</option>
                                {EQUIPMENT_LIST.filter(e => e !== 'Unsorted').map(e => <option key={e} value={e}>{e}</option>)}
                            </CustomSelect>
                            <CustomSelect value={filterForceType} onChange={e => { setFilterForceType(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Force Type">
                                <option value="All">All</option>
                                {FORCE_TYPES.filter(f => f !== 'Unsorted').map(f => <option key={f} value={f}>{f}</option>)}
                            </CustomSelect>
                            {/* Collection filter removed from Exercises tab — collections are browsed from My Library. */}
                            <button
                                onClick={() => { setCustomOnly(v => !v); setLibraryPage(1); }}
                                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${customOnly ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-violet-300'}`}
                                title={customOnly ? 'Showing only your customised exercises' : 'Show only exercises your org has customised or created'}
                            >
                                <StarIcon size={11} fill={customOnly ? 'currentColor' : 'none'} />
                                Customised
                            </button>
                            <button
                                onClick={() => setShowMoreFilters(v => !v)}
                                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${showMoreFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-indigo-300'}`}
                            >
                                <SlidersHorizontalIcon size={11} />
                                More
                            </button>
                            <div className="flex items-center gap-2 ml-auto">
                                {hasActiveFilters && (
                                    <button onClick={clearAllFilters} className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700 font-medium transition-colors">
                                        <XIcon size={10} /> Clear
                                    </button>
                                )}
                                <span className="text-[11px] text-slate-500 dark:text-[#CBD5E1] border-l border-slate-200 dark:border-[#243A58] pl-2">
                                    {exercisesLoading ? '...' : `${totalCount.toLocaleString()} exercises`}
                                </span>
                            </div>
                        </div>
                        {showMoreFilters && (
                            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-[#1A2D48]">
                                <CustomSelect value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Region">
                                    <option value="All">All</option>
                                    {BODY_REGIONS.filter(r => r !== 'Unsorted').map(r => <option key={r} value={r}>{r}</option>)}
                                </CustomSelect>
                                <CustomSelect value={selectedClassification} onChange={e => { setSelectedClassification(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Class">
                                    <option value="All">All</option>
                                    {CLASSIFICATIONS.filter(c => c !== 'Unsorted').map(c => <option key={c} value={c}>{c}</option>)}
                                </CustomSelect>
                                <CustomSelect value={selectedMuscleGroup} onChange={e => { setSelectedMuscleGroup(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Muscle">
                                    <option value="All">All</option>
                                    {MUSCLE_GROUPS.filter(m => m !== 'Unsorted').map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                        )}
                        <div className="flex items-center gap-1 flex-wrap">
                            <button onClick={() => { setAlphabetLetter('All'); setLibraryPage(1); setPersonalPage(1); }}
                                className={`px-1.5 h-5 rounded text-[8px] font-bold transition-all ${alphabetLetter === 'All' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 border border-slate-200 dark:border-[#243A58]'}`}>
                                All
                            </button>
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                                <button key={l}
                                    onClick={() => { setAlphabetLetter(alphabetLetter === l ? 'All' : l); setLibraryPage(1); setPersonalPage(1); }}
                                    className={`w-5 h-5 rounded text-[8px] font-bold transition-all ${alphabetLetter === l ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 border border-slate-200 dark:border-[#243A58]'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse relative">
                            <ExerciseTableHeader />
                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48] bg-white dark:bg-[#132338]">
                                {exercisesLoading ? (
                                    [1,2,3,4,5,6].map(i => (
                                        <tr key={i}>
                                            <td className="px-3 py-2"><div className="h-3.5 w-36 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" /></td>
                                            <td className="px-3 py-2 text-center"><div className="h-3.5 w-20 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse mx-auto" /></td>
                                            <td className="px-3 py-2 text-center"><div className="h-4 w-16 bg-slate-100 dark:bg-[#1A2D48] rounded-md animate-pulse mx-auto" /></td>
                                            <td className="px-3 py-2 text-center"><div className="h-4 w-14 bg-slate-50 dark:bg-[#0F1C30] rounded-full animate-pulse mx-auto" /></td>
                                            <td className="px-3 py-2 text-center"><div className="h-3 w-12 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse mx-auto" /></td>
                                            <td className="px-3 py-2 text-center"><div className="h-4 w-12 bg-slate-50 dark:bg-[#0F1C30] rounded-lg animate-pulse mx-auto" /></td>
                                        </tr>
                                    ))
                                ) : filteredExercises.length === 0 ? (
                                    <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400 dark:text-[#CBD5E1]">
                                        No exercises found{librarySearch ? ` for "${librarySearch}"` : ''}
                                    </td></tr>
                                ) : filteredExercises.map(ex => (
                                    <ExerciseRow key={ex.id} ex={ex} showDelete {...rowProps(ex)} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="border-t border-slate-100 dark:border-[#1A2D48] shrink-0">
                            <Pagination page={libraryPage} total={totalPages} onChange={setLibraryPage} />
                        </div>
                    )}
                </div>
            </div>

            <div className="w-[400px] shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm">
                {selectedExercise ? (
                    <ExerciseDetailPanel
                        exercise={selectedExercise}
                        onClose={() => setSelectedExercise(null)}
                        onAddToLibrary={handleTogglePersonal}
                        isInLibrary={isInPersonalLibrary}
                        collections={collections}
                        isInCollection={isInCollection}
                        onAddToCollection={handleAddToCollection}
                        onSelectRelated={ex => setSelectedExercise(ex)}
                        onEdit={openEditModal}
                    />
                ) : (
                    <ExerciseDetailEmptyState />
                )}
            </div>
        </div>
    );

    // ── My Library tab ────────────────────────────────────────────────────

    const renderMyLibrary = () => {
        // ── Collection drilldown ──
        if (activeCollection) {
            const c = getColColor(activeCollection.color);
            return (
                <div className="flex gap-3 flex-1 min-h-0">
                    {/* Left column — header + exercise table */}
                    <div className="flex flex-col flex-1 min-w-0 min-h-0 gap-2">
                        {/* Breadcrumb + collection header */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-3 shrink-0">
                            <button onClick={() => { setActiveCollectionId(null); setSelectedExercise(null); }}
                                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 font-medium transition-colors mb-2">
                                <ArrowLeftIcon size={13} /> Back to My Library
                            </button>
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg ${c.dot} flex items-center justify-center shrink-0`}>
                                    <FolderIcon size={16} className="text-white" />
                                </div>
                                <div>
                                    <h3 className={`text-sm font-semibold ${c.text}`}>{activeCollection.name}</h3>
                                    {activeCollection.description && (
                                        <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-0.5 leading-snug">{activeCollection.description}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                                        {activeCollection.exercise_ids.length} exercise{activeCollection.exercise_ids.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Collection exercises table */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col flex-1 min-h-0">
                            <div className="overflow-y-auto flex-1 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <ExerciseTableHeader />
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48] bg-white dark:bg-[#132338]">
                                        {collectionExercises.length === 0 ? (
                                            <tr><td colSpan={6} className="py-12 text-center">
                                                <FolderIcon size={24} className="text-slate-200 dark:text-[#243A58] mx-auto mb-2" />
                                                <p className="text-sm text-slate-400 dark:text-[#CBD5E1]">This collection is empty</p>
                                                <p className="text-[11px] text-slate-300 dark:text-[#475569] mt-1">Go back and use "Add to Collection" to populate it</p>
                                            </td></tr>
                                        ) : collectionExercises.map(ex => (
                                            <ExerciseRow
                                                key={ex.id}
                                                ex={ex}
                                                {...rowProps(ex)}
                                                onRemoveFromCollection={() => {
                                                    // Removes from collection only — exercise stays in My Library
                                                    removeExerciseFromCollection.mutate(
                                                        { collectionId: activeCollection.id, exerciseId: ex.id },
                                                        { onSuccess: () => {
                                                            setCollectionExercises(prev => prev.filter(e => e.id !== ex.id));
                                                            // Clear the descriptor if the removed exercise was selected
                                                            if (selectedExercise?.id === ex.id) setSelectedExercise(null);
                                                            showToast('Removed from collection', 'info');
                                                        }}
                                                    );
                                                }}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right column — exercise descriptor (same component as Exercises tab) */}
                    <div className="w-[400px] shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm">
                        {selectedExercise ? (
                            <ExerciseDetailPanel
                                exercise={selectedExercise}
                                onClose={() => setSelectedExercise(null)}
                                onAddToLibrary={handleTogglePersonal}
                                isInLibrary={isInPersonalLibrary}
                                collections={collections}
                                isInCollection={isInCollection}
                                onAddToCollection={handleAddToCollection}
                                onSelectRelated={ex => setSelectedExercise(ex)}
                                onEdit={openEditModal}
                            />
                        ) : (
                            <ExerciseDetailEmptyState />
                        )}
                    </div>
                </div>
            );
        }

        // ── Main My Library view ──
        return (
            <div className="flex gap-3 flex-1 min-h-0">
                <div className="flex flex-col flex-1 min-w-0 min-h-0 gap-2">

                    {/* Collections strip — compact horizontal row */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-3 py-2.5 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">
                                My Collections
                                {collections.length > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1] text-[9px]">{collections.length}</span>
                                )}
                            </span>
                            <div className="flex items-center gap-1.5">
                                {!bulkSelectMode && (personalExerciseIds || []).length > 0 && (
                                    <button
                                        onClick={() => setBulkSelectMode(true)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-600 border border-indigo-100 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-500 transition-all"
                                    >
                                        <CheckIcon size={10} /> Add to Collection
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowNewCollectionModal(true)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-[#1A2D48] text-indigo-600 dark:text-white text-[10px] font-semibold border border-indigo-100 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-500/15 transition-all"
                                >
                                    <FolderPlusIcon size={10} /> New
                                </button>
                            </div>
                        </div>
                        {collections.length === 0 ? (
                            <p className="text-[11px] text-slate-300 dark:text-[#475569] py-1">No collections yet — create one to organise your exercises.</p>
                        ) : (
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                                {collections.map(col => {
                                    const c = getColColor(col.color);
                                    return (
                                        <div key={col.id} className="relative group shrink-0">
                                            <button
                                                onClick={() => setActiveCollectionId(col.id)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${c.bg} ${c.border} hover:shadow-sm transition-all text-left`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                                                <span className={`text-[11px] font-semibold ${c.text} whitespace-nowrap`}>{col.name}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] whitespace-nowrap">{col.exercise_ids.length}</span>
                                                <ChevronRightIcon size={10} className="text-slate-300 dark:text-[#475569]" />
                                            </button>
                                            {/* Collection menu */}
                                            <div ref={collectionMenuId === col.id ? menuRef : null} className="absolute top-1 right-1 z-10">
                                                <button
                                                    onClick={e => { e.stopPropagation(); setCollectionMenuId(collectionMenuId === col.id ? null : col.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:text-[#CBD5E1] transition-all"
                                                >
                                                    <MoreHorizontalIcon size={11} />
                                                </button>
                                                {collectionMenuId === col.id && (
                                                    <div className="absolute top-5 right-0 w-32 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl z-50 py-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => {
                                                                const name = prompt('Rename collection:', col.name);
                                                                if (name?.trim()) { renameCollection.mutate({ id: col.id, name: name.trim() }); setCollectionMenuId(null); }
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
                                                        >
                                                            <PencilIcon size={11} /> Rename
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                deleteCollection.mutate(col.id, { onSuccess: () => showToast(`"${col.name}" deleted`, 'info') });
                                                                setCollectionMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-[#1A2D48] transition-colors"
                                                        >
                                                            <Trash2Icon size={11} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* All Saved Exercises — primary content */}
                    <div className="flex flex-col flex-1 min-h-0">
                        <div className="flex items-center justify-between mb-1.5 shrink-0 px-0.5">
                            <h3 className="text-[10px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">
                                All Saved Exercises
                                {(personalExerciseIds || []).length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px] font-bold">{(personalExerciseIds || []).length}</span>
                                )}
                            </h3>
                            {/* Add to Collection trigger now lives next to the New Collection button in the strip above */}
                        </div>

                        {/* Bulk action bar — sits above table so dropdown opens downward with room */}
                        {bulkSelectMode && (
                            <div className="flex items-center gap-3 px-3 py-2 mb-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40 shrink-0">
                                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
                                    {bulkSelectedIds.size} selected
                                </span>
                                <div className="flex-1 min-w-0">
                                    <CustomSelect
                                        value={bulkTargetCollectionId}
                                        onChange={e => setBulkTargetCollectionId(e.target.value)}
                                        placeholder="— Select collection —"
                                        variant="filter"
                                        size="xs"
                                        className="w-full"
                                    >
                                        <option value="">— Select collection —</option>
                                        {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </CustomSelect>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleBulkAddToCollection}
                                    disabled={bulkSelectedIds.size === 0 || !bulkTargetCollectionId}
                                >
                                    Add to Collection
                                </Button>
                                <button
                                    onClick={exitBulkMode}
                                    className="text-xs text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 font-medium transition-colors shrink-0"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}

                        {(personalExerciseIds || []).length === 0 ? (
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm py-12 flex flex-col items-center gap-3 flex-1">
                                <StarIcon size={28} className="text-slate-200 dark:text-[#243A58]" />
                                <p className="text-sm text-slate-400 dark:text-[#CBD5E1]">Your library is empty</p>
                                <p className="text-xs text-slate-300 dark:text-[#475569]">Star exercises from the Exercises tab</p>
                                <button onClick={() => setLibraryViewMode('exercises')} className="mt-1 px-4 py-2 bg-indigo-50 dark:bg-indigo-600 text-indigo-600 dark:text-white rounded-lg text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500 transition-all">
                                    Browse Exercises
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-[#132338] rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col flex-1 min-h-0">
                                <div className="overflow-y-auto flex-1 custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <ExerciseTableHeader showCheckbox={bulkSelectMode} />
                                        <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48] bg-white dark:bg-[#132338]">
                                            {pagedPersonalExercises.length === 0 ? (
                                                <tr><td colSpan={bulkSelectMode ? 7 : 6} className="py-8 text-center text-sm text-slate-400 dark:text-[#CBD5E1]">No exercises match your filters</td></tr>
                                            ) : pagedPersonalExercises.map(ex => (
                                                <ExerciseRow
                                                    key={ex.id}
                                                    ex={ex}
                                                    {...rowProps(ex)}
                                                    bulkMode={bulkSelectMode}
                                                    isChecked={bulkSelectedIds.has(ex.id)}
                                                    onToggleCheck={() => toggleBulkId(ex.id)}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-slate-100 dark:border-[#1A2D48] shrink-0">
                                    <Pagination page={personalPage} total={personalTotalPages} onChange={setPersonalPage} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right sidebar — Smart Suggestions stretches to fill so Quick Actions sits flush with the bottom */}
                <div className="w-[220px] shrink-0 flex flex-col gap-2 min-h-0">
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-3 flex-1 flex flex-col min-h-0">
                        <div className="flex items-center gap-2 mb-2.5 shrink-0">
                            <ClockIcon size={11} className="text-amber-500" />
                            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Smart Suggestions</h3>
                        </div>
                        {recentNotInPersonal.length === 0 ? (
                            <p className="text-[11px] text-slate-300 dark:text-[#475569] text-center py-3">Recently used exercises will appear here</p>
                        ) : (
                            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-0.5">
                                {recentNotInPersonal.map(ex => (
                                    <div key={ex.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#1A2D48]">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-medium text-slate-700 dark:text-[#E2E8F0] truncate">{ex.name}</p>
                                            {ex.categories?.[1] && ex.categories[1] !== 'Unsorted' && (
                                                <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{ex.categories[1]}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { addToPersonalLibrary(ex.id); showToast(`Added ${ex.name}`, 'success'); }}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-600 text-indigo-600 dark:text-white text-[10px] font-semibold border border-indigo-100 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-500 transition-all shrink-0"
                                        >
                                            <PlusIcon size={10} /> Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-3 shrink-0">
                        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-2.5">Quick Actions</h3>
                        <div className="space-y-1.5">
                            <button
                                onClick={() => setShowNewCollectionModal(true)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-all"
                            >
                                <FolderPlusIcon size={13} className="text-indigo-500 shrink-0" />
                                <div>
                                    <p className="text-[11px] font-medium text-slate-700 dark:text-[#E2E8F0]">New Collection</p>
                                    <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Organise exercises</p>
                                </div>
                            </button>
                            {(personalExerciseIds || []).length > 0 && (
                                <button
                                    onClick={() => setBulkSelectMode(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left transition-all"
                                >
                                    <CheckIcon size={13} className="text-indigo-500 shrink-0" />
                                    <div>
                                        <p className="text-[11px] font-medium text-slate-700 dark:text-[#E2E8F0]">Add to Collection</p>
                                        <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Select & batch assign</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ── Main render ───────────────────────────────────────────────────────

    return (
        <>
            <div className="space-y-2 animate-in fade-in duration-300 h-[calc(100vh-40px)] flex flex-col">
                {/* Header */}
                <div className="bg-white dark:bg-[#132338] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm shrink-0">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-slate-800 dark:bg-[#1A2D48] rounded-lg flex items-center justify-center text-white shrink-0">
                                <DumbbellIcon size={14} />
                            </div>
                            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Library</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                <button
                                    onClick={() => { setLibraryViewMode('exercises'); setSelectedExercise(null); }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'exercises' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}
                                >
                                    Exercises
                                </button>
                                <button
                                    onClick={() => { setLibraryViewMode('myLibrary'); exitBulkMode(); }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'myLibrary' ? 'bg-white dark:bg-[#132338] text-amber-600 shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <StarIcon size={11} fill="currentColor" />
                                        My Library
                                        {(personalExerciseIds || []).length > 0 && (
                                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[8px] font-bold">{(personalExerciseIds || []).length}</span>
                                        )}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setLibraryViewMode('protocols')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${libraryViewMode === 'protocols' ? 'bg-white dark:bg-[#132338] text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}
                                >
                                    Protocols
                                </button>
                            </div>
                            {libraryViewMode !== 'protocols' && (
                                <Button size="sm" onClick={() => {
                                    setEditingExercise(null);
                                    setNewExercise({
                                        name: '', bodyRegion: 'Unsorted', classification: 'Unsorted',
                                        primaryMuscle: 'Unsorted', secondaryMuscles: [],
                                        posture: 'Unsorted', grip: 'Unsorted',
                                        mechanics: 'Unsorted', execution: 'Unsorted', primaryEquipment: 'Unsorted',
                                        movementPattern: 'Unsorted', forceType: 'Unsorted', cnsDemand: '', difficulty: '',
                                        videoUrl: '', description: '', safetyCues: '', images: [], tags: [],
                                    });
                                    setIsEditLiftModalOpen(true);
                                }}>
                                    <PlusIcon size={14} className="mr-1.5" /> Add Exercise
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter bar — only for My Library tab; Exercises tab has filters embedded in its card */}
                {libraryViewMode === 'myLibrary' && (
                    <div className="bg-white dark:bg-[#132338] px-3 py-2 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm shrink-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 flex-1 min-w-[180px]">
                                <SearchIcon size={14} className="text-slate-400 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search exercises..."
                                    value={librarySearch}
                                    onChange={e => { setLibrarySearch(e.target.value); setLibraryPage(1); setPersonalPage(1); }}
                                    className="flex-1 bg-transparent text-xs outline-none text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400"
                                />
                                {librarySearch && (
                                    <button onClick={() => setLibrarySearch('')} className="text-slate-400 hover:text-slate-600 dark:text-[#CBD5E1]">
                                        <XIcon size={11} />
                                    </button>
                                )}
                            </div>
                            <CustomSelect value={filterMovement} onChange={e => { setFilterMovement(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Movement">
                                <option value="All">All</option>
                                {MOVEMENT_PATTERNS.filter(m => m !== 'Unsorted').map(m => <option key={m} value={m}>{m}</option>)}
                            </CustomSelect>
                            <CustomSelect value={filterEquipment} onChange={e => { setFilterEquipment(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Equipment">
                                <option value="All">All</option>
                                {EQUIPMENT_LIST.filter(e => e !== 'Unsorted').map(e => <option key={e} value={e}>{e}</option>)}
                            </CustomSelect>
                            <CustomSelect value={filterForceType} onChange={e => { setFilterForceType(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Force Type">
                                <option value="All">All</option>
                                {FORCE_TYPES.filter(f => f !== 'Unsorted').map(f => <option key={f} value={f}>{f}</option>)}
                            </CustomSelect>
                            <button
                                onClick={() => setShowMoreFilters(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${showMoreFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-indigo-300'}`}
                            >
                                <SlidersHorizontalIcon size={12} />
                                More Filters
                            </button>
                            <div className="flex items-center gap-2 ml-auto">
                                {hasActiveFilters && (
                                    <button onClick={clearAllFilters} className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-medium transition-colors">
                                        <XIcon size={11} /> Clear
                                    </button>
                                )}
                                <span className="text-xs text-slate-400 dark:text-[#CBD5E1] border-l border-slate-200 dark:border-[#243A58] pl-2">
                                    {exercisesLoading ? '...' : `${totalCount.toLocaleString()} exercises`}
                                </span>
                            </div>
                        </div>
                        {showMoreFilters && (
                            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-[#1A2D48]">
                                <CustomSelect value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Region">
                                    <option value="All">All</option>
                                    {BODY_REGIONS.filter(r => r !== 'Unsorted').map(r => <option key={r} value={r}>{r}</option>)}
                                </CustomSelect>
                                <CustomSelect value={selectedClassification} onChange={e => { setSelectedClassification(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Class">
                                    <option value="All">All</option>
                                    {CLASSIFICATIONS.filter(c => c !== 'Unsorted').map(c => <option key={c} value={c}>{c}</option>)}
                                </CustomSelect>
                                <CustomSelect value={selectedMuscleGroup} onChange={e => { setSelectedMuscleGroup(e.target.value); setLibraryPage(1); }} variant="filter" size="xs" prefixLabel="Muscle">
                                    <option value="All">All</option>
                                    {MUSCLE_GROUPS.filter(m => m !== 'Unsorted').map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-[#1A2D48]">
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1] shrink-0">A–Z</span>
                            <div className="h-3 w-px bg-slate-200 dark:bg-[#243A58] shrink-0" />
                            <div className="flex flex-wrap gap-0.5">
                                <button onClick={() => { setAlphabetLetter('All'); setLibraryPage(1); setPersonalPage(1); }}
                                    className={`w-5 h-5 rounded text-[8px] font-bold transition-all ${alphabetLetter === 'All' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 border border-slate-200 dark:border-[#243A58]'}`}>
                                    All
                                </button>
                                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                                    <button key={l}
                                        onClick={() => { setAlphabetLetter(alphabetLetter === l ? 'All' : l); setLibraryPage(1); setPersonalPage(1); }}
                                        className={`w-5 h-5 rounded text-[8px] font-bold transition-all ${alphabetLetter === l ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 border border-slate-200 dark:border-[#243A58]'}`}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                {libraryViewMode === 'protocols' ? (
                    <ProtocolLibrary />
                ) : libraryViewMode === 'myLibrary' ? renderMyLibrary() : renderExercises()}
            </div>

            {/* Modals */}
            {showNewCollectionModal && (
                <NewCollectionModal onClose={() => setShowNewCollectionModal(false)} onSave={handleCreateCollection} />
            )}

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
