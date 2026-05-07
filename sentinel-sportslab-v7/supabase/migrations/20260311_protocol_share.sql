-- ============================================================
-- Migration: Public RPC for shared protocol view
-- ============================================================
-- SECURITY DEFINER RPC that lets anonymous visitors view
-- protocols via shareable public links.
-- Protocols live as a JSON array in user_data (key='protocols').
-- Pattern follows 20260309_workout_share.sql.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_shared_protocol(p_protocol_id TEXT)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT elem::json
    FROM user_data,
         jsonb_array_elements(value) AS elem
    WHERE key = 'protocols'
      AND elem->>'id' = p_protocol_id
    LIMIT 1;
$$;
