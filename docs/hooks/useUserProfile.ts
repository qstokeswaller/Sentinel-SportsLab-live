import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface UserProfile {
  id: string;
  account_type: 'individual' | 'club';
  role: string;
  created_at: string;
}

/**
 * Returns the current user's profile row. The pre-multi-tenant `clubs` table is gone —
 * org membership is now resolved via useAppState().currentOrg / org_members table.
 * This hook is kept for legacy callers that just need `profile.id` (which equals auth user id).
 */
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery<UserProfile | null>({
    queryKey: ['user-profile', user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min — profile rarely changes
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no profile row exists yet (e.g. user created via admin/test path),
      // synthesize a minimal one so callers can use profile.id without crashing.
      return (data as UserProfile | null) ?? {
        id: user.id,
        account_type: 'individual',
        role: 'coach',
        created_at: new Date().toISOString(),
      };
    },
  });
}