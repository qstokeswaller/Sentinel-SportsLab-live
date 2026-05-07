-- RPC for auto-matching permalink responses to today's share session.
-- If no session exists for today, auto-creates one using the coach
-- who most recently shared for this team. If the team has never been
-- shared, returns NULL (response saves without tracking).
CREATE OR REPLACE FUNCTION public.resolve_share_session_id(p_team_id TEXT, p_template_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_coach_id UUID;
BEGIN
  -- Check if a share session already exists for today
  SELECT id INTO v_session_id
  FROM wellness_share_sessions
  WHERE team_id = p_team_id
    AND template_id = p_template_id
    AND shared_at::date = CURRENT_DATE
  ORDER BY shared_at DESC
  LIMIT 1;

  IF v_session_id IS NOT NULL THEN
    RETURN v_session_id;
  END IF;

  -- No session today — find the coach who last shared for this team
  SELECT user_id INTO v_coach_id
  FROM wellness_share_sessions
  WHERE team_id = p_team_id
  ORDER BY shared_at DESC
  LIMIT 1;

  -- If no coach found (team has never been shared), return NULL
  IF v_coach_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Auto-create today's session
  INSERT INTO wellness_share_sessions (template_id, team_id, user_id)
  VALUES (p_template_id, p_team_id, v_coach_id)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Grant to anon so public form can call it
GRANT EXECUTE ON FUNCTION public.resolve_share_session_id(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_share_session_id(TEXT, UUID) TO authenticated;
