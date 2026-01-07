-- Create streak_stats table for tracking daily uploads
CREATE TABLE public.streak_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_upload_date DATE,
  total_uploads INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  engagement_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.streak_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Streak stats are viewable by everyone"
  ON public.streak_stats FOR SELECT USING (true);

CREATE POLICY "Users can insert their own streak stats"
  ON public.streak_stats FOR INSERT
  WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can update their own streak stats"
  ON public.streak_stats FOR UPDATE
  USING ((auth.uid())::text = user_id);

-- Create leaderboard_history table to track bi-weekly competitions
CREATE TABLE public.leaderboard_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  badge_awarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaderboard_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard history is viewable by everyone"
  ON public.leaderboard_history FOR SELECT USING (true);

CREATE POLICY "System can insert leaderboard history"
  ON public.leaderboard_history FOR INSERT
  WITH CHECK (true);

-- Add fingerprint column to media for steganography tracking
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS original_media_id UUID REFERENCES public.media(id);
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS is_flagged_stolen BOOLEAN DEFAULT false;
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending';
ALTER TABLE public.media ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Create index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_media_fingerprint ON public.media(fingerprint) WHERE fingerprint IS NOT NULL;

-- Function to update streak on upload
CREATE OR REPLACE FUNCTION public.update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  current_date_val DATE := CURRENT_DATE;
  last_date DATE;
  new_streak INTEGER;
BEGIN
  -- Get or create streak stats for user
  INSERT INTO public.streak_stats (user_id, current_streak, last_upload_date, total_uploads, total_points)
  VALUES (NEW.user_id, 0, NULL, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current stats
  SELECT last_upload_date INTO last_date
  FROM public.streak_stats WHERE user_id = NEW.user_id;

  -- Calculate new streak
  IF last_date IS NULL THEN
    new_streak := 1;
  ELSIF last_date = current_date_val THEN
    -- Already uploaded today, don't increment
    UPDATE public.streak_stats
    SET total_uploads = total_uploads + 1,
        total_points = total_points + 10, -- 10 points per upload
        updated_at = now()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
  ELSIF last_date = current_date_val - INTERVAL '1 day' THEN
    -- Consecutive day, increment streak
    SELECT current_streak + 1 INTO new_streak
    FROM public.streak_stats WHERE user_id = NEW.user_id;
  ELSE
    -- Streak broken, reset to 1
    new_streak := 1;
  END IF;

  -- Update stats
  UPDATE public.streak_stats
  SET current_streak = new_streak,
      longest_streak = GREATEST(longest_streak, new_streak),
      last_upload_date = current_date_val,
      total_uploads = total_uploads + 1,
      total_points = total_points + 10 + (new_streak * 2), -- Bonus points for streak
      updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for streak updates
DROP TRIGGER IF EXISTS update_streak_on_upload ON public.media;
CREATE TRIGGER update_streak_on_upload
  AFTER INSERT ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_streak();

-- Function to add engagement points when content gets likes/comments/tips
CREATE OR REPLACE FUNCTION public.add_engagement_points()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for engagement
DROP TRIGGER IF EXISTS add_like_points ON public.likes;
CREATE TRIGGER add_like_points
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.add_engagement_points();

DROP TRIGGER IF EXISTS add_comment_points ON public.comments;
CREATE TRIGGER add_comment_points
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.add_engagement_points();

DROP TRIGGER IF EXISTS add_tip_points ON public.user_interactions;
CREATE TRIGGER add_tip_points
  AFTER INSERT ON public.user_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.add_engagement_points();