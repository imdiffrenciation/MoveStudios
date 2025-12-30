import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const AVAILABLE_INTERESTS = [
  'Art', 'Photography', 'Gaming', 'Music', 'Fashion', 'Food',
  'Travel', 'Sports', 'Technology', 'Nature', 'Animals', 'Cars',
  'Fitness', 'Beauty', 'Comedy', 'Dance', 'DIY', 'Education',
  'Movies', 'Anime', 'Memes', 'Crypto', 'NFTs', 'Web3'
];

export const useUserInterests = () => {
  const { user } = useAuth();
  const [interests, setInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasInterests, setHasInterests] = useState(false);

  const loadInterests = useCallback(async () => {
    if (!user) {
      setInterests([]);
      setHasInterests(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_interests')
        .select('interest')
        .eq('user_id', user.id);

      if (error) throw error;

      const userInterests = data?.map(d => d.interest) || [];
      setInterests(userInterests);
      setHasInterests(userInterests.length > 0);
    } catch (error) {
      console.error('Error loading interests:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

  const saveInterests = async (selectedInterests: string[]) => {
    if (!user) return false;

    try {
      // Delete existing interests
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id);

      // Insert new interests
      if (selectedInterests.length > 0) {
        const { error } = await supabase
          .from('user_interests')
          .insert(
            selectedInterests.map(interest => ({
              user_id: user.id,
              interest: interest.toLowerCase(),
            }))
          );

        if (error) throw error;
      }

      // Also seed user_preferences with initial scores (insert only, ignore conflicts)
      for (const interest of selectedInterests) {
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            tag: interest.toLowerCase(),
            score: 50,
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle(); // Ignore if already exists
      }

      setInterests(selectedInterests);
      setHasInterests(selectedInterests.length > 0);
      return true;
    } catch (error) {
      console.error('Error saving interests:', error);
      return false;
    }
  };

  return {
    interests,
    hasInterests,
    loading,
    availableInterests: AVAILABLE_INTERESTS,
    saveInterests,
    refetch: loadInterests,
  };
};
