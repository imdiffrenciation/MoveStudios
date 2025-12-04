import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  wallet_address: string | null;
  privy_user_id: string | null;
  login_method: string | null;
}

export const usePrivyAuth = () => {
  const { ready, authenticated, user, logout: privyLogout } = usePrivy();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('privy_user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
