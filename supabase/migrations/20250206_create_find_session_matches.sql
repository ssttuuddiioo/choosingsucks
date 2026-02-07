-- Create function to find all candidates that meet the match threshold for a session
CREATE OR REPLACE FUNCTION find_session_matches(p_session_id UUID)
RETURNS TABLE (
  candidate_id UUID,
  place_id TEXT,
  name TEXT,
  yes_count INTEGER,
  total_participants INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_participants INTEGER;
  v_match_requirement TEXT;
  v_required_likes INTEGER;
BEGIN
  -- Get session match requirement
  SELECT s.match_requirement INTO v_match_requirement
  FROM sessions s
  WHERE s.id = p_session_id;

  -- Count total participants
  SELECT COUNT(*)::INTEGER INTO v_total_participants
  FROM participants p
  WHERE p.session_id = p_session_id;

  -- Calculate required likes
  IF v_match_requirement = 'majority' THEN
    v_required_likes := CEIL(v_total_participants::NUMERIC / 2);
  ELSE
    v_required_likes := v_total_participants;
  END IF;

  RETURN QUERY
  SELECT
    c.id as candidate_id,
    c.place_id,
    c.name,
    COUNT(DISTINCT sw.participant_id)::INTEGER as yes_count,
    v_total_participants as total_participants
  FROM candidates c
  JOIN swipes sw ON sw.candidate_id = c.id AND sw.session_id = p_session_id AND sw.vote = 1
  WHERE c.session_id = p_session_id
  GROUP BY c.id, c.place_id, c.name
  HAVING COUNT(DISTINCT sw.participant_id) >= v_required_likes;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION find_session_matches(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION find_session_matches(UUID) TO anon;
