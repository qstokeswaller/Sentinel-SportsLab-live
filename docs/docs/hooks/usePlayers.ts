import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUserProfile } from './useUserProfile';

export interface TelemetryEntry {
  id: string;
  player_id: string;
  date: string;
  kms: number | null;
  rpe: number | null;
  wellness: {
    sleep?: number;
    stress?: number;
    fatigue?: number;
    mood?: number;
    soreness?: number;
  } | null;
}

export interface Player {
  id: string;
  squad_id: string | null;
  club_id: string;
  name: string;
  subsection: string | null;
  gender: string | null;
  age: number | null;
  adherence: number;
  one_rm: Record<string, number>; // exerciseId -> weight
  created_at: string;
  player_telemetry?: TelemetryEntry[];
  squads?: { name: string } | null;
}

/**
 * Fetches all players for the current club, optionally filtered by squad.
 * Includes their telemetry data for ACWR/EWMA calculations.
 */
export function usePlayers(squadId?: string | null) {
  return useQuery<Player[]>({
    queryKey: ['players', squadId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('players')
        .select(`
          *,
          player_telemetry(*),
          squads(name)
        `)
        .order('name');

      if (squadId) {
        query = query.eq('squad_id', squadId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Player[];
    },
  });
}

/**
 * Fetch a single player with full telemetry history.
 */
export function usePlayer(playerId: string) {
  return useQuery<Player>({
    queryKey: ['player', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          player_telemetry(*),
          squads(name)
        `)
        .eq('id', playerId)
        .single();
      if (error) throw error;
      return data as Player;
    },
  });
}

/**
 * Create a new player in the current club.
 */
export function useCreatePlayer() {
  const qc = useQueryClient();
  const { data: profile } = useUserProfile();

  return useMutation({
    mutationFn: async (
      player: Pick<Player, 'name' | 'squad_id' | 'subsection' | 'gender' | 'age'>
    ) => {
      if (!profile?.club_id) throw new Error('No club associated with your account.');
      const { data, error } = await supabase
        .from('players')
        .insert({ ...player, club_id: profile.club_id, one_rm: {} })
        .select()
        .single();
      if (error) throw error;
      return data as Player;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  });
}

/**
 * Update a player's profile data or 1RM values.
 */
export function useUpdatePlayer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Player> & { id: string }) => {
      const { data, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Player;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['players'] });
      qc.invalidateQueries({ queryKey: ['player', data.id] });
    },
  });
}

/**
 * Delete a player and all their telemetry (CASCADE on the DB).
 */
export function useDeletePlayer() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['players'] }),
  });
}

/**
 * Add a single telemetry entry (RPE session) for a player.
 * Uses UPSERT so re-entering data for the same date updates rather than errors.
 */
export function useUpsertTelemetry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Omit<TelemetryEntry, 'id'>) => {
      const { data, error } = await supabase
        .from('player_telemetry')
        .upsert(entry, { onConflict: 'player_id,date' })
        .select()
        .single();
      if (error) throw error;
      return data as TelemetryEntry;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['players'] });
      qc.invalidateQueries({ queryKey: ['player', data.player_id] });
    },
  });
}

/**
 * Fetch raw telemetry for ACWR calculations — returns a flat array sorted by date ASC.
 * Used by the Analytics hub for EWMA calculations.
 */
export function usePlayerTelemetry(playerId: string, from?: string, to?: string) {
  return useQuery<TelemetryEntry[]>({
    queryKey: ['telemetry', playerId, from, to],
    enabled: !!playerId,
    queryFn: async () => {
      let query = supabase
        .from('player_telemetry')
        .select('*')
        .eq('player_id', playerId)
        .order('date', { ascending: true });

      if (from) query = query.gte('date', from);
      if (to) query = query.lte('date', to);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TelemetryEntry[];
    },
  });
}
