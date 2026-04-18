# Social Media Thumbnails - Implementation & Deployment Guide
**Date**: April 18, 2026  
**Status**: 🚀 READY FOR DEPLOYMENT  
**Target**: Fix article thumbnail display on Facebook, Twitter, LinkedIn, WhatsApp, Telegram

---

## IMPLEMENTATION SUMMARY

### Changes Made

#### 1. ✅ Enhanced Image URL Validation (`lib/social-media-metadata.ts`)
- Added `validateImageAccessibility()` async function to verify images are accessible to social crawlers
- Performs HTTP HEAD request with bot user-agent
- Returns detailed accessibility report with status code and error details
- Gracefully handles timeouts and network errors

#### 2. ✅ Improved Debug Logging (`lib/social-media-metadata.ts`, `app/article/[slug]/page.tsx`)
- Added `DEBUG_OG_IMAGES` environment flag for production debugging
- Enhanced console logging with timing and detailed status
- Logs each step of image resolution chain:
  - Normalization
  - URL conversion
  - Validation
  - Fallback decisions
- Easy to trace issues in production logs

#### 3. ✅ Publishing Validation Endpoint (`app/api/admin/validate-social-metadata/route.ts`)
**NEW ENDPOINT**: `POST /api/admin/validate-social-metadata`

Validates article has proper social metadata BEFORE publishing:
- Featured image exists and has valid format
- Image path can be normalized correctly
- Image URL can be resolved to absolute HTTPS URL
- Optional: Verifies image is accessible to crawlers
- Checks title and description lengths
- Provides specific issues and warnings

**Usage**:
```bash
# Validate by article ID
curl -X POST https://intambwemedia.com/api/admin/validate-social-metadata \
  -H "Content-Type: application/json" \
  -d '{"articleId": 123, "checkImageAccessibility": true}'

# Validate by slug
curl https://intambwemedia.com/api/admin/validate-social-metadata?slug=article-slug
```

**Response**:
```json
{
  "articleId": 123,
  "slug": "article-slug",
  "isValid": true,
  "issues": [],
  "warnings": ["⚠️ Title is 75 characters, may be truncated"],
  "metadata": {
    "title": "Article Title",
    "titleLength": 75,
    "description": "Article description...",
    "descriptionLength": 150,
    "featuredImage": "article-123.jpeg",
    "normalizedImage": "/uploads/article-123.jpeg",
    "ogImageUrl": "https://intambwemedia.com/uploads/article-123.jpeg"
  }
}
```

---

## PRE-DEPLOYMENT VERIFICATION

### Step 1: Verify Code Changes Compile
```bash
# Build the project
npm run build

# Should complete without errors
# Look for warnings about OG tags
```

### Step 2: Test Image Normalization
```bash
# The regex pattern should match these:
# ✅ article-123.jpeg
# ✅ image-456.png
# ✅ featured-789.webp
# ❌ /uploads/article-123.jpeg (wrong - relative path)
# ❌ null or empty (wrong - no file)
```

### Step 3: Test Local Article Page
```bash
# Start dev server
npm run dev

# Open article page
# http://localhost:3000/article/[any-article-slug]

# View page source and verify:
# <meta property="og:image" content="https://intambwemedia.com/uploads/...jpeg" />
# NOT: <meta property="og:image" content="https://intambwemedia.com/logo.png" />

# Should show actual featured image, not logo
```

### Step 4: Test Validation Endpoint
```bash
# Find a published article ID
psql -c "SELECT id, slug FROM articles LIMIT 1;"

# Test validation endpoint
curl -X POST http://localhost:3000/api/admin/validate-social-metadata \
  -H "Content-Type: application/json" \
  -d '{"articleId": 1, "checkImageAccessibility": false}'

# Should return JSON with metadata validation results
```

### Step 5: Enable Debug Logging
```bash
# In .env.local, add:
DEBUG_OG_IMAGES=true

# Restart dev server
npm run dev

# Now open article page and check logs
# Should see detailed [OG:IMAGE] and [ARTICLE:METADATA] logs
```

---

## DEPLOYMENT STEPS

### Step 1: Update Environment Variables

