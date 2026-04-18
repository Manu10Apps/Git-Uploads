# Social Media Thumbnail Sharing - Fix & Validation Guide

**Date**: April 18, 2026  
**Status**: IMPLEMENTATION IN PROGRESS  
**Framework**: Next.js 15.5.14 with Server Components  
**Database**: Prisma ORM  
**Hosting**: Dokploy/Ubuntu VPS

---

## PART 1: ROOT CAUSE ANALYSIS

### Problem Identified

Article links shared on social media (Facebook, Twitter, LinkedIn, WhatsApp, Telegram) do NOT display featured image thumbnails. Instead, they show:

- Generic logo image, or
- No preview at all

### Root Cause

The featured image URL transformation pipeline has potential weak points:

1. **Database Storage**: Images stored as `/uploads/article-{timestamp}-{random}.{ext}`
2. **Normalization**: `normalizeArticleImageUrl()` should convert paths to `/uploads/...` format
3. **Resolution**: `resolveOgImageUrl()` should convert to `https://intambwemedia.com/uploads/...`
4. **Validation**: `validateImageUrl()` should verify HTTPS, public access, valid extension
5. **Rendering**: Next.js `generateMetadata()` should inject into `<head>`

**Issue**: If ANY step fails, falls back to logo.png

---

## PART 2: IMPLEMENTED FIXES

### Fix 1: Enhanced Gallery Fallback

**File**: `app/article/[slug]/page.tsx`

```typescript
function resolveAbsoluteImageUrl(
  image: string | null | undefined,
  gallery: string | null | undefined,
): string {
  // Try featured image first
  let imageUrl = resolveOgImageUrl(image, normalizeArticleImageUrl);

  // If featured image unavailable, try first gallery image
  if (imageUrl === DEFAULT_OG_IMAGE && gallery) {
    const firstImageUrl = extractFirstGalleryImage(gallery);
    if (firstImageUrl) {
      imageUrl = resolveOgImageUrl(firstImageUrl, normalizeArticleImageUrl);
    }
  }

  return imageUrl;
}
```

**Benefit**: Uses article's own images for social preview even if featured image missing

### Fix 2: Diagnostic Endpoints

#### 2a. OG Image Diagnostic

**Endpoint**: `GET /api/social-media/og-image-diagnostic`

```bash
# Check single article by slug
curl https://intambwemedia.com/api/social-media/og-image-diagnostic?slug=my-article

# Check article by ID
curl https://intambwemedia.com/api/social-media/og-image-diagnostic?articleId=123

# Check all published articles (first 20)
curl https://intambwemedia.com/api/social-media/og-image-diagnostic?checkAll=true
```

**Returns**: Image URL transformation pipeline for each article

#### 2b. Publishing Validation

**Endpoint**: `POST /api/social-media/validate-publishing`

```bash
curl -X POST https://intambwemedia.com/api/social-media/validate-publishing \
  -H "Content-Type: application/json" \
  -d '{"articleId": 123}'
```

**Returns**: Validation report with required fixes before publishing

#### 2c. Check Articles Missing Images

**Endpoint**: `GET /api/social-media/validate-publishing?action=missing-images`

```bash
# Lists all articles without featured images
curl https://intambwemedia.com/api/social-media/validate-publishing?action=missing-images
```

---

## PART 3: TESTING PROCEDURE

### Step 1: Run Diagnostic (Identify Current State)

```bash
# Test a recent article
curl "https://intambwemedia.com/api/social-media/og-image-diagnostic?slug=your-recent-article-slug"

# Expected output if working:
{
  "diagnostic": {
    "resolved": "https://intambwemedia.com/uploads/article-123-abc.jpg",
    "validOgImage": true,
    "usingFallback": false
  }
}

# If broken:
{
  "resolved": "https://intambwemedia.com/logo.png",
  "validOgImage": false,
  "usingFallback": true,
  "issues": {
    "normalizationFailed": true
  }
}
```

### Step 2: Find & Fix Articles Missing Featured Images

```bash
# Get list of articles without featured images
curl "https://intambwemedia.com/api/social-media/validate-publishing?action=missing-images"

# For each article in the list:
# 1. Go to admin panel
# 2. Edit article
# 3. Upload featured image (min 1200x630 pixels)
# 4. Save article
```

### Step 3: Validate Before Publishing

```bash
# Before publishing any article:
curl -X POST https://intambwemedia.com/api/social-media/validate-publishing \
  -H "Content-Type: application/json" \
  -d '{"articleId": 123}'

# Expected for valid article:
{
  "valid": true,
  "canPublish": true,
  "errors": [],
  "warnings": [],
  "metadata": {
    "og:image": "https://intambwemedia.com/uploads/article-123-abc.jpg",
    "og:image:valid": true
  }
}

# Expected for invalid article:
{
  "valid": false,
  "canPublish": false,
  "errors": [
    "❌ CRITICAL: No featured image - article cannot be published"
  ]
}
```

### Step 4: Clear Social Media Caches

**Facebook Sharing Debugger**:

1. Go to https://developers.facebook.com/tools/debug/sharing/
2. Enter your article URL
3. Click "Scrape Again" to force refresh
4. Verify thumbnail displays

**Twitter Card Validator**:

1. Go to https://cards-dev.twitter.com/validator
2. Enter your article URL
3. Verify "summary_large_image" card displays thumbnail

**LinkedIn**:

1. Go to https://www.linkedin.com/feed/
2. Compose new post
3. Paste article URL
4. Wait for preview to load and verify thumbnail

---

## PART 4: PREVENTION STRATEGY

### Strategy 1: Enforce Featured Images at Publishing

