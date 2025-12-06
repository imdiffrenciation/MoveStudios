import { useState, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { supabase } from '@/integrations/supabase/client';

// Contract configuration - using hello_blockchain module name from your Move contract
const CONTRACT_ADDRESS = '0xa82655afd873cdf5e35d2dfa6ab6def067c3b5407ba3f61d32dc41b91ed66955';
const MODULE_NAME = 'tipping';

// Movement network configurations
const MOVEMENT_CONFIGS = {
  mainnet: {
    chainId: 126,
    name: "Movement Mainnet",
    fullnode: "https://full.mainnet.movementinfra.xyz/v1",
    explorer: "mainnet"
  },
  testnet: {
    chainId: 250,
    name: "Movement Testnet", 
    fullnode: "https://full.testnet.movementinfra.xyz/v1",
    explorer: "testnet"
  }
};

// Octas conversion (1 MOVE = 10^8 octas)
const OCTAS_PER_MOVE = 100_000_000;

export interface TipStats {
  tipsSent: number;
  tipsReceived: number;
}

// Create Aptos client based on chain ID
const getAptosClient = (chainId?: number) => {
  let networkConfig = MOVEMENT_CONFIGS.testnet; // Default to testnet
  
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

// Default client for queries
const aptos = getAptosClient();

const getExplorerUrl = (txHash: string, chainId?: number) => {
  const networkConfig = chainId === 126 ? MOVEMENT_CONFIGS.mainnet : MOVEMENT_CONFIGS.testnet;
  return `https://explorer.movementnetwork.xyz/txn/${txHash}?network=${networkConfig.explorer}`;
};

export const useTipping = () => {
  const { account, signAndSubmitTransaction, connected, network } = useWallet();
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
      const client = getAptosClient(network?.chainId);
      
      // Use getAccountCoinAmount for Movement network native coin
      const balance = await client.getAccountCoinAmount({
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
  }, [network?.chainId]);

  // Check if stats exist for an address
  const checkStatsExist = useCallback(async (walletAddress: string): Promise<boolean> => {
    try {
      const client = getAptosClient(network?.chainId);
      const resources = await client.getAccountResources({ accountAddress: walletAddress });
      const tipStatsResource = resources.find(
        (r: any) => r.type === `${CONTRACT_ADDRESS}::${MODULE_NAME}::TipStats`
      );
      return !!tipStatsResource;
    } catch (error) {
      console.error('Error checking stats existence:', error);
      return false;
    }
  }, [network?.chainId]);

  // Get tip stats from on-chain resources
  const getTipStats = useCallback(async (walletAddress: string): Promise<TipStats> => {
    try {
      const client = getAptosClient(network?.chainId);
      const resources = await client.getAccountResources({ accountAddress: walletAddress });
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
  }, [network?.chainId]);

  // Initialize stats for the connected wallet
  const initializeStats = useCallback(async (): Promise<{ success: boolean; hash?: string; error?: string }> => {
    console.log('initializeStats called', { connected, account: account?.address?.toString(), chainId: network?.chainId });
    
    if (!connected || !account) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const functionName = `${CONTRACT_ADDRESS}::${MODULE_NAME}::initialize_stats`;
      console.log('Initializing stats with function:', functionName);

      // Use the Movement transaction format with sender field
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: functionName as `${string}::${string}::${string}`,
          functionArguments: []
        }
      });

      console.log('Init stats response:', response);

      const client = getAptosClient(network?.chainId);
      const txResult = await client.waitForTransaction({
        transactionHash: response.hash,
      });

      if (txResult.success) {
        console.log('Stats initialized! Explorer:', getExplorerUrl(response.hash, network?.chainId));
        return { success: true, hash: response.hash };
      } else {
        return { success: false, error: 'Initialize stats transaction failed' };
      }
    } catch (error: any) {
      console.error('Initialize stats error:', error);
      // If stats already exist, that's fine
      if (error.message?.includes('already exists') || error.message?.includes('RESOURCE_ALREADY_EXISTS')) {
        return { success: true };
      }
      return { success: false, error: error.message || 'Failed to initialize stats' };
    }
  }, [connected, account, signAndSubmitTransaction, network?.chainId]);

  // Main tip function
  const tipCreator = useCallback(async (
    receiverWalletAddress: string,
    tipAmount: number
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    console.log('tipCreator called with:', { 
      receiverWalletAddress, 
      tipAmount, 
      connected, 
      account: account?.address?.toString(),
      chainId: network?.chainId
    });
    
    if (!connected || !account) {
      console.log('Wallet not connected - connected:', connected, 'account:', account);
      return { success: false, error: 'Wallet not connected' };
    }

    setLoading(true);

    try {
      const senderAddress = account.address.toString();
      console.log('Sender address:', senderAddress);
      
      // Check if receiver has initialized stats (required for tipping)
      console.log('Checking if receiver has initialized stats...');
      const receiverHasStats = await checkStatsExist(receiverWalletAddress);
      console.log('Receiver has stats:', receiverHasStats);
      
      if (!receiverHasStats) {
        setLoading(false);
        return { success: false, error: 'Creator has not initialized their tipping account yet. They need to connect their wallet in Settings first.' };
      }
      
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

      // Build the function name
      const functionName = `${CONTRACT_ADDRESS}::${MODULE_NAME}::tip`;
      
      console.log('Function name:', functionName);
      console.log('Receiver:', receiverWalletAddress);
      console.log('Amount:', tipAmountOctas);

      // Use the Movement transaction format with sender field
      // This matches the working send-transaction.tsx pattern
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: functionName as `${string}::${string}::${string}`,
          functionArguments: [receiverWalletAddress, tipAmountOctas]
        }
      });

      console.log('Transaction response:', response);

      // Wait for transaction confirmation
      console.log('Waiting for transaction confirmation...');
      const client = getAptosClient(network?.chainId);
      const txResult = await client.waitForTransaction({
        transactionHash: response.hash,
      });
      console.log('Transaction result:', txResult);

      if (txResult.success) {
        console.log('Tip successful! Explorer:', getExplorerUrl(response.hash, network?.chainId));
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
  }, [connected, account, signAndSubmitTransaction, canTipAmount, checkStatsExist, network?.chainId]);

  return {
    tipCreator,
    initializeStats,
    getTipStats,
    checkStatsExist,
    canTipAmount,
    getSenderWalletAddress,
    getReceiverWalletAddress,
    getExplorerUrl: (hash: string) => getExplorerUrl(hash, network?.chainId),
    loading,
    connected,
    walletAddress: account?.address?.toString(),
  };
};
