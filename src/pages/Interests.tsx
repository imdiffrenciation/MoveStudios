import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserInterests } from '@/hooks/useUserInterests';
import { toast } from 'sonner';
import { Check, ArrowLeft } from 'lucide-react';

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
      navigate('/app', { replace: true });
    } else {
      toast.error('Failed to save interests');
    }
  };

  const handleSkip = () => {
    navigate('/app', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="relative px-4 pt-4 pb-3">
        <button 
          onClick={handleSkip}
          className="absolute left-4 top-4 p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {/* Progress bar */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-1 bg-destructive rounded-full" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-medium text-center">
          Pick the content that{' '}
          <span className="font-heading font-bold italic">MOVE</span>{' '}
          you
        </h1>
      </div>

      {/* Grid of interests */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-w-3xl mx-auto">
          {availableInterests.map((interest) => {
            const isSelected = selected.includes(interest.name);
            return (
              <button
                key={interest.name}
                onClick={() => toggleInterest(interest.name)}
                className="flex flex-col items-start text-left group"
              >
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2">
                  <img
                    src={interest.image}
                    alt={interest.name}
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  {/* Selection overlay */}
                  <div 
                    className={`absolute inset-0 transition-all duration-200 ${
                      isSelected 
                        ? 'bg-primary/40 ring-4 ring-primary ring-inset' 
                        : 'bg-transparent group-hover:bg-black/10'
                    }`}
                  />
                  {/* Checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium leading-tight line-clamp-2">
                  {interest.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-background">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handleContinue}
            disabled={selected.length < 3 || saving}
            className={`w-full py-3.5 rounded-full text-base font-medium transition-all ${
              selected.length >= 3
                ? 'bg-primary text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : `Pick ${Math.max(0, 3 - selected.length)} or more to continue`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Interests;
