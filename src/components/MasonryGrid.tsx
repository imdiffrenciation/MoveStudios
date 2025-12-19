import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
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
  const [columnCount, setColumnCount] = useState(2);
  
  // Responsive column count
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1536) setColumnCount(6);
      else if (width >= 1280) setColumnCount(5);
      else if (width >= 1024) setColumnCount(4);
      else if (width >= 768) setColumnCount(3);
      else setColumnCount(2);
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Only preload first 4 images immediately
  useEffect(() => {
    if (items.length > 0) {
      const initialUrls = items.slice(0, 4).map(item => item.url);
      queuePreload(initialUrls);
    }
  }, [items.length]); // Only run when item count changes

  // Distribute items into columns using shortest-column algorithm
  // This ensures visual order matches click order
  const columnItems = useMemo(() => {
    const cols: { items: Array<{ item: MediaItem; originalIndex: number }> }[] = 
      Array.from({ length: columnCount }, () => ({ items: [] }));
    
    items.forEach((item, index) => {
      // Simple round-robin distribution (items go left to right, then wrap)
      // This matches the visual expectation
      const colIndex = index % columnCount;
      cols[colIndex].items.push({ item, originalIndex: index });
    });
    
    return cols;
  }, [items, columnCount]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:gap-5" style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}>
      {columnItems.map((col, colIndex) => (
        <div key={colIndex} className="flex flex-col gap-3 md:gap-5">
          {col.items.map(({ item, originalIndex }) => (
            <MediaCard 
              key={item.id}
              item={item} 
              onMediaClick={onMediaClick}
              shouldPreload={originalIndex < 8}
            />
          ))}
        </div>
      ))}
    </div>
  );
});

MasonryGrid.displayName = 'MasonryGrid';

export default MasonryGrid;
