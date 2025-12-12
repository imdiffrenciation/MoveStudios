import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MessageCircle, Share2, X, DollarSign, ChevronDown, Bookmark, Shield, Loader2, Eye } from 'lucide-react';
import type { MediaItem } from '@/types';
import { useLikes } from '@/hooks/useLikes';
import { useSaves } from '@/hooks/useSaves';
import { useFollows } from '@/hooks/useFollows';
import { useAuth } from '@/hooks/useAuth';
import { useComments } from '@/hooks/useComments';
import { useTipStats } from '@/hooks/useTipStats';
import { useContentHash } from '@/hooks/useContentHash';
import { useRecommendation } from '@/hooks/useRecommendation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import TipModal from './TipModal';

interface MediaModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
  onTagClick?: (tag: string) => void;
  allMedia?: MediaItem[];
}

const MediaModal = ({ media, isOpen, onClose, onTagClick, allMedia = [] }: MediaModalProps) => {
  const { user } = useAuth();
  const { recordInteraction, markAsSeen } = useRecommendation();
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(media);
  const { isLiked, likesCount, toggleLike, loading } = useLikes(currentMedia?.id || '');
  const { isSaved, toggleSave, loading: saveLoading } = useSaves(currentMedia?.id || '');
  const { isFollowing } = useFollows(user?.id);
  const { comments, loading: commentsLoading, addComment } = useComments(currentMedia?.id || null);
  const { refreshStats: refreshUserTipStats } = useTipStats(user?.id);
  const { protectMedia, connected: walletConnected, loading: hashLoading } = useContentHash();
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const [viewsCount, setViewsCount] = useState<number>(0);
  const navigate = useNavigate();
  const [isFollowingCreator, setIsFollowingCreator] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const [protectLoading, setProtectLoading] = useState(false);

  // Update currentMedia when media prop changes
  useEffect(() => {
    setCurrentMedia(media);
  }, [media]);

  // Mark as seen when modal opens
  useEffect(() => {
    if (currentMedia?.id && isOpen) {
      markAsSeen(currentMedia.id);
    }
  }, [currentMedia?.id, isOpen, markAsSeen]);

  // Fetch creator ID and initial view count
  useEffect(() => {
    const fetchMediaData = async () => {
      if (!currentMedia?.id) return;
      
      const { data } = await (supabase as any)
        .from('media')
        .select('user_id, views_count')
        .eq('id', currentMedia.id)
        .single();
      
      if (data) {
        setCreatorUserId(data.user_id);
        setViewsCount(data.views_count || 0);
      }
    };
    
    fetchMediaData();
  }, [currentMedia?.id]);

  // Real-time subscription for view count updates
  useEffect(() => {
    if (!currentMedia?.id || !isOpen) return;

    const channel = (supabase as any)
      .channel(`media-views-${currentMedia.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media',
          filter: `id=eq.${currentMedia.id}`,
        },
        (payload: any) => {
          if (payload.new?.views_count !== undefined) {
            setViewsCount(payload.new.views_count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentMedia?.id, isOpen]);

  useEffect(() => {
    const checkFollowing = async () => {
      if (!user || !creatorUserId || user.id === creatorUserId) return;
      
      const following = await isFollowing(creatorUserId, user.id);
      setIsFollowingCreator(following);
    };
    
    checkFollowing();
  }, [user, creatorUserId, isFollowing]);

  // Check if content is already protected
  useEffect(() => {
    const checkProtection = async () => {
      if (!currentMedia?.id) return;
      
      const { data } = await (supabase as any)
        .from('media')
        .select('is_protected, content_hash')
        .eq('id', currentMedia.id)
        .single();
      
      setIsProtected(data?.is_protected || false);
    };
    
    checkProtection();
  }, [currentMedia?.id]);

  // Track interaction for recommendation algorithm
  const trackInteraction = useCallback((type: 'like' | 'comment' | 'tip' | 'profile_check') => {
    if (!currentMedia?.id || !creatorUserId) return;
    recordInteraction(
      currentMedia.id,
      creatorUserId,
      currentMedia.tags || [],
      type
    );
  }, [currentMedia?.id, currentMedia?.tags, creatorUserId, recordInteraction]);

  const handleProtectContent = async () => {
    if (!currentMedia?.id || !user) return;
    
    const { data } = await (supabase as any)
      .from('media')
      .select('content_hash')
      .eq('id', currentMedia.id)
      .single();
    
    if (!data?.content_hash) {
      toast({ title: 'No content hash found', description: 'This content does not have a hash generated.', variant: 'destructive' as any });
      return;
    }

    if (!walletConnected) {
      toast({ title: 'Wallet not connected', description: 'Please connect your wallet in Settings first.', variant: 'destructive' as any });
      return;
    }

    setProtectLoading(true);
    
    const result = await protectMedia(currentMedia.id, data.content_hash);
    
    setProtectLoading(false);
    
    if (result.success) {
      setIsProtected(true);
      toast({ 
        title: 'Content protected!', 
        description: 'Your content hash has been stored on the blockchain.' 
      });
    } else {
      toast({ 
        title: 'Protection failed', 
        description: result.error || 'Failed to store hash on blockchain.', 
        variant: 'destructive' as any 
      });
    }
  };

  const handleLikeClick = () => {
    toggleLike();
    if (!isLiked) {
      trackInteraction('like');
    }
  };

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

  const handleCreatorProfileClick = () => {
    if (creatorUserId) {
      trackInteraction('profile_check');
      navigate(`/profile/${creatorUserId}`);
      onClose();
    }
  };

  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
      onClose();
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || !user) return;
    try {
      await addComment(commentText, user.id);
      trackInteraction('comment');
      setCommentText('');
      toast({ title: 'Comment added' });
    } catch (error) {
      toast({ title: 'Failed to post comment', variant: 'destructive' as any });
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
    
    // Sort by score (most matching tags first), then by recency for stability
    scoredMedia.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const timeA = new Date(a.item.timestamp || (a.item as any).created_at).getTime();
      const timeB = new Date(b.item.timestamp || (b.item as any).created_at).getTime();
      return timeB - timeA;
    });
    
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

  const handleTipSuccess = (amount: number) => {
    trackInteraction('tip');
    refreshUserTipStats();
    console.log(`Tip sent: ${amount} $MOVE`);
  };

  const recommendations = useMemo(getRecommendations, [currentMedia, allMedia]);

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
            {/* Hero Media Section - Full aspect ratio */}
            <div className="relative w-full bg-black/95 flex items-center justify-center">
              {currentMedia.type === 'image' ? (
                <img
                  src={currentMedia.url}
                  alt={currentMedia.title}
                  className="w-full max-h-[70vh] object-contain"
                />
              ) : (
                <video
                  src={currentMedia.url}
                  controls
                  playsInline
                  webkit-playsinline="true"
                  className="w-full max-h-[70vh] object-contain"
                />
              )}
            </div>

            {/* Content Section */}
            <div className="p-4 md:p-6 space-y-5 bg-background">
              {/* Creator Info & Actions Row */}
              <div className="flex items-center justify-between gap-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={handleCreatorProfileClick}
                >
                  <Avatar className="w-11 h-11 ring-2 ring-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {currentMedia.creator.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{currentMedia.creator}</h3>
                    {currentMedia.creatorWalletAddress ? (
                      <p className="text-xs text-muted-foreground font-mono">
                        {currentMedia.creatorWalletAddress.slice(0, 4)}...{currentMedia.creatorWalletAddress.slice(-4)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Creator</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {user && creatorUserId && user.id !== creatorUserId && (
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
                {/* View Count */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground px-3 py-1.5 bg-secondary/50 rounded-full">
                  <Eye className="w-4 h-4" />
                  {viewsCount}
                </div>
                <Button
                  variant={isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={handleLikeClick}
                  disabled={loading}
                  className="gap-2 rounded-full"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  {likesCount}
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 rounded-full"
                  onClick={() => setShowTipModal(true)}
                >
                  <DollarSign className="w-4 h-4" />
                  Tip
                </Button>
                <Button 
                  variant={isSaved ? "default" : "outline"} 
                  size="sm" 
                  className="gap-2 rounded-full"
                  onClick={() => toggleSave()}
                  disabled={saveLoading}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
                <Button variant="outline" size="sm" className="rounded-full">
                  <Share2 className="w-4 h-4" />
                </Button>
                
                {/* Own Your Content Button - Only for creator */}
                {user && creatorUserId === user.id && !isProtected && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-2 rounded-full bg-primary"
                    onClick={handleProtectContent}
                    disabled={protectLoading || hashLoading}
                  >
                    {protectLoading || hashLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    Own Your Content
                  </Button>
                )}
                
                {/* Protected Badge - Show when content is protected */}
                {isProtected && (
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1.5 bg-primary/10 rounded-full">
                    <Shield className="w-3.5 h-3.5" />
                    Protected
                  </div>
                )}
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
                  {user && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="rounded-full bg-secondary/50 border-0"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && commentText.trim()) {
                            handleCommentSubmit();
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="rounded-full px-4"
                        onClick={handleCommentSubmit}
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

        {/* Tip Modal */}
        <TipModal
          isOpen={showTipModal}
          onClose={() => setShowTipModal(false)}
          creatorName={currentMedia.creator}
          creatorWalletAddress={currentMedia.creatorWalletAddress}
          onTip={handleTipSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};

export default MediaModal;
