-- ============================================================
-- Migration: injury_reports table + public form RPC
-- ============================================================
-- Run this in the Supabase SQL Editor.
-- Stores injury reports created by coaches and physios (via public form).
-- ============================================================

-- 1. Table
CREATE TABLE IF NOT EXISTS public.injury_reports (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,  -- null when submitted via public form
    team_id         TEXT        NOT NULL,
    athlete_id      TEXT        NOT NULL,
    athlete_name    TEXT        NOT NULL,
    date_of_injury  DATE        NOT NULL,
    report_data     JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- all form fields (classification, clinical, management, etc.)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_injury_reports_user ON public.injury_reports (user_id);
CREATE INDEX IF NOT EXISTS idx_injury_reports_team ON public.injury_reports (team_id);
CREATE INDEX IF NOT EXISTS idx_injury_reports_athlete ON public.injury_reports (athlete_id);

-- 2. Row Level Security
ALTER TABLE public.injury_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/update/delete their own reports
CREATE POLICY "Users manage own injury reports"
    ON public.injury_reports
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Anyone (including anonymous) can INSERT — used by public injury form
CREATE POLICY "Public can insert injury reports"
    ON public.injury_reports
    FOR INSERT
    WITH CHECK (true);

-- Authenticated users can also read reports where user_id is null (physio submissions for their teams)
CREATE POLICY "Users can read public submissions"
    ON public.injury_reports
    FOR SELECT
    USING (user_id IS NULL);

-- 3. RPC: get_injury_form_data
-- Called by the public injury form (no auth) to get athlete roster for a team.
-- SECURITY DEFINER bypasses RLS so anonymous users can read player data.
CREATE OR REPLACE FUNCTION public.get_injury_form_data(p_team_id TEXT)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT json_build_object(
        'athletes', COALESCE(
            (SELECT json_agg(json_build_object('id', a.id::text, 'name', a.name) ORDER BY a.name)
             FROM athletes a
             WHERE CASE
                 WHEN p_team_id = 't_private' THEN a.team_id IS NULL
                 ELSE a.team_id::text = p_team_id
             END
            ),
            '[]'::json
        )
    );
$$;
