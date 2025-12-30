import { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, User, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLikes } from '@/hooks/useLikes';
import { useSaves } from '@/hooks/useSaves';
import { useAuth } from '@/hooks/useAuth';
import CreatorBadge from './CreatorBadge';
import type { MediaItem } from '@/types';
import { cn } from '@/lib/utils';

interface TikTokViewProps {
  items: MediaItem[];
  onCommentClick?: (item: MediaItem) => void;
  onShareClick?: (item: MediaItem) => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const TikTokCard = ({ 
  item, 
  isActive, 
  onCommentClick, 
  onShareClick 
}: { 
  item: MediaItem; 
  isActive: boolean;
  onCommentClick?: (item: MediaItem) => void;
  onShareClick?: (item: MediaItem) => void;
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Only subscribe for the active item to avoid dozens of realtime channels on mobile.
  const { isLiked, toggleLike } = useLikes(item.id, isActive);
  const { isSaved, toggleSave } = useSaves(item.id, isActive);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [localLikes, setLocalLikes] = useState(item.likes);

  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isActive) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleLike = async () => {
    // Let the hook handle signed-out UX (toast) without mutating local counts.
    if (!user) {
      await toggleLike();
      return;
    }

    await toggleLike();
    setLocalLikes(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleDoubleTap = () => {
    if (!isLiked && user) {
      handleLike();
    }
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="relative h-full w-full bg-black snap-start snap-always flex flex-col">
      {/* Media container - takes remaining space */}
      <div className="flex-1 relative min-h-0">
        {item.type === 'video' ? (
          <video
            ref={videoRef}
            src={item.url}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            onClick={togglePlay}
            onDoubleClick={handleDoubleTap}
          />
        ) : (
          <img
            src={item.url}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover"
            onDoubleClick={handleDoubleTap}
          />
        )}

        {/* Play/Pause overlay for videos */}
        {item.type === 'video' && !isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Right side action buttons - positioned above bottom info */}
      <div className="absolute right-3 bottom-[140px] flex flex-col items-center gap-4 z-10">
        {/* Profile */}
        <button 
          className="relative"
          onClick={() => item.userId && navigate(`/profile/${item.userId}`)}
        >
          <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white bg-muted">
            {item.creatorAvatarUrl ? (
              <img src={item.creatorAvatarUrl} alt={item.creator} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          {item.hasActiveBadge && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <CreatorBadge size="sm" showTooltip={false} />
            </div>
          )}
        </button>

        {/* Like */}
        <button className="flex flex-col items-center gap-1" onClick={handleLike}>
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all",
            isLiked ? "bg-red-500/20" : "bg-white/10 backdrop-blur-sm"
          )}>
            <Heart className={cn(
              "w-6 h-6 transition-all",
              isLiked ? "fill-red-500 text-red-500 scale-110" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(localLikes)}</span>
        </button>

        {/* Comment */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => onCommentClick?.(item)}
        >
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(item.taps)}</span>
        </button>

        {/* Save */}
        <button className="flex flex-col items-center gap-1" onClick={toggleSave}>
          <div className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center transition-all",
            isSaved ? "bg-primary/20" : "bg-white/10 backdrop-blur-sm"
          )}>
            <Bookmark className={cn(
              "w-6 h-6 transition-all",
              isSaved ? "fill-primary text-primary" : "text-white"
            )} />
          </div>
          <span className="text-white text-xs font-medium">Save</span>
        </button>

        {/* Share */}
        <button 
          className="flex flex-col items-center gap-1"
          onClick={() => onShareClick?.(item)}
        >
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Share</span>
        </button>

        {/* Mute toggle for videos */}
        {item.type === 'video' && (
          <button 
            className="flex flex-col items-center gap-1"
            onClick={toggleMute}
          >
            <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </div>
          </button>
        )}
      </div>

      {/* Bottom info - fixed height section */}
      <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-8">
        {/* Creator name */}
        <button 
          className="flex items-center gap-2 mb-2"
          onClick={() => item.userId && navigate(`/profile/${item.userId}`)}
        >
          <span className="text-white font-semibold text-base">@{item.creator}</span>
          {item.hasActiveBadge && <CreatorBadge size="sm" showTooltip={false} />}
        </button>

        {/* Title/Description */}
        <p className="text-white text-sm line-clamp-2 mb-2 pr-16">{item.title}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 pr-16">
          {item.tags.slice(0, 4).map(tag => (
            <span 
              key={tag} 
              className="text-white/80 text-sm"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const TikTokView = ({ 
  items, 
  onCommentClick, 
  onShareClick,
  currentIndex,
  onIndexChange 
}: TikTokViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const itemHeight = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / itemHeight);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < items.length) {
      onIndexChange(newIndex);
    }
  }, [currentIndex, items.length, onIndexChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to current index when it changes externally
  useEffect(() => {
    if (!containerRef.current) return;
    const itemHeight = containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: currentIndex * itemHeight,
      behavior: 'smooth'
    });
  }, [currentIndex]);

  if (items.length === 0) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <p className="text-white/60">No content available</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      {items.map((item, index) => (
        <div key={item.id} className="h-[100dvh] w-full">
          <TikTokCard 
            item={item} 
            isActive={index === currentIndex}
            onCommentClick={onCommentClick}
            onShareClick={onShareClick}
          />
        </div>
      ))}
    </div>
  );
};

export default TikTokView;
