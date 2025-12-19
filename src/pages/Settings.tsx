import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, User, Wallet, DollarSign, Award, Shield } from 'lucide-react';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import BadgePurchaseModal from '@/components/BadgePurchaseModal';
import CreatorBadge from '@/components/CreatorBadge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletSelectionModal } from '@/components/wallet/WalletSelectionModal';
import { WalletVerification } from '@/components/wallet/WalletVerification';
import { useBadge } from '@/hooks/useBadge';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const profileSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional().or(z.literal('')),
  avatarUrl: z.string().optional().or(z.literal('')),
});

type SettingsTab = 'profile' | 'tips' | 'badge' | 'admin';

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { connected, account } = useWallet();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [defaultTipAmount, setDefaultTipAmount] = useState<number>(1);
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  const [hasActiveBadge, setHasActiveBadge] = useState(false);
  const [badgeExpiresAt, setBadgeExpiresAt] = useState<Date | null>(null);
  const { getUserBadgeStatus, isAdmin, ADMIN_ADDRESS } = useBadge();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Check if connected wallet is admin
  const walletIsAdmin = connected && account && 
    account.address.toString().toLowerCase().replace('0x', '') === ADMIN_ADDRESS.toLowerCase().replace('0x', '');

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchBadgeStatus();
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
      setWalletAddress(data.wallet_address || '');
      setDefaultTipAmount(data.default_tip_amount || 1);
    }
  };

  const fetchBadgeStatus = async () => {
    if (!user) return;
    const status = await getUserBadgeStatus(user.id);
    setHasActiveBadge(status.hasBadge);
    setBadgeExpiresAt(status.expiresAt);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate inputs before saving
    const result = profileSchema.safeParse({ username, bio });
    if (!result.success) {
      const errorMessage = result.error.errors[0]?.message || 'Invalid input';
      toast({
        title: "Validation Error",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          username: result.data.username,
          bio: result.data.bio || '',
          wallet_address: walletAddress,
          default_tip_amount: defaultTipAmount,
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
    { id: 'badge' as const, label: 'Creator Badge', icon: Award },
    ...(walletIsAdmin ? [{ id: 'admin' as const, label: 'Admin Badges', icon: Shield }] : []),
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
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
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

                    {/* Default Tip Amount */}
                    <div className="pt-6 border-t border-border space-y-4">
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Default Tip Amount</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Set your default tip amount for quick tipping
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 5, 10, 25, 50, 100].map((amount) => (
                          <Button
                            key={amount}
                            variant={defaultTipAmount === amount ? "default" : "outline"}
                            className="h-12 rounded-xl font-semibold"
                            onClick={() => setDefaultTipAmount(amount)}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            {amount}
                          </Button>
                        ))}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Selected: {defaultTipAmount} $MOVE
                      </p>
                    </div>
                    
                    <p className="text-xs text-muted-foreground text-center pt-4">
                      Ensure the wallet provided is a Movement address to receive $MOVE tips
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'badge' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Creator Badge</h2>
                    <p className="text-muted-foreground">Get verified and boost your content visibility</p>
                  </div>

                  <div className="space-y-6">
                    {hasActiveBadge ? (
                      <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
                        <div className="flex items-center gap-4 mb-4">
                          <CreatorBadge size="lg" showTooltip={false} />
                          <div>
                            <h3 className="font-semibold text-foreground">You're Verified!</h3>
                            <p className="text-sm text-muted-foreground">
                              Your content gets boosted in the feed
                            </p>
                          </div>
                        </div>
                        {badgeExpiresAt && (
                          <p className="text-sm text-muted-foreground">
                            Expires: {badgeExpiresAt.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl bg-muted/50 border border-border text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                          <Award className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-semibold text-foreground mb-2">Get Your Creator Badge</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          Stand out from the crowd! Verified creators get boosted visibility in the feed and a special badge on their profile.
                        </p>
                        <Button 
                          className="rounded-xl h-12"
                          onClick={() => setIsBadgeModalOpen(true)}
                        >
                          <Award className="w-4 h-4 mr-2" />
                          Get Badge
                        </Button>
                      </div>
                    )}

                    <div className="pt-6 border-t border-border">
                      <h4 className="font-medium text-foreground mb-3">Badge Benefits</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Boosted content visibility in the feed
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Verified creator badge on your profile
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Priority in recommendations
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Valid for 1 month
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'admin' && walletIsAdmin && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2">Admin Badges</h2>
                    <p className="text-muted-foreground">Manage badge settings and give badges to users</p>
                  </div>

                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Admin Access Granted</p>
                      <p className="text-sm text-muted-foreground">You have full badge management permissions</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Button 
                      onClick={() => navigate('/admin/badges')}
                      className="w-full rounded-xl h-12"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Open Full Admin Panel
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Access init badge, give badges, and change badge prices
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

      <BadgePurchaseModal
        isOpen={isBadgeModalOpen}
        onClose={() => setIsBadgeModalOpen(false)}
        onSuccess={() => {
          fetchBadgeStatus();
          setIsBadgeModalOpen(false);
        }}
      />
    </div>
  );
};

export default Settings;
