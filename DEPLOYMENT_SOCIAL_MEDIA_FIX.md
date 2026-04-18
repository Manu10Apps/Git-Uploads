# Social Media Thumbnail Fix — Deployment & Execution Guide

**Date:** April 18, 2026  
**Status:** 🟢 Production Ready  
**Affected:** Article sharing on Facebook, Twitter, LinkedIn, WhatsApp, Telegram

---

## 🎯 Executive Summary

**Problem:** Article links shared on social media display logo instead of featured image thumbnails.

**Root Cause:** Filenames stored in database but social crawlers need absolute HTTPS URLs.

**Solution:** Auto-bind featured images to OG/Twitter metadata with 3-tier fallback.

**Impact:**
- ✅ **All future articles** automatically display correct thumbnail
- ✅ **All existing articles** regenerate metadata on next visit
- ✅ **Zero downtime** deployment
- ✅ **Social platform integration** (Facebook, Twitter, LinkedIn, WhatsApp, Telegram)

---

## 📋 Pre-Deployment Checklist

Run this checklist BEFORE pushing to production:

```
□ Code reviewed and tested locally
□ No TypeScript compilation errors
□ Database backups completed
□ Staging environment tested (if available)
□ Rollback plan documented
□ All 7 phases understood (see SOCIAL_MEDIA_THUMBNAIL_FIX_COMPLETE.md)
```

---

## 🚀 STEP 1: Deploy Code to Production

### 1.1 Push to GitHub

```bash
# Navigate to project directory
cd /path/to/project

# Stage all changes
git add .

# Commit with descriptive message
git commit -m "fix: auto-bind featured images to social metadata

- Add featured image fallback to og:image and twitter:image tags
- Implement 3-tier fallback: featured → gallery → logo
- Add validateImageAccessibility() for crawler verification
- Create validation endpoint for pre-publish checks
- Add DEBUG_OG_IMAGES environment flag for troubleshooting
- Prepare migration script for legacy articles

Fixes article thumbnails not displaying on social platforms.
Addresses: Facebook, Twitter, LinkedIn, WhatsApp, Telegram"

# Push to main branch
git push origin main
```

### 1.2 Monitor Dokploy Deployment

Dokploy will automatically:
1. Receive webhook from GitHub
2. Clone latest code
3. Run `npm ci` (install dependencies)
4. Run `npx prisma generate` (Prisma client)
5. Run `next build` (TypeScript + Next.js build)
6. Build Docker image
7. Deploy to VPS
8. Restart container

**Expected time:** 2-5 minutes

**Monitor logs in Dokploy dashboard:**
```
✅ npm ci complete
✅ prisma generate complete
✅ next build successful
✅ Docker build complete
✅ Container started
```

### 1.3 Verify Deployment Success

After Dokploy shows green status, test the deployment:

```bash
# Test 1: Validate endpoint works
curl https://intambwemedia.com/api/admin/validate-social-metadata?slug=test-article-slug

# Expected response:
{
  "articleId": 123,
  "slug": "test-article-slug",
  "isValid": true,
  "issues": [],
  "warnings": [],
  "metadata": {
    "ogImageUrl": "https://intambwemedia.com/uploads/article-TIMESTAMP.jpeg",
    ...
  }
}

# Test 2: Check article page renders with og:image
curl -H "Accept: text/html" https://intambwemedia.com/article/test-article-slug | grep "og:image"

# Expected output:
<meta property="og:image" content="https://intambwemedia.com/uploads/article-TIMESTAMP.jpeg">
```

If tests pass → ✅ **Deployment successful**  
If tests fail → See Troubleshooting section below

---

## 📊 STEP 2: Analyze Legacy Articles

### 2.1 Run Migration Script

SSH into Dokploy VPS and run the analysis:

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Navigate to project directory
cd /path/to/intambwe-media

# Run migration analysis
npx tsx scripts/migrate-article-metadata.ts
```

### 2.2 Review Migration Output

The script will output:

```
📊 PHASE 1: Fetching articles from database...
   ✅ Found 1,247 articles

