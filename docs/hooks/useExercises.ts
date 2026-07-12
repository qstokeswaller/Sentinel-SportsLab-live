import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUserProfile } from './useUserProfile';

export interface Exercise {
  id: string;
  user_id: string | null;
  organisation_id: string | null; // NULL = Platform Library default; non-NULL = org override or org-new
  source_id: string | null;        // FK to the platform-default this row overrides (NULL for defaults + org-new)
  name: string;
  description: string | null;
  body_parts: string[];
  categories: string[];
  equipment: string[] | null;
  video_url: string | null;
  tracking_type?: string | null;
  tags: string[] | null;
  images: string[] | null;        // up to 4 public URLs from exercise-images bucket
  safety_cues: string | null;     // safety warnings + coaching cues (renamed from VCP "Cautions")
  options: {
    posture?: string | null;
    grip?: string | null;
    alternating?: boolean;
    movementPattern?: string | null;
    mechanics?: string | null;
    forceType?: string | null;
    cnsDemand?: string | null;
    difficulty?: string | null;
    longVideoUrl?: string | null;
  } | null;
  created_at: string;
  // ── Overlay-merge fields injected by the read path (not in DB) ─────────
  __custom?: boolean;          // true if this row is an org override or org-new
  __original_id?: string;      // present on overrides — points at the underlying Platform Library default's id
  __override_id?: string | null; // actual UUID of the override row (when canonical id is the default's id)
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
      // Fetch ALL visible rows (RLS exposes platform defaults + this org's rows).
      // We must merge in JS because filtering on the server would hide platform-default rows that have
      // org-specific overrides we want to surface instead.
      let query = supabase.from('exercises').select('*');

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

      query = query.order('name');

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as Exercise[];

      // Build override map keyed by source_id.
      const overridesBySourceId = new Map<string, Exercise>();
      const orgNew: Exercise[] = [];
      const platformDefaults: Exercise[] = [];

      for (const row of rows) {
        if (row.organisation_id && row.source_id) {
          // Override of a platform default
          overridesBySourceId.set(row.source_id, row);
        } else if (row.organisation_id && !row.source_id) {
          // Org-new exercise
          orgNew.push(row);
        } else {
          // Platform default (organisation_id is null)
          platformDefaults.push(row);
        }
      }

      // Merge: prefer override when present, otherwise the platform default.
      const merged: Exercise[] = [];
      for (const def of platformDefaults) {
        const override = overridesBySourceId.get(def.id);
        if (override) {
          merged.push({ ...override, __custom: true, __original_id: def.id });
        } else {
          merged.push({ ...def, __custom: false });
        }
      }
      for (const n of orgNew) {
        merged.push({ ...n, __custom: true });
      }

      // Sort by name post-merge (overrides may have been renamed).
      merged.sort((a, b) => a.name.localeCompare(b.name));

      // Paginate in memory.
      const total = merged.length;
      const from = (page - 1) * pageSize;
      const to = from + pageSize;
      const pageSlice = merged.slice(from, to);

