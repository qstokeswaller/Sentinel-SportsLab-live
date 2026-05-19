// @ts-nocheck
// Hooks for the saved-sheets library — mirrors useWorkoutPrograms / useWorkoutTemplates pattern.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

/**
 * Provenance metadata for a sheet that originated from a packet/session.
 * NULL for standalone sheets created directly via the Sheets page.
 */
export interface SheetSourceContext {
    packetId: string;
    packetName: string;
    sessionDate?: string | null;   // ISO date — when the sheet was generated for
    targetType?: 'Team' | 'Individual' | null;
    targetId?: string | null;
    targetName?: string | null;    // denormalized so display survives target deletion
}

export interface WeightroomSheet {
    id: string;
    user_id: string;
    name: string;
    ws_mode: string;          // 'blank' | 'advanced' | 'labeled' | 'empty-header'
    ws_orientation: string;   // 'portrait' | 'landscape'
    ws_columns: { id: string; label: string; exerciseId: string; percentage: number }[];
    team_id: string | null;
    notes: string | null;
    source_context: SheetSourceContext | null;
    created_at: string;
    updated_at: string;
}

export function useWeightroomSheets() {
    return useQuery({
        queryKey: ['weightroom-sheets'],
        queryFn: async (): Promise<WeightroomSheet[]> => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return [];
            const { data, error } = await supabase
                .from('weightroom_sheets')
                .select('*')
                .eq('user_id', userData.user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data ?? []) as WeightroomSheet[];
        },
    });
}

export function useCreateSheet() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Omit<WeightroomSheet, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');
            const { data, error } = await supabase
                .from('weightroom_sheets')
                .insert({ ...payload, user_id: userData.user.id })
                .select()
                .single();
            if (error) throw error;
            return data as WeightroomSheet;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['weightroom-sheets'] }),
    });
}

export function useUpdateSheet() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<WeightroomSheet> & { id: string }) => {
            const { id, ...updates } = payload;
            const { data, error } = await supabase
                .from('weightroom_sheets')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as WeightroomSheet;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['weightroom-sheets'] }),
    });
}

export function useDeleteSheet() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (sheetId: string) => {
            const { error } = await supabase
                .from('weightroom_sheets')
                .delete()
                .eq('id', sheetId);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['weightroom-sheets'] }),
    });
}
