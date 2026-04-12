# Social Media Metadata Fix - Testing & Verification Guide

## Changes Made

### 1. Removed Corrupted Image Files ✅

- Deleted 5 placeholder/corrupted image files (<500 bytes each) from `/public/uploads/`
- Files removed:
  - article-1774723135679-angp28.jpeg
  - article-1774723232659-lemr1r.png
  - article-1774723263944-yfuczx.webp
  - article-1774723286545-u7q1i1.png
  - article-1774723357963-m5nyig.jpeg

**Why this matters**: These corrupted files could have been selected as article OG images, resulting in broken image links on social media.

### 2. Added Social Media Metadata Validation Library ✅

Created `/lib/social-media-metadata.ts`:

- `validateImageUrl()` - Ensures image URLs are absolute and have proper extensions
- `resolveOgImageUrl()` - Robustly converts relative paths to absolute URLs
- `ensureMetadataCompleteness()` - Validates metadata structure

### 3. Enhanced Article Page Metadata Generation ✅

Updated `/app/article/[slug]/page.tsx`:

- Added import for new validation functions
- Improved image URL resolution with better fallback handling
- Added description truncation (160 chars) for social media compliance
- Enhanced OpenGraph metadata with `section` field
- Added `type: 'image/jpeg'` to og:image metadata
- More comprehensive metadata even when article not found

### 4. Diagnostic Tools Created ✅

- `diagnose-metadata.js` - Comprehensive metadata diagnostic tool
- Checks image availability, metadata generation, URL normalization
- Identifies middleware interaction issues

## Testing Checklist

### Step 1: Test Article Metadata is Generated

```bash
# Check if og:image meta tag exists in HTML
curl -s https://intambwemedia.com/article/[recent-article-slug] | grep "og:image"

# Should output something like:
# <meta property="og:image" content="https://intambwemedia.com/uploads/article-1771789205109-1f9t8a.jpg">
```

### Step 2: Verify Image is Accessible

```bash
# Test if the OG image file is actually accessible (200 status)
curl -I https://intambwemedia.com/uploads/[image-filename]

# Should return: HTTP/1.1 200 OK
# NOT: HTTP/1.1 404 Not Found
```

### Step 3: Test with Social Media Debuggers (AFTER DEPLOYMENT)

**Facebook Share Debugger:**

- Go to: https://developers.facebook.com/tools/debug/sharing/
- Enter article URL
- Check: Image appears, title shows, description visible
- Click "Scrape Again" to clear cache

**LinkedIn Post Inspector:**

- Go to: https://www.linkedin.com/post-inspector/inspect/
- Enter article URL
- Verify: Image, title, description display correctly

**Twitter Card Validator:**

- Go to: https://cards-dev.twitter.com/validator
- Enter article URL
- Verify: summary_large_image card appears with image

### Step 4: Test Locale-Prefixed URLs

```bash
# Test with language prefix (middleware rewrite)
curl -s https://intambwemedia.com/en/article/[slug] | grep "og:image"

# Test with Kinyarwanda prefix
curl -s https://intambwemedia.com/rw/article/[slug] | grep "og:image"

# Both should return valid og:image meta tags
```

## Troubleshooting

### Issue: og:image meta tag isn't showing

**Solution 1: Clear social media cache**

```
Facebook: Use Share Debugger "Scrape Again" button
LinkedIn: Wait 24 hours or use URL inspection tool
Twitter: Clear cache or test with different URL parameter
```

**Solution 2: Verify image exists and is accessible**

```bash
# Check article image in database
# The image field must contain:
# 1. Either an absolute URL starting with https://
# 2. OR a relative path like /uploads/article-xxx.jpg

# Check image file actually exists
ls -la /public/uploads/article-*
```

**Solution 3: Verify metadata is in page source**

```bash
# View complete page head
curl -s https://intambwemedia.com/article/[slug] | head -80

# Should contain:
# - og:image meta tag with absolute URL
# - twitter:image meta tag
# - description meta tag (160 chars max)
```

### Issue: Image URLs are broken (404)

**Check 1: Image path format in database**

```bash
# Verify image paths are properly stored
SELECT id, slug, image FROM Article WHERE image IS NOT NULL LIMIT 5;

# Paths should look like:
# - /uploads/article-1771789205109-1f9t8a.jpg
# - https://intambwemedia.com/uploads/article-xxx.jpg
# NOT:
# - article-xxx.jpg (missing /uploads/ prefix)
# - C:\Users\...  (absolute Windows path)
```

**Check 2: Static file serving**

```bash
# Verify Next.js is serving /public/uploads correctly
curl -I https://intambwemedia.com/logo.png  # Should be 200
curl -I https://intambwemedia.com/uploads/article-xxx.jpg  # Should be 200
```

## Next Steps

1. **Deploy changes** to production
2. **Test recent articles** using steps above
3. **Clear social media caches** if sharing old URLs
4. **Monitor** that new articles show thumbnails when shared
5. **Document any remaining issues** with specific article slugs

## Key Metrics to Track

- ✅ 100% of articles have og:image in HTML
- ✅ 100% of OG image URLs return 200 status (not 404)
- ✅ Images appear on Facebook/LinkedIn/Twitter when sharing
- ✅ No corrupted image files in /public/uploads/

## References

- [Open Graph Protocol Docs](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [LinkedIn Share Inspector](https://www.linkedin.com/post-inspector/inspect/)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/sharing/)
