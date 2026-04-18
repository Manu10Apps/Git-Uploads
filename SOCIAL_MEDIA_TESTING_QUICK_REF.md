# Quick Reference: Social Media Thumbnail Testing

## Commands to Test

### 1. Check OG Image for an Article (Replace `slug` with actual article slug)

```bash
curl "https://intambwemedia.com/api/social-media/og-image-diagnostic?slug=article-slug"
```

### 2. Validate Article Before Publishing (Replace `123` with article ID)

```bash
curl -X POST https://intambwemedia.com/api/social-media/validate-publishing \
  -H "Content-Type: application/json" \
  -d '{"articleId": 123}'
```

### 3. Find All Articles Missing Featured Images

```bash
curl "https://intambwemedia.com/api/social-media/validate-publishing?action=missing-images"
```

### 4. Check All Published Articles' OG Images

```bash
curl "https://intambwemedia.com/api/social-media/og-image-diagnostic?checkAll=true"
```

---

## Social Media Platform Testing

### Facebook Sharing Debugger

1. URL: https://developers.facebook.com/tools/debug/sharing/
2. Paste article URL
3. Click "Scrape Again"
4. **Expected**: Featured image thumbnail displays

### Twitter Card Validator

1. URL: https://cards-dev.twitter.com/validator
2. Paste article URL
3. **Expected**: "summary_large_image" card type with featured image

### LinkedIn Post Inspector

1. Go to: https://www.linkedin.com/feed/
2. Compose new post
3. Paste article URL
4. **Expected**: Featured image preview displays

### WhatsApp Desktop

1. Share article link in chat
2. **Expected**: Thumbnail preview shows featured image

---

## Expected API Responses

### ✅ Successful OG Image Check

```json
{
  "diagnostic": {
    "slug": "my-article",
    "rawImage": "/uploads/article-1234567890-abc123.jpg",
    "resolved": "https://intambwemedia.com/uploads/article-1234567890-abc123.jpg",
    "validOgImage": true,
    "hasFeaturedImage": true,
    "usingFallback": false,
    "issues": {
      "noFeaturedImage": false,
      "normalizationFailed": false,
      "validationFailed": false,
      "usingFallback": false
    }
  }
}
```

### ❌ Failed OG Image Check (Using Fallback Logo)

```json
{
  "diagnostic": {
    "slug": "problem-article",
    "rawImage": null,
    "resolved": "https://intambwemedia.com/logo.png",
    "validOgImage": false,
    "hasFeaturedImage": false,
    "usingFallback": true,
    "issues": {
      "noFeaturedImage": true,
      "normalizationFailed": false,
      "validationFailed": true,
      "usingFallback": true
    }
  },
  "recommendations": [
    "⚠️  Article has NO featured image - add one immediately",
    "   → Upload image in admin panel or via API",
    "   → Image should be at least 1200x630 pixels",
    "   → Use JPEG, PNG, or WebP format"
  ]
}
```

### ✅ Article Ready for Publishing

```json
{
  "valid": true,
  "articleId": 123,
  "slug": "ready-article",
  "canPublish": true,
  "errors": [],
  "warnings": [],
  "metadata": {
    "og:image": "https://intambwemedia.com/uploads/article-1234567890-abc123.jpg",
    "og:image:valid": true,
    "og:title": "Article Title",
    "og:description": "Article description..."
  },
  "nextSteps": [
    "✅ Article is ready for publishing",
    "Featured image will display on social media",
    "Meta tags are properly configured"
  ]
}
```

### ❌ Article Not Ready for Publishing

```json
{
  "valid": false,
  "articleId": 456,
  "slug": "problem-article",
  "canPublish": false,
  "errors": ["❌ CRITICAL: No featured image - article cannot be published"],
  "warnings": [],
  "metadata": {},
  "nextSteps": [
    "🔧 Fix critical errors before publishing",
    "💾 Update article and try again"
  ]
}
```

---

## Troubleshooting Matrix

| Issue           | Symptom                             | Root Cause                   | Fix                         |
| --------------- | ----------------------------------- | ---------------------------- | --------------------------- |
| Wrong thumbnail | Logo shows instead of article image | No featured image stored     | Upload featured image       |
| No preview      | Link shares with no thumbnail       | Image path not recognized    | Check database value format |
| Broken image    | Social debugger shows broken link   | Image file missing on server | Re-upload image             |
| Old thumbnail   | Changes not reflected after update  | Social platform cache        | Use "Scrape Again" button   |
| Slow preview    | Takes >2s to load preview           | Large image file             | Optimize image size         |

---

## Files Modified

1. **app/article/[slug]/page.tsx** - Enhanced metadata generation with gallery fallback
2. **app/api/social-media/og-image-diagnostic/route.ts** - NEW - Diagnostic endpoint
3. **app/api/social-media/validate-publishing/route.ts** - NEW - Publishing validation
4. **app/api/social-media/test-meta-tags/route.ts** - NEW - Meta tag testing endpoint
5. **SOCIAL_MEDIA_THUMBNAIL_FIX.md** - NEW - Comprehensive fix documentation

## Deployment Checklist

- [x] Diagnostic endpoints created
- [x] Gallery fallback implemented
- [x] Meta tag generation enhanced
- [x] Validation rules added
- [x] Documentation created
- [ ] Code pushed to GitHub
- [ ] Dokploy deployment triggers
- [ ] Production validation complete
- [ ] Social media caches cleared
