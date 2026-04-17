import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeArticleImageUrl } from '@/lib/utils';
import { resolveOgImageUrl, validateImageUrl } from '@/lib/social-media-metadata';

/**
 * GET /api/admin/social-media-debug?slug=article-slug
 * 
 * Diagnostic endpoint to verify social media sharing metadata
 * Tests og:image URL accessibility and all meta tag generation
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const lang = request.nextUrl.searchParams.get('lang') || 'ky';

  if (!slug) {
    return NextResponse.json({
      error: 'Missing slug parameter',
      usage: '/api/admin/social-media-debug?slug=article-slug&lang=ky',
    }, { status: 400 });
  }

  try {
    // Fetch article
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        excerpt: true,
        image: true,
        author: true,
        seoTitle: true,
        seoDescription: true,
        category: { select: { name: true } },
        publishedAt: true,
      },
    });

    if (!article) {
      return NextResponse.json({
        error: 'Article not found',
        slug,
      }, { status: 404 });
    }

    // Test image resolution
    const normalized = normalizeArticleImageUrl(article.image);
    const ogImageUrl = resolveOgImageUrl(article.image, normalizeArticleImageUrl);
    const isValidUrl = validateImageUrl(ogImageUrl);

    // Test image accessibility
    let imageAccessible = false;
    let imageStatusCode = null;
    let imageHeaders: Record<string, any> = {};
    let imageAccessError = '';

    try {
      const imgResponse = await fetch(ogImageUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        },
        timeout: 10000,
      });

      imageStatusCode = imgResponse.status;
      imageAccessible = imgResponse.ok;

      // Extract useful headers
      const contentType = imgResponse.headers.get('content-type');
      const contentLength = imgResponse.headers.get('content-length');
      const cacheControl = imgResponse.headers.get('cache-control');
      const lastModified = imgResponse.headers.get('last-modified');

      imageHeaders = {
        'Content-Type': contentType,
        'Content-Length': contentLength,
        'Cache-Control': cacheControl,
        'Last-Modified': lastModified,
        'X-Accessible-To-Bots': imageStatusCode === 200 ? '✅ YES' : `❌ NO (${imageStatusCode})`,
      };

      if (!imgResponse.ok) {
        imageAccessError = `HTTP ${imageStatusCode}: Image not accessible to social media crawlers`;
      }
    } catch (err: any) {
      imageAccessError = `Failed to fetch: ${err?.message || String(err)}`;
    }

    // Determine OG meta tags that would be generated
    const ogTitle = article.seoTitle || article.title;
    const ogDescription = article.seoDescription || article.excerpt;
    const articleUrl = `https://intambwemedia.com/article/${slug}`;

    // Generate detailed report
    const report = {
      article: {
        slug,
        id: article.id,
        title: article.title,
        image: article.image,
        author: article.author,
      },
      imageProcessing: {
        rawImage: article.image,
        normalizedPath: normalized,
        resolvedUrl: ogImageUrl,
        isValid: isValidUrl,
      },
      imageAccessibility: {
        urlTestedAgainst: ogImageUrl,
        accessible: imageAccessible,
        statusCode: imageStatusCode,
        error: imageAccessError || null,
        headers: imageHeaders,
      },
      generatedMetaTags: {
        openGraph: {
          'og:title': ogTitle,
          'og:description': ogDescription,
          'og:image': ogImageUrl,
          'og:image:width': '1200',
          'og:image:height': '630',
          'og:url': articleUrl,
          'og:type': 'article',
        },
        twitter: {
          'twitter:card': 'summary_large_image',
          'twitter:title': ogTitle,
          'twitter:description': ogDescription,
          'twitter:image': ogImageUrl,
        },
        jsonLd: {
          '@type': 'NewsArticle',
          headline: ogTitle,
          image: ogImageUrl,
          author: article.author,
          datePublished: article.publishedAt?.toISOString(),
        },
      },
      diagnostics: {
        readyForSharing: imageAccessible && isValidUrl,
        issues: [],
        recommendations: [],
      },
    };

    // Add issues and recommendations
    if (!article.image) {
      report.diagnostics.issues.push('❌ No featured image set on article');
      report.diagnostics.recommendations.push('Set a featured image (minimum 1200x630 pixels)');
    }

    if (!isValidUrl) {
      report.diagnostics.issues.push('❌ Image URL validation failed');
      report.diagnostics.recommendations.push('Check image URL format, extension, and accessibility');
    }

    if (imageStatusCode && imageStatusCode !== 200) {
      report.diagnostics.issues.push(`❌ Image HTTP status: ${imageStatusCode}`);
      report.diagnostics.recommendations.push('Ensure image is served at public URL without authentication');
    }

    if (imageAccessError) {
      report.diagnostics.issues.push(`❌ ${imageAccessError}`);
      report.diagnostics.recommendations.push('Test image URL directly in browser to verify accessibility');
    }

    if (!ogDescription || ogDescription.length < 20) {
      report.diagnostics.issues.push('⚠️  Description is too short (recommend 50-160 characters)');
      report.diagnostics.recommendations.push('Write a more detailed excerpt/SEO description');
    }

    if (report.diagnostics.issues.length === 0) {
      report.diagnostics.issues.push('✅ All checks passed! Article ready for social sharing');
    }

    return NextResponse.json({
      success: true,
      report,
      testUrlsForManualValidation: {
        facebook: `https://developers.facebook.com/tools/debug/sharing/?url=${encodeURIComponent(articleUrl)}`,
        twitter: `https://cards-dev.twitter.com/validator?url=${encodeURIComponent(articleUrl)}`,
        linkedin: `https://www.linkedin.com/feed/update/urn:li:ugcPost:validate?url=${encodeURIComponent(articleUrl)}`,
      },
    });
  } catch (error) {
    console.error('[social-media-debug] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
      success: false,
    }, { status: 500 });
  }
}
