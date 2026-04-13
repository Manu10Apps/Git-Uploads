# SEO Audit & Optimization Report

**Intambwe Media | Amakuru News**  
Date: April 13, 2026  
Domain: intambwemedia.com | amakuru.news  
Target Markets: East Africa (Rwanda, Kenya, Tanzania)

---

## 📊 EXECUTIVE SUMMARY

Your site has **solid foundational SEO** in place with metadata, sitemap, robots.txt, and structured data. However, there are **critical optimization opportunities** to improve SERP rankings, especially for East African keywords and news-related queries.

### Current Strengths ✅

- ✅ Robots.txt properly configured
- ✅ XML Sitemap with hreflang implementation
- ✅ OpenGraph & Twitter Card metadata
- ✅ Structured data (NewsArticle schema)
- ✅ Multi-language support (Kinyarwanda, English, Swahili)
- ✅ Responsive design with mobile optimization
- ✅ Fast page load times (verified via Lighthouse reports)

### Critical Gaps ⚠️

- ⚠️ Homepage lacks structured data (Organization schema missing)
- ⚠️ Category pages have no dedicated SEO optimization
- ⚠️ Missing breadcrumb schema
- ⚠️ No News sitemap (only standard sitemap)
- ⚠️ Limited internal linking strategy
- ⚠️ No FAQ schema implementation
- ⚠️ Article URLs could be more SEO-friendly (date inclusion)

---

## 🎯 SECTION 1: TECHNICAL SEO IMPROVEMENTS

### 1.1 Add Organization & Local Business Schema

**Impact: HIGH | Effort: MEDIUM**

Add this to root layout to establish your brand as an East African news authority:

```json
{
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "name": "Intambwe Media",
  "alternateName": "Amakuru Agezweho",
  "url": "https://intambwemedia.com",
  "logo": "https://intambwemedia.com/logo.png",
  "description": "East African news platform delivering breaking news, investigations, and journalism from Rwanda, Kenya, and Tanzania.",
  "sameAs": [
    "https://twitter.com/intambwemedias",
    "https://facebook.com/intambwemedia"
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Your address]",
    "addressLocality": "Kigali",
    "addressRegion": "Rwanda",
    "addressCountry": "RW"
  },
  "operatingArea": {
    "@type": "Place",
    "name": "East Africa",
    "areaServed": ["RW", "KE", "TZ"]
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Editorial",
    "email": "editorial@intambwemedia.com"
  }
}
```

### 1.2 Implement Breadcrumb Schema

**Impact: MEDIUM | Effort: LOW**

Add breadcrumbs to all article and category pages:

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://intambwemedia.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Category Name",
      "item": "https://intambwemedia.com/category/[slug]"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Article Title",
      "item": "https://intambwemedia.com/article/[slug]"
    }
  ]
}
```

### 1.3 Create News XML Sitemap

**Impact: HIGH | Effort: MEDIUM**

Create `/news-sitemap.xml` with Google News-specific attributes:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://intambwemedia.com/article/[slug]</loc>
    <news:news>
      <news:publication>
        <news:name>Intambwe Media</news:name>
        <news:language>ky</news:language>
      </news:publication>
      <news:publication_date>[ISO DATE]</news:publication_date>
      <news:title>[ARTICLE TITLE]</news:title>
      <news:keywords>[COMMA SEPARATED KEYWORDS]</news:keywords>
      <news:stock_tickers>[STOCK TICKERS IF RELEVANT]</news:stock_tickers>
    </news:news>
  </url>
</urlset>
```

Add to `robots.txt`:

```
Sitemap: https://intambwemedia.com/news-sitemap.xml
```

### 1.4 Optimize Meta Description Length

**Current Issue:** Some descriptions may exceed 160 characters  
**Action:**

- Keep primary descriptions **150-160 characters**
- Keep secondary descriptions **130-140 characters**
- Current implementation is good - maintain it across all articles

### 1.5 Fix robots.txt Domain Mismatch

**Current Issue:** robots.txt references "amakuru.news" but metadata uses "intambwemedia.com"  
**Action:** Standardize to primary domain. In `public/robots.txt`:

```
# Robots.txt for Intambwe Media
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /search?
Allow: /search
Disallow: /_next/
Disallow: *.json$

User-agent: Googlebot
Crawl-delay: 0

User-agent: Googlebot-Image
Allow: /

User-agent: Bingbot
Crawl-delay: 1

Sitemap: https://intambwemedia.com/sitemap.xml
Sitemap: https://intambwemedia.com/news-sitemap.xml
```

