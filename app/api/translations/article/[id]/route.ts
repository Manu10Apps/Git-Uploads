import { NextRequest, NextResponse } from 'next/server';
import { getArticleTranslation } from '@/lib/translation-cache';
import { isValidLanguage, type SupportedLanguage } from '@/lib/translation-service';

/**
 * GET /api/translations/article/[id]?lang=en
 * Get or create a translation for an article.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const articleId = parseInt(id, 10);
  if (isNaN(articleId) || articleId <= 0) {
    return NextResponse.json({ error: 'Invalid article ID' }, { status: 400 });
  }

  const lang = request.nextUrl.searchParams.get('lang');
  if (!lang || !isValidLanguage(lang)) {
    return NextResponse.json(
      { error: 'Invalid or missing language parameter. Supported: en, sw, ky' },
      { status: 400 }
    );
  }

  try {
    const translation = await getArticleTranslation(articleId, lang as SupportedLanguage);

    if (!translation) {
      // Language is default or article not found
      return NextResponse.json({ data: null, isOriginal: true });
    }

    return NextResponse.json({
      data: translation,
      isOriginal: false,
      language: lang,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error(`[translation] Failed to translate article ${articleId} to ${lang}:`, error);
    return NextResponse.json(
      { error: 'Translation failed. Please try again later.' },
      { status: 500 }
    );
  }
}
