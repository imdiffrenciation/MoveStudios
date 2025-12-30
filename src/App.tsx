import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/hooks/useTheme";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import AdminBadges from "./pages/AdminBadges";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import "./App.css";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, onboardingCompleted } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const OnboardingRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, onboardingCompleted } = useAuth();

  // Wait for auth to resolve.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If signed out, go to auth immediately (do not get stuck waiting for onboardingCompleted).
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If signed in but profile/onboarding status is still loading, show spinner.
  if (onboardingCompleted === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to onboarding if not completed
  if (onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app"
                  element={
                    <OnboardingRoute>
                      <Index />
                    </OnboardingRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <OnboardingRoute>
                      <Profile />
                    </OnboardingRoute>
                  }
                />
                <Route
                  path="/profile/:userId"
                  element={
                    <OnboardingRoute>
                      <Profile />
                    </OnboardingRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <OnboardingRoute>
                      <Settings />
                    </OnboardingRoute>
                  }
                />
                <Route
                  path="/admin/badges"
                  element={
                    <ProtectedRoute>
                      <AdminBadges />
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </WalletProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