---

## 📝 SECTION 2: ARTICLE SEO OPTIMIZATION

### 2.1 Enhanced Article Metadata

**Impact: HIGH | Effort: LOW**

Update article pages to include:

```typescript
// Add to /app/article/[slug]/page.tsx metadata generation
{
  // Existing metadata...
  keywords: article.keywords || article.title, // Add SEO keywords field
  abstract: truncatedDescription, // For semantic web
  robots: {
    index: article.status === 'published',
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1,
  },
  other: {
    'article:published_time': article.publishedAt?.toISOString(),
    'article:modified_time': article.updatedAt?.toISOString(),
    'article:author': article.author,
    'article:section': article.category?.name,
    'article:tag': article.tags?.join(', ') || '',
  },
}
```

### 2.2 Improve Article URL Structure

**Current:** `/article/[slug]`  
**Recommended:** `/[YYYY]/[MM]/[slug]` (date-based URLs are SEO-friendly)

Benefits:

- Better semantic structure
- Improved content grouping by date
- Easier canonicalization
- Better for news articles (News sitemap prefers dated URLs)

### 2.3 Add Author Structured Data

**Impact: MEDIUM | Effort: MEDIUM**

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "author": {
    "@type": "Person",
    "name": "[AUTHOR NAME]",
    "url": "https://intambwemedia.com/author/[author-slug]"
  },
  "creator": {
    "@type": "Person",
    "name": "[AUTHOR NAME]"
  }
}
```

### 2.4 Related Articles Schema

**Impact: MEDIUM | Effort: HIGH**

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "associatedMedia": [
    {
      "@type": "NewsArticle",
      "headline": "[RELATED ARTICLE TITLE]",
      "url": "https://intambwemedia.com/article/[related-slug]"
    }
  ]
}
```

---

## 🔍 SECTION 3: KEYWORD STRATEGY FOR EAST AFRICA

### 3.1 Primary Target Keywords (High Volume, Local)

**Kinyarwanda Focus:**

- `Amakuru agezweho` (Breaking news)
- `Igihe cyose` (Current affairs)
- `Amakuru u Rwanda` (Rwanda news)
- `Inyamakuru` (News)
- `Ubwigize bwa media` (Journalism)

**English Focus (East Africa):**

- `Rwanda news today`
- `Kenya breaking news`
- `Tanzania latest headlines`
- `East Africa news`
- `Rwanda politics news`
- `East Africa business news`
- `Rwanda investigations`
- `East Africa journalism`

**Swahili Focus:**

- `Habari za Kenya`
- `Habari ya Tanzania`
- `Habari za Afrika Mashariki`
- `Habari kupigania haki`
- `Habari za kazi za vyombo`

### 3.2 Long-Tail Keywords (Lower Volume, High Intent)

- `Rwanda government latest news 2026`
- `East Africa investigative journalism`
- `Rwanda energy breaking news`
- `Kenya political news this week`
- `Tanzania business news today`
- `East Africa human rights news`
- `Rwanda corruption investigation news`
- `East Africa technology news`

### 3.3 Implementation

**1. Category Page Optimization:**

