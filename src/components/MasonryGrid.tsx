import { useState, useEffect, useRef } from 'react';
import { Heart, Eye, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { getLowResUrl, isImageCached, queuePreload } from '@/hooks/useImagePreloader';
import type { MediaItem } from '@/types';

interface MasonryGridProps {
  items: MediaItem[];
  onMediaClick: (item: MediaItem) => void;
  onTagClick?: (tag: string) => void;
  columns?: number;
}

const MediaCard = ({
  item,
  onMediaClick,
  onTagClick,
  shouldPreload = false
}: {
  item: MediaItem;
  onMediaClick: (item: MediaItem) => void;
  onTagClick?: (tag: string) => void;
  shouldPreload?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(() => isImageCached(item.url));
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [likesCount, setLikesCount] = useState(item.likes);
  const [viewsCount, setViewsCount] = useState(item.taps);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Low-res thumbnail URL
  const thumbUrl = getLowResUrl(item.url, 40);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px 0px', // Start loading 100px before visible
        threshold: 0
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Preload next images when this card becomes visible
  useEffect(() => {
    if (shouldPreload && isVisible) {
      queuePreload([item.url]);
    }
  }, [shouldPreload, isVisible, item.url]);

  // Sync with prop changes
  useEffect(() => {
    setLikesCount(item.likes);
    setViewsCount(item.taps);
  }, [item.likes, item.taps]);

  // Real-time subscription for this media item
  useEffect(() => {
    const channel = (supabase as any)
      .channel(`media-stats-${item.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media',
          filter: `id=eq.${item.id}`,
        },
        (payload: any) => {
          if (payload.new?.likes_count !== undefined) {
            setLikesCount(payload.new.likes_count);
          }
          if (payload.new?.views_count !== undefined) {
            setViewsCount(payload.new.views_count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [item.id]);

  const handleMouseEnter = async () => {
    setIsHovered(true);
    if (!viewCounted) {
      setViewCounted(true);
      await (supabase as any).from('media').update({
        views_count: (viewsCount || 0) + 1
      }).eq('id', item.id);
    }
  };

  return (
    <div 
      ref={cardRef}
      className="group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onMediaClick(item)}
    >
      {/* Media Container */}
      <div className="relative overflow-hidden rounded-2xl bg-secondary">
        {item.type === 'image' ? (
          <div className="relative">
            {/* Skeleton placeholder */}
            {!thumbLoaded && !imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-muted aspect-[3/4]" />
            )}
            
            {/* Low-res blurred thumbnail - loads first */}
            {isVisible && !imageLoaded && (
              <img
                src={thumbUrl}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover blur-lg scale-110 transition-opacity duration-300 ${
                  thumbLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setThumbLoaded(true)}
              />
            )}
            
            {/* Full resolution image - loads after thumbnail */}
            {isVisible && (
              <img 
                src={item.url} 
                alt={item.title} 
                className={`w-full object-cover transition-all duration-500 group-hover:scale-105 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
              />
            )}
            
            {/* Maintain aspect ratio when not loaded */}
            {!imageLoaded && (
              <div className="aspect-[3/4]" />
            )}
          </div>
        ) : (
          <div className="relative w-full aspect-[3/4]">
            {isVisible ? (
              <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
              <div className="w-full h-full animate-pulse bg-muted" />
            )}
            <div className="absolute inset-0 bg-foreground/10 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center">
                <Play className="w-5 h-5 text-foreground ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Hover Overlay - Minimal */}
        <div className={`
          absolute inset-0 bg-foreground/40 backdrop-blur-[2px]
          transition-opacity duration-300 flex items-end
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
          <div className="w-full p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-background">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span className="text-xs font-medium">{likesCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-medium">{viewsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Content - Clean & Minimal */}
      <div className="pt-2 pb-1 px-1">
        <p className="text-xs text-muted-foreground font-medium">{item.creator}</p>
      </div>
    </div>
  );
};

const MediaCardSkeleton = () => (
  <div className="masonry-item">
    <div className="rounded-2xl overflow-hidden">
      <Skeleton className="w-full aspect-[3/4]" />
    </div>
    <div className="pt-2 pb-1 px-1">
      <Skeleton className="h-3 w-20" />
    </div>
  </div>
);

export const MasonryGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="masonry-grid">
    {Array.from({ length: count }).map((_, i) => (
      <MediaCardSkeleton key={i} />
    ))}
  </div>
);

const MasonryGrid = ({
  items,
  onMediaClick,
  onTagClick,
  columns = 4
}: MasonryGridProps) => {
  // Preload upcoming images in batches
  useEffect(() => {
    if (items.length > 0) {
      // Preload first 8 images immediately
      const initialUrls = items.slice(0, 8).map(item => item.url);
      queuePreload(initialUrls);
    }
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="masonry-grid">
      {items.map((item, index) => (
        <div key={item.id} className="masonry-item">
          <MediaCard 
            item={item} 
            onMediaClick={onMediaClick} 
            onTagClick={onTagClick}
            shouldPreload={index < 12} // Preload first 12 items
          />
        </div>
      ))}
    </div>
  );
};

export default MasonryGrid;
