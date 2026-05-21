// @ts-nocheck
import React, { useState } from 'react';
import { XIcon, PencilIcon, Trash2Icon, TagIcon, CalendarIcon, LayersIcon, Share2Icon, ExternalLink, Weight, MoonIcon } from 'lucide-react';
import { ConfirmDeleteModal } from '../ui/ConfirmDeleteModal';
import { useProgramWithDays, useDeleteProgram, type WorkoutProgram } from '../../hooks/useWorkoutPrograms';
import { ProgramBuilderModal } from './ProgramBuilderModal';
import { ShareWorkoutPopover } from './ShareWorkoutPopover';
import { useExerciseMap } from '../../hooks/useExerciseMap';
import { useAppState } from '../../context/AppStateContext';
import { todayLocalDate } from '../../utils/syncTonnage';
import { Button } from '@/components/ui/button';

type Section = string; // dynamic — drops the warmup/workout/cooldown enum

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

interface ProgramViewModalProps {
  program: WorkoutProgram | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProgramViewModal = ({ program, isOpen, onClose }: ProgramViewModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const { exerciseMap, exerciseFullMap } = useExerciseMap();

  const { data: fullProgram, isLoading } = useProgramWithDays(isOpen ? program?.id ?? null : null);
  const deleteProgram = useDeleteProgram();
  const { setPlannedTonnageLog } = useAppState();

  const handleDelete = async () => {
    if (!program) return;
    const today = todayLocalDate();
    await deleteProgram.mutateAsync(program.id);
    // Optimistic local prune so Tracking Hub / Data Hub stop showing this
    // program's future tonnage immediately (matches what the DB-side delete
    // inside useDeleteProgram has already done).
    setPlannedTonnageLog?.((prev: any[]) => prev.filter(r => !(r.source_id === program.id && r.date > today)));
    onClose();
  };

  if (!isOpen || !program) return null;
  if (isEditing && fullProgram) {
    return (
      <ProgramBuilderModal
        isOpen
        onClose={() => { setIsEditing(false); onClose(); }}
        editingProgram={fullProgram}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-4xl shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58] flex items-start justify-between shrink-0">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0] leading-none">{program.name}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-[#CBD5E1]">
              <span className="flex items-center gap-1.5">
                <CalendarIcon size={11} />
                {formatDate(program.created_at)}
              </span>
              {(program.tags ?? []).length > 0 && (
                <div className="flex items-center gap-1.5">
                  <TagIcon size={11} />
                  {(program.tags ?? []).join(', ')}
                </div>
              )}
            </div>
            {program.overview && (
              <p className="text-sm text-slate-500 dark:text-[#CBD5E1] max-w-2xl">{program.overview}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>
              <Share2Icon size={13} className="mr-1.5" /> Share
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
              <PencilIcon size={13} className="mr-1.5" /> Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)} className="text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-500/15">
              <Trash2Icon size={13} className="mr-1.5" /> Delete
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-400 dark:text-[#CBD5E1]">Loading program...</div>
          ) : !fullProgram || (fullProgram.days ?? []).length === 0 ? (
            <div className="p-12 text-center">
              <LayersIcon size={28} className="text-slate-200 dark:text-[#475569] mx-auto mb-3" />
              <div className="text-sm text-slate-300 dark:text-[#94A3B8]">No days configured</div>
            </div>
          ) : (
            <DayTabs program={fullProgram} exerciseMap={exerciseMap} exerciseFullMap={exerciseFullMap} />
          )}
        </div>
      </div>

      {/* Share Popover */}
      {showShare && program && (
        <ShareWorkoutPopover
          workoutType="program"
          workoutId={program.id}
          workoutName={program.name}
          onClose={() => setShowShare(false)}
        />
      )}
      <ConfirmDeleteModal
        isOpen={confirmDelete}
        title="Delete Program"
        message={`Are you sure you want to delete "${program.name}"? This will remove all days and exercises.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};

const DayTabs = ({ program, exerciseMap, exerciseFullMap }) => {
  const [activeDay, setActiveDay] = useState(0);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  // Pre-built name→info map for fast fallback when exercise IDs don't match
  const exerciseNameMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    for (const info of Object.values(exerciseFullMap || {})) {
      if (info.name) map[info.name.toLowerCase()] = info;
    }
    return map;
  }, [exerciseFullMap]);
  const days = program.days ?? [];
  const day = days[activeDay];

  return (
    <div>
      <div className="flex items-center gap-0.5 px-5 pt-3 border-b border-slate-100 dark:border-[#243A58] overflow-x-auto no-scrollbar">
        {days.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setActiveDay(i)}
            className={`px-4 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
              activeDay === i
                ? d.is_rest_day ? 'border-slate-400 text-slate-500 dark:text-[#CBD5E1]' : 'border-indigo-600 text-indigo-600 dark:text-indigo-300'
                : 'border-transparent text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'
            }`}
          >
            {d.name ?? `Day ${d.day_number}`}
            {d.is_rest_day && (
              <span className="w-3.5 h-3.5 bg-slate-100 dark:bg-[#243A58] text-slate-400 dark:text-[#CBD5E1] rounded-full flex items-center justify-center text-[7px] font-black shrink-0">R</span>
            )}
          </button>
        ))}
      </div>

      {day && (
        <div className="px-5 py-5 space-y-5">
          {/* Rest Day block */}
          {day.is_rest_day ? (
            <div className="flex flex-col items-center justify-center py-14 rounded-xl border-2 border-dashed border-slate-100 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30] text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 dark:bg-[#1A2D48] rounded-full flex items-center justify-center">
                <MoonIcon size={24} className="text-slate-400 dark:text-[#CBD5E1]" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-600 dark:text-[#CBD5E1]">Rest Day</p>
                <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-1">Recovery and rest are as important as training.</p>
              </div>
              {day.instructions && (
                <p className="text-xs text-slate-500 dark:text-[#CBD5E1] italic max-w-xs">{day.instructions}</p>
              )}
            </div>
          ) : (
            <>
              {day.instructions && (
                <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-lg px-4 py-3 text-sm text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58]">
                  {day.instructions}
                </div>
              )}

              {/* Render sections from the day's persisted layout (section_meta + section_order). Falls back to the legacy 3-section enum for older programs. */}
              {(() => {
                const persistedMeta = (day as any).section_meta as Record<string, { label: string; color: string }> | null;
                const persistedOrder = ((day as any).section_order as string[] | null);
                const sectionOrder = (persistedOrder && persistedOrder.length > 0) ? persistedOrder : ['warmup', 'workout', 'cooldown'];
                return sectionOrder;
              })().map((sec: string) => {
                const rows = (day.exercises ?? []).filter((e) => e.section === sec);
                if (rows.length === 0) return null;
                const meta = ((day as any).section_meta || {})[sec];
                const label = meta?.label || DEFAULT_SECTION_LABELS[sec] || sec;
                const color = meta?.color || DEFAULT_SECTION_COLORS[sec] || '#6366f1';
                return (
                  <div key={sec} className="space-y-2">
                    {/* Colored section header row — band of the section's color with the section label */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
                      style={{ backgroundColor: `${color}1A`, borderLeft: `3px solid ${color}` }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <h4 className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{label}</h4>
                      <span className="ml-auto text-[10px] font-medium" style={{ color }}>{rows.length} {rows.length === 1 ? 'exercise' : 'exercises'}</span>
                    </div>
                    {rows.map((row, idx) => (
                      <ExerciseViewRow
                        key={row.id}
                        row={row}
                        letter={String(idx + 1)}
                        exerciseMap={exerciseMap}
                        exerciseFullMap={exerciseFullMap}
                        exerciseNameMap={exerciseNameMap}
                        isExpanded={expandedEx === row.id}
                        onToggle={() => setExpandedEx(expandedEx === row.id ? null : row.id)}
                      />
                    ))}
                  </div>
                );
              })}

              {(day.exercises ?? []).length === 0 && (
                <div className="py-10 text-center text-sm text-slate-500 dark:text-[#CBD5E1] border-2 border-dashed border-slate-100 dark:border-[#243A58] rounded-xl">
                  No exercises on this day
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ExerciseViewRow = ({ row, letter, exerciseMap, exerciseFullMap, exerciseNameMap, isExpanded, onToggle }) => {
  const hasMeta = row.sets || row.reps || row.rest_min || row.rest_sec || row.rir || row.rpe || row.weight;
  const exerciseName = row.exercise_name || exerciseMap[row.exercise_id] || row.name || row.exercise_id;
  // Use metadata fetched with the program first, fall back to exerciseFullMap from AppState
  const mapInfo = exerciseFullMap?.[row.exercise_id] || (exerciseName ? exerciseNameMap?.[exerciseName.toLowerCase()] : null);
  const rawDesc = row.description || mapInfo?.description || '';
  const desc = rawDesc && rawDesc.toLowerCase() !== 'no description provided.' ? rawDesc : '';
  const rawVideoUrl = row.video_url || mapInfo?.video_url || '';
  const videoUrl = rawVideoUrl && rawVideoUrl.startsWith('http') ? rawVideoUrl : '';
  const bodyParts = (row.body_parts?.length ? row.body_parts : null) || mapInfo?.body_parts || [];
  const categories = (row.categories?.length ? row.categories : null) || mapInfo?.categories || [];
  const hasDetail = true; // Always expandable

  return (
    <div className="bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] rounded-lg hover:border-slate-300 dark:hover:border-[#364E6E] transition-colors overflow-hidden">
      <button
        onClick={() => hasDetail ? onToggle() : null}
        className={`w-full text-left px-4 py-3 flex items-start gap-3 ${hasDetail ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className="w-6 h-6 bg-slate-800 dark:bg-indigo-600 text-white rounded-md flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
          {letter}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 dark:text-[#E2E8F0]">{exerciseName}</div>
          {hasMeta && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-[#CBD5E1] mt-1">
              {row.sets && <span>Sets: <span className="font-medium text-indigo-600 dark:text-indigo-300">{row.sets}</span></span>}
              {row.reps && <span>Reps: <span className="font-medium text-indigo-600 dark:text-indigo-300">{row.reps}</span></span>}
              {row.weight && (
                <span className="flex items-center gap-0.5">
                  <Weight size={10} className="text-indigo-500 dark:text-indigo-300" />
                  <span className="font-medium text-indigo-600 dark:text-indigo-300">{row.weight} kg</span>
                </span>
              )}
              {(row.rest_min > 0 || row.rest_sec > 0) && (
                <span>Rest: <span className="text-slate-600 dark:text-[#CBD5E1]">{row.rest_min}m {row.rest_sec}s</span></span>
              )}
              {row.rir && <span>RIR: <span className="text-slate-600 dark:text-[#CBD5E1]">{row.rir}</span></span>}
              {row.rpe && <span>RPE: <span className="text-slate-600 dark:text-[#CBD5E1]">{row.rpe}</span></span>}
            </div>
          )}
        </div>
        {hasDetail && (
          <span className="text-slate-300 dark:text-[#475569] shrink-0 mt-1">
            {isExpanded ? <XIcon size={12} /> : <ExternalLink size={12} />}
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-[#0F1C30] border-t border-slate-100 dark:border-[#243A58] space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {(bodyParts.length > 0 || categories.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {bodyParts.map((bp: string) => (
                <span key={bp} className="px-2 py-0.5 bg-slate-200 dark:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] rounded text-[9px] font-medium">{bp}</span>
              ))}
              {categories.map((cat: string) => (
                <span key={cat} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-600 text-indigo-600 dark:text-white rounded text-[9px] font-medium">{cat}</span>
              ))}
            </div>
          )}
          {row.notes && <p className="text-xs text-slate-500 dark:text-[#CBD5E1] italic">{row.notes}</p>}
          {desc && <p className="text-xs text-slate-600 dark:text-[#CBD5E1] leading-relaxed">{desc}</p>}
          {videoUrl && (
            <a href={videoUrl} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:text-indigo-400 transition-colors">
              <ExternalLink size={10} />
              Video Reference
            </a>
          )}
          {!desc && !videoUrl && !row.notes && bodyParts.length === 0 && categories.length === 0 && (
            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] italic">No additional information available for this exercise.</p>
          )}
        </div>
      )}
    </div>
  );
};
