// Unified Recommendation Service for Move Studios
// Handles both Pinterest feed and TikTok feed recommendations

import { supabase } from '@/integrations/supabase/client';
import { RECOMMENDATION_CONFIG } from './config';
import type { MediaItem } from '@/types';

// Tag categories for "related content" expansion
const TAG_CATEGORIES: Record<string, string[]> = {
  sports: ['sports', 'football', 'basketball', 'soccer', 'tennis', 'fitness', 'gym', 'workout'],
  gaming: ['gaming', 'esports', 'twitch', 'streaming', 'games', 'console', 'pc'],
  art: ['art', 'photography', 'design', 'illustration', 'digital art', 'painting', 'drawing'],
  music: ['music', 'edm', 'hiphop', 'rock', 'pop', 'jazz', 'indie', 'concerts'],
  tech: ['technology', 'crypto', 'nfts', 'web3', 'ai', 'coding', 'programming'],
  lifestyle: ['fashion', 'beauty', 'food', 'travel', 'fitness', 'wellness'],
  entertainment: ['movies', 'anime', 'tv', 'comedy', 'memes', 'dance'],
  nature: ['nature', 'animals', 'wildlife', 'outdoors', 'hiking', 'adventure'],
  automotive: ['cars', 'motorcycles', 'racing', 'supercars', 'tuning'],
  education: ['education', 'diy', 'tutorials', 'howto', 'learning'],
};

interface UserPreferenceData {
  tag: string;
  score: number;
}

interface CreatorPreferenceData {
  creator_id: string;
  score: number;
}

interface TrendingData {
  tags: string[];
  engagement_score: number;
}

export interface RecommendationResult {
  items: MediaItem[];
  source: 'personalized' | 'interests' | 'trending';
}

// Find related tags based on category groupings
function getRelatedTags(userTags: string[]): string[] {
  const relatedTags = new Set<string>();
  
  for (const tag of userTags) {
    const normalizedTag = tag.toLowerCase();
    for (const [, categoryTags] of Object.entries(TAG_CATEGORIES)) {
      if (categoryTags.includes(normalizedTag)) {
        categoryTags.forEach(t => relatedTags.add(t));
      }
    }
  }
  
  // Remove tags user already has
  userTags.forEach(t => relatedTags.delete(t.toLowerCase()));
  
  return Array.from(relatedTags);
}

