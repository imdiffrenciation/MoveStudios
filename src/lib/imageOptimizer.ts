/**
 * Client-side image optimization utility
 * Compresses and converts images to WebP for faster uploads and loading
 */

const MAX_DIMENSION = 1920; // Max width/height for uploaded images
const DEFAULT_QUALITY = 0.85; // Quality for compression (0-1)

interface OptimizationResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
  format: string;
}

/**
 * Check if browser supports WebP encoding
 */
const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
};

/**
 * Load an image from a File object
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    const url = URL.createObjectURL(file);
    img.src = url;
  });
};

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
const calculateDimensions = (
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } => {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = width / height;
  if (width > height) {
    return { width: maxDimension, height: Math.round(maxDimension / ratio) };
  } else {
    return { width: Math.round(maxDimension * ratio), height: maxDimension };
  }
};

/**
 * Optimize an image file - compress, resize, and convert to best format
 */
export const optimizeImage = async (
  file: File,
  options?: {
    maxDimension?: number;
    quality?: number;
  }
): Promise<OptimizationResult> => {
  const maxDim = options?.maxDimension ?? MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const originalSize = file.size;

  // Load the image
  const img = await loadImage(file);
  const { width: newWidth, height: newHeight } = calculateDimensions(
    img.naturalWidth,
    img.naturalHeight,
    maxDim
  );

  // Create canvas and draw resized image
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  // Determine best output format
  const useWebP = supportsWebP();
  const mimeType = useWebP ? 'image/webp' : 'image/jpeg';
  const format = useWebP ? 'webp' : 'jpeg';

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      },
      mimeType,
      quality
    );
  });

  console.log(
    `Image optimized: ${(originalSize / 1024).toFixed(1)}KB → ${(blob.size / 1024).toFixed(1)}KB (${format}, ${newWidth}x${newHeight})`
  );

  return {
    blob,
    width: newWidth,
    height: newHeight,
    originalSize,
    optimizedSize: blob.size,
    format,
  };
};

/**
 * Create an optimized File from the result
 */
export const createOptimizedFile = (
  result: OptimizationResult,
  originalName: string
): File => {
  const ext = result.format;
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const newName = `${baseName}.${ext}`;
  
  return new File([result.blob], newName, { type: `image/${result.format}` });
};
