-- Exercise Collections Migration
-- Run in Supabase SQL editor or via migration tool

CREATE TABLE IF NOT EXISTS exercise_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT 'indigo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS collection_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid REFERENCES exercise_collections(id) ON DELETE CASCADE NOT NULL,
  exercise_id text NOT NULL,
  added_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, exercise_id)
);

ALTER TABLE exercise_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own collections"
  ON exercise_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage collection exercises"
  ON collection_exercises FOR ALL
  USING (
    collection_id IN (
      SELECT id FROM exercise_collections WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    collection_id IN (
      SELECT id FROM exercise_collections WHERE user_id = auth.uid()
    )
  );
