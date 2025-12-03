import { useState } from 'react';
import { Heart, Eye, Bookmark, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  onTagClick
}: {
  item: MediaItem;
  onMediaClick: (item: MediaItem) => void;
  onTagClick?: (tag: string) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);

  const handleMouseEnter = async () => {
    setIsHovered(true);
    if (!viewCounted) {
      setViewCounted(true);
      await (supabase as any).from('media').update({
        views_count: (item.taps || 0) + 1
      }).eq('id', item.id);
    }
  };

  return (
    <div 
      className="group cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onMediaClick(item)}
    >
      {/* Media Container */}
      <div className="relative overflow-hidden rounded-2xl bg-secondary">
        {item.type === 'image' ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center aspect-[3/4]">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img 
              src={item.url} 
              alt={item.title} 
              className={`w-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="relative w-full aspect-[3/4]">
            <video src={item.url} className="w-full h-full object-cover" muted playsInline />
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
                <span className="text-xs font-medium">{item.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span className="text-xs font-medium">{item.taps}</span>
              </div>
            </div>
            <Bookmark className="w-4 h-4 text-background" />
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
const MasonryGrid = ({
  items,
  onMediaClick,
  onTagClick,
  columns = 4
}: MasonryGridProps) => {
  if (items.length === 0) {
    return <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No items found</p>
      </div>;
  }
  return <div className="masonry-grid">
      {items.map(item => <div key={item.id} className="masonry-item">
          <MediaCard item={item} onMediaClick={onMediaClick} onTagClick={onTagClick} />
        </div>)}
    </div>;
};
export default MasonryGrid;