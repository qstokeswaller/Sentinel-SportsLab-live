-- ============================================================
-- Migration: wellness_share_sessions + share_session_id column
-- ============================================================
-- Tracks each "Share Link" press so the dashboard can show
-- response rates per-share-session instead of all-time.
-- ============================================================

-- 1. wellness_share_sessions table
CREATE TABLE IF NOT EXISTS public.wellness_share_sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID        REFERENCES public.questionnaire_templates(id) ON DELETE CASCADE,
    team_id         TEXT        NOT NULL,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellness_share_sessions_team_template
    ON public.wellness_share_sessions (team_id, template_id, shared_at DESC);

ALTER TABLE public.wellness_share_sessions ENABLE ROW LEVEL SECURITY;

-- Coaches manage their own share sessions
DO $$ BEGIN
    CREATE POLICY "Users manage own share sessions"
        ON public.wellness_share_sessions
        FOR ALL
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Anonymous users can read share sessions (public form needs to validate ?s= param)
DO $$ BEGIN
    CREATE POLICY "Public can read share sessions"
        ON public.wellness_share_sessions
        FOR SELECT
        USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add share_session_id column to wellness_responses
ALTER TABLE public.wellness_responses
    ADD COLUMN IF NOT EXISTS share_session_id UUID
    REFERENCES public.wellness_share_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_wellness_responses_share_session
    ON public.wellness_responses (share_session_id);
