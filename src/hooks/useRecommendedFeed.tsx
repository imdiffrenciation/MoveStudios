import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { MediaItem } from '@/types';

const PAGE_SIZE = 40;

export const useRecommendedFeed = () => {
  const { user } = useAuth();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const fetchingRef = useRef(false);
  const offsetRef = useRef(0);

  // Fetch recommended posts using the optimized database function
  const fetchRecommendedPosts = useCallback(async (offset: number = 0): Promise<MediaItem[]> => {
    try {
      const { data, error } = await supabase.rpc('get_recommended_posts', {
        p_user_id: user?.id || '',
        p_limit: PAGE_SIZE,
        p_offset: offset
      });

      if (error) {
        console.error('Error fetching recommended posts:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        type: item.type as 'image' | 'video',
        url: item.url,
        title: item.title,
        creator: item.creator_username || 'Unknown',
        creatorAvatarUrl: item.creator_avatar_url || undefined,
        creatorWalletAddress: item.creator_wallet_address || undefined,
        hasActiveBadge: item.creator_has_badge || false,
        tags: item.tags || [],
        likes: item.likes_count || 0,
        taps: item.views_count || 0,
        contentHash: item.content_hash || undefined,
        timestamp: item.created_at,
        userId: item.user_id,
        engagementScore: item.engagement_score || 0,
        viralScore: item.viral_score || 0,
        qualityScore: item.quality_score || 0,
        isFlaggedStolen: item.is_flagged_stolen || false,
        originalMediaId: item.original_media_id || undefined,
      }));
    } catch (error) {
      console.error('Error in fetchRecommendedPosts:', error);
      return [];
    }
  }, [user?.id]);

  // Initial load
  const loadRecommendedFeed = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      const posts = await fetchRecommendedPosts(0);
      setMedia(posts);
      setHasMore(posts.length === PAGE_SIZE);
      offsetRef.current = posts.length;
    } catch (error) {
      console.error('Error loading recommended feed:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [fetchRecommendedPosts]);

  // Load more for infinite scroll
  const loadMore = useCallback(async () => {
    if (!hasMore || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const morePosts = await fetchRecommendedPosts(offsetRef.current);
      
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
  }, [hasMore, fetchRecommendedPosts]);

  // Fire-and-forget view tracking (doesn't block UI)
  const trackView = useCallback((mediaId: string) => {
    if (!user) return;

    // Optimistically update local state immediately
    setMedia(prev => prev.map(m =>
      m.id === mediaId ? { ...m, taps: m.taps + 1 } : m
    ));

    // Fire and forget - don't await
    (async () => {
      try {
        const { data: existingView } = await supabase
          .from('seen_posts')
          .select('id')
          .eq('user_id', user.id)
          .eq('media_id', mediaId)
          .maybeSingle();

        if (!existingView) {
          // Run both in parallel for speed
          await Promise.all([
            supabase.rpc('increment_view_count', { media_id: mediaId }),
            supabase.from('seen_posts').upsert({
              user_id: user.id,
              media_id: mediaId,
              seen_at: new Date().toISOString(),
            }, { onConflict: 'user_id,media_id' })
          ]);
        }
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    })();
  }, [user]);

  // Initial fetch
  useEffect(() => {
    loadRecommendedFeed();
  }, [user?.id]);

  // Smarter real-time updates - prepend new items instead of full refresh
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
        async (payload) => {
          const newMedia = payload.new as any;

          // Fetch profile for the new media
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, wallet_address, has_active_badge')
            .eq('id', newMedia.user_id)
            .single();

          const formattedItem: MediaItem = {
            id: newMedia.id,
            type: newMedia.type as 'image' | 'video',
            url: newMedia.url,
            title: newMedia.title,
            creator: profile?.username || 'Unknown',
            creatorAvatarUrl: profile?.avatar_url || undefined,
            creatorWalletAddress: profile?.wallet_address || undefined,
            hasActiveBadge: profile?.has_active_badge || false,
            tags: newMedia.tags || [],
            likes: newMedia.likes_count || 0,
            taps: newMedia.views_count || 0,
            contentHash: newMedia.content_hash || undefined,
            timestamp: newMedia.created_at,
            userId: newMedia.user_id,
            engagementScore: newMedia.engagement_score || 0,
            viralScore: newMedia.viral_score || 0,
            qualityScore: newMedia.quality_score || 0,
            isFlaggedStolen: newMedia.is_flagged_stolen || false,
            originalMediaId: newMedia.original_media_id || undefined,
          };

          // Prepend to feed instead of full refresh
          setMedia(prev => [formattedItem, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    media,
    loading,
    refetch: loadRecommendedFeed,
    trackView,
    loadMore,
    hasMore,
    feedSource: 'personalized' as const,
  };
};
