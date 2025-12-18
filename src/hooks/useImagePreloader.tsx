import { useEffect, useRef, useCallback } from 'react';

// Cache for preloaded images
const imageCache = new Set<string>();
const preloadQueue: string[] = [];
let isPreloading = false;

// Generate low-res thumbnail URL using Supabase transform
export const getLowResUrl = (url: string, width: number = 20): string => {
  // Check if it's a Supabase storage URL
  if (url.includes('supabase.co/storage')) {
    return `${url}?width=${width}&quality=10`;
  }
  return url;
};

// Preload a single image
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve) => {
    if (imageCache.has(src)) {
      resolve();
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      resolve();
    };
    img.onerror = () => {
      resolve(); // Don't block on errors
    };
    img.src = src;
  });
};

// Process preload queue in background with lower priority
const processPreloadQueue = async () => {
  if (isPreloading || preloadQueue.length === 0) return;
  
  isPreloading = true;
  
  // Process 2 images at a time (reduced from 3)
  while (preloadQueue.length > 0) {
    const batch = preloadQueue.splice(0, 2);
    await Promise.all(batch.map(preloadImage));
    // Longer delay between batches to reduce CPU pressure
    await new Promise(r => setTimeout(r, 100));
  }
  
  isPreloading = false;
};

// Add images to preload queue
export const queuePreload = (urls: string[]) => {
  // Limit queue size to prevent memory issues
  if (preloadQueue.length > 20) return;
  
  urls.forEach(url => {
    if (!imageCache.has(url) && !preloadQueue.includes(url)) {
      preloadQueue.push(url);
    }
  });
  
  // Use requestIdleCallback if available for background preloading
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(processPreloadQueue, { timeout: 2000 });
  } else {
    setTimeout(processPreloadQueue, 100);
  }
};

// Check if image is already cached
export const isImageCached = (url: string): boolean => {
  return imageCache.has(url);
};

// Hook for preloading upcoming images
export const useImagePreloader = (items: { url: string }[], currentIndex: number = 0) => {
  useEffect(() => {
    // Preload next 4 images ahead (reduced from 6)
    const upcomingUrls = items
      .slice(currentIndex, currentIndex + 4)
      .map(item => item.url);
    
    queuePreload(upcomingUrls);
  }, [items, currentIndex]);
};

// Hook for intersection-based preloading
export const useIntersectionPreloader = () => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  const observe = useCallback((element: HTMLElement | null, imageUrl: string) => {
    if (!element) return;
    
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const url = entry.target.getAttribute('data-preload-url');
              if (url && !imageCache.has(url)) {
                preloadImage(url);
              }
            }
          });
        },
        {
          rootMargin: '100px 0px',
          threshold: 0
        }
      );
    }
    
    element.setAttribute('data-preload-url', imageUrl);
    observerRef.current.observe(element);
    
    return () => {
      observerRef.current?.unobserve(element);
    };
  }, []);
  
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);
  
  return { observe, isImageCached };
};
