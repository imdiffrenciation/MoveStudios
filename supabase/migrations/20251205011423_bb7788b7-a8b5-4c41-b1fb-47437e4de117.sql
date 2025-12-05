-- Add default_tip_amount column to profiles
ALTER TABLE public.profiles 
ADD COLUMN default_tip_amount numeric DEFAULT 1;