In Vercel project settings, ensure:
```
DEBUG_OG_IMAGES=false    # Only enable for troubleshooting
NODE_ENV=production
UPLOAD_DIR=/data/uploads # Or your configured path
SITE_URL=https://intambwemedia.com
```

### Step 2: Deploy to Vercel

```bash
# Commit changes
git add -A
git commit -m "fix(social-media): Add image validation and enhanced logging for social thumbnails"

# Push to main branch
git push origin main

# Vercel will auto-deploy
# Monitor: https://vercel.com/dashboard
```

### Step 3: Verify Deployment Success
```bash
# Wait for deployment to complete
# Check: https://intambwemedia.com

# Verify page source has correct og:image
curl -s https://intambwemedia.com/article/[test-article] | \
  grep -A1 'property="og:image"'
# Should show actual image, not logo

# Verify new endpoint works
curl https://intambwemedia.com/api/admin/validate-social-metadata?slug=[test-article]
# Should return validation results
```

---

## POST-DEPLOYMENT TESTING

### Test 1: Facebook Sharing Debugger

1. Go to: https://developers.facebook.com/tools/debug/sharing/
2. Enter article URL: `https://intambwemedia.com/article/[test-article]`
3. Click "Scrape Again"
4. Look at "Preview" section:
   - **Expected**: Featured image thumbnail displayed
   - **NOT Expected**: Logo.png or no image

**If Still Broken**:
```bash
# Enable debugging
curl -s https://intambwemedia.com/api/admin/social-media-debug?slug=[test-article] | jq '.'

# Check:
# - ogImageUrl: Must be HTTPS and absolute
# - imageAccessible: Should be true
# - imageStatusCode: Should be 200
```

### Test 2: Twitter Card Validator

1. Go to: https://cards-dev.twitter.com/validator
2. Enter URL: `https://intambwemedia.com/article/[test-article]`
3. Look at preview:
   - **Expected**: Featured image displayed
   - **NOT Expected**: Logo or broken image

### Test 3: LinkedIn Post Inspector

1. Go to: https://www.linkedin.com/post-inspector/
2. Enter URL: `https://intambwemedia.com/article/[test-article]`
3. Check preview:
   - **Expected**: Featured image shown
   - **NOT Expected**: Generic/default image

### Test 4: WhatsApp Preview

1. Copy article link: `https://intambwemedia.com/article/[test-article]`
2. Share in WhatsApp Web
3. Check preview:
   - **Expected**: Featured image thumbnail
   - **NOT Expected**: No image or wrong image

### Test 5: Telegram Preview

1. Copy article link
2. Send in Telegram
3. Check preview:
   - **Expected**: Featured image shows
   - **NOT Expected**: Broken or generic image

### Test 6: Bot User-Agent Simulation

```bash
# Simulate Facebook crawler
curl -I -H "User-Agent: facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" \
  https://intambwemedia.com/article/[test-article]
# Should return: HTTP 200

# Simulate Twitter bot
curl -I -H "User-Agent: Twitterbot/1.0" \
  https://intambwemedia.com/article/[test-article]
# Should return: HTTP 200

# Verify image is accessible
OG_IMAGE=$(curl -s https://intambwemedia.com/article/[test-article] | \
  grep -oP 'property="og:image"[^>]*content="\K[^"]+')
curl -I "$OG_IMAGE"
# Should return: HTTP 200 with proper Content-Type header
```

---

## TROUBLESHOOTING GUIDE

### Issue: og:image Still Shows logo.png

**Root Cause Check**:
```bash
# 1. Check page source
curl -s https://intambwemedia.com/article/[slug] | grep og:image

# If output is: content="https://intambwemedia.com/logo.png"
# Then featured image not being used - check database:

# 2. Check database
psql -c "SELECT id, slug, image FROM articles WHERE slug='[slug]';"

# If 'image' column is NULL or empty:
# ❌ Article doesn't have featured image set
# Solution: Upload featured image and set on article

# If 'image' has value (e.g., "article-123.jpeg"):
# ❌ Image path normalization failing
# Solution: Enable DEBUG_OG_IMAGES and check logs
```

