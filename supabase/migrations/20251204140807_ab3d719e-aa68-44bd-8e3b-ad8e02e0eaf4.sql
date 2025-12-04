-- Create saves table
CREATE TABLE public.saves (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id)
);

-- Enable RLS
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Saves are viewable by everyone" ON public.saves FOR SELECT USING (true);
CREATE POLICY "Users can insert their own saves" ON public.saves FOR INSERT WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "Users can delete their own saves" ON public.saves FOR DELETE USING ((auth.uid())::text = user_id);

-- Enable realtime
ALTER TABLE public.saves REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.saves;