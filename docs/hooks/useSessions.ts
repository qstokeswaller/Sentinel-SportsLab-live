import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUserProfile } from './useUserProfile';

export interface ScheduledSession {
  id: string;
  club_id: string;
  target_id: string;           // player_id or squad_id
  target_type: 'Team' | 'Individual';
  date: string;                // ISO date string YYYY-MM-DD
  title: string | null;
  load: string | null;         // 'Low' | 'Medium' | 'High' | 'Maximal' | 'Rest'
  training_phase: string | null;
  notes: string | null;
  exercise_ids: string[];
  planned_duration: number | null; // minutes
  actual_duration: number | null;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  created_at: string;
}

export interface SessionFilters {
  targetId?: string;
  targetType?: 'Team' | 'Individual';
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}

/**
 * Fetch sessions for the current club, with optional filters.
 * RLS automatically scopes to the user's club.
 */
export function useSessions(filters: SessionFilters = {}) {
  return useQuery<ScheduledSession[]>({
    queryKey: ['sessions', filters],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_sessions')
        .select('*')
        .order('date', { ascending: false });

      if (filters.targetId) query = query.eq('target_id', filters.targetId);
      if (filters.targetType) query = query.eq('target_type', filters.targetType);
      if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('date', filters.dateTo);
      if (filters.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ScheduledSession[];
    },
  });
}

/**
 * Fetch sessions for a date range — used by the dashboard calendar.
 */
export function useSessionsInRange(dateFrom: string, dateTo: string) {
  return useSessions({ dateFrom, dateTo });
}

/**
 * Fetch sessions for a specific player or squad.
 */
export function useSessionsForTarget(targetId: string, targetType?: 'Team' | 'Individual') {
  return useSessions({ targetId, targetType });
}

/**
 * Fetch a single session by ID.
 */
export function useSession(sessionId: string) {
  return useQuery<ScheduledSession>({
    queryKey: ['session', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error) throw error;
      return data as ScheduledSession;
    },
  });
}

/**
 * Create a new scheduled session.
 */
export function useCreateSession() {
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();

  return useMutation({
    mutationFn: async (
      session: Omit<ScheduledSession, 'id' | 'club_id' | 'created_at'>
    ) => {
      if (!profile?.club_id) throw new Error('No club associated with your account.');
      const { data, error } = await supabase
        .from('scheduled_sessions')
        .insert({ ...session, club_id: profile.club_id })
        .select()
        .single();
      if (error) throw error;
      return data as ScheduledSession;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

/**
 * Update a session (e.g. mark as completed, add actual duration, add notes).
 */
export function useUpdateSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledSession> & { id: string }) => {
      const { data, error } = await supabase
        .from('scheduled_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ScheduledSession;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session', data.id] });
    },
  });
}

/**
 * Delete a session.
 */
export function useDeleteSession() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
}
