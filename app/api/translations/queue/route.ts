import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { queueArticleTranslations, translateAllCategories } from '@/lib/translation-cache';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '@/lib/translation-service';

/**
 * POST /api/translations/queue
 * Queue translation jobs for articles.
 * Body: { articleId?: number, action: 'article' | 'categories' | 'popular' }
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Require auth for queue operations (admin or cron)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { articleId, action } = body;

    if (action === 'article' && articleId) {
      await queueArticleTranslations(articleId);
      return NextResponse.json({ success: true, message: `Translations queued for article ${articleId}` });
    }

    if (action === 'categories') {
      await translateAllCategories();
      return NextResponse.json({ success: true, message: 'All category translations queued' });
    }

    if (action === 'popular') {
      // Pre-translate the most recent published articles
      const recentArticles = await prisma.article.findMany({
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        select: { id: true },
      });

      const results = await Promise.allSettled(
        recentArticles.map((a) => queueArticleTranslations(a.id))
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      return NextResponse.json({
        success: true,
        message: `Queued translations for ${succeeded}/${recentArticles.length} articles`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[translation] Queue operation failed:', error);
    return NextResponse.json(
      { error: 'Queue operation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/translations/queue
 * Get translation statistics.
 */
export async function GET() {
  try {
    const totalArticles = await prisma.article.count({ where: { status: 'published' } });

    const nonDefaultLanguages = SUPPORTED_LANGUAGES.filter((l) => l !== DEFAULT_LANGUAGE);
    const totalExpected = totalArticles * nonDefaultLanguages.length;

    const translatedCount = await prisma.articleTranslation.count();

    const byLanguage = await Promise.all(
      nonDefaultLanguages.map(async (lang) => ({
        language: lang,
        count: await prisma.articleTranslation.count({ where: { language: lang } }),
        total: totalArticles,
      }))
    );

    return NextResponse.json({
      totalArticles,
      totalExpectedTranslations: totalExpected,
      completedTranslations: translatedCount,
      completionPercentage: totalExpected > 0 ? Math.round((translatedCount / totalExpected) * 100) : 0,
      byLanguage,
    });
  } catch (error) {
    console.error('[translation] Stats fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
