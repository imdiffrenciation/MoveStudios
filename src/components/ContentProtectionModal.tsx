import { useState } from 'react';
import { Shield, ExternalLink, Loader2, Check, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContentHash } from '@/hooks/useContentHash';
import { useToast } from '@/hooks/use-toast';

interface UnprotectedMedia {
  id: string;
  title: string;
  url: string;
  content_hash: string;
  type: string;
}

interface ContentProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  unprotectedMedia: UnprotectedMedia[];
  onProtected: () => void;
}

const ContentProtectionModal = ({ 
  isOpen, 
  onClose, 
  unprotectedMedia,
  onProtected 
}: ContentProtectionModalProps) => {
  const { toast } = useToast();
  const { protectMedia, getExplorerUrl, loading, connected } = useContentHash();
  const [protectingId, setProtectingId] = useState<string | null>(null);
  const [protectedIds, setProtectedIds] = useState<Set<string>>(new Set());
  const [txHashes, setTxHashes] = useState<Map<string, string>>(new Map());

  const handleProtect = async (media: UnprotectedMedia) => {
    if (!connected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet in Settings first',
        variant: 'destructive',
      });
      return;
    }

    setProtectingId(media.id);

    const result = await protectMedia(media.id, media.content_hash);

    if (result.success) {
      setProtectedIds(prev => new Set([...prev, media.id]));
      if (result.hash) {
        setTxHashes(prev => new Map(prev).set(media.id, result.hash!));
      }
      toast({
        title: 'Content Protected!',
        description: 'Your content hash is now permanently stored on the blockchain.',
      });
      onProtected();
    } else {
      toast({
        title: 'Protection failed',
        description: result.error || 'Failed to store hash on blockchain',
        variant: 'destructive',
      });
    }

    setProtectingId(null);
  };

  const handleProtectAll = async () => {
    for (const media of unprotectedMedia) {
      if (!protectedIds.has(media.id)) {
        await handleProtect(media);
      }
    }
  };

  const remainingCount = unprotectedMedia.filter(m => !protectedIds.has(m.id)).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="w-5 h-5 text-primary" />
            Protect Your Content
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Store unique content hashes on the blockchain to prove ownership and prevent theft.
          </DialogDescription>
        </DialogHeader>

        {!connected && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Wallet not connected</p>
              <p className="text-sm text-muted-foreground">Connect your wallet in Settings to protect your content.</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {unprotectedMedia.map((media) => {
            const isProtected = protectedIds.has(media.id);
            const isProtecting = protectingId === media.id;
            const txHash = txHashes.get(media.id);

            return (
              <div 
                key={media.id} 
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {media.type === 'video' ? (
                    <video src={media.url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={media.url} alt={media.title} className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{media.title}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {media.content_hash.slice(0, 16)}...
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {isProtected ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="gap-1 bg-primary/20 text-primary border-primary/30">
                        <Check className="w-3 h-3" />
                        Protected
                      </Badge>
                      {txHash && (
                        <a
                          href={getExplorerUrl(txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleProtect(media)}
                      disabled={isProtecting || loading || !connected}
                    >
                      {isProtecting ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Protecting...
                        </>
                      ) : (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Protect
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {remainingCount > 1 && connected && (
          <Button 
            className="w-full mt-4" 
            onClick={handleProtectAll}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Protecting...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Protect All ({remainingCount} items)
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center mt-2">
          Each protection requires a blockchain transaction and small gas fee.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default ContentProtectionModal;