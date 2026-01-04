-- Add recommendation_score column to media table
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS recommendation_score numeric DEFAULT 0;

-- Create index for faster sorting by recommendation score
CREATE INDEX IF NOT EXISTS idx_media_recommendation_score 
ON public.media(recommendation_score DESC);

-- Create index for recent content queries
CREATE INDEX IF NOT EXISTS idx_media_created_at_desc 
ON public.media(created_at DESC);

-- Create composite index for user_id and media_id on seen_posts for faster lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_seen_posts_user_media 
ON public.seen_posts(user_id, media_id);

-- Function to get recommended posts with server-side scoring
CREATE OR REPLACE FUNCTION public.get_recommended_posts(
  p_user_id text,
  p_limit integer DEFAULT 40,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  type text,
  url text,
  title text,
  description text,
  tags text[],
  user_id text,
  likes_count integer,
  comments_count integer,
  views_count integer,
  engagement_score numeric,
  viral_score numeric,
  quality_score numeric,
  created_at timestamptz,
  content_hash text,
  is_protected boolean,
  recommendation_score numeric,
  creator_username text,
  creator_avatar_url text,
  creator_wallet_address text,
  creator_has_badge boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_preferences boolean;
BEGIN
  -- Check if user has preferences
  SELECT EXISTS(
    SELECT 1 FROM user_preferences WHERE user_preferences.user_id = p_user_id LIMIT 1
  ) INTO v_has_preferences;
  
  IF p_user_id IS NOT NULL AND p_user_id != '' AND v_has_preferences THEN
    -- Personalized feed for users with preferences
    RETURN QUERY
    SELECT 
      m.id, m.type, m.url, m.title, m.description, m.tags, m.user_id,
      m.likes_count, m.comments_count, m.views_count, m.engagement_score,
      m.viral_score, m.quality_score, m.created_at, m.content_hash, m.is_protected,
      COALESCE(m.recommendation_score, 0) + 
        COALESCE((
          SELECT SUM(up.score) 
          FROM user_preferences up 
          WHERE up.user_id = p_user_id 
          AND up.tag = ANY(m.tags)
        ), 0) * 0.35 +
        COALESCE((
          SELECT cp.score 
          FROM creator_preferences cp 
          WHERE cp.user_id = p_user_id 
          AND cp.creator_id = m.user_id
        ), 0) * 0.15
      as recommendation_score,
      p.username, p.avatar_url, p.wallet_address, p.has_active_badge
    FROM media m
    JOIN profiles p ON p.id::text = m.user_id
    WHERE m.id NOT IN (
      SELECT sp.media_id FROM seen_posts sp WHERE sp.user_id = p_user_id
    )
    ORDER BY recommendation_score DESC, m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  ELSE
    -- Trending feed for new users or anonymous
    RETURN QUERY
    SELECT 
      m.id, m.type, m.url, m.title, m.description, m.tags, m.user_id,
      m.likes_count, m.comments_count, m.views_count, m.engagement_score,
      m.viral_score, m.quality_score, m.created_at, m.content_hash, m.is_protected,
      COALESCE(m.engagement_score, 0) as recommendation_score,
      p.username, p.avatar_url, p.wallet_address, p.has_active_badge
    FROM media m
    JOIN profiles p ON p.id::text = m.user_id
    WHERE m.created_at > NOW() - INTERVAL '30 days'
    ORDER BY m.engagement_score DESC, m.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;

-- Function to update recommendation scores (for background job)
CREATE OR REPLACE FUNCTION public.update_recommendation_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE media 
  SET recommendation_score = 
    (COALESCE(engagement_score, 0) * 0.3) +
    (COALESCE(viral_score, 0) * 0.2) +
    (COALESCE(quality_score, 0) * 0.1) +
    (CASE 
      WHEN created_at > NOW() - INTERVAL '24 hours' THEN 50
      WHEN created_at > NOW() - INTERVAL '7 days' THEN 30
      WHEN created_at > NOW() - INTERVAL '30 days' THEN 10
      ELSE 0
    END);
END;
$$;