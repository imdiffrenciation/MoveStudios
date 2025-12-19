// Move Studios Recommendation Algorithm Configuration

export const RECOMMENDATION_CONFIG = {
  // User interaction weights for preference building
  user: {
    interactions: {
      like: 10,
      comment: 20,
      tip: 40,
      profileCheck: 5,
    },
    recommendation: {
      maxSimilarPercent: 70,
      minOthersPercent: 30,
      finalRecommendations: 20,
    },
  },
  // Creator boost weights for engagement scoring
  creator: {
    boosts: {
      like: 5,
      comment: 10,
      tip: 15,
      profileCheck: 3,
      creatorBadge: 25, // Verified creator badge boost
    },
    viralCoefficient: {
      timeWindowHours: 24,
      multiplier: 1.5,
    },
  },
  // Quality & diversity settings
  quality: {
    decayFactor: 0.95,
    diversityThreshold: 0.6,
    minEngagementScore: 0,
    maxSameCreatorInFeed: 3,
  },
};

export type InteractionType = 'like' | 'comment' | 'tip' | 'profile_check' | 'view';
