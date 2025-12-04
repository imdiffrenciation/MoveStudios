"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

interface WalletVerificationProps {
  onVerified: (walletAddress: string) => void;
}

export function WalletVerification({ onVerified }: WalletVerificationProps) {
  const { signMessage, account, disconnect } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const handleSignMessage = async () => {
    if (!account) {
      toast.error("No account connected");
      return;
    }

    if (!signMessage) {
      toast.error("Wallet does not support message signing");
      return;
    }

    setIsLoading(true);

    const message = `Movement Account Ownership Verification
Nonce: ${Date.now()}`;

    const loadingToast = toast.loading("Waiting for wallet approval...");

    try {
      const response = await signMessage({
        message,
        nonce: Date.now().toString(),
      });

      // Handle different response formats
      let signature: string;
      const responseAny = response as any;
      
      if (typeof response === 'string') {
        signature = response;
      } else if (responseAny.signature?.data?.data) {
        // Convert byte array to hex string
        const byteArray = Object.values(responseAny.signature.data.data) as number[];
        signature = '0x' + byteArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
      } else if (responseAny.signature) {
        signature = typeof responseAny.signature === 'string' 
          ? responseAny.signature 
          : JSON.stringify(responseAny.signature);
      } else {
        signature = JSON.stringify(response);
      }

      setIsVerified(true);
      
      // Get wallet address
      const walletAddress = account.address.toString();
      
      toast.success("Wallet verified successfully!", {
        id: loadingToast,
        duration: 3000,
      });

      onVerified(walletAddress);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to sign message";
      toast.error(errorMessage, {
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsVerified(false);
  };

  if (!account) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Verify Wallet Ownership</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-lg bg-muted">
          <p className="text-xs font-medium mb-1">Connected Wallet:</p>
          <p className="font-mono text-xs break-all opacity-75">
            {account.address.toString()}
          </p>
        </div>

        {isVerified ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Wallet verified!</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sign a message to verify you own this wallet. This is required to receive tips.
          </p>
        )}

        <div className="flex gap-2">
          {!isVerified && (
            <Button 
              onClick={handleSignMessage}
              disabled={isLoading || !signMessage}
              className="flex-1"
            >
              {isLoading ? "Signing..." : "Verify Ownership"}
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={handleDisconnect}
            className={isVerified ? "w-full" : ""}
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
