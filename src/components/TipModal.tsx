import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DollarSign, Loader2, Wallet, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTipping } from '@/hooks/useTipping';
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
  const { tipCreator, canTipAmount, loading: tippingLoading, connected, walletAddress } = useTipping();
  const [selectedAmount, setSelectedAmount] = useState<number>(1);
  const [defaultTipAmount, setDefaultTipAmount] = useState<number | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [canAfford, setCanAfford] = useState<boolean | null>(null);

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
      setCanAfford(null);
    }
  }, [user, isOpen]);

  // Check balance when amount changes
  useEffect(() => {
    const checkBalance = async () => {
      if (!walletAddress || !selectedAmount) {
        setCanAfford(null);
        return;
      }

      setCheckingBalance(true);
      const affordable = await canTipAmount(walletAddress, selectedAmount);
      setCanAfford(affordable);
      setCheckingBalance(false);
    };

    if (connected && isOpen) {
      checkBalance();
    }
  }, [selectedAmount, walletAddress, connected, canTipAmount, isOpen]);

  const handleTip = async () => {
    if (!creatorWalletAddress) {
      toast({
        title: "Cannot tip",
        description: "This creator hasn't set up their wallet to receive tips.",
        variant: "destructive",
      });
      return;
    }

    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet in Settings to send tips.",
        variant: "destructive",
      });
      return;
    }

    if (canAfford === false) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough MOVE to send this tip.",
        variant: "destructive",
      });
      return;
    }

    const result = await tipCreator(creatorWalletAddress, selectedAmount);

    if (result.success) {
      toast({
        title: "Tip sent!",
        description: `You sent ${selectedAmount} $MOVE to ${creatorName}`,
      });
      onTip(selectedAmount);
      onClose();
    } else {
      toast({
        title: "Tip failed",
        description: result.error || "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const isDisabled = tippingLoading || !creatorWalletAddress || !connected || canAfford === false || checkingBalance;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">
            Tip {creatorName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Wallet Connection Status */}
          {!connected && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <Wallet className="w-5 h-5 mx-auto mb-2 text-amber-500" />
              <p className="text-sm text-amber-500">
                Connect your wallet in Settings to send tips
              </p>
            </div>
          )}

          {/* Amount Selection Grid */}
          <div className="grid grid-cols-3 gap-3">
            {tipAmounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                className="h-14 rounded-xl text-lg font-semibold"
                onClick={() => setSelectedAmount(amount)}
                disabled={!connected}
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
            {checkingBalance && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Checking balance...
              </p>
            )}
            {canAfford === false && !checkingBalance && (
              <p className="text-xs text-destructive mt-2">
                Insufficient balance
              </p>
            )}
            {canAfford === true && !checkingBalance && (
              <p className="text-xs text-green-500 mt-2">
                Balance verified ✓
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
            disabled={isDisabled}
          >
            {tippingLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Send {selectedAmount} $MOVE
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TipModal;
