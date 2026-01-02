import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const AVAILABLE_INTERESTS = [
  { name: 'Plants', image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop' },
  { name: 'Party ideas', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300&h=300&fit=crop' },
  { name: 'Cute animals', image: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=300&h=300&fit=crop' },
  { name: 'Tattoos', image: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=300&h=300&fit=crop' },
  { name: 'Cars', image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=300&h=300&fit=crop' },
  { name: 'Games', image: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=300&h=300&fit=crop' },
  { name: 'Home decor', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
  { name: 'Quotes', image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=300&h=300&fit=crop' },
  { name: 'Makeup', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=300&fit=crop' },
  { name: 'Travel', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&h=300&fit=crop' },
  { name: 'Phone wallpapers', image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&h=300&fit=crop' },
  { name: 'Workouts', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop' },
  { name: 'Aesthetics', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop' },
  { name: 'Cooking', image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=300&h=300&fit=crop' },
  { name: 'Drawing', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&h=300&fit=crop' },
  { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=300&h=300&fit=crop' },
  { name: 'Anime and comics', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=300&fit=crop' },
  { name: 'Photography', image: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=300&h=300&fit=crop' },
  { name: 'Outfit ideas', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=300&fit=crop' },
  { name: 'Baking', image: 'https://images.unsplash.com/photo-1486427944544-d2c6dcdace6d?w=300&h=300&fit=crop' },
  { name: 'Memes', image: 'https://images.unsplash.com/photo-1531259683007-016a7b628fc3?w=300&h=300&fit=crop' },
  { name: 'Dance', image: 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=300&h=300&fit=crop' },
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
