-- Add wallet_address column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_address text,
ADD COLUMN IF NOT EXISTS privy_user_id text,
ADD COLUMN IF NOT EXISTS login_method text;

-- Create unique index on wallet_address
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles(wallet_address) WHERE wallet_address IS NOT NULL;

-- Create unique index on privy_user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_privy_user_id ON public.profiles(privy_user_id) WHERE privy_user_id IS NOT NULL;