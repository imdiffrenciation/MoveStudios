import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getRecommendedFeed, getMoreRecommendedPosts, RecommendationResult } from '@/lib/recommendation/recommendationService';
import type { MediaItem } from '@/types';

const PAGE_SIZE = 20;

interface ProfileMap {
  [key: string]: {
    username: string;
    avatar_url: string | null;
    wallet_address: string | null;
    has_active_badge: boolean | null;
  };
}

export const useRecommendedFeed = () => {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [allMedia, setAllMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [feedSource, setFeedSource] = useState<RecommendationResult['source']>('trending');
  const profilesCache = useRef<ProfileMap>({});
  const fetchingRef = useRef(false);
  const offsetRef = useRef(0);

  // Fetch profiles in batch and cache them
  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !profilesCache.current[id]);
    
    if (uncachedIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, wallet_address, has_active_badge')
        .in('id', uncachedIds);
      
      data?.forEach(p => {
        profilesCache.current[p.id] = p;
      });
    }
    
    return profilesCache.current;
  }, []);

  // Fetch all media from database
  const fetchAllMedia = useCallback(async (): Promise<MediaItem[]> => {
    const { data: mediaData, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500); // Reasonable limit for recommendation pool

    if (error || !mediaData) return [];

    // Fetch profiles for these media items
    const userIds = [...new Set(mediaData.map(m => m.user_id))];
    const profiles = await fetchProfiles(userIds);

    return mediaData.map(item => {
      const profile = profiles[item.user_id];
      return {
        id: item.id,
        type: item.type as 'image' | 'video',
        url: item.url,
        title: item.title,
        creator: profile?.username || 'Unknown',
        creatorWalletAddress: profile?.wallet_address || undefined,
        creatorAvatarUrl: profile?.avatar_url || undefined,
        hasActiveBadge: profile?.has_active_badge || false,
        tags: item.tags || [],
        likes: item.likes_count || 0,
        taps: item.views_count || 0,
        contentHash: item.content_hash || undefined,
        timestamp: item.created_at,
        userId: item.user_id,
        engagementScore: item.engagement_score || 0,
        viralScore: item.viral_score || 0,
        qualityScore: item.quality_score || 0,
      };
    });
  }, [fetchProfiles]);

  // Initial load with recommendations
  const loadRecommendedFeed = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      // Fetch all media first
      const allMediaItems = await fetchAllMedia();
      setAllMedia(allMediaItems);

      if (allMediaItems.length === 0) {
        setMedia([]);
        setHasMore(false);
        return;
      }

      // Get personalized recommendations
      const result = await getRecommendedFeed(user?.id, allMediaItems, {
        shuffle: false,
        limit: PAGE_SIZE * 2, // Load 2 pages initially
      });

      setMedia(result.items);
      setFeedSource(result.source);
      setHasMore(allMediaItems.length > result.items.length);
      offsetRef.current = result.items.length;
    } catch (error) {
      console.error('Error loading recommended feed:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id, fetchAllMedia]);

  // Load more for infinite scroll
  const loadMore = useCallback(async () => {
    if (!hasMore || fetchingRef.current || !user) return;
    fetchingRef.current = true;

    try {
      const morePosts = await getMoreRecommendedPosts(
        user.id,
        media,
        allMedia,
        offsetRef.current,
        PAGE_SIZE
      );

      if (morePosts.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (morePosts.length > 0) {
        setMedia(prev => [...prev, ...morePosts]);
        offsetRef.current += morePosts.length;
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      fetchingRef.current = false;
    }
  }, [hasMore, user, media, allMedia]);

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
    loadRecommendedFeed();
  }, [user?.id]);

  // Real-time subscription for new media
  useEffect(() => {
    const channel = supabase
      .channel('media-inserts-recommended')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media',
        },
        () => {
          // Refresh from start when new media is added
          loadRecommendedFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRecommendedFeed]);

  return { 
    media, 
    loading, 
    refetch: loadRecommendedFeed, 
    trackView,
    loadMore,
    hasMore,
    feedSource,
  };
};
