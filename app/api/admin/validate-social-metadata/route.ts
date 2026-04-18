import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { resolveOgImageUrl, validateImageUrl, validateImageAccessibility } from '@/lib/social-media-metadata';

/**
 * POST /api/admin/validate-social-metadata
 * 
 * Validates that an article has proper social media sharing metadata
 * Used before publishing articles - prevents publishing without featured image
 * 
 * Request body:
 * {
 *   "articleId": 123,
 *   "checkImageAccessibility": true  // Optional, defaults to true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { articleId, checkImageAccessibility = true } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { error: 'Missing articleId' },
        { status: 400 }
      );
    }

    // Fetch article with necessary fields
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        image: true,
        gallery: true,
        seoTitle: true,
        seoDescription: true,
        category: { select: { name: true } },
      },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found', articleId },
        { status: 404 }
      );
    }

    const SITE_URL = 'https://intambwemedia.com';
    const issues: string[] = [];
    const warnings: string[] = [];

    // 1. Check featured image exists
    if (!article.image) {
      issues.push('❌ No featured image set. Articles must have a featured image for social sharing.');
    } else {
      // 2. Check image path normalization
      const normalized = normalizeArticleImageUrl(article.image);
      if (!normalized) {
        issues.push(
          `❌ Featured image path cannot be normalized: "${article.image}". ` +
          'The image filename or path format is not recognized.'
        );
      } else {
        // 3. Check URL resolution
        const ogImageUrl = resolveOgImageUrl(article.image, normalizeArticleImageUrl);
        const isValidUrl = validateImageUrl(ogImageUrl);

        if (!isValidUrl) {
          issues.push(
            `❌ Featured image URL is invalid or not suitable for social media: ${ogImageUrl}. ` +
            'URL must be HTTPS and have an image extension.'
          );
        } else {
          // 4. Optionally check image accessibility
          if (checkImageAccessibility) {
            const accessibility = await validateImageAccessibility(ogImageUrl);
            if (!accessibility.accessible) {
              if (accessibility.statusCode === 404) {
                issues.push(
                  `❌ Featured image cannot be accessed (HTTP 404). ` +
                  `File may not exist at: ${ogImageUrl}`
                );
              } else if (accessibility.statusCode && accessibility.statusCode >= 400) {
                issues.push(
                  `❌ Featured image returned HTTP ${accessibility.statusCode}. ` +
                  `URL: ${ogImageUrl}`
                );
              } else if (accessibility.error) {
                // Network errors during deployment are common - warn instead of fail
                warnings.push(
                  `⚠️ Could not verify image accessibility (may be temporary): ${accessibility.error}`
                );
              }
            }
          }
        }
      }
    }

    // 5. Check SEO title/description
    const title = article.seoTitle || article.title;
    const description = article.seoDescription || article.excerpt;

    if (!title || title.trim().length === 0) {
      issues.push('❌ Article has no title for social sharing.');
    } else if (title.length > 60) {
      warnings.push(
        `⚠️ Article title is ${title.length} characters. ` +
        'Most social platforms truncate titles over 60 characters.'
      );
    }

    if (!description || description.trim().length === 0) {
      issues.push('❌ Article has no description for social sharing.');
    } else if (description.length < 50) {
      warnings.push(
        `⚠️ Article description is only ${description.length} characters. ` +
        'Consider adding more detail (150+ characters recommended).'
      );
    } else if (description.length > 160) {
      warnings.push(
        `⚠️ Article description is ${description.length} characters. ` +
        'Social platforms may truncate it (160 chars recommended).'
      );
    }

    // 6. Check category
    if (!article.category?.name) {
      warnings.push('⚠️ Article has no category assigned. This helps with social categorization.');
    }

    const isValid = issues.length === 0;
    const normalizedImage = article.image ? normalizeArticleImageUrl(article.image) : null;
    const ogImageUrl = normalizedImage
      ? resolveOgImageUrl(article.image, normalizeArticleImageUrl)
      : null;

    const response = {
      articleId: article.id,
      slug: article.slug,
      isValid,
      issues,
      warnings,
      metadata: {
        title: title || '(no title)',
        titleLength: title?.length || 0,
        description: description?.substring(0, 100) + (description && description.length > 100 ? '...' : '') || '(no description)',
        descriptionLength: description?.length || 0,
        category: article.category?.name || '(no category)',
        featuredImage: article.image,
        normalizedImage,
        ogImageUrl,
      },
    };

    console.log(
      `[VALIDATE:SOCIAL] Article ${article.id} (${article.slug}): ${isValid ? '✅ VALID' : '❌ INVALID'}`
    );

    return NextResponse.json(response, {
      status: isValid ? 200 : 400,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[VALIDATE:SOCIAL] Error:', errorMsg);
    return NextResponse.json(
      { error: 'Validation failed', details: errorMsg },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/validate-social-metadata?slug=article-slug
 * 
 * Validate article by slug (for convenience)
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const checkAccessibility = request.nextUrl.searchParams.get('checkAccessibility') !== 'false';

  if (!slug) {
    return NextResponse.json(
      { error: 'Missing slug parameter' },
      { status: 400 }
    );
  }

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found', slug },
        { status: 404 }
      );
    }

    // Delegate to POST handler
    const postRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        articleId: article.id,
        checkImageAccessibility: checkAccessibility,
      }),
    });

    return POST(postRequest);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[VALIDATE:SOCIAL] Error:', errorMsg);
    return NextResponse.json(
      { error: 'Validation failed', details: errorMsg },
      { status: 500 }
    );
  }
}
