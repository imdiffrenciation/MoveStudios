import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, X } from 'lucide-react';
import type { MediaItem } from '@/types';
import { useLikes } from '@/hooks/useLikes';

interface MediaModalProps {
  media: MediaItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const MediaModal = ({ media, isOpen, onClose }: MediaModalProps) => {
  const { isLiked, toggleLike, loading } = useLikes(media?.id || '');

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
                <Button variant="default" size="sm">
                  Follow
                </Button>
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
                  onClick={toggleLike}
                  disabled={loading}
                  className="gap-2"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  {media.likes}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {media.taps}
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
                <h3 className="font-semibold text-foreground">Comments</h3>
                <p className="text-sm text-muted-foreground">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaModal;
