import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Settings, Grid, Heart, Bookmark } from 'lucide-react';
import MasonryGrid from '@/components/MasonryGrid';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import { useAuth } from '@/hooks/useAuth';
import { useFollows } from '@/hooks/useFollows';
import { supabase } from '@/integrations/supabase/client';
import type { MediaItem } from '@/types';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { followersCount, followingCount } = useFollows(user?.id);
  const [activeTab, setActiveTab] = useState('created');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [userMedia, setUserMedia] = useState<MediaItem[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserMedia();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const fetchUserMedia = async () => {
    if (!user) return;

    const { data } = await (supabase as any)
      .from('media')
      .select(`
        *,
        profiles!media_user_id_fkey(username, avatar_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const mapped = data.map((item: any) => ({
        id: item.id,
        type: item.type,
        url: item.url,
        title: item.title,
        creator: item.profiles?.username || 'Anonymous',
        tags: item.tags || [],
        likes: item.likes_count || 0,
        taps: item.views_count || 0,
      }));
      setUserMedia(mapped);
    }
  };

  const handleUpload = () => {
    fetchUserMedia(); // Refresh the media list after upload
    setIsUploadModalOpen(false);
  };

  const handleMediaClick = (item: MediaItem) => {
    console.log('Media clicked:', item);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24 ring-4 ring-primary">
              <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
              <AvatarFallback>{profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{profile?.username || 'Loading...'}</h1>
                  <p className="text-muted-foreground">@{profile?.username || 'user'}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/settings')}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Edit Profile
                </Button>
              </div>

              <div className="flex gap-6 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{userMedia.length}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{followersCount}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{followingCount}</div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </div>
              </div>

              <p className="text-foreground">
                {profile?.bio || 'No bio yet'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="created" className="gap-2">
              <Grid className="w-4 h-4" />
              Created
            </TabsTrigger>
            <TabsTrigger value="liked" className="gap-2">
              <Heart className="w-4 h-4" />
              Liked
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="w-4 h-4" />
              Saved
            </TabsTrigger>
          </TabsList>

          <TabsContent value="created">
            {userMedia.length > 0 ? (
              <MasonryGrid 
                items={userMedia}
                onMediaClick={handleMediaClick}
              />
            ) : (
              <Card className="p-12 text-center border-dashed">
                <Grid className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">Start creating and sharing your content</p>
                <Button onClick={() => setIsUploadModalOpen(true)}>
                  Create Your First Post
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="liked">
            <Card className="p-12 text-center border-dashed">
              <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No liked posts</h3>
              <p className="text-muted-foreground">Start exploring and liking content you love</p>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card className="p-12 text-center border-dashed">
              <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No saved posts</h3>
              <p className="text-muted-foreground">Save posts to view them later</p>
            </Card>
          </TabsContent>
        </Tabs>
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

export default Profile;
