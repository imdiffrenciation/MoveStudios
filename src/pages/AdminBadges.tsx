import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BadgeCheck, Gift, DollarSign, Settings, Users, Wallet } from 'lucide-react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useBadge } from '@/hooks/useBadge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WalletSelectionModal } from '@/components/wallet/WalletSelectionModal';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';

const AdminBadges = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { connected, account } = useWallet();
  const { 
    isAdmin, 
    initBadgeAmount, 
    giveBadge, 
    changeBadgeAmount, 
    getBadgeAmount,
    getBadgeAmountInMove,
    getExplorerUrl,
    loading,
    ADMIN_ADDRESS,
    OCTAS_PER_MOVE
  } = useBadge();
  const { toast } = useToast();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [badgedUsers, setBadgedUsers] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load current badge price
    const price = await getBadgeAmountInMove();
    setCurrentPrice(price);

    // Load badged users
    const { data } = await (supabase as any)
      .from('badges')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) {
      setBadgedUsers(data);
    }
  };

  const handleInitialize = async () => {
    const result = await initBadgeAmount();
    if (result.success) {
      setIsInitialized(true);
      toast({
        title: "Initialized",
        description: "Badge amount resource initialized on-chain.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to initialize",
        variant: "destructive",
      });
    }
  };

  const handleGiveBadge = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }

    const result = await giveBadge(username.trim());
    if (result.success) {
      toast({
        title: "Badge Given!",
        description: `Badge given to ${username}`,
      });
      setUsername('');
      loadData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to give badge",
        variant: "destructive",
      });
    }
  };

  const handleChangePrice = async () => {
    const priceInMove = parseFloat(newPrice);
    if (isNaN(priceInMove) || priceInMove <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    const priceInOctas = Math.floor(priceInMove * OCTAS_PER_MOVE);
    const result = await changeBadgeAmount(priceInOctas);
    
    if (result.success) {
      toast({
        title: "Price Updated",
        description: `Badge price changed to ${priceInMove} $MOVE`,
      });
      setNewPrice('');
      setCurrentPrice(priceInMove);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to change price",
        variant: "destructive",
      });
    }
  };

  // Check if wallet is admin - normalize addresses by removing 0x prefix
  const connectedAddr = account?.address?.toString().toLowerCase().replace('0x', '') || '';
  const adminAddr = ADMIN_ADDRESS.toLowerCase().replace('0x', '');
  const walletIsAdmin = connected && account && connectedAddr === adminAddr;
  
  console.log('AdminBadges check:', { connected, connectedAddr, adminAddr, walletIsAdmin });

  if (!walletIsAdmin) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/app')}
                className="rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-foreground">Admin - Badges</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12 max-w-lg">
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle>Admin Access Required</CardTitle>
              <CardDescription>
                Connect the admin wallet to access this page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!connected ? (
                <WalletSelectionModal onConnected={() => {}}>
                  <Button className="w-full h-12 rounded-xl">
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                </WalletSelectionModal>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
                    <p className="font-mono text-xs break-all text-foreground">
                      {account?.address?.toString()}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive text-center">
                      This wallet is not authorized for admin access
                    </p>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-center text-muted-foreground">
                Admin wallet: {ADMIN_ADDRESS.slice(0, 10)}...{ADMIN_ADDRESS.slice(-8)}
              </p>
            </CardContent>
          </Card>
        </div>

        <DockerNav onUploadClick={() => setIsUploadModalOpen(true)} />
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={() => setIsUploadModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Admin - Badges</h1>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Admin Connected</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Initialize Badge Amount */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Initialize Contract
              </CardTitle>
              <CardDescription>
                One-time setup to initialize the badge amount resource on-chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleInitialize} 
                disabled={loading}
                variant="outline"
                className="w-full h-12 rounded-xl"
              >
                {loading ? 'Processing...' : 'Initialize Badge Amount'}
              </Button>
            </CardContent>
          </Card>

          {/* Current Price */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Current Badge Price
              </CardTitle>
              <CardDescription>
                The amount users pay for a badge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                <p className="text-3xl font-bold text-foreground">
                  {currentPrice.toFixed(4)} $MOVE
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Give Badge */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Give Free Badge
              </CardTitle>
              <CardDescription>
                Award a free badge to a user by their username
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <Button 
                onClick={handleGiveBadge} 
                disabled={loading || !username.trim()}
                className="w-full h-12 rounded-xl"
              >
                {loading ? 'Processing...' : 'Give Badge'}
              </Button>
            </CardContent>
          </Card>

          {/* Change Price */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Change Badge Price
              </CardTitle>
              <CardDescription>
                Update the price for purchasing a badge
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPrice">New Price ($MOVE)</Label>
                <Input
                  id="newPrice"
                  type="number"
                  step="0.0001"
                  placeholder="e.g. 0.005"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              <Button 
                onClick={handleChangePrice} 
                disabled={loading || !newPrice}
                className="w-full h-12 rounded-xl"
              >
                {loading ? 'Processing...' : 'Update Price'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Badged Users */}
        <Card className="border-border mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Badged Users ({badgedUsers.length})
            </CardTitle>
            <CardDescription>
              Users with currently active creator badges
            </CardDescription>
          </CardHeader>
          <CardContent>
            {badgedUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No users have active badges yet
              </p>
            ) : (
              <div className="space-y-3">
                {badgedUsers.map((badge) => (
                  <div 
                    key={badge.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <BadgeCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {badge.profiles?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(badge.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground capitalize">
                        {badge.source}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DockerNav onUploadClick={() => setIsUploadModalOpen(true)} />
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
};

export default AdminBadges;
