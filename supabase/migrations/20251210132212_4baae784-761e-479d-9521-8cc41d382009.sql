-- Create function to update engagement and viral scores on interactions
CREATE OR REPLACE FUNCTION public.update_engagement_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  boost_amount numeric;
  hours_since_post numeric;
  current_engagement numeric;
BEGIN
  -- Determine boost based on interaction type
  IF TG_TABLE_NAME = 'likes' THEN
    boost_amount := 5;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    boost_amount := 10;
  ELSIF TG_TABLE_NAME = 'saves' THEN
    boost_amount := 3;
  ELSE
    boost_amount := 0;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Update engagement score
    UPDATE public.media 
    SET 
      engagement_score = COALESCE(engagement_score, 0) + boost_amount,
      viral_score = CASE 
        WHEN EXTRACT(EPOCH FROM (now() - created_at)) / 3600 > 0 THEN
          (COALESCE(engagement_score, 0) + boost_amount) / (EXTRACT(EPOCH FROM (now() - created_at)) / 3600) * 1.5
        ELSE COALESCE(engagement_score, 0) + boost_amount
      END,
      quality_score = LEAST(100, (COALESCE(engagement_score, 0) + boost_amount) / 2)
    WHERE id = NEW.media_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Reduce engagement score
    UPDATE public.media 
    SET 
      engagement_score = GREATEST(0, COALESCE(engagement_score, 0) - boost_amount),
      viral_score = CASE 
        WHEN EXTRACT(EPOCH FROM (now() - created_at)) / 3600 > 0 THEN
          GREATEST(0, COALESCE(engagement_score, 0) - boost_amount) / (EXTRACT(EPOCH FROM (now() - created_at)) / 3600) * 1.5
        ELSE GREATEST(0, COALESCE(engagement_score, 0) - boost_amount)
      END,
      quality_score = LEAST(100, GREATEST(0, COALESCE(engagement_score, 0) - boost_amount) / 2)
    WHERE id = OLD.media_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers for engagement score updates on likes
DROP TRIGGER IF EXISTS update_media_engagement_on_like ON public.likes;
CREATE TRIGGER update_media_engagement_on_like
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_engagement_score();

-- Create triggers for engagement score updates on comments
DROP TRIGGER IF EXISTS update_media_engagement_on_comment ON public.comments;
CREATE TRIGGER update_media_engagement_on_comment
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_engagement_score();

-- Create triggers for engagement score updates on saves
DROP TRIGGER IF EXISTS update_media_engagement_on_save ON public.saves;
CREATE TRIGGER update_media_engagement_on_save
  AFTER INSERT OR DELETE ON public.saves
  FOR EACH ROW
  EXECUTE FUNCTION public.update_engagement_score();