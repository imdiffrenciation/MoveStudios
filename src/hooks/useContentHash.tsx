import { useState, useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { supabase } from '@/integrations/supabase/client';

// Contract configuration
const CONTRACT_ADDRESS = '0xa82655afd873cdf5e35d2dfa6ab6def067c3b5407ba3f61d32dc41b91ed66955';
const MODULE_NAME = 'content_hash_store';

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

// Generate a unique content hash from file data
export const generateContentHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

export const useContentHash = () => {
  const { account, signAndSubmitTransaction, connected, network } = useWallet();
  const [loading, setLoading] = useState(false);

  // Store hash on blockchain
  const storeHashOnChain = useCallback(async (contentHash: string): Promise<{ success: boolean; hash?: string; error?: string }> => {
    console.log('storeHashOnChain called', { connected, account: account?.address?.toString(), contentHash });
    
    if (!connected || !account) {
      return { success: false, error: 'Wallet not connected' };
    }

    setLoading(true);

    try {
      const functionName = `${CONTRACT_ADDRESS}::${MODULE_NAME}::store_hash`;
      console.log('Storing hash with function:', functionName);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: functionName as `${string}::${string}::${string}`,
          functionArguments: [contentHash]
        }
      });

      console.log('Store hash response:', response);

      const client = getAptosClient(network?.chainId);
      const txResult = await client.waitForTransaction({
        transactionHash: response.hash,
      });

      if (txResult.success) {
        console.log('Hash stored! Explorer:', getExplorerUrl(response.hash, network?.chainId));
        setLoading(false);
        return { success: true, hash: response.hash };
      } else {
        setLoading(false);
        return { success: false, error: 'Transaction failed on chain' };
      }
    } catch (error: any) {
      console.error('Store hash error:', error);
      setLoading(false);
      
      // Check if hash already exists (E_ALREADY_EXISTS = 1)
      if (error.message?.includes('already') || error.message?.includes('ALREADY_EXISTS')) {
        return { success: false, error: 'This content hash is already stored on-chain' };
      }
      
      if (error.message?.includes('rejected') || error.code === 4001) {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Failed to store hash' };
    }
  }, [connected, account, signAndSubmitTransaction, network?.chainId]);

  // Get all stored hashes for a wallet address
  const getStoredHashes = useCallback(async (walletAddress: string): Promise<string[]> => {
    try {
      const client = getAptosClient(network?.chainId);
      const resources = await client.getAccountResources({ accountAddress: walletAddress });
      const hashStoreResource = resources.find(
        (r: any) => r.type === `${CONTRACT_ADDRESS}::${MODULE_NAME}::HashStore`
      );

      if (!hashStoreResource) {
        return [];
      }

      const data = hashStoreResource.data as any;
      return data.hashes || [];
    } catch (error) {
      console.error('Error fetching stored hashes:', error);
      return [];
    }
  }, [network?.chainId]);

  // Update media record to mark as protected
  const markMediaAsProtected = useCallback(async (mediaId: string, txHash: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('media')
        .update({ is_protected: true })
        .eq('id', mediaId);

      if (error) {
        console.error('Error marking media as protected:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error marking media as protected:', error);
      return false;
    }
  }, []);

  // Protect a media item - store hash on chain and update DB
  const protectMedia = useCallback(async (mediaId: string, contentHash: string): Promise<{ success: boolean; hash?: string; error?: string }> => {
    const result = await storeHashOnChain(contentHash);
    
    if (result.success && result.hash) {
      await markMediaAsProtected(mediaId, result.hash);
    }
    
    return result;
  }, [storeHashOnChain, markMediaAsProtected]);

  // Find media by content hash in database
  const findMediaByHash = useCallback(async (contentHash: string): Promise<{
    found: boolean;
    media?: {
      id: string;
      title: string;
      url: string;
      creator_id: string;
      is_protected: boolean;
    };
    error?: string;
  }> => {
    try {
      const { data, error } = await supabase
        .from('media')
        .select('id, title, url, user_id, is_protected')
        .eq('content_hash', contentHash)
        .maybeSingle();

      if (error) {
        console.error('Error finding media by hash:', error);
        return { found: false, error: error.message };
      }

      if (!data) {
        return { found: false };
      }

      return {
        found: true,
        media: {
          id: data.id,
          title: data.title,
          url: data.url,
          creator_id: data.user_id,
          is_protected: data.is_protected || false,
        },
      };
    } catch (error: any) {
      console.error('Error finding media by hash:', error);
      return { found: false, error: error.message };
    }
  }, []);

  return {
    storeHashOnChain,
    getStoredHashes,
    protectMedia,
    markMediaAsProtected,
    findMediaByHash,
    getExplorerUrl: (hash: string) => getExplorerUrl(hash, network?.chainId),
    loading,
    connected,
    walletAddress: account?.address?.toString(),
  };
};