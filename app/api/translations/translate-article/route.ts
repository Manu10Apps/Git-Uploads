import { NextRequest, NextResponse } from 'next/server';
import { isValidLanguage, type SupportedLanguage } from '@/lib/translation-service';
import { translateArticle as translateArticleLibreTranslate } from '@/lib/libretranslate-server';
import { translateArticle as translateArticlePuter } from '@/lib/puter-server-translate';
import { translateArticle as translateArticleMyMemory } from '@/lib/mymemory-translate';

/**
 * POST /api/translations/translate-article
 * Translate article fields (title, excerpt, content, gallery) server-side.
 * Avoids CORS issues by using backend OpenAI translator.
 * 
 * Body: {
 *   title: string,
 *   excerpt: string,
 *   content: string,
 *   gallery?: Array<{ url: string, caption: string }>,
 *   from?: SupportedLanguage (default: 'ky'),
 *   to: SupportedLanguage ('en' or 'sw')
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, excerpt, content, gallery, from = 'ky', to } = body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid title' }, { status: 400 });
    }
    if (!excerpt || typeof excerpt !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid excerpt' }, { status: 400 });
    }
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid content' }, { status: 400 });
    }
    if (!to || !isValidLanguage(to)) {
      return NextResponse.json(
        { error: 'Invalid or missing target language. Supported: ky, en, sw' },
        { status: 400 }
      );
    }
    if (from && !isValidLanguage(from)) {
      return NextResponse.json(
        { error: 'Invalid source language. Supported: ky, en, sw' },
        { status: 400 }
      );
    }

    // Validate content length (rough limit to avoid huge translations)
    const totalLength = title.length + excerpt.length + content.length;
    if (totalLength > 500000) {  // Increased from 50,000 to 500,000 (500K chars)
      return NextResponse.json(
        { error: 'Content too long. Keep total under 500,000 characters.' },
        { status: 400 }
      );
    }

    // Validate gallery captions if provided
    let processedGallery: Array<{ url: string; caption: string }> | undefined = undefined;
    if (Array.isArray(gallery) && gallery.length > 0) {
      processedGallery = gallery.filter((item) => item?.url && item?.caption);
    }

    console.log('[translate-article] Starting translation:', {
      from,
      to,
      titleLen: title.length,
      excerptLen: excerpt.length,
      contentLen: content.length,
      galleryCount: processedGallery?.length || 0,
    });

    // Check for Kinyarwanda - many free services don't support it
    const hasKinyarwanda = from === 'ky' || to === 'ky';
    if (hasKinyarwanda) {
      console.warn('[translate-article] ⚠️  Kinyarwanda detected - free services have limited support');
    }

    // Translate using backend service (LibreTranslate - free, open-source)
    let result;
    let translationSource = 'libretranslate';
    let lastError: Error | null = null;
    
    // 1. Try LibreTranslate (free, open-source)
    try {
      result = await translateArticleLibreTranslate(
        {
          title,
          excerpt,
          content,
          gallery: processedGallery,
        },
        from as SupportedLanguage,
        to as SupportedLanguage
      );
      console.log('[translate-article] ✓ LibreTranslate translation successful');
    } catch (libreError) {
      lastError = libreError instanceof Error ? libreError : new Error(String(libreError));
      const errorMessage = lastError.message;
      console.warn('[translate-article] LibreTranslate unavailable, trying Puter');
      
      // 2. Try Puter (free AI service)
      try {
        result = await translateArticlePuter(
          {
            title,
            excerpt,
            content,
            gallery: processedGallery,
          },
          from as SupportedLanguage,
          to as SupportedLanguage
        );
        translationSource = 'puter';
        console.log('[translate-article] ✓ Puter translation successful');
        lastError = null;
      } catch (puterError) {
        const puterErrorMsg = puterError instanceof Error ? puterError.message : String(puterError);
        console.warn('[translate-article] Puter failed:', puterErrorMsg);
        
        // 3. Try MyMemory (most stable free fallback)
        try {
          console.warn('[translate-article] Trying MyMemory as final fallback');
          result = await translateArticleMyMemory(
            {
              title,
              excerpt,
              content,
              gallery: processedGallery,
            },
            from as SupportedLanguage,
            to as SupportedLanguage
          );
          translationSource = 'mymemory';
          console.log('[translate-article] ✓ MyMemory translation successful');
          lastError = null;
        } catch (memoryError) {
          const memoryErrorMsg = memoryError instanceof Error ? memoryError.message : String(memoryError);
          console.error('[translate-article] All translation services failed');
          console.error('  - LibreTranslate:', errorMessage);
          console.error('  - Puter:', puterErrorMsg);
          console.error('  - MyMemory:', memoryErrorMsg);
          throw new Error(
            `All translation services failed. LibreTranslate: ${errorMessage}. Puter: ${puterErrorMsg}. MyMemory: ${memoryErrorMsg}`
          );
        }
      }
    }

    console.log('[translate-article] ✓ Translation successful:', {
      to,
      source: translationSource,
      resultLen: result.content.length,
    });

    return NextResponse.json({
      success: true,
      from,
      to,
      data: {
        title: result.title,
        excerpt: result.excerpt,
        content: result.content,
        galleryCaptions: result.galleryCaptions,
        translationSource: translationSource,
      },
    });
  } catch (error) {
    console.error('[translate-article] Translation failed:', error);
    const message = error instanceof Error ? error.message : 'Translation failed';
    return NextResponse.json(
      { error: `Translation failed: ${message}` },
      { status: 500 }
    );
  }
}
