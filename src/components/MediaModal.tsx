import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MessageCircle, Share2, X, DollarSign, ChevronDown } from 'lucide-react';
import type { MediaItem } from '@/types';
import { useLikes } from '@/hooks/useLikes';
import { useFollows } from '@/hooks/useFollows';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
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
  allMedia?: MediaItem[];
}

const MediaModal = ({ media, isOpen, onClose, onTagClick, allMedia = [] }: MediaModalProps) => {
  const { profile } = usePrivyAuth();
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(media);
  const { isLiked, toggleLike, loading } = useLikes(currentMedia?.id || '');
  const { isFollowing } = useFollows(profile?.id);
  const { comments, loading: commentsLoading, addComment } = useComments(currentMedia?.id || null);
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);

  // Update currentMedia when media prop changes
  useEffect(() => {
    setCurrentMedia(media);
  }, [media]);

  useEffect(() => {
    const fetchCreatorId = async () => {
      if (!currentMedia?.id) return;
      
      const { data } = await (supabase as any)
        .from('media')
        .select('user_id')
        .eq('id', currentMedia.id)
        .single();
      
      if (data) {
        setCreatorUserId(data.user_id);
      }
    };
    
    fetchCreatorId();
  }, [currentMedia?.id]);

  useEffect(() => {
    const checkFollowing = async () => {
      if (!profile || !creatorUserId || profile.id === creatorUserId) return;
      
      const following = await isFollowing(creatorUserId, profile.id);
      setIsFollowingCreator(following);
    };
    
    checkFollowing();
  }, [profile, creatorUserId, isFollowing]);

  const handleFollowToggle = async () => {
    if (!profile || !creatorUserId || profile.id === creatorUserId) {
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowingCreator) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', profile.id)
          .eq('following_id', creatorUserId);
        if (error) throw error;
        setIsFollowingCreator(false);
        toast({ title: 'Unfollowed', description: 'You have unfollowed this creator.' });
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: profile.id, following_id: creatorUserId });
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

  // Get recommendations based on tags or random if no matching tags
  const getRecommendations = (): MediaItem[] => {
    if (!currentMedia || allMedia.length === 0) return [];
    
    const currentTags = currentMedia.tags || [];
    
    // Filter out current media and find related items
    const otherMedia = allMedia.filter(item => item.id !== currentMedia.id);
    
    // Score items by matching tags
    const scoredMedia = otherMedia.map(item => {
      const matchingTags = (item.tags || []).filter(tag => currentTags.includes(tag)).length;
      return { item, score: matchingTags };
    });
    
    // Sort by score (most matching tags first), then shuffle items with same score
    scoredMedia.sort((a, b) => b.score - a.score || Math.random() - 0.5);
    
    return scoredMedia.slice(0, 10).map(s => s.item);
  };

  const handleRecommendationClick = (item: MediaItem) => {
    setCurrentMedia(item);
    setShowComments(false);
    setCommentText('');
    // Scroll to top of modal
    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const recommendations = getRecommendations();

  if (!currentMedia) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[98vw] h-[95vh] max-h-[95vh] p-0 gap-0 overflow-hidden bg-background border-none rounded-2xl">
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 z-50 bg-background/80 hover:bg-background text-foreground rounded-full shadow-lg"
        >
          <X className="w-5 h-5" />
        </Button>

        <ScrollArea className="h-full">
          <div className="flex flex-col">
            {/* Hero Media Section */}
            <div className="relative w-full bg-black/95 flex items-center justify-center">
              {currentMedia.type === 'image' ? (
                <img
                  src={currentMedia.url}
                  alt={currentMedia.title}
                  className="w-full max-h-[45vh] object-contain"
                />
              ) : (
                <video
                  src={currentMedia.url}
                  controls
                  playsInline
                  webkit-playsinline="true"
                  className="w-full max-h-[45vh] object-contain"
                />
              )}
            </div>

            {/* Content Section */}
            <div className="p-4 md:p-6 space-y-5 bg-background">
              {/* Creator Info & Actions Row */}
              <div className="flex items-center justify-between gap-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    if (creatorUserId) {
                      navigate(`/profile/${creatorUserId}`);
                      onClose();
                    }
                  }}
                >
                  <Avatar className="w-11 h-11 ring-2 ring-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {currentMedia.creator.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{currentMedia.creator}</h3>
                    <p className="text-xs text-muted-foreground">Creator</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {profile && creatorUserId && profile.id !== creatorUserId && (
                    <Button 
                      variant={isFollowingCreator ? "outline" : "default"} 
                      size="sm"
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      className="rounded-full px-4"
                    >
                      {isFollowingCreator ? 'Following' : 'Follow'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">{currentMedia.title}</h2>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant={isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleLike()}
                  disabled={loading}
                  className="gap-2 rounded-full"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  {currentMedia.likes}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 rounded-full"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageCircle className="w-4 h-4" />
                  {comments.length}
                </Button>
                <Button variant="outline" size="sm" className="gap-2 rounded-full">
                  <DollarSign className="w-4 h-4" />
                  Tip
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Tags */}
              {currentMedia.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentMedia.tags.map((tag) => (
                    <Button
                      key={tag}
                      variant="secondary"
                      size="sm"
                      className="text-xs rounded-full h-7 px-3"
                      onClick={() => handleTagClick(tag)}
                    >
                      #{tag}
                    </Button>
                  ))}
                </div>
              )}

              {/* Comments Section - Collapsible */}
              {showComments && (
                <div className="space-y-4 pt-4 border-t border-border animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">Comments ({comments.length})</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowComments(false)}>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Comment Input */}
                  {profile && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="rounded-full bg-secondary/50 border-0"
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter' && commentText.trim()) {
                            try {
                              await addComment(commentText, profile.id);
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
                        className="rounded-full px-4"
                        onClick={async () => {
                          if (!commentText.trim()) return;
                          try {
                            await addComment(commentText, profile.id);
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
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No comments yet. Be the first!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 rounded-xl bg-secondary/30">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {comment.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {comment.profiles?.username || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 mt-0.5">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations Section - Pinterest Masonry Style */}
              {recommendations.length > 0 && (
                <div className="pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">More like this</h3>
                  <div className="columns-2 gap-4">
                    {recommendations.map((item) => (
                      <div
                        key={item.id}
                        className="group relative cursor-pointer break-inside-avoid mb-4"
                        onClick={() => handleRecommendationClick(item)}
                      >
                        <div className="relative rounded-2xl overflow-hidden bg-secondary/30 shadow-sm hover:shadow-md transition-all duration-300">
                          {item.type === 'image' ? (
                            <img
                              src={item.url}
                              alt={item.title}
                              className="w-full h-auto object-cover"
                            />
                          ) : (
                            <video
                              src={item.url}
                              className="w-full h-auto object-cover"
                              muted
                              playsInline
                            />
                          )}
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white text-sm font-medium line-clamp-2">{item.title}</p>
                              <p className="text-white/70 text-xs mt-1">{item.creator}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default MediaModal;
