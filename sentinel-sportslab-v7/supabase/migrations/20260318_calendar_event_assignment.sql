-- Add assignment fields to calendar_events so general events can be linked
-- to a specific team or individual athlete for contextual filtering.

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS assigned_to_type text CHECK (assigned_to_type IN ('team', 'individual')),
  ADD COLUMN IF NOT EXISTS assigned_to_id uuid;
