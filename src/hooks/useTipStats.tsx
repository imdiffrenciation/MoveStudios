import { useState, useEffect, useCallback } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { supabase } from '@/integrations/supabase/client';

// Contract configuration
const CONTRACT_ADDRESS = '0xa82655afd873cdf5e35d2dfa6ab6def067c3b5407ba3f61d32dc41b91ed66955';
const MODULE_NAME = 'tipping';

// Movement Mainnet configuration
const aptosConfig = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: 'https://full.mainnet.movementinfra.xyz/v1',
});

const aptos = new Aptos(aptosConfig);

export interface TipStats {
  tipsSent: number;
  tipsReceived: number;
}

export const useTipStats = (userId: string | undefined) => {
  const [stats, setStats] = useState<TipStats>({ tipsSent: 0, tipsReceived: 0 });
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Fetch wallet address from profile
  const fetchWalletAddress = useCallback(async () => {
    if (!userId) return null;

    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (error || !data?.wallet_address) {
      return null;
    }
    return data.wallet_address;
  }, [userId]);

  // Fetch tip stats from blockchain
  const fetchTipStats = useCallback(async (address: string): Promise<TipStats> => {
    try {
      const resources = await aptos.getAccountResources({ accountAddress: address });
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

  // Refresh stats
  const refreshStats = useCallback(async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    const newStats = await fetchTipStats(walletAddress);
    setStats(newStats);
    setLoading(false);
  }, [walletAddress, fetchTipStats]);

  // Initial fetch
  useEffect(() => {
    const init = async () => {
      if (!userId) {
        setStats({ tipsSent: 0, tipsReceived: 0 });
        setWalletAddress(null);
        return;
      }

      setLoading(true);
      const address = await fetchWalletAddress();
      setWalletAddress(address);

      if (address) {
        const newStats = await fetchTipStats(address);
        setStats(newStats);
      }
      setLoading(false);
    };

    init();
  }, [userId, fetchWalletAddress, fetchTipStats]);

  return {
    tipsSent: stats.tipsSent,
    tipsReceived: stats.tipsReceived,
    loading,
    walletAddress,
    refreshStats,
  };
};
