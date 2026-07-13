// Hooks for GPS Insights saved dashboards — mirrors useWeightroomSheets.
// A dashboard is a named list of GpsChartConfig objects (JSONB); charts
// re-render against live gpsData on open, so dashboards stay current.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { GpsDashboard, GpsChartConfig } from '../pages/reporting/gpsBuilder/types';

/** @param source which insights surface owns these dashboards ('gps' | 'testing' | …). */
export function useGpsDashboards(source: string = 'gps') {
    return useQuery({
        queryKey: ['gps-dashboards', source],
        queryFn: async (): Promise<GpsDashboard[]> => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) return [];
            // RLS: own dashboards + org-visible ones.
            const { data, error } = await supabase
                .from('gps_dashboards')
                .select('*')
                .eq('source', source)
                .order('updated_at', { ascending: false });
            if (error) throw error;
            return (data ?? []) as unknown as GpsDashboard[];
        },
    });
}

export function useCreateGpsDashboard() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { name: string; team_id?: string | null; charts?: GpsChartConfig[]; visibility?: 'personal' | 'org'; source?: string }) => {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData.user) throw new Error('Not authenticated');
            const { data, error } = await supabase
                .from('gps_dashboards')
                .insert({
                    name: payload.name,
                    team_id: payload.team_id ?? null,
                    charts: (payload.charts ?? []) as any,
                    visibility: payload.visibility ?? 'personal',
                    source: payload.source ?? 'gps',
                    user_id: userData.user.id,
                } as any) // organisation_id filled by trg_set_org_on_insert
                .select()
                .single();
            if (error) throw error;
            return data as unknown as GpsDashboard;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['gps-dashboards'] }),
    });
}

export function useUpdateGpsDashboard() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<GpsDashboard> & { id: string }) => {
            const { id, ...updates } = payload;
            const { data, error } = await supabase
                .from('gps_dashboards')
                .update({ ...updates, updated_at: new Date().toISOString() } as any)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as unknown as GpsDashboard;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['gps-dashboards'] }),
    });
}

export function useDeleteGpsDashboard() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (dashboardId: string) => {
            const { error } = await supabase.from('gps_dashboards').delete().eq('id', dashboardId);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['gps-dashboards'] }),
    });
}
