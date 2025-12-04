import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, Wallet } from 'lucide-react';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletSelectionModal } from '@/components/wallet/WalletSelectionModal';
import { WalletVerification } from '@/components/wallet/WalletVerification';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'tips';

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
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

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

  const handleWalletVerified = async (address: string) => {
    if (!user) return;
    
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ wallet_address: address })
        .eq('id', user.id);

      if (error) throw error;

      setWalletAddress(address);
      setShowWalletConnect(false);
      toast({
        title: "Wallet Connected",
        description: "Your wallet has been verified and saved to your profile.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save wallet address: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpload = () => {
    setIsUploadModalOpen(false);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile Settings', icon: User },
    { id: 'tips' as const, label: 'Tips', icon: Wallet },
  ];

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
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      {/* Two Column Layout */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Sidebar - Navigation */}
          <nav className="md:w-64 shrink-0">
            <div className="bg-card rounded-2xl border border-border p-2 md:sticky md:top-24">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Right Content Area */}
          <main className="flex-1 min-w-0">
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
              {activeTab === 'profile' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Profile Settings</h2>
                    <p className="text-muted-foreground">Manage your account settings and preferences</p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                      <Input 
                        id="username" 
                        placeholder="Your username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="rounded-xl h-12 bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={user?.email || ''} 
                        disabled 
                        className="rounded-xl h-12 bg-muted border-border opacity-60"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avatarUrl" className="text-sm font-medium">Avatar URL</Label>
                      <Input 
                        id="avatarUrl" 
                        placeholder="https://example.com/avatar.jpg" 
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="rounded-xl h-12 bg-background border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                      <Textarea 
                        id="bio" 
                        placeholder="Tell us about yourself"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        className="rounded-xl bg-background border-border resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                    <Button 
                      onClick={handleSave} 
                      disabled={loading}
                      className="rounded-xl h-12 flex-1"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => signOut()}
                      className="rounded-xl h-12 sm:w-auto"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'tips' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Tips Settings</h2>
                    <p className="text-muted-foreground">Connect your Movement wallet to receive $MOVE tips from your supporters</p>
                  </div>

                  <div className="space-y-6">
                    {walletAddress ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Wallet className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Wallet Connected</p>
                              <p className="text-xs text-muted-foreground">Ready to receive tips</p>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-background border border-border">
                            <p className="font-mono text-xs break-all text-muted-foreground">
                              {walletAddress}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full rounded-xl h-12"
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
                          <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                            <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-4">
                              Select a wallet to connect to Movement Network
                            </p>
                            <WalletSelectionModal onConnected={() => {}}>
                              <Button className="rounded-xl h-12">
                                <Wallet className="w-4 h-4 mr-2" />
                                Select Wallet
                              </Button>
                            </WalletSelectionModal>
                          </div>
                          <Button 
                            variant="ghost" 
                            className="w-full rounded-xl h-12"
                            onClick={() => setShowWalletConnect(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="space-y-4">
                        <div className="p-6 rounded-xl bg-muted/50 border border-border text-center">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <Wallet className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="font-semibold text-foreground mb-2">Connect Your Wallet</h3>
                          <p className="text-sm text-muted-foreground mb-6">
                            Connect and verify your wallet to start receiving tips. You'll need to sign a message to prove ownership.
                          </p>
                          <Button 
                            className="rounded-xl h-12"
                            onClick={() => setShowWalletConnect(true)}
                          >
                            <Wallet className="w-4 h-4 mr-2" />
                            Connect Wallet to Receive Tips
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Ensure the wallet provided is a Movement address to receive $MOVE tips
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
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
