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
  } | null;
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

    // Fetch comments first
    const { data: commentsData, error: commentsError } = await (supabase as any)
      .from('comments')
      .select('*')
      .eq('media_id', mediaId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      return;
    }

    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(commentsData.map((c: any) => c.user_id))];

    // Fetch profiles separately
    const { data: profilesData } = await (supabase as any)
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', userIds);

    // Create a map of user_id to profile
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });
    }

    // Merge comments with profiles
    const formattedComments: Comment[] = commentsData.map((comment: any) => {
      const profile = profilesMap.get(comment.user_id);
      return {
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user_id: comment.user_id,
        profiles: profile ? {
          username: profile.username,
          avatar_url: profile.avatar_url,
        } : null,
      };
    });

    setComments(formattedComments);
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
