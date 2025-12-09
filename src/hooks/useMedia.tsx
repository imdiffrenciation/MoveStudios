import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MediaItem } from '@/types';

export const useMedia = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = async () => {
    try {
      // Fetch media
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
        .in('id', userIds.map(id => id)); // user_id is stored as text of uuid

      const profilesMap = new Map(
        profilesData?.map((p) => [p.id, p]) || []
      );

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
        };
      });

      setMedia(formattedMedia);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  return { media, loading, refetch: fetchMedia };
};
