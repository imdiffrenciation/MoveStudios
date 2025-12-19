import { useState, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { supabase } from '@/integrations/supabase/client';

// Contract configuration
const CONTRACT_ADDRESS = '0xa82655afd873cdf5e35d2dfa6ab6def067c3b5407ba3f61d32dc41b91ed66955';
const MODULE_NAME = 'badge_purchase';
const ADMIN_ADDRESS = '0xa82655afd873cdf5e35d2dfa6ab6def067c3b5407ba3f61d32dc41b91ed66955';

// Movement network configurations
const MOVEMENT_CONFIGS = {
  mainnet: {
    chainId: 126,
    name: "Movement Mainnet",
    fullnode: "https://mainnet.movementnetwork.xyz/v1",
    explorer: "mainnet"
  },
  testnet: {
    chainId: 250,
    name: "Movement Testnet", 
    fullnode: "https://testnet.movementnetwork.xyz/v1",
    explorer: "testnet"
  }
};

// Octas conversion (1 MOVE = 10^8 octas)
const OCTAS_PER_MOVE = 100_000_000;

// Badge expiry duration in seconds (1 month = 2628002 seconds as per contract)
const BADGE_DURATION_SECONDS = 2628002;

export interface BadgeInfo {
  hasBadge: boolean;
  expiresAt: Date | null;
  isActive: boolean;
}

// Create Aptos client based on chain ID
const getAptosClient = (chainId?: number) => {
  let networkConfig = MOVEMENT_CONFIGS.testnet;
  
  if (chainId === 126) {
    networkConfig = MOVEMENT_CONFIGS.mainnet;
  } else if (chainId === 250) {
    networkConfig = MOVEMENT_CONFIGS.testnet;
  }
  
  const config = new AptosConfig({ 
    network: Network.CUSTOM,
    fullnode: networkConfig.fullnode
  });
  return new Aptos(config);
};

const getExplorerUrl = (txHash: string, chainId?: number) => {
  const networkConfig = chainId === 126 ? MOVEMENT_CONFIGS.mainnet : MOVEMENT_CONFIGS.testnet;
  return `https://explorer.movementnetwork.xyz/txn/${txHash}?network=${networkConfig.explorer}`;
};

export const useBadge = () => {
  const { account, signAndSubmitTransaction, connected, network } = useWallet();
  const [loading, setLoading] = useState(false);

  // Check if connected wallet is admin
  const isAdmin = useCallback(() => {
    if (!connected || !account) return false;
    const walletAddr = account.address.toString().toLowerCase().replace('0x', '');
    const adminAddr = ADMIN_ADDRESS.toLowerCase().replace('0x', '');
    console.log('Admin check:', { walletAddr, adminAddr, match: walletAddr === adminAddr });
    return walletAddr === adminAddr;
  }, [connected, account]);

  // Get current badge amount from database
  const getBadgeAmount = useCallback(async (): Promise<number> => {
    try {
      const { data, error } = await (supabase as any)
        .from('badge_settings')
        .select('badge_amount')
        .single();

      if (error) throw error;
      return data?.badge_amount || 500000;
    } catch (error) {
      console.error('Error fetching badge amount:', error);
      return 500000; // Default
    }
  }, []);

  // Get badge amount in MOVE (human readable)
  const getBadgeAmountInMove = useCallback(async (): Promise<number> => {
    const octas = await getBadgeAmount();
    return octas / OCTAS_PER_MOVE;
  }, [getBadgeAmount]);

  // Check user's balance
  const canAffordBadge = useCallback(async (walletAddress: string): Promise<boolean> => {
    try {
      const badgeAmount = await getBadgeAmount();
      const client = getAptosClient(network?.chainId);
      
      const balance = await client.getAccountCoinAmount({
        accountAddress: walletAddress,
        coinType: "0x1::aptos_coin::AptosCoin"
      });

      return BigInt(balance) >= BigInt(badgeAmount);
    } catch (error) {
      console.error('Error checking balance:', error);
      return true; // Let transaction try anyway
    }
  }, [network?.chainId, getBadgeAmount]);

  // Get user's badge status from database
  const getUserBadgeStatus = useCallback(async (userId: string): Promise<BadgeInfo> => {
    try {
      const { data, error } = await (supabase as any)
        .from('badges')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          hasBadge: true,
          expiresAt: new Date(data.expires_at),
          isActive: data.is_active
        };
      }

      return { hasBadge: false, expiresAt: null, isActive: false };
    } catch (error) {
      console.error('Error fetching badge status:', error);
      return { hasBadge: false, expiresAt: null, isActive: false };
    }
  }, []);

  // Purchase badge - calls badge_payment function
  const purchaseBadge = useCallback(async (
    userId: string
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    console.log('purchaseBadge called', { connected, account: account?.address?.toString() });
    
    if (!connected || !account) {
      return { success: false, error: 'Wallet not connected' };
    }

    setLoading(true);

    try {
      const walletAddress = account.address.toString();
      
      // Check balance
      const canAfford = await canAffordBadge(walletAddress);
      if (!canAfford) {
        setLoading(false);
        return { success: false, error: 'Insufficient balance for badge purchase' };
      }

      // Call badge_payment function
      const functionName = `${CONTRACT_ADDRESS}::${MODULE_NAME}::badge_payment`;
      console.log('Calling badge_payment:', functionName);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: functionName as `${string}::${string}::${string}`,
          functionArguments: []
        }
      });

      console.log('Badge payment response:', response);

      // Wait for transaction confirmation
      const client = getAptosClient(network?.chainId);
      const txResult = await client.waitForTransaction({
        transactionHash: response.hash,
      });

      if (txResult.success) {
        // Store badge in database
        const expiresAt = new Date(Date.now() + BADGE_DURATION_SECONDS * 1000);
        
        await (supabase as any).from('badges').insert({
          user_id: userId,
          badge_type: 'creator',
          expires_at: expiresAt.toISOString(),
          is_active: true,
          transaction_hash: response.hash,
          source: 'purchase'
        });

        // Update profile
        await (supabase as any)
          .from('profiles')
          .update({ has_active_badge: true })
          .eq('id', userId);

        console.log('Badge purchased! Explorer:', getExplorerUrl(response.hash, network?.chainId));
        setLoading(false);
        return { success: true, hash: response.hash };
      } else {
        setLoading(false);
        return { success: false, error: 'Transaction failed on chain' };
      }
    } catch (error: any) {
      console.error('Badge purchase error:', error);
      setLoading(false);
      
      if (error.message?.includes('rejected') || error.code === 4001) {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }, [connected, account, signAndSubmitTransaction, network?.chainId, canAffordBadge]);

  // Admin: Initialize badge amount resource (one-time)
  const initBadgeAmount = useCallback(async (): Promise<{ success: boolean; hash?: string; error?: string }> => {
    if (!connected || !account) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!isAdmin()) {
      return { success: false, error: 'Only admin can initialize badge amount' };
    }

    setLoading(true);

    try {
      const functionName = `${CONTRACT_ADDRESS}::${MODULE_NAME}::init_badge_amount`;
      console.log('Calling init_badge_amount:', functionName);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: functionName as `${string}::${string}::${string}`,
          functionArguments: []
        }
      });

      const client = getAptosClient(network?.chainId);
      const txResult = await client.waitForTransaction({
        transactionHash: response.hash,
      });

      setLoading(false);

      if (txResult.success) {
        return { success: true, hash: response.hash };
      } else {
        return { success: false, error: 'Transaction failed on chain' };
      }
    } catch (error: any) {
      console.error('Init badge amount error:', error);
      setLoading(false);
      
      // If already initialized, that's fine
      if (error.message?.toLowerCase().includes('already') || 
          error.message?.toLowerCase().includes('exist')) {
        return { success: true };
      }
      
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }, [connected, account, signAndSubmitTransaction, network?.chainId, isAdmin]);

  // Admin: Give free badge to a user by username
  const giveBadge = useCallback(async (
    username: string
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    if (!connected || !account) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!isAdmin()) {
      return { success: false, error: 'Only admin can give badges' };
    }

    setLoading(true);

    try {
      // First, find the user by username
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, username')
        .eq('username', username)
        .single();

      if (profileError || !profile) {
        setLoading(false);
        return { success: false, error: `User "${username}" not found` };
      }

      // Call give_badge function
      const functionName = `${CONTRACT_ADDRESS}::${MODULE_NAME}::give_badge`;
      console.log('Calling give_badge:', functionName, 'for username:', username);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: functionName as `${string}::${string}::${string}`,
          functionArguments: [username]
        }
      });

      const client = getAptosClient(network?.chainId);
      const txResult = await client.waitForTransaction({
        transactionHash: response.hash,
      });

      if (txResult.success) {
        // Store badge in database
        const expiresAt = new Date(Date.now() + BADGE_DURATION_SECONDS * 1000);
        
        await (supabase as any).from('badges').insert({
          user_id: profile.id,
          badge_type: 'creator',
          expires_at: expiresAt.toISOString(),
          is_active: true,
          transaction_hash: response.hash,
          source: 'giveaway'
        });

        // Update profile
        await (supabase as any)
          .from('profiles')
          .update({ has_active_badge: true })
          .eq('id', profile.id);

        console.log('Badge given! Explorer:', getExplorerUrl(response.hash, network?.chainId));
        setLoading(false);
        return { success: true, hash: response.hash };
      } else {
        setLoading(false);
        return { success: false, error: 'Transaction failed on chain' };
      }
    } catch (error: any) {
      console.error('Give badge error:', error);
      setLoading(false);
      
      if (error.message?.includes('rejected') || error.code === 4001) {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }, [connected, account, signAndSubmitTransaction, network?.chainId, isAdmin]);

  // Admin: Change badge amount
  const changeBadgeAmount = useCallback(async (
    newAmountInOctas: number
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    if (!connected || !account) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (!isAdmin()) {
      return { success: false, error: 'Only admin can change badge amount' };
    }

    setLoading(true);

    try {
      const functionName = `${CONTRACT_ADDRESS}::${MODULE_NAME}::change_badge_amount`;
      console.log('Calling change_badge_amount:', functionName, 'new amount:', newAmountInOctas);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: functionName as `${string}::${string}::${string}`,
          functionArguments: [newAmountInOctas]
        }
      });

      const client = getAptosClient(network?.chainId);
      const txResult = await client.waitForTransaction({
        transactionHash: response.hash,
      });

      if (txResult.success) {
        // Update badge settings in database
        await (supabase as any)
          .from('badge_settings')
          .update({ 
            badge_amount: newAmountInOctas,
            updated_at: new Date().toISOString()
          })
          .eq('id', (await (supabase as any).from('badge_settings').select('id').single()).data?.id);

        console.log('Badge amount changed! Explorer:', getExplorerUrl(response.hash, network?.chainId));
        setLoading(false);
        return { success: true, hash: response.hash };
      } else {
        setLoading(false);
        return { success: false, error: 'Transaction failed on chain' };
      }
    } catch (error: any) {
      console.error('Change badge amount error:', error);
      setLoading(false);
      
      if (error.message?.includes('rejected') || error.code === 4001) {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }, [connected, account, signAndSubmitTransaction, network?.chainId, isAdmin]);

  return {
    // User functions
    purchaseBadge,
    getUserBadgeStatus,
    getBadgeAmount,
    getBadgeAmountInMove,
    canAffordBadge,
    
    // Admin functions
    isAdmin,
    initBadgeAmount,
    giveBadge,
    changeBadgeAmount,
    
    // Utils
    getExplorerUrl: (hash: string) => getExplorerUrl(hash, network?.chainId),
    loading,
    connected,
    walletAddress: account?.address?.toString(),
    ADMIN_ADDRESS,
    OCTAS_PER_MOVE
  };
};
