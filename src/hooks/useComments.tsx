import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export const useComments = (mediaId: string | null) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mediaId) return;

    fetchComments();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`comments-${mediaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `media_id=eq.${mediaId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mediaId]);

  const fetchComments = async () => {
    if (!mediaId) return;

    const { data, error } = await (supabase as any)
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url
        )
      `)
      .eq('media_id', mediaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    setComments(data || []);
  };

  const addComment = async (content: string, userId: string) => {
    if (!mediaId || !content.trim()) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('comments')
        .insert({
          media_id: mediaId,
          user_id: userId,
          content: content.trim(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { comments, loading, addComment };
};
