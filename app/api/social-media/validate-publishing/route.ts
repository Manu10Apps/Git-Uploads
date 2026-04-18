import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { resolveOgImageUrl, validateImageUrl } from '@/lib/social-media-metadata';

/**
 * Article Publishing Validation Endpoint
 * Validates that an article has all required metadata for social sharing
 * Prevents publishing articles without proper featured images
 * 
 * Usage:
 * POST /api/social-media/validate-for-publishing
 * Body: { articleId: 123 }
 * 
 * Returns: { valid: boolean, errors: [], warnings: [], metadata: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const { articleId } = await request.json();

    if (!articleId || typeof articleId !== 'number') {
      return NextResponse.json(
        { error: 'Provide articleId as number in request body' },
        { status: 400 }
      );
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        image: true,
        seoTitle: true,
        seoDescription: true,
        gallery: true,
        status: true,
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: `Article not found with ID: ${articleId}` },
        { status: 404 }
      );
    }

    const SITE_URL = 'https://intambwemedia.com';
    const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

    const errors: string[] = [];
    const warnings: string[] = [];
    const metadata: Record<string, unknown> = {
      articleId: article.id,
      slug: article.slug,
      status: article.status,
    };

    // 1. Check featured image
    if (!article.image) {
      errors.push('❌ CRITICAL: No featured image - article cannot be published');
      warnings.push('Upload a featured image at least 1200x630 pixels before publishing');
    } else {
      const normalized = normalizeArticleImageUrl(article.image);
      if (!normalized) {
        errors.push(`❌ CRITICAL: Featured image path invalid: "${article.image}"`);
        warnings.push('Use format: /uploads/article-*.{jpg,png,webp}');
      } else {
        const resolved = resolveOgImageUrl(article.image, normalizeArticleImageUrl);
        const isValid = validateImageUrl(resolved);

        metadata['og:image'] = resolved;
        metadata['og:image:valid'] = isValid;

        if (!isValid) {
          errors.push(`❌ CRITICAL: og:image URL validation failed: "${resolved}"`);
          warnings.push('Ensure URL is HTTPS, public, and has valid image extension');
        }

        if (resolved === DEFAULT_OG_IMAGE) {
          errors.push('❌ CRITICAL: Using fallback logo instead of featured image');
          warnings.push('Replace featured image - check image path in database');
        }
      }
    }

    // 2. Check SEO title
    if (!article.seoTitle || !article.seoTitle.trim()) {
      warnings.push('⚠️  No SEO title - using article title');
      metadata['og:title'] = article.title;
    } else {
      metadata['og:title'] = article.seoTitle;
    }

    // 3. Check SEO description
    if (!article.seoDescription || !article.seoDescription.trim()) {
      warnings.push('⚠️  No SEO description - using excerpt');
      metadata['og:description'] = article.excerpt?.substring(0, 160) || '';
    } else {
      metadata['og:description'] = article.seoDescription.substring(0, 160);
    }

    // 4. Check for gallery if no featured image
    if (!article.image && article.gallery) {
      try {
        const gallery = JSON.parse(article.gallery);
        if (Array.isArray(gallery) && gallery.length > 0) {
          warnings.push(
            `ℹ️  No featured image, but gallery exists with ${gallery.length} item(s) - could use first image as fallback`
          );
          metadata['gallery:fallback'] = `Could use first gallery image as og:image`;
        }
      } catch {
        // Ignore parsing errors
      }
    }

    const isValid = errors.length === 0;

    return NextResponse.json({
      valid: isValid,
      articleId,
      slug: article.slug,
      status: article.status,
      canPublish: isValid,
      errors,
      warnings,
      metadata,
      nextSteps: isValid
        ? [
            '✅ Article is ready for publishing',
            'Featured image will display on social media',
            'Meta tags are properly configured',
          ]
        : ['🔧 Fix critical errors before publishing', '💾 Update article and try again'],
    });
  } catch (error) {
    console.error('[Publishing Validation] Error:', error);
    return NextResponse.json(
      { error: 'Validation failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check all articles without featured images
 * Returns list of articles that need featured images before publishing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'missing-images') {
      const articlesWithoutImages = await prisma.article.findMany({
        where: {
          image: null,
          status: 'published', // Or 'draft' depending on your preference
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        take: 50,
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({
        action: 'missing-images',
        count: articlesWithoutImages.length,
        articles: articlesWithoutImages,
        recommendation: 'Add featured images to these articles to enable social media sharing',
      });
    }

    return NextResponse.json(
      {
        error: 'Provide action parameter',
        examples: {
          missingImages: '/api/social-media/validate-publishing?action=missing-images',
        },
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Publishing Validation GET] Error:', error);
    return NextResponse.json(
      { error: 'Check failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
