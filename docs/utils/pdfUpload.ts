import { supabase } from '../lib/supabase';

const BUCKET = 'running-mechanics-docs';
const MEDICAL_BUCKET = 'medical-documents';

export async function uploadPdf(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const ext = file.name.split('.').pop() || 'pdf';
    const filename = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, file, { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    return data.publicUrl;
}

export async function deletePdf(publicUrl: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const path = publicUrl.slice(idx + marker.length);

    await supabase.storage.from(BUCKET).remove([path]);
}

// ═════════════════════════════════════════════════════════════════════════════
// Medical documents — PRIVATE bucket with signed-URL reads.
// Path convention: <user_id>/<timestamp>_<rand>.<ext>. RLS enforces per-user
// isolation at the storage layer, so no user can enumerate or read another
// user's paths even if they guess.
//
// We store the PATH (not a URL) in the DB, then generate a short-lived signed
// URL on view. Signed URLs are the canonical way to serve private files from
// Supabase Storage and they're free-tier compatible.
// ═════════════════════════════════════════════════════════════════════════════

export interface MedicalUploadResult {
    /** Storage path (e.g. "<user_id>/1734567890_abcd.pdf"). Persist this in the DB. */
    path: string;
    /** Size in bytes as reported by the browser at upload time. */
    size: number;
    /** MIME type (application/pdf, image/png, …). */
    mimeType: string;
    /** Original filename for display / download-as. */
    filename: string;
}

export async function uploadMedicalDocument(file: File): Promise<MedicalUploadResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Free-tier bucket cap is 50 MB; fail fast with a friendly message rather
    // than surfacing the Supabase error to the coach.
    if (file.size > 52_428_800) {
        throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 50 MB.`);
    }

    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
        .from(MEDICAL_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
        // Supabase's Storage error messages are opaque — surface something the
        // coach can act on.
        if (error.message?.toLowerCase().includes('mime')) {
            throw new Error('File type not allowed. Accepted: PDF or image (PNG, JPG).');
        }
        throw new Error(error.message || 'Upload failed. Please try again.');
    }

    return {
        path,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        filename: file.name,
    };
}

/**
 * Fetch a time-boxed signed URL for viewing / downloading a medical document.
 * Default TTL is 1 hour, which is plenty for a modal that stays open for review
 * and long enough that a coach can copy-paste the URL to open elsewhere without
 * it expiring mid-download.
 */
export async function getMedicalDocumentSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
        .from(MEDICAL_BUCKET)
        .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Could not generate a signed URL.');
    }
    return data.signedUrl;
}

export async function deleteMedicalDocument(path: string): Promise<void> {
    if (!path) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Non-fatal — if the storage delete fails (e.g. file already gone) the
    // record deletion can still proceed. The row-level cleanup is the source
    // of truth for the UI.
    try {
        await supabase.storage.from(MEDICAL_BUCKET).remove([path]);
    } catch (e) {
        console.warn('[medical-doc] delete failed (non-fatal):', e);
    }
}
