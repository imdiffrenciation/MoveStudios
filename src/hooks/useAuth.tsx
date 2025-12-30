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
    let cancelled = false;

    // Never allow the app to stay stuck in an infinite "auth loading" state.
    const watchdog = window.setTimeout(() => {
      if (cancelled) return;
      console.warn('Auth init timeout: forcing loading=false');
      setUser(null);
      setOnboardingCompleted(null);
      setLoading(false);
    }, 8000);

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          await checkOnboardingStatus(session.user.id);
        } else {
          setOnboardingCompleted(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (!cancelled) {
          setUser(null);
          setOnboardingCompleted(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
        window.clearTimeout(watchdog);
      }
    };

    init();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkOnboardingStatus(session.user.id);
      } else {
        setOnboardingCompleted(null);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
      subscription.unsubscribe();
    };
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
