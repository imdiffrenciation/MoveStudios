-- Remove the foreign key constraint that links profiles.id to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop the trigger that creates profiles for Supabase auth users (no longer needed with Privy)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update RLS policies to use privy_user_id instead of auth.uid()
-- First drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policies that allow edge functions (service role) to manage profiles
-- Since we use edge functions with service role key, we just need SELECT to be public
-- The edge functions handle insert/update with service role key which bypasses RLS

-- Also update other tables to not rely on auth.uid() since we use edge functions
-- Likes table
DROP POLICY IF EXISTS "Users can create their own likes" ON public.likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.likes;

-- Comments table  
DROP POLICY IF EXISTS "Users can create their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;

-- Follows table
DROP POLICY IF EXISTS "Users can create their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

-- Media table
DROP POLICY IF EXISTS "Users can create their own media" ON public.media;
DROP POLICY IF EXISTS "Users can delete their own media" ON public.media;
DROP POLICY IF EXISTS "Users can update their own media" ON public.media;