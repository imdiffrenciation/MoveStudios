import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Search, User, Settings, Menu, X } from 'lucide-react';
import MasonryGrid from '@/components/MasonryGrid';
import TrendingTags from '@/components/TrendingTags';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import MediaModal from '@/components/MediaModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMedia } from '@/hooks/useMedia';
import { useRecommendation } from '@/hooks/useRecommendation';
import { useAuth } from '@/hooks/useAuth';
import type { MediaItem } from '@/types';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { media: mediaItems, loading, loadingMore, hasMore, loadMore, trackView } = useMedia();
  const { userPreferences } = useRecommendation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMobileTags, setShowMobileTags] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  const handleUpload = () => {
    setIsUploadModalOpen(false);
  };

  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia(item);
    // Track view for recommendation algorithm
    if (user) {
      trackView(item.id);
    }
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

  // Show personalization indicator if user has preferences
  const hasPreferences = userPreferences.size > 0;

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !searchQuery && !selectedTag) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(currentRef);

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore, searchQuery, selectedTag]);

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
                onClick={() => setShowMobileTags(true)}
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
              {/* Personalization indicator */}
              {hasPreferences && user && (
                <div className="flex items-center text-xs text-primary/70 bg-primary/10 px-2 py-1 rounded-full">
                  <span>For You</span>
                </div>
              )}
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
              
              {/* Infinite scroll trigger - always rendered with min height for observer */}
              <div 
                ref={loadMoreRef} 
                className="flex justify-center py-8 min-h-[100px]"
                style={{ visibility: hasMore && !searchQuery && !selectedTag ? 'visible' : 'hidden' }}
              >
                {loadingMore && (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Mobile Trending Tags Sheet */}
      <Sheet open={showMobileTags} onOpenChange={setShowMobileTags}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle>Trending Tags</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <TrendingTags 
              onTagSelect={(tag) => {
                handleTagClick(tag);
                setShowMobileTags(false);
              }}
              selectedTag={selectedTag}
            />
          </div>
        </SheetContent>
      </Sheet>

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
