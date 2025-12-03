import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MessageCircle, Share2, X, DollarSign } from 'lucide-react';
import type { MediaItem } from '@/types';
import { useLikes } from '@/hooks/useLikes';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MediaModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onTagClick?: (tag: string) => void;
}

const MediaModal = ({ media, isOpen, onClose, onTagClick }: MediaModalProps) => {
  const { user } = useAuth();
  const { isLiked, toggleLike, loading } = useLikes(media?.id || '');
  const { followUser, unfollowUser, isFollowing } = useFollows(user?.id);
  const { comments, loading: commentsLoading, addComment } = useComments(media?.id || null);
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const fetchCreatorId = async () => {
      if (!media?.id) return;
      
      const { data } = await (supabase as any)
        .from('media')
        .select('user_id')
        .eq('id', media.id)
        .single();
      
      if (data) {
        setCreatorUserId(data.user_id);
      }
    };
    
    fetchCreatorId();
  }, [media?.id]);

  useEffect(() => {
    const checkFollowing = async () => {
      if (!user || !creatorUserId || user.id === creatorUserId) return;
      
      const following = await isFollowing(creatorUserId, user.id);
      setIsFollowingCreator(following);
    };
    
    checkFollowing();
  }, [user, creatorUserId, isFollowing]);

  const handleFollowToggle = async () => {
    if (!user || !creatorUserId || user.id === creatorUserId) {
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowingCreator) {
        const { error } = await (supabase as any)
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creatorUserId);
        if (error) throw error;
        setIsFollowingCreator(false);
        toast({ title: 'Unfollowed', description: 'You have unfollowed this creator.' });
      } else {
        const { error } = await (supabase as any)
          .from('follows')
          .insert({ follower_id: user.id, following_id: creatorUserId });
        if (error) throw error;
        setIsFollowingCreator(true);
        toast({ title: 'Followed', description: 'You are now following this creator.' });
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
      toast({ title: 'Action failed', description: 'Please try again.', variant: 'destructive' as any });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
      onClose();
    }
  };

  if (!media) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Media Display - Top */}
          <div className="w-full bg-black flex items-center justify-center min-h-[200px] max-h-[50vh]">
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={media.title}
                className="w-full h-full object-contain max-h-[50vh]"
              />
            ) : (
              <video
                src={media.url}
                controls
                className="w-full h-full object-contain max-h-[50vh]"
              />
            )}
          </div>

          {/* Details Section - Bottom */}
          <ScrollArea className="flex-1 max-h-[40vh]">
            <div className="p-4 space-y-4">
              {/* Creator Info & Actions */}
              <div className="flex items-center justify-between">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                  onClick={() => {
                    if (creatorUserId) {
                      navigate(`/profile/${creatorUserId}`);
                      onClose();
                    }
                  }}
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {media.creator.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{media.creator}</h3>
                    <p className="text-xs text-muted-foreground">Creator</p>
                  </div>
                </div>
                {user && creatorUserId && user.id !== creatorUserId && (
                  <Button 
                    variant={isFollowingCreator ? "outline" : "default"} 
                    size="sm"
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                  >
                    {isFollowingCreator ? 'Unfollow' : 'Follow'}
                  </Button>
                )}
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-foreground">{media.title}</h2>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant={isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleLike()}
                  disabled={loading}
                  className="gap-1"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  {media.likes}
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <MessageCircle className="w-4 h-4" />
                  {comments.length}
                </Button>
                <Button variant="outline" size="sm" className="gap-1">
                  <DollarSign className="w-4 h-4" />
                  Tip
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Tags */}
              {media.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {media.tags.map((tag) => (
                    <Button
                      key={tag}
                      variant="secondary"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => handleTagClick(tag)}
                    >
                      #{tag}
                    </Button>
                  ))}
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h3 className="font-semibold text-foreground text-sm">Comments ({comments.length})</h3>
                
                {/* Comment Input */}
                {user && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="text-sm"
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter' && commentText.trim()) {
                          try {
                            await addComment(commentText, user.id);
                            setCommentText('');
                            toast({ title: 'Comment added' });
                          } catch (error) {
                            toast({ title: 'Failed to post comment', variant: 'destructive' as any });
                          }
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!commentText.trim()) return;
                        try {
                          await addComment(commentText, user.id);
                          setCommentText('');
                          toast({ title: 'Comment added' });
                        } catch (error) {
                          toast({ title: 'Failed to post comment', variant: 'destructive' as any });
                        }
                      }}
                      disabled={commentsLoading || !commentText.trim()}
                    >
                      Post
                    </Button>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">
                              {comment.profiles?.username || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaModal;