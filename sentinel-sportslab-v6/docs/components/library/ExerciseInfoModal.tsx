// @ts-nocheck
import React from 'react';
import { XIcon, PlayCircleIcon, DumbbellIcon, TagIcon } from 'lucide-react';

interface ExerciseInfoModalProps {
  exercise: any;
  isOpen: boolean;
  onClose: () => void;
}

export const ExerciseInfoModal = ({ exercise, isOpen, onClose }: ExerciseInfoModalProps) => {
  if (!isOpen || !exercise) return null;

  const opts = exercise.options || {};
  const details = [
    { label: 'Muscle Group', value: exercise.body_parts?.[0] },
    { label: 'Posture', value: opts.posture },
    { label: 'Grip', value: opts.grip },
    { label: 'Mechanics', value: opts.mechanics },
    { label: 'Movement Pattern', value: opts.movementPattern },
    { label: 'Execution', value: opts.alternating ? 'Alternating' : null },
    { label: 'Equipment', value: exercise.equipment?.[0] },
    { label: 'Tracking', value: exercise.tracking_type },
  ].filter(d => d.value && d.value !== 'Unsorted');

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-slate-900 leading-tight">{exercise.name}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {exercise.body_parts?.[0] && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold border border-emerald-100">
                  {exercise.body_parts[0]}
                </span>
              )}
              {(exercise.categories || []).map((cat: string) => (
                <span key={cat} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-semibold border border-indigo-100">
                  {cat}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors shrink-0">
            <XIcon size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5 space-y-5">
          {/* Description */}
          {exercise.description && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Description</h4>
              <p className="text-sm text-slate-600 leading-relaxed">{exercise.description}</p>
            </div>
          )}

          {/* Details grid */}
          {details.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Details</h4>
              <div className="grid grid-cols-2 gap-2">
                {details.map(d => (
                  <div key={d.label} className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                    <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">{d.label}</div>
                    <div className="text-sm font-medium text-slate-700 mt-0.5">{d.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {exercise.tags && exercise.tags.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <TagIcon size={10} /> Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {exercise.tags.map((tag: string) => (
                  <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Video */}
          {(exercise.video_url || opts.longVideoUrl) && (
            <div className="flex gap-2">
              {exercise.video_url && (
                <a href={exercise.video_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors border border-red-100">
                  <PlayCircleIcon size={14} /> Watch Demo
                </a>
              )}
              {opts.longVideoUrl && (
                <a href={opts.longVideoUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition-colors border border-slate-200">
                  <PlayCircleIcon size={14} /> Extended Video
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
