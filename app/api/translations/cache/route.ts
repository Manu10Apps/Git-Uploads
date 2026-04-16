import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

function generateContentHash(title: string, content: string): string {
  return createHash('sha256').update(`${title}||${content}`).digest('hex').slice(0, 16);
}

/**
 * GET /api/translations/cache?articleId=123&lang=en
 * Check DB for an existing translation. Returns stale translations
 * with a flag so the client can show them immediately while refreshing.
 */
export async function GET(request: NextRequest) {
  const articleId = parseInt(request.nextUrl.searchParams.get('articleId') || '', 10);
  const lang = request.nextUrl.searchParams.get('lang');

  if (isNaN(articleId) || articleId <= 0 || !lang || !['en', 'sw'].includes(lang)) {
    return NextResponse.json({ data: null });
  }

  try {
    const translation = await prisma.articleTranslation.findUnique({
      where: { articleId_language: { articleId, language: lang } },
      select: {
        title: true,
        excerpt: true,
        content: true,
        galleryCaptions: true,
        translationSource: true,
        versionHash: true,
      },
    });

    if (!translation) {
      return NextResponse.json({ data: null });
    }

    // Parse galleryCaptions from JSON string if present
    let galleryCaptionsArray: Array<{ url: string; caption: string }> | null = null;
    if (translation.galleryCaptions) {
      try {
        galleryCaptionsArray = JSON.parse(translation.galleryCaptions);
      } catch (e) {
        console.warn('[translations/cache GET] Failed to parse galleryCaptions:', e);
      }
    }

    // Check if original content has changed since translation
    let stale = false;
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { title: true, content: true },
    });

    if (article) {
      const currentHash = generateContentHash(article.title, article.content);
      stale = translation.versionHash !== currentHash;
    }

    const responseData = {
      ...translation,
      galleryCaptions: galleryCaptionsArray,
    };

    return NextResponse.json(
      { data: responseData, stale },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
    );
  } catch {
    return NextResponse.json({ data: null });
  }
}

/**
 * POST /api/translations/cache
 * Save a client-side (LibreTranslate) translation to the database.
 */
