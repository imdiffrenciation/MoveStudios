-- Add engagement and viral score columns to media table
ALTER TABLE public.media 
ADD COLUMN IF NOT EXISTS engagement_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS viral_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_score numeric DEFAULT 0;

-- Create user_preferences table to store tag preferences
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  tag text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag)
);

-- Create user_interactions table to track all interactions
CREATE TABLE public.user_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  creator_id text NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('like', 'comment', 'tip', 'profile_check', 'view')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create creator_preferences table to track user affinity to creators
CREATE TABLE public.creator_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  creator_id text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, creator_id)
);

-- Create seen_posts table to track recently seen posts
CREATE TABLE public.seen_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  seen_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seen_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON public.user_preferences FOR SELECT USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences FOR UPDATE USING ((auth.uid())::text = user_id);

-- RLS policies for user_interactions
CREATE POLICY "Users can view their own interactions" ON public.user_interactions FOR SELECT USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can insert their own interactions" ON public.user_interactions FOR INSERT WITH CHECK ((auth.uid())::text = user_id);

-- RLS policies for creator_preferences
CREATE POLICY "Users can view their own creator preferences" ON public.creator_preferences FOR SELECT USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can insert their own creator preferences" ON public.creator_preferences FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Users can update their own creator preferences" ON public.creator_preferences FOR UPDATE USING ((auth.uid())::text = user_id);

-- RLS policies for seen_posts
CREATE POLICY "Users can view their own seen posts" ON public.seen_posts FOR SELECT USING ((auth.uid())::text = user_id);
CREATE POLICY "Users can insert their own seen posts" ON public.seen_posts FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Users can delete their own seen posts" ON public.seen_posts FOR DELETE USING ((auth.uid())::text = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_user_preferences_tag ON public.user_preferences(tag);
CREATE INDEX idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX idx_user_interactions_media_id ON public.user_interactions(media_id);
CREATE INDEX idx_creator_preferences_user_id ON public.creator_preferences(user_id);
CREATE INDEX idx_seen_posts_user_id ON public.seen_posts(user_id);
CREATE INDEX idx_media_engagement_score ON public.media(engagement_score DESC);
CREATE INDEX idx_media_viral_score ON public.media(viral_score DESC);