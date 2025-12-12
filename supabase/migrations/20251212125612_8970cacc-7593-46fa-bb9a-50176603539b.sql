-- Create function to increment view count atomically
CREATE OR REPLACE FUNCTION public.increment_view_count(media_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.media 
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = media_id;
END;
$$;

-- Add unique constraint on seen_posts to prevent duplicates
ALTER TABLE public.seen_posts 
ADD CONSTRAINT seen_posts_user_media_unique 
UNIQUE (user_id, media_id);