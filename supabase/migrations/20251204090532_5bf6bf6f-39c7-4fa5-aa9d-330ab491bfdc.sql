-- Set REPLICA IDENTITY FULL for proper realtime updates
ALTER TABLE public.media REPLICA IDENTITY FULL;