// Get trending content for new users (last 7 days engagement)
async function getTrendingPosts(): Promise<MediaItem[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('engagement_score', { ascending: false })
    .limit(100);
  
  if (error || !data) return [];
  
  // Fetch profiles for trending posts
  const userIds = [...new Set(data.map(m => m.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, wallet_address, has_active_badge')
    .in('id', userIds);
  
  const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
  
  return data.map(item => {
    const profile = profileMap.get(item.user_id);
    return {
      id: item.id,
      type: item.type as 'image' | 'video',
      url: item.url,
      title: item.title,
      creator: profile?.username || 'Unknown',
      creatorWalletAddress: profile?.wallet_address || undefined,
      creatorAvatarUrl: profile?.avatar_url || undefined,
      hasActiveBadge: profile?.has_active_badge || false,
      tags: item.tags || [],
      likes: item.likes_count || 0,
      taps: item.views_count || 0,
      contentHash: item.content_hash || undefined,
      timestamp: item.created_at,
      userId: item.user_id,
      engagementScore: item.engagement_score || 0,
      viralScore: item.viral_score || 0,
      qualityScore: item.quality_score || 0,
    };
  });
}

// Get user preferences from database
async function getUserPreferences(userId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('tag, score')
    .eq('user_id', userId);
  
  if (error || !data) return new Map();
  
  const prefs = new Map<string, number>();
  data.forEach((p: UserPreferenceData) => prefs.set(p.tag, p.score));
  return prefs;
}

// Get creator preferences from database
async function getCreatorPreferences(userId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('creator_preferences')
    .select('creator_id, score')
    .eq('user_id', userId);
  
  if (error || !data) return new Map();
  
  const prefs = new Map<string, number>();
  data.forEach((p: CreatorPreferenceData) => prefs.set(p.creator_id, p.score));
  return prefs;
}

// Get seen posts for a user
async function getSeenPosts(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('seen_posts')
    .select('media_id')
    .eq('user_id', userId)
    .order('seen_at', { ascending: false })
    .limit(1000);
  
  if (error || !data) return new Set();
  return new Set(data.map((p: any) => p.media_id));
}

// Get user interests (for cold start)
async function getUserInterests(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_interests')
    .select('interest')
    .eq('user_id', userId);
  
  if (error || !data) return [];
  return data.map((d: any) => d.interest.toLowerCase());
}

// Score a single post based on multiple factors
function scorePost(
  post: MediaItem,
  userPrefs: Map<string, number>,
  creatorPrefs: Map<string, number>,
  topTags: string[],
  relatedTags: string[]
): number {
  let score = 0;
  
  // 1. Tag relevance (35%) - primary tags user interacts with
  const tagScore = post.tags?.reduce((acc: number, tag: string) => {
    const pref = userPrefs.get(tag.toLowerCase()) || 0;
    return acc + pref;
  }, 0) || 0;
  score += Math.min(tagScore / 50, 1) * 0.35;
  
  // 2. Related tag bonus (10%) - for discovery
  const hasRelatedTag = post.tags?.some(t => relatedTags.includes(t.toLowerCase()));
  if (hasRelatedTag) {
    score += 0.10;
  }
  
  // 3. Creator affinity (15%)
  const creatorScore = creatorPrefs.get(post.userId) || 0;
  score += Math.min(creatorScore / 50, 1) * 0.15;
  
  // 4. Engagement score (15%)
  score += Math.log1p(post.engagementScore || 0) / 10 * 0.15;
  
  // 5. Viral score (10%)
  const viralScore = (post as any).viralScore || 0;
  score += Math.log1p(viralScore) / 10 * 0.10;
  
  // 6. Freshness (10%) - decay over time
  const daysSince = (Date.now() - new Date(post.timestamp).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.pow(RECOMMENDATION_CONFIG.quality.decayFactor, daysSince) * 0.10;
  
  // 7. Quality (5%)
  const qualityScore = (post as any).qualityScore || 0;
  score += (qualityScore / 100) * 0.05;
  
  // 8. Creator Badge Boost (bonus)
  if (post.hasActiveBadge) {
    score += RECOMMENDATION_CONFIG.creator.boosts.creatorBadge / 100;
  }
  
  return score;
}

// Diversify feed to avoid too many posts from same creator
function diversifyFeed(posts: MediaItem[], maxPerCreator: number = 3): MediaItem[] {
  const creatorCounts = new Map<string, number>();
  const diversified: MediaItem[] = [];
  const deferred: MediaItem[] = [];
  
  for (const post of posts) {
    const count = creatorCounts.get(post.userId) || 0;
    if (count < maxPerCreator) {
      diversified.push(post);
      creatorCounts.set(post.userId, count + 1);
    } else {
      deferred.push(post);
    }
  }
  
  // Add deferred posts at the end
  return [...diversified, ...deferred];
}

// Shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Main recommendation function
export async function getRecommendedFeed(
  userId: string | undefined,
  allPosts: MediaItem[],
  options: { shuffle?: boolean; limit?: number } = {}
): Promise<RecommendationResult> {
  const { shuffle = false, limit = 50 } = options;
  
  // No user - return trending
  if (!userId) {
    const trending = await getTrendingPosts();
    return {
      items: shuffle ? shuffleArray(trending).slice(0, limit) : trending.slice(0, limit),
      source: 'trending',
    };
  }
  
  // Load all user data in parallel
  const [userPrefs, creatorPrefs, seenPosts, userInterests] = await Promise.all([
    getUserPreferences(userId),
    getCreatorPreferences(userId),
    getSeenPosts(userId),
    getUserInterests(userId),
  ]);
  
  // Cold start: user has no preferences yet
  const hasPreferences = userPrefs.size > 0;
  const hasInterests = userInterests.length > 0;
  
  if (!hasPreferences) {
    if (hasInterests) {
      // User selected interests but hasn't interacted yet
      // Filter posts by selected interests, then shuffle
      const interestPosts = allPosts.filter(post => 
        post.tags?.some(tag => userInterests.includes(tag.toLowerCase()))
      );
      
      // Also get related content for variety
      const relatedTags = getRelatedTags(userInterests);
      const relatedPosts = allPosts.filter(post => 
        !interestPosts.includes(post) &&
        post.tags?.some(tag => relatedTags.includes(tag.toLowerCase()))
      );
      
      // 70% interest-matched, 30% related
      const interestCount = Math.floor(limit * 0.7);
      const relatedCount = limit - interestCount;
      
      const shuffledInterests = shuffleArray(interestPosts).slice(0, interestCount);
      const shuffledRelated = shuffleArray(relatedPosts).slice(0, relatedCount);
      
      // Interleave for better UX
      const combined: MediaItem[] = [];
      let iIdx = 0, rIdx = 0;
      while (combined.length < limit && (iIdx < shuffledInterests.length || rIdx < shuffledRelated.length)) {
        // Add 2 interest posts, then 1 related
        if (iIdx < shuffledInterests.length) combined.push(shuffledInterests[iIdx++]);
        if (iIdx < shuffledInterests.length) combined.push(shuffledInterests[iIdx++]);
        if (rIdx < shuffledRelated.length) combined.push(shuffledRelated[rIdx++]);
      }
      
      return {
        items: combined,
        source: 'interests',
      };
    } else {
      // User skipped interests - show trending
      const trending = await getTrendingPosts();
      return {
        items: shuffle ? shuffleArray(trending).slice(0, limit) : trending.slice(0, limit),
        source: 'trending',
      };
    }
  }
  
  // Personalized feed for users with preferences
  // Filter out seen posts (keep them for fallback if needed)
  const unseenPosts = allPosts.filter(p => !seenPosts.has(p.id));
  const postsToScore = unseenPosts.length > 0 ? unseenPosts : allPosts;
  
  // Get top tags from preferences
  const topTags = Array.from(userPrefs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);
  
  // Get related tags for discovery
  const relatedTags = getRelatedTags(topTags);
  
  // Split into matching and discovery posts
  const matchingPosts = postsToScore.filter(post =>
    post.tags?.some(tag => topTags.includes(tag.toLowerCase()))
  );
  const discoveryPosts = postsToScore.filter(post =>
    !matchingPosts.includes(post) &&
    (post.tags?.some(tag => relatedTags.includes(tag.toLowerCase())) || true)
  );
  
  // Score posts
  const scoredMatching = matchingPosts
    .map(post => ({
      post,
      score: scorePost(post, userPrefs, creatorPrefs, topTags, relatedTags),
    }))
    .sort((a, b) => b.score - a.score);
  
  const scoredDiscovery = discoveryPosts
    .map(post => ({
      post,
      score: scorePost(post, userPrefs, creatorPrefs, topTags, relatedTags),
    }))
    .sort((a, b) => b.score - a.score);
  
  // 70% personalized, 30% discovery
  const personalizedCount = Math.floor(limit * 0.7);
  const discoveryCount = limit - personalizedCount;
  
  const personalizedItems = scoredMatching.slice(0, personalizedCount).map(s => s.post);
  const discoveryItems = scoredDiscovery.slice(0, discoveryCount).map(s => s.post);
  
  // Interleave: 2-3 personalized, 1 discovery
  const combined: MediaItem[] = [];
  let pIdx = 0, dIdx = 0;
  
  while (combined.length < limit && (pIdx < personalizedItems.length || dIdx < discoveryItems.length)) {
    // Add 2-3 personalized posts
    if (pIdx < personalizedItems.length) combined.push(personalizedItems[pIdx++]);
    if (pIdx < personalizedItems.length) combined.push(personalizedItems[pIdx++]);
    if (Math.random() > 0.5 && pIdx < personalizedItems.length) {
      combined.push(personalizedItems[pIdx++]);
    }
    // Add 1 discovery post
    if (dIdx < discoveryItems.length) combined.push(discoveryItems[dIdx++]);
  }
  
  // Diversify to avoid too many posts from same creator
  const diversified = diversifyFeed(combined, RECOMMENDATION_CONFIG.quality.maxSameCreatorInFeed);
  
  return {
    items: diversified.slice(0, limit),
    source: 'personalized',
  };
}

// Get more recommended posts for infinite scroll (related to what user has seen)
export async function getMoreRecommendedPosts(
  userId: string,
  currentPosts: MediaItem[],
  allPosts: MediaItem[],
  offset: number,
  limit: number = 20
): Promise<MediaItem[]> {
  const seenIds = new Set(currentPosts.map(p => p.id));
  const remainingPosts = allPosts.filter(p => !seenIds.has(p.id));
  
  // Get user preferences
  const userPrefs = await getUserPreferences(userId);
  const creatorPrefs = await getCreatorPreferences(userId);
  
  const topTags = Array.from(userPrefs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);
  
  const relatedTags = getRelatedTags(topTags);
  
  // Score remaining posts
  const scored = remainingPosts
    .map(post => ({
      post,
      score: scorePost(post, userPrefs, creatorPrefs, topTags, relatedTags),
    }))
    .sort((a, b) => b.score - a.score);
  
  // Get the next batch
  return scored.slice(offset, offset + limit).map(s => s.post);
}