      return {
        exercises: pageSlice,
        total,
        totalPages: Math.ceil(total / pageSize),
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
 * Create a brand-new organisation-scoped exercise (not an override).
 * organisation_id is filled by the BEFORE INSERT trigger; we explicitly null
 * source_id so it's classified as "org-new" rather than an override.
 */
export function useCreateExercise() {
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();

  return useMutation({
    mutationFn: async (exercise: Omit<Exercise, 'id' | 'user_id' | 'created_at' | 'organisation_id' | 'source_id' | '__custom' | '__original_id'>) => {
      if (!profile?.id) throw new Error('Not authenticated.');
      const payload: any = { ...exercise, user_id: profile.id, source_id: null };
      delete payload.__custom;
      delete payload.__original_id;
      const { data, error } = await supabase
        .from('exercises')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return { ...(data as Exercise), __custom: true } as Exercise;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercises-smart'] });
    },
  });
}

/**
 * Update an existing exercise.
 * If the target row is a Platform Library default (organisation_id IS NULL),
 * we don't mutate it — we insert an organisation-scoped override row pointing
 * back at the default via source_id. Subsequent edits to that override go
 * through a normal UPDATE.
 */
export function useUpdateExercise() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<Exercise> & { id: string }) => {
      const { id, __custom, __original_id, __override_id, ...updates } = input as any;

      // Strip overlay-only fields so they never hit the DB.
      delete (updates as any).__custom;
      delete (updates as any).__original_id;
      delete (updates as any).__override_id;

      // If we already have an override id, the canonical id is the platform-default's id —
      // the actual writable row is __override_id. Otherwise, id is the writable row.
      const targetId: string = __override_id || id;

      const { data: target, error: fetchErr } = await supabase
        .from('exercises')
        .select('id, organisation_id, source_id')
        .eq('id', targetId)
        .single();
      if (fetchErr) throw fetchErr;
      if (!target) throw new Error('Exercise not found.');

      // Case 1: platform-default (no org). Insert an override row pointing at it.
      if (target.organisation_id === null) {
        const insertPayload: any = { ...updates, source_id: target.id };
        delete insertPayload.id;
        delete insertPayload.user_id;
        delete insertPayload.organisation_id; // BEFORE INSERT trigger fills this
        delete insertPayload.created_at;

        const { data, error } = await supabase
          .from('exercises')
          .insert(insertPayload)
          .select()
          .single();
        if (error) throw error;
        // Surface the canonical id (= the default's id) so callers' references keep working.
        return {
          ...(data as Exercise),
          id: target.id,
          __custom: true,
          __original_id: target.id,
          __override_id: (data as any).id,
        } as Exercise;
      }

      // Case 2: org-scoped row (override or org-new). Normal UPDATE.
      const { data, error } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', targetId)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('You can only edit exercises in your organisation.');
      const row = data[0] as Exercise;
      // If this is an override, keep id = canonical (default) id; surface real row id as __override_id.
      const canonicalId = row.source_id ?? row.id;
      return {
        ...row,
        id: canonicalId,
        __custom: true,
        __original_id: row.source_id ?? undefined,
        __override_id: row.id,
      } as Exercise;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercises-smart'] });
      qc.invalidateQueries({ queryKey: ['exercise', data.id] });
    },
  });
}

/**
 * Reset an exercise back to its Platform Library default by deleting the
 * organisation-scoped override row. The default reappears in the merged view.
 * No-op if the exercise has no source_id (it's not an override).
 */
export function useResetExerciseToDefault() {
  const qc = useQueryClient();

  return useMutation({
    // Accepts either the canonical exercise row (preferred — it has __override_id),
    // or a bare override row id (fallback for direct callers).
    mutationFn: async (input: { id: string; __override_id?: string | null } | string) => {
      const overrideId =
        typeof input === 'string'
          ? input
          : (input.__override_id ?? input.id);

      const { data: target, error: fetchErr } = await supabase
        .from('exercises')
        .select('id, organisation_id, source_id')
        .eq('id', overrideId)
        .single();
      if (fetchErr) throw fetchErr;
      if (!target) throw new Error('Exercise not found.');
      if (target.organisation_id === null) {
        throw new Error('This is already the Platform Library default.');
      }
      if (!target.source_id) {
        throw new Error('This is an organisation-created exercise — use Delete instead.');
      }

      const { error } = await supabase.from('exercises').delete().eq('id', overrideId);
      if (error) throw error;
      return { restoredDefaultId: target.source_id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercises-smart'] });
    },
  });
}

/**
 * Delete an exercise. Platform defaults can never be deleted (RLS blocks it
 * anyway; we reject early for a friendly error). For overrides, deleting
 * "resets to default". For org-new rows, deleting truly removes them.
 */
export function useDeleteExercise() {
  const qc = useQueryClient();

  return useMutation({
    // Accepts either the canonical exercise row (with __override_id) or a bare id.
    mutationFn: async (input: { id: string; __override_id?: string | null } | string) => {
      const writableId =
        typeof input === 'string'
          ? input
          : (input.__override_id ?? input.id);

      const { data: target, error: fetchErr } = await supabase
        .from('exercises')
        .select('id, organisation_id, source_id')
        .eq('id', writableId)
        .single();
      if (fetchErr) throw fetchErr;
      if (!target) throw new Error('Exercise not found.');
      if (target.organisation_id === null) {
        throw new Error('Platform Library defaults cannot be deleted.');
      }
      const { error } = await supabase.from('exercises').delete().eq('id', writableId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercises-smart'] });
    },
  });
}