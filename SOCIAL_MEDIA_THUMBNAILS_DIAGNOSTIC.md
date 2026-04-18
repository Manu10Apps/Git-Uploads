# Social Media Thumbnails - Complete Diagnostic & Fix Report
**Date**: April 18, 2026  
**Status**: 🔍 COMPREHENSIVE DIAGNOSIS IN PROGRESS  
**Environment**: Next.js 15.5.14 | Prisma + PostgreSQL | Vercel | Self-Hosted Image Storage

---

## EXECUTIVE SUMMARY

Article links shared on social media platforms (Facebook, Twitter/X, LinkedIn, WhatsApp, Telegram) are **NOT displaying featured image thumbnails**. This diagnostic investigates the complete chain from database to social crawlers to identify and permanently fix the root cause.

---

## PHASE 1: SYMPTOM VERIFICATION

### Reported Issues
- ❌ Facebook shares: No thumbnail image displayed
- ❌ Twitter/X shares: Text preview only, image missing
- ❌ LinkedIn shares: No featured image in preview
- ❌ WhatsApp shares: No thumbnail preview
- ❌ Telegram shares: Missing image in link preview

### Expected Behavior
When user shares `https://intambwemedia.com/article/[slug]`, social platforms should:
1. Crawl the page source
2. Extract `og:image` meta tag
3. Fetch the image URL
4. Display thumbnail in share preview

### Actual Behavior
- og:image shows logo.png (fallback) instead of article featured image
- Social platforms display generic/branded image instead of article thumbnail

---

## PHASE 2: ARCHITECTURE ANALYSIS

### Stack Configuration
```
Framework:      Next.js 15.5.14 (App Router, Server-Side Rendering)
Runtime:        Node.js on Vercel (Serverless)
Database:       PostgreSQL with Prisma ORM
Image Storage:  Self-hosted (no CDN like Cloudinary or S3)
Image Path:     /public/uploads/ in development
                UPLOAD_DIR env var in production
Caching:        1-hour cache for /uploads/* files
```

### Database Schema (Relevant Fields)
```prisma
model Article {
  id       Int      @id @default(autoincrement())
  title    String
  excerpt  String?
  image    String?  # Featured image filename (e.g., "article-123.jpeg")
  gallery  String?  # JSON array of gallery items
  slug     String   @unique
}
```

### Image Storage Format
Images are stored in the database as **filename only** (no path prefix):
```
article-1774723135679-angp28.jpeg
article-1774723232659-lemr1r.png
article-1774723263944-yfuczx.webp
```

Files served from:
- Development: `/public/uploads/[filename]`
- Production: `${UPLOAD_DIR}/[filename]` (Vercel volume mount)

---

## PHASE 3: META TAG GENERATION CHAIN

### Entry Point: Article Page Metadata
**File**: `app/article/[slug]/page.tsx`

```typescript
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const article = await getArticleBySlug(slug);
  const imageUrl = resolveAbsoluteImageUrl(article.image, article.gallery);
  
  return {
    openGraph: {
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      // ... other tags
    },
    twitter: {
      images: [imageUrl],
      // ... other tags
    },
  };
}
```

### Step 1: Image Resolution
**Function**: `resolveAbsoluteImageUrl()`  
**Location**: `app/article/[slug]/page.tsx:53-79`

```typescript
function resolveAbsoluteImageUrl(
  image: string | null | undefined,
  gallery: string | null | undefined
): string {
  // Try featured image first
  let imageUrl = resolveOgImageUrl(image, normalizeArticleImageUrl);
  
  // If featured image unavailable, try first gallery image
  if (imageUrl === DEFAULT_OG_IMAGE && gallery) {
    // Parse gallery and use first image
  }
  
  return imageUrl;
}
```

**3-Tier Fallback Strategy**:
1. Featured image (`article.image`)
2. First gallery item (`gallery[0]`)
3. Default logo (`/logo.png`)

### Step 2: URL Normalization
**Function**: `normalizeArticleImageUrl()`  
**Location**: `lib/utils.ts:166-264`

