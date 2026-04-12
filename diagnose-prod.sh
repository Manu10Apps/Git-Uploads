#!/bin/bash

# Production Metadata Diagnostic Script
# Comprehensive testing for social media OG/Twitter tags

set -e

SITE="https://intambwemedia.com"

echo "=========================================="
echo "Production Metadata Diagnostics"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Test 1: Check if site is up
echo -e "${YELLOW}[1/6]${NC} Checking if site is reachable..."
if curl -s -o /dev/null -w "%{http_code}" "$SITE" | grep -q "200"; then
  echo -e "${GREEN}✓${NC} Site is reachable"
else
  echo -e "${RED}✗${NC} Site returned non-200 status"
  exit 1
fi
echo ""

# Test 2: Check API endpoint
echo -e "${YELLOW}[2/6]${NC} Testing API endpoints..."
echo "Trying: $SITE/api/articles"
API_RESPONSE=$(curl -s "$SITE/api/articles?limit=1")
echo "API Response (first 500 chars):"
echo "$API_RESPONSE" | head -c 500
echo ""
echo ""

# Test 3: Check if we can access the homepage to find article links
echo -e "${YELLOW}[3/6]${NC} Extracting article links from homepage..."
ARTICLE_LINKS=$(curl -s "$SITE" | grep -o 'href="/article/[^"]*"' | head -3)
if [ -z "$ARTICLE_LINKS" ]; then
  echo -e "${YELLOW}⚠${NC}  No article links found in homepage"
  echo "Trying alternative patterns..."
  ARTICLE_LINKS=$(curl -s "$SITE" | grep -o 'article/[a-zA-Z0-9-]*' | head -3)
fi

if [ -n "$ARTICLE_LINKS" ]; then
  echo -e "${GREEN}✓${NC} Found article links:"
  echo "$ARTICLE_LINKS" | head -3
else
  echo -e "${RED}✗${NC} Could not find article links"
  echo "Trying direct article URL..."
fi
echo ""

# Test 4: Test metadata on homepage
echo -e "${YELLOW}[4/6]${NC} Testing homepage metadata..."
echo "OG Image:"
curl -s "$SITE" | grep -i 'og:image' | head -1
echo ""
echo "Twitter Image:"
curl -s "$SITE" | grep -i 'twitter:image' | head -1
echo ""

# Test 5: Test a random article slug
echo -e "${YELLOW}[5/6]${NC} Testing article metadata..."
# Try to extract a slug from homepage
SLUG=$(curl -s "$SITE" | grep -o '/article/[a-zA-Z0-9-]*' | head -1 | cut -d'/' -f3)

if [ -n "$SLUG" ]; then
  echo "Testing article: $SLUG"
  echo ""
  echo "OG Image:"
  OG_IMAGE=$(curl -s "$SITE/article/$SLUG" | grep -i 'og:image' | head -1)
  echo "$OG_IMAGE"
  
  echo ""
  echo "Twitter Image:"
  TWITTER_IMAGE=$(curl -s "$SITE/article/$SLUG" | grep -i 'twitter:image' | head -1)
  echo "$TWITTER_IMAGE"
  
  echo ""
  echo "Page Title:"
  curl -s "$SITE/article/$SLUG" | grep -o '<title>[^<]*</title>'
  
  echo ""
  echo "Description:"
  curl -s "$SITE/article/$SLUG" | grep -o 'name="description"[^>]*content="[^"]*"' | head -1
  
  # Extract image URL and test it
  echo ""
  IMAGE_URL=$(curl -s "$SITE/article/$SLUG" | grep -o 'property="og:image"[^>]*content="\([^"]*\)"' | sed 's/.*content="\([^"]*\)".*/\1/' | head -1)
  
  if [ -n "$IMAGE_URL" ]; then
    echo -e "${YELLOW}[6/6]${NC} Testing image accessibility..."
    echo "Image URL: $IMAGE_URL"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_URL")
    echo "HTTP Status: $HTTP_STATUS"
    
    if [ "$HTTP_STATUS" = "200" ]; then
      echo -e "${GREEN}✓${NC} Image is accessible"
    else
      echo -e "${RED}✗${NC} Image returned status $HTTP_STATUS (expected 200)"
    fi
  else
    echo -e "${YELLOW}⚠${NC}  Could not extract image URL from metadata"
  fi
else
  echo -e "${RED}✗${NC} Could not extract article slug from homepage"
  echo ""
  echo "Try manually:"
  echo "1. Visit: $SITE"
  echo "2. Pick an article URL from the page"
  echo "3. Extract the slug (e.g., if URL is /article/my-article-title, slug is 'my-article-title')"
  echo "4. Run:"
  echo "   curl -s '$SITE/article/YOUR_SLUG_HERE' | grep -i 'og:image'"
fi

echo ""
echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
