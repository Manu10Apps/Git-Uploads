# Adding Real Articles to Amakuru

This guide explains how to add and manage real articles in the Amakuru news platform.

## System Overview

The application now uses a centralized articles system:

- **Data Storage**: PostgreSQL via Prisma `Article` model
- **API Route**: `app/api/articles/route.ts` - Handles article CRUD operations
- **Pages**: Fetch articles dynamically from the API instead of hardcoded mock data

## Adding Articles

### Option 1: Admin Panel (Recommended)

Use `/admin/create-article` and `/admin/edit-article/[id]`.

Articles are written directly to the database with support for:

- draft
- published
- archived (unpublished)

**Available Categories:**

- `technology`
- `business`
- `politics`
- `health`
- `education`
- `culture`
- `sports`
- `investigations`

### Option 2: API POST Request

Send a POST request to `/api/articles` to create articles programmatically:

```bash
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Your Article Title",
    "excerpt": "Brief summary",
    "content": "Full content",
    "category": "technology",
    "author": "Author Name",
    "image": "https://image-url.com",
    "readTime": 5,
    "tags": ["tag1", "tag2"],
    "featured": false
  }'
```

**Required Fields:**

- `title` - Article headline
- `excerpt` - Short summary for listings
- `category` - One of the available categories
- `author` - Author name

**Optional Fields:**

- `content` - Full article body (defaults to excerpt)
- `image` - Featured image URL (defaults to placeholder)
- `slug` - URL-friendly version (auto-generated from title)
- `readTime` - Minutes to read (defaults to 5)
- `tags` - Array of tags
- `featured` - Mark as featured (defaults to false)
- `publishedAt` - Publication date (auto-generated)

### Option 3: Direct API Usage

You can still use API requests directly from scripts/tools; all writes go to the database.

## Using Articles in Pages

All pages now fetch articles from the API. Example:

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    fetch('/api/articles?limit=6')
      .then((res) => res.json())
      .then((data) => setArticles(data.data));
  }, []);

  return (
    <div>
      {articles.map((article) => (
        <div key={article.id}>{article.title}</div>
      ))}
    </div>
  );
}
```

## API Endpoints

### GET /api/articles

Fetch articles with optional filters.

**Query Parameters:**

- `category` - Filter by category
- `limit` - Number of articles to return
- `featured` - Get only featured articles (`true`/`false`)

**Examples:**

```
GET /api/articles
GET /api/articles?category=technology
GET /api/articles?limit=10
GET /api/articles?featured=true
GET /api/articles?category=politics&limit=5
```

### POST /api/articles

Create a new article.

**Request Body:**

```json
{
  "title": "Article Title",
  "excerpt": "Article excerpt",
  "category": "technology",
  "author": "Author Name",
  "content": "Full article content",
  "image": "https://image-url.com",
  "tags": ["tag1", "tag2"]
}
```

## Article Structure

Every article has these fields:

| Field         | Type           | Description                   |
| ------------- | -------------- | ----------------------------- |
| `id`          | number         | Unique identifier             |
| `title`       | string         | Article headline              |
| `slug`        | string         | URL-friendly title            |
| `excerpt`     | string         | Short summary                 |
| `content`     | string         | Full article body             |
| `image`       | string         | Featured image URL            |
| `category`    | string         | Article category              |
| `author`      | string         | Author name                   |
| `publishedAt` | string \| null | Publication date/time         |
| `readTime`    | number         | Estimated read time (minutes) |
| `tags`        | array          | Topic tags                    |
| `featured`    | boolean        | Feature on homepage           |
| `status`      | string         | Publication status            |

## Next Steps

1. **Add your first article** via Admin panel or API
2. **Test retrieval** by visiting:
   - Homepage: Shows featured + latest articles
   - Category pages: `/category/technology`, `/category/business`, etc.
   - Search: Use search bar to find articles
3. **Verify DATABASE_URL** points to PostgreSQL in production
4. **Add admin panel** for easy article management

## Troubleshooting

- **Articles not showing**: Check article `status` and `publishedAt` in database
- **API errors**: Ensure all required fields are provided
- **Image not loading**: Use absolute image URLs (https://)
- **Category filter not working**: Verify category name matches available categories
