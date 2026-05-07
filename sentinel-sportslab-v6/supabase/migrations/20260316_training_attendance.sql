-- ============================================================
-- Migration: training_attendance table
-- ============================================================
-- Tracks which athletes attended each training session.
-- Default = all present; stores absent_athlete_ids[] array.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.training_attendance (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
    session_id      UUID        NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
    team_id         TEXT        NOT NULL,
    date            DATE        NOT NULL,
    absent_athlete_ids TEXT[]   DEFAULT '{}',
    attendance_count INTEGER    NOT NULL DEFAULT 0,
    attendance_total INTEGER    NOT NULL DEFAULT 0,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, team_id)
);

ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own attendance" ON public.training_attendance
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.training_attendance TO authenticated;
