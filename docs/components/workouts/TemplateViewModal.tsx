// @ts-nocheck
import React, { useState } from 'react';
import { XIcon, PencilIcon, Trash2Icon, TagIcon, CalendarIcon, DumbbellIcon, Share2Icon } from 'lucide-react';
import { ShareWorkoutPopover } from './ShareWorkoutPopover';
import { useExerciseMap } from '../../hooks/useExerciseMap';

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
  const { resolveExerciseName } = useExerciseMap();

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
            {onDelete && !confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-red-500 rounded-lg text-xs font-medium transition-colors">
                <Trash2Icon size={13} /> Delete
              </button>
            ) : onDelete && confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-red-600">Confirm?</span>
                <button onClick={handleDelete} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">No</button>
              </div>
            ) : null}
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
                  const name = ex.exerciseName || ex.exercise_name || ex.name || resolveExerciseName(ex.exerciseId || ex.exercise_id || '');
                  const hasMeta = ex.sets || ex.reps || ex.rest || ex.rpe || ex.intensity || ex.tempo;
                  return (
                    <div key={ex.id || idx} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                      <span className="w-6 h-6 bg-slate-800 text-white rounded-md flex items-center justify-center text-xs font-medium shrink-0">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800">{name}</div>
                        {ex.notes && <div className="text-xs text-slate-400 mt-0.5">{ex.notes}</div>}
                      </div>
                      {hasMeta && (
                        <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                          {ex.sets && <span>Sets: <span className="font-medium text-indigo-600">{ex.sets}</span></span>}
                          {ex.reps && <span>Reps: <span className="font-medium text-indigo-600">{ex.reps}</span></span>}
                          {ex.rest && <span>Rest: <span className="text-slate-600">{ex.rest}s</span></span>}
                          {ex.rpe && <span>RPE: <span className="text-slate-600">{ex.rpe}</span></span>}
                          {ex.intensity && <span>Int: <span className="text-slate-600">{ex.intensity}</span></span>}
                          {ex.tempo && <span>Tempo: <span className="text-slate-600">{ex.tempo}</span></span>}
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
    </div>
  );
};
