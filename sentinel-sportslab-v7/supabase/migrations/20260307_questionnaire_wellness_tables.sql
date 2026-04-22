-- ============================================================
-- Migration: questionnaire_templates + wellness_responses tables + RPC
-- ============================================================
-- Captures tables that were created manually in Supabase.
-- All statements use IF NOT EXISTS / OR REPLACE so this is
-- safe to run against a database where they already exist.
-- ============================================================

-- 1. questionnaire_templates table
CREATE TABLE IF NOT EXISTS public.questionnaire_templates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    description     TEXT,
    questions       JSONB       NOT NULL DEFAULT '[]'::jsonb,
    team_id         UUID,                                        -- null = global template
    is_default      BOOLEAN     NOT NULL DEFAULT false,
    is_active       BOOLEAN     NOT NULL DEFAULT true,           -- soft delete flag
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_user
    ON public.questionnaire_templates (user_id);
CREATE INDEX IF NOT EXISTS idx_questionnaire_templates_team
    ON public.questionnaire_templates (team_id);

ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users manage own questionnaire templates"
        ON public.questionnaire_templates
        FOR ALL
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. wellness_responses table
CREATE TABLE IF NOT EXISTS public.wellness_responses (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id                  TEXT        NOT NULL,
    team_id                     TEXT        NOT NULL,
    questionnaire_template_id   UUID        REFERENCES public.questionnaire_templates(id) ON DELETE SET NULL,
    session_date                DATE        NOT NULL,
    responses                   JSONB       NOT NULL DEFAULT '{}'::jsonb,
    rpe                         NUMERIC,
    availability                TEXT,       -- 'available' | 'modified' | 'unavailable'
    injury_report               JSONB,
    submitted_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wellness_responses_team
    ON public.wellness_responses (team_id, session_date);
CREATE INDEX IF NOT EXISTS idx_wellness_responses_athlete
    ON public.wellness_responses (athlete_id, session_date);

ALTER TABLE public.wellness_responses ENABLE ROW LEVEL SECURITY;

-- Authenticated users can manage all wellness responses (coach-owned data)
DO $$ BEGIN
    CREATE POLICY "Authenticated users manage wellness responses"
        ON public.wellness_responses
        FOR ALL
        USING (true)
        WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Anonymous users can INSERT (public wellness form submissions)
DO $$ BEGIN
    CREATE POLICY "Public can insert wellness responses"
        ON public.wellness_responses
        FOR INSERT
        WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. RPC: get_wellness_form_data
-- Called by the public wellness form (no auth) to get template + athlete roster.
-- SECURITY DEFINER bypasses RLS so anonymous users can read the data.
CREATE OR REPLACE FUNCTION public.get_wellness_form_data(p_template_id UUID, p_team_id TEXT)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT json_build_object(
        'template', (
            SELECT row_to_json(t)
            FROM (
                SELECT id, name, description, questions
                FROM questionnaire_templates
                WHERE id = p_template_id AND is_active = true
            ) t
        ),
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
