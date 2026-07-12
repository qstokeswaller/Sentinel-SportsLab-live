// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { XIcon, PlayCircleIcon, AlertTriangleIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ExerciseInfoModalProps {
  exercise: any;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Shared exercise info popup — used in:
 * - Library page (via openExerciseInfo)
 * - Workouts builder right panel (via the `i` button on each exercise card)
 *
 * Layout order matches the library detail panel: Images → Information → Safety & Cues → Tags → Details → Related.
 */
export const ExerciseInfoModal = ({ exercise, isOpen, onClose }: ExerciseInfoModalProps) => {
  const [related, setRelated] = useState<any[]>([]);

  // Fetch related exercises (same primary muscle, top 5 by name)
  useEffect(() => {
    if (!isOpen || !exercise) { setRelated([]); return; }
    let cancelled = false;
    (async () => {
      const primaryMuscle = exercise.body_parts?.[0];
      if (!primaryMuscle || primaryMuscle === 'Unsorted') { setRelated([]); return; }
      const { data } = await supabase
        .from('exercises')
        .select('id, name, categories, body_parts')
        .contains('body_parts', [primaryMuscle])
        .neq('id', exercise.id)
        .limit(5);
      if (!cancelled) setRelated(data || []);
    })();
    return () => { cancelled = true; };
  }, [exercise, isOpen]);

  if (!isOpen || !exercise) return null;

  const opts = exercise.options || {};
  const tags: string[] = exercise.tags || [];
  const detailRows = [
    { label: 'Primary Muscle',     value: exercise.body_parts?.[0] },
    { label: 'Secondary Muscles',  value: exercise.body_parts?.slice(1).filter(Boolean).join(', ') || null },
    { label: 'Movement Pattern',   value: opts.movementPattern },
    { label: 'Force Type',         value: opts.forceType },
    { label: 'Equipment',          value: exercise.equipment?.[0] },
    { label: 'Posture',            value: opts.posture },
    { label: 'Grip',               value: opts.grip },
    { label: 'Mechanics',          value: opts.mechanics },
    { label: 'Execution',          value: opts.alternating ? 'Alternating' : null },
    { label: 'CNS Demand',         value: opts.cnsDemand },
    { label: 'Difficulty',         value: opts.difficulty },
  ].filter(d => d.value && d.value !== 'Unsorted');

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-[#1A2D48] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-[#243A58] shadow-2xl animate-in zoom-in-95">
        {/* Header — title only */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#243A58] shrink-0">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight min-w-0">{exercise.name}</h2>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#243A58] transition-colors shrink-0">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Body — order: images → information → safety → tags → details → related */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">

            {/* Images — only renders if at least one image exists */}
            {(() => {
              const imgs = (exercise.images || []).filter(Boolean).slice(0, 4);
              const hasVideo = exercise.video_url || opts.longVideoUrl;
              if (imgs.length === 0 && !hasVideo) return null;
              return (
                <div>
                  {imgs.length === 1 && (
                    <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]">
                      <img src={imgs[0]} alt={exercise.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {imgs.length > 1 && (
                    <div className={`grid gap-2 ${imgs.length === 2 ? 'grid-cols-2' : imgs.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                      {imgs.map((src, i) => (
                        <div key={i} className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]">
                          <img src={src} alt={`${exercise.name} ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {hasVideo && (
                    <div className={`flex flex-wrap gap-2 ${imgs.length > 0 ? 'mt-3' : ''}`}>
                      {exercise.video_url && (
                        <a href={exercise.video_url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                          <PlayCircleIcon size={14} className="shrink-0" />
                          <span className="text-xs font-medium">Watch Video</span>
                        </a>
                      )}
                      {opts.longVideoUrl && (
                        <a href={opts.longVideoUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#243A58] hover:bg-slate-100 dark:hover:bg-[#2D4A6A] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] transition-colors">
                          <PlayCircleIcon size={14} className="shrink-0" />
                          <span className="text-xs font-medium">Extended</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Information / Description */}
            {exercise.description && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-700 dark:text-[#E2E8F0] mb-2">Information</p>
                <p className="text-sm text-slate-700 dark:text-[#CBD5E1] leading-relaxed">{exercise.description}</p>
              </div>
            )}

            {/* Safety & Cues */}
            {exercise.safety_cues && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-700 dark:text-[#E2E8F0] mb-2 flex items-center gap-1.5">
                  <AlertTriangleIcon size={11} className="text-amber-500" />
                  Safety &amp; Cues
                </p>
                <p className="text-sm text-slate-700 dark:text-[#CBD5E1] leading-relaxed">{exercise.safety_cues}</p>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-700 dark:text-[#E2E8F0] mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Details — 2 column grid */}
            {detailRows.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-700 dark:text-[#E2E8F0] mb-3">Details</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                  {detailRows.map(row => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500 dark:text-[#CBD5E1] shrink-0">{row.label}</span>
                      <span className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0] text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Exercises */}
            {related.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-700 dark:text-[#E2E8F0] mb-2">Related Exercises</p>
                <div className="space-y-1">
                  {related.map(rel => (
                    <div key={rel.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#132338] border border-slate-100 dark:border-[#243A58]">
                      <span className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0] truncate">{rel.name}</span>
                      {rel.categories?.[1] && rel.categories[1] !== 'Unsorted' && (
                        <span className="shrink-0 text-[10px] text-slate-500 dark:text-[#CBD5E1]">{rel.categories[1]}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
