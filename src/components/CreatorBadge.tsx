import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BadgeCheck } from 'lucide-react';

interface CreatorBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: { container: 'w-4 h-4', icon: 'w-2.5 h-2.5' },
  md: { container: 'w-5 h-5', icon: 'w-3 h-3' },
  lg: { container: 'w-6 h-6', icon: 'w-4 h-4' },
};

const CreatorBadge = ({ size = 'md', className, showTooltip = true }: CreatorBadgeProps) => {
  const badge = (
    <div 
      className={cn(
        sizeClasses[size].container, 
        'rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center',
        'animate-badge-glow',
        className
      )}
    >
      <BadgeCheck className={cn(sizeClasses[size].icon, 'text-primary-foreground')} />
    </div>
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
