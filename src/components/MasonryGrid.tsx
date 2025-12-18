import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Heart, Eye, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getLowResUrl, isImageCached, queuePreload } from '@/hooks/useImagePreloader';
import type { MediaItem } from '@/types';

interface MasonryGridProps {
  items: MediaItem[];
  onMediaClick: (item: MediaItem) => void;
  onTagClick?: (tag: string) => void;
  columns?: number;
}

// Memoized MediaCard to prevent unnecessary re-renders
const MediaCard = memo(({
  item,
  onMediaClick,
  shouldPreload = false
}: {
  item: MediaItem;
  onMediaClick: (item: MediaItem) => void;
  shouldPreload?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(() => isImageCached(item.url));
  const [thumbLoaded, setThumbLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Low-res thumbnail URL - smaller size for faster load
  const thumbUrl = getLowResUrl(item.url, 20);

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
        rootMargin: '200px 0px', // Start loading 200px before visible
        threshold: 0
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Preload when visible and shouldPreload
  useEffect(() => {
    if (shouldPreload && isVisible && !imageLoaded) {
      queuePreload([item.url]);
    }
  }, [shouldPreload, isVisible, item.url, imageLoaded]);

  const handleClick = useCallback(() => {
    onMediaClick(item);
  }, [onMediaClick, item]);

  return (
    <div 
      ref={cardRef}
      className="group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
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
                className={`absolute inset-0 w-full h-full object-cover blur-lg scale-110 transition-opacity duration-200 ${
                  thumbLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setThumbLoaded(true)}
              />
            )}
            
            {/* Full resolution image */}
            {isVisible && (
              <img 
                src={item.url} 
                alt={item.title} 
                className={`w-full object-cover transition-all duration-300 group-hover:scale-105 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
                decoding="async"
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
              <video 
                src={item.url} 
                className="w-full h-full object-cover" 
                muted 
                playsInline 
                preload="none"
                poster={thumbUrl}
              />
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

        {/* Hover Overlay */}
        <div className={`
          absolute inset-0 bg-foreground/40 backdrop-blur-[2px]
          transition-opacity duration-200 flex items-end
          ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}>
          <div className="w-full p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-background">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span className="text-xs font-medium">{item.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-medium">{item.taps}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="pt-2 pb-1 px-1">
        <p className="text-xs text-muted-foreground font-medium truncate">{item.creator}</p>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these change
  return prevProps.item.id === nextProps.item.id &&
         prevProps.item.likes === nextProps.item.likes &&
         prevProps.item.taps === nextProps.item.taps &&
         prevProps.shouldPreload === nextProps.shouldPreload;
});

MediaCard.displayName = 'MediaCard';

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

const MasonryGrid = memo(({
  items,
  onMediaClick,
  onTagClick,
  columns = 4
}: MasonryGridProps) => {
  // Only preload first 4 images immediately
  useEffect(() => {
    if (items.length > 0) {
      const initialUrls = items.slice(0, 4).map(item => item.url);
      queuePreload(initialUrls);
    }
  }, [items.length]); // Only run when item count changes

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
            shouldPreload={index < 8} // Only preload first 8
          />
        </div>
      ))}
    </div>
  );
});

MasonryGrid.displayName = 'MasonryGrid';

export default MasonryGrid;
