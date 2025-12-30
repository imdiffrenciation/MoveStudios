import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUserInterests } from '@/hooks/useUserInterests';
import { toast } from 'sonner';
import { Check, Sparkles } from 'lucide-react';

const Interests = () => {
  const navigate = useNavigate();
  const { availableInterests, saveInterests } = useUserInterests();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelected(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleContinue = async () => {
    if (selected.length < 3) {
      toast.error('Please select at least 3 interests');
      return;
    }

    setSaving(true);
    const success = await saveInterests(selected);
    setSaving(false);

    if (success) {
      toast.success('Interests saved!');
      navigate('/app');
    } else {
      toast.error('Failed to save interests');
    }
  };

  const handleSkip = () => {
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 pt-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          What do you love?
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
          Select at least 3 interests to personalize your feed
        </p>
      </div>

      {/* Interests Grid */}
      <div className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            {availableInterests.map((interest) => {
              const isSelected = selected.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`
                    relative px-5 py-2.5 rounded-full text-sm font-medium
                    transition-all duration-200 border-2
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-secondary/50 text-foreground border-transparent'
                    }
                  `}
                >
                  {isSelected && (
                    <Check className="inline w-4 h-4 mr-1.5 -ml-1" />
                  )}
                  {interest}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-border bg-background/80 backdrop-blur-lg">
        <div className="max-w-md mx-auto space-y-3">
          <Button 
            onClick={handleContinue}
            disabled={selected.length < 3 || saving}
            className="w-full h-12 text-base"
          >
            {saving ? 'Saving...' : `Continue (${selected.length}/3 minimum)`}
          </Button>
          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-muted-foreground"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Interests;
