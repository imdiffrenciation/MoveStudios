-- Fix: streak_stats RLS violations triggered by likes/comments/tips
-- The trigger function updates the creator's streak_stats when another user interacts.
-- Mark it SECURITY DEFINER so it can update streak_stats regardless of the acting user.

CREATE OR REPLACE FUNCTION public.add_engagement_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  creator_id TEXT;
  points_to_add INTEGER;
BEGIN
  -- Get the creator of the media
  SELECT user_id INTO creator_id FROM public.media WHERE id = NEW.media_id;
  
  IF creator_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine points based on interaction type
  IF TG_TABLE_NAME = 'likes' THEN
    points_to_add := 5;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    points_to_add := 10;
  ELSIF TG_TABLE_NAME = 'user_interactions' AND NEW.interaction_type = 'tip' THEN
    points_to_add := 50;
  ELSE
    points_to_add := 2;
  END IF;

  -- Update or create streak stats
  INSERT INTO public.streak_stats (user_id, engagement_points)
  VALUES (creator_id, points_to_add)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    engagement_points = public.streak_stats.engagement_points + points_to_add,
    total_points = public.streak_stats.total_points + points_to_add,
    updated_at = now();

  RETURN NEW;
END;
$function$;
