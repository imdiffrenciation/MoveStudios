import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Heart, MessageCircle, Share2, X, DollarSign } from 'lucide-react';
import type { MediaItem } from '@/types';
import { useLikes } from '@/hooks/useLikes';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface MediaModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const MediaModal = ({ media, isOpen, onClose }: MediaModalProps) => {
  const { user } = useAuth();
  const { isLiked, toggleLike, loading } = useLikes(media?.id || '');
  const { followUser, unfollowUser, isFollowing } = useFollows(user?.id);
  const { comments, loading: commentsLoading, addComment } = useComments(media?.id || null);
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
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
      console.log('Follow toggle blocked', { hasUser: !!user, creatorUserId, sameUser: user?.id === creatorUserId });
      return;
    }

    setFollowLoading(true);
    try {
      console.log('Follow toggle start', { isFollowingCreator, creatorUserId, currentUserId: user.id });
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

  if (!media) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0">
        <div className="flex h-full">
          {/* Media Display */}
          <div className="flex-1 bg-black flex items-center justify-center relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="w-5 h-5" />
            </Button>
            
            {media.type === 'image' ? (
              <img
                src={media.url}
                alt={media.title}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={media.url}
                controls
                className="max-w-full max-h-full"
              />
            )}
          </div>

          {/* Info Sidebar */}
          <div className="w-96 bg-card flex flex-col">
            {/* Creator Info */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {media.creator.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{media.creator}</h3>
                  <p className="text-sm text-muted-foreground">Creator</p>
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
            </div>

            {/* Media Details */}
            <div className="flex-1 overflow-y-auto p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">{media.title}</h2>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 mb-6">
                <Button
                  variant={isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    console.log('Like toggle clicked', { mediaId: media.id });
                    await toggleLike();
                  }}
                  disabled={loading}
                  className="gap-2"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  {media.likes}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {comments.length}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  Tip
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {media.tags.map((tag) => (
                  <Button
                    key={tag}
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                  >
                    #{tag}
                  </Button>
                ))}
              </div>

              {/* Comments Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Comments ({comments.length})</h3>
                
                {/* Comment Input */}
                {user && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter' && commentText.trim()) {
                          try {
                            await addComment(commentText, user.id);
                            setCommentText('');
                            toast({ title: 'Comment added', description: 'Your comment has been posted.' });
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
                          toast({ title: 'Comment added', description: 'Your comment has been posted.' });
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
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {comment.profiles?.username || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaModal;
