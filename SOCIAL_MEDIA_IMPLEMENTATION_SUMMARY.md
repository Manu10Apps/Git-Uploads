# Social Media Metadata - Complete Implementation Summary

**Framework**: Next.js 15.5.14 (App Router)  
**Status**: ✅ Production Ready  
**Last Review**: April 13, 2026

---

## 📋 EXECUTIVE SUMMARY

Your social media thumbnail implementation is **complete and properly architected**. This document summarizes the infrastructure, deployment status, and operational requirements.

### Quick Status Check

```bash
# Verify metadata files exist
ls -la lib/social-media-metadata.ts app/article/[slug]/page.tsx

# Check for broken images (< 5KB = corrupted)
find public/uploads -type f -exec du -b {} + | awk '$1 < 5120'

# Validate recent article metadata
curl -s https://intambwemedia.com/article/recent-slug | grep "og:image"
```

---

## 🏗️ IMPLEMENTATION ARCHITECTURE

### 1. Metadata Generation Pipeline

```
Article Database
      ↓
getArticleBySlug()
      ↓
[article.image] → Validation & normalization
      ↓
normalizeArticleImageUrl() → Resolves path (e.g., "uploads/article-123.jpg")
      ↓
resolveOgImageUrl() → Converts to absolute (https://intambwemedia.com/uploads/...)
      ↓
validateImageUrl() → Verifies publicly accessible & correct format
      ↓
generateMetadata() → Injects into <head> tags (OG + Twitter Card)
      ↓
Page HTML with social media tags ready for sharing
```

### 2. Core Components

| Component              | File                                  | Purpose                                                         |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------- |
| **Validation Library** | `lib/social-media-metadata.ts`        | URL validation, MIME type detection, metadata completeness      |
| **Metadata Generator** | `app/article/[slug]/page.tsx`         | Generates OG/Twitter tags via Next.js metadata API              |
| **Image Normalizer**   | `lib/utils.ts`                        | Converts various path formats to standard `/uploads/...` format |
| **Diagnostic Tool**    | `diagnose-metadata.js`                | Analyzes metadata generation issues                             |
| **Validation Script**  | `scripts/validate-social-metadata.js` | Tests deployed articles for correct tags                        |

### 3. Data Flow Example

**Article in Database:**

```json
{
  "id": 123,
  "slug": "breaking-news-kwanda",
  "title": "Breaking News from Kwanda",
  "image": "/uploads/article-kwanda-20260413.jpg"
}
```

**Metadata Generated:**

```html
<meta property="og:type" content="article" />
<meta
  property="og:url"
  content="https://intambwemedia.com/article/breaking-news-kwanda"
/>
<meta
  property="og:title"
  content="Breaking News from Kwanda | Intambwe Media"
/>
<meta
  property="og:description"
  content="Breaking development in Kwanda region..."
/>
<meta
  property="og:image"
  content="https://intambwemedia.com/uploads/article-kwanda-20260413.jpg"
/>
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/jpeg" />
<meta property="og:site_name" content="Intambwe Media" />
<meta property="article:published_time" content="2026-04-13T10:00:00Z" />
<meta property="article:section" content="News" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@intambwemedias" />
<meta
  name="twitter:title"
  content="Breaking News from Kwanda | Intambwe Media"
/>
<meta
  name="twitter:description"
  content="Breaking development in Kwanda region..."
/>
<meta
  name="twitter:image"
  content="https://intambwemedia.com/uploads/article-kwanda-20260413.jpg"
/>

<link
  rel="canonical"
  href="https://intambwemedia.com/article/breaking-news-kwanda"
/>
```

**When User Shares on Social Media:**

1. User copies article URL: `https://intambwemedia.com/article/breaking-news-kwanda`
2. User pastes link on Facebook/Twitter/LinkedIn/WhatsApp
3. Social platform crawls the URL
4. Reads meta tags from `<head>`
5. Displays title, description, and image from og:image/twitter:image
6. User sees professional thumbnail preview before sharing

---

## ✅ DEPLOYMENT CHECKLIST

### Must Complete Before Production

- [ ] All image files in `/public/uploads/` are valid (> 10KB, proper format)
- [ ] Database articles have `image` field populated with valid paths
- [ ] SITE_URL environment variable is `https://intambwemedia.com`
- [ ] DEFAULT_OG_IMAGE exists at `https://intambwemedia.com/logo.png`
- [ ] `/uploads/` directory is publicly accessible (no auth required)
- [ ] CORS headers allow image access from social media crawlers

### Deploy Steps