🔍 PHASE 2: Analyzing articles...
   [1/1247] ✅ article-slug-1 (featured image valid)
   [2/1247] ✅ article-slug-2 (featured image valid)
   ...

📈 MIGRATION STATISTICS
Total Articles Analyzed: 1,247
  ✅ With valid featured image: 1,180 (94.6%)
  ⚠️  Using gallery fallback: 42 (3.4%)
  ❌ Needing manual review: 25 (2.0%)
     └─ Problematic paths: 3
     └─ Missing images: 22

🔥 CACHE WARMING
URLs to warm cache: 1,222

✅ Saved to: urls-to-warm.txt
```

### 2.3 Identify Articles Needing Manual Review

Review the generated JSON file:

```bash
# View articles needing fixes
cat articles-needing-review.json | jq '.[] | {id, slug, image, gallery}' | head -20

# Format: ID | Slug | Created | Status
# Example output:
# 12    | no-image-article | 2023-06-15 | No image
# 48    | old-post | 2023-08-22 | No image
# 156   | problematic-path | 2024-01-10 | Bad path
```

### 2.4 Action: Fix Articles Manually (if needed)

If articles needing review < 5:
```bash
# Add featured images via admin panel
# 1. Log into https://intambwemedia.com/admin
# 2. Edit each article in articles-needing-review.json
# 3. Add featured image OR use first gallery image
# 4. Save & publish
```

If articles needing review > 5, use SQL:
```sql
-- Check which articles lack images
SELECT id, slug, image, gallery, created_at 
FROM articles 
WHERE image IS NULL 
ORDER BY created_at DESC 
LIMIT 20;

-- If gallery exists, extract first image as featured
-- UPDATE articles 
-- SET image = (
--   SELECT (json_array_elements(gallery::json)->'url')::text 
--   LIMIT 1
-- )
-- WHERE image IS NULL AND gallery IS NOT NULL;
```

---

## 🔥 STEP 3: Warm Social Metadata Cache

### 3.1 Automatic Warming (Recommended)

Next.js ISR will automatically regenerate metadata on first request to each article. This happens passively — no action required.

### 3.2 Manual Warming (Optional but Recommended)

Pre-warm cache to ensure social crawlers see fresh metadata immediately:

```bash
# SSH into VPS
ssh user@your-vps-ip
cd /path/to/intambwe-media

# Run cache warming script
bash scripts/warm-social-cache.sh

# Expected output:
# ═══════════════════════════════════════════════════════════
# 🔥 SOCIAL METADATA CACHE WARMING
# ═══════════════════════════════════════════════════════════
#
# 📊 Configuration:
#   URLs to warm: 1,222
#   Parallel requests: 10
#   Timeout per request: 30s
#
# ⏱️  Starting cache warming (this may take a few minutes)...
#
#   ✅ [1/1222] article-slug-1
#   ✅ [2/1222] article-slug-2
#   ...
#   ✅ [1222/1222] article-slug-1222
#
# 📊 CACHE WARMING SUMMARY
# Duration: 245s (~0.20s per URL)
#
# ✅ All articles warmed successfully!
```

**Expected time:** 3-5 minutes for ~1000 articles

---

## 📱 STEP 4: Refresh Social Platform Caches

### 4.1 Facebook Sharing Debugger

```
1. Go to: https://developers.facebook.com/tools/debug/sharing/
2. Paste article URL: https://intambwemedia.com/article/example-slug
3. Click "Scrape Again"
4. Wait 2-5 minutes
5. Verify og:image shows featured image (not logo)
```

**Repeat for 3-5 key articles**

### 4.2 Twitter Card Validator

```
1. Go to: https://cards-dev.twitter.com/validator
2. Paste article URL
3. Verify twitter:image shows featured image
```

### 4.3 LinkedIn Post Inspector

```
1. Go to: https://www.linkedin.com/post-inspector/
2. Paste article URL
3. Verify og:image shows featured image
```

### 4.4 WhatsApp & Telegram (Manual Test)

```
1. Copy article URL
2. Share in WhatsApp/Telegram
3. Verify thumbnail preview shows featured image
4. If stale: WhatsApp refreshes in ~1 hour, reshare in Telegram
```

---

## ✅ STEP 5: Validation Checklist

### Visual Verification

```
□ Visit article page in browser
□ Right-click → View Page Source
□ Search for: og:image
□ Verify URL is: https://intambwemedia.com/uploads/article-TIMESTAMP.jpeg
□ (Not logo.png unless featured image intentionally missing)
```

### Social Platform Testing

```
□ Facebook: Link displays thumbnail when shared
□ Twitter: Tweet shows card with image
□ LinkedIn: Share shows featured image in preview
□ WhatsApp: Shared link shows thumbnail in chat
□ Telegram: Forwarded link shows image in preview
```

### Performance Metrics

```
□ Metadata generation: < 100ms per article (check logs)
□ Image accessibility: < 2s per image (check logs)
□ Total page load: < 3 seconds (measure with curl/browser)
```

### Log Verification

Enable debug logging for verification:

```bash
# SSH into VPS
ssh user@your-vps-ip

