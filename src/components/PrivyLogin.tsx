import { useState, useEffect } from "react";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createMovementWallet } from "@/lib/privy-movement";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, CheckCircle } from "lucide-react";

interface PrivyLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: {
    user: any;
    isNewUser: boolean;
    wasAlreadyAuthenticated: boolean;
    loginMethod: string;
    linkedAccount?: any;
    movementWallet?: any;
  }) => void;
}

export default function PrivyLogin({ isOpen, onClose, onSuccess }: PrivyLoginProps) {
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);
  const { ready, authenticated, user, logout } = usePrivy();

  // Check for Movement wallet
  const movementWallet: any = user?.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.chainType === 'aptos'
  );

  const saveUserToDatabase = async (privyUser: any, wallet: any, loginMethod: string) => {
    try {
      const email = privyUser.email?.address || null;
      const username = email ? email.split('@')[0] : `user_${privyUser.id.slice(0, 8)}`;

      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('privy_user_id', privyUser.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            wallet_address: wallet?.address || null,
            login_method: loginMethod,
            updated_at: new Date().toISOString()
          })
          .eq('privy_user_id', privyUser.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: crypto.randomUUID(),
            privy_user_id: privyUser.id,
            username,
            wallet_address: wallet?.address || null,
            login_method: loginMethod
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving user to database:', error);
      throw error;
    }
  };

  const handleWalletCreation = async (privyUser: any) => {
    try {
      setIsCreatingWallet(true);
      // For now, we'll skip automatic wallet creation since it requires extended-chains
      // The wallet will be created if the user already has one linked
      const existingWallet = privyUser?.linkedAccounts?.find(
        (account: any) => account.type === 'wallet' && account.chainType === 'aptos'
      );
      return existingWallet || null;
    } catch (error) {
      console.error('Wallet creation error:', error);
      return null;
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const { login } = useLogin({
    onComplete: async ({ user: privyUser, isNewUser, wasAlreadyAuthenticated, loginMethod, loginAccount }) => {
      try {
        setIsCreatingWallet(true);
        const wallet = await handleWalletCreation(privyUser);

        // Save to database
        await saveUserToDatabase(privyUser, wallet, loginMethod || 'unknown');

        toast.success(isNewUser ? 'Account created successfully!' : 'Welcome back!');

        if (onSuccess) {
          onSuccess({
            user: privyUser,
            isNewUser,
            wasAlreadyAuthenticated,
            loginMethod: loginMethod || 'unknown',
            linkedAccount: loginAccount,
            movementWallet: wallet
          });
        }

        onClose();
      } catch (error) {
        console.error('Error in login completion:', error);
        toast.error('Failed to complete login');
      } finally {
        setIsCreatingWallet(false);
      }
    },
    onError: (error) => {
      console.error('Login failed:', error);
      toast.error('Login failed. Please try again.');
      setIsCreatingWallet(false);
    }
  });

  const handlePrivyLogin = async () => {
    try {
      setIsCreatingWallet(true);

      if (!authenticated) {
        await login({
          loginMethods: ['email', 'google', 'twitter', 'github', 'discord'],
          disableSignup: false
        });
      } else {
        const wallet = await handleWalletCreation(user);
        await saveUserToDatabase(user, wallet, 'existing');

        if (onSuccess) {
          onSuccess({
            user,
            isNewUser: false,
            wasAlreadyAuthenticated: true,
            loginMethod: 'existing',
            movementWallet: wallet
          });
        }

        onClose();
      }
    } catch (error) {
      console.error('Privy login error:', error);
      setIsCreatingWallet(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border-border">
        <DialogHeader>
          <div className="text-center mb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-lg font-semibold text-foreground">Connect with Privy</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Secure social login with automatic wallet creation
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {!authenticated || !movementWallet ? (
            <Button
              variant="default"
              className="w-full justify-center h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium"
              onClick={handlePrivyLogin}
              disabled={isCreatingWallet || !ready}
            >
              {isCreatingWallet ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  <span>Setting up...</span>
                </div>
              ) : authenticated ? (
                <span>Setup Wallet</span>
              ) : (
                <span>Login & Create Wallet</span>
              )}
            </Button>
          ) : null}

          {authenticated && user && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground text-center bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Authenticated as: {user.email?.address || user.phone?.number || 'User'}</span>
                </div>
              </div>

              {movementWallet ? (
                <div className="text-sm text-center bg-primary/10 border border-primary/20 p-3 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="font-medium text-primary">Wallet Connected</span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {movementWallet.address?.slice(0, 6)}...{movementWallet.address?.slice(-4)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-center bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-orange-600 dark:text-orange-400">Wallet Not Created</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            By continuing, you agree to Privy's Terms of Service and Privacy Policy.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
