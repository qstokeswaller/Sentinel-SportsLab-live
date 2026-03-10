import { useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';

/**
 * Provides a stable exercise ID → name lookup map.
 * Use this anywhere you need to resolve exercise IDs to human-readable names.
 *
 * Usage:
 *   const { resolveExerciseName } = useExerciseMap();
 *   const name = resolveExerciseName('ex_1770810675236_162'); // → "Barbell Squat"
 */
export function useExerciseMap() {
  const { exercises } = useAppState();

  const exerciseMap = useMemo(() => {
    const map: Record<string, string> = {};
    (exercises || []).forEach((e: any) => {
      if (e.id && e.name) map[e.id] = e.name;
    });
    return map;
  }, [exercises]);

  const exerciseFullMap = useMemo(() => {
    const map: Record<string, { name: string; body_parts: string[]; categories: string[] }> = {};
    (exercises || []).forEach((e: any) => {
      if (e.id) map[e.id] = {
        name: e.name || '',
        body_parts: e.body_parts || [],
        categories: e.categories || [],
      };
    });
    return map;
  }, [exercises]);

  const resolveExerciseName = (exerciseId: string): string => {
    if (!exerciseId) return '—';
    if (exerciseMap[exerciseId]) return exerciseMap[exerciseId];
    return exerciseId;
  };

  return { exerciseMap, exerciseFullMap, resolveExerciseName };
}