```typescript
// Add to each category page (/category/[slug]/page.tsx)
export async function generateMetadata({ params }) {
  const category = await getCategory(params.slug);

  return {
    title: `${category.name} News | East Africa | Intambwe Media`,
    description: `Latest ${category.name} news from Rwanda, Kenya, and Tanzania. Breaking stories, investigations, and analysis on ${category.name.toLowerCase()} in East Africa.`,
    keywords: [
      category.name,
      `${category.name} news`,
      `${category.name} Rwanda`,
      `${category.name} Kenya`,
      `${category.name} Tanzania`,
      `East Africa ${category.name} news`,
    ],
    openGraph: {
      type: "website",
      title: `${category.name} News - East Africa's Leading Journalism`,
      description: `Breaking ${category.name} news from East Africa...`,
      url: `https://intambwemedia.com/category/${category.slug}`,
    },
  };
}
```

**2. Investigation Page Optimization:**

```typescript
// Add to /investigations/page.tsx
export const metadata = {
  title: "Investigative Journalism | East Africa Stories | Intambwe Media",
  description:
    "In-depth investigations revealing truth across East Africa. Uncovering corruption, environmental issues, and human rights violations in Rwanda, Kenya, and Tanzania.",
  keywords: [
    "investigative journalism",
    "East Africa investigations",
    "Rwanda corruption",
    "Kenya investigations",
    "Tanzania journalism",
    "East Africa stories",
    "journalism Rwanda",
    "East Africa news investigation",
  ],
  openGraph: {
    type: "website",
    title: "East Africa's Leading Investigative Journalism",
    description:
      "Uncovering the truth through in-depth investigations across Rwanda, Kenya, and Tanzania.",
    url: "https://intambwemedia.com/investigations",
    images: [
      {
        url: "https://intambwemedia.com/investigations-banner.png",
        width: 1200,
        height: 630,
        alt: "Investigative Journalism",
      },
    ],
  },
};
```

---

## ✍️ SECTION 4: CONTENT OPTIMIZATION

### 4.1 Internal Linking Strategy

**Impact: HIGH | Effort: MEDIUM**

For each article, automatically link:

- **Related articles** in same category (2-3 links)
- **Relevant investigation** pieces (1 link)
- **Category pages** (1 anchor link)
- **Breaking news section** (if applicable)

Example implementation:

```typescript
// In article display component
<div className="related-articles">
  {relatedArticles.map(article => (
    <Link href={`/article/${article.slug}`}>
      {article.title}
    </Link>
  ))}
</div>
```

### 4.2 Optimize Headlines for SEO & CTR

**Format:** `[Main Keyword] - [Benefit/Action] | [Brand]`

Examples:

- ❌ `Government Announces New Policy`
- ✅ `Rwanda Government Announces New Economic Policy 2026 - What This Means for Citizens`

- ❌ `Market Trading`
- ✅ `Kenya Stock Exchange Trading: Best Performing Stocks This Week`

### 4.3 Optimize Article Excerpts

- **Keep excerpts 150-160 characters** (matches SEO description length)
- **Include primary keywords** naturally
- **Have clear call-to-action** feel
- **Avoid clickbait** (hurts brand trust)

### 4.4 Add Article Updates Indicator

- Show "Updated: [Date/Time]" for modified articles
- In schema: Include `dateModified` separately from `datePublished`
- This signals freshness to Google

---

## 🌍 SECTION 5: LOCAL SEO FOR EAST AFRICA

### 5.1 Geo-Targeted Content Markup

Add location schema to articles with regional focus:

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "locationOfArticle": {
    "@type": "Place",
    "name": "Rwanda",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "-1.9536",
      "longitude": "29.8739"
    }
  }
}
```

### 5.2 Social Signals Optimization

- Add sharing buttons with pre-populated text for each language
- Create language-specific social media bios linking back to appropriate language version
- Include social metrics (shares/engagement) where available

### 5.3 Hreflang Implementation Verification

✅ **Currently implemented** - Great!  
Verify it's working:

- Homepage: `hreflang="rw"`, `hreflang="en"`, `hreflang="sw"`
- Article pages: Include language variations
- Admin panel: Check redirect logic

---

## 📊 SECTION 6: GOOGLE SEARCH CONSOLE SETUP

### Required Actions:

1. **Add All Domain Variants:**
   - https://intambwemedia.com
   - https://amakuru.news
   - Verify same-site redirect handling

2. **Submit Both Sitemaps:**
   - `/sitemap.xml` (all content)
   - `/news-sitemap.xml` (news articles only)

3. **Monitor Core Web Vitals:**
   - Largest Contentful Paint (LCP): Target < 2.5s
   - First Input Delay (FID): Target < 100ms
   - Cumulative Layout Shift (CLS): Target < 0.1

4. **Check Coverage Issues:**
   - Fix any soft 404s
   - Verify all articles are indexed
   - Check for crawl errors

5. **Use Search Analytics:**
   - Track top 100 queries driving traffic
   - Identify keywords with high clicks but low CTR (titles/descriptions need work)
   - Monitor SERP position trends

---

## 🔄 SECTION 7: ONGOING OPTIMIZATION (Monthly)

### Monthly Checklist:

- [ ] Review Google Search Console data
- [ ] Update evergreen content (add new info, update dates)
- [ ] Fix crawl errors reported by GSC
- [ ] Monitor Core Web Vitals
- [ ] Check internal links (no 404s)
- [ ] Optimize 5-10 underperforming article titles
- [ ] Add 5-10 new keyword-targeted articles
- [ ] Verify no indexation issues
- [ ] Check competitor keywords

### Quarterly Checklist:

