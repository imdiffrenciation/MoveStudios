import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface StreakStats {
  current_streak: number;
  longest_streak: number;
  total_uploads: number;
  total_points: number;
  engagement_points: number;
  last_upload_date: string | null;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  current_streak: number;
  has_active_badge: boolean;
}

export function useStreakLeaderboard() {
  const { user } = useAuth();
  const [myStats, setMyStats] = useState<StreakStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyStats = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await (supabase as any)
      .from('streak_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setMyStats(data);
    } else {
      // Initialize stats if not exists
      setMyStats({
        current_streak: 0,
        longest_streak: 0,
        total_uploads: 0,
        total_points: 0,
        engagement_points: 0,
        last_upload_date: null,
      });
    }
  }, [user?.id]);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    
    // Get top 20 users by total points
    const { data: statsData } = await (supabase as any)
      .from('streak_stats')
      .select('user_id, total_points, current_streak')
      .order('total_points', { ascending: false })
      .limit(20);

    if (statsData && statsData.length > 0) {
      // Fetch profile data for these users
      const userIds = statsData.map((s: any) => s.user_id);
      const { data: profilesData } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url, has_active_badge')
        .in('id', userIds);

      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach((p: any) => profilesMap.set(p.id, p));
      }

      const leaderboardData: LeaderboardEntry[] = statsData.map((s: any) => {
        const profile = profilesMap.get(s.user_id);
        return {
          user_id: s.user_id,
          username: profile?.username || 'Anonymous',
          avatar_url: profile?.avatar_url,
          total_points: s.total_points,
          current_streak: s.current_streak,
          has_active_badge: profile?.has_active_badge || false,
        };
      });

      setLeaderboard(leaderboardData);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMyStats();
    fetchLeaderboard();
  }, [fetchMyStats, fetchLeaderboard]);

  // Subscribe to realtime updates for my stats
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`streak-stats-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streak_stats',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchMyStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchMyStats]);

  return {
    myStats,
    leaderboard,
    loading,
    refresh: () => {
      fetchMyStats();
      fetchLeaderboard();
    },
  };
}
