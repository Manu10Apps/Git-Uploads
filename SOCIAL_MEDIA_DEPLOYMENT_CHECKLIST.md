# Social Media Thumbnails - Deployment & Validation Checklist

**Last Updated**: April 13, 2026  
**Status**: Ready for Production Deployment  
**Framework**: Next.js 15.5.14 (App Router)  
**Image CDN**: `/public/uploads/` (nginx static serving)

---

## 1. DEPLOYMENT CHECKLIST

### Pre-Deployment Verification

- [ ] Verify all image files in `/public/uploads/` are > 5KB
  ```bash
  find public/uploads -type f -exec du -b {} + | awk '$1 < 5120 {print $2}'
  ```
- [ ] Confirm SITE_URL in metadata is correct: `https://intambwemedia.com`
- [ ] Validate DEFAULT_OG_IMAGE exists: `https://intambwemedia.com/logo.png`
- [ ] Check article images are stored in normalized paths: `/uploads/article-*.{jpg,png,webp}`

### Build & Deployment

- [ ] Rebuild Next.js: `npm run build`
- [ ] Verify no TypeScript errors in metadata files
- [ ] Deploy to production environment
- [ ] Confirm `/uploads/` endpoint is accessible publicly
- [ ] Test article page loads correctly at `https://intambwemedia.com/article/[slug]`

### Post-Deployment Validation (24-48 hours)

- [ ] **Facebook**: Share article link on Facebook Sharing Debugger
  - URL: https://developers.facebook.com/tools/debug/sharing/
  - Expected: Thumbnail displays with correct og:image
- [ ] **Twitter**: Check article preview on Twitter Card Validator
  - URL: https://cards-dev.twitter.com/validator
  - Expected: summary_large_image card with image
- [ ] **LinkedIn**: Test article sharing on LinkedIn
  - Share article from intambwemedia.com
  - Expected: Thumbnail preview shows featured image

- [ ] **WhatsApp**: Share article via WhatsApp Web
  - Expected: Thumbnail preview displays correctly

- [ ] **Google Search**: Verify in Google Search Console
  - Check: URL inspection → Mobile usability → Rich preview

---

## 2. TECHNICAL VALIDATION

### Metadata Generation Flow

```
Article Slug (params)
     ↓
getArticleBySlug() → Database Query
     ↓
article.image (raw value: /uploads/article-123.jpg)
     ↓
normalizeArticleImageUrl() → Validates & normalizes path
     ↓
resolveOgImageUrl() → Converts to absolute URL
     ↓
validateImageUrl() → Verifies URL is publicly accessible
     ↓
Final OG Image: https://intambwemedia.com/uploads/article-123.jpg
     ↓
generateMetadata() → Injects into <head>
```

### Required Meta Tags (Verify in HTML)

Each article page MUST contain:

```html
<!-- OpenGraph Tags -->
<meta property="og:type" content="article" />
<meta property="og:url" content="https://intambwemedia.com/article/[slug]" />
<meta property="og:title" content="[Article Title]" />
<meta property="og:description" content="[160 chars max]" />
<meta property="og:image" content="https://intambwemedia.com/uploads/[image]" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/jpeg|image/png|image/webp" />
<meta property="og:site_name" content="Intambwe Media" />

<!-- Twitter Card Tags -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@intambwemedias" />
<meta name="twitter:title" content="[Article Title]" />
<meta name="twitter:description" content="[160 chars max]" />
<meta
  name="twitter:image"
  content="https://intambwemedia.com/uploads/[image]"
/>

<!-- Canonical URL -->
<link rel="canonical" href="https://intambwemedia.com/article/[slug]" />
```

### Test Command (Verify Tags Are Present)

```bash
# Test a recent article
ARTICLE_SLUG="your-recent-article"
curl -s https://intambwemedia.com/article/$ARTICLE_SLUG | grep -E "(og:image|og:description|twitter:image)" | head -10
```

Expected output:

```html
<meta property="og:image" content="https://intambwemedia.com/uploads/...jpg" />
<meta property="og:description" content="..." />
<meta name="twitter:image" content="https://intambwemedia.com/uploads/...jpg" />
```

---

## 3. CACHE CLEARING & SOCIAL MEDIA REFRESH

### Clear Social Media Platform Caches

After deployment, force platforms to re-fetch metadata:

#### **Facebook Sharing Debugger**

```
1. Go to: https://developers.facebook.com/tools/debug/sharing/
2. Enter article URL: https://intambwemedia.com/article/[slug]
3. Click "Scrape Again"
4. Verify image displays in preview
```

#### **Twitter Card Validator**

```
1. Go to: https://cards-dev.twitter.com/validator
2. Enter article URL: https://intambwemedia.com/article/[slug]
3. Click "Validate Card"
4. Verify "summary_large_image" card shows thumbnail
```

#### **LinkedIn URL Inspector**

```
1. Go to: https://www.linkedin.com/feed/
2. Type article URL in post composer
3. Wait for preview to load
4. Verify thumbnail displays
```

#### **Pinterest Inspector**

```
1. Go to: https://developers.pinterest.com/tools/url-debugger/
2. Enter article URL
3. Verify "rich" pin detection
```

---

## 4. IMAGE VALIDATION RULES

### Minimum Image Requirements

| Requirement       | Value                                  |
| ----------------- | -------------------------------------- |
| **Format**        | JPG, PNG, or WebP                      |
| **Minimum Size**  | 1200x630px                             |
| **Aspect Ratio**  | 1.9:1 (for quality preview)            |
| **File Size**     | 5KB - 5MB                              |
| **URL Type**      | Absolute HTTPS URL                     |
| **Accessibility** | Publicly accessible (no auth required) |

