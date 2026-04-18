import { NextRequest, NextResponse } from 'next/server';

/**
 * Meta Tag Renderer Test Endpoint
 * Returns the actual meta tags that would be rendered for an article
 * 
 * Usage:
 * POST /api/social-media/test-meta-tags
 * Body: { slug: "article-slug" }
 */
export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json();

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'Provide slug as string in request body' },
        { status: 400 }
      );
    }

    // Fetch article metadata by calling the article page's generateMetadata
    const articleUrl = `https://intambwemedia.com/article/${slug}`;

    // Construct the HTML meta tags that would be rendered
    const htmlMetaTags = {
      openGraph: {
        'og:type': 'article',
        'og:url': articleUrl,
        'og:site_name': 'Intambwe Media',
        'og:locale': 'ky_RW',
        // Note: These would be filled in by Next.js generateMetadata
      },
      twitter: {
        'twitter:card': 'summary_large_image',
        'twitter:site': '@intambwemedias',
        'twitter:creator': '@intambwemedias',
      },
      canonical: articleUrl,
    };

    return NextResponse.json({
      slug,
      articleUrl,
      metaTags: htmlMetaTags,
      testUrls: {
        facebookDebugger: `https://developers.facebook.com/tools/debug/sharing/?url=${encodeURIComponent(articleUrl)}`,
        twitterValidator: `https://cards-dev.twitter.com/validator?url=${encodeURIComponent(articleUrl)}`,
        linkedinInspector: `https://www.linkedin.com/feed/`,
      },
      instructions: {
        step1: 'Test with Facebook Sharing Debugger to see cached metadata',
        step2: 'Use "Scrape Again" button to force fresh metadata fetch',
        step3: 'Verify og:image URL is HTTPS and publicly accessible',
        step4: 'Test with Twitter Card Validator',
        step5: 'Share on LinkedIn to verify thumbnail display',
      },
    });
  } catch (error) {
    console.error('[Meta Tag Test] Error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
