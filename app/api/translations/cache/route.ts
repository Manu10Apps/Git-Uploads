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

  if (isNaN(articleId) || articleId <= 0 || !lang || !['en', 'sw', 'ky'].includes(lang)) {
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
 * Save a client-side translation to the database.
 * Simplified and bulletproof version.
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error('[translations/cache POST] JSON parse error:', parseErr);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { articleId, language, title, excerpt, content, galleryCaptions } = body;

    console.log('[translations/cache POST] Received:', {
      articleId,
      language,
      titleLength: title?.length,
      contentLength: content?.length,
      hasCaptions: !!galleryCaptions,
    });

    // Basic validation
    if (!articleId || !language || !title || !content) {
      const missing = [];
      if (!articleId) missing.push('articleId');
      if (!language) missing.push('language');
      if (!title) missing.push('title');
      if (!content) missing.push('content');
      console.error('[translations/cache POST] Missing fields:', missing);
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    if (!['en', 'sw', 'ky'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    const id = Number(articleId);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid articleId' }, { status: 400 });
    }

    // Get article for hash
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true, title: true, content: true },
    });

    if (!article) {
      console.error('[translations/cache POST] Article not found:', id);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Serialize gallery captions
    let galleryCaptionsJson: string | null = null;
    if (Array.isArray(galleryCaptions) && galleryCaptions.length > 0) {
      try {
        galleryCaptionsJson = JSON.stringify(galleryCaptions);
      } catch (e) {
        console.warn('[translations/cache POST] Failed to serialize captions:', e);
      }
    }

    const versionHash = generateContentHash(article.title, article.content);

    // Upsert translation
    const existing = await prisma.articleTranslation.findUnique({
      where: {
        articleId_language: { articleId: id, language },
      },
      select: { id: true },
    });

    let result;
    if (existing) {
      console.log('[translations/cache POST] Updating existing translation:', {
        translationId: existing.id,
        articleId: id,
        language,
      });
      result = await prisma.articleTranslation.update({
        where: { id: existing.id },
        data: {
          title: String(title).trim(),
          excerpt: String(excerpt || '').trim(),
          content: String(content).trim(),
          galleryCaptions: galleryCaptionsJson,
          translationSource: 'ai',
          versionHash,
          updatedAt: new Date(),
        },
      });
    } else {
      console.log('[translations/cache POST] Creating new translation:', {
        articleId: id,
        language,
      });
      result = await prisma.articleTranslation.create({
        data: {
          articleId: id,
          language,
          title: String(title).trim(),
          excerpt: String(excerpt || '').trim(),
          content: String(content).trim(),
          galleryCaptions: galleryCaptionsJson,
          translationSource: 'ai',
          versionHash,
        },
      });
    }

    console.log('[translations/cache POST] ✓ Translation saved successfully:', {
      resultId: result.id,
      articleId: id,
      language,
    });
    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    console.error('[translations/cache POST] Fatal error:', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      type: err instanceof Error ? err.constructor.name : typeof err,
    });
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Server error',
        debug: process.env.NODE_ENV === 'development' ? String(err) : undefined,
      },
      { status: 500 }
    );
  }
}
