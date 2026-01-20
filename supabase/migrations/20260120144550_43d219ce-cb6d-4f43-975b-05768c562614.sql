-- Fix the add_engagement_points function to use SECURITY DEFINER
-- This allows the function to update streak_stats for the creator
-- when a different user likes/comments on their content

CREATE OR REPLACE FUNCTION public.add_engagement_points(
  p_creator_id TEXT,
  p_interaction_type TEXT
)
RETURNS VOID AS $$
DECLARE
  points_to_add INTEGER;
BEGIN
  -- Determine points based on interaction type
  CASE p_interaction_type
    WHEN 'like' THEN points_to_add := 5;
    WHEN 'comment' THEN points_to_add := 10;
    WHEN 'tip' THEN points_to_add := 25;
    ELSE points_to_add := 1;
  END CASE;

  -- Update or insert creator's streak stats
  INSERT INTO public.streak_stats (user_id, engagement_points, total_points)
  VALUES (p_creator_id, points_to_add, points_to_add)
  ON CONFLICT (user_id) DO UPDATE SET
    engagement_points = streak_stats.engagement_points + points_to_add,
    total_points = streak_stats.total_points + points_to_add,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;