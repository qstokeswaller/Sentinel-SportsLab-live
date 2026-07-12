import React, { useState, useEffect } from 'react';
import { XIcon, PencilIcon, Trash2Icon, TagIcon, CalendarIcon, DumbbellIcon, Share2Icon, ExternalLink, Weight, AlertTriangleIcon } from 'lucide-react';
import { ShareWorkoutPopover } from './ShareWorkoutPopover';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { useExerciseMap } from '../../hooks/useExerciseMap';
import { supabase } from '../../lib/supabase';

type Section = string; // dynamic — supports custom colored sections

const DEFAULT_SECTION_LABELS: Record<string, string> = {
  warmup: 'Warm Up',
  workout: 'Workout',
  cooldown: 'Cool Down',
};
const DEFAULT_SECTION_COLORS: Record<string, string> = {
  warmup: '#f59e0b',
  workout: '#6366f1',
  cooldown: '#0ea5e9',
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
      // Use overlay-aware RPC so customised exercises in templates resolve to the override.
      const { data } = await (supabase as any).rpc('get_exercises_overlay', { p_ids: ids });
      if (!cancelled && data) {
        const map: Record<string, any> = {};
        for (const e of data as any[]) map[e.id] = e;
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
  // Use the persisted dynamic section layout if present; fall back to the legacy 3-section enum.
  const persistedMeta = template.sectionMeta as Record<string, { label: string; color: string }> | undefined;
  const persistedOrder = template.sectionOrder as string[] | undefined;
  const sectionOrder = (persistedOrder && persistedOrder.length > 0) ? persistedOrder : ['warmup', 'workout', 'cooldown'];
  const totalExercises = sectionOrder.reduce((sum, sec) => sum + ((sections[sec] || []).length || 0), 0);

  const handleDelete = () => {
    onDelete?.(template.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-3xl shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58] flex items-start justify-between shrink-0">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0] leading-none">{template.name}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#CBD5E1]">
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
                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 rounded text-[9px] font-semibold">{template.trainingPhase || template.training_phase}</span>
              )}
              {template.load && (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] rounded text-[9px] font-semibold">{template.load} Load</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button onClick={() => setShowShare(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] rounded-lg text-xs font-medium transition-colors">
              <Share2Icon size={13} /> Share
            </button>
            {onEdit && (
              <button onClick={() => { onEdit(template); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] rounded-lg text-xs font-medium transition-colors">
                <PencilIcon size={13} /> Edit
              </button>
            )}
            {onDelete && (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1A2D48] hover:bg-red-50 dark:hover:bg-red-500/15 text-red-500 dark:text-rose-400 rounded-lg text-xs font-medium transition-colors">
                <Trash2Icon size={13} /> Delete
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {sectionOrder.map((sec: string) => {
            const exercises = sections[sec] || [];
            if (exercises.length === 0) return null;
            const meta = persistedMeta?.[sec];
            const label = meta?.label || DEFAULT_SECTION_LABELS[sec] || sec;
            const color = meta?.color || DEFAULT_SECTION_COLORS[sec] || '#6366f1';
            return (
              <div key={sec} className="space-y-2">
                {/* Colored section header row */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                  style={{ backgroundColor: `${color}1A`, borderLeft: `3px solid ${color}` }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</h4>
                  <span className="ml-auto text-[10px] font-medium" style={{ color }}>{exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}</span>
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
                    <div key={exKey} className="bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] rounded-lg hover:border-slate-300 dark:hover:border-[#364E6E] transition-colors overflow-hidden">
                      {/* Banner — clickable to expand details */}
                      <button
                        onClick={() => hasDetail ? setExpandedEx(isExpanded ? null : exKey) : null}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <span className="w-6 h-6 bg-slate-800 dark:bg-indigo-600 text-white rounded-md flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 dark:text-[#E2E8F0]">{name}</div>
                          {hasMeta && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-[#CBD5E1] mt-1">
                              {ex.sets && <span>Sets: <span className="font-medium text-indigo-600 dark:text-indigo-300">{ex.sets}</span></span>}
                              {ex.reps && <span>Reps: <span className="font-medium text-indigo-600 dark:text-indigo-300">{ex.reps}</span></span>}
                              {ex.weight && (
                                <span className="flex items-center gap-0.5">
                                  <Weight size={10} className="text-indigo-500 dark:text-indigo-300" />
                                  <span className="font-medium text-indigo-600 dark:text-indigo-300">{ex.weight} kg</span>
                                </span>
                              )}
                              {ex.rest && <span>Rest: <span className="text-slate-600 dark:text-[#CBD5E1]">{ex.rest}s</span></span>}
                              {ex.rpe && <span>RPE: <span className="text-slate-600 dark:text-[#CBD5E1]">{ex.rpe}</span></span>}
                            </div>
                          )}
                        </div>
                        {hasDetail && (
                          <span className={`text-slate-300 dark:text-[#475569] shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <ExternalLink size={12} className={isExpanded ? 'hidden' : ''} />
                            <XIcon size={12} className={isExpanded ? '' : 'hidden'} />
                          </span>
                        )}
                      </button>
                      {/* Detail area — only shown when expanded */}
                      {isExpanded && (
                        <div className="px-4 py-3 bg-slate-50 dark:bg-[#0F1C30] border-t border-slate-100 dark:border-[#243A58] space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          {(bodyParts.length > 0 || categories.length > 0) && (
                            <div className="flex flex-wrap gap-1.5">
                              {bodyParts.map((bp: string) => (
                                <span key={bp} className="px-2 py-0.5 bg-slate-200 dark:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] rounded text-[9px] font-medium">{bp}</span>
                              ))}
                              {categories.map((cat: string) => (
                                <span key={cat} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 rounded text-[9px] font-medium">{cat}</span>
                              ))}
                            </div>
                          )}
                          {ex.notes && <p className="text-xs text-slate-500 dark:text-[#CBD5E1] italic">{ex.notes}</p>}
                          {desc && <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">{desc}</p>}
                          {videoUrl && (
                            <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors">
                              <ExternalLink size={10} />
                              Video Reference
                            </a>
                          )}
                          {!desc && !videoUrl && !ex.notes && bodyParts.length === 0 && categories.length === 0 && (
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] italic">No additional information available for this exercise.</p>
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
            <div className="py-10 text-center text-sm text-slate-500 dark:text-[#CBD5E1] border-2 border-dashed border-slate-100 dark:border-[#243A58] rounded-xl">
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