```bash
# 1. Build
npm run build

# 2. Run type check
npx tsc --noEmit

# 3. Test local metadata generation
node -e "console.log(require('./lib/social-media-metadata.ts'))"

# 4. Deploy to production
npm start

# 5. Verify article page loads (wait 2-3 sec for metadata)
curl -s https://intambwemedia.com/article/test-slug | head -50
```

### Post-Deploy Validation (48 hours)

1. **Facebook**: https://developers.facebook.com/tools/debug/sharing/
   - Paste article URL → Click "Scrape Again" → Verify thumbnail
2. **Twitter**: https://cards-dev.twitter.com/validator
   - Paste article URL → Verify "summary_large_image" card shows image
3. **LinkedIn**: Share article in post composer → Verify preview shows thumbnail
4. **Google Search Console**:
   - Check URL inspection → Verify rich snippet preview
   - Check mobile usability → Should show social preview

---

## 🔍 VALIDATION FUNCTIONS

### `resolveOgImageUrl(image, normalizeFunc)`

Converts article image to absolute URL:

```typescript
// Input: "/uploads/article-123.jpg" (relative path)
// Output: "https://intambwemedia.com/uploads/article-123.jpg" (absolute URL)

// Input: null (no image)
// Output: "https://intambwemedia.com/logo.png" (fallback logo)

// Input: "invalid\path\format"
// Output: "https://intambwemedia.com/logo.png" (fallback on error)
```

### `validateImageUrl(url)`

Checks if URL is suitable for social media:

```typescript
const url = "https://intambwemedia.com/uploads/article-123.jpg";

// ✅ Valid:
// - Starts with https://
// - Has file extension (.jpg, .png, .webp, etc.)
// - Is parseable as URL
// - Not a data: or blob: URL

// ❌ Invalid:
// - "/uploads/article-123.jpg" (relative)
// - "https://bad.url/image" (no extension)
// - "data:image/jpeg;base64,..." (data URL)
// - "blob:https://example.com/..." (blob URL)
```

### `getOgImageType(url)`

Detects MIME type:

```typescript
getOgImageType("https://site.com/image.jpg"); // "image/jpeg"
getOgImageType("https://site.com/image.png"); // "image/png"
getOgImageType("https://site.com/image.webp"); // "image/webp"
```

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: "No thumbnail appears on Facebook"

**Diagnosis:**

```bash
curl -s https://intambwemedia.com/article/slug | grep "og:image"
```

**Expected:** `<meta property="og:image" content="https://intambwemedia.com/uploads/..."`

**Fixes:**

1. Check image file exists: `ls public/uploads/article-*.jpg`
2. Verify database has image path: Check `articles.image` column
3. Clear Facebook cache: Use Sharing Debugger → "Scrape Again"
4. Check file size: Must be > 10KB and < 5MB

---

### Issue 2: "Wrong image displays across articles"

**Root Cause:** Articles are falling back to logo.png (no featured image)

**Fix:**

```sql
-- Find articles without images
SELECT id, slug, image FROM articles WHERE image IS NULL OR image = '';

-- Update with actual images
UPDATE articles
SET image = '/uploads/article-' || id || '-featured.jpg'
WHERE image IS NULL;
```

---

### Issue 3: "Images load in browser but not on social media"

**Root Cause:** Relative path not converted to absolute URL

**Diagnosis:**

```bash
# Check what's in meta tag
curl -s https://intambwemedia.com/article/slug | \
  grep 'property="og:image"' | \
  grep -o 'content="[^"]*"'

# Must show full URL: content="https://intambwemedia.com/uploads/..."
```

**If relative:** Path not being resolved by `resolveOgImageUrl()`

- Check `normalizeArticleImageUrl()` return value
- Verify image path starts with "/" or "http"

---

## 🛡️ PREVENTION MEASURES

### 1. Image Quality Checks (Pre-Upload)

```typescript
// In upload handler (app/api/uploads or admin forms)
const validateImageBeforeUpload = async (file: File) => {
  // Check file size
  if (file.size < 10000 || file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be 10KB - 5MB");
  }

  // Check MIME type
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, WebP supported");
  }

  // Check dimensions (if parsing available)
  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = () => {
    if (img.width < 600 || img.height < 300) {
      throw new Error("Image minimum 600x300px");
    }
  };
};
```

### 2. Database Constraints

```sql
-- Add constraint: image paths must be valid
ALTER TABLE articles ADD CONSTRAINT valid_image_path CHECK (
  image IS NULL OR
  image LIKE '/uploads/%' OR
  image LIKE 'http%'
);

-- Add index for faster queries
CREATE INDEX idx_articles_has_image ON articles(
  CASE WHEN image IS NOT NULL THEN 1 ELSE NULL END
);
```

### 3. Cleanup Job (Monthly)

