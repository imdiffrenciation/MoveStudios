import { TrendingUp, Zap, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrendingTags } from '@/hooks/useTrendingTags';

interface TrendingTagsProps {
  onTagSelect: (tag: string) => void;
  selectedTag?: string;
  cleanDesign?: boolean;
}

const TrendingTags = ({ onTagSelect, selectedTag, cleanDesign = false }: TrendingTagsProps) => {
  const { trendingTags, loading } = useTrendingTags();

  const getTagIcon = (index: number) => {
    if (index === 0) return <Flame className="w-3 h-3" />;
    if (index < 3) return <TrendingUp className="w-3 h-3" />;
    return <Zap className="w-3 h-3" />;
  };

  const getTagColor = (index: number) => {
    if (index === 0) return 'text-primary';
    if (index < 3) return 'text-orange-400';
    return 'text-green-400';
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tags...</div>;
  }

  if (trendingTags.length === 0) {
    return <div className="text-sm text-muted-foreground">No tags yet</div>;
  }

  if (cleanDesign) {
    return (
      <div className="space-y-2">
        {trendingTags.map((tag, index) => (
          <Button
            key={tag.name}
            onClick={() => onTagSelect(tag.name)}
            variant="ghost"
            className={`
              w-full justify-start gap-2 transition-all
              ${selectedTag === tag.name
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-secondary'
              }
            `}
          >
            <span className={getTagColor(index)}>
              {getTagIcon(index)}
            </span>
            <span className="flex-1 text-left">#{tag.name}</span>
            <Badge variant="secondary" className="text-xs">
              {tag.count}
            </Badge>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Trending Tags
      </h3>
      <div className="space-y-2">
        {trendingTags.map((tag, index) => (
          <Button
            key={tag.name}
            onClick={() => onTagSelect(tag.name)}
            variant="ghost"
            className={`
              w-full justify-between group
              ${selectedTag === tag.name
                ? 'bg-primary/10 text-primary border border-primary'
                : 'hover:bg-secondary'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span className={getTagColor(index)}>
                {getTagIcon(index)}
              </span>
              <span>#{tag.name}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {tag.count}
            </Badge>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default TrendingTags;
