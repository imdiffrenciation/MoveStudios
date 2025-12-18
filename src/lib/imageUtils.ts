/**
 * Convert an image file to WebP format using canvas
 * @param file - The original image file
 * @param quality - WebP quality (0-1), default 0.85
 * @returns Promise<File> - The converted WebP file
 */
export async function convertToWebP(file: File, quality = 0.85): Promise<File> {
  // If it's already WebP or a video, return as-is
  if (file.type === 'image/webp' || file.type.startsWith('video/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Set canvas dimensions to image dimensions
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0);

      // Convert to WebP blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image to WebP'));
            return;
          }

          // Create new file with .webp extension
          const originalName = file.name.replace(/\.[^/.]+$/, '');
          const webpFile = new File([blob], `${originalName}.webp`, {
            type: 'image/webp',
          });

          // Clean up
          URL.revokeObjectURL(img.src);
          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resize image if it's too large while converting to WebP
 * @param file - The original image file
 * @param maxDimension - Maximum width or height
 * @param quality - WebP quality (0-1)
 */
export async function resizeAndConvertToWebP(
  file: File,
  maxDimension = 2048,
  quality = 0.85
): Promise<File> {
  if (file.type.startsWith('video/')) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { naturalWidth: width, naturalHeight: height } = img;

      // Calculate new dimensions if needed
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image'));
            return;
          }

          const originalName = file.name.replace(/\.[^/.]+$/, '');
          const webpFile = new File([blob], `${originalName}.webp`, {
            type: 'image/webp',
          });

          URL.revokeObjectURL(img.src);
          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}
