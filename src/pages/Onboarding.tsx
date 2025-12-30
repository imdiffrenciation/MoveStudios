import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const INTEREST_CATEGORIES = [
  { id: 'animals', label: 'Animals', emoji: '🐾', tags: ['animals', 'pets', 'wildlife', 'dogs', 'cats'] },
  { id: 'fashion', label: 'Fashion & Clothing', emoji: '👗', tags: ['fashion', 'clothing', 'style', 'outfit', 'streetwear'] },
  { id: 'cars', label: 'Cars & Vehicles', emoji: '🚗', tags: ['cars', 'vehicles', 'automotive', 'supercars', 'motorcycles'] },
  { id: 'art', label: 'Art & Design', emoji: '🎨', tags: ['art', 'design', 'digital art', 'illustration', 'creative'] },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', tags: ['gaming', 'games', 'esports', 'playstation', 'xbox'] },
  { id: 'music', label: 'Music', emoji: '🎵', tags: ['music', 'songs', 'artists', 'beats', 'concerts'] },
  { id: 'food', label: 'Food & Cooking', emoji: '🍕', tags: ['food', 'cooking', 'recipes', 'foodie', 'restaurant'] },
  { id: 'travel', label: 'Travel', emoji: '✈️', tags: ['travel', 'adventure', 'destinations', 'vacation', 'explore'] },
  { id: 'fitness', label: 'Fitness & Health', emoji: '💪', tags: ['fitness', 'workout', 'gym', 'health', 'sports'] },
  { id: 'tech', label: 'Technology', emoji: '💻', tags: ['tech', 'technology', 'gadgets', 'coding', 'ai'] },
  { id: 'nature', label: 'Nature', emoji: '🌿', tags: ['nature', 'landscape', 'outdoors', 'mountains', 'ocean'] },
  { id: 'photography', label: 'Photography', emoji: '📸', tags: ['photography', 'photos', 'camera', 'portraits', 'shots'] },
  { id: 'crypto', label: 'Crypto & Web3', emoji: '🪙', tags: ['crypto', 'web3', 'blockchain', 'nft', 'defi'] },
  { id: 'movies', label: 'Movies & TV', emoji: '🎬', tags: ['movies', 'tv', 'cinema', 'film', 'series'] },
  { id: 'memes', label: 'Memes & Humor', emoji: '😂', tags: ['memes', 'funny', 'humor', 'comedy', 'jokes'] },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (!user || selectedInterests.length === 0) return;

    setLoading(true);

    try {
      // Get all tags for selected interests
      const selectedCategories = INTEREST_CATEGORIES.filter(c =>
        selectedInterests.includes(c.id)
      );

      // Insert user interests
      const interestInserts = selectedInterests.map(interest => ({
        user_id: user.id,
        interest,
      }));

      await (supabase as any).from('user_interests').insert(interestInserts);

      // Initialize user preferences with the tags from selected categories
      const tagInserts: { user_id: string; tag: string; score: number }[] = [];
      selectedCategories.forEach(category => {
        category.tags.forEach(tag => {
          tagInserts.push({
            user_id: user.id,
            tag: tag.toLowerCase(),
            score: 50, // Initial score for selected interests
          });
        });
      });

      // Insert in batches to avoid conflicts
      for (const insert of tagInserts) {
        await (supabase as any)
          .from('user_preferences')
          .upsert(insert, { onConflict: 'user_id,tag' });
      }

      // Mark onboarding as completed
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as any)
        .eq('id', user.id);

      toast({
        title: 'Welcome to MoveStudios!',
        description: 'Your feed is now personalized based on your interests.',
      });

      navigate('/app');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true } as any)
      .eq('id', user.id);

    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-pixel text-primary">MoveStudios</h1>
        </div>
        <h2 className="text-xl font-semibold text-foreground mt-6">
          What are you interested in?
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Select at least 3 topics to personalize your feed. The more you pick, the better your recommendations!
        </p>
      </header>

      {/* Interest Grid */}
      <main className="flex-1 px-4 pb-32 overflow-auto">
        <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
          {INTEREST_CATEGORIES.map(category => {
            const isSelected = selectedInterests.includes(category.id);
            return (
              <button
                key={category.id}
                onClick={() => toggleInterest(category.id)}
                className={cn(
                  'relative p-4 rounded-xl border-2 transition-all duration-200',
                  'flex flex-col items-center gap-2 text-center',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                    : 'border-border bg-card hover:border-primary/50'
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <span className="text-3xl">{category.emoji}</span>
                <span className="font-medium text-foreground text-sm">
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border">
        <div className="max-w-md mx-auto space-y-3">
          <Button
            className="w-full h-12 text-base"
            onClick={handleContinue}
            disabled={selectedInterests.length < 3 || loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Setting up...
              </span>
            ) : (
              `Continue (${selectedInterests.length} selected)`
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleSkip}
            disabled={loading}
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
