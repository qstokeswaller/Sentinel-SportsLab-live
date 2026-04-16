import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface UserProfile {
  id: string;
  club_id: string | null;
  account_type: 'individual' | 'club';
  role: string;
  created_at: string;
  clubs: {
    id: string;
    name: string;
    sport: string;
  } | null;
}

/**
 * Returns the current user's profile row, including their linked club.
 * Used by other hooks to resolve club_id for data isolation.
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
        .select('*, clubs(*)')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
  });
}
