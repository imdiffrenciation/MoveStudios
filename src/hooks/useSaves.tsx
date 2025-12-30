import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useSaves = (mediaId: string) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mediaId && user) {
      checkIfSaved();

      // Subscribe to realtime updates
      const channel = supabase
        .channel(`saves-${mediaId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'saves',
            filter: `media_id=eq.${mediaId}`,
          },
          () => {
            checkIfSaved();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, mediaId]);

  const checkIfSaved = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('saves')
        .select('id')
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .maybeSingle();

      if (error) throw error;
      setIsSaved(!!data);
    } catch (error) {
      console.error('Error checking save status:', error);
    }
  };

  const toggleSave = async () => {
    if (!user) {
      toast.error('Please sign in to save posts');
      return;
    }

    setLoading(true);
    try {
      if (isSaved) {
        const { error } = await (supabase as any)
          .from('saves')
          .delete()
          .eq('user_id', user.id)
          .eq('media_id', mediaId);

        if (error) throw error;
        setIsSaved(false);
        toast.success('Removed from saved');
      } else {
        const { error } = await (supabase as any)
          .from('saves')
          .insert({ user_id: user.id, media_id: mediaId });

        if (error) throw error;
        setIsSaved(true);
        toast.success('Saved');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return { isSaved, toggleSave, loading };
};
