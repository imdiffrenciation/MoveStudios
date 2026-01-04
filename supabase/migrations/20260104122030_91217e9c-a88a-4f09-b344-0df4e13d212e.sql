-- Update the dummy content to use the existing MoveStudios profile
UPDATE media 
SET user_id = '543d54f8-4e73-4130-87c9-64ece9490dc6'
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Also update the MoveStudios profile to have a nice avatar
UPDATE profiles 
SET 
  avatar_url = 'https://images.unsplash.com/photo-1614850715649-1d0106293bd1?w=200&h=200&fit=crop',
  bio = 'Official MoveStudios curated content',
  has_active_badge = true,
  onboarding_completed = true
WHERE id = '543d54f8-4e73-4130-87c9-64ece9490dc6';