export async function POST(request: NextRequest) {
  try {
    
    console.log('[translations/cache] POST request received');
    
    let body;
    try {
      body = await request.json();
      console.log('[translations/cache] Body parsed successfully');
    } catch (parseErr) {
      console.error('[translations/cache] JSON parse error:', parseErr);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    console.log('[translations/cache] Body keys:', Object.keys(body));
    const { articleId, language, title, excerpt, content, galleryCaptions } = body;

    // Validate inputs
    const id = Number(articleId);
    if (!Number.isInteger(id) || id <= 0) {
      console.error('[translations/cache] Invalid articleId:', articleId);
      return NextResponse.json({ error: 'Invalid articleId' }, { status: 400 });
    }

    if (!['en', 'sw'].includes(language)) {
      console.error('[translations/cache] Invalid language:', language);
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    if (!title || typeof title !== 'string') {
      console.error('[translations/cache] Missing or invalid title');
      return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      console.error('[translations/cache] Missing or invalid content');
      return NextResponse.json({ error: 'Missing content' }, { status: 400 });
    }

    // Verify article exists
    console.log('[translations/cache] Checking if article exists:', id);
    let article;
    try {
      article = await prisma.article.findUnique({
        where: { id },
        select: { id: true, title: true, content: true },
      });
    } catch (dbErr) {
      console.error('[translations/cache] Database error fetching article:', dbErr);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!article) {
      console.error('[translations/cache] Article not found:', id);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    console.log('[translations/cache] Article exists. Computing hash...');
    const versionHash = generateContentHash(article.title, article.content);

    // Handle gallery captions
    let galleryCaptionsJson: string | null = null;
    if (Array.isArray(galleryCaptions) && galleryCaptions.length > 0) {
      try {
        galleryCaptionsJson = JSON.stringify(galleryCaptions);
        console.log('[translations/cache] Gallery captions serialized:', galleryCaptionsJson.length, 'bytes');
      } catch (e) {
        console.warn('[translations/cache] Could not serialize gallery captions:', e);
      }
    }

    // Prepare data
    const translationData = {
      title: String(title).trim(),
      excerpt: String(excerpt || '').trim(),
      content: String(content).trim(),
      galleryCaptions: galleryCaptionsJson,
      translationSource: 'ai', // Always use 'ai' as the source (valid DB value)
      versionHash,
    };

    console.log('[translations/cache] Translation data prepared:', {
      title: translationData.title || '(empty)',
      excerpt: translationData.excerpt || '(empty)',
      content: translationData.content.substring(0, 50) + '...',
      hasGallery: !!translationData.galleryCaptions,
      versionHash: translationData.versionHash,
    });

    // Validate final data
    if (!translationData.title) {
      console.error('[translations/cache] Title is empty after trimming');
      return NextResponse.json({ error: 'Title is empty' }, { status: 400 });
    }

    if (!translationData.content) {
      console.error('[translations/cache] Content is empty after trimming');
      return NextResponse.json({ error: 'Content is empty' }, { status: 400 });
    }

    console.log('[translations/cache] Attempting to save translation:', {
      articleId: id,
      language,
      titleLen: translationData.title.length,
      contentLen: translationData.content.length,
      hasGallery: !!galleryCaptionsJson,
    });

    // Save to database with explicit field assignment
    let result;
    try {
      console.log('[translations/cache] Starting upsert for article', id, 'language', language);
      
      // Check if translation exists
      const existing = await prisma.articleTranslation.findUnique({
        where: {
          articleId_language: {
            articleId: id,
            language,
          },
        },
        select: { id: true },
      });

      console.log('[translations/cache] Existing translation found:', !!existing);

      if (existing) {
        // Update existing
        console.log('[translations/cache] Updating translation id', existing.id);
        result = await prisma.articleTranslation.update({
          where: { id: existing.id },
          data: {
            title: translationData.title,
            excerpt: translationData.excerpt,
            content: translationData.content,
            galleryCaptions: translationData.galleryCaptions,
            translationSource: translationData.translationSource,
            versionHash: translationData.versionHash,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new
        console.log('[translations/cache] Creating new translation for article', id);
        result = await prisma.articleTranslation.create({
          data: {
            articleId: id,
            language,
            title: translationData.title,
            excerpt: translationData.excerpt,
            content: translationData.content,
            galleryCaptions: translationData.galleryCaptions,
            translationSource: translationData.translationSource,
            versionHash: translationData.versionHash,
          },
        });
      }
      console.log('[translations/cache] Successfully saved translation, id:', result.id);
    } catch (upsertErr) {
      console.error('[translations/cache] Save operation failed:', {
        error: upsertErr instanceof Error ? upsertErr.message : String(upsertErr),
        code: (upsertErr as any)?.code,
        meta: (upsertErr as any)?.meta,
        stack: upsertErr instanceof Error ? upsertErr.stack?.substring(0, 300) : undefined,
      });
      throw upsertErr;
    }

    console.log('[POST /api/translations/cache] === SUCCESS ===', result.id);
    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    // Check if it's a timeout
    const isTimeout = err instanceof Error && err.message.includes('timeout');
    const statusCode = isTimeout ? 504 : 500;
    
    const errorDetails: any = {
      type: err instanceof Error ? err.constructor.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      code: (err as any)?.code,
      meta: (err as any)?.meta,
      isTimeout,
      timestamp: new Date().toISOString(),
    };

    // Add full stack trace for debugging
    if (err instanceof Error) {
      errorDetails.stack = err.stack;
    }

    // Add Prisma-specific error details
    if ((err as any)?.clientVersion) {
      errorDetails.prismaError = {
        code: (err as any)?.code,
        message: (err as any)?.message,
        meta: (err as any)?.meta,
      };
    }

    console.error('[translations/cache] FULL ERROR:', JSON.stringify(errorDetails, null, 2));
    console.log('[POST /api/translations/cache] === SENDING ERROR RESPONSE ===', statusCode);
    
    const responsePayload = { 
      success: false,
      error: errorDetails.message,
      type: errorDetails.type,
      code: errorDetails.code,
      isTimeout: errorDetails.isTimeout,
      timestamp: errorDetails.timestamp,
      meta: errorDetails.meta,
      stack: process.env.NODE_ENV === 'development' ? errorDetails.stack : undefined,
    };
    
    console.log('[POST /api/translations/cache] Response payload:', JSON.stringify(responsePayload));
    
    return NextResponse.json(responsePayload, { status: statusCode });
  }
}
