import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BadgeCheck, Wallet, Clock, ExternalLink } from 'lucide-react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useBadge } from '@/hooks/useBadge';
import { useAuth } from '@/hooks/useAuth';
import { WalletSelectionModal } from '@/components/wallet/WalletSelectionModal';
import { useToast } from '@/hooks/use-toast';
import creatorBadgeImg from '@/assets/creator-badge.png';

interface BadgePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BadgePurchaseModal = ({ isOpen, onClose, onSuccess }: BadgePurchaseModalProps) => {
  const { user } = useAuth();
  const { connected, account } = useWallet();
  const { 
    purchaseBadge, 
    getBadgeAmountInMove, 
    getUserBadgeStatus, 
    canAffordBadge,
    getExplorerUrl,
    loading 
  } = useBadge();
  const { toast } = useToast();

  const [badgePrice, setBadgePrice] = useState<number>(0);
  const [hasActiveBadge, setHasActiveBadge] = useState(false);
  const [badgeExpiry, setBadgeExpiry] = useState<Date | null>(null);
  const [hasEnoughBalance, setHasEnoughBalance] = useState(true);
  const [checkingBalance, setCheckingBalance] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBadgeInfo();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (connected && account) {
      checkBalance();
    }
  }, [connected, account]);

  const loadBadgeInfo = async () => {
    const price = await getBadgeAmountInMove();
    setBadgePrice(price);

    if (user) {
      const status = await getUserBadgeStatus(user.id);
      setHasActiveBadge(status.hasBadge);
      setBadgeExpiry(status.expiresAt);
    }
  };

  const checkBalance = async () => {
    if (!account) return;
    setCheckingBalance(true);
    const canAfford = await canAffordBadge(account.address.toString());
    setHasEnoughBalance(canAfford);
    setCheckingBalance(false);
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Not Logged In",
        description: "Please log in to purchase a badge.",
        variant: "destructive",
      });
      return;
    }

    if (!connected || !account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    const result = await purchaseBadge(user.id);

    if (result.success) {
      toast({
        title: "Badge Purchased!",
        description: "Congratulations! Your creator badge is now active for 30 days.",
      });
      onSuccess?.();
      onClose();
    } else {
      toast({
        title: "Purchase Failed",
        description: result.error || "Failed to purchase badge",
        variant: "destructive",
      });
    }
  };

  const formatExpiry = (date: Date) => {
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return `${days} days remaining`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <BadgeCheck className="w-6 h-6 text-primary" />
            Creator Badge
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Badge Preview */}
          <div className="flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="mb-4">
              <img 
                src={creatorBadgeImg} 
                alt="Creator Badge" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Verified Creator</h3>
            <p className="text-sm text-muted-foreground text-center">
              Stand out with a verified badge and boost your content visibility
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Benefits</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Verified badge on your profile and content
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Content visibility boost in recommendations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Priority placement in search results
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Valid for 30 days
              </li>
            </ul>
          </div>

          {/* Status / Purchase */}
          {hasActiveBadge ? (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3">
                <BadgeCheck className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-foreground">Badge Active</p>
                  {badgeExpiry && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatExpiry(badgeExpiry)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Price */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="text-xl font-bold text-foreground">
                    {badgePrice.toFixed(4)} $MOVE
                  </span>
                </div>
              </div>

              {/* Wallet Connection */}
              {!connected ? (
                <WalletSelectionModal onConnected={() => checkBalance()}>
                  <Button className="w-full h-12 rounded-xl">
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet to Purchase
                  </Button>
                </WalletSelectionModal>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
                    <p className="font-mono text-xs break-all text-foreground">
                      {account?.address?.toString()}
                    </p>
                  </div>

                  {!hasEnoughBalance && !checkingBalance && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive">
                        Insufficient balance. You need at least {badgePrice.toFixed(4)} $MOVE
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handlePurchase}
                    disabled={loading || !hasEnoughBalance || checkingBalance}
                    className="w-full h-12 rounded-xl"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="w-4 h-4 mr-2" />
                        Purchase Badge
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Payment is processed on the Movement Network blockchain
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgePurchaseModal;
