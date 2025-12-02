import { useState } from 'react';
import { Heart, Eye, Bookmark, Play } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
      await (supabase as any)
        .from('media')
        .update({ views_count: (item.taps || 0) + 1 })
        .eq('id', item.id);
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    onTagClick?.(tag);
  };

  return (
    <Card 
      className="group overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 cursor-pointer border-border"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onMediaClick(item)}
    >
      {/* Media Container */}
      <div className="relative aspect-square overflow-hidden bg-secondary">
        {item.type === 'image' ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img 
              src={item.url} 
              alt={item.title}
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="relative w-full h-full">
            <video 
              src={item.url}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Play className="w-16 h-16 text-white opacity-80" />
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <div className={`
          absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent
          transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
        `}>
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{item.likes}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{item.taps}</span>
                </div>
              </div>
              <Bookmark className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-1">{item.title}</h3>
        <p className="text-sm text-muted-foreground">by {item.creator}</p>
        
        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                onClick={(e) => handleTagClick(e, tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

const MasonryGrid = ({ items, onMediaClick, onTagClick, columns = 4 }: MasonryGridProps) => {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className="masonry-grid">
      {items.map((item) => (
        <div key={item.id} className="masonry-item">
          <MediaCard 
            item={item} 
            onMediaClick={onMediaClick} 
            onTagClick={onTagClick}
          />
        </div>
      ))}
    </div>
  );
};

export default MasonryGrid;
