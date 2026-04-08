import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/translations/batch?ids=1,2,3&lang=en
 * Fetch translations for multiple articles at once.
 * Returns a map of articleId -> { title, excerpt }.
 */
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get('ids') || '';
  const lang = request.nextUrl.searchParams.get('lang');

  if (!lang || !['en', 'sw'].includes(lang)) {
    return NextResponse.json({ data: {} });
  }

  const ids = idsParam
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0)
    .slice(0, 50); // limit to 50 articles per request

  if (ids.length === 0) {
    return NextResponse.json({ data: {} });
  }

  try {
    const translations = await prisma.articleTranslation.findMany({
      where: {
        articleId: { in: ids },
        language: lang,
      },
      select: {
        articleId: true,
        title: true,
        excerpt: true,
      },
    });

    const map: Record<number, { title: string; excerpt: string }> = {};
    for (const t of translations) {
      map[t.articleId] = { title: t.title, excerpt: t.excerpt || '' };
    }

    return NextResponse.json(
      { data: map },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch {
    return NextResponse.json({ data: {} });
  }
}
