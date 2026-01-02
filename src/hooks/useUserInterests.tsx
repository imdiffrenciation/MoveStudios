import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const AVAILABLE_INTERESTS = [
  { name: 'Plants', image: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop' },
  { name: 'Party ideas', image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300&h=300&fit=crop' },
  { name: 'Classroom ideas', image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&h=300&fit=crop' },
  { name: 'Hair inspiration', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop' },
  { name: 'Pop culture', image: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=300&h=300&fit=crop' },
  { name: 'Cute animals', image: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=300&h=300&fit=crop' },
  { name: 'Tattoos', image: 'https://images.unsplash.com/photo-1590246814883-57c511e76b53?w=300&h=300&fit=crop' },
  { name: 'Cars', image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=300&h=300&fit=crop' },
  { name: 'Video game customization', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&h=300&fit=crop' },
  { name: 'Cute greetings', image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=300&h=300&fit=crop' },
  { name: 'Home decor', image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=300&fit=crop' },
  { name: 'Quotes', image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=300&h=300&fit=crop' },
  { name: 'Makeup looks', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&h=300&fit=crop' },
  { name: 'Travel', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=300&h=300&fit=crop' },
  { name: 'Phone wallpapers', image: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=300&h=300&fit=crop' },
  { name: 'Workouts', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop' },
  { name: 'Nail trends', image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=300&fit=crop' },
  { name: 'Aesthetics', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop' },
  { name: 'Cooking', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=300&fit=crop' },
  { name: 'Small spaces', image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&h=300&fit=crop' },
  { name: 'Drawing', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&h=300&fit=crop' },
  { name: 'Relaxation', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=300&h=300&fit=crop' },
  { name: 'Sneakers', image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=300&h=300&fit=crop' },
  { name: 'Weddings', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&h=300&fit=crop' },
  { name: 'Anime and comics', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&h=300&fit=crop' },
  { name: 'Photography', image: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=300&h=300&fit=crop' },
  { name: 'Outfit ideas', image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&h=300&fit=crop' },
  { name: 'Baking', image: 'https://images.unsplash.com/photo-1486427944544-d2c6dcdace6d?w=300&h=300&fit=crop' },
  { name: 'Home renovation', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=300&h=300&fit=crop' },
  { name: 'DIY projects', image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=300&h=300&fit=crop' },
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
