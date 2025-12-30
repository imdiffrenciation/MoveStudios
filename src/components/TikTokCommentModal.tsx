import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface TikTokCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: string;
}

const TikTokCommentModal = ({ isOpen, onClose, mediaId }: TikTokCommentModalProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && mediaId) {
      fetchComments();
    }
  }, [isOpen, mediaId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('media_id', mediaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const formattedComments: Comment[] = commentsData.map(c => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          user_id: c.user_id,
          username: profileMap.get(c.user_id)?.username || 'Unknown',
          avatar_url: profileMap.get(c.user_id)?.avatar_url || null,
        }));

        setComments(formattedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          media_id: mediaId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
      style={{ height: '60vh' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
        <h2 className="text-lg font-semibold">Comments {comments.length}</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <ScrollArea className="flex-1" style={{ height: 'calc(60vh - 120px)' }}>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No comments yet. Be the first!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage src={comment.avatar_url || undefined} />
                    <AvatarFallback>{comment.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">@{comment.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-1 break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      {user && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              className="flex-1 bg-muted border-0"
            />
            <Button 
              size="icon" 
              variant="ghost"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TikTokCommentModal;