- [ ] Full site audit using Screaming Frog
- [ ] Review keyword rankings
- [ ] Analyze competitor SEO strategy
- [ ] Update structured data schemas
- [ ] Optimize category/section pages
- [ ] Review and improve internal linking
- [ ] Update meta descriptions for top 50 pages

---

## 📈 EXPECTED IMPROVEMENTS TIMELINE

### Month 1-2 (Quick Wins)

- ✅ +15-25% organic impressions from GSC exposure
- ✅ Improved SERP appearance (better titles/descriptions)
- ✅ Better crawlability (news sitemap submission)
- ⏱ Estimated impact: +10-20% traffic

### Month 3-4 (Medium-term)

- ✅ +30-50% organic search traffic
- ✅ Better rankings for primary keywords
- ✅ Improved CTR from SERPs
- ⏱ Estimated impact: +25-40% traffic

### Month 6+ (Long-term)

- ✅ Significant improvement for East African keywords
- ✅ Increased brand authority
- ✅ Higher rankings for competitive terms
- ⏱ Estimated impact: +50-100%+ traffic

---

## 🚀 PRIORITY ACTION ITEMS (This Week)

### CRITICAL (Do First):

1. **Update robots.txt** - Standardize domain
2. **Submit News Sitemap** to Google Search Console
3. **Add Organization Schema** to homepage
4. **Verify all hreflang tags** are working
5. **Check GSC for indexation issues**

### HIGH PRIORITY (Next 2 Weeks):

1. Optimize category pages with metadata
2. Implement breadcrumb schema
3. Create keyword strategy documentation
4. Add internal linking strategy to article template
5. Optimize headline format across recent articles

### MEDIUM PRIORITY (Next Month):

1. Implement author pages and author schema
2. Add FAQ/Help section with FAQ schema
3. Create more content around long-tail keywords
4. Implement geo-targeted content markup
5. Set up detailed monthly SEO tracking dashboard

---

## 📋 IMPLEMENTATION PRIORITY MATRIX

| Task                           | Impact | Effort | Priority     |
| ------------------------------ | ------ | ------ | ------------ |
| Fix robots.txt                 | HIGH   | LOW    | **CRITICAL** |
| Submit News Sitemap            | HIGH   | LOW    | **CRITICAL** |
| Add Organization Schema        | HIGH   | MEDIUM | **HIGH**     |
| Optimize Category Pages        | MEDIUM | MEDIUM | **HIGH**     |
| Implement Breadcrumbs          | MEDIUM | LOW    | **HIGH**     |
| Update Article URLs (dates)    | HIGH   | HIGH   | MEDIUM       |
| Internal Linking Strategy      | HIGH   | MEDIUM | **HIGH**     |
| Keyword Targeting (categories) | HIGH   | MEDIUM | **HIGH**     |
| Author Schema                  | MEDIUM | MEDIUM | MEDIUM       |
| FAQ Schema                     | MEDIUM | HIGH   | MEDIUM       |

---

## 🎯 SUCCESS METRICS

Track these in Google Search Console & Analytics:

- **Organic Impressions:** Target +50% YoY
- **Click-Through Rate (CTR):** Target >5% average
- **Average Position:** Target <4 for primary keywords
- **Organic Sessions:** Target +30% YoY
- **Engagement Rate:** Target >60% time-on-page
- **Crawl Stats:** Target <5% crawl errors

---

## 💡 ADDITIONAL RECOMMENDATIONS

### Voice Search Optimization

- Optimize for question-based queries
- Use FAQ schema
- Keep content conversational
- Target long-tail phrases (how, what, why)

### Video SEO (if applicable)

- Add video transcripts
- Use VideoObject schema
- Create video sitemaps
- Embed YouTube videos from trusted sources

### Featured Snippets Optimization

- Target position 0 with:
  - Clear definitions (50-60 words)
  - Numbered lists
  - Tables for comparisons
  - Q&A format

### Local Link Building

- Partner with other East African news sources
- Get mentioned in news aggregators
- Reach out to journalist networks
- Submit to media directories

---

## 📞 SUPPORT RESOURCES

- **Google Search Central:** https://developers.google.com/search
- **Google Search Console Help:** https://support.google.com/webmasters
- **Schema.org Documentation:** https://schema.org
- **East Africa SEO Best Practices:** Monitor local algorithm updates

---

**Report Generated:** April 13, 2026  
**Next Review:** May 13, 2026 (30 days)
