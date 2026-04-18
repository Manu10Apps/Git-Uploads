import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { resolveOgImageUrl, validateImageUrl } from '@/lib/social-media-metadata';

/**
 * Diagnostic endpoint to verify OG image metadata for articles
 * Tests the complete image URL transformation pipeline
 * 
 * Usage:
 * GET /api/social-media/og-image-diagnostic?slug=article-slug
 * GET /api/social-media/og-image-diagnostic?articleId=123
 * GET /api/social-media/og-image-diagnostic?checkAll=true (lists first 20 articles)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const articleId = searchParams.get('articleId');
    const checkAll = searchParams.get('checkAll') === 'true';

    const SITE_URL = 'https://intambwemedia.com';

    // Single article by slug
    if (slug) {
      const article = await prisma.article.findUnique({
        where: { slug },
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          gallery: true,
        },
      });

      if (!article) {
        return NextResponse.json(
          { error: `Article not found for slug: ${slug}` },
          { status: 404 }
        );
      }

      return testArticleImage(article, SITE_URL);
    }

    // Single article by ID
    if (articleId) {
      const article = await prisma.article.findUnique({
        where: { id: parseInt(articleId, 10) },
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          gallery: true,
        },
      });

      if (!article) {
        return NextResponse.json(
          { error: `Article not found with ID: ${articleId}` },
          { status: 404 }
        );
      }

      return testArticleImage(article, SITE_URL);
    }

    // Check all articles (first 20)
    if (checkAll) {
      const articles = await prisma.article.findMany({
        where: { status: 'published' },
        select: {
          id: true,
          title: true,
          slug: true,
          image: true,
          gallery: true,
        },
        take: 20,
        orderBy: { publishedAt: 'desc' },
      });

      const results = articles.map((article) => testArticleImageSync(article, SITE_URL));

      const summary = {
        totalChecked: articles.length,
        withFeaturedImage: results.filter((r) => r.hasFeaturedImage).length,
        validOgImages: results.filter((r) => r.validOgImage).length,
        issues: results.filter((r) => !r.validOgImage),
        allResults: results,
      };

      return NextResponse.json(summary);
    }

    return NextResponse.json(
      {
        error: 'Provide one of: slug, articleId, or checkAll=true',
        examples: {
          bySlug: '/api/social-media/og-image-diagnostic?slug=my-article-slug',
          byId: '/api/social-media/og-image-diagnostic?articleId=123',
          checkAll: '/api/social-media/og-image-diagnostic?checkAll=true',
        },
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[OG Image Diagnostic] Error:', error);
    return NextResponse.json(
      { error: 'Diagnostic failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function testArticleImageSync(
  article: { id: number; title: string; slug: string; image: string | null; gallery: string | null },
  siteUrl: string
) {
  const SITE_URL = siteUrl;
  const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

  const normalized = normalizeArticleImageUrl(article.image);
  const resolved = resolveOgImageUrl(article.image, normalizeArticleImageUrl);
  const isValid = validateImageUrl(resolved);

  return {
    articleId: article.id,
    slug: article.slug,
    title: article.title,
    rawImage: article.image,
    normalized,
    resolved,
    validOgImage: isValid && resolved !== DEFAULT_OG_IMAGE,
    hasFeaturedImage: !!article.image,
    usingFallback: resolved === DEFAULT_OG_IMAGE,
    issues: {
      noFeaturedImage: !article.image,
      normalizationFailed: !normalized && !!article.image,
      validationFailed: !isValid,
      usingFallback: resolved === DEFAULT_OG_IMAGE,
    },
  };
}

async function testArticleImage(
  article: { id: number; title: string; slug: string; image: string | null; gallery: string | null },
  siteUrl: string
): Promise<NextResponse> {
  return NextResponse.json({
    diagnostic: testArticleImageSync(article, siteUrl),
    recommendations: generateRecommendations(article),
    nextSteps: [
      'Verify the resolved URL is publicly accessible',
      'Check image is at least 1200x630 pixels',
      'Test with Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/sharing/',
      'Test with Twitter Card Validator: https://cards-dev.twitter.com/validator',
    ],
  });
}

function generateRecommendations(article: {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  gallery: string | null;
}): string[] {
  const recommendations: string[] = [];

  if (!article.image) {
    recommendations.push('⚠️  Article has NO featured image - add one immediately');
    recommendations.push('   → Upload image in admin panel or via API');
    recommendations.push('   → Image should be at least 1200x630 pixels');
    recommendations.push('   → Use JPEG, PNG, or WebP format');
  }

  const normalized = normalizeArticleImageUrl(article.image);
  if (article.image && !normalized) {
    recommendations.push('⚠️  Image path format not recognized');
    recommendations.push(`   → Current value: ${article.image}`);
    recommendations.push('   → Expected format: /uploads/article-*.{jpg,png,webp}');
  }

  return recommendations;
}
