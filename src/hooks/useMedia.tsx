import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { MediaItem } from '@/types';

const PAGE_SIZE = 20;

interface ProfileMap {
  [key: string]: {
    username: string;
    avatar_url: string | null;
    wallet_address: string | null;
  };
}

export const useMedia = () => {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const profilesCache = useRef<ProfileMap>({});
  const fetchingRef = useRef(false);

  // Fetch profiles in batch and cache them
  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !profilesCache.current[id]);
    
    if (uncachedIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, wallet_address')
        .in('id', uncachedIds);
      
      data?.forEach(p => {
        profilesCache.current[p.id] = p;
      });
    }
    
    return profilesCache.current;
  }, []);

  const fetchMedia = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    
    if (!append) setLoading(true);
    
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data: mediaData, error } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!mediaData || mediaData.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (!mediaData || mediaData.length === 0) {
        if (!append) setMedia([]);
        return;
      }

      // Fetch profiles for these media items
      const userIds = [...new Set(mediaData.map(m => m.user_id))];
      const profiles = await fetchProfiles(userIds);

      const formattedMedia: MediaItem[] = mediaData.map(item => {
        const profile = profiles[item.user_id];
        return {
          id: item.id,
          type: item.type as 'image' | 'video',
          url: item.url,
          title: item.title,
          creator: profile?.username || 'Unknown',
          creatorWalletAddress: profile?.wallet_address || undefined,
          tags: item.tags || [],
          likes: item.likes_count || 0,
          taps: item.views_count || 0,
          contentHash: item.content_hash || undefined,
          timestamp: item.created_at,
          userId: item.user_id,
          engagementScore: item.engagement_score || 0,
        };
      });

      if (append) {
        setMedia(prev => [...prev, ...formattedMedia]);
      } else {
        setMedia(formattedMedia);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [fetchProfiles]);

  // Load more for infinite scroll
  const loadMore = useCallback(() => {
    if (!hasMore || fetchingRef.current) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMedia(nextPage, true);
  }, [hasMore, page, fetchMedia]);

  // Track view
  const trackView = useCallback(async (mediaId: string) => {
    if (!user) return;
    
    try {
      // Check if already viewed
      const { data: existingView } = await supabase
        .from('seen_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .maybeSingle();

      if (!existingView) {
        // Increment view count
        await supabase.rpc('increment_view_count', { media_id: mediaId });
        
        // Mark as seen
        await supabase.from('seen_posts').upsert({
          user_id: user.id,
          media_id: mediaId,
          seen_at: new Date().toISOString(),
        }, { onConflict: 'user_id,media_id' });

        // Update local state
        setMedia(prev => prev.map(m => 
          m.id === mediaId ? { ...m, taps: m.taps + 1 } : m
        ));
      }
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchMedia(0, false);
  }, []);

  // Single real-time subscription for new media only
  useEffect(() => {
    const channel = supabase
      .channel('media-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media',
        },
        () => {
          // Refresh from start when new media is added
          setPage(0);
          setHasMore(true);
          fetchMedia(0, false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMedia]);

  return { 
    media, 
    loading, 
    refetch: () => fetchMedia(0, false), 
    trackView,
    loadMore,
    hasMore 
  };
};
