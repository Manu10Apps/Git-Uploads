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

// Enable production debugging for social media issues
const DEBUG_OG_IMAGES = process.env.DEBUG_OG_IMAGES === 'true' || process.env.NODE_ENV !== 'production';

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
    
    // Remove query params and fragments to check file extension
    const pathname = urlObj.pathname.toLowerCase();
    
    // Must have image file extension (check before query params)
    // Handle URLs with or without query parameters/fragments
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(pathname);
    if (!hasImageExtension) {
      return false;
    }
    
    // Additional validation: hostname should be valid
    if (!urlObj.hostname) {
      return false;
    }
    
    // Reject localhost/127.0.0.1 for public sharing
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if an image URL is accessible via HTTP HEAD request
 * Used to verify images are available to social media crawlers before publishing
 * IMPORTANT: Returns null if fetch fails (timeout, network error) - treat as validation passed
 */
export async function validateImageAccessibility(url: string): Promise<{
  accessible: boolean;
  statusCode: number | null;
  contentType: string | null;
  error: string | null;
}> {
  if (!validateImageUrl(url)) {
    return {
      accessible: false,
      statusCode: null,
      contentType: null,
      error: 'URL failed basic validation (not HTTPS, no image extension, or localhost)',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          accessible: true,
          statusCode: response.status,
          contentType: response.headers.get('content-type'),
          error: null,
        };
      } else {
        return {
          accessible: false,
          statusCode: response.status,
          contentType: response.headers.get('content-type'),
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    // Network errors are common during deployment - don't fail validation
    if (errorMsg.includes('AbortError') || errorMsg.includes('timeout')) {
      return {
        accessible: false,
        statusCode: null,
        contentType: null,
        error: `Timeout (image may be temporarily unavailable): ${errorMsg}`,
      };
    }
    return {
      accessible: false,
      statusCode: null,
      contentType: null,
      error: errorMsg,
    };
  }
}

/**
 * Resolves an article image URL to an absolute, validated URL for social media
 * Falls back to site logo if image is invalid or missing
 * CRITICAL: Social media crawlers need HTTPS URLs, no auth, 1200x630+ pixels
 */
export function resolveOgImageUrl(
  image: string | null | undefined,
  normalizeFunc: (img: string | null | undefined) => string | null
): string {
  // CRITICAL: Validate that image is actually provided
  if (!image) {
    if (DEBUG_OG_IMAGES) console.warn('[OG:IMAGE] ❌ No featured image provided, using fallback');
    return DEFAULT_OG_IMAGE;
  }
  
  try {
    // First normalize the path
    const normalized = normalizeFunc(image);
    if (!normalized) {
      if (DEBUG_OG_IMAGES) console.warn(`[OG:IMAGE] ❌ Failed to normalize image path: "${image}" → null`);
      return DEFAULT_OG_IMAGE;
    }

    let absoluteUrl: string;
    
    // If already absolute URL, ensure HTTPS
    if (normalized.startsWith('http://')) {
      absoluteUrl = normalized.replace(/^http:/, 'https:');
      if (DEBUG_OG_IMAGES) console.log(`[OG:IMAGE] ✅ Upgraded HTTP to HTTPS: "${absoluteUrl}"`);
    } else if (normalized.startsWith('https://')) {
      absoluteUrl = normalized;
      if (DEBUG_OG_IMAGES) console.log(`[OG:IMAGE] ✅ Already HTTPS: "${absoluteUrl}"`);
    } else if (normalized.startsWith('/')) {
      // Relative path → convert to absolute HTTPS URL
      absoluteUrl = `${SITE_URL}${normalized}`;
      if (DEBUG_OG_IMAGES) console.log(`[OG:IMAGE] ✅ Converted relative to absolute: "${image}" → "${absoluteUrl}"`);
    } else {
      // Fallback for URLs without leading slash
      if (normalized.includes('://')) {
        // Already a URL, just use it
        absoluteUrl = normalized;
      } else {
        // Treat as relative path
        absoluteUrl = `${SITE_URL}/${normalized}`;
      }
      if (DEBUG_OG_IMAGES) console.log(`[OG:IMAGE] ✅ Resolved ambiguous format: "${image}" → "${absoluteUrl}"`);
    }
    
    // Validate the resolved URL
    if (validateImageUrl(absoluteUrl)) {
      if (DEBUG_OG_IMAGES) console.log(`[OG:IMAGE] ✅ Final URL validated successfully`);
      return absoluteUrl;
    } else {
      if (DEBUG_OG_IMAGES) {
        console.warn(`[OG:IMAGE] ❌ URL validation failed: "${absoluteUrl}"`);
        console.warn(`[OG:IMAGE] Reasons: Not HTTPS, invalid extension, or localhost`);
      }
    }
  } catch (error) {
    // Log the error for debugging
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[OG:IMAGE] ❌ Unexpected error resolving image: "${errorMsg}"`);
  }

  // Default fallback if all else fails
  if (DEBUG_OG_IMAGES) console.warn(`[OG:IMAGE] 🔄 Falling back to default logo: "${DEFAULT_OG_IMAGE}"`);
  return DEFAULT_OG_IMAGE;
}

/**
 * Get MIME type for image (for og:image:type meta tag)
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
