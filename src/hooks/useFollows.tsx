import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useFollows = (userId: string | undefined) => {
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    fetchCounts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('follows-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `follower_id=eq.${userId},following_id=eq.${userId}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchCounts = async () => {
    if (!userId) return;

    // Get followers count (people following this user)
    const { count: followers } = await (supabase as any)
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    // Get following count (people this user is following)
    const { count: following } = await (supabase as any)
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
    setLoading(false);
  };

  const followUser = async (targetUserId: string, currentUserId: string) => {
    await (supabase as any)
      .from('follows')
      .insert({ follower_id: currentUserId, following_id: targetUserId });
  };

  const unfollowUser = async (targetUserId: string, currentUserId: string) => {
    await (supabase as any)
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId);
  };

  return {
    followersCount,
    followingCount,
    loading,
    followUser,
    unfollowUser,
  };
};
