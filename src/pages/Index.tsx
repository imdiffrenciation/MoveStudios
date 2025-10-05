import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PinCard from '@/components/PinCard';
import CreatePinModal from '@/components/CreatePinModal';
import { Plus, Search, User, Settings } from 'lucide-react';

interface Pin {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  creatorName: string;
  creatorAvatar: string;
  likes: number;
  saves: number;
}

const SAMPLE_PINS: Pin[] = [
  {
    id: '1',
    title: 'Modern Architecture',
    description: 'Beautiful contemporary building design',
    imageUrl: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=400',
    creatorName: 'John Doe',
    creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    likes: 234,
    saves: 89
  },
  {
    id: '2',
    title: 'Nature Photography',
    description: 'Stunning mountain landscape',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    creatorName: 'Jane Smith',
    creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane',
    likes: 456,
    saves: 123
  },
  {
    id: '3',
    title: 'Digital Art',
    description: 'Abstract digital illustration',
    imageUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400',
    creatorName: 'Mike Johnson',
    creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    likes: 789,
    saves: 234
  },
  {
    id: '4',
    title: 'Interior Design',
    description: 'Minimalist living room setup',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
    creatorName: 'Sarah Lee',
    creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    likes: 567,
    saves: 178
  },
  {
    id: '5',
    title: 'Food Photography',
    description: 'Gourmet dish presentation',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    creatorName: 'Alex Chen',
    creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    likes: 345,
    saves: 92
  },
  {
    id: '6',
    title: 'Fashion Editorial',
    description: 'Street style photography',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    creatorName: 'Emma Wilson',
    creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    likes: 891,
    saves: 267
  }
];

const Index = () => {
  const navigate = useNavigate();
  const [pins, setPins] = useState<Pin[]>(SAMPLE_PINS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreatePin = (newPin: { title: string; description: string; imageUrl: string }) => {
    const pin: Pin = {
      id: Date.now().toString(),
      ...newPin,
      creatorName: 'You',
      creatorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
      likes: 0,
      saves: 0
    };
    setPins([pin, ...pins]);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-primary">Movement</h1>
            
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search pins..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary border-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/profile')}
              >
                <User className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="masonry-grid">
          {pins
            .filter(pin => 
              pin.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              pin.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map(pin => (
              <div key={pin.id} className="masonry-item">
                <PinCard pin={pin} />
              </div>
            ))}
        </div>
      </main>

      {/* Create Pin Modal */}
      <CreatePinModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePin}
      />
    </div>
  );
};

export default Index;