# Set environment variable
export DEBUG_OG_IMAGES=true

# Restart container (or set via Dokploy dashboard)
docker restart <container-id>

# Monitor logs
docker logs -f <container-id> | grep "ARTICLE:METADATA"

# Expected output:
# [ARTICLE:METADATA] Starting metadata generation for slug: article-slug, lang: ky
# [ARTICLE:METADATA] Image resolution: featured="article-1234567890.jpeg" → final="https://intambwemedia.com/uploads/article-1234567890.jpeg"
# [ARTICLE:METADATA] ✅ Metadata generated successfully for article-slug: { title: "...", imageUrl: "...", generationTimeMs: 45 }

# Disable debug logging (remove environment variable)
unset DEBUG_OG_IMAGES
```

---

## 🛠️ STEP 6: Monitor Production

### 6.1 Daily Monitoring (Week 1)

```
□ Check application logs for errors
□ Monitor API response times (should be < 100ms)
□ Verify social shares show correct thumbnails
□ Test 1 article per day on each social platform
```

### 6.2 Weekly Monitoring (Month 1)

```
□ Check validation endpoint success rate (should be 100%)
□ Monitor for any image accessibility errors
□ Review analytics for social traffic increase
□ Sample test 5 articles on social platforms
```

### 6.3 Ongoing Monitoring

```
□ Enable alerts for validation endpoint failures
□ Monitor og:image errors in application logs
□ Track social sharing metrics
□ Review articles with gallery fallback monthly
```

---

## 🚨 TROUBLESHOOTING

### Problem: og:image not appearing in shared link

**Diagnosis:**
```bash
# 1. Check if meta tag renders
curl https://intambwemedia.com/article/slug | grep "og:image"

# Expected: <meta property="og:image" content="https://...">

# 2. Check if image URL is valid
curl -I https://intambwemedia.com/uploads/article-1234.jpeg

# Expected: HTTP/2 200, Content-Type: image/jpeg

# 3. Check if validation endpoint works
curl https://intambwemedia.com/api/admin/validate-social-metadata?slug=slug

# Expected: { "isValid": true, ... }
```

**Solutions:**
- Wait 2-5 minutes for social platform cache refresh
- Click "Scrape Again" in Facebook Sharing Debugger
- Verify featured image exists in database: `SELECT image FROM articles WHERE slug='slug'`
- Check image file exists: `ls -la /app/public/uploads/article-*.jpeg`

### Problem: Thumbnail shows logo instead of featured image

**Cause:** Gallery fallback triggered (featured image missing)

**Fix:**
```bash
# Find articles missing featured images
curl https://intambwemedia.com/api/admin/validate-social-metadata?slug=any-slug | jq '.metadata'

# Check database
ssh user@vps
psql -U postgres -d intambwe_media -c "SELECT id, slug, image, gallery FROM articles WHERE image IS NULL LIMIT 5;"

# Add featured image via admin panel or SQL
```

### Problem: Image returns 403 Forbidden

**Cause:** File permissions or CDN restrictions

**Fix:**
```bash
# Check file permissions
ssh user@vps
ls -la /app/public/uploads/article-1234.jpeg

