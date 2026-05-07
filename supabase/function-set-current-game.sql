-- Helper function to set current game in season
CREATE OR REPLACE FUNCTION set_current_game_for_season(
  p_season_id UUID,
  p_game_id UUID
) RETURNS TABLE (id UUID, name TEXT, status TEXT) AS $$
BEGIN
  -- Update all games in season to not be current
  UPDATE games 
  SET is_current = false 
  WHERE season_id = p_season_id;
  
  -- Set the specified game as current
  UPDATE games 
  SET is_current = true 
  WHERE id = p_game_id AND season_id = p_season_id;
  
  -- Update season's current_game_id
  UPDATE seasons 
  SET current_game_id = p_game_id 
  WHERE id = p_season_id;
  
  -- Return updated season info
  RETURN QUERY
  SELECT s.id, s.name, s.status
  FROM seasons s
  WHERE s.id = p_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
