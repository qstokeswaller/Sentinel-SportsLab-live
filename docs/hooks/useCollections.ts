// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface ExerciseCollection {
    id: string;
    name: string;
    description: string | null;
    color: string;
    created_at: string;
    exercise_ids: string[];
    user_id: string;
    last_modified_by: string | null;
}

async function getAuthUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
}

export function useCollections() {
    const queryClient = useQueryClient();

    const { data: collections = [], isLoading } = useQuery<ExerciseCollection[]>({
        queryKey: ['exercise_collections'],
        queryFn: async () => {
            const user = await getAuthUser();
            if (!user) return [];
            // Collections are org-shared library curation — drop the user_id filter so
            // every colleague in the org sees the same curated set. RLS scopes by org.
            const { data, error } = await supabase
                .from('exercise_collections')
                .select('*, collection_exercises(exercise_id)')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return (data || []).map(c => ({
                id: c.id,
                name: c.name,
                description: c.description,
                color: c.color ?? 'indigo',
                created_at: c.created_at,
                user_id: c.user_id,
                last_modified_by: c.last_modified_by,
                exercise_ids: (c.collection_exercises || []).map((ce: any) => ce.exercise_id),
            }));
        },
        staleTime: 5 * 60 * 1000,
    });

    const createCollection = useMutation({
        mutationFn: async ({ name, description, color }: { name: string; description?: string; color?: string }) => {
            const user = await getAuthUser();
            if (!user) throw new Error('Not authenticated');
            const { data, error } = await supabase
                .from('exercise_collections')
                .insert({ user_id: user.id, name, description: description || null, color: color || 'indigo' })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercise_collections'] }),
    });

    const deleteCollection = useMutation({
        mutationFn: async (collectionId: string) => {
            const { error } = await supabase
                .from('exercise_collections')
                .delete()
                .eq('id', collectionId);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercise_collections'] }),
    });

    const renameCollection = useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const { error } = await supabase
                .from('exercise_collections')
                .update({ name, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercise_collections'] }),
    });

    const addExerciseToCollection = useMutation({
        mutationFn: async ({ collectionId, exerciseId }: { collectionId: string; exerciseId: string }) => {
            const { error } = await supabase
                .from('collection_exercises')
                .upsert({ collection_id: collectionId, exercise_id: exerciseId }, { onConflict: 'collection_id,exercise_id' });
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercise_collections'] }),
    });

    const removeExerciseFromCollection = useMutation({
        mutationFn: async ({ collectionId, exerciseId }: { collectionId: string; exerciseId: string }) => {
            const { error } = await supabase
                .from('collection_exercises')
                .delete()
                .eq('collection_id', collectionId)
                .eq('exercise_id', exerciseId);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercise_collections'] }),
    });

    const addManyToCollection = useMutation({
        mutationFn: async ({ collectionId, exerciseIds }: { collectionId: string; exerciseIds: string[] }) => {
            const rows = exerciseIds.map(exercise_id => ({ collection_id: collectionId, exercise_id }));
            const { error } = await supabase
                .from('collection_exercises')
                .upsert(rows, { onConflict: 'collection_id,exercise_id' });
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercise_collections'] }),
    });

    const isInCollection = (exerciseId: string, collectionId: string) => {
        const col = collections.find(c => c.id === collectionId);
        return col ? col.exercise_ids.includes(exerciseId) : false;
    };

    const allCollectionExerciseIds = new Set(collections.flatMap(c => c.exercise_ids));

    return {
        collections,
        isLoading,
        createCollection,
        deleteCollection,
        renameCollection,
        addExerciseToCollection,
        removeExerciseFromCollection,
        addManyToCollection,
        isInCollection,
        allCollectionExerciseIds,
    };
}
