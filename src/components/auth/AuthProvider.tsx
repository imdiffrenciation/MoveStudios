import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  onboarding_completed: boolean | null;
}

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const navigate = useNavigate();

  const checkOnboardingStatus = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setOnboardingCompleted((data as UserProfile | null)?.onboarding_completed ?? false);
    } catch (error) {
      console.error("Error checking onboarding:", error);
      setOnboardingCompleted(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Never allow the app to stay stuck in an infinite "auth loading" state.
    const watchdog = window.setTimeout(() => {
      if (cancelled) return;
      console.warn("Auth init timeout: forcing loading=false");
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
        console.error("Error getting session:", error);
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;

      // Keep callback synchronous to avoid auth deadlocks.
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer any additional backend calls.
        window.setTimeout(() => {
          if (cancelled) return;
          void checkOnboardingStatus(session.user.id);
        }, 0);
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  }, [navigate]);

  const refreshOnboardingStatus = useCallback(() => {
    if (user) checkOnboardingStatus(user.id);
  }, [user, checkOnboardingStatus]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, onboardingCompleted, signOut, refreshOnboardingStatus }),
    [user, loading, onboardingCompleted, signOut, refreshOnboardingStatus]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};
