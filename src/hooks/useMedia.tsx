import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRecommendation } from './useRecommendation';
import type { MediaItem } from '@/types';

interface MediaWithScores {
  id: string;
  user_id: string;
  type: string;
  url: string;
  title: string;
  tags: string[] | null;
  likes_count: number | null;
  views_count: number | null;
  content_hash: string | null;
  created_at: string;
  engagement_score: number | null;
  viral_score: number | null;
  quality_score: number | null;
}

export const useMedia = () => {
  const { user } = useAuth();
  const { getRecommendedPosts, markAsSeen } = useRecommendation();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [rawMedia, setRawMedia] = useState<MediaWithScores[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = async () => {
    try {
      // Fetch media with engagement scores
      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;

      // Get unique user_ids and fetch profiles
      const userIds = [...new Set(mediaData.map((m) => m.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, wallet_address')
        .in('id', userIds.map(id => id));

      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, p]) || []
      );

      // Store raw media for recommendation algorithm
      setRawMedia(mediaData as MediaWithScores[]);

      const formattedMedia: MediaItem[] = mediaData.map((item) => {
        const profile = profilesMap.get(item.user_id);
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
        };
      });

      // Apply recommendation algorithm if user is logged in
      if (user && formattedMedia.length > 0) {
        const enrichedMedia = formattedMedia.map((item, idx) => ({
          ...item,
          user_id: mediaData[idx].user_id,
          engagement_score: (mediaData[idx] as any).engagement_score || 0,
          viral_score: (mediaData[idx] as any).viral_score || 0,
          quality_score: (mediaData[idx] as any).quality_score || 0,
          created_at: mediaData[idx].created_at,
        }));

        const recommended = await getRecommendedPosts(enrichedMedia as any);
        
        // Map back to MediaItem format
        const recommendedMedia = recommended.map((item: any) => ({
          id: item.id,
          type: item.type as 'image' | 'video',
          url: item.url,
          title: item.title,
          creator: item.creator,
          creatorWalletAddress: item.creatorWalletAddress,
          tags: item.tags || [],
          likes: item.likes || 0,
          taps: item.taps || 0,
          contentHash: item.contentHash,
          timestamp: item.timestamp || item.created_at,
        }));

        setMedia(recommendedMedia);
      } else {
        setMedia(formattedMedia);
      }
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark media as seen when viewed
  const trackView = useCallback(async (mediaId: string) => {
    await markAsSeen(mediaId);
  }, [markAsSeen]);

  useEffect(() => {
    fetchMedia();

    // Set up realtime subscription
    const channel = (supabase as any)
      .channel('media-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media',
        },
        () => {
          fetchMedia();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { media, loading, refetch: fetchMedia, trackView, rawMedia };
};