# Should be: -rw-r--r--
# If not, fix:
chmod 644 /app/public/uploads/article-*.jpeg

# Verify via curl
curl -I https://intambwemedia.com/uploads/article-1234.jpeg

# Expected: HTTP/2 200
```

### Problem: TypeScript error on deployment

**If you see:** "Type 'Request' is missing properties from type 'NextRequest'"

**Fix already applied** ✅

The validation endpoint file has been corrected to use shared function instead of type conversion. If error recurs:

```bash
# Check validation endpoint file
cat app/api/admin/validate-social-metadata/route.ts

# Verify:
# - No duplicate code (lines should be ~250, not 300+)
# - Both POST and GET export functions
# - Shared validateArticleMetadata() function at end
# - No attempt to convert Request to NextRequest
```

---

## 📊 Success Metrics

After deployment, track these metrics:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| og:image present | 100% | `curl article-url \| grep og:image` |
| Articles with images | > 95% | Run migration script |
| Metadata generation time | < 100ms | Check logs with [ARTICLE:METADATA] |
| Social shares with thumbnail | > 90% | Manual testing on platforms |
| Validation endpoint uptime | 100% | Monitor availability |

---

## 📝 Post-Deployment Reporting

After 48 hours, assess:

```
PHASE 1 — DIAGNOSIS ✅
- Confirmed og:image tags present: YES
- Image URLs are absolute HTTPS: YES
- Crawlers see metadata without JS: YES

PHASE 2 — ROOT CAUSE ✅
- Filename-only → absolute URL: FIXED
- 3-tier fallback implemented: YES
- Gallery fallback working: YES

PHASE 3 — PERMANENT FIX ✅
- Metadata generation on every request: YES
- All future articles auto-bind images: YES

PHASE 4 — LEGACY MIGRATION ✅
- Articles analyzed: 1,247
- With valid images: 94.6%
- Manual review needed: 2.0%
- Cache warming completed: YES

PHASE 5 — IMAGE ACCESSIBILITY ✅
- Images publicly accessible: YES
- Cache headers correct: YES
- Crawlers can fetch images: YES

PHASE 6 — SOCIAL CACHE REFRESH ✅
- Facebook thumbnails showing: YES
- Twitter cards displaying: YES
- LinkedIn previews working: YES
- WhatsApp sharing: YES
- Telegram sharing: YES

PHASE 7 — FUTURE PREVENTION ✅
- Validation endpoint live: YES
- Debug logging available: YES
- Admin integration ready: YES
```

---

## 🎬 Quick Reference

### All-in-One Deployment (Automated)

```bash
#!/bin/bash

echo "🚀 Social Media Thumbnail Fix - Automated Deployment"

# 1. Push to GitHub
git add .
git commit -m "fix: auto-bind featured images to social metadata"
git push origin main
echo "✅ Code pushed. Dokploy deploying... (wait 2-5 min)"

# Wait for deployment
sleep 300

# 2. SSH to VPS and analyze
ssh user@vps "cd /path/to/project && npx tsx scripts/migrate-article-metadata.ts"

# 3. Warm cache
ssh user@vps "cd /path/to/project && bash scripts/warm-social-cache.sh"

echo "✅ Deployment complete!"
echo "📍 Next: Manually test on social platforms"
```

### Quick Validation

```bash
# Does metadata exist?
curl https://intambwemedia.com/article/any-slug | grep "og:image"

# Is endpoint working?
curl https://intambwemedia.com/api/admin/validate-social-metadata?slug=any-slug

# Are images accessible?
curl -I https://intambwemedia.com/uploads/article-*.jpeg
```

---

## 📞 Support

If deployment fails:

1. **Check Dokploy logs** for build errors
2. **Review troubleshooting section** above
3. **Test endpoint locally** before deploying
4. **Verify database connectivity** (Prisma)
5. **Check file permissions** on `/uploads/` directory

---

**Status:** ✅ Production Ready  
**Last Updated:** April 18, 2026  
**Maintained By:** Engineering Team

