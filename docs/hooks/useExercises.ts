// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUserProfile } from './useUserProfile';

export interface Exercise {
  id: string;
  club_id: string | null;
  name: string;
  description: string | null;
  body_parts: string[];
  categories: string[];
  equipment: string[] | null;
  video_url: string | null;
  tracking_type: string | null;
  tags: string[] | null;
  options: {
    posture?: string | null;
    grip?: string | null;
    alternating?: boolean;
    movementPattern?: string | null;
    mechanics?: string | null;
    longVideoUrl?: string | null;
  } | null;
  created_at: string;
}

export interface ExerciseFilters {
  search?: string;
  category?: string;         // body region — matches categories array
  classification?: string;   // classification — matches categories array
  muscleGroup?: string;      // matches body_parts array
  alphabetLetter?: string;   // first letter filter
  page?: number;
  pageSize?: number;
}

/**
 * Fetches paginated exercises from Supabase with optional filters.
 * Shared exercises (club_id = null) are visible to all authenticated users.
 * The RLS policy handles data isolation automatically.
 */
export function useExercises(filters: ExerciseFilters = {}) {
  const { search, category, classification, muscleGroup, alphabetLetter, page = 1, pageSize = 50 } = filters;

  return useQuery({
    queryKey: ['exercises', filters],
    staleTime: 10 * 60 * 1000, // 10 min — exercise library changes infrequently
    queryFn: async () => {
      let query = supabase
        .from('exercises')
        .select('*', { count: 'exact' });

      if (search?.trim()) {
        query = query.ilike('name', `%${search.trim()}%`);
      }
      if (alphabetLetter && alphabetLetter !== 'All') {
        query = query.ilike('name', `${alphabetLetter}%`);
      }
      if (category && category !== 'All') {
        query = query.contains('categories', [category]);
      }
      if (classification && classification !== 'All') {
        query = query.contains('categories', [classification]);
      }
      if (muscleGroup && muscleGroup !== 'All') {
        query = query.contains('body_parts', [muscleGroup]);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('name');

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        exercises: (data ?? []) as Exercise[],
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
  });
}

/**
 * Fetch a single exercise by ID.
 */
export function useExercise(id: string) {
  return useQuery({
    queryKey: ['exercise', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Exercise;
    },
  });
}

/**
 * Create a custom exercise scoped to the current user's club.
 */
export function useCreateExercise() {
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();

  return useMutation({
    mutationFn: async (exercise: Omit<Exercise, 'id' | 'club_id' | 'created_at'>) => {
      if (!profile?.club_id) throw new Error('No club associated with your account.');
      const { data, error } = await supabase
        .from('exercises')
        .insert({ ...exercise, club_id: profile.club_id })
        .select()
        .single();
      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

/**
 * Update an existing exercise (must belong to user's club).
 */
export function useUpdateExercise() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Exercise> & { id: string }) => {
      const { data, error } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercise', data.id] });
    },
  });
}

/**
 * Delete an exercise (must belong to user's club — shared exercises are protected by RLS).
 */
export function useDeleteExercise() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exercises').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}