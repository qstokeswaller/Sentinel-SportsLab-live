-- Add session_type and linked_sessions columns to scheduled_sessions
-- session_type: 'workout' | 'wattbike' | 'conditioning' (defaults to 'workout')
-- linked_sessions: JSONB array of linked session references

ALTER TABLE public.scheduled_sessions
  ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'workout',
  ADD COLUMN IF NOT EXISTS linked_sessions JSONB DEFAULT '[]'::jsonb;
