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
 * Save a client-side (puter.ai) translation to the database.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[translations/cache POST] Request received');
    const body = await request.json();
    console.log('[translations/cache POST] Body parsed:', { 
      articleId: body.articleId, 
      language: body.language, 
      contentLength: body.content?.length || 0,
      excerptLength: body.excerpt?.length || 0,
      captionCount: Array.isArray(body.galleryCaptions) ? body.galleryCaptions.length : 0
    });

    const { articleId, language, title, excerpt, content, galleryCaptions } = body;

    const id = typeof articleId === 'number' ? articleId : parseInt(String(articleId), 10);
    if (isNaN(id) || id <= 0 || !['en', 'sw'].includes(language)) {
      console.warn('[translations/cache POST] Invalid parameters:', { id, language });
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (!title || !content) {
      console.warn('[translations/cache POST] Missing fields:', { title: !!title, content: !!content });
      return NextResponse.json({ error: 'Missing translation fields' }, { status: 400 });
    }

    // Get the original article to compute version hash
    console.log('[translations/cache POST] Looking up article:', id);
    const article = await prisma.article.findUnique({
      where: { id },
      select: { title: true, content: true },
    });

    if (!article) {
      console.warn('[translations/cache POST] Article not found:', id);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const versionHash = generateContentHash(article.title, article.content);
    console.log('[translations/cache POST] Version hash computed:', versionHash);

    // Convert gallery captions to JSON string if provided
    let galleryCaptionsJson: string | null = null;
    if (galleryCaptions) {
      try {
        if (Array.isArray(galleryCaptions) && galleryCaptions.length > 0) {
          galleryCaptionsJson = JSON.stringify(galleryCaptions);
          console.log(
            '[translations/cache POST] Stringified gallery captions:',
            galleryCaptionsJson.length,
            'bytes'
          );
        }
      } catch (e) {
        console.error('[translations/cache POST] Failed to stringify galleryCaptions:', e);
        // Continue without gallery captions
      }
    }

    const now = new Date();

    // Use explicit create and update shapes to avoid type issues
    console.log('[translations/cache POST] Performing upsert with:', {
      articleId: id,
      language,
      titleLength: String(title).substring(0, 500).length,
      contentLength: String(content).length,
      hasGalleryCaptions: !!galleryCaptionsJson
    });

    const result = await prisma.articleTranslation.upsert({
      where: { articleId_language: { articleId: id, language } },
      create: {
        articleId: id,
        language: String(language),
        title: String(title),
        excerpt: String(excerpt || ''),
        content: String(content),
        galleryCaptions: galleryCaptionsJson,
        translationSource: 'puter-ai',
        versionHash: String(versionHash),
      },
      update: {
        title: String(title),
        excerpt: String(excerpt || ''),
        content: String(content),
        galleryCaptions: galleryCaptionsJson,
        translationSource: 'puter-ai',
        versionHash: String(versionHash),
        translatedAt: now, // update translation timestamp on re-translation
      },
    });

    console.log(
      '[translations/cache POST] Successfully saved translation:',
      { id, language, resultId: result.id, hasCaptions: !!galleryCaptionsJson }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const errorInfo = {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : String(err),
      code: (err as any)?.code,
      meta: (err as any)?.meta,
      stack: err instanceof Error ? err.stack : undefined,
    };
    console.error('[translations/cache POST] ERROR:', JSON.stringify(errorInfo, null, 2));
    const message = err instanceof Error ? err.message : 'Failed to save translation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
