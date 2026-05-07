-- ============================================================
-- Migration: user_data key-value blob store
-- ============================================================
-- This table is used by storageService.ts as a drop-in
-- replacement for localStorage. Each row holds one JSON blob
-- identified by (user_id, key). Keys include:
--   teams, sessions, protocols, questionnaires,
--   gps_data, wattbike_sessions, medical_reports, exercises
--
-- Data is stored as JSONB so Supabase can index / query inside
-- the blobs if needed in the future.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_data (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key         TEXT        NOT NULL,
    value       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_data_user_key UNIQUE (user_id, key)
);

-- Index for fast lookups by user + key (the main access pattern)
CREATE INDEX IF NOT EXISTS idx_user_data_user_key ON public.user_data (user_id, key);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Users can only read, write, and delete their own blobs
CREATE POLICY "Users manage their own data"
    ON public.user_data
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
