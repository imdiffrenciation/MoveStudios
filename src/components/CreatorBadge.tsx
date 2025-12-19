import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
      src="/creator-badge.png" 
      alt="Verified Creator"
      className={cn(sizeClasses[size], className)}
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
