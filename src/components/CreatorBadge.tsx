import { BadgeCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CreatorBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const CreatorBadge = ({ size = 'md', className, showTooltip = true }: CreatorBadgeProps) => {
  const badge = (
    <div 
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground",
        size === 'sm' && 'p-0.5',
        size === 'md' && 'p-0.5',
        size === 'lg' && 'p-1',
        className
      )}
    >
      <BadgeCheck className={sizeClasses[size]} />
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Verified Creator</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default CreatorBadge;
