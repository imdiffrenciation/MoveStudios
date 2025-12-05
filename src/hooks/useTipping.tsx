import { useState, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Contract configuration
const CONTRACT_ADDRESS = '0xa82655afd873cdf5e35d2dfa6ab6def067c3b5407ba3f61d32dc41b91ed66955';
const MODULE_NAME = 'tipping';

// Movement Testnet configuration
const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: 'https://testnet.movementnetwork.xyz/v1',
});

const aptos = new Aptos(aptosConfig);

// Octas conversion (1 MOVE = 10^8 octas)
const OCTAS_PER_MOVE = 100_000_000;

export interface TipStats {
  tipsSent: number;
  tipsReceived: number;
}

export const useTipping = () => {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const [loading, setLoading] = useState(false);

  // Get sender wallet address from Supabase
  const getSenderWalletAddress = useCallback(async (userId: string): Promise<string | null> => {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (error || !data?.wallet_address) {
      return null;
    }
    return data.wallet_address;
  }, []);

  // Get receiver wallet address from Supabase  
  const getReceiverWalletAddress = useCallback(async (userId: string): Promise<string | null> => {
    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (error || !data?.wallet_address) {
      return null;
    }
    return data.wallet_address;
  }, []);

  // Check if user can afford the tip amount using account balance API
  const canTipAmount = useCallback(async (senderAddress: string, tipAmount: number): Promise<boolean> => {
    try {
      const tipAmountOctas = BigInt(tipAmount * OCTAS_PER_MOVE);
      
      // Use getAccountCoinAmount for Movement network native coin
      const balance = await aptos.getAccountCoinAmount({
        accountAddress: senderAddress,
        coinType: "0x1::aptos_coin::AptosCoin"
      });

      return BigInt(balance) >= tipAmountOctas;
    } catch (error) {
      console.error('Error checking balance:', error);
      // If we can't check balance, let the transaction try anyway
      // The contract will fail if balance is insufficient
      return true;
    }
  }, []);

  // Get tip stats from on-chain resources
  const getTipStats = useCallback(async (walletAddress: string): Promise<TipStats> => {
    try {
      const resources = await aptos.getAccountResources({ accountAddress: walletAddress });
      const tipStatsResource = resources.find(
        (r: any) => r.type === `${CONTRACT_ADDRESS}::${MODULE_NAME}::TipStats`
      );

      if (!tipStatsResource) {
        return { tipsSent: 0, tipsReceived: 0 };
      }

      const data = tipStatsResource.data as any;
      return {
        tipsSent: Number(data.tips_sent),
        tipsReceived: Number(data.tips_received),
      };
    } catch (error) {
      console.error('Error fetching tip stats:', error);
      return { tipsSent: 0, tipsReceived: 0 };
    }
  }, []);

  // Main tip function
  const tipCreator = useCallback(async (
    receiverWalletAddress: string,
    tipAmount: number
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    console.log('tipCreator called with:', { receiverWalletAddress, tipAmount, connected, account: account?.address?.toString() });
    
    if (!connected || !account) {
      console.log('Wallet not connected - connected:', connected, 'account:', account);
      return { success: false, error: 'Wallet not connected' };
    }

    setLoading(true);

    try {
      const senderAddress = account.address.toString();
      console.log('Sender address:', senderAddress);
      
      // Check if sender can afford the tip
      console.log('Checking balance...');
      const canAfford = await canTipAmount(senderAddress, tipAmount);
      console.log('Can afford:', canAfford);
      
      if (!canAfford) {
        setLoading(false);
        return { success: false, error: 'Insufficient balance for this tip amount' };
      }

      // Convert tip amount to octas
      const tipAmountOctas = Math.floor(tipAmount * OCTAS_PER_MOVE);
      console.log('Tip amount in octas:', tipAmountOctas);

      // Build the function name explicitly to avoid any encoding issues
      const functionName = "0xa82655afd873cdf5e35d2dfa6ab6def067c3b5407ba3f61d32dc41b91ed66955::tipping::tip";
      
      console.log('Function name:', functionName);
      console.log('Receiver:', receiverWalletAddress);
      console.log('Amount:', tipAmountOctas.toString());

      // Build transaction using the newer wallet adapter format with data wrapper
      const payload = {
        data: {
          function: functionName,
          typeArguments: [],
          functionArguments: [receiverWalletAddress, tipAmountOctas.toString()]
        }
      };
      
      console.log('Transaction payload:', JSON.stringify(payload, null, 2));

      console.log('Calling signAndSubmitTransaction...');
      const response = await signAndSubmitTransaction(payload as any);
      console.log('Transaction response:', response);

      // Wait for transaction confirmation
      console.log('Waiting for transaction confirmation...');
      const txResult = await aptos.waitForTransaction({
        transactionHash: response.hash,
      });
      console.log('Transaction result:', txResult);

      if (txResult.success) {
        setLoading(false);
        return { success: true, hash: response.hash };
      } else {
        setLoading(false);
        return { success: false, error: 'Transaction failed on chain' };
      }
    } catch (error: any) {
      console.error('Tip transaction error:', error);
      console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      setLoading(false);
      
      // Handle user rejection
      if (error.message?.includes('rejected') || error.code === 4001) {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }, [connected, account, signAndSubmitTransaction, canTipAmount]);

  return {
    tipCreator,
    getTipStats,
    canTipAmount,
    getSenderWalletAddress,
    getReceiverWalletAddress,
    loading,
    connected,
    walletAddress: account?.address?.toString(),
  };
};
