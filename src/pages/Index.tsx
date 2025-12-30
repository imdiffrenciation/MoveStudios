import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Settings, Menu, LayoutGrid, Play } from 'lucide-react';
import MasonryGrid, { MasonryGridSkeleton } from '@/components/MasonryGrid';
import TikTokView from '@/components/TikTokView';
import TrendingTags from '@/components/TrendingTags';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import MediaModal from '@/components/MediaModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMedia } from '@/hooks/useMedia';
import { useAuth } from '@/hooks/useAuth';
import { useRecommendation } from '@/hooks/useRecommendation';
import { useViewMode } from '@/hooks/useViewMode';
import type { MediaItem } from '@/types';
import { cn } from '@/lib/utils';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { media: mediaItems, loading, trackView, loadMore, hasMore } = useMedia();
  const { getRecommendedPosts, userPreferences } = useRecommendation();
  const { viewMode, toggleViewMode, isGridView, isTikTokView } = useViewMode();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMobileTags, setShowMobileTags] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [tiktokIndex, setTiktokIndex] = useState(0);
  const [personalizedMedia, setPersonalizedMedia] = useState<MediaItem[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get personalized feed when media changes
  useEffect(() => {
    const getPersonalized = async () => {
      if (mediaItems.length > 0 && user) {
        const recommended = await getRecommendedPosts(mediaItems as any);
        setPersonalizedMedia(recommended as unknown as MediaItem[]);
      } else {
        setPersonalizedMedia(mediaItems);
      }
    };
    getPersonalized();
  }, [mediaItems, user, userPreferences]);

  // Memoize filtered media to prevent unnecessary recalculations
  const filteredMedia = useMemo(() => {
    const sourceMedia = personalizedMedia.length > 0 ? personalizedMedia : mediaItems;
    
    if (!searchQuery && !selectedTag) return sourceMedia;
    
    const query = searchQuery.toLowerCase();
    return sourceMedia.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(query) ||
        item.creator.toLowerCase().includes(query);
      const matchesTag = !selectedTag || item.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [personalizedMedia, mediaItems, searchQuery, selectedTag]);

  const handleUpload = useCallback(() => {
    setIsUploadModalOpen(false);
  }, []);

  const handleMediaClick = useCallback((item: MediaItem) => {
    setSelectedMedia(item);
    if (user) {
      trackView(item.id);
    }
  }, [user, trackView]);

  const handleTagClick = useCallback((tag: string) => {
    setSelectedTag(prev => prev === tag ? undefined : tag);
  }, []);

  const handleCommentClick = useCallback((item: MediaItem) => {
    setSelectedMedia(item);
  }, []);

  const handleShareClick = useCallback(async (item: MediaItem) => {
    try {
      await navigator.share({
        title: item.title,
        text: `Check out ${item.title} on MoveStudios`,
        url: window.location.origin + `/app?media=${item.id}`,
      });
    } catch {
      // Fallback - copy to clipboard
      await navigator.clipboard.writeText(window.location.origin + `/app?media=${item.id}`);
    }
  }, []);

  // Double tap home handler for mobile view toggle
  useEffect(() => {
    let lastTapTime = 0;
    
    const handleDoubleTap = (e: TouchEvent) => {
      const currentTime = Date.now();
      const tapLength = currentTime - lastTapTime;
      
      // Only trigger on the main content area, not on buttons
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('a')) return;
      
      if (tapLength < 300 && tapLength > 0) {
        toggleViewMode();
        e.preventDefault();
      }
      lastTapTime = currentTime;
    };

    document.addEventListener('touchend', handleDoubleTap, { passive: false });
    return () => document.removeEventListener('touchend', handleDoubleTap);
  }, [toggleViewMode]);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading || isTikTokView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadMore, isTikTokView]);

  // TikTok view - full screen
  if (isTikTokView) {
    return (
      <div className="h-screen bg-black relative">
        {/* Floating header */}
        <header className="absolute top-0 left-0 right-0 z-50 p-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-white bg-black/20 backdrop-blur-sm"
            onClick={() => setShowMobileTags(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <span className="text-lg font-pixel text-white">MoveStudios</span>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white bg-black/20 backdrop-blur-sm"
              onClick={toggleViewMode}
            >
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white bg-black/20 backdrop-blur-sm"
              onClick={() => navigate('/profile')}
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <TikTokView
          items={filteredMedia}
          currentIndex={tiktokIndex}
          onIndexChange={setTiktokIndex}
          onCommentClick={handleCommentClick}
          onShareClick={handleShareClick}
        />

        {/* Mobile Tags Sheet */}
        <Sheet open={showMobileTags} onOpenChange={setShowMobileTags}>
          <SheetContent side="left" className="w-72 p-0 bg-background/95 backdrop-blur-xl">
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

        {/* Media Modal */}
        <MediaModal
          media={selectedMedia}
          isOpen={!!selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onTagClick={handleTagClick}
          allMedia={mediaItems}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
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
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={toggleViewMode}
              >
                <Play className="w-4 h-4" />
              </Button>
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
              {/* View Mode Toggle */}
              <div className="flex items-center bg-secondary rounded-full p-1 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full transition-colors",
                    isGridView && "bg-background shadow-sm"
                  )}
                  onClick={() => isGridView || toggleViewMode()}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full transition-colors",
                    isTikTokView && "bg-background shadow-sm"
                  )}
                  onClick={() => isTikTokView || toggleViewMode()}
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
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
        {/* Sidebar */}
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
          {loading && mediaItems.length === 0 ? (
            <MasonryGridSkeleton count={12} />
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
              
              {/* Load more trigger */}
              {hasMore && (
                <div ref={loadMoreRef} className="py-8 flex justify-center">
                  {loading && <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                </div>
              )}
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
