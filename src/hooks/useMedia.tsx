import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MediaItem } from '@/types';

export const useMedia = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('media')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedMedia: MediaItem[] = data.map((item: any) => ({
        id: item.id,
        type: item.type,
        url: item.url,
        title: item.title,
        creator: item.profiles?.username || 'Unknown',
        tags: item.tags || [],
        likes: item.likes_count || 0,
        taps: item.views_count || 0,
      }));

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
