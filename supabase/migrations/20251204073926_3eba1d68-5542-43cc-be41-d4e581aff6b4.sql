-- Step 1: Drop all foreign key constraints first
ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_user_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;

-- Step 2: Drop existing data to allow schema changes
TRUNCATE public.likes, public.comments, public.follows, public.media, public.profiles CASCADE;

-- Step 3: Drop the user_id columns from dependent tables
ALTER TABLE public.likes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.comments DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.media DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.follows DROP COLUMN IF EXISTS follower_id;
ALTER TABLE public.follows DROP COLUMN IF EXISTS following_id;

-- Step 4: Restructure profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS login_method;
ALTER TABLE public.profiles ALTER COLUMN privy_user_id SET NOT NULL;
ALTER TABLE public.profiles ADD PRIMARY KEY (privy_user_id);

-- Step 5: Add user_id columns back as text type
ALTER TABLE public.likes ADD COLUMN user_id text NOT NULL;
ALTER TABLE public.comments ADD COLUMN user_id text NOT NULL;
ALTER TABLE public.media ADD COLUMN user_id text NOT NULL;
ALTER TABLE public.follows ADD COLUMN follower_id text NOT NULL;
ALTER TABLE public.follows ADD COLUMN following_id text NOT NULL;

-- Step 6: Add unique constraints
ALTER TABLE public.follows ADD CONSTRAINT follows_unique UNIQUE (follower_id, following_id);
ALTER TABLE public.likes ADD CONSTRAINT likes_unique UNIQUE (user_id, media_id);