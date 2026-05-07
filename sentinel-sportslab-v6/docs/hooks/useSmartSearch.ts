import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Exercise, ExerciseFilters } from './useExercises';

interface SmartSearchRow extends Exercise {
  match_type: 'exact' | 'fuzzy';
  similarity_score: number | null;
  total_count: number;
}

interface SmartSearchResult {
  exercises: Exercise[];
  total: number;
  totalPages: number;
  hasFuzzyResults: boolean;
  suggestions: { name: string; score: number }[];
}

/**
 * Debounced smart exercise search with fuzzy fallback.
 * Drop-in replacement for useExercises — same filters interface,
 * plus hasFuzzyResults and suggestions for "Did you mean?" UI.
 */
export function useSmartSearch(filters: ExerciseFilters = {}) {
  const { search, category, classification, muscleGroup, alphabetLetter, page = 1, pageSize = 50 } = filters;

  // Debounce search term by 300ms
  const [debouncedSearch, setDebouncedSearch] = useState(search ?? '');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search ?? ''), 300);
    return () => clearTimeout(t);
  }, [search]);

  return useQuery<SmartSearchResult>({
    queryKey: ['exercises-smart', { ...filters, search: debouncedSearch }],
    staleTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev, // keepPreviousData equivalent in v5
    queryFn: async () => {
      const offset = (page - 1) * pageSize;

      const { data, error } = await supabase.rpc('smart_exercise_search', {
        p_search: debouncedSearch || null,
        p_category: (category && category !== 'All') ? category : null,
        p_classification: (classification && classification !== 'All') ? classification : null,
        p_muscle_group: (muscleGroup && muscleGroup !== 'All') ? muscleGroup : null,
        p_alphabet_letter: (alphabetLetter && alphabetLetter !== 'All') ? alphabetLetter : null,
        p_limit: pageSize,
        p_offset: offset,
      });

      if (error) throw error;

      const rows = (data ?? []) as SmartSearchRow[];
      const total = rows.length > 0 ? Number(rows[0].total_count) : 0;
      const hasFuzzyResults = rows.some(r => r.match_type === 'fuzzy');

      // Top 3 fuzzy matches as "Did you mean?" suggestions
      const suggestions = rows
        .filter(r => r.match_type === 'fuzzy' && (r.similarity_score ?? 0) > 0.2)
        .slice(0, 3)
        .map(r => ({ name: r.name, score: r.similarity_score ?? 0 }));

      // Strip smart-search metadata from exercise objects
      const exercises: Exercise[] = rows.map(({ match_type, similarity_score, total_count, ...ex }) => ex);

      return {
        exercises,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasFuzzyResults,
        suggestions,
      };
    },
  });
}

interface SimilarFilters {
  bodyParts?: string[];
  categories?: string[];
  equipment?: string[];
  excludeId?: string;
  limit?: number;
}

/**
 * Fetch exercises similar to given metadata (body_parts, categories, equipment).
 * Used for "No results — try these similar exercises" panel.
 */
export function useSimilarExercises(filters: SimilarFilters, enabled = true) {
  return useQuery({
    queryKey: ['exercises-similar', filters],
    staleTime: 10 * 60 * 1000,
    enabled: enabled && !!(filters.bodyParts?.length || filters.categories?.length || filters.equipment?.length),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('suggest_similar_exercises', {
        p_body_parts: filters.bodyParts ?? null,
        p_categories: filters.categories ?? null,
        p_equipment: filters.equipment ?? null,
        p_exclude_id: filters.excludeId ?? null,
        p_limit: filters.limit ?? 10,
      });

      if (error) throw error;
      return (data ?? []) as { id: string; name: string; body_parts: string[]; categories: string[]; equipment: string[]; overlap_score: number }[];
    },
  });
}
