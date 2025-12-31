import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, Play, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import CreatorBadge from '@/components/CreatorBadge';
import TikTokCommentModal from '@/components/TikTokCommentModal';
import { useMedia } from '@/hooks/useMedia';
import { useAuth } from '@/hooks/useAuth';
import { useTikTokInteractions } from '@/hooks/useTikTokInteractions';
import { useRecommendation } from '@/hooks/useRecommendation';
import { toast } from 'sonner';
import type { MediaItem } from '@/types';

interface TikTokFeedProps {
  onBack: () => void;
}

const TikTokFeed = ({ onBack }: TikTokFeedProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { media, loading, trackView } = useMedia();
  const { recordInteraction, markAsSeen } = useRecommendation();
  const { checkLikeStatus, checkSaveStatus, toggleLike, toggleSave, isLiked, getLikeCount, isSaved } = useTikTokInteractions();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  // Use media directly - shuffled for variety
  const feedItems = useMemo(() => {
    if (media.length === 0) return [];
    // Simple shuffle for variety
    const shuffled = [...media].sort(() => Math.random() - 0.5);
    return shuffled;
  }, [media]);

  const currentItem = feedItems[currentIndex];
  const nextItem = feedItems[currentIndex + 1];
  const prevItem = feedItems[currentIndex - 1];

  // Track view, mark as seen, and load interaction states when item changes
  useEffect(() => {
    if (currentItem && user) {
      trackView(currentItem.id);
      markAsSeen(currentItem.id);
      checkLikeStatus(currentItem.id);
      checkSaveStatus(currentItem.id);
    }
  }, [currentIndex, currentItem?.id, user]);

  // Touch handling for native swipe feel
  const handleTouchStart = (e: React.TouchEvent) => {
    if (commentModalOpen || isAnimating) return;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || commentModalOpen || isAnimating) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartY.current - currentY;
    
    // Apply resistance at boundaries
    if ((diff > 0 && currentIndex >= feedItems.length - 1) || 
        (diff < 0 && currentIndex <= 0)) {
      setDragOffset(-diff * 0.3); // More resistance at edges
    } else {
      setDragOffset(-diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || commentModalOpen) return;
    isDragging.current = false;
    
    const threshold = window.innerHeight * 0.15; // 15% of screen height
    
    if (Math.abs(dragOffset) > threshold) {
      // Animate to next/prev
      const direction = dragOffset < 0 ? 1 : -1;
      const targetOffset = direction > 0 ? -window.innerHeight : window.innerHeight;
      
      if ((direction > 0 && currentIndex < feedItems.length - 1) ||
          (direction < 0 && currentIndex > 0)) {
        setIsAnimating(true);
        setDragOffset(targetOffset);
        
        setTimeout(() => {
          // Disable transition momentarily to prevent double animation
          setIsAnimating(false);
          setDragOffset(0);
          setCurrentIndex(prev => prev + direction);
        }, 250);
      } else {
        // Snap back at boundaries
        setDragOffset(0);
      }
    } else {
      // Snap back
      setDragOffset(0);
    }
  };

  // Wheel handling for desktop
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleWheel = useCallback((e: WheelEvent) => {
    if (commentModalOpen || isAnimating) return;
    e.preventDefault();
    
    // Debounce wheel events
    if (wheelTimeout.current) return;
    
    if (Math.abs(e.deltaY) > 30) {
      const direction = e.deltaY > 0 ? 1 : -1;
      
      if ((direction > 0 && currentIndex < feedItems.length - 1) ||
          (direction < 0 && currentIndex > 0)) {
        setIsAnimating(true);
        setDragOffset(direction > 0 ? -window.innerHeight : window.innerHeight);
        
        setTimeout(() => {
          setIsAnimating(false);
          setDragOffset(0);
          setCurrentIndex(prev => prev + direction);
        }, 250);
      }
      
      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 300);
    }
  }, [commentModalOpen, isAnimating, currentIndex, feedItems.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Video control
  useEffect(() => {
    videoRefs.current.forEach((video, id) => {
      if (id === currentItem?.id) {
        if (isPaused) {
          video.pause();
        } else {
          video.play().catch(() => {});
        }
        video.muted = isMuted;
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [currentIndex, currentItem, isPaused, isMuted]);

  const handleLike = async () => {
    if (!user || !currentItem) return;
    await toggleLike(currentItem.id, currentItem.userId, currentItem.tags, recordInteraction);
  };

  const handleSave = async () => {
    if (!user || !currentItem) return;
    await toggleSave(currentItem.id);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/app?media=${currentItem?.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentItem?.title,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed - copy to clipboard instead
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied!');
      }
    } else {
      // Fallback for browsers without share API
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    }
  };

  const handleCreatorClick = () => {
    if (currentItem) {
      // Pass state to indicate we came from TikTok feed
      navigate(`/profile/${currentItem.userId}`, { state: { fromTikTok: true } });
    }
  };

  const togglePlayPause = () => {
    setIsPaused(prev => !prev);
  };

  if (loading && feedItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 p-4">
        <p className="text-muted-foreground text-center mb-4">No content available yet</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-20 text-white/80 text-sm font-medium"
      >
        ← Back
      </button>

      {/* Content - stacked slides */}
      <div className="relative w-full h-full overflow-hidden">
        {/* Previous item (above) */}
        {prevItem && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black"
            style={{ 
              transform: `translateY(calc(-100% + ${dragOffset}px))`,
              transition: isDragging.current || (!isAnimating && dragOffset === 0) ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            {prevItem.type === 'video' ? (
              <video src={prevItem.url} className="max-w-full max-h-full object-contain" muted playsInline />
            ) : (
              <img src={prevItem.url} alt={prevItem.title} className="max-w-full max-h-full object-contain" />
            )}
          </div>
        )}

        {/* Current item */}
        {currentItem && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black"
            style={{ 
              transform: `translateY(${dragOffset}px)`,
              transition: isDragging.current || (!isAnimating && dragOffset === 0) ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
            onClick={togglePlayPause}
          >
            {currentItem.type === 'video' ? (
              <video
                ref={el => el && videoRefs.current.set(currentItem.id, el)}
                src={currentItem.url}
                className="max-w-full max-h-full object-contain"
                loop
                playsInline
                muted={isMuted}
                autoPlay
              />
            ) : (
              <img
                src={currentItem.url}
                alt={currentItem.title}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Play/Pause overlay */}
            {isPaused && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="w-16 h-16 text-white/80" fill="white" />
              </div>
            )}
          </div>
        )}

        {/* Next item (below) */}
        {nextItem && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black"
            style={{ 
              transform: `translateY(calc(100% + ${dragOffset}px))`,
              transition: isDragging.current || (!isAnimating && dragOffset === 0) ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }}
          >
            {nextItem.type === 'video' ? (
              <video src={nextItem.url} className="max-w-full max-h-full object-contain" muted playsInline />
            ) : (
              <img src={nextItem.url} alt={nextItem.title} className="max-w-full max-h-full object-contain" />
            )}
          </div>
        )}

        {/* Right side actions */}
        {currentItem && (
          <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
            {/* Creator avatar */}
            <button onClick={handleCreatorClick} className="relative">
              <Avatar className="w-12 h-12 border-2 border-white">
                <AvatarImage src={currentItem.creatorAvatarUrl} />
                <AvatarFallback>{currentItem.creator[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              {currentItem.hasActiveBadge && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <CreatorBadge size="sm" />
                </div>
              )}
            </button>

            {/* Like */}
            <button onClick={handleLike} className="flex flex-col items-center">
              <div className={`p-2 rounded-full ${isLiked(currentItem.id) ? 'text-yellow-400' : 'text-white'}`}>
                <Heart className="w-7 h-7" fill={isLiked(currentItem.id) ? 'currentColor' : 'none'} />
              </div>
              <span className="text-white text-xs">{getLikeCount(currentItem.id)}</span>
            </button>

            {/* Comment */}
            <button onClick={() => setCommentModalOpen(true)} className="flex flex-col items-center">
              <div className="p-2 text-white">
                <MessageCircle className="w-7 h-7" />
              </div>
              <span className="text-white text-xs">Comments</span>
            </button>

            {/* Save */}
            <button onClick={handleSave} className="flex flex-col items-center">
              <div className={`p-2 ${isSaved(currentItem.id) ? 'text-yellow-400' : 'text-white'}`}>
                <Bookmark className="w-7 h-7" fill={isSaved(currentItem.id) ? 'currentColor' : 'none'} />
              </div>
              <span className="text-white text-xs">Save</span>
            </button>

            {/* Share */}
            <button onClick={handleShare} className="flex flex-col items-center">
              <div className="p-2 text-white">
                <Share2 className="w-7 h-7" />
              </div>
              <span className="text-white text-xs">Share</span>
            </button>

            {/* Volume (for videos) */}
            {currentItem.type === 'video' && (
              <button onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center">
                <div className="p-2 text-white">
                  {isMuted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
                </div>
              </button>
            )}
          </div>
        )}

        {/* Bottom info */}
        {currentItem && (
          <div className="absolute left-3 right-20 bottom-8 z-10">
            <button onClick={handleCreatorClick} className="flex items-center gap-2 mb-2">
              <span className="text-white font-semibold">@{currentItem.creator}</span>
              {currentItem.hasActiveBadge && <CreatorBadge size="sm" />}
            </button>
            <p className="text-white/90 text-sm mb-2 line-clamp-2">{currentItem.title}</p>
            {currentItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentItem.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-white/70 text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {currentItem && (
        <TikTokCommentModal
          isOpen={commentModalOpen}
          onClose={() => setCommentModalOpen(false)}
          mediaId={currentItem.id}
        />
      )}
    </div>
  );
};

export default TikTokFeed;
