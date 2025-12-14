import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Wallet, Upload, Coins, Shield, Zap, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import moveStudiosLogo from '@/assets/movestudios-logo.jpg';
import { useAuth } from '@/hooks/useAuth';

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleGetStarted = () => {
    navigate('/auth');
  };

  // Redirect authenticated users to the app
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 dark">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img src={moveStudiosLogo} alt="Move Studios" className="w-10 h-10 rounded-lg" />
              <span className="text-xl font-bold">Move Studios</span>
            </div>
            <Button onClick={handleGetStarted} className="font-semibold">
              Launch App
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
            <span className="text-sm font-medium">Web3-Powered Creator Platform</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Create. Own.
            <span className="block text-primary">Get Paid.</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            The platform where creators truly own their content and earn instantly. 
            No gatekeepers. No requirements. Just your work and your wallet.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-6 font-semibold">
              Start Creating
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={handleGetStarted} className="text-lg px-8 py-6 border-2">
              Explore Content
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-primary">0%</div>
              <div className="text-sm text-muted-foreground mt-1">Platform Fee</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-primary">Instant</div>
              <div className="text-sm text-muted-foreground mt-1">Tip Payouts</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-primary">On-Chain</div>
              <div className="text-sm text-muted-foreground mt-1">Ownership</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Three simple steps to start earning from your creativity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wallet,
                step: '01',
                title: 'Connect Wallet',
                description: 'Link your Movement wallet in seconds. That\'s all you need to start receiving tips.',
              },
              {
                icon: Upload,
                step: '02',
                title: 'Upload Content',
                description: 'Share your images, videos, and creations. Each upload is automatically secured on-chain.',
              },
              {
                icon: Coins,
                step: '03',
                title: 'Receive Tips',
                description: 'Fans can tip you directly in $MOVE. Funds go straight to your wallet—no middleman.',
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 h-full transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-5xl font-bold text-muted/20">{item.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Ownership Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Content Protection</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Your Content. Your Proof.
                <span className="block text-primary">Forever On-Chain.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Every piece of content you upload generates a unique cryptographic hash 
                stored on the Movement blockchain under your wallet address. This creates 
                an immutable timestamp proving you created it first.
              </p>
              <ul className="space-y-4">
                {[
                  'SHA-256 hash generated for every upload',
                  'Stored permanently on Movement blockchain',
                  'Linked directly to your wallet address',
                  'Verifiable proof of original creation',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl p-8 border border-primary/20">
                <div className="bg-zinc-900 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">Content Protected</div>
                      <div className="text-sm text-muted-foreground">Hash stored on-chain</div>
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4 font-mono text-xs break-all text-zinc-300">
                    0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    Transaction confirmed • Block #2,847,291
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tipping System */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                <div className="text-center mb-8">
                  <div className="text-sm text-muted-foreground mb-2">Send a tip to</div>
                  <div className="font-semibold text-lg">@creator</div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[1, 5, 10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      className={`py-3 px-4 rounded-xl border-2 font-semibold transition-all ${
                        amount === 10
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-zinc-700 hover:border-primary/50'
                      }`}
                    >
                      {amount} MOVE
                    </button>
                  ))}
                </div>
                <Button className="w-full py-6 text-lg font-semibold">
                  <Coins className="w-5 h-5 mr-2" />
                  Send Tip
                </Button>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-6">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-medium">Instant Tipping</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Get Tipped.
                <span className="block text-primary">Instantly.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                No follower requirements. No approval process. No waiting period. 
                Just connect your wallet and you're ready to receive tips from fans 
                who love your work.
              </p>
              <ul className="space-y-4">
                {[
                  'Zero platform fees on tips',
                  'Direct wallet-to-wallet transfers',
                  'Multiple tip amount options',
                  'No minimum follower requirements',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for Creators</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Everything you need to share your work and build your audience
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: 'Zero Requirements',
                description: 'No follower count, no verification, no approval process. Just sign up and start.',
              },
              {
                icon: Shield,
                title: 'True Ownership',
                description: 'Your content hash lives on-chain forever, proving you created it first.',
              },
              {
                icon: Coins,
                title: 'Instant Earnings',
                description: 'Tips go directly to your wallet. No delays, no minimums, no platform cuts.',
              },
              {
                icon: Users,
                title: 'Community First',
                description: 'Follow creators, like content, and engage with a community that values originality.',
              },
              {
                icon: Wallet,
                title: 'Web3 Native',
                description: 'Built on Movement blockchain for fast, secure, and decentralized transactions.',
              },
              {
                icon: Upload,
                title: 'Easy Uploads',
                description: 'Share images and videos in seconds. Your content, your rules.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl p-12 border border-primary/20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Own Your Content?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join Move Studios today and start earning from your creativity. 
              No gatekeepers. No waiting. Just you and your audience.
            </p>
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-10 py-6 font-semibold">
              Launch App
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={moveStudiosLogo} alt="Move Studios" className="w-8 h-8 rounded-lg" />
              <span className="font-bold">Move Studios</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Built on Movement Network
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Move Studios. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
