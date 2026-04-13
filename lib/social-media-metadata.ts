/**
 * Social Media Metadata Utilities
 * Ensures proper OG/Twitter tags for article sharing
 * Maximizes thumbnail display on Facebook, Twitter, LinkedIn, WhatsApp, etc.
 */

const SITE_URL = 'https://intambwemedia.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;
const FALLBACK_IMAGES = [
  `${SITE_URL}/logo.png`,           // Branded logo - always available
];

/**
 * Detects MIME type from URL or filename
 */
function getImageMimeType(url: string): string {
  const pathname = url.toLowerCase();
  if (pathname.endsWith('.webp')) return 'image/webp';
  if (pathname.endsWith('.avif')) return 'image/avif';
  if (pathname.endsWith('.gif')) return 'image/gif';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  // Default to JPEG as most compatible
  return 'image/jpeg';
}

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
  // CRITICAL: Validate that image is actually provided
  if (!image) {
    console.warn('[OG:IMAGE] No featured image provided, using fallback logo.png');
    return DEFAULT_OG_IMAGE;
  }
  
  try {
    // First normalize the path
    const normalized = normalizeFunc(image);
    if (!normalized) {
      console.warn(`[OG:IMAGE] Failed to normalize image path: "${image}" → null, using fallback`);
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
      console.log(`[OG:IMAGE] ✅ Successfully resolved: "${image}" → "${absoluteUrl}"`);
      return absoluteUrl;
    } else {
      console.warn(`[OG:IMAGE] Validation failed for resolved URL: "${absoluteUrl}", using fallback`);
    }
  } catch (error) {
    // Log the error for debugging
    console.error(`[OG:IMAGE] Unexpected error resolving "${image}":`, error instanceof Error ? error.message : error);
 */
export function getOgImageType(url: string): string {
  return getImageMimeType(url);
}

/**
 * Ensures article metadata is complete and valid for social sharing
 * Maximizes compatibility across all social platforms
 */
export function ensureMetadataCompleteness(
  metadata: Record<string, any>,
  ogImage: string
): void {
  // Verify OpenGraph metadata exists with MULTIPLE image options for fallback
  if (!metadata.openGraph) {
    metadata.openGraph = {};
  }
  
  // CRITICAL: Always include og:image with proper metadata
  // Social platforms use first image, so order matters
  if (!metadata.openGraph.images || metadata.openGraph.images.length === 0) {
    const mimeType = getImageMimeType(ogImage);
    const images = [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: metadata.title || 'Intambwe Media Article',
        type: mimeType,
      },
    ];
    
    // Add fallback images (logo) if primary image is different
    FALLBACK_IMAGES.forEach(fallbackImg => {
      if (fallbackImg !== ogImage) {
        images.push({
          url: fallbackImg,
          width: 1200,
          height: 630,
          alt: 'Intambwe Media',
          type: getImageMimeType(fallbackImg),
        });
      }
    });
    
    metadata.openGraph.images = images;
  }
  
  // Verify Twitter Card metadata exists
  // Twitter requires BOTH og:image AND twitter:image for reliable display
  if (!metadata.twitter) {
    metadata.twitter = {};
  }
  
  // Twitter Card: summary_large_image REQUIRES image
  if (!metadata.twitter.card) {
    metadata.twitter.card = 'summary_large_image';
  }
  
  // CRITICAL: Twitter must have image field (not images) for summary_large_image
  if (!metadata.twitter.image) {
    metadata.twitter.image = ogImage;
  }
}
