import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import moveStudiosLogo from '@/assets/movestudios-logo.jpg';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username must be less than 20 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional().or(z.literal('')),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check for password recovery session on mount
  useEffect(() => {
    const checkRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL hash for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'recovery' || (session && window.location.hash.includes('type=recovery'))) {
        setShowResetPassword(true);
      }
    };
    
    checkRecoverySession();

    // Listen for auth state changes to detect recovery flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setShowResetPassword(false);
      setPassword('');
      setConfirmPassword('');
      navigate('/app');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate inputs based on login or signup mode
      if (isLogin) {
        const result = loginSchema.safeParse({ email, password });
        if (!result.success) {
          const errorMessage = result.error.errors[0]?.message || 'Invalid input';
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        });
        if (error) throw error;
        toast.success('Logged in successfully!');
        navigate('/app');
      } else {
        const result = signupSchema.safeParse({ email, password, username });
        if (!result.success) {
          const errorMessage = result.error.errors[0]?.message || 'Invalid input';
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: result.data.email,
          password: result.data.password,
          options: {
            data: {
              username: result.data.username || result.data.email.split('@')[0],
            },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        toast.success('Account created successfully!');
        navigate('/app');
      }
    } catch (error: any) {
      // Better error messages
      if (error.message === 'Invalid login credentials') {
        toast.error('Invalid email or password. Try resetting your password if you forgot it.');
      } else if (error.message.includes('User already registered')) {
        toast.error('This email is already registered. Try signing in instead.');
        setIsLogin(true);
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  // Show new password form when in recovery mode
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img 
            src={moveStudiosLogo} 
            alt="" 
            className="w-[500px] sm:w-[600px] md:w-[700px] opacity-[0.06] dark:opacity-[0.08]"
          />
        </div>
        
        <Card className="w-full max-w-sm sm:max-w-md relative z-10 border-primary/20 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 flex flex-col items-center pb-4">
            <div className="w-full max-w-[180px] mb-2">
              <img 
                src={moveStudiosLogo} 
                alt="MoveStudios" 
                className="w-full h-auto rounded-md"
              />
            </div>
            <CardTitle className="text-xl">Set New Password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 bg-background border-border focus:border-primary focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 bg-background border-border focus:border-primary focus:ring-primary"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" 
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img 
            src={moveStudiosLogo} 
            alt="" 
            className="w-[500px] sm:w-[600px] md:w-[700px] opacity-[0.06] dark:opacity-[0.08]"
          />
        </div>
        
        <Card className="w-full max-w-sm sm:max-w-md relative z-10 border-primary/20 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 flex flex-col items-center pb-4">
            <div className="w-full max-w-[180px] mb-2">
              <img 
                src={moveStudiosLogo} 
                alt="MoveStudios" 
                className="w-full h-auto rounded-md"
              />
            </div>
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-background border-border focus:border-primary focus:ring-primary"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" 
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </form>
            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Back to login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 relative overflow-hidden">
      {/* Single enlarged dimmed background logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img 
          src={moveStudiosLogo} 
          alt="" 
          className="w-[500px] sm:w-[600px] md:w-[700px] opacity-[0.06] dark:opacity-[0.08]"
        />
      </div>
      
      <Card className="w-full max-w-sm sm:max-w-md relative z-10 border-primary/20 bg-card/95 backdrop-blur-sm">
        <CardHeader className="space-y-1 flex flex-col items-center pb-4">
          {/* Logo */}
          <div className="w-full max-w-[180px] mb-2">
            <img 
              src={moveStudiosLogo} 
              alt="MoveStudios" 
              className="w-full h-auto rounded-md"
            />
          </div>
          <CardDescription className="text-center">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-3 border-border hover:bg-secondary hover:border-primary/50 transition-all"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-background border-border focus:border-primary focus:ring-primary"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background border-border focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 bg-background border-border focus:border-primary focus:ring-primary"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold" 
              disabled={loading}
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
          
          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          )}
          
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
