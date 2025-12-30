import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface LikeState {
  [mediaId: string]: {
    isLiked: boolean;
    count: number;
  };
}

interface SaveState {
  [mediaId: string]: boolean;
}

export const useTikTokInteractions = () => {
  const { user } = useAuth();
  const [likes, setLikes] = useState<LikeState>({});
  const [saves, setSaves] = useState<SaveState>({});

  const checkLikeStatus = useCallback(async (mediaId: string) => {
    if (!user) return { isLiked: false, count: 0 };

    try {
      // Check if liked
      const { data: likeData } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .maybeSingle();

      // Get count
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('media_id', mediaId);

      const state = { isLiked: !!likeData, count: count || 0 };
      setLikes(prev => ({ ...prev, [mediaId]: state }));
      return state;
    } catch (error) {
      console.error('Error checking like status:', error);
      return { isLiked: false, count: 0 };
    }
  }, [user]);

  const checkSaveStatus = useCallback(async (mediaId: string) => {
    if (!user) return false;

    try {
      const { data } = await supabase
        .from('saves')
        .select('id')
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .maybeSingle();

      const isSaved = !!data;
      setSaves(prev => ({ ...prev, [mediaId]: isSaved }));
      return isSaved;
    } catch (error) {
      console.error('Error checking save status:', error);
      return false;
    }
  }, [user]);

  const toggleLike = useCallback(async (mediaId: string, creatorId: string, tags: string[], onInteraction?: (mediaId: string, creatorId: string, tags: string[], type: 'like') => void) => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    const currentState = likes[mediaId] || { isLiked: false, count: 0 };

    try {
      if (currentState.isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

        setLikes(prev => ({
          ...prev,
          [mediaId]: { isLiked: false, count: Math.max(0, currentState.count - 1) }
        }));
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: user.id, media_id: mediaId });

        setLikes(prev => ({
          ...prev,
          [mediaId]: { isLiked: true, count: currentState.count + 1 }
        }));

        if (onInteraction) {
          onInteraction(mediaId, creatorId, tags, 'like');
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [user, likes]);

  const toggleSave = useCallback(async (mediaId: string) => {
    if (!user) {
      toast.error('Please sign in to save posts');
      return;
    }

    const currentlySaved = saves[mediaId] || false;

    try {
      if (currentlySaved) {
        await supabase
          .from('saves')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

        setSaves(prev => ({ ...prev, [mediaId]: false }));
        toast.success('Removed from saved');
      } else {
        await supabase
          .from('saves')
          .insert({ user_id: user.id, media_id: mediaId });

        setSaves(prev => ({ ...prev, [mediaId]: true }));
        toast.success('Saved');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [user, saves]);

  const isLiked = useCallback((mediaId: string) => likes[mediaId]?.isLiked || false, [likes]);
  const getLikeCount = useCallback((mediaId: string) => likes[mediaId]?.count || 0, [likes]);
  const isSaved = useCallback((mediaId: string) => saves[mediaId] || false, [saves]);

  return {
    checkLikeStatus,
    checkSaveStatus,
    toggleLike,
    toggleSave,
    isLiked,
    getLikeCount,
    isSaved,
  };
};
