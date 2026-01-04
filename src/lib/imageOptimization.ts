/**
 * CDN Image Optimization utilities for Supabase Storage
 * Uses Supabase Storage transforms for responsive images
 */

export const getOptimizedUrl = (
  url: string,
  options: { width?: number; quality?: number } = {}
): string => {
  const { width = 800, quality = 80 } = options;

  // Only transform Supabase storage URLs
  if (url.includes('supabase.co/storage')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=${quality}`;
  }
  return url;
};

// For grid thumbnails (Pinterest-style masonry)
export const getThumbnailUrl = (url: string): string =>
  getOptimizedUrl(url, { width: 400, quality: 70 });

// For medium sized images (detail modals)
export const getMediumUrl = (url: string): string =>
  getOptimizedUrl(url, { width: 800, quality: 80 });

// For full screen (TikTok feed)
export const getFullUrl = (url: string): string =>
  getOptimizedUrl(url, { width: 1080, quality: 85 });

// For low-res placeholder (blur-up effect)
export const getPlaceholderUrl = (url: string): string =>
  getOptimizedUrl(url, { width: 20, quality: 10 });
