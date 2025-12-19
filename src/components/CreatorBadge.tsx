import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import creatorBadgeImg from '@/assets/creator-badge.png';

interface CreatorBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const CreatorBadge = ({ size = 'md', className, showTooltip = true }: CreatorBadgeProps) => {
  const badge = (
    <img 
      src={creatorBadgeImg} 
      alt="Verified Creator"
      className={cn(sizeClasses[size], 'object-contain', className)}
    />
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Verified Creator</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default CreatorBadge;