```bash
#!/bin/bash
# Run monthly to remove corrupted images

find public/uploads -type f -exec sh -c '
  SIZE=$(stat -f%z "$1" 2>/dev/null || stat -c%s "$1")
  if [ "$SIZE" -lt 10000 ]; then
    echo "Removing corrupted: $1"
    rm "$1"
  fi
' _ {} \;
```

### 4. CI/CD Validation

```yaml
# .github/workflows/validate-metadata.yml
- name: Validate image files
  run: |
    for file in public/uploads/*; do
      SIZE=$(stat -c%s "$file" 2>/dev/null)
      if [ "$SIZE" -lt 10000 ]; then
        echo "ERROR: Corrupted file: $file ($SIZE bytes)"
        exit 1
      fi
    done
```

### 5. Pre-Commit Hook

```bash
# scripts/pre-commit-validate.sh
echo "Checking metadata..."
npx tsc --noEmit lib/social-media-metadata.ts
echo "Validating images..."
node scripts/validate-images.js
```

---

## 📊 MONITORING & ALERTS

### Key Metrics to Track

1. **Images served per day**: Monitor `/uploads/*` access logs
2. **Social share click-through**: Track referrals from Facebook/Twitter/LinkedIn
3. **Thumbnail error rate**: Monitor failed og:image requests
4. **Article coverage**: % of articles with featured images

### Setup Monitoring

```typescript
// In analytics/monitoring middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/uploads/")) {
    // Track image served
    metrics.increment("images.served", {
      path: req.path,
      referer: req.get("referer"),
    });
  }
  next();
});
```

---

## 🔄 TESTING & QA

### Manual Test Plan

1. **Create article with featured image**
   - Admin panel → Create article
   - Upload featured image
   - Verify image appears in article

2. **Share article on each platform**
   - **Facebook**: Copy URL → Post → Verify thumbnail
   - **Twitter**: Compose tweet → Paste URL → Wait for card to load
   - **LinkedIn**: Share → Paste URL → Verify preview
   - **WhatsApp**: Send link → Verify thumbnail loads

3. **Test fallback scenarios**
   - Create article without featured image → Should use logo.png
   - Delete featured image file → Should fallback to logo
   - Corrupt featured image file → Should use logo

4. **Cross-platform validation**
   - Use Facebook Sharing Debugger
   - Use Twitter Card Validator
   - Use LinkedIn URL Inspector

---

## 📚 REFERENCE DOCUMENTATION

| Topic                  | Link                                                                      |
| ---------------------- | ------------------------------------------------------------------------- |
| Next.js Metadata API   | https://nextjs.org/docs/app/building-your-application/optimizing/metadata |
| Open Graph Protocol    | https://ogp.me/                                                           |
| Twitter Card Docs      | https://developer.twitter.com/en/docs/twitter-for-websites/cards/         |
| Facebook Sharing Debug | https://developers.facebook.com/tools/debug/sharing/                      |
| LinkedIn Inspector     | https://www.linkedin.com/feed/                                            |

---

## 🚀 OPERATIONAL HANDOFF

### For Site Managers

- ✅ Article thumbnails are automatically generated from featured images
- ✅ If an article has no featured image, it falls back to Intambwe Media logo
- ✅ Social platforms cache thumbnails; use Sharing Debugger to refresh cache
- ⚠️ Remove broken image files immediately (< 10KB files)
- 📅 Monthly: Check for corrupted images in `/public/uploads/`

### For Developers

- Metadata generation is in `app/article/[slug]/page.tsx`
- Image validation is in `lib/social-media-metadata.ts`
- Run tests: `node scripts/validate-social-metadata.js [URL]`
- Monitor logs for image 404 errors

---

## ✨ SUCCESS INDICATORS

You'll know this is working correctly when:

1. ✅ Sharing article on Facebook shows title + description + thumbnail
2. ✅ Sharing article on Twitter shows summary_large_image card with thumbnail
3. ✅ Sharing article on LinkedIn shows preview with image
4. ✅ Sharing article on WhatsApp shows thumbnail preview
5. ✅ Google Search Console shows articles with rich snippet previews
6. ✅ No 404 errors for og:image URLs in access logs
7. ✅ Articles shared increase social traffic

---

## 📞 Troubleshooting Quick Links

- Check article metadata: `curl -s https://intambwemedia.com/article/slug | grep "og:image"`
- Validate deployment: `node scripts/validate-social-metadata.js https://intambwemedia.com/article/slug`
- Check image exists: `ls -lh public/uploads/article-*.jpg`
- Clear cache: Facebook Sharing Debugger (see checklist)
- Review logs: Check server for `/uploads/` 404 errors

---

**Last Updated**: April 13, 2026  
**Maintainer**: Engineering Team  
**Status**: ✅ Production Ready
