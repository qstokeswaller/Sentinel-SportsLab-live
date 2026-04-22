-- TrainerOS: PostgreSQL / Supabase Schema Draft
-- This file can be run in a local Postgres DB (e.g. Docker) or pasted into the Supabase SQL Editor.

-- 1. Clubs (The Tenants for your SaaS)
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sport TEXT DEFAULT 'Football',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Exercises
CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY, -- Using TEXT to match your current "ex_..." IDs
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    equipment TEXT[], 
    body_parts TEXT[],
    categories TEXT[], 
    video_url TEXT,
    tracking_type TEXT,
    options JSONB, -- Storing your WorkoutOptions interface as JSON
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Squads (Teams)
CREATE TABLE IF NOT EXISTS squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sport TEXT,
    status TEXT CHECK (status IN ('Active', 'Off-Season', 'Pre-Season')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Players
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID REFERENCES squads(id) ON DELETE SET NULL,
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subsection TEXT,
    gender TEXT,
    age INTEGER,
    adherence NUMERIC DEFAULT 0,
    one_rm JSONB DEFAULT '{}', -- exerciseId -> value
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Telemetry (The High-Volume Data)
CREATE TABLE IF NOT EXISTS player_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    kms NUMERIC,
    rpe INTEGER,
    wellness JSONB, -- sleep, stress, etc.
    UNIQUE(player_id, date)
);

-- 6. Scheduled Sessions
CREATE TABLE IF NOT EXISTS scheduled_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    target_id UUID NOT NULL, -- player_id or squad_id
    target_type TEXT CHECK (target_type IN ('Team', 'Individual')),
    date DATE NOT NULL,
    title TEXT,
    load TEXT,
    training_phase TEXT,
    notes TEXT,
    exercise_ids TEXT[], -- Array of exercise primary keys
    planned_duration INTEGER,
    actual_duration INTEGER,
    status TEXT DEFAULT 'Scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - This is the secret to SaaS security!
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;

-- EXAMPLE POLICY (Conceptual):
-- CREATE POLICY club_isolation ON players 
-- FOR ALL USING (club_id = auth.jwt() ->> 'club_id');
