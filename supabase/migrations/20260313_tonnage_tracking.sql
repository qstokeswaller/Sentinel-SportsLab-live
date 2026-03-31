-- Tonnage Tracking: add weight fields to exercise prescriptions and completion data to sessions

-- Weight field for exercise prescriptions within programs
ALTER TABLE public.workout_day_exercises
    ADD COLUMN IF NOT EXISTS weight TEXT,
    ADD COLUMN IF NOT EXISTS athlete_weight_overrides JSONB DEFAULT '{}';

-- Completion data + tonnage toggle for scheduled sessions
ALTER TABLE public.scheduled_sessions
    ADD COLUMN IF NOT EXISTS actual_results JSONB,
    ADD COLUMN IF NOT EXISTS actual_rpe INTEGER,
    ADD COLUMN IF NOT EXISTS track_tonnage BOOLEAN DEFAULT true;

-- Tonnage toggle on programs (source of truth)
ALTER TABLE public.workout_programs
    ADD COLUMN IF NOT EXISTS track_tonnage BOOLEAN DEFAULT true;
