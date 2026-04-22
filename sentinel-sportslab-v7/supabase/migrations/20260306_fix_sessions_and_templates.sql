-- 1. Add exercises JSONB column to scheduled_sessions
--    This stores full exercise details (sets, reps, rest, RPE, notes) per session
--    Previously only exercise_ids TEXT[] existed, losing all prescription data
ALTER TABLE public.scheduled_sessions
    ADD COLUMN IF NOT EXISTS exercises JSONB,
    ADD COLUMN IF NOT EXISTS time TEXT;

-- 2. Create workout_templates table (migrating from user_data JSONB blob)
CREATE TABLE IF NOT EXISTS public.workout_templates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name            TEXT        NOT NULL,
    training_phase  TEXT,
    load            TEXT,
    sections        JSONB,      -- { warmup: [...], workout: [...], cooldown: [...] }
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workout templates"
    ON public.workout_templates FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_workout_templates_user
    ON public.workout_templates (user_id);
