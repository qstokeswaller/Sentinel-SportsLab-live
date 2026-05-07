-- ============================================================
-- Migration: training_loads table for ACWR monitoring
-- ============================================================
-- Stores per-athlete, per-day training load values.
-- Supports multiple metric types (sRPE, sprint distance, tonnage, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.training_loads (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
    athlete_id      TEXT        NOT NULL,
    team_id         TEXT,
    date            DATE        NOT NULL,
    metric_type     TEXT        NOT NULL DEFAULT 'srpe',  -- srpe, sprint_distance, total_distance, tonnage, duration, trimp, player_load
    value           NUMERIC     NOT NULL DEFAULT 0,       -- the computed load value for the chosen metric
    session_type    TEXT        DEFAULT 'training',       -- training, match, gym, recovery
    rpe             SMALLINT,                             -- raw RPE (1-10)
    duration_minutes NUMERIC,                             -- session duration
    distance_metres  NUMERIC,                             -- total distance
    sprint_distance_metres NUMERIC,                       -- HSR/sprint distance (≥25 km/h)
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, athlete_id, date, metric_type, session_type)
);

CREATE INDEX IF NOT EXISTS idx_training_loads_athlete ON public.training_loads(athlete_id, date);
CREATE INDEX IF NOT EXISTS idx_training_loads_user ON public.training_loads(user_id);
CREATE INDEX IF NOT EXISTS idx_training_loads_team ON public.training_loads(team_id, date);

ALTER TABLE public.training_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own training loads" ON public.training_loads
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.training_loads TO authenticated;
