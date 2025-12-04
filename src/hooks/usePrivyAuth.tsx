import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  privy_user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  wallet_address: string | null;
}

export const usePrivyAuth = () => {
  const { ready, authenticated, user, logout: privyLogout } = usePrivy();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncPrivyUser = useCallback(async () => {
    if (!user?.id) return null;

    try {
      // Get user details from Privy
      const email = user.email?.address;
      const walletAddress = user.wallet?.address;

      const response = await supabase.functions.invoke('sync-privy-user', {
        body: {
          privy_user_id: user.id,
          email,
          wallet_address: walletAddress,
        },
      });

      if (response.error) throw response.error;
      return response.data?.profile || null;
    } catch (error) {
      console.error('Error syncing Privy user:', error);
      return null;
    }
  }, [user]);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // First try to fetch existing profile by privy_user_id (now the primary key)
      const { data, error } = await supabase
        .from('profiles')
        .select('privy_user_id, username, avatar_url, bio, wallet_address')
        .eq('privy_user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
      } else {
        // No profile exists, sync the Privy user to create one
        const syncedProfile = await syncPrivyUser();
        if (syncedProfile) {
          setProfile({
            privy_user_id: syncedProfile.privy_user_id,
            username: syncedProfile.username,
            avatar_url: syncedProfile.avatar_url,
            bio: syncedProfile.bio,
            wallet_address: syncedProfile.wallet_address,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Try to sync user if fetch failed
      const syncedProfile = await syncPrivyUser();
      if (syncedProfile) {
        setProfile({
          privy_user_id: syncedProfile.privy_user_id,
          username: syncedProfile.username,
          avatar_url: syncedProfile.avatar_url,
          bio: syncedProfile.bio,
          wallet_address: syncedProfile.wallet_address,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, syncPrivyUser]);

  useEffect(() => {
    if (ready) {
      if (authenticated && user) {
        fetchProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    }
  }, [ready, authenticated, user, fetchProfile]);

  const signOut = async () => {
    try {
      await privyLogout();
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refetchProfile = () => {
    fetchProfile();
  };

  return {
    user: authenticated ? user : null,
    profile,
    loading: !ready || loading,
    authenticated,
    signOut,
    refetchProfile
  };
};
