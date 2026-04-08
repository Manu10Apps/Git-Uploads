import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { queueArticleTranslations, translateAllCategories } from '@/lib/translation-cache';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/translation-service';

/**
 * GET /api/cron/translate-new-articles
 * Cron job: find published articles missing translations and queue them.
 * Run every 6 hours to catch newly published content.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const nonDefaultLangs = SUPPORTED_LANGUAGES.filter((l) => l !== DEFAULT_LANGUAGE);

    // Find articles missing any translation
    const articlesNeedingTranslation = await prisma.article.findMany({
      where: {
        status: 'published',
        translations: {
          none: {},
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10, // Process in batches to avoid timeout
      select: { id: true, title: true },
    });

    // Also find articles missing specific language translations
    const partiallyTranslated = await prisma.article.findMany({
      where: {
        status: 'published',
        translations: {
          some: {},
        },
      },
      include: {
        translations: {
          select: { language: true },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });

    const needsTranslation = partiallyTranslated.filter((article) => {
      const translatedLangs = new Set(article.translations.map((t) => t.language));
      return nonDefaultLangs.some((lang) => !translatedLangs.has(lang));
    });

    const allArticleIds = [
      ...articlesNeedingTranslation.map((a) => a.id),
      ...needsTranslation.map((a) => a.id),
    ];

    // Deduplicate
    const uniqueIds = [...new Set(allArticleIds)];

    const results = await Promise.allSettled(
      uniqueIds.map((id) => queueArticleTranslations(id))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;

    // Also ensure categories are translated
    await translateAllCategories();

    return NextResponse.json({
      success: true,
      articlesProcessed: uniqueIds.length,
      translationsCreated: succeeded,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cron] Translation job failed:', error);
    return NextResponse.json(
      { error: 'Translation cron job failed' },
      { status: 500 }
    );
  }
}
