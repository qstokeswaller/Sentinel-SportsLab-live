-- Calendar Events table for general (non-workout) events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    event_type  TEXT        NOT NULL,
    color       TEXT        NOT NULL DEFAULT '#6366f1',
    description TEXT,
    location    TEXT,
    all_day     BOOLEAN     NOT NULL DEFAULT false,
    start_date  DATE        NOT NULL,
    end_date    DATE,
    start_time  TIME,
    end_time    TIME,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own calendar events"
    ON public.calendar_events FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_cal_events_user_date
    ON public.calendar_events (user_id, start_date);
