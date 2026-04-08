import { NextRequest, NextResponse } from 'next/server';
import { translateText, isValidLanguage, DEFAULT_LANGUAGE, type SupportedLanguage } from '@/lib/translation-service';

/**
 * POST /api/translations/text
 * Translate arbitrary text between supported languages.
 * Body: { text: string, from?: string, to: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, from, to } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
    }

    if (!to || !isValidLanguage(to)) {
      return NextResponse.json(
        { error: 'Invalid or missing target language. Supported: ky, en, sw' },
        { status: 400 }
      );
    }

    const fromLang: SupportedLanguage = from && isValidLanguage(from) ? from : DEFAULT_LANGUAGE;

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text too long. Maximum 10,000 characters.' },
        { status: 400 }
      );
    }

    const result = await translateText(text, fromLang, to as SupportedLanguage);

    return NextResponse.json({ data: result.text, from: fromLang, to });
  } catch (error) {
    console.error('[translation] Text translation failed:', error);
    return NextResponse.json(
      { error: 'Translation failed. Please try again later.' },
      { status: 500 }
    );
  }
}
