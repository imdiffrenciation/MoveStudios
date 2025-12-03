import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Settings, Grid, Heart, Bookmark, DollarSign, ArrowLeft } from 'lucide-react';
import MasonryGrid from '@/components/MasonryGrid';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import MediaModal from '@/components/MediaModal';
import { useAuth } from '@/hooks/useAuth';
import { useFollows } from '@/hooks/useFollows';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MediaItem } from '@/types';

const Profile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAuth();
  const profileUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;
  
  const { followersCount, followingCount, isFollowing: checkIsFollowing, followUser, unfollowUser } = useFollows(profileUserId);
  const [activeTab, setActiveTab] = useState('created');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [userMedia, setUserMedia] = useState<MediaItem[]>([]);
  const [likedMedia, setLikedMedia] = useState<MediaItem[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [tipsSent] = useState(0);
  const [tipsReceived] = useState(0);

  useEffect(() => {
    if (profileUserId) {
      fetchProfile();
      fetchUserMedia();
      fetchLikedMedia();
      if (!isOwnProfile && user) {
        checkFollowStatus();
      }
    }
  }, [profileUserId, user]);

  const checkFollowStatus = async () => {
    if (!user || !profileUserId) return;
    const following = await checkIsFollowing(profileUserId, user.id);
    setIsFollowingUser(following);
  };

  const fetchProfile = async () => {
    if (!profileUserId) return;

    const { data } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', profileUserId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const fetchUserMedia = async () => {
    if (!profileUserId) return;

    const { data } = await (supabase as any)
      .from('media')
      .select(`
        *,
        profiles!media_user_id_fkey(username, avatar_url)
      `)
      .eq('user_id', profileUserId)
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

  const fetchLikedMedia = async () => {
    if (!profileUserId) return;

    const { data } = await (supabase as any)
      .from('likes')
      .select(`
        media_id,
        media:media_id (
          *,
          profiles!media_user_id_fkey(username, avatar_url)
        )
      `)
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false });

    if (data) {
      const mapped = data
        .filter((item: any) => item.media)
        .map((item: any) => ({
          id: item.media.id,
          type: item.media.type,
          url: item.media.url,
          title: item.media.title,
          creator: item.media.profiles?.username || 'Anonymous',
          tags: item.media.tags || [],
          likes: item.media.likes_count || 0,
          taps: item.media.views_count || 0,
        }));
      setLikedMedia(mapped);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !profileUserId) return;

    try {
      if (isFollowingUser) {
        await unfollowUser(profileUserId, user.id);
        setIsFollowingUser(false);
        toast.success('Unfollowed');
      } else {
        await followUser(profileUserId, user.id);
        setIsFollowingUser(true);
        toast.success('Following');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpload = () => {
    fetchUserMedia(); // Refresh the media list after upload
    setIsUploadModalOpen(false);
  };

  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia(item);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          {!isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-primary flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} />
              <AvatarFallback>{profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>

            <div className="flex-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-2 mb-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground">{profile?.username || 'Loading...'}</h1>
                  <p className="text-sm text-muted-foreground">@{profile?.username || 'user'}</p>
                </div>
                {isOwnProfile ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/settings')}
                    className="gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </Button>
                ) : (
                  <Button
                    variant={isFollowingUser ? "outline" : "default"}
                    size="sm"
                    onClick={handleFollowToggle}
                  >
                    {isFollowingUser ? 'Unfollow' : 'Follow'}
                  </Button>
                )}
              </div>

              {/* Stats Grid - Responsive */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 mb-4">
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{userMedia.length}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Posts</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{followersCount}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Followers</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <div className="text-lg sm:text-2xl font-bold text-foreground">{followingCount}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Following</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <div className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-1 justify-center">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    {tipsReceived}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Received</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <div className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-1 justify-center">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    {tipsSent}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Sent</div>
                </div>
              </div>

              <p className="text-sm sm:text-base text-foreground">
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
            {likedMedia.length > 0 ? (
              <MasonryGrid 
                items={likedMedia}
                onMediaClick={handleMediaClick}
              />
            ) : (
              <Card className="p-12 text-center border-dashed">
                <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No liked posts</h3>
                <p className="text-muted-foreground">Start exploring and liking content you love</p>
              </Card>
            )}
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

      <MediaModal
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
};

export default Profile;
