-- PostgreSQL / Supabase Schema Draft: Sport Scientist SaaS Model
-- This schema establishes the individual Sport Scientist as the primary tenant.

-- 1. Profiles (Optional Extension of auth.users)
-- This table automatically links to Supabase's built in auth.users table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    account_type TEXT DEFAULT 'sport_scientist',
    role TEXT DEFAULT 'owner',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teams (Groups managed by the Sport Scientist)
-- Includes sports teams, academies, or general groupings.
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- The owning Sport Scientist
    name TEXT NOT NULL,
    sport TEXT,
    status TEXT CHECK (status IN ('Active', 'Off-Season', 'Pre-Season')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Athletes (Clients managed by the Sport Scientist)
-- Can be part of a team, or have team_id as NULL (Private Clients)
CREATE TABLE IF NOT EXISTS public.athletes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- The owning Sport Scientist
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- Nullable for private clients
    name TEXT NOT NULL,
    gender TEXT,
    age INTEGER,
    adherence NUMERIC DEFAULT 0,
    one_rm JSONB DEFAULT '{}', -- exerciseId -> value
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Exercises Library
-- Can be global (user_id IS NULL) or custom to a specific Sport Scientist.
CREATE TABLE IF NOT EXISTS public.exercises (
    id TEXT PRIMARY KEY, -- Using TEXT to match your legacy "ex_..." IDs if needed
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for Global default exercises
    name TEXT NOT NULL,
    description TEXT,
    equipment TEXT[], 
    body_parts TEXT[],
    categories TEXT[], 
    video_url TEXT,
    tracking_type TEXT,
    options JSONB, -- Storing WorkoutOptions as JSON
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Assessments / Testing Data (Hamstring, Wattbike MAP, CMJ, etc.)
-- Links assessment data directly to the athlete and the scientist.
CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    test_type TEXT NOT NULL, -- e.g., 'hamstring', 'wattbike_map', 'cmj'
    metrics JSONB NOT NULL, -- Flexible JSON storage for specific test scores (e.g. { left_kg: 50, right_kg: 48 })
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Scheduled Sessions (Training Plans)
CREATE TABLE IF NOT EXISTS public.scheduled_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL, -- ID of a team_id OR an athlete_id
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

-- =================================================================================
-- ROW LEVEL SECURITY (RLS)
-- This guarantees a Sport Scientist can ONLY see data they own.
-- =================================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can manage their own profile" 
ON public.user_profiles FOR ALL USING (id = auth.uid());

-- Teams: Scientists can only manage their own teams
CREATE POLICY "Scientists manage their own teams" 
ON public.teams FOR ALL USING (user_id = auth.uid());

-- Athletes: Scientists can only manage their own athletes (private or team)
CREATE POLICY "Scientists manage their own athletes" 
ON public.athletes FOR ALL USING (user_id = auth.uid());

-- Exercises: Allow viewing global exercises (user_id IS NULL) + their own custom ones
CREATE POLICY "View global and own exercises" 
ON public.exercises FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Manage own exercises" 
ON public.exercises FOR ALL USING (user_id = auth.uid());

-- Assessments
CREATE POLICY "Scientists manage their own athletes' assessments" 
ON public.assessments FOR ALL USING (user_id = auth.uid());

-- Scheduled Sessions
CREATE POLICY "Scientists manage their own scheduled sessions" 
ON public.scheduled_sessions FOR ALL USING (user_id = auth.uid());

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists to allow re-running this script
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
