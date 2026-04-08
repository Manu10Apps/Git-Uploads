import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateContentHash } from '@/lib/translation-service';

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
        translationSource: true,
        versionHash: true,
      },
    });

    if (!translation) {
      return NextResponse.json({ data: null });
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

    return NextResponse.json(
      { data: translation, stale },
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
    const body = await request.json();
    const { articleId, language, title, excerpt, content } = body;

    const id = typeof articleId === 'number' ? articleId : parseInt(String(articleId), 10);
    if (isNaN(id) || id <= 0 || !['en', 'sw'].includes(language)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (!title || !content) {
      return NextResponse.json({ error: 'Missing translation fields' }, { status: 400 });
    }

    // Get the original article to compute version hash
    const article = await prisma.article.findUnique({
      where: { id },
      select: { title: true, content: true },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const versionHash = generateContentHash(article.title, article.content);

    await prisma.articleTranslation.upsert({
      where: { articleId_language: { articleId: id, language } },
      create: {
        articleId: id,
        language,
        title: String(title),
        excerpt: String(excerpt || ''),
        content: String(content),
        translationSource: 'puter-ai',
        versionHash,
      },
      update: {
        title: String(title),
        excerpt: String(excerpt || ''),
        content: String(content),
        translationSource: 'puter-ai',
        versionHash,
        translatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[translations/cache POST] Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to save translation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
