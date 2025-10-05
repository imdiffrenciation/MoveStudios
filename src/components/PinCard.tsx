import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Bookmark, Share2, MoreHorizontal } from 'lucide-react';

interface Pin {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  creatorName: string;
  creatorAvatar: string;
  likes: number;
  saves: number;
}

interface PinCardProps {
  pin: Pin;
}

const PinCard = ({ pin }: PinCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likesCount, setLikesCount] = useState(pin.likes);
  const [savesCount, setSavesCount] = useState(pin.saves);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    setSavesCount(isSaved ? savesCount - 1 : savesCount + 1);
  };

  return (
    <Card className="group overflow-hidden bg-card border-border hover:ring-2 hover:ring-primary/20 transition-all">
      <div className="relative">
        <img
          src={pin.imageUrl}
          alt={pin.title}
          className="w-full h-auto object-cover"
          loading="lazy"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
          <div className="flex justify-end gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={handleSave}
              className={isSaved ? 'bg-primary text-primary-foreground' : ''}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
            </Button>
            <Button size="icon" variant="secondary">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="secondary">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 ring-2 ring-primary">
                <AvatarImage src={pin.creatorAvatar} />
                <AvatarFallback>{pin.creatorName[0]}</AvatarFallback>
              </Avatar>
              <span className="text-white text-sm font-semibold">{pin.creatorName}</span>
            </div>

            <Button
              size="icon"
              variant="secondary"
              onClick={handleLike}
              className={isLiked ? 'bg-destructive text-white' : ''}
            >
              <Heart className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} />
            </Button>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{pin.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{pin.description}</p>
        
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {likesCount}
          </span>
          <span className="flex items-center gap-1">
            <Bookmark className="w-3 h-3" />
            {savesCount}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default PinCard;