### Issue: Image Returns HTTP 404

**Diagnosis**:
```bash
# Get og:image URL
OG_IMG=$(curl -s https://intambwemedia.com/article/[slug] | \
  grep -oP 'property="og:image"[^>]*content="\K[^"]+')

# Try to fetch
curl -I "$OG_IMG"

# If HTTP 404:
# File doesn't exist at that location
```

**Solutions**:
1. **Check UPLOAD_DIR Configuration**:
   ```bash
   # In Vercel environment, verify:
   # UPLOAD_DIR is set correctly
   # Volume is mounted correctly
   # Files are in the right directory
   ```

2. **Check File System**:
   ```bash
   # SSH into server and verify:
   ls -la /data/uploads/
   # Should see image files
   
   # Check permissions:
   stat /data/uploads/
   # Should be readable
   ```

3. **Re-upload Image**:
   - Edit article
   - Re-upload featured image
   - Save and publish
   - og:image should now work

### Issue: Image Accessible Locally But Not on Production

**Root Causes**:
1. **Different UPLOAD_DIR**: Dev uses `public/uploads/`, production uses `/data/uploads/`
   - Solution: Set UPLOAD_DIR env var correctly in Vercel

2. **Files Not Synced**: Images uploaded to dev but not production
   - Solution: Re-upload images on production

3. **Firewall/WAF Blocking**: Security rules blocking bot access
   - Solution: Check Cloudflare/firewall rules, whitelist Facebook/Twitter IPs

### Issue: Debugging in Production

**Enable Debug Mode Temporarily**:
```bash
# In Vercel environment variables:
DEBUG_OG_IMAGES=true

# This will add detailed logging to production
# Check logs: vercel logs --since=2h | grep OG:IMAGE

# Disable when done:
DEBUG_OG_IMAGES=false
```

**Check Production Logs**:
```bash
# View recent logs
vercel logs --since=2h

# Search for specific errors
vercel logs --since=2h | grep -i "og:image\|metadata\|image"

# Look for patterns:
# [OG:IMAGE] ✅ indicates success
# [OG:IMAGE] ❌ indicates failure
# [ARTICLE:METADATA] shows metadata generation status
```

---

## INTEGRATION WITH ARTICLE PUBLISHING WORKFLOW

### Option 1: Manual Validation (Recommended for Testing)

Before publishing article, run validation:

```bash
# In admin dashboard or via API
curl -X POST https://intambwemedia.com/api/admin/validate-social-metadata \
  -H "Content-Type: application/json" \
  -d '{"articleId": 123, "checkImageAccessibility": true}'

# Review response
# If isValid == true: Safe to publish
# If isValid == false: Fix issues before publishing
```

### Option 2: Automatic Validation on Publish (Future)

Add validation to publish endpoint:

```typescript
// app/api/admin/articles/[id]/publish/route.ts
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const article = await prisma.article.findUnique({ where: { id: parseInt(id) } });
  
  // Validate social metadata
  const validation = await validateSocialMetadata(article);
  if (!validation.isValid) {
    return NextResponse.json({
      error: 'Article cannot be published without proper social metadata',
      issues: validation.issues,
    }, { status: 400 });
  }
  
  // Proceed with publish
  // ...
}
```

---

## MONITORING & PREVENTION

### Set Up Monitoring

1. **Watch for og:image Fallbacks**:
   - Monitor logs for "[OG:IMAGE] 🔄 Falling back to default logo"
   - Alert on multiple occurrences
   - Action: Investigate which articles are failing

2. **Monitor Image 404 Errors**:
   - Log requests to `/uploads/*` returning 404
   - Alert on surge of 404s
   - Action: Check if files deleted or moved

3. **Monitor Social Crawler Access**:
   - Log access from facebookexternalhit, Twitterbot, LinkedInBot, etc.
   - Verify they can access images (should be HTTP 200)
   - Alert on HTTP 403 or 404 responses to crawlers

### Add Publishing Safeguard

Prevent articles without featured images from being published:

```typescript
// In publish endpoint - add this check
const hasImage = article.image && 
  normalizeArticleImageUrl(article.image) !== null;

if (!hasImage) {
  return NextResponse.json({
    error: 'Article must have featured image before publishing',
  }, { status: 400 });
}
```