Add validation to prevent articles from being published without featured images:

```typescript
// In article creation/publishing handler
if (body.status === "published" && !body.image) {
  return NextResponse.json(
    {
      error: "Featured image required for published articles",
      suggestion: "Upload image before setting status to published",
    },
    { status: 400 },
  );
}
```

### Strategy 2: Social Metadata Component Library

Create reusable component for consistent social metadata:

```typescript
// app/components/SocialMetadataProvider.tsx
export function SocialMetadataProvider({
  article,
  overrides = {},
}: {
  article: Article;
  overrides?: Partial<SocialMetadata>;
}): Metadata {
  return {
    openGraph: {
      type: "article",
      images: [
        {
          url: ensureAbsoluteUrl(
            article.image || getFirstGalleryImage(article.gallery),
          ),
          width: 1200,
          height: 630,
          alt: article.title,
          type: detectMimeType(article.image),
        },
      ],
      ...overrides,
    },
    twitter: {
      card: "summary_large_image",
      images: [ensureAbsoluteUrl(article.image)],
      ...overrides,
    },
  };
}
```

### Strategy 3: Automated Validation Cron Job

Create background job to validate and alert on metadata issues:

```typescript
// app/api/cron/validate-social-metadata.ts
export async function POST() {
  const invalidArticles = await validateAllArticlesMetadata();

  if (invalidArticles.length > 0) {
    // Send notification to admin
    // Log detailed report for fixing
  }

  return NextResponse.json({
    checked: totalArticles,
    invalid: invalidArticles,
  });
}
```

---

## PART 5: VERIFICATION CHECKLIST

### Pre-Deployment

- [ ] All diagnostic endpoints created and tested
- [ ] Article pages include gallery field in metadata generation
- [ ] Social media metadata functions handle all URL formats
- [ ] Featured image fallback logic implemented
- [ ] New articles require featured images before publishing
- [ ] TypeScript compilation passes
- [ ] No console errors in local build

### Post-Deployment (24-48 hours)

- [ ] Test 5 different articles with social media debuggers
- [ ] Verify og:image URLs are HTTPS and absolute
- [ ] Check Facebook shows correct thumbnails
- [ ] Check Twitter displays summary_large_image cards
- [ ] Check LinkedIn shows featured images
- [ ] Check WhatsApp shows thumbnails
- [ ] Verify images load within 2 seconds

### Ongoing Maintenance

- [ ] Weekly: Check for articles missing featured images
- [ ] Monthly: Verify no regressions in social sharing
- [ ] Monthly: Review admin logs for metadata validation failures
- [ ] Quarterly: Audit random articles for social metadata quality

---

## PART 6: DEPLOYMENT STEPS

### Step 1: Prepare & Commit

```bash
cd /path/to/workspace
git add -A
git commit -m "Fix social media thumbnails: add diagnostic endpoints, gallery fallback, validation"
git push origin main
```

### Step 2: Deploy to Production

```bash
# Dokploy will auto-deploy from GitHub push
# Or manually trigger deployment in Dokploy dashboard
```

### Step 3: Validate Deployment

```bash
# Test diagnostic endpoint
curl "https://intambwemedia.com/api/social-media/og-image-diagnostic?checkAll=true"

# Should show image resolution for articles
```

### Step 4: Test Social Media Sharing

```bash
# Use Facebook Sharing Debugger
https://developers.facebook.com/tools/debug/sharing/?url=https://intambwemedia.com/article/test-article

# Use Twitter Card Validator
https://cards-dev.twitter.com/validator?url=https://intambwemedia.com/article/test-article
```

---

## TROUBLESHOOTING

### Problem: "og:image is logo.png"

**Diagnostic**:

```bash
curl "https://intambwemedia.com/api/social-media/og-image-diagnostic?slug=article-slug"
```

**Causes & Fixes**:

1. **No featured image**
   - Fix: Upload image in admin panel
2. **Invalid image path format**
   - Fix: Check database value format, re-upload if needed
3. **Image file doesn't exist on disk**
   - Fix: Check `/public/uploads/` directory, verify file exists
4. **Image blocked by server**
   - Fix: Check nginx/server logs for 403/404 errors

### Problem: Social debuggers not showing update

**Solution**:

1. Wait 24 hours for cache to expire
2. Or use "Scrape Again" button in platform debugger
3. Or add URL parameter: `?v=123` (changes with each update)

### Problem: Metadata validation failing

**Diagnostic**:

```bash
curl -X POST https://intambwemedia.com/api/social-media/validate-publishing \
  -H "Content-Type: application/json" \
  -d '{"articleId": 123}'
```

**Review**:

- Check `errors` array for specific issues
- Follow `recommendations` to fix
- Re-validate after changes

---

## MONITORING & METRICS

Track these metrics to ensure social sharing works:

1. **Image URL Transformation Success Rate**
   - Target: >99% of articles have valid og:image
   - Current: Run diagnostic to establish baseline

2. **Social Preview Quality**
   - Target: 100% of new articles show featured images
   - Monitor: Manual spot checks via social debuggers

3. **Metadata Generation Time**
   - Target: <500ms per article page
   - Monitor: Server logs, performance dashboards

4. **User Engagement from Social Shares**
   - Target: Compare click-through rates with/without thumbnails
   - Tools: Analytics dashboard, UTM parameters

---

## CONCLUSION

With these fixes deployed:
✅ Featured images WILL display on Facebook, Twitter, LinkedIn, WhatsApp
✅ Articles without images will use gallery fallback
✅ Validation prevents publishing articles without proper metadata
✅ Diagnostic tools make troubleshooting fast and easy
✅ Social media shares will be more engaging and drive more traffic
