// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    XIcon, StarIcon, PlusIcon, PlayCircleIcon, DumbbellIcon,
    ChevronDownIcon, CheckIcon,
} from 'lucide-react';
import type { ExerciseCollection } from '../../hooks/useCollections';

// ── CNS / Difficulty dot renderer ────────────────────────────────────────────

const LEVEL_DOTS: Record<string, number> = { Low: 1, Moderate: 2, High: 3, 'Very High': 4, Extreme: 4 };

const DOT_COLORS: Record<string, string> = {
    Low: 'bg-emerald-500',
    Moderate: 'bg-amber-400',
    High: 'bg-orange-500',
    'Very High': 'bg-red-500',
    Extreme: 'bg-red-600',
};

function DemandDots({ value, max = 4 }: { value: string | null; max?: number }) {
    if (!value) return <span className="text-slate-300 dark:text-[#475569] text-xs">—</span>;
    const filled = LEVEL_DOTS[value] ?? 0;
    const color = DOT_COLORS[value] ?? 'bg-slate-400';
    return (
        <span className="flex items-center gap-1">
            {Array.from({ length: max }).map((_, i) => (
                <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${i < filled ? color : 'bg-slate-200 dark:bg-[#243A58]'}`}
                />
            ))}
            <span className="ml-1 text-xs text-slate-500 dark:text-[#94A3B8]">{value}</span>
        </span>
    );
}

// ── Classification badge colour ──────────────────────────────────────────────

function ClassBadge({ value }: { value: string }) {
    const map: Record<string, string> = {
        Strength: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/40',
        Power: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700/40',
        Mobility: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
        Conditioning: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700/40',
        Plyometric: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40',
    };
    const cls = map[value] ?? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]';
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
            {value}
        </span>
    );
}

// ── Related exercise mini-card ───────────────────────────────────────────────

function RelatedCard({ ex, onSelect }: { ex: any; onSelect: () => void }) {
    return (
        <button
            onClick={onSelect}
            className="flex flex-col items-start gap-1 p-2.5 rounded-lg bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left w-full"
        >
            <span className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0] leading-tight line-clamp-2">{ex.name}</span>
            {ex.categories?.[1] && ex.categories[1] !== 'Unsorted' && (
                <ClassBadge value={ex.categories[1]} />
            )}
        </button>
    );
}

// ── Add to Collection dropdown ───────────────────────────────────────────────

function AddToCollectionDropdown({
    exerciseId,
    collections,
    isInCollection,
    onAdd,
}: {
    exerciseId: string;
    collections: ExerciseCollection[];
    isInCollection: (exId: string, colId: string) => boolean;
    onAdd: (collectionId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold border border-indigo-600 hover:border-indigo-500 transition-all"
            >
                <PlusIcon size={12} />
                Add to Collection
                <ChevronDownIcon size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute bottom-full mb-1.5 right-0 w-52 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                    {collections.length === 0 ? (
                        <div className="px-3 py-2.5 text-xs text-slate-400 dark:text-[#64748B]">No collections yet</div>
                    ) : collections.map(col => {
                        const already = isInCollection(exerciseId, col.id);
                        return (
                            <button
                                key={col.id}
                                onClick={() => { if (!already) { onAdd(col.id); setOpen(false); } }}
                                disabled={already}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${already
                                    ? 'text-emerald-600 dark:text-emerald-400 cursor-default'
                                    : 'text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                                }`}
                            >
                                <span className="truncate">{col.name}</span>
                                {already && <CheckIcon size={12} />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Main panel ───────────────────────────────────────────────────────────────

interface ExerciseDetailPanelProps {
    exercise: any | null;
    onClose: () => void;
    onAddToLibrary: (exId: string) => void;
    isInLibrary: (exId: string) => boolean;
    collections: ExerciseCollection[];
    isInCollection: (exId: string, colId: string) => boolean;
    onAddToCollection: (exId: string, collectionId: string) => void;
    onSelectRelated: (ex: any) => void;
}

export function ExerciseDetailPanel({
    exercise,
    onClose,
    onAddToLibrary,
    isInLibrary,
    collections,
    isInCollection,
    onAddToCollection,
    onSelectRelated,
}: ExerciseDetailPanelProps) {
    const [related, setRelated] = useState<any[]>([]);

    useEffect(() => {
        if (!exercise) { setRelated([]); return; }
        let cancelled = false;
        (async () => {
            const conditions: string[] = [];
            if (exercise.body_parts?.[0]) conditions.push(`body_parts.cs.{"${exercise.body_parts[0]}"}`);
            if (exercise.categories?.[1] && exercise.categories[1] !== 'Unsorted') {
                conditions.push(`categories.cs.{"${exercise.categories[1]}"}`);
            }
            if (!conditions.length) { setRelated([]); return; }

            const { data } = await supabase
                .from('exercises')
                .select('id, name, body_parts, categories, equipment, options')
                .neq('id', exercise.id)
                .or(conditions.join(','))
                .limit(6);

            if (!cancelled) setRelated(data || []);
        })();
        return () => { cancelled = true; };
    }, [exercise?.id]);

    const opts = exercise?.options ?? {};
    const classification = exercise?.categories?.[1] ?? '';
    const tags: string[] = exercise?.tags ?? [];

    const detailRows = [
        { label: 'Movement', value: opts.movementPattern ?? null },
        { label: 'Force Type', value: opts.forceType ?? null },
        { label: 'Primary Muscle', value: exercise?.body_parts?.[0] ?? null },
        { label: 'Secondary Muscles', value: exercise?.body_parts?.slice(1).join(', ') || null },
        { label: 'Equipment', value: exercise?.equipment?.[0] ?? null },
        { label: 'CNS Demand', value: opts.cnsDemand ?? null, dots: true },
        { label: 'Difficulty', value: opts.difficulty ?? null, dots: true },
    ];

    const inLibrary = exercise ? isInLibrary(exercise.id) : false;

    return (
        <div className="h-full flex flex-col bg-white dark:bg-[#132338] border-l border-slate-200 dark:border-[#243A58]">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-[#1A2D48] shrink-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={() => onAddToLibrary(exercise.id)}
                            title={inLibrary ? 'Remove from My Library' : 'Add to My Library'}
                            className="shrink-0"
                        >
                            <StarIcon
                                size={15}
                                className={inLibrary ? 'text-amber-500' : 'text-slate-300 dark:text-[#475569] hover:text-amber-400'}
                                fill={inLibrary ? 'currentColor' : 'none'}
                            />
                        </button>
                        <h3 className="font-semibold text-slate-900 dark:text-[#E2E8F0] text-sm leading-snug truncate">
                            {exercise?.name}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors shrink-0"
                    >
                        <XIcon size={14} />
                    </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {classification && classification !== 'Unsorted' && (
                        <ClassBadge value={classification} />
                    )}
                    {tags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#94A3B8] border border-slate-200 dark:border-[#243A58]">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Video link — compact inline row, no block */}
                {exercise?.video_url && (
                    <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-[#64748B] shrink-0">Video</span>
                        <a
                            href={exercise.video_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors truncate"
                        >
                            <PlayCircleIcon size={12} className="shrink-0" />
                            Watch Video
                        </a>
                    </div>
                )}

                {/* Overview */}
                {exercise?.description && (
                    <div className="px-4 pb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-[#64748B] mb-1.5">Overview</p>
                        <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{exercise.description}</p>
                    </div>
                )}

                {/* Details */}
                <div className="px-4 pb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-[#64748B] mb-2">Details</p>
                    <div className="space-y-2">
                        {detailRows.map(row => {
                            if (!row.value) return null;
                            return (
                                <div key={row.label} className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-slate-400 dark:text-[#64748B] shrink-0">{row.label}</span>
                                    {row.dots ? (
                                        <DemandDots value={row.value} />
                                    ) : (
                                        <span className="text-[11px] font-medium text-slate-700 dark:text-[#E2E8F0] text-right">{row.value}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Related Exercises — compact list */}
                {related.length > 0 && (
                    <div className="px-4 pb-3">
                        <div className="border-t border-slate-100 dark:border-[#1A2D48] pt-2.5 mb-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-[#64748B]">Related Exercises</p>
                        </div>
                        <div className="space-y-0.5">
                            {related.map(rel => (
                                <button
                                    key={rel.id}
                                    onClick={() => onSelectRelated(rel)}
                                    className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors text-left group"
                                >
                                    <span className="text-[11px] font-medium text-slate-700 dark:text-[#E2E8F0] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 truncate">
                                        {rel.name}
                                    </span>
                                    {rel.categories?.[1] && rel.categories[1] !== 'Unsorted' && (
                                        <span className="shrink-0 text-[9px] font-medium text-slate-400 dark:text-[#64748B]">
                                            {rel.categories[1]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer actions */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-[#1A2D48] shrink-0 flex items-center justify-between gap-2">
                <button
                    onClick={() => onAddToLibrary(exercise.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${inLibrary
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700/40'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600 hover:border-indigo-500'
                    }`}
                >
                    <StarIcon size={12} fill={inLibrary ? 'currentColor' : 'none'} />
                    {inLibrary ? 'In My Library' : 'Add to Library'}
                </button>
                <AddToCollectionDropdown
                    exerciseId={exercise.id}
                    collections={collections}
                    isInCollection={isInCollection}
                    onAdd={(colId) => onAddToCollection(exercise.id, colId)}
                />
            </div>
        </div>
    );
}

// ── Empty state ──────────────────────────────────────────────────────────────

export function ExerciseDetailEmptyState() {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-3 bg-white dark:bg-[#132338] border-l border-slate-200 dark:border-[#243A58] px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#1A2D48] flex items-center justify-center">
                <DumbbellIcon size={20} className="text-slate-300 dark:text-[#475569]" />
            </div>
            <p className="text-sm font-medium text-slate-400 dark:text-[#64748B]">Select an exercise</p>
            <p className="text-xs text-slate-300 dark:text-[#475569] leading-relaxed">Click any row to preview details, related exercises, and save to your library</p>
        </div>
    );
}
