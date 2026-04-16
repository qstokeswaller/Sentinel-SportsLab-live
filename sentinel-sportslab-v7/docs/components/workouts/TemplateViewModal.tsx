// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { XIcon, PencilIcon, Trash2Icon, TagIcon, CalendarIcon, DumbbellIcon, Share2Icon, ExternalLink, Weight, AlertTriangleIcon } from 'lucide-react';
import { ShareWorkoutPopover } from './ShareWorkoutPopover';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { useExerciseMap } from '../../hooks/useExerciseMap';
import { supabase } from '../../lib/supabase';

type Section = 'warmup' | 'workout' | 'cooldown';

const SECTION_LABELS: Record<Section, string> = {
  warmup: 'Warm Up',
  workout: 'Workout',
  cooldown: 'Cool Down',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface TemplateViewModalProps {
  template: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (tpl: any) => void;
  onDelete?: (id: string) => void;
}

export const TemplateViewModal = ({ template, isOpen, onClose, onEdit, onDelete }: TemplateViewModalProps) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const { resolveExerciseName, exerciseFullMap } = useExerciseMap();
  // Fetched-fresh exercise metadata keyed by exercise ID
  const [fetchedExMeta, setFetchedExMeta] = useState<Record<string, any>>({});

  // Fetch exercise descriptions/metadata directly from DB whenever template changes
  useEffect(() => {
    if (!isOpen || !template) return;
    const sections = template.sections || {};
    const ids = [...new Set(
      ['warmup', 'workout', 'cooldown'].flatMap(sec =>
        (sections[sec] || []).map((r: any) => r.exerciseId || r.exercise_id).filter(Boolean)
      )
    )];
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, description, body_parts, categories, video_url')
        .in('id', ids);
      if (!cancelled && data) {
        const map: Record<string, any> = {};
        for (const e of data) map[e.id] = e;
        setFetchedExMeta(map);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, template]);

  // Build a name→info lookup as final fallback
  const exerciseNameMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const info of Object.values(exerciseFullMap || {})) {
      if (info.name) map[info.name.toLowerCase()] = info;
    }
    return map;
  }, [exerciseFullMap]);

  if (!isOpen || !template) return null;

  const sections = template.sections || {};
  const totalExercises = (sections.warmup?.length || 0) + (sections.workout?.length || 0) + (sections.cooldown?.length || 0);

  const handleDelete = () => {
    onDelete?.(template.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-slate-900 leading-none">{template.name}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CalendarIcon size={11} />
                {formatDate(template.createdAt || template.created_at)}
              </span>
              <span className="flex items-center gap-1.5">
                <DumbbellIcon size={11} />
                {totalExercises} exercises
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {template.trainingPhase && (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-semibold">{template.trainingPhase || template.training_phase}</span>
              )}
              {template.load && (
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-semibold">{template.load} Load</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button onClick={() => setShowShare(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors">
              <Share2Icon size={13} /> Share
            </button>
            {onEdit && (
              <button onClick={() => { onEdit(template); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors">
                <PencilIcon size={13} /> Edit
              </button>
            )}
            {onDelete && (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-red-500 rounded-lg text-xs font-medium transition-colors">
                <Trash2Icon size={13} /> Delete
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {(['warmup', 'workout', 'cooldown'] as Section[]).map((sec) => {
            const exercises = sections[sec] || [];
            if (exercises.length === 0) return null;
            return (
              <div key={sec} className="space-y-2">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{SECTION_LABELS[sec]}</h4>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[10px] text-slate-300 font-medium">{exercises.length} exercises</span>
                </div>
                {exercises.map((ex: any, idx: number) => {
                  const exKey = ex.id || `${sec}_${idx}`;
                  const exId = ex.exerciseId || ex.exercise_id || '';
                  const name = ex.exerciseName || ex.exercise_name || ex.name || resolveExerciseName(exId);
                  const hasMeta = ex.sets || ex.reps || ex.rest || ex.rpe || ex.weight;
                  // Priority: freshly fetched DB data > exerciseFullMap from AppState > name-based fallback
                  const fullInfo = fetchedExMeta[exId] || exerciseFullMap?.[exId] || (name ? exerciseNameMap[name.toLowerCase()] : null);
                  const rawDesc = fullInfo?.description || '';
                  const desc = rawDesc && rawDesc.toLowerCase() !== 'no description provided.' ? rawDesc : '';
                  const rawVideoUrl = fullInfo?.video_url || '';
                  const videoUrl = rawVideoUrl && rawVideoUrl.startsWith('http') ? rawVideoUrl : '';
                  const bodyParts = fullInfo?.body_parts || [];
                  const categories = fullInfo?.categories || [];
                  // Always expandable — show whatever info we have, or a minimal "no info" state
                  const hasDetail = true;
                  const isExpanded = expandedEx === exKey;
                  return (
                    <div key={exKey} className="bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors overflow-hidden">
                      {/* Banner — clickable to expand details */}
                      <button
                        onClick={() => hasDetail ? setExpandedEx(isExpanded ? null : exKey) : null}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <span className="w-6 h-6 bg-slate-800 text-white rounded-md flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800">{name}</div>
                          {hasMeta && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                              {ex.sets && <span>Sets: <span className="font-medium text-indigo-600">{ex.sets}</span></span>}
                              {ex.reps && <span>Reps: <span className="font-medium text-indigo-600">{ex.reps}</span></span>}
                              {ex.weight && (
                                <span className="flex items-center gap-0.5">
                                  <Weight size={10} className="text-indigo-500" />
                                  <span className="font-medium text-indigo-600">{ex.weight} kg</span>
                                </span>
                              )}
                              {ex.rest && <span>Rest: <span className="text-slate-600">{ex.rest}s</span></span>}
                              {ex.rpe && <span>RPE: <span className="text-slate-600">{ex.rpe}</span></span>}
                            </div>
                          )}
                        </div>
                        {hasDetail && (
                          <span className={`text-slate-300 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <ExternalLink size={12} className={isExpanded ? 'hidden' : ''} />
                            <XIcon size={12} className={isExpanded ? '' : 'hidden'} />
                          </span>
                        )}
                      </button>
                      {/* Detail area — only shown when expanded */}
                      {isExpanded && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          {(bodyParts.length > 0 || categories.length > 0) && (
                            <div className="flex flex-wrap gap-1.5">
                              {bodyParts.map((bp: string) => (
                                <span key={bp} className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-medium">{bp}</span>
                              ))}
                              {categories.map((cat: string) => (
                                <span key={cat} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-medium">{cat}</span>
                              ))}
                            </div>
                          )}
                          {ex.notes && <p className="text-xs text-slate-500 italic">{ex.notes}</p>}
                          {desc && <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>}
                          {videoUrl && (
                            <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                              <ExternalLink size={10} />
                              Video Reference
                            </a>
                          )}
                          {!desc && !videoUrl && !ex.notes && bodyParts.length === 0 && categories.length === 0 && (
                            <p className="text-[10px] text-slate-400 italic">No additional information available for this exercise.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {totalExercises === 0 && (
            <div className="py-10 text-center text-sm text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
              No exercises in this workout
            </div>
          )}
        </div>
      </div>

      {/* Share Popover */}
      {showShare && template && (
        <ShareWorkoutPopover
          workoutType="template"
          workoutId={template.id}
          workoutName={template.name}
          onClose={() => setShowShare(false)}
        />
      )}
      <ConfirmDeleteModal
        isOpen={confirmDelete}
        title="Delete Workout Packet"
        message={`Are you sure you want to delete "${template.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};
