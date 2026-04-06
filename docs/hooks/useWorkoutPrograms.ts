import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WorkoutProgram {
  id: string;
  user_id: string;
  name: string;
  overview: string | null;
  tags: string[];
  track_tonnage: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkoutDay {
  id: string;
  program_id: string;
  user_id: string;
  day_number: number;
  name: string | null;
  instructions: string | null;
  created_at: string;
}

export interface WorkoutDayExercise {
  id: string;
  day_id: string;
  user_id: string;
  exercise_id: string;
  section: 'warmup' | 'workout' | 'cooldown';
  order_index: number;
  sets: string | null;
  reps: string | null;
  rest_min: number;
  rest_sec: number;
  rir: string | null;
  rpe: string | null;
  intensity: string | null;
  tempo: string | null;
  notes: string | null;
  weight: string | null;
  athlete_weight_overrides: Record<string, string> | null;
  created_at: string;
}

export interface FullProgram extends WorkoutProgram {
  days: (WorkoutDay & { exercises: WorkoutDayExercise[] })[];
}

// ── Queries ────────────────────────────────────────────────────────────────

/** Fetch all programs for the current user, ordered newest first. */
export function useWorkoutPrograms() {
  return useQuery({
    queryKey: ['workout-programs'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_programs')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkoutProgram[];
    },
  });
}

/** Fetch a single program with all its days and exercises. */
export function useProgramWithDays(programId: string | null) {
  return useQuery({
    queryKey: ['workout-program', programId],
    enabled: !!programId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!programId) return null;

      // Parallelize program + days fetch (independent queries)
      const [programResult, daysResult] = await Promise.all([
        supabase.from('workout_programs').select('*').eq('id', programId).single(),
        supabase.from('workout_days').select('*').eq('program_id', programId).order('day_number'),
      ]);
      if (programResult.error) throw programResult.error;
      if (daysResult.error) throw daysResult.error;
      const program = programResult.data;
      const days = daysResult.data;

      const dayIds = (days ?? []).map((d: WorkoutDay) => d.id);
      let exercises: WorkoutDayExercise[] = [];
      if (dayIds.length > 0) {
        const { data: exData, error: eErr } = await supabase
          .from('workout_day_exercises')
          .select('*')
          .in('day_id', dayIds)
          .order('order_index');
        if (eErr) throw eErr;

        // Resolve exercise metadata from the exercises table
        const exerciseIds = [...new Set((exData ?? []).map((e: any) => e.exercise_id).filter(Boolean))];
        let exMetaMap: Record<string, { name: string; description?: string; body_parts?: string[]; categories?: string[]; video_url?: string }> = {};
        if (exerciseIds.length > 0) {
          const { data: metaData, error: metaErr } = await supabase
            .from('exercises')
            .select('id, name, description, body_parts, categories, video_url')
            .in('id', exerciseIds);
          if (metaErr) console.warn('Could not resolve exercise metadata:', metaErr.message);
          if (metaData) {
            for (const n of metaData) { exMetaMap[n.id] = n; }
          }
        }

        exercises = (exData ?? []).map((e: any) => ({
          ...e,
          exercise_name: exMetaMap[e.exercise_id]?.name || null,
          description: exMetaMap[e.exercise_id]?.description || null,
          body_parts: exMetaMap[e.exercise_id]?.body_parts || [],
          categories: exMetaMap[e.exercise_id]?.categories || [],
          video_url: exMetaMap[e.exercise_id]?.video_url || null,
        })) as WorkoutDayExercise[];
      }

      const fullDays = (days ?? []).map((day: WorkoutDay) => ({
        ...day,
        exercises: exercises.filter((e) => e.day_id === day.id),
      }));

      return { ...program, days: fullDays } as FullProgram;
    },
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

/** Create a new program record (name + overview + tags only). */
export function useCreateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; overview?: string; tags?: string[]; track_tonnage?: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('workout_programs')
        .insert({ ...payload, user_id: userData.user.id })
        .select()
        .single();
      if (error) throw error;
      return data as WorkoutProgram;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-programs'] }),
  });
}

/** Update program metadata. */
export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WorkoutProgram> & { id: string }) => {
      const { id, ...updates } = payload;
      const { data, error } = await supabase
        .from('workout_programs')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkoutProgram;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['workout-programs'] });
      qc.invalidateQueries({ queryKey: ['workout-program', data.id] });
    },
  });
}

/** Delete a program (cascade deletes days + exercises). */
export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const { error } = await supabase
        .from('workout_programs')
        .delete()
        .eq('id', programId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout-programs'] }),
  });
}

// ── Save full program (days + exercises) ───────────────────────────────────

export interface SaveDayPayload {
  day_number: number;
  name: string;
  instructions: string;
  exercises: {
    exercise_id: string;
    section: 'warmup' | 'workout' | 'cooldown';
    order_index: number;
    sets: string;
    reps: string;
    rest_min: number;
    rest_sec: number;
    rir: string;
    rpe: string;
    intensity: string;
    tempo: string;
    notes: string;
    weight: string;
    athlete_weight_overrides?: Record<string, string>;
  }[];
}

/**
 * Delete-then-insert all days + exercises for a program.
 * Used after create/update program metadata.
 */
export function useSaveProgramFull() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      programId,
      days,
    }: {
      programId: string;
      days: SaveDayPayload[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const userId = userData.user.id;

      // 1. Delete existing days (cascade deletes exercises)
      const { error: delErr } = await supabase
        .from('workout_days')
        .delete()
        .eq('program_id', programId);
      if (delErr) throw delErr;

      // 2. Insert days
      if (days.length === 0) return;
      const { data: insertedDays, error: dayErr } = await supabase
        .from('workout_days')
        .insert(
          days.map((d) => ({
            program_id: programId,
            user_id: userId,
            day_number: d.day_number,
            name: d.name,
            instructions: d.instructions,
          }))
        )
        .select();
      if (dayErr) throw dayErr;

      // 3. Insert exercises for each day
      const allExercises: object[] = [];
      days.forEach((d, i) => {
        const savedDay = (insertedDays as WorkoutDay[])[i];
        if (!savedDay) return;
        d.exercises.forEach((ex) => {
          allExercises.push({ ...ex, day_id: savedDay.id, user_id: userId });
        });
      });

      if (allExercises.length > 0) {
        const { error: exErr } = await supabase
          .from('workout_day_exercises')
          .insert(allExercises);
        if (exErr) throw exErr;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['workout-programs'] });
      qc.invalidateQueries({ queryKey: ['workout-program', variables.programId] });
    },
  });
}
