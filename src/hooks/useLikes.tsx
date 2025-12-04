import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePrivyAuth } from './usePrivyAuth';
import { toast } from 'sonner';

export const useLikes = (mediaId: string) => {
  const { profile } = usePrivyAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile && mediaId) {
      checkIfLiked();
    }
  }, [profile, mediaId]);

  const checkIfLiked = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', profile.id)
        .eq('media_id', mediaId)
        .maybeSingle();

      if (error) throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const toggleLike = async () => {
    if (!profile) {
      toast.error('Please sign in to like posts');
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', profile.id)
          .eq('media_id', mediaId);

        if (error) throw error;
        setIsLiked(false);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: profile.id, media_id: mediaId });

        if (error) throw error;
        setIsLiked(true);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return { isLiked, toggleLike, loading };
};
