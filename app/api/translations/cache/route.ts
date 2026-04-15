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
  console.log('=== [translations/cache POST] START ===');
  
  try {
    console.log('[translations/cache] Step 1: Request received');
    
    let body;
    try {
      body = await request.json();
      console.log('[translations/cache] Step 2: JSON parsed successfully');
    } catch (parseErr) {
      console.error('[translations/cache] Step 2 FAILED: JSON parse error', parseErr);
      return NextResponse.json({ error: 'Invalid JSON', step: 2 }, { status: 400 });
    }
    
    console.log('[translations/cache] Step 3: Extracting fields from body');
    const { articleId, language, title, excerpt, content, galleryCaptions } = body;

    // Validate inputs
    console.log('[translations/cache] Step 4: Validating articleId');
    const id = Number(articleId);
    if (!Number.isInteger(id) || id <= 0) {
      console.error('[translations/cache] Step 4 FAILED: Invalid articleId:', articleId);
      return NextResponse.json({ error: 'Invalid articleId', step: 4 }, { status: 400 });
    }

    console.log('[translations/cache] Step 5: Validating language');
    if (!['en', 'sw'].includes(language)) {
      console.error('[translations/cache] Step 5 FAILED: Invalid language:', language);
      return NextResponse.json({ error: 'Invalid language', step: 5 }, { status: 400 });
    }

    console.log('[translations/cache] Step 6: Validating title');
    if (!title || typeof title !== 'string') {
      console.error('[translations/cache] Step 6 FAILED: Missing or invalid title');
      return NextResponse.json({ error: 'Missing title', step: 6 }, { status: 400 });
    }

    console.log('[translations/cache] Step 7: Validating content');
    if (!content || typeof content !== 'string') {
      console.error('[translations/cache] Step 7 FAILED: Missing or invalid content');
      return NextResponse.json({ error: 'Missing content', step: 7 }, { status: 400 });
    }

    // Verify article exists
    console.log('[translations/cache] Step 8: Fetching article from DB');
    let article;
    try {
      article = await prisma.article.findUnique({
        where: { id },
        select: { id: true, title: true, content: true },
      });
    } catch (dbErr) {
      console.error('[translations/cache] Step 8 FAILED: Database error', dbErr);
      return NextResponse.json({ error: 'Database error fetching article', step: 8 }, { status: 500 });
    }

    if (!article) {
      console.error('[translations/cache] Step 9: Article not found:', id);
      return NextResponse.json({ error: 'Article not found', step: 9 }, { status: 404 });
    }

    console.log('[translations/cache] Step 10: Computing version hash');
    const versionHash = generateContentHash(article.title, article.content);

    // Handle gallery captions
    console.log('[translations/cache] Step 11: Processing gallery captions');
    let galleryCaptionsJson: string | null = null;
    if (Array.isArray(galleryCaptions) && galleryCaptions.length > 0) {
      try {
        galleryCaptionsJson = JSON.stringify(galleryCaptions);
        console.log('[translations/cache] Step 11: Gallery captions serialized OK');
      } catch (e) {
        console.warn('[translations/cache] Step 11: Could not serialize gallery captions:', e);
      }
    }

    // Prepare data
    console.log('[translations/cache] Step 12: Preparing translation data');
    const translationData = {
      title: String(title).trim(),
      excerpt: String(excerpt || '').trim(),
      content: String(content).trim(),
      galleryCaptions: galleryCaptionsJson,
      translationSource: 'puter-ai',
      versionHash,
    };

    console.log('[translations/cache] Step 13: Validating prepared data');
    if (!translationData.title) {
      console.error('[translations/cache] Step 13 FAILED: Title is empty after trimming');
      return NextResponse.json({ error: 'Title is empty', step: 13 }, { status: 400 });
    }

    if (!translationData.content) {
      console.error('[translations/cache] Step 13 FAILED: Content is empty after trimming');
      return NextResponse.json({ error: 'Content is empty', step: 13 }, { status: 400 });
    }

    console.log('[translations/cache] Step 14: Performing upsert');
    let result;
    try {
      result = await prisma.articleTranslation.upsert({
        where: {
          articleId_language: {
            articleId: id,
            language,
          },
        },
        create: {
          articleId: id,
          language,
          ...translationData,
        },
        update: translationData,
      });
      console.log('[translations/cache] Step 14 SUCCESS: Upserted translation, id:', result.id);
    } catch (upsertErr) {
      console.error('[translations/cache] Step 14 FAILED: Upsert error');
      console.error('Error message:', upsertErr instanceof Error ? upsertErr.message : String(upsertErr));
      console.error('Error code:', (upsertErr as any)?.code);
      console.error('Error meta:', (upsertErr as any)?.meta);
      throw upsertErr;
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    console.log('=== [translations/cache POST] ERROR CAUGHT ===');
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode = (err as any)?.code || 'UNKNOWN';
    const errorMeta = (err as any)?.meta;
    
    console.error('[translations/cache] Error message:', errorMessage);
    console.error('[translations/cache] Error code:', errorCode);
    console.error('[translations/cache] Error meta:', errorMeta);
    
    return NextResponse.json(
      {
        error: errorMessage,
        code: errorCode,
        meta: errorMeta || null,
      },
      { status: 500 }
    );
  }
}
