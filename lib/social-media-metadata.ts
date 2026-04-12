/**
 * Social Media Metadata Utilities
 * Ensures proper OG/Twitter tags for article sharing
 */

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

/**
 * Validates if an image URL is likely accessible and suitable for OG/Twitter
 */
export function validateImageUrl(url: string): boolean {
  if (!url) return false;
  
  // Must be absolute URL for social media crawlers
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }
  
  // Must not be data: or blob: URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    
    // Must have file extension
    const pathname = urlObj.pathname.toLowerCase();
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(pathname);
    if (!hasImageExtension) {
      return false;
    }
    
    // File should not be suspiciously small (less than 500 bytes)
    // This is a client-side check; server would need file system check
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves an article image URL to an absolute, validated URL for social media
 * Falls back to site logo if image is invalid or missing
 */
export function resolveOgImageUrl(
  image: string | null | undefined,
  normalizeFunc: (img: string | null | undefined) => string | null
): string {
  if (!image) {
    return DEFAULT_OG_IMAGE;
  }
  
  try {
    // First normalize the path
    const normalized = normalizeFunc(image);
    if (!normalized) {
      return DEFAULT_OG_IMAGE;
    }
    
    let absoluteUrl: string;
    
    // If already absolute URL, use it
    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      absoluteUrl = normalized;
    } else if (normalized.startsWith('/')) {
      // Relative path → convert to absolute
      absoluteUrl = `${SITE_URL}${normalized}`;
    } else {
      // Fallback for weird edge cases
      absoluteUrl = `${SITE_URL}/${normalized}`;
    }
    
    // Validate the resolved URL
    if (validateImageUrl(absoluteUrl)) {
      return absoluteUrl;
    }
  } catch (error) {
    console.warn('Error resolving OG image URL:', error);
  }
  
  // If anything fails, fall back to logo
  return DEFAULT_OG_IMAGE;
}

/**
 * Ensures article metadata is complete and valid for social sharing
 */
export function ensureMetadataCompleteness(
  metadata: Record<string, any>,
  ogImage: string
): void {
  // Verify OpenGraph metadata exists
  if (!metadata.openGraph) {
    metadata.openGraph = {};
  }
  
  if (!metadata.openGraph.images || metadata.openGraph.images.length === 0) {
    metadata.openGraph.images = [{
      url: ogImage,
      width: 1200,
      height: 630,
      alt: metadata.title || 'Intambwe Media Article',
    }];
  }
  
  // Verify Twitter Card metadata exists
  if (!metadata.twitter) {
    metadata.twitter = {};
  }
  
  if (!metadata.twitter.images || !Array.isArray(metadata.twitter.images)) {
    metadata.twitter.images = [ogImage];
  }
  
  // Ensure card type is set
  if (!metadata.twitter.card) {
    metadata.twitter.card = 'summary_large_image';
  }
}
