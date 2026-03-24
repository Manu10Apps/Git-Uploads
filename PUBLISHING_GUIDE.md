# Publishing Articles - Complete Guide

## Quick Start

### 1. Create an Article via Web Form (Easiest)

Visit: **`http://localhost:3000/admin/create-article`**

Fill out the form:

- **Title** - Article headline
- **Author** - Your name
- **Excerpt** - Brief summary (appears in listings)
- **Content** - Full article text
- **Category** - Choose from 8 categories
- **Image** - (Optional) Unsplash image URL
- **Tags** - Topics separated by commas
- **Read Time** - Minutes to read
- **Featured** - Check to display on homepage

Click "Publish Article" - Done! ✓

### 2. Manage Articles

Visit: **`http://localhost:3000/admin/articles`**

- View all published articles
- Edit (coming soon)
- Delete articles
- See featured articles marked with ★

---

## API Methods

### Add Article via API

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Your Article Title",
    "excerpt": "Brief summary",
    "content": "Full article content here",
    "category": "technology",
    "author": "Your Name",
    "image": "https://images.unsplash.com/photo-xxx?w=800",
    "tags": ["tag1", "tag2"],
    "readTime": 5,
    "featured": false
  }'
```

**Required Fields:**

- `title` - Article headline
- `excerpt` - Summary for listings
- `content` - Full article body
- `category` - One of: technology, business, politics, health, education, culture, sports, investigations
- `author` - Author name

**Optional Fields:**

- `image` - Featured image URL
- `slug` - URL version (auto-generated)
- `tags` - Array of tags
- `readTime` - Minutes to read (default: 5)
- `featured` - Feature on homepage (default: false)

### Fetch Articles

```bash
# Get all articles (latest first)
curl http://localhost:3000/api/articles

# Get articles by category
curl http://localhost:3000/api/articles?category=technology

# Get limited articles
curl http://localhost:3000/api/articles?limit=10

# Get featured articles only
curl http://localhost:3000/api/articles?featured=true

# Combine filters
curl http://localhost:3000/api/articles?category=technology&limit=5&featured=true
```

### Get Single Article

```bash
curl http://localhost:3000/api/articles/1
```

### Delete Article

```bash
curl -X DELETE http://localhost:3000/api/articles/1
```

---

## Data Storage

All articles are stored in PostgreSQL via Prisma (`Article` table/model).

### Article API Payload Structure

```json
{
  "id": "7",
  "title": "Article Title",
  "slug": "article-title",
  "excerpt": "Brief summary",
  "content": "Full article content",
  "image": "https://image-url.com/photo.jpg",
  "category": "technology",
  "author": "Author Name",
  "publishedAt": "2/4/2026, 10:30:00 AM",
  "readTime": 5,
  "tags": ["tag1", "tag2"],
  "featured": false,
  "status": "published"
}
```

---

## Categories Available

| Category         | Use For                             |
| ---------------- | ----------------------------------- |
| `technology`     | Tech, startups, innovation          |
| `business`       | Business, economy, markets          |
| `politics`       | Politics, government, elections     |
| `health`         | Health, medical, wellness           |
| `education`      | Education, schools, learning        |
| `culture`        | Arts, culture, society, lifestyle   |
| `sports`         | Sports, athletes, events            |
| `investigations` | Investigations, exposés, deep dives |

---

## Best Practices

✓ **Use Clear Titles**

- Good: "Rwanda Launches Digital Transformation Initiative"
- Bad: "News Update"

✓ **Write Compelling Excerpts**

- 100-150 characters
- Should encourage clicks
- Summarize key point

✓ **Use Unsplash Images**

- Free, high-quality images
- Format: `https://images.unsplash.com/photo-ID?w=800&q=80`
- Always use absolute URLs (https://)

✓ **Add Relevant Tags**

- 2-4 tags per article
- Helps with discovery
- Use consistent naming

✓ **Estimate Read Time Accurately**

- ~200 words = 1 minute
- Include code/visuals in count

✓ **Mark Features Carefully**

- Only featured articles show on homepage
- Use for major stories
- Max 1-2 featured at a time

---

## Troubleshooting

**Article not showing?**

- Check `status: "published"` in JSON
- Verify category is spelled correctly

**Image not displaying?**

- Use `https://` URLs (not http://)
- Test URL directly in browser
- Try different Unsplash images

**API returns error?**

- Ensure all required fields provided
- Check JSON syntax is valid
- Verify category exists

**Page not loading?**

- Check browser console for errors
- Refresh page to retry
- Verify API is running

---

## Examples

### Example 1: Technology Article

```json
{
  "title": "AI Revolution: New Models Change Workplace",
  "excerpt": "Artificial intelligence systems are reshaping how teams work and collaborate across East Africa.",
  "content": "Full article content about AI...",
  "category": "technology",
  "author": "Jane Doe",
  "image": "https://images.unsplash.com/photo-1677442d019cecf8a42c9a98169e90f0?w=800&q=80",
  "tags": ["AI", "Technology", "Innovation"],
  "readTime": 6,
  "featured": true
}
```

### Example 2: Investigation Article

```json
{
  "title": "Investigation: Lost Billions in Government Contracts",
  "excerpt": "A 6-month investigation reveals systematic fraud in procurement affecting billions.",
  "content": "Full investigation findings...",
  "category": "investigations",
  "author": "John Smith",
  "tags": ["Corruption", "Government", "Investigation"],
  "readTime": 15,
  "featured": false
}
```

---

## Next Steps

1. **Try Web Form** - Visit `/admin/create-article` and publish first article
2. **Try API** - Use curl or Postman to add article programmatically
3. **Visit Homepage** - See article appear in latest stories
4. **Visit Category** - See article in category page
5. **Connect Database** - Replace JSON with real database (MongoDB, PostgreSQL)
