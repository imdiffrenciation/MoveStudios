import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePrivyAuth } from './usePrivyAuth';
import { toast } from 'sonner';

export const useLikes = (mediaId: string) => {
  const { profile } = usePrivyAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.privy_user_id && mediaId) {
      checkIfLiked();
    }
  }, [profile?.privy_user_id, mediaId]);

  const checkIfLiked = async () => {
    if (!profile?.privy_user_id) return;

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', profile.privy_user_id)
        .eq('media_id', mediaId)
        .maybeSingle();

      if (error) throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const toggleLike = async () => {
    if (!profile?.privy_user_id) {
      toast.error('Please sign in to like posts');
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke('toggle-like', {
        body: {
          user_id: profile.privy_user_id,
          media_id: mediaId,
        },
      });

      if (response.error) throw response.error;
      
      setIsLiked(response.data?.liked || false);
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error(error.message || 'Failed to toggle like');
    } finally {
      setLoading(false);
    }
  };

  return { isLiked, toggleLike, loading };
};
