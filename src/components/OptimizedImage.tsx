import { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  onLoad?: () => void;
}

/**
 * Generates Supabase storage transformation URL
 * Supports width, quality, and format parameters
 */
const getOptimizedUrl = (originalUrl: string, width: number, quality: number = 80): string => {
  // Check if it's a Supabase storage URL
  const supabaseStoragePattern = /supabase\.co\/storage\/v1\/object\/public\//;
  
  if (!supabaseStoragePattern.test(originalUrl)) {
    return originalUrl; // Return original if not Supabase storage
  }

  // Convert to render endpoint with transformations
  const renderUrl = originalUrl.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  // Add transformation parameters
  const separator = renderUrl.includes('?') ? '&' : '?';
  return `${renderUrl}${separator}width=${width}&quality=${quality}&format=webp`;
};

/**
 * Generates srcset for responsive images
 */
const generateSrcSet = (src: string, widths: number[] = [320, 640, 960, 1280, 1920]): string => {
  return widths
    .map(w => `${getOptimizedUrl(src, w)} ${w}w`)
    .join(', ');
};

/**
 * OptimizedImage component with lazy loading and responsive srcset
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  onLoad
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate srcset for responsive loading
  const srcSet = generateSrcSet(src);
  
  // Use smaller placeholder for initial load
  const placeholderSrc = getOptimizedUrl(src, 32, 30);
  
  // Default src uses medium quality
  const defaultSrc = getOptimizedUrl(src, 960, 80);

  useEffect(() => {
    // Reset state when src changes
    setLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    // Fallback to original URL if transformation fails
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blur placeholder */}
      {!loaded && !error && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 transition-opacity duration-300"
          style={{ opacity: loaded ? 0 : 1 }}
        />
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={error ? src : defaultSrc}
        srcSet={error ? undefined : srcSet}
        sizes={sizes}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default OptimizedImage;
