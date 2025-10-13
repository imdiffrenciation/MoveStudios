import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TrendingTag } from '@/types';

export const useTrendingTags = () => {
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrendingTags = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('media')
        .select('tags');

      if (error) throw error;

      // Count tag occurrences
      const tagCounts: Record<string, number> = {};
      
      data.forEach((item: any) => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      // Convert to array and sort by count
      const sortedTags: TrendingTag[] = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Top 8 tags

      setTrendingTags(sortedTags);
    } catch (error) {
      console.error('Error fetching trending tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingTags();

    // Set up realtime subscription
    const channel = (supabase as any)
      .channel('trending-tags-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media',
        },
        () => {
          fetchTrendingTags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { trendingTags, loading };
};
