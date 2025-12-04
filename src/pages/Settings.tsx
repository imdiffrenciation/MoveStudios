import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Wallet } from 'lucide-react';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletSelectionModal } from '@/components/wallet/WalletSelectionModal';
import { WalletVerification } from '@/components/wallet/WalletVerification';

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { connected, account } = useWallet();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setUsername(data.username || '');
      setBio(data.bio || '');
      setAvatarUrl(data.avatar_url || '');
      setWalletAddress(data.wallet_address || '');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          wallet_address: walletAddress,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      navigate('/profile');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWalletVerified = (address: string) => {
    setWalletAddress(address);
    setShowWalletConnect(false);
    toast({
      title: "Wallet Connected",
      description: "Your wallet has been verified and linked to your profile.",
    });
  };

  const handleUpload = () => {
    setIsUploadModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/profile')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Edit Profile</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Manage your account settings and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                placeholder="Your username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={user?.email || ''} 
                disabled 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input 
                id="avatarUrl" 
                placeholder="https://example.com/avatar.jpg" 
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                placeholder="Tell us about yourself"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>

            <Button variant="outline" className="w-full" onClick={() => signOut()}>
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Wallet Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Wallet for Tips
            </CardTitle>
            <CardDescription>
              Connect your Movement wallet to receive $MOVE tips from your supporters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {walletAddress ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs font-medium mb-1">Connected Wallet:</p>
                  <p className="font-mono text-xs break-all opacity-75">
                    {walletAddress}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setWalletAddress('');
                    setShowWalletConnect(true);
                  }}
                >
                  Change Wallet
                </Button>
              </div>
            ) : showWalletConnect ? (
              connected && account ? (
                <WalletVerification onVerified={handleWalletVerified} />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select a wallet to connect to Movement Network
                  </p>
                  <WalletSelectionModal onConnected={() => {}}>
                    <Button className="w-full">
                      <Wallet className="w-4 h-4 mr-2" />
                      Select Wallet
                    </Button>
                  </WalletSelectionModal>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => setShowWalletConnect(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect and verify your wallet to start receiving tips. You'll need to sign a message to prove ownership.
                </p>
                <Button 
                  className="w-full"
                  onClick={() => setShowWalletConnect(true)}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet to Receive Tips
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Ensure the wallet provided is a Movement address to receive $MOVE tips
            </p>
          </CardContent>
        </Card>
      </div>

      <DockerNav onUploadClick={() => setIsUploadModalOpen(true)} />

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
};

export default Settings;