### Daily Health Check

Add automated job to verify og:image integrity:

```typescript
// pages/api/cron/verify-og-images.ts
export default async function handler(req: NextRequest) {
  // Get sample of published articles
  const articles = await prisma.article.findMany({
    where: { publishedAt: { not: null } },
    select: { id: true, slug: true, image: true },
    take: 10,
  });
  
  // Verify each og:image URL
  for (const article of articles) {
    const ogImage = resolveOgImageUrl(article.image, normalizeArticleImageUrl);
    const accessible = await validateImageAccessibility(ogImage);
    
    if (!accessible.accessible) {
      console.error(`[HEALTH:CHECK] Article ${article.slug} og:image broken: ${accessible.error}`);
      // Send alert to admin
    }
  }
}
```

---

## ROLLBACK PLAN

If deployment causes issues:

```bash
# 1. Revert code changes
git revert HEAD

# 2. Force deploy previous version
git push origin main
# Vercel will auto-deploy reverted code

# 3. Verify revert
curl -s https://intambwemedia.com/article/[test] | grep og:image
```

**No Data Loss Risk**: All changes are code-only, no database migrations

---

## SUCCESS CRITERIA

### ✅ Deployment Successful If:

1. **Meta Tags Correct**
   ```bash
   curl -s https://intambwemedia.com/article/[slug] | grep -c 'og:image'
   # Output: Should show 1 (one og:image tag)
   
   curl -s https://intambwemedia.com/article/[slug] | \
     grep 'property="og:image"' | grep -v logo.png
   # Should find og:image with actual article image
   ```

2. **Image Accessible**
   ```bash
   OG_IMG=$(curl -s https://intambwemedia.com/article/[slug] | \
     grep -oP 'property="og:image"[^>]*content="\K[^"]+')
   curl -I "$OG_IMG"
   # Should return: HTTP 200 OK
   ```

3. **Social Platforms Show Thumbnail**
   - Facebook: Featured image in preview
   - Twitter: Featured image in card
   - LinkedIn: Featured image in post
   - WhatsApp: Featured image in link preview
   - Telegram: Featured image visible

4. **No Errors in Production Logs**
   ```bash
   vercel logs --since=1h | grep -i error
   # Should be minimal/normal errors
   ```

5. **Validation Endpoint Works**
   ```bash
   curl -s https://intambwemedia.com/api/admin/validate-social-metadata?slug=[slug]
   # Should return valid JSON with validation results
   ```

---

## COMMUNICATION PLAN

### Notify Team After Deployment

```
Subject: Social Media Thumbnails - Fix Deployed

Hi team,

Article featured images should now display correctly when shared on social media (Facebook, Twitter, LinkedIn, WhatsApp, Telegram).

Changes made:
1. Enhanced image validation for social media crawlers
2. Added detailed logging for troubleshooting
3. New validation endpoint for publishing workflow

To verify:
- Open an article on the site
- Share link on Facebook - should show featured image thumbnail
- Check: https://developers.facebook.com/tools/debug/sharing/ (paste article URL)

If issues:
- Check article has featured image uploaded
- Run validation: /api/admin/validate-social-metadata?slug=article-slug
- Contact: [dev team contact]

Thanks!
```

---

## SUPPORT CONTACTS

- **Deployment Issues**: DevOps team
- **Database Questions**: DBA
- **Image Storage**: Infrastructure team
- **Social Media Integration**: Marketing/Communications
- **Code Issues**: Engineering lead

---

## APPENDIX: FILE CHANGES

### Files Modified:
1. `lib/social-media-metadata.ts` - Enhanced validation
2. `app/article/[slug]/page.tsx` - Better logging

### Files Created:
1. `app/api/admin/validate-social-metadata/route.ts` - New validation endpoint

### No Database Changes Required

---

**Status**: 🟢 READY FOR DEPLOYMENT  
**Estimated Impact**: Zero downtime, backward compatible  
**Risk Level**: 🟢 LOW (code-only changes, no breaking changes)  
**Rollback Time**: < 5 minutes