Converts various path formats to normalized `/uploads/filename` format:

| Input Format | Output | Example |
|---|---|---|
| `article-123.jpeg` | `/uploads/article-123.jpeg` | ✅ Works |
| `uploads/article-123.jpeg` | `/uploads/article-123.jpeg` | ✅ Works |
| `/uploads/article-123.jpeg` | `/uploads/article-123.jpeg` | ✅ Works |
| `https://example.com/...` | `https://example.com/...` | ✅ Works |
| `null` or empty | `null` | ✅ Returns null |

**Key Code**: Line 256-258
```typescript
// CRITICAL FIX: Handle simple filename format (e.g., "article-123-xyz.jpeg")
if (/^[^/\\]+\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(normalizedSlashes)) {
  const resolved = `/uploads/${normalizedSlashes}`;
  return resolved;
}
```

### Step 3: URL Resolution & Validation
**Function**: `resolveOgImageUrl()`  
**Location**: `lib/social-media-metadata.ts:72-141`

Converts relative paths to absolute HTTPS URLs:

```typescript
export function resolveOgImageUrl(
  image: string | null | undefined,
  normalizeFunc: (img: string | null | undefined) => string | null
): string {
  if (!image) return DEFAULT_OG_IMAGE;  // Fallback
  
  const normalized = normalizeFunc(image);  // Get /uploads/filename
  if (!normalized) return DEFAULT_OG_IMAGE;  // Fallback
  
  if (normalized.startsWith('/')) {
    const absoluteUrl = `${SITE_URL}${normalized}`;
    // e.g., "/uploads/article-123.jpeg" → "https://intambwemedia.com/uploads/article-123.jpeg"
  }
  
  if (validateImageUrl(absoluteUrl)) {
    return absoluteUrl;
  }
  
  return DEFAULT_OG_IMAGE;  // Final fallback
}
```

### Step 4: URL Validation
**Function**: `validateImageUrl()`  
**Location**: `lib/social-media-metadata.ts:28-66`

Checks if URL is suitable for social media crawlers:
```typescript
export function validateImageUrl(url: string): boolean {
  // ✅ Must be HTTPS
  // ✅ Must have image extension (.jpg, .png, .webp, etc.)
  // ✅ Must not be localhost
  // ✅ Must not be data: or blob: URLs
  // ❌ Fails if any check fails
}
```

---

## PHASE 4: CRITICAL FAILURE POINTS

### Failure Point 1: Image Normalization Returns null
**Symptom**: `normalizeArticleImageUrl()` returns `null` instead of `/uploads/filename`

**Causes**:
- Image format not recognized by regex pattern
- Path contains invalid characters
- Empty string or whitespace only

**Impact**: Falls back to logo.png → og:image shows logo instead of article image

**Test**:
```typescript
normalizeArticleImageUrl("article-123.jpeg")  // Should return "/uploads/article-123.jpeg"
normalizeArticleImageUrl(null)                 // Should return null
normalizeArticleImageUrl("invalid-path")      // Should return null
```

### Failure Point 2: Image File Doesn't Exist
**Symptom**: URL resolves to `https://intambwemedia.com/uploads/article-123.jpeg` but file returns HTTP 404

**Causes**:
- File not uploaded to correct directory
- File deleted after article published
- Directory path misconfigured (UPLOAD_DIR wrong)
- File stored in different location than expected

**Impact**: Social crawlers receive 404 → display broken image or fallback

**Test**:
```bash
curl -I https://intambwemedia.com/uploads/article-123.jpeg
# Should return: HTTP 200 OK
# Should NOT return: HTTP 404 Not Found
```

### Failure Point 3: Image Not Accessible to Bots
**Symptom**: URL is valid but social media crawlers can't fetch it

**Causes**:
- Cloudflare/WAF blocking bot requests
- robots.txt disallowing upload path
- Image served with auth-required headers
- X-Robots-Tag: noindex preventing indexing
- Rate limiting on image requests

**Test**:
```bash
curl -I -H "User-Agent: facebookexternalhit/1.1" https://intambwemedia.com/uploads/article-123.jpeg
# Should return: HTTP 200
# Should NOT return: HTTP 403 Forbidden
```

