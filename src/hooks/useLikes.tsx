import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useLikes = (mediaId: string) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mediaId) {
      checkIfLiked();
      fetchLikesCount();

      // Subscribe to realtime updates for this media's likes
      const channel = supabase
        .channel(`likes-${mediaId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'likes',
            filter: `media_id=eq.${mediaId}`,
          },
          () => {
            fetchLikesCount();
            if (user) {
              checkIfLiked();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, mediaId]);

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .maybeSingle();

      if (error) throw error;
      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const fetchLikesCount = async () => {
    try {
      const { count, error } = await (supabase as any)
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('media_id', mediaId);

      if (error) throw error;
      setLikesCount(count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        const { error } = await (supabase as any)
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

        if (error) throw error;
        setIsLiked(false);
      } else {
        const { error } = await (supabase as any)
          .from('likes')
          .insert({ user_id: user.id, media_id: mediaId });

        if (error) throw error;
        setIsLiked(true);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return { isLiked, likesCount, toggleLike, loading };
};
