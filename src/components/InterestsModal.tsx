import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useUserInterests } from '@/hooks/useUserInterests';
import { toast } from 'sonner';
import { Check, Sparkles } from 'lucide-react';

interface InterestsModalProps {
  open: boolean;
  onClose: () => void;
}

const InterestsModal = ({ open, onClose }: InterestsModalProps) => {
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
      toast.success('Your feed is now personalized!');
      onClose();
    } else {
      toast.error('Failed to save interests');
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">What do you love?</DialogTitle>
          <DialogDescription>
            Select at least 3 interests to personalize your feed
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-6 pb-4 overflow-y-auto max-h-[50vh]">
          <div className="flex flex-wrap gap-2 justify-center">
            {availableInterests.map((interest) => {
              const isSelected = selected.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`
                    relative px-4 py-2 rounded-full text-sm font-medium
                    transition-all duration-200 border-2
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-secondary/50 text-foreground border-transparent hover:border-primary/30'
                    }
                  `}
                >
                  <Check className={`inline w-3.5 h-3.5 mr-1 -ml-0.5 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 pt-4 border-t border-border bg-background/80 backdrop-blur-lg space-y-3">
          <Button 
            onClick={handleContinue}
            disabled={selected.length < 3 || saving}
            className="w-full h-11"
          >
            {saving ? 'Saving...' : `Continue (${selected.length}/3 minimum)`}
          </Button>
          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InterestsModal;