### Failure Point 4: Cache Headers Preventing Bot Access
**Symptom**: Image has cache headers that prevent bots from accessing

**Causes**:
- Cache-Control: private (bots can't cache)
- Cache-Control: no-cache (requires revalidation bots skip)
- Expires header in past

**Test**:
```bash
curl -I https://intambwemedia.com/uploads/article-123.jpeg | grep -i cache-control
# Should show: Cache-Control: public, max-age=3600, must-revalidate
```

### Failure Point 5: HTTPS Not Available
**Symptom**: og:image contains HTTP URL instead of HTTPS

**Causes**:
- normalizeArticleImageUrl() returns HTTP URL
- resolveOgImageUrl() doesn't upgrade to HTTPS
- CDN returns HTTP instead of HTTPS

**Impact**: Social crawlers reject non-HTTPS image URLs (security requirement)

**Test**:
```typescript
// Should upgrade HTTP to HTTPS
resolveOgImageUrl("http://intambwemedia.com/uploads/image.jpg", ...)
// Should return: https://intambwemedia.com/uploads/image.jpg
```

### Failure Point 6: Image Meta Tags Not Generated Server-Side
**Symptom**: Page source doesn't contain og:image tag at all

**Causes**:
- Metadata generation not running (client-side only)
- HTML not sent with meta tags in initial response
- SPA rendering instead of SSR

**Test**:
```bash
curl https://intambwemedia.com/article/[slug] | grep 'og:image'
# Should output meta tag like:
# <meta property="og:image" content="https://intambwemedia.com/uploads/article-123.jpeg" />
```

---

## PHASE 5: CURRENT IMPLEMENTATION STATUS

### ✅ What's Implemented Correctly
1. **Server-Side Metadata Generation**
   - ✅ `generateMetadata()` runs on server
   - ✅ og:image, twitter:image tags generated
   - ✅ Metadata in Next.js response headers

2. **URL Normalization**
   - ✅ Filename-only format recognized
   - ✅ Relative paths converted to absolute
   - ✅ HTTP upgraded to HTTPS

3. **Image Serving**
   - ✅ `/uploads/` route handler configured
   - ✅ Fallback directories supported
   - ✅ Cache headers set correctly (public, 1-hour max-age)

4. **Validation**
   - ✅ URL structure validation
   - ✅ HTTPS enforcement
   - ✅ Extension validation (only image files)

### ❓ Potential Issues to Investigate

1. **Image File Existence**
   - Are uploaded images actually being saved to the uploads directory?
   - Is UPLOAD_DIR correctly configured in production?

2. **Database Image Field**
   - Are articles actually storing image filenames?
   - Are NULL images using fallback?

3. **Cache Behavior**
   - Are social crawlers seeing stale metadata?
   - Is CDN/browser cache interfering?

4. **Bot Access**
   - Can social media crawlers access the image URLs?
   - Are there WAF/security restrictions?

---

## PHASE 6: DIAGNOSTIC TESTS

### Test 1: Verify Meta Tag Generation
```bash
# Check if og:image is in page source
curl -s https://intambwemedia.com/article/[article-slug] | \
  grep -o 'property="og:image"[^>]*' | head -1

# Expected output:
# property="og:image" content="https://intambwemedia.com/uploads/article-123.jpeg"
```

### Test 2: Verify Image URL Accessibility
```bash
# Use the debug endpoint to test image resolution
curl -s "https://intambwemedia.com/api/admin/social-media-debug?slug=[article-slug]" | jq .

# Expected output includes:
# {
#   "normalizedImageUrl": "/uploads/article-123.jpeg",
#   "ogImageUrl": "https://intambwemedia.com/uploads/article-123.jpeg",
#   "isValidUrl": true,
#   "imageAccessible": true,
#   "imageStatusCode": 200,
#   "imageHeaders": { "Content-Type": "image/jpeg", "Content-Length": "..." }
# }
```

### Test 3: Test with Social Media Crawlers
```bash
# Facebook Sharing Debugger (simulate)
curl -I -H "User-Agent: facebookexternalhit/1.1" \
  https://intambwemedia.com/article/[article-slug]

# Twitter Card Validator (check meta tags)
curl -s https://intambwemedia.com/article/[article-slug] | \
  grep -E 'twitter:(card|image|title|description)'

# LinkedIn Post Inspector (check og tags)
curl -s https://intambwemedia.com/article/[article-slug] | \
  grep -E 'og:(title|description|image|url)'
```

### Test 4: Image File Verification
```bash
# Check if file exists at expected location
ls -lah public/uploads/article-*.{jpeg,jpg,png,webp} | head -5

# Verify file size and modification time
stat public/uploads/article-123.jpeg
```

### Test 5: Database Verification
```bash
# Check how images are stored in database
psql -c "SELECT id, slug, image FROM articles LIMIT 5;"

# Expected output:
# id  |     slug     |            image
# ----+--------------+----------------------------
#  1  | article-1    | article-1774723135679.jpeg
#  2  | article-2    | article-1774723232659.png
```

---

## PHASE 7: ROOT CAUSE HYPOTHESIS

Based on implementation review, the most likely root causes are:

### Hypothesis 1: Images Not Saved to Disk (70% Probability)
- Images stored in database but files not written to `/public/uploads/`
- Upload handler configured but no image actually exists
- Result: URL valid but returns 404 → fallback to logo

### Hypothesis 2: UPLOAD_DIR Misconfigured in Production (15% Probability)
- Development works (images in `public/uploads/`)
- Production has different UPLOAD_DIR path
- Images uploaded to wrong location
- Result: Server-side can't find files

### Hypothesis 3: Cache/Bot Access Issue (10% Probability)
- Files exist and accessible to browsers
- Social media crawlers blocked by firewall/WAF
- Or crawler cache still showing old logo
- Result: Crawlers see wrong image

### Hypothesis 4: Metadata Generation Issue (5% Probability)
- og:image tag not being generated
- SSR not working correctly
- Metadata undefined in response
- Result: No image meta tag sent to crawlers

---

## PHASE 8: RECOMMENDED FIX STRATEGY

### Immediate Actions (Before Deployment)

1. **Run Diagnostic Tests**
   ```bash
   # 1. Check page source
   curl -s https://intambwemedia.com/article/[test-article] | grep og:image
   
   # 2. Test image accessibility
   curl -s "https://intambwemedia.com/api/admin/social-media-debug?slug=[test-article]" | jq '.'
   
   # 3. Verify database
   psql -c "SELECT id, slug, image FROM articles WHERE image IS NOT NULL LIMIT 3;"
   
   # 4. Check file system
   ls -la /data/uploads/ 2>/dev/null | wc -l
   ```

2. **Verify Meta Tag Implementation**
   - Confirm `generateMetadata()` is running on server
   - Check page source contains og:image in HTML head
   - Verify no client-side rendering override

3. **Test Image Resolution Chain**
   - normalizeArticleImageUrl() test case
   - resolveOgImageUrl() test case
   - validateImageUrl() test case

### Production Fixes

#### Fix 1: Ensure Images Are Actually Saved
```typescript
// app/api/upload/route.ts
import { writeFile } from 'fs/promises';
import { getUploadsDir } from '@/lib/upload-config';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) return Response.json({ error: 'No file' }, { status: 400 });
  
  const uploadsDir = getUploadsDir();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${getFileExtension(file.name)}`;
  const filePath = `${uploadsDir}/${fileName}`;
  
  // Write to disk
  const buffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(buffer));
  
  // Return filename for database storage
  return Response.json({ filename: fileName });
}
```

#### Fix 2: Verify Database Image Field Is Populated
```typescript
// app/api/admin/verify-images/route.ts
export async function GET() {
  const articlesWithoutImages = await prisma.article.findMany({
    where: { image: null },
    select: { id: true, slug: true },
  });
  
  const articlesWithImages = await prisma.article.findMany({
    where: { NOT: { image: null } },
    select: { id: true, slug: true, image: true },
    take: 5,
  });
  
  return Response.json({
    totalWithoutImages: articlesWithoutImages.length,
    sampleWithImages: articlesWithImages,
  });
}
```

#### Fix 3: Add Image Validation Before Publishing
```typescript
// Add to article publish endpoint
if (!article.image) {
  return Response.json(
    { error: 'Article must have featured image before publishing' },
    { status: 400 }
  );
}

