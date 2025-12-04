-- First, clear the old Privy-based profiles (they don't link to Supabase auth users)
DELETE FROM public.profiles;

-- Drop the existing primary key constraint on privy_user_id
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;

-- Add id column as UUID with reference to auth.users
ALTER TABLE public.profiles ADD COLUMN id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set id as primary key
ALTER TABLE public.profiles ADD PRIMARY KEY (id);

-- Make privy_user_id optional since we're using Supabase auth now
ALTER TABLE public.profiles ALTER COLUMN privy_user_id DROP NOT NULL;

-- Add RLS policy for users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Add RLS policy for users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Update the handle_new_user trigger function to insert with id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();