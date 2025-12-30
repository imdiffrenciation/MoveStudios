import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TrendingTag } from '@/types';

// Pulling every row + subscribing to every UPDATE can lock the main thread.
// Keep this lightweight: only recent posts + only react to new content.
const TRENDING_SAMPLE_SIZE = 250;

export const useTrendingTags = () => {
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTimerRef = useRef<number | null>(null);

  const fetchTrendingTags = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('media')
        .select('tags, created_at')
        .order('created_at', { ascending: false })
        .limit(TRENDING_SAMPLE_SIZE);

      if (error) throw error;

      const tagCounts: Record<string, number> = {};

      (data || []).forEach((item: any) => {
        const tags = item?.tags;
        if (Array.isArray(tags)) {
          for (const raw of tags) {
            const tag = String(raw || '').trim();
            if (!tag) continue;
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        }
      });

      const sortedTags: TrendingTag[] = Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      setTrendingTags(sortedTags);
    } catch (error) {
      console.error('Error fetching trending tags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      window.clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = window.setTimeout(() => {
      fetchTrendingTags();
    }, 400);
  }, [fetchTrendingTags]);

  useEffect(() => {
    fetchTrendingTags();

    // Only new content should affect trending tags; views/likes updates shouldn't refetch.
    const channel = (supabase as any)
      .channel('trending-tags-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'media',
        },
        () => {
          scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [fetchTrendingTags, scheduleRefresh]);

  return { trendingTags, loading };
};

