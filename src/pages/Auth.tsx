import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import PrivyLogin from '@/components/PrivyLogin';
import { Button } from '@/components/ui/button';
import { Wallet, Sparkles } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { ready, authenticated } = usePrivy();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (ready && authenticated) {
      navigate('/');
    }
  }, [ready, authenticated, navigate]);

  const handleLoginSuccess = () => {
    navigate('/');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Movement</h1>
          <p className="text-muted-foreground">
            Connect your wallet to get started
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => setShowLogin(true)}
            className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Wallet className="w-5 h-5 mr-2" />
            Connect Wallet
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure login with email, Google, Twitter, GitHub, or Discord
          </p>
        </div>

        <PrivyLogin
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
          onSuccess={handleLoginSuccess}
        />
      </div>
    </div>
  );
};

export default Auth;
