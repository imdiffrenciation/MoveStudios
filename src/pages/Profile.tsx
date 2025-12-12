import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Grid, Heart, Bookmark, ArrowLeft, Shield, AlertCircle, Gift, Camera } from 'lucide-react';
import MasonryGrid from '@/components/MasonryGrid';
import DockerNav from '@/components/DockerNav';
import UploadModal from '@/components/UploadModal';
import MediaModal from '@/components/MediaModal';
import ContentProtectionModal from '@/components/ContentProtectionModal';
import { useAuth } from '@/hooks/useAuth';
import { useFollows } from '@/hooks/useFollows';
import { useTipStats } from '@/hooks/useTipStats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MediaItem } from '@/types';

interface UnprotectedMedia {
  id: string;
  title: string;
  url: string;
  content_hash: string;
  type: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user } = useAuth();
  const profileUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;
  
  const { followersCount, followingCount, isFollowing: checkIsFollowing, followUser, unfollowUser } = useFollows(profileUserId);
  const { tipsSent, tipsReceived, refreshStats: refreshTipStats } = useTipStats(profileUserId);
  const [activeTab, setActiveTab] = useState('created');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProtectionModalOpen, setIsProtectionModalOpen] = useState(false);
  const [userMedia, setUserMedia] = useState<MediaItem[]>([]);
  const [likedMedia, setLikedMedia] = useState<MediaItem[]>([]);
  const [savedMedia, setSavedMedia] = useState<MediaItem[]>([]);
  const [unprotectedMedia, setUnprotectedMedia] = useState<UnprotectedMedia[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const fetchUnprotectedMedia = async () => {
    if (!profileUserId || !isOwnProfile) return;

    const { data } = await (supabase as any)
      .from('media')
      .select('id, title, url, content_hash, type')
      .eq('user_id', profileUserId)
      .eq('is_protected', false)
      .not('content_hash', 'is', null)
      .order('created_at', { ascending: false });

    if (data) {
      setUnprotectedMedia(data);
    }
  };

  useEffect(() => {
    if (profileUserId) {
      fetchProfile();
      fetchUserMedia();
      fetchLikedMedia();
      fetchSavedMedia();
      if (isOwnProfile) {
        fetchUnprotectedMedia();
      }
      if (!isOwnProfile && user) {
        checkFollowStatus();
      }

      // Real-time subscription for created media
      const mediaChannel = supabase
        .channel(`profile-media-${profileUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'media',
            filter: `user_id=eq.${profileUserId}`,
          },
          () => {
            fetchUserMedia();
          }
        )
        .subscribe();

      // Real-time subscription for likes
      const likesChannel = supabase
        .channel(`profile-likes-${profileUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'likes',
            filter: `user_id=eq.${profileUserId}`,
          },
          () => {
            fetchLikedMedia();
          }
        )
        .subscribe();

      // Real-time subscription for saves
      const savesChannel = supabase
        .channel(`profile-saves-${profileUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'saves',
            filter: `user_id=eq.${profileUserId}`,
          },
          () => {
            fetchSavedMedia();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(mediaChannel);
        supabase.removeChannel(likesChannel);
        supabase.removeChannel(savesChannel);
      };
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

  const fetchSavedMedia = async () => {
    if (!profileUserId) return;

    const { data } = await (supabase as any)
      .from('saves')
      .select(`
        media_id,
        media:media_id (
          *
        )
      `)
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false });

    if (data) {
      // Get unique user IDs for profiles
      const userIds = [...new Set(data.filter((item: any) => item.media).map((item: any) => item.media.user_id))];
      
      // Fetch profiles
      const { data: profilesData } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });
      }

      const mapped = data
        .filter((item: any) => item.media)
        .map((item: any) => {
          const profile = profilesMap.get(item.media.user_id);
          return {
            id: item.media.id,
            type: item.media.type,
            url: item.media.url,
            title: item.media.title,
            creator: profile?.username || 'Anonymous',
            tags: item.media.tags || [],
            likes: item.media.likes_count || 0,
            taps: item.media.views_count || 0,
          };
        });
      setSavedMedia(mapped);
    }
  };

  const fetchUserMedia = async () => {
    if (!profileUserId) return;

    const { data } = await (supabase as any)
      .from('media')
      .select('*')
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false });

    if (data) {
      // Get unique user IDs for profiles
      const userIds = [...new Set(data.map((item: any) => item.user_id))];
      
      // Fetch profiles separately
      const { data: profilesData } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });
      }

      const mapped = data.map((item: any) => {
        const profile = profilesMap.get(item.user_id);
        return {
          id: item.id,
          type: item.type,
          url: item.url,
          title: item.title,
          creator: profile?.username || 'Anonymous',
          tags: item.tags || [],
          likes: item.likes_count || 0,
          taps: item.views_count || 0,
        };
      });
      setUserMedia(mapped);
    }
  };

  const fetchLikedMedia = async () => {
    if (!profileUserId) return;

    const { data } = await (supabase as any)
      .from('likes')
      .select(`
        media_id,
        media:media_id (*)
      `)
      .eq('user_id', profileUserId)
      .order('created_at', { ascending: false });

    if (data) {
      // Get unique user IDs for profiles
      const userIds = [...new Set(data.filter((item: any) => item.media).map((item: any) => item.media.user_id))];
      
      // Fetch profiles separately
      const { data: profilesData } = await (supabase as any)
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach((profile: any) => {
          profilesMap.set(profile.id, profile);
        });
      }

      const mapped = data
        .filter((item: any) => item.media)
        .map((item: any) => {
          const profile = profilesMap.get(item.media.user_id);
          return {
            id: item.media.id,
            type: item.media.type,
            url: item.media.url,
            title: item.media.title,
            creator: profile?.username || 'Anonymous',
            tags: item.media.tags || [],
            likes: item.media.likes_count || 0,
            taps: item.media.views_count || 0,
          };
        });
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
    fetchUserMedia();
    fetchUnprotectedMedia();
    setIsUploadModalOpen(false);
  };

  const handleProtected = () => {
    fetchUnprotectedMedia();
  };

  const handleMediaClick = (item: MediaItem) => {
    setSelectedMedia(item);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Please select an image under 5MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Profile picture updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
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
            <div className="relative">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-primary flex-shrink-0">
                <AvatarImage src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUserId}`} />
                <AvatarFallback>{profile?.username?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <>
                  <label 
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    {avatarUploading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={avatarUploading}
                  />
                </>
              )}
            </div>

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
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    {tipsReceived}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">TIPs Received</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-secondary/50">
                  <div className="text-lg sm:text-2xl font-bold text-foreground flex items-center gap-1 justify-center">
                    <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                    {tipsSent}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">TIPs Sent</div>
                </div>
              </div>

              <p className="text-sm sm:text-base text-foreground">
                {profile?.bio || 'No bio yet'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content Protection Banner */}
      {isOwnProfile && unprotectedMedia.length > 0 && (
        <div className="bg-primary/10 border-b border-primary/20">
          <div className="container mx-auto px-3 sm:px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/20">
                  <AlertCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm sm:text-base">
                    {unprotectedMedia.length} unprotected content{unprotectedMedia.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Store content hashes on blockchain to prove ownership
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => setIsProtectionModalOpen(true)}
                className="gap-2"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Protect Now</span>
                <span className="sm:hidden">Protect</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Tabs */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
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
            {savedMedia.length > 0 ? (
              <MasonryGrid 
                items={savedMedia}
                onMediaClick={handleMediaClick}
              />
            ) : (
              <Card className="p-12 text-center border-dashed">
                <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No saved posts</h3>
                <p className="text-muted-foreground">Save posts to view them later</p>
              </Card>
            )}
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
        allMedia={[...userMedia, ...likedMedia, ...savedMedia]}
      />

      <ContentProtectionModal
        isOpen={isProtectionModalOpen}
        onClose={() => setIsProtectionModalOpen(false)}
        unprotectedMedia={unprotectedMedia}
        onProtected={handleProtected}
      />
    </div>
  );
};

export default Profile;