### Image Health Check

```bash
# Check all article images are valid files
ls -lh public/uploads/article-* | awk '{if ($5 < "5K") print "ERROR:", $9, $5}'

# Check file MIME types
file public/uploads/article-*.jpg
file public/uploads/article-*.png
file public/uploads/article-*.webp
```

---

## 5. AUTOMATED VALIDATION (Prevent Future Issues)

### Add to CI/CD Pipeline

Create `.github/workflows/validate-metadata.yml`:

```yaml
name: Validate Social Media Metadata

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Check image files exist
        run: |
          # Verify images in database actually exist
          node scripts/validate-images.js

      - name: Validate metadata generation
        run: |
          # Run TypeScript type check
          npx tsc --noEmit

          # Check social-media-metadata.ts exports
          node -e "
            const { resolveOgImageUrl, validateImageUrl } = require('./lib/social-media-metadata');
            console.log('✅ Metadata functions exported correctly');
          "

      - name: Lint metadata files
        run: npx eslint lib/social-media-metadata.ts app/article/[slug]/page.tsx
```

### Add Pre-Commit Hook

Create `scripts/pre-commit-validate-images.sh`:

```bash
#!/bin/bash
echo "Validating article images..."

# Check no corrupted images (< 5KB)
CORRUPTED=$(find public/uploads -type f -exec du -b {} + | awk '$1 < 5120 {print "❌", $2}')

if [ -n "$CORRUPTED" ]; then
  echo "Found corrupted images:"
  echo "$CORRUPTED"
  exit 1
fi

echo "✅ All images are valid"
exit 0
```

Register in `.husky/pre-commit`:

```bash
./scripts/pre-commit-validate-images.sh
```

---

## 6. MONITORING & ALERTS

### Track Social Media Sharing Clicks

Add analytics tracking to article pages:

```typescript
// app/article/[slug]/ArticlePageClient.tsx
useEffect(() => {
  const trackSocialShare = (platform: string) => {
    // Track via analytics
    window.gtag?.event("social_share", {
      platform,
      article_id: article.id,
      timestamp: new Date().toISOString(),
    });
  };

  // Track if article came from social media referrer
  if (
    document.referrer.includes("facebook") ||
    document.referrer.includes("twitter") ||
    document.referrer.includes("linkedin")
  ) {
    trackSocialShare(new URL(document.referrer).hostname);
  }
}, []);
```

### Monthly Validation Report

Create `scripts/social-media-health-check.js`:

```javascript
// Run monthly to verify:
// 1. All article images are < 5MB
// 2. No broken image URLs in metadata
// 3. Open Graph tags are present
// 4. Twitter Card format is correct

const results = {
  totalArticles: 0,
  imagesValid: 0,
  metadataComplete: 0,
  warnings: [],
  errors: [],
};

// Check all articles...
console.log(JSON.stringify(results, null, 2));
```

---

## 7. TROUBLESHOOTING GUIDE

### Symptom: No thumbnail on Facebook

**Diagnostics:**

```bash
curl -s https://intambwemedia.com/article/[slug] | grep "og:image"
```

**Solutions:**

1. Ensure image file exists: `ls -lh public/uploads/[image-name]`
2. Clear Facebook cache: Use Sharing Debugger → "Scrape Again"
3. Verify URL is absolute: Must start with `https://`
4. Check CORS headers allow image access

### Symptom: Wrong image displays

**Root Causes:**

- Article's featured image field is NULL → Falls back to logo.png
- Image file was deleted but database still references it
- Image path wasn't normalized properly

**Fix:**

```bash
# Find articles with missing images
sqlite3 intranet.db "SELECT id, slug, image FROM articles WHERE image IS NULL OR image = '';"

# Update with valid fallback
UPDATE articles SET image = '/uploads/default-article.jpg' WHERE image IS NULL;
```

### Symptom: Image loads in browser but not on social media

**Cause:** Relative URL path not converted to absolute

**Verification:**

```bash
# Check actual meta tag in page source
curl -s https://intambwemedia.com/article/[slug] | \
  grep 'property="og:image"' | \
  grep -o 'content="[^"]*"'

# Must output: content="https://intambwemedia.com/uploads/..."
```

---

## 8. ROLLBACK PLAN

If social media thumbnails break after deployment:

### Immediate Actions

1. Check if images were accidentally deleted
2. Verify article table `image` column has data
3. Revert to previous stable deploy version
4. Clear CDN cache

### Rollback Command

```bash
# Revert to previous build
git revert HEAD
npm run build
npm start

# Clear Next.js cache
rm -rf .next

# Restart application
pm2 restart intambwe-media-web-app
```

---

## 9. SUCCESS CRITERIA

All items must be ✅ before marking as complete:

- [ ] All social platforms (Facebook, Twitter, LinkedIn, WhatsApp) show correct thumbnails
- [ ] No broken image links in shared previews
- [ ] Articles shared on social media display title, description, and image
- [ ] No errors in web server logs related to image serving
- [ ] Lighthouse SEO audit shows 100% on OG/structured data
- [ ] Google Search Console shows articles with rich preview snippets
- [ ] No monitoring alerts for broken images in past 7 days

---

## 10. REFERENCE DOCUMENTATION

- **Next.js Metadata API**: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
- **Open Graph Protocol**: https://ogp.me/
- **Twitter Card Docs**: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/sharing/
- **LinkedIn URL Inspector**: https://www.linkedin.com/feed/

---

## Contact & Support

For metadata issues:

1. Check diagnostic logs: `diagnose-metadata.js`
2. Run validation: `npm run validate:metadata`
3. Review this checklist
4. File bug with log output

**Estimated Time to Resolve**: < 30 minutes with this checklist
