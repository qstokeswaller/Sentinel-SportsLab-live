import { supabase } from '../lib/supabase';

const BUCKET = 'questionnaire-images';

export async function uploadQuestionImage(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, file, { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
}

export async function deleteQuestionImage(publicUrl: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const path = publicUrl.slice(idx + marker.length);

    await supabase.storage.from(BUCKET).remove([path]);
}