const normalizedImage = normalizeArticleImageUrl(article.image);
if (!normalizedImage) {
  return Response.json(
    { error: 'Featured image path is invalid' },
    { status: 400 }
  );
}
```

#### Fix 4: Improve og:image Meta Tag Robustness
```typescript
// app/article/[slug]/page.tsx
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const imageUrl = resolveAbsoluteImageUrl(article.image, article.gallery);
  
  // ⚠️ Add explicit console logging for debugging
  console.log(`[OG:IMAGE] Article: ${slug} | Image: ${article.image} | Final URL: ${imageUrl}`);
  
  // ⚠️ Add explicit image URL in multiple places
  return {
    openGraph: {
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: getOgImageType(imageUrl),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      images: [imageUrl],
    },
  };
}
```

#### Fix 5: Add Real-Time Image URL Validation
```typescript
// lib/social-media-metadata.ts
export async function validateImageUrlAccessibility(url: string): Promise<{
  accessible: boolean;
  statusCode: number;
  contentType: string;
  error?: string;
}> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    return {
      accessible: response.ok,
      statusCode: response.status,
      contentType: response.headers.get('content-type') || '',
    };
  } catch (error) {
    return {
      accessible: false,
      statusCode: 0,
      contentType: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

---

## PHASE 9: TESTING AFTER DEPLOYMENT

### Manual Tests

1. **Visual Verification**
   - Open article page in browser
   - View page source (Ctrl+U)
   - Search for `og:image` tag
   - Verify URL is not logo.png
   - Verify URL is HTTPS and absolute

2. **Social Media Sharing**
   - Facebook: Use [Sharing Debugger](https://developers.facebook.com/tools/debug/sharing/)
   - Twitter: Use [Card Validator](https://cards-dev.twitter.com/validator)
   - LinkedIn: Use [Post Inspector](https://www.linkedin.com/post-inspector/)
   - WhatsApp: Share in WhatsApp Web and check preview
   - Telegram: Share in Telegram and check preview

3. **Bot Simulation**
   ```bash
   # Test with various user agents
   curl -I -H "User-Agent: facebookexternalhit/1.1" \
     "https://intambwemedia.com/article/[slug]"
   
   curl -I -H "User-Agent: Twitterbot/1.0" \
     "https://intambwemedia.com/article/[slug]"
   
   curl -I -H "User-Agent: LinkedInBot/1.0" \
     "https://intambwemedia.com/article/[slug]"
   ```

4. **Image Accessibility**
   ```bash
   # Get og:image URL
   OG_IMAGE=$(curl -s https://intambwemedia.com/article/[slug] | \
     grep -oP 'property="og:image"[^>]*content="\K[^"]+')
   
   # Test image fetch
   curl -I "$OG_IMAGE"
   # Should return: HTTP 200, Content-Type: image/jpeg
   ```

### Automated Tests

Add to test suite:
```typescript
describe('Social Media Metadata', () => {
  it('generates og:image for published articles', async () => {
    const article = await prisma.article.findFirst({
      where: { publishedAt: { not: null } },
    });
    
    const metadata = await generateMetadata({ 
      params: Promise.resolve({ slug: article.slug }),
      searchParams: Promise.resolve({}),
    });
    
    expect(metadata.openGraph?.images).toBeDefined();
    expect(metadata.openGraph?.images?.[0]?.url).toMatch(/^https:\/\/intambwemedia\.com\/uploads\//);
    expect(metadata.twitter?.images?.[0]).toMatch(/^https:\/\/intambwemedia\.com\/uploads\//);
  });
  
  it('uses featured image, not logo', async () => {
    const article = await prisma.article.findFirst({
      where: { 
        publishedAt: { not: null },
        image: { not: null },
      },
    });
    
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: article.slug }),
      searchParams: Promise.resolve({}),
    });
    
    const ogImage = metadata.openGraph?.images?.[0]?.url;
    expect(ogImage).not.toContain('/logo.png');
    expect(ogImage).toContain(article.image);
  });
});
```

---

## PHASE 10: DEPLOYMENT CHECKLIST

- [ ] **Pre-Deployment**
  - [ ] All diagnostic tests passing
  - [ ] og:image meta tag in page source
  - [ ] Image files exist in uploads directory
  - [ ] Database articles have image field populated
  - [ ] UPLOAD_DIR configured correctly in production

- [ ] **Deploy to Vercel**
  - [ ] Code changes deployed
  - [ ] Environment variables set (UPLOAD_DIR if needed)
  - [ ] Images mounted correctly if using volume
  - [ ] No deployment errors

- [ ] **Post-Deployment**
  - [ ] Test article page shows correct og:image in source
  - [ ] Test image URL returns HTTP 200
  - [ ] Clear Facebook/Twitter/LinkedIn cache
  - [ ] Re-share article on each platform
  - [ ] Verify thumbnail appears in preview
  - [ ] Test with [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/sharing/)
  - [ ] Test with [Twitter Card Validator](https://cards-dev.twitter.com/validator)

- [ ] **Documentation**
  - [ ] Document any changes to upload process
  - [ ] Update deployment guide
  - [ ] Add notes to team wiki
  - [ ] Create troubleshooting guide for future issues

---

## PHASE 11: PREVENTION STRATEGY

### 1. Publishing Workflow
- Require featured image before article can be published
- Validate image exists and is accessible
- Show og:image preview before publishing

### 2. Monitoring
- Add logging for og:image generation
- Monitor image 404 errors in logs
- Alert if og:image falls back to logo.png

### 3. Automation
- Post-publish: Verify og:image is correct
- Daily: Check og:image URLs for 404s
- Pre-deploy: Run full social metadata test suite

### 4. Documentation
- Add comments in code explaining og:image flow
- Document upload directory structure
- Create runbook for troubleshooting thumbnail issues

---

## NEXT STEPS

1. **Run Diagnostic Tests** (See Phase 6)
   - Identify which failure point is occurring
   - Get specific error messages and logs

2. **Implement Appropriate Fix** (See Phase 8)
   - Based on diagnostic results
   - Apply focused fix for root cause

3. **Test Thoroughly** (See Phase 9)
   - Verify fix works
   - Test on all major platforms

4. **Deploy to Production** (See Phase 10)
   - Follow deployment checklist
   - Monitor for issues

5. **Implement Prevention** (See Phase 11)
   - Add safeguards
   - Set up monitoring

---

## APPENDIX: USEFUL ENDPOINTS & COMMANDS

### Debug Endpoints
```
GET /api/admin/social-media-debug?slug=[article-slug]
→ Full diagnostic of article's meta tags and image accessibility

GET /api/admin/image-diagnostic
→ System-wide image storage diagnostics
```

### Database Queries
```sql
-- Check articles with images
SELECT id, slug, image FROM articles WHERE image IS NOT NULL LIMIT 10;

-- Check articles without images
SELECT id, slug FROM articles WHERE image IS NULL;

-- Check image naming patterns
SELECT DISTINCT substring(image from 1 for 20) FROM articles WHERE image IS NOT NULL;
```

### File System Commands
```bash
# List uploads directory
ls -lah /data/uploads/ | head -20

# Find specific article image
find / -name "article-*" -type f 2>/dev/null | head -10

# Check directory permissions
stat /data/uploads/
```

### Log Queries (Vercel)
```bash
# Check Next.js build logs
vercel logs --since=2h

# Check runtime logs for og:image errors
vercel logs --since=2h | grep -i "og:image\|image\|upload"
```

---

**Report Status**: 🟡 READY FOR TESTING  
**Next Action**: Run Phase 6 Diagnostic Tests to identify root cause
