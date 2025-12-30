import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  onboarding_completed: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const navigate = useNavigate();

  const checkOnboardingStatus = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();
      
      setOnboardingCompleted((data as UserProfile | null)?.onboarding_completed ?? false);
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setOnboardingCompleted(false);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkOnboardingStatus(session.user.id);
      } else {
        setOnboardingCompleted(null);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkOnboardingStatus(session.user.id);
      } else {
        setOnboardingCompleted(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkOnboardingStatus]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const refreshOnboardingStatus = useCallback(() => {
    if (user) {
      checkOnboardingStatus(user.id);
    }
  }, [user, checkOnboardingStatus]);

  return { 
    user, 
    loading, 
    signOut, 
    onboardingCompleted,
    refreshOnboardingStatus 
  };
};
