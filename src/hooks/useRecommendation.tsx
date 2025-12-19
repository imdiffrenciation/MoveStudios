import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RECOMMENDATION_CONFIG, InteractionType } from '@/lib/recommendation/config';

interface MediaItem {
  id: string;
  user_id: string;
  tags: string[] | null;
  engagement_score: number;
  viral_score: number;
  quality_score: number;
  created_at: string;
  [key: string]: any;
}

interface UserPreference {
  tag: string;
  score: number;
}

interface CreatorPreference {
  creator_id: string;
  score: number;
}

export const useRecommendation = () => {
  const { user } = useAuth();
  const [userPreferences, setUserPreferences] = useState<Map<string, number>>(new Map());
  const [creatorPreferences, setCreatorPreferences] = useState<Map<string, number>>(new Map());
  const [seenPosts, setSeenPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    if (user) {
      loadUserPreferences();
      loadCreatorPreferences();
      loadSeenPosts();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('user_preferences')
        .select('tag, score')
        .eq('user_id', user.id);

      if (error) throw error;
      const prefs = new Map<string, number>();
      data?.forEach((p: UserPreference) => prefs.set(p.tag, p.score));
      setUserPreferences(prefs);
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadCreatorPreferences = async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('creator_preferences')
        .select('creator_id, score')
        .eq('user_id', user.id);

      if (error) throw error;
      const prefs = new Map<string, number>();
      data?.forEach((p: CreatorPreference) => prefs.set(p.creator_id, p.score));
      setCreatorPreferences(prefs);
    } catch (error) {
      console.error('Error loading creator preferences:', error);
    }
  };

  const loadSeenPosts = async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('seen_posts')
        .select('media_id')
        .eq('user_id', user.id)
        .order('seen_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setSeenPosts(new Set(data?.map((p: any) => p.media_id) || []));
    } catch (error) {
      console.error('Error loading seen posts:', error);
    }
  };

  // Record an interaction in the background (doesn't re-sort feed during session)
  const recordInteraction = async (
    mediaId: string,
    creatorId: string,
    tags: string[],
    interactionType: InteractionType
  ) => {
    if (!user) return;

    try {
      // Record the interaction
      await (supabase as any).from('user_interactions').insert({
        user_id: user.id,
        media_id: mediaId,
        creator_id: creatorId,
        interaction_type: interactionType,
      });

      // Calculate weight based on interaction type
      const weight = RECOMMENDATION_CONFIG.user.interactions[
        interactionType === 'profile_check' ? 'profileCheck' : interactionType
      ] || 0;

      // Update tag preferences in database (background - no state update)
      for (const tag of tags) {
        const normalizedTag = tag.toLowerCase().trim();
        if (!normalizedTag) continue;

        // Get current score from DB to ensure accuracy
        const { data: existing } = await (supabase as any)
          .from('user_preferences')
          .select('score')
          .eq('user_id', user.id)
          .eq('tag', normalizedTag)
          .maybeSingle();

        const currentScore = existing?.score || 0;
        const newScore = currentScore + weight;

        await (supabase as any)
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            tag: normalizedTag,
            score: newScore,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,tag' });
      }

      // Update creator preference in database (background - no state update)
      const { data: existingCreator } = await (supabase as any)
        .from('creator_preferences')
        .select('score')
        .eq('user_id', user.id)
        .eq('creator_id', creatorId)
        .maybeSingle();

      const currentCreatorScore = existingCreator?.score || 0;
      const newCreatorScore = currentCreatorScore + weight;

      await (supabase as any)
        .from('creator_preferences')
        .upsert({
          user_id: user.id,
          creator_id: creatorId,
          score: newCreatorScore,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,creator_id' });

      // Note: engagement_score is updated via database triggers on likes/comments/saves
      // No need to manually update here - triggers handle it automatically
      
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  };

  // Mark post as seen
  const markAsSeen = async (mediaId: string) => {
    if (!user || seenPosts.has(mediaId)) return;

    try {
      await (supabase as any).from('seen_posts').upsert({
        user_id: user.id,
        media_id: mediaId,
        seen_at: new Date().toISOString(),
      }, { onConflict: 'user_id,media_id' });

      seenPosts.add(mediaId);
      setSeenPosts(new Set(seenPosts));
    } catch (error) {
      console.error('Error marking post as seen:', error);
    }
  };

  // Get recommended posts with 70/30 split
  const getRecommendedPosts = useCallback(async (allPosts: MediaItem[]): Promise<MediaItem[]> => {
    if (!user || allPosts.length === 0) {
      return allPosts;
    }

    // Filter out seen posts
    const unseenPosts = allPosts.filter(p => !seenPosts.has(p.id));
    if (unseenPosts.length === 0) return allPosts;

    // Get top tags from user preferences
    const topTags = Array.from(userPreferences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);

    // If no preferences yet, return posts sorted by engagement
    if (topTags.length === 0) {
      return unseenPosts.sort((a, b) => 
        (b.engagement_score || 0) - (a.engagement_score || 0)
      );
    }

    // Calculate personalization split based on interaction history
    const avgWeight = calculateAverageInteractionWeight();
    const maxWeight = RECOMMENDATION_CONFIG.user.interactions.like +
      RECOMMENDATION_CONFIG.user.interactions.comment +
      RECOMMENDATION_CONFIG.user.interactions.tip;
    
    const similarPercent = Math.min(
      50 + (avgWeight / maxWeight) * 20,
      RECOMMENDATION_CONFIG.user.recommendation.maxSimilarPercent
    );

    // Split posts into similar and others
    const similarPosts = unseenPosts.filter(post => 
      post.tags?.some(tag => topTags.includes(tag.toLowerCase()))
    );
    const otherPosts = unseenPosts.filter(post => 
      !post.tags?.some(tag => topTags.includes(tag.toLowerCase()))
    );

    // Score and sort each group
    const scoredSimilar = scoreAndSortPosts(similarPosts, topTags);
    const scoredOthers = scoreAndSortPosts(otherPosts, topTags);

    // Calculate counts based on split
    const totalCount = RECOMMENDATION_CONFIG.user.recommendation.finalRecommendations;
    const similarCount = Math.floor((similarPercent / 100) * totalCount);
    const othersCount = totalCount - similarCount;

    // Combine with interleaving for better UX
    const result: MediaItem[] = [];
    let sIdx = 0, oIdx = 0;
    
    while (result.length < totalCount && (sIdx < scoredSimilar.length || oIdx < scoredOthers.length)) {
      if (sIdx < scoredSimilar.length && sIdx < similarCount) {
        result.push(scoredSimilar[sIdx++]);
      }
      if (oIdx < scoredOthers.length && oIdx < othersCount) {
        result.push(scoredOthers[oIdx++]);
      }
    }

    // Add remaining posts if we haven't hit the limit
    while (result.length < unseenPosts.length) {
      if (sIdx < scoredSimilar.length) result.push(scoredSimilar[sIdx++]);
      else if (oIdx < scoredOthers.length) result.push(scoredOthers[oIdx++]);
      else break;
    }

    return result.length > 0 ? result : allPosts;
  }, [user, userPreferences, creatorPreferences, seenPosts]);

  const calculateAverageInteractionWeight = (): number => {
    const totalScore = Array.from(userPreferences.values()).reduce((a, b) => a + b, 0);
    const count = userPreferences.size;
    return count > 0 ? totalScore / count : 0;
  };

  const scoreAndSortPosts = (posts: MediaItem[], topTags: string[]): MediaItem[] => {
    return posts
      .map(post => {
        let score = 0;

        // Tag relevance (30%)
        const tagScore = post.tags?.reduce((acc, tag) => {
          const pref = userPreferences.get(tag.toLowerCase()) || 0;
          return acc + pref;
        }, 0) || 0;
        score += (tagScore / 100) * 0.3;

        // Creator affinity (15%)
        const creatorScore = creatorPreferences.get(post.user_id) || 0;
        score += (creatorScore / 100) * 0.15;

        // Engagement score (20%)
        score += Math.log1p(post.engagement_score || 0) / 10 * 0.2;

        // Viral score (15%)
        score += Math.log1p(post.viral_score || 0) / 10 * 0.15;

        // Freshness (10%)
        const daysSince = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.pow(RECOMMENDATION_CONFIG.quality.decayFactor, daysSince) * 0.1;

        // Quality (5%)
        score += (post.quality_score || 0) / 100 * 0.05;

        // Creator Badge Boost (5% bonus) - check if creator has active badge
        if ((post as any).has_active_badge) {
          score += RECOMMENDATION_CONFIG.creator.boosts.creatorBadge / 100;
        }

        return { ...post, _score: score };
      })
      .sort((a: any, b: any) => b._score - a._score);
  };

  return {
    recordInteraction,
    markAsSeen,
    getRecommendedPosts,
    userPreferences,
    creatorPreferences,
    loading,
    refreshPreferences: loadUserPreferences,
  };
};
