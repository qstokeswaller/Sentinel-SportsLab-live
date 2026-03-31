import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUserProfile } from './useUserProfile';

export interface Squad {
  id: string;
  club_id: string;
  name: string;
  sport: string | null;
  status: 'Active' | 'Off-Season' | 'Pre-Season' | null;
  description: string | null;
  created_at: string;
  player_count?: number;
}

/**
 * Fetches all squads for the current user's club.
 * RLS automatically filters to the user's club — no manual club_id needed in the query.
 */
export function useSquads() {
  return useQuery<Squad[]>({
    queryKey: ['squads'],
    staleTime: 5 * 60 * 1000, // 5 minutes — squad structure rarely changes
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select(`
          *,
          players(count)
        `)
        .order('name');

      if (error) throw error;

      // Flatten the count from the nested relation
      return (data ?? []).map((s: any) => ({
        ...s,
        player_count: s.players?.[0]?.count ?? 0,
        players: undefined,
      })) as Squad[];
    },
  });
}

/**
 * Fetch a single squad by ID.
 */
export function useSquad(squadId: string) {
  return useQuery<Squad>({
    queryKey: ['squad', squadId],
    staleTime: 5 * 60 * 1000,
    enabled: !!squadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .eq('id', squadId)
        .single();
      if (error) throw error;
      return data as Squad;
    },
  });
}

/**
 * Create a new squad scoped to the current user's club.
 */
export function useCreateSquad() {
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();

  return useMutation({
    mutationFn: async (squad: Pick<Squad, 'name' | 'sport' | 'status' | 'description'>) => {
      if (!profile?.club_id) throw new Error('No club associated with your account.');
      const { data, error } = await supabase
        .from('squads')
        .insert({ ...squad, club_id: profile.club_id })
        .select()
        .single();
      if (error) throw error;
      return data as Squad;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['squads'] }),
  });
}

/**
 * Update an existing squad.
 */
export function useUpdateSquad() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Squad> & { id: string }) => {
      const { data, error } = await supabase
        .from('squads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Squad;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['squads'] });
      qc.invalidateQueries({ queryKey: ['squad', data.id] });
    },
  });
}

/**
 * Delete a squad.
 */
export function useDeleteSquad() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('squads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['squads'] });
      qc.invalidateQueries({ queryKey: ['players'] });
    },
  });
}
