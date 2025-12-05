import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorName: string;
  creatorWalletAddress?: string;
  onTip: (amount: number) => void;
}

const tipAmounts = [1, 5, 10, 25, 50, 100];

const TipModal = ({ isOpen, onClose, creatorName, creatorWalletAddress, onTip }: TipModalProps) => {
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number>(1);
  const [defaultTipAmount, setDefaultTipAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDefaultTip = async () => {
      if (!user) return;
      
      const { data } = await (supabase as any)
        .from('profiles')
        .select('default_tip_amount')
        .eq('id', user.id)
        .single();
      
      if (data?.default_tip_amount) {
        setDefaultTipAmount(data.default_tip_amount);
        setSelectedAmount(data.default_tip_amount);
      }
    };
    
    if (isOpen) {
      fetchDefaultTip();
    }
  }, [user, isOpen]);

  const handleTip = async () => {
    if (!creatorWalletAddress) {
      toast({
        title: "Cannot tip",
        description: "This creator hasn't set up their wallet to receive tips.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    // For now, just show the tip amount (wallet integration will come later)
    toast({
      title: "Tip Ready",
      description: `Tip amount: ${selectedAmount} $MOVE to ${creatorName}`,
    });
    
    onTip(selectedAmount);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">
            Tip {creatorName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Amount Selection Grid */}
          <div className="grid grid-cols-3 gap-3">
            {tipAmounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                className="h-14 rounded-xl text-lg font-semibold"
                onClick={() => setSelectedAmount(amount)}
              >
                {amount}
              </Button>
            ))}
          </div>

          {/* Selected Amount Display */}
          <div className="text-center p-4 bg-muted/50 rounded-xl">
            <p className="text-sm text-muted-foreground mb-1">You're sending</p>
            <p className="text-3xl font-bold text-foreground">{selectedAmount} $MOVE</p>
            {defaultTipAmount && (
              <p className="text-xs text-muted-foreground mt-2">
                Your default: {defaultTipAmount} $MOVE
              </p>
            )}
          </div>

          {/* Creator Wallet Info */}
          {creatorWalletAddress ? (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Sending to</p>
              <p className="text-xs font-mono text-foreground">
                {creatorWalletAddress.slice(0, 6)}...{creatorWalletAddress.slice(-6)}
              </p>
            </div>
          ) : (
            <p className="text-xs text-center text-amber-500">
              This creator hasn't connected a wallet yet
            </p>
          )}

          {/* Tip Button */}
          <Button 
            className="w-full h-12 rounded-xl gap-2"
            onClick={handleTip}
            disabled={loading || !creatorWalletAddress}
          >
            <DollarSign className="w-5 h-5" />
            Send {selectedAmount} $MOVE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TipModal;