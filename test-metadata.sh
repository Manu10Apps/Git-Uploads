#!/bin/bash
# Social Media Metadata Testing Script
# Tests article OG/Twitter metadata on production

echo "=========================================="
echo "Social Media Metadata Testing Script"
echo "=========================================="
echo ""

# Function to test an article
test_article() {
  local slug=$1
  echo "Testing article: $slug"
  echo "---"
  
  # Get OG image tag
  echo "✓ OG Image tag:"
  curl -s "https://intambwemedia.com/article/$slug" | grep -o 'property="og:image"[^>]*content="[^"]*"' | head -1
  
  echo ""
  echo "✓ Twitter Card image:"
  curl -s "https://intambwemedia.com/article/$slug" | grep -o 'name="twitter:image"[^>]*content="[^"]*"' | head -1
  
  echo ""
  echo "✓ Page Title:"
  curl -s "https://intambwemedia.com/article/$slug" | grep -o '<title>[^<]*</title>'
  
  echo ""
  echo "✓ Description:"
  curl -s "https://intambwemedia.com/article/$slug" | grep -o 'name="description"[^>]*content="[^"]*"' | head -1
  
  echo ""
  echo ""
}

# Function to test if image is accessible
test_image_url() {
  local url=$1
  echo "Testing image accessibility: $url"
  curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" -I "$url"
  echo ""
}

# Get a recent article from the database and test it
echo "Retrieving recent articles from database..."
echo ""

# Get the most recent article slug from database
RECENT_SLUG=$(curl -s "https://intambwemedia.com/api/articles?limit=1" 2>/dev/null | grep -o '"slug":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RECENT_SLUG" ]; then
  echo "⚠️  Could not retrieve recent article from API"
  echo ""
  echo "Manual testing:"
  echo "1. Visit: https://intambwemedia.com"
  echo "2. Note a recent article slug URL (e.g., from the URL bar)"
  echo "3. Run this command with your slug:"
  echo "   ./test-metadata.sh your-article-slug"
  exit 1
fi

echo "Testing with recent article: $RECENT_SLUG"
echo ""

test_article "$RECENT_SLUG"

# Extract image URL from OG tag and test if it's accessible
IMAGE_URL=$(curl -s "https://intambwemedia.com/article/$RECENT_SLUG" | grep -o 'property="og:image"[^>]*content="\([^"]*\)"' | sed 's/.*content="\([^"]*\)".*/\1/')

if [ -n "$IMAGE_URL" ]; then
  echo "Testing image accessibility..."
  test_image_url "$IMAGE_URL"
else
  echo "⚠️  Could not extract image URL from og:image tag"
fi

echo "=========================================="
echo "✅ Testing Complete"
echo "=========================================="
echo ""
echo "What to check:"
echo "- og:image should have absolute URL (https://intambwemedia.com/uploads/...)"
echo "- twitter:image should have absolute URL"
echo "- Page title should be the article title"
echo "- Description should be truncated to ~160 characters"
echo "- Image HTTP status should be 200 (not 404)"
echo ""
echo "If any fail:"
echo "1. Check database article.image field"
echo "2. Verify /public/uploads/ has the image file"
echo "3. Check file permissions (should be readable)"
