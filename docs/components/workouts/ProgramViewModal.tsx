// @ts-nocheck
import React, { useState } from 'react';
import { XIcon, PencilIcon, Trash2Icon, TagIcon, CalendarIcon, LayersIcon } from 'lucide-react';
import { useProgramWithDays, useDeleteProgram, type WorkoutProgram } from '../../hooks/useWorkoutPrograms';
import { ProgramBuilderModal } from './ProgramBuilderModal';

// ── Helpers ────────────────────────────────────────────────────────────────

type Section = 'warmup' | 'workout' | 'cooldown';

const SECTION_LABELS: Record<Section, string> = {
  warmup: 'Warm Up',
  workout: 'Workout',
  cooldown: 'Cool Down',
};

const VOLUME_COLORS: Record<string, string> = {
  'Upper Body': 'bg-indigo-100 text-indigo-700',
  'Lower Body': 'bg-emerald-100 text-emerald-700',
  'Core': 'bg-amber-100 text-amber-700',
  'Full Body': 'bg-purple-100 text-purple-700',
  'Plyometric': 'bg-orange-100 text-orange-700',
  'Olympic Weightlifting': 'bg-rose-100 text-rose-700',
  'Powerlifting': 'bg-red-100 text-red-700',
  'Mobility': 'bg-teal-100 text-teal-700',
  'Bodybuilding': 'bg-sky-100 text-sky-700',
  'Calisthenics': 'bg-violet-100 text-violet-700',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Volume from exercises ──────────────────────────────────────────────────
// We don't have category data on saved rows — we'd need a join or lookup.
// For the view modal, show exercises grouped by section with their fields.

// ── Main Component ─────────────────────────────────────────────────────────

interface ProgramViewModalProps {
  program: WorkoutProgram | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProgramViewModal = ({ program, isOpen, onClose }: ProgramViewModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: fullProgram, isLoading } = useProgramWithDays(isOpen ? program?.id ?? null : null);
  const deleteProgram = useDeleteProgram();

  const handleDelete = async () => {
    if (!program) return;
    await deleteProgram.mutateAsync(program.id);
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
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] border-t-8 border-t-slate-900 animate-in zoom-in-95">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex items-start justify-between shrink-0">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 leading-none">{program.name}</h2>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <CalendarIcon size={12} />
                {formatDate(program.created_at)}
              </span>
              {(program.tags ?? []).length > 0 && (
                <div className="flex items-center gap-1.5">
                  <TagIcon size={12} />
                  {(program.tags ?? []).join(', ')}
                </div>
              )}
            </div>
            {program.overview && (
              <p className="text-sm font-medium text-slate-500 max-w-2xl">{program.overview}</p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <PencilIcon size={14} /> Edit
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2Icon size={14} /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-600">Confirm?</span>
                <button onClick={handleDelete} className="px-3 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500">No</button>
              </div>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-16 text-center text-[11px] font-black uppercase tracking-widest text-slate-400">
              Loading program...
            </div>
          ) : !fullProgram || (fullProgram.days ?? []).length === 0 ? (
            <div className="p-16 text-center">
              <LayersIcon size={32} className="text-slate-200 mx-auto mb-4" />
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-300">No days configured</div>
            </div>
          ) : (
            <DayTabs program={fullProgram} />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Day Tabs Sub-component ─────────────────────────────────────────────────

const DayTabs = ({ program }) => {
  const [activeDay, setActiveDay] = useState(0);
  const days = program.days ?? [];
  const day = days[activeDay];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-100 overflow-x-auto no-scrollbar">
        {days.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setActiveDay(i)}
            className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider whitespace-nowrap rounded-t-xl transition-all border-b-2 ${
              activeDay === i
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            {d.name ?? `Day ${d.day_number}`}
          </button>
        ))}
      </div>

      {/* Day content */}
      {day && (
        <div className="px-8 py-6 space-y-6">
          {/* Instructions */}
          {day.instructions && (
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 border border-slate-200">
              {day.instructions}
            </div>
          )}

          {/* Sections */}
          {(['warmup', 'workout', 'cooldown'] as Section[]).map((sec) => {
            const rows = (day.exercises ?? []).filter((e) => e.section === sec);
            if (rows.length === 0) return null;
            return (
              <div key={sec} className="space-y-2">
                <div className="flex items-center gap-3 mb-3">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">{SECTION_LABELS[sec]}</h4>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                {rows.map((row, idx) => (
                  <ExerciseViewRow key={row.id} row={row} letter={String.fromCharCode(65 + idx)} />
                ))}
              </div>
            );
          })}

          {(day.exercises ?? []).length === 0 && (
            <div className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl">
              No exercises on this day
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Exercise view row ─────────────────────────────────────────────────────

const ExerciseViewRow = ({ row, letter }) => {
  const hasMeta = row.sets || row.reps || row.rest_min || row.rest_sec || row.rir || row.rpe || row.intensity || row.tempo;
  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors">
      <span className="w-7 h-7 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[11px] font-black shrink-0">
        {letter}
      </span>
      <div className="flex-1">
        <div className="text-sm font-bold text-slate-800">{row.exercise_id}</div>
        {row.notes && <div className="text-[11px] font-medium text-slate-400 mt-0.5">{row.notes}</div>}
      </div>
      {hasMeta && (
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 shrink-0">
          {row.sets && <span>Sets: <span className="text-indigo-600">{row.sets}</span></span>}
          {row.reps && <span>Reps: <span className="text-indigo-600">{row.reps}</span></span>}
          {(row.rest_min > 0 || row.rest_sec > 0) && (
            <span>REST: <span className="text-slate-700">{row.rest_min} min {row.rest_sec} sec</span></span>
          )}
          {row.rir && <span>RIR: <span className="text-slate-700">{row.rir}</span></span>}
          {row.rpe && <span>RPE: <span className="text-slate-700">{row.rpe}</span></span>}
          {row.notes && <span className="hidden">Notes: {row.notes}</span>}
        </div>
      )}
    </div>
  );
};
