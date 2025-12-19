-- Create badges table to store creator badges and their expiry
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_type TEXT NOT NULL DEFAULT 'creator',
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  transaction_hash TEXT,
  source TEXT NOT NULL DEFAULT 'purchase', -- 'purchase' or 'giveaway'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create badge_settings table to store the current badge price
CREATE TABLE public.badge_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_amount BIGINT NOT NULL DEFAULT 500000,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default badge settings
INSERT INTO public.badge_settings (badge_amount) VALUES (500000);

-- Enable Row Level Security
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_settings ENABLE ROW LEVEL SECURITY;

-- Badges policies
CREATE POLICY "Badges are viewable by everyone" 
ON public.badges 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert badges" 
ON public.badges 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update badges" 
ON public.badges 
FOR UPDATE 
USING (true);

-- Badge settings policies - readable by everyone
CREATE POLICY "Badge settings are viewable by everyone" 
ON public.badge_settings 
FOR SELECT 
USING (true);

-- Only service role can update badge settings (done via edge function)
CREATE POLICY "System can update badge settings" 
ON public.badge_settings 
FOR UPDATE 
USING (true);

-- Create index for faster badge lookups
CREATE INDEX idx_badges_user_id ON public.badges(user_id);
CREATE INDEX idx_badges_active ON public.badges(user_id, is_active, expires_at);

-- Add has_active_badge column to profiles for quick lookups
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_active_badge BOOLEAN DEFAULT false;

-- Create function to check and update badge status
CREATE OR REPLACE FUNCTION public.update_badge_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile's has_active_badge status
  UPDATE public.profiles 
  SET has_active_badge = EXISTS (
    SELECT 1 FROM public.badges 
    WHERE user_id = NEW.user_id 
    AND is_active = true 
    AND expires_at > now()
  )
  WHERE id::text = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update profile when badge changes
CREATE TRIGGER update_profile_badge_status
AFTER INSERT OR UPDATE ON public.badges
FOR EACH ROW
EXECUTE FUNCTION public.update_badge_status();

-- Function to deactivate expired badges (can be called by cron or edge function)
CREATE OR REPLACE FUNCTION public.deactivate_expired_badges()
RETURNS void AS $$
BEGIN
  -- Deactivate expired badges
  UPDATE public.badges 
  SET is_active = false 
  WHERE is_active = true AND expires_at <= now();
  
  -- Update profiles that had active badges
  UPDATE public.profiles 
  SET has_active_badge = false
  WHERE has_active_badge = true 
  AND NOT EXISTS (
    SELECT 1 FROM public.badges 
    WHERE user_id = profiles.id::text 
    AND is_active = true 
    AND expires_at > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;