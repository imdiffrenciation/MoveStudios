/**
 * Steganography utilities for embedding and extracting hidden data in images.
 * Uses LSB (Least Significant Bit) encoding to hide user ID in image pixels.
 */

// Magic header to identify our watermarked images
const MAGIC_HEADER = 'MVS';
const HEADER_LENGTH = 3;
const LENGTH_BITS = 16; // 16 bits for storing data length (max 65535 chars)

/**
 * Encode a string into an array of bits
 */
function stringToBits(str: string): number[] {
  const bits: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    for (let j = 7; j >= 0; j--) {
      bits.push((charCode >> j) & 1);
    }
  }
  return bits;
}

/**
 * Decode bits back into a string
 */
function bitsToString(bits: number[]): string {
  let str = '';
  for (let i = 0; i < bits.length; i += 8) {
    let charCode = 0;
    for (let j = 0; j < 8; j++) {
      charCode = (charCode << 1) | (bits[i + j] || 0);
    }
    if (charCode === 0) break; // Null terminator
    str += String.fromCharCode(charCode);
  }
  return str;
}

/**
 * Convert a number to bits with fixed length
 */
function numberToBits(num: number, bitCount: number): number[] {
  const bits: number[] = [];
  for (let i = bitCount - 1; i >= 0; i--) {
    bits.push((num >> i) & 1);
  }
  return bits;
}

/**
 * Convert bits to a number
 */
function bitsToNumber(bits: number[]): number {
  let num = 0;
  for (let i = 0; i < bits.length; i++) {
    num = (num << 1) | bits[i];
  }
  return num;
}

/**
 * Embed a watermark (user ID) into an image using LSB steganography.
 * The watermark is hidden in the least significant bits of RGB channels.
 */
export async function embedWatermark(
  imageFile: File,
  userId: string,
  timestamp: number = Date.now()
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Create watermark payload: MAGIC_HEADER + userId + timestamp
      const payload = `${MAGIC_HEADER}${userId}|${timestamp}`;
      const payloadBits = stringToBits(payload);
      const lengthBits = numberToBits(payload.length, LENGTH_BITS);
      
      // Total bits needed: length (16) + payload bits
      const allBits = [...lengthBits, ...payloadBits];
      
      // Check if image is large enough
      const maxBits = Math.floor((data.length / 4) * 3); // 3 bits per pixel (RGB, skip alpha)
      if (allBits.length > maxBits) {
        reject(new Error('Image too small to embed watermark'));
        return;
      }
      
      // Embed bits into LSB of RGB channels
      let bitIndex = 0;
      for (let i = 0; i < data.length && bitIndex < allBits.length; i += 4) {
        // Red channel
        if (bitIndex < allBits.length) {
          data[i] = (data[i] & 0xFE) | allBits[bitIndex++];
        }
        // Green channel
        if (bitIndex < allBits.length) {
          data[i + 1] = (data[i + 1] & 0xFE) | allBits[bitIndex++];
        }
        // Blue channel
        if (bitIndex < allBits.length) {
          data[i + 2] = (data[i + 2] & 0xFE) | allBits[bitIndex++];
        }
        // Skip alpha channel (data[i + 3])
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create watermarked image'));
        }
      }, 'image/png', 1.0); // Use PNG for lossless encoding
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Extract watermark from an image if present.
 * Returns null if no watermark is found.
 */
export async function extractWatermark(
  imageUrl: string
): Promise<{ userId: string; timestamp: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve(null);
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Extract bits from LSB of RGB channels
        const extractedBits: number[] = [];
        const maxBits = LENGTH_BITS + (256 * 8); // Max payload size
        
        for (let i = 0; i < data.length && extractedBits.length < maxBits; i += 4) {
          extractedBits.push(data[i] & 1);      // Red
          extractedBits.push(data[i + 1] & 1);  // Green
          extractedBits.push(data[i + 2] & 1);  // Blue
        }
        
        // Extract length first
        const lengthBits = extractedBits.slice(0, LENGTH_BITS);
        const payloadLength = bitsToNumber(lengthBits);
        
        // Sanity check
        if (payloadLength <= 0 || payloadLength > 256) {
          resolve(null);
          return;
        }
        
        // Extract payload
        const payloadBits = extractedBits.slice(LENGTH_BITS, LENGTH_BITS + payloadLength * 8);
        const payload = bitsToString(payloadBits);
        
        // Verify magic header
        if (!payload.startsWith(MAGIC_HEADER)) {
          resolve(null);
          return;
        }
        
        // Parse payload: MVSuserId|timestamp
        const content = payload.slice(HEADER_LENGTH);
        const [userId, timestampStr] = content.split('|');
        
        if (userId && timestampStr) {
          resolve({
            userId,
            timestamp: parseInt(timestampStr, 10),
          });
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error extracting watermark:', error);
        resolve(null);
      }
    };
    
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/**
 * Generate a unique fingerprint for an image based on its visual content.
 * Uses a perceptual hashing approach.
 */
export async function generateImageFingerprint(imageFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Resize to 32x32 for fingerprinting
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, 32, 32);
      const imageData = ctx.getImageData(0, 0, 32, 32);
      const data = imageData.data;
      
      // Convert to grayscale and calculate average
      const grayValues: number[] = [];
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        grayValues.push(gray);
      }
      
      const average = grayValues.reduce((a, b) => a + b, 0) / grayValues.length;
      
      // Generate hash: 1 if above average, 0 if below
      let hash = '';
      for (const gray of grayValues) {
        hash += gray >= average ? '1' : '0';
      }
      
      // Convert binary string to hex
      const hexHash = BigInt('0b' + hash).toString(16).padStart(256, '0');
      resolve(hexHash);
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Compare two fingerprints and return similarity percentage (0-100).
 */
export function compareFingerprints(fp1: string, fp2: string): number {
  if (fp1.length !== fp2.length) return 0;
  
  let matches = 0;
  for (let i = 0; i < fp1.length; i++) {
    if (fp1[i] === fp2[i]) matches++;
  }
  
  return Math.round((matches / fp1.length) * 100);
}