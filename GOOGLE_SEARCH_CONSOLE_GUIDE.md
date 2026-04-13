# Google Search Console Setup & Monitoring Guide

**Intambwe Media SEO Control Panel**  
Updated: April 13, 2026

---

## 🚀 QUICK START: 15-MINUTE SETUP

### Step 1: Add Property (5 minutes)

1. Go to https://search.google.com/search-console
2. Click "Add Property" (top left)
3. Choose "URL Prefix" (not "Domain")
4. Enter: `https://intambwemedia.com`
5. Verify ownership via HTML tag method:
   - Copy the meta tag
   - Add to `app/layout.tsx` head section
   - Submit verification

### Step 2: Add Domain Property (Optional but Recommended) (2 minutes)

1. Add another property with type "Domain"
2. Enter: `intambwemedia.com` (without protocol)
3. Follow DNS verification steps through domain registrar
4. Benefits: Includes all subdomains/protocols automatically

### Step 3: Submit Sitemaps (3 minutes)

1. Go to **Sitemaps** in left menu
2. Submit both:
   - `https://intambwemedia.com/sitemap.xml`
   - `https://intambwemedia.com/news-sitemap.xml`
3. Wait 1-5 minutes, refresh to see status
4. Should show "Success" status

### Step 4: Request Indexing (2 minutes)

1. Go to **URL Inspection** (top search bar)
2. Paste your homepage: `https://intambwemedia.com`
3. Click "Test live URL" (blue button)
4. If all green ✅, click "Request indexing"
5. Repeat for top articles

### Step 5: Set Preferred Domain (1 minute)

1. Go to **Settings** (gear icon)
2. Click **Crawl settings**
3. Set preferred domain to: `https://www.intambwemedia.com` or `https://intambwemedia.com`
4. Ensure consistent throughout site

### Step 6: Add Alternate Domain (1 minute, if needed)

If `amakuru.news` also points to same site:

1. Verify in separate GSC property
2. Add `rel="canonical"` pointing to primary domain
3. Recommended: Redirect `amakuru.news` → `intambwemedia.com`

---

## 📊 ESSENTIAL MONITORING: WEEKLY CHECKLIST

### Every Monday (15 minutes)

**1. Coverage Report** (`Coverage` in left menu)

- ✅ Should see green bar (most pages indexed)
- ⚠️ Check for new "Errors" (investigate & fix)
- ✅ Click "Valid" to see indexed pages count
- 💡 Target: 95%+ coverage of published articles

**2. Performance Report** (`Performance` tab)

- ✅ Check top 10 queries driving traffic
- ✅ Sort by "Clicks" (high volume queries)
- ✅ Sort by "Position" (keywords you rank for)
- 💡 Track: Total impressions, clicks, average position

**3. Mobile Usability** (if available)

- ✅ Should show "No issues"
- ⚠️ If issues: Fix immediately (mobile = 60%+ traffic)

---

## 🔍 DETAILED MONITORING: MONTHLY CHECKLIST

### First Week of Each Month (1 hour)

#### 1. Performance Deep Dive

**Queries Report:**

```
Questions to ask monthly:
1. Which queries bring most traffic?
2. Which queries have high clicks but low position (10-20)?
   → Opportunity to optimize titles/descriptions
3. Which queries are trending up?
   → Opportunity to expand content
4. Which queries are trending down?
   → May need content refresh
```

**Action Items:**

- [ ] Export top 100 queries to spreadsheet
- [ ] Identify 5-10 queries with high impressions but low CTR
- [ ] Optimize titles/descriptions for those queries
- [ ] Monitor position changes week-over-week

#### 2. Coverage Issues

**Actions to take:**

```
CRAWL ERRORS → Fix immediately
- Go to "Coverage" → "Errors"
- Common issues:
  - URL returns 404 (delete old content properly)
  - Redirect chain (fix to direct redirect)
  - Timeout (server issues, contact hosting)

EXCLUDED URLS → Monitor
- Valid (soft 404) - pages with no content
- Not selected - set canonical or add internal links
- Noindex - review if intentional

VALID WITH WARNINGS → Review
- Duplicate content - add canonical if needed
- Mobile usability - fix responsive issues
```

#### 3. Link Analysis

**Backlinks Report:**

- [ ] Identify top referring sites
- [ ] Look for new high-DA sites linking to you
- [ ] Check for suspicious/low-quality backlinks
- [ ] Use "External links" report to outreach for more links

#### 4. Core Web Vitals

**Location:** `Experience` → `Core Web Vitals`

**Monitor these metrics:**
| Metric | Target | Status |
|--------|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | Good ✅ / Needs work ⚠️ |
| FID (First Input Delay) | < 100ms | Good ✅ / Needs work ⚠️ |
| CLS (Cumulative Layout Shift) | < 0.1 | Good ✅ / Needs work ⚠️ |

**If poor CWV:**

- Contact development team immediately
- Affects rankings significantly
- Improvements: image optimization, caching, code splitting

#### 5. New Content Indexing

```
When publishing article:
1. Day 1: Use GSC URL Inspection → "Request indexing"
2. Day 2: Check if indexed (URL Inspection again)
3. Day 3-7: Monitor in "Performance" report
4. Week 2: Should start appearing in search results
5. Week 3-4: Should see initial traffic
```

---

## 🎯 ADVANCED: KEYWORD RANKING TRACKING

### Method 1: Google Search Console (Free)

**Limitations:**

- Shows average position (not exact ranking)
- 90-day retention only
- Limited to queries >1 search

**Steps:**

1. Export Performance data monthly (CSV)
2. Create tracking spreadsheet
3. Note key keywords & positions
4. Set alerts for position changes >5 spots

### Method 2: Free Alternatives

- **Ubersuggest** (5 free position checks/day)
- **SE Ranking** (limited free tier)
- **Rank Tracker** pro version

### Method 3: Paid Tools (Recommended for serious SEO)

- **SEMrush**: $120+/month (best all-around)
- **Ahrefs**: $99+/month (best backlink analysis)
- **Moz Pro**: $99+/month (solid & simple)

---

## 🚨 CRISIS MANAGEMENT

### Traffic Drop Detection

**If organic traffic drops >20% in a week:**

1. **Check Google Search Console first:**
   - Any new coverage errors? → Fix immediately
   - Core Web Vitals degraded? → Investigate performance
   - Algorithm update? → Check Google Status page

2. **Check technical issues:**
   - Is site accessible? → Test from multiple locations
   - Any server errors? → Check error logs
   - Is SSL certificate valid? → Check HTTPS
   - Any recent deployments? → Review changes

3. **Check for spam/penalties:**
   - Manual actions in GSC? → Review & request reconsideration
   - Unnatural link pattern? → Disavow bad links
   - Check Search Console messages

4. **Monitor competitors:**
   - Did competitors improve? → Analyze their content
   - Are they ranking higher? → Compare keywords

### Indexation Issue

**If articles not appearing in search after week:**

1. **Verify in GSC:**
   - URL Inspection: Paste article URL
   - Check: "Valid" ✅ or error

2. **If showing error:**
   - "Page not indexed" → Request indexing again
   - "Crawl error" → Fix the error, retest
   - "Soft 404" → Add content or delete page

