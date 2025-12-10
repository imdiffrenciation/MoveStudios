import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Search, User, Settings, Menu } from 'lucide-react';
import MasonryGrid from '@/components/MasonryGrid';
import TrendingTags from '@/components/TrendingTags';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import MediaModal from '@/components/MediaModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useMedia } from '@/hooks/useMedia';
import type { MediaItem } from '@/types';

const Index = () => {
  const navigate = useNavigate();
  const { media: mediaItems, loading } = useMedia();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const handleUpload = () => {
    setIsUploadModalOpen(false);
  };

  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia(item);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? undefined : tag);
  };

  const filteredMedia = mediaItems.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = item.title.toLowerCase().includes(query) ||
                         item.creator.toLowerCase().includes(query) ||
                         (item.contentHash && item.contentHash.toLowerCase().includes(query));
    const matchesTag = !selectedTag || item.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - Clean & Minimal */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-3 md:px-6 py-2.5">
          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <Menu className="w-4 h-4" />
              </Button>
              <button 
                onClick={() => navigate('/app')}
                className="flex items-center"
              >
                <span className="text-sm font-pixel text-primary">MS</span>
              </button>
            </div>
            
            <div className="flex-1 max-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-8 text-sm bg-secondary/50 border-0 rounded-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/profile')}>
                <User className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <button 
                onClick={() => navigate('/app')}
                className="flex items-center hover:opacity-80 transition-opacity"
              >
                <span className="text-xl font-pixel text-primary">MoveStudios</span>
              </button>
            </div>
            
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-12 bg-secondary/50 border-0 rounded-full text-base"
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
                <User className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-3 md:px-6 py-4 flex gap-6">
        {/* Sidebar - Trending Tags - Hidden on mobile */}
        {showSidebar && (
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-20">
              <TrendingTags 
                onTagSelect={handleTagClick}
                selectedTag={selectedTag}
              />
            </div>
          </aside>
        )}

        {/* Feed */}
        <main className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
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
            </>
          )}
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
        onTagClick={handleTagClick}
        allMedia={mediaItems}
      />
    </div>
  );
};

export default Index;
