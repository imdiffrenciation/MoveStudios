-- Create user_interests table for onboarding
CREATE TABLE public.user_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  interest TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, interest)
);

-- Enable RLS
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own interests"
ON public.user_interests
FOR SELECT
USING ((auth.uid())::text = user_id);

CREATE POLICY "Users can insert their own interests"
ON public.user_interests
FOR INSERT
WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "Users can delete their own interests"
ON public.user_interests
FOR DELETE
USING ((auth.uid())::text = user_id);

-- Add onboarding_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add unique constraint for user_preferences if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_user_id_tag_key'
  ) THEN
    ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_user_id_tag_key UNIQUE (user_id, tag);
  END IF;
END $$;

-- Add unique constraint for creator_preferences if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creator_preferences_user_id_creator_id_key'
  ) THEN
    ALTER TABLE public.creator_preferences ADD CONSTRAINT creator_preferences_user_id_creator_id_key UNIQUE (user_id, creator_id);
  END IF;
END $$;

-- Add unique constraint for seen_posts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seen_posts_user_id_media_id_key'
  ) THEN
    ALTER TABLE public.seen_posts ADD CONSTRAINT seen_posts_user_id_media_id_key UNIQUE (user_id, media_id);
  END IF;
END $$;