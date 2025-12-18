import { useEffect, useRef, useCallback } from 'react';

// Cache for preloaded images
const imageCache = new Set<string>();
const preloadQueue: string[] = [];
let isPreloading = false;

// Generate low-res thumbnail URL using Supabase transform
export const getLowResUrl = (url: string, width: number = 40): string => {
  // Check if it's a Supabase storage URL
  if (url.includes('supabase.co/storage')) {
    // Use Supabase image transformation for low-res
    const transformUrl = url.replace('/object/public/', '/object/public/');
    return `${transformUrl}?width=${width}&quality=20`;
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

// Process preload queue in background
const processPreloadQueue = async () => {
  if (isPreloading || preloadQueue.length === 0) return;
  
  isPreloading = true;
  
  // Process 3 images at a time
  while (preloadQueue.length > 0) {
    const batch = preloadQueue.splice(0, 3);
    await Promise.all(batch.map(preloadImage));
    // Small delay between batches to not block main thread
    await new Promise(r => setTimeout(r, 50));
  }
  
  isPreloading = false;
};

// Add images to preload queue
export const queuePreload = (urls: string[]) => {
  urls.forEach(url => {
    if (!imageCache.has(url) && !preloadQueue.includes(url)) {
      preloadQueue.push(url);
    }
  });
  processPreloadQueue();
};

// Check if image is already cached
export const isImageCached = (url: string): boolean => {
  return imageCache.has(url);
};

// Hook for preloading upcoming images
export const useImagePreloader = (items: { url: string }[], currentIndex: number = 0) => {
  useEffect(() => {
    // Preload next 6 images ahead
    const upcomingUrls = items
      .slice(currentIndex, currentIndex + 6)
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
          rootMargin: '200px 0px', // Start preloading 200px before visible
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
