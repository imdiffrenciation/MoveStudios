import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Search, User, Settings, TrendingUp, Menu } from 'lucide-react';
import MasonryGrid from '@/components/MasonryGrid';
import TrendingTags from '@/components/TrendingTags';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import MediaModal from '@/components/MediaModal';
import type { MediaItem } from '@/types';

const SAMPLE_MEDIA: MediaItem[] = [
  {
    id: '1',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=400',
    title: 'Modern Architecture',
    creator: 'John Doe',
    tags: ['architecture', 'modern', 'design'],
    likes: 234,
    taps: 456
  },
  {
    id: '2',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    title: 'Nature Photography',
    creator: 'Jane Smith',
    tags: ['nature', 'photography', 'landscape'],
    likes: 456,
    taps: 789
  },
  {
    id: '3',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400',
    title: 'Digital Art',
    creator: 'Mike Johnson',
    tags: ['digitalart', 'abstract', 'creative'],
    likes: 789,
    taps: 1234
  },
  {
    id: '4',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
    title: 'Interior Design',
    creator: 'Sarah Lee',
    tags: ['design', 'interior', 'minimalist'],
    likes: 567,
    taps: 892
  },
  {
    id: '5',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    title: 'Food Photography',
    creator: 'Alex Chen',
    tags: ['food', 'photography', 'culinary'],
    likes: 345,
    taps: 678
  },
  {
    id: '6',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    title: 'Fashion Editorial',
    creator: 'Emma Wilson',
    tags: ['fashion', 'editorial', 'style'],
    likes: 891,
    taps: 1456
  }
];

const Index = () => {
  const navigate = useNavigate();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(SAMPLE_MEDIA);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const handleUpload = (uploadData: any) => {
    setMediaItems([uploadData, ...mediaItems]);
    setIsUploadModalOpen(false);
  };

  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia(item);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? undefined : tag);
  };

  const filteredMedia = mediaItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.creator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || item.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Movement</span>
            </button>
            
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-secondary border-border"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
                title="Toggle sidebar"
              >
                <Menu className="w-5 h-5" />
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
      <div className="container mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar - Trending Tags */}
        <aside className={`
          ${showSidebar ? 'block' : 'hidden'} 
          md:block w-64 flex-shrink-0
        `}>
          <div className="sticky top-24">
            <TrendingTags 
              onTagSelect={handleTagClick}
              selectedTag={selectedTag}
            />
          </div>
        </aside>

        {/* Feed */}
        <main className="flex-1 min-w-0">
          {selectedTag && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtering by:</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedTag(undefined)}
              >
                #{selectedTag} ×
              </Button>
            </div>
          )}
          <MasonryGrid 
            items={filteredMedia}
            onMediaClick={handleMediaClick}
            onTagClick={handleTagClick}
          />
        </main>
      </div>

      {/* Bottom Navigation */}
      <DockerNav onUploadClick={() => setIsUploadModalOpen(true)} />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      {/* Media Detail Modal */}
      <MediaModal
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
};

export default Index;
