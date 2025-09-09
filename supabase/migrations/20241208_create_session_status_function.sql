-- Create function to get session status with participant counts
CREATE OR REPLACE FUNCTION get_session_status(p_session_id UUID)
RETURNS TABLE (
  session_id UUID,
  status TEXT,
  invited_count INTEGER,
  joined_count INTEGER,
  submitted_count INTEGER,
  total_candidates INTEGER,
  remaining_candidates INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as session_id,
    s.status::TEXT,
    COALESCE(s.invite_count_hint, 0) as invited_count,
    COUNT(DISTINCT p.id)::INTEGER as joined_count,
    COUNT(DISTINCT CASE WHEN p.submitted_at IS NOT NULL THEN p.id END)::INTEGER as submitted_count,
    COUNT(DISTINCT c.id)::INTEGER as total_candidates,
    GREATEST(0, COUNT(DISTINCT c.id) - COALESCE(
      (SELECT COUNT(DISTINCT sw.candidate_id) 
       FROM swipes sw 
       JOIN participants pp ON sw.participant_id = pp.id 
       WHERE pp.session_id = p_session_id), 0
    ))::INTEGER as remaining_candidates
  FROM sessions s
  LEFT JOIN participants p ON s.id = p.session_id
  LEFT JOIN candidates c ON s.id = c.session_id
  WHERE s.id = p_session_id
  GROUP BY s.id, s.status, s.invite_count_hint;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_session_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_status(UUID) TO anon;
