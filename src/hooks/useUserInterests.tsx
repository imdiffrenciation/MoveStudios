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

      // Seed user_preferences with initial scores for the algorithm
      // Using a higher initial score (100) to give interests strong weight
      for (const interest of selectedInterests) {
        const normalizedInterest = interest.toLowerCase();
        
        // Check if preference already exists
        const { data: existing } = await supabase
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.id)
          .eq('tag', normalizedInterest)
          .maybeSingle();
        
        if (!existing) {
          await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              tag: normalizedInterest,
              score: 100, // Strong initial weight for selected interests
              updated_at: new Date().toISOString(),
            });
        }
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