3. **If showing valid but not in SERP:**
   - Check: Is URL blocked by `robots.txt`? (it shouldn't be)
   - Check: Is page noindexed? (it shouldn't be)
   - Check: Is there duplicate content issue?
   - Try: Request indexing again

---

## 📈 QUARTERLY STRATEGY REVIEW (1-2 hours)

### Q2 Review Checklist:

- [ ] Analyze top 100 performing keywords
- [ ] Identify 10-15 opportunities (high volume, low ranking)
- [ ] Create content calendar for next quarter
- [ ] Review competitor rankings
- [ ] Assess content freshness needs
- [ ] Plan link-building outreach
- [ ] Review Core Web Vitals trends

### Data to Track Quarterly:

```
Metric | Target | This Q | Last Q | Change
--------|--------|----------|---------|--------
Organic Sessions | +30% YoY | TBD | ? | ?
Clicks from SERP | +40% YoY | TBD | ? | ?
Avg Position (top 20 KWs) | <5 | TBD | ? | ?
CTR Average | >5% | TBD | ? | ?
Coverage | >95% | TBD | ? | ?
Core Web Vitals | All Good | TBD | ? | ?
```

---

## 🔗 USEFUL GSC REPORTS & WHAT THEY MEAN

| Report               | Location               | What to Monitor                    | Action if Issue                         |
| -------------------- | ---------------------- | ---------------------------------- | --------------------------------------- |
| **Performance**      | Main tab               | Clicks, impressions, CTR, position | Optimize titles/descriptions if CTR low |
| **Coverage**         | Inspect → Coverage     | % of site indexed                  | Fix errors, request indexing            |
| **URL Inspection**   | Search bar             | Individual page details            | Debug crawl/indexing issues             |
| **Sitemaps**         | More → Sitemaps        | Sitemap status                     | Ensure "Success" status                 |
| **Mobile Usability** | Experience tab         | Mobile issues                      | Fix responsive design problems          |
| **Core Web Vitals**  | Experience tab         | Page speed metrics                 | Contact dev team for optimization       |
| **Backlinks**        | Links → External links | Who links to you                   | Identify link opportunities             |
| **Internal Links**   | Links → Internal links | Site architecture                  | Fix orphaned pages, improve structure   |
| **Anchor Text**      | Links → Anchor text    | Link text pointing to site         | Review for brand vs branded terms       |
| **Removals**         | Tools → Removals       | Temporarily hidden URLs            | Use to quickly hide outdated content    |

---

## 🔐 PERMISSIONS & TEAM ACCESS

### Adding Team Members:

1. Click **Settings** (gear icon)
2. Go to **Users and Permissions**
3. Click **Add user**
4. Enter email address
5. Choose role:
   - **Owner**: Full access + can delete property
   - **Full**: Can edit all settings
   - **Editor**: Can make changes, view data
   - **Reader**: View-only access

### Recommended Setup:

- **SEO Manager**: Owner
- **Content Lead**: Editor
- **Developers**: Full (for technical issues)
- **Executive Team**: Reader-only

---

## 💡 COMMON QUESTIONS

### Q: How long does content take to rank?

**A:** 1-4 weeks typical

- Day 1: Content should be indexed
- Week 1-2: Appear in SERPs (high position, usually)
- Week 2-4: Position stabilizes as content ages
- Month 2+: Compete for better positions

### Q: How often should sitemaps be submitted?

**A:** No need to re-submit after initial submission

- Google automatically crawls sitemaps regularly
- Only re-submit if format changes
- New articles automatically included via sitemap crawl

### Q: What's a good CTR from SERP?

**A:** Depends on position

- Position 1-3: 20-30% CTR is good
- Position 4-6: 10-20% CTR is good
- Position 7-10: 2-5% CTR is acceptable

If CTR is low for your position, optimize title/description.

### Q: Should I use domain property or URL prefix?

**A:** Use BOTH

- URL prefix: More detailed data for specific domain
- Domain: See data across all subdomains/protocols

---

## 📞 NEED HELP?

- **Google Search Console Help**: https://support.google.com/webmasters
- **Search Central**: https://developers.google.com/search/blog
- **Google Hangouts**: Regular Q&A sessions for GSC questions

---

**Prepared by**: SEO Optimization Team  
**Last Updated**: April 13, 2026  
**Next Review**: May 13, 2026
