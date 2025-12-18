export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  title: string;
  creator: string;
  creatorWalletAddress?: string;
  creatorAvatarUrl?: string;
  tags: string[];
  likes: number;
  taps: number;
  timestamp?: string;
  contentHash?: string;
  userId?: string;
  engagementScore?: number;
}

export interface TrendingTag {
  name: string;
  count: number;
}

export interface Creator {
  id: string;
  username: string;
  followers: number;
  isVerified: boolean;
}

export interface UserData {
  username: string;
  email?: string;
  walletConnected?: boolean;
  isNewUser?: boolean;
  joinDate?: string;
}
