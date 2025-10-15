-- Enable realtime for likes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;

-- Create trigger to update likes count
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW
EXECUTE FUNCTION public.update_likes_count();