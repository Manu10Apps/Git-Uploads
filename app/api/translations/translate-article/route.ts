import { NextRequest, NextResponse } from 'next/server';
import { translateArticle as translateArticleBackend, isValidLanguage, type SupportedLanguage } from '@/lib/translation-service';
import { translateArticle as translateArticleLibreTranslate } from '@/lib/libretranslate-server';

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
    if (totalLength > 50000) {
      return NextResponse.json(
        { error: 'Content too long. Keep total under 50,000 characters.' },
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

    // Translate using backend service (OpenAI)
    let result;
    let translationSource = 'openai';
    
    try {
      result = await translateArticleBackend(
        {
          title,
          excerpt,
          content,
          gallery: processedGallery,
        },
        from as SupportedLanguage,
        to as SupportedLanguage
      );
    } catch (openaiError) {
      const errorMessage = openaiError instanceof Error ? openaiError.message : String(openaiError);
      
      // Check if it's a quota exceeded error (429)
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        console.warn('[translate-article] OpenAI quota exceeded, falling back to LibreTranslate');
        
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
          translationSource = 'libretranslate';
          console.log('[translate-article] ✓ Fallback to LibreTranslate successful');
        } catch (fallbackError) {
          console.error('[translate-article] Both OpenAI and LibreTranslate failed:', fallbackError);
          throw new Error(`Translation services unavailable. OpenAI error: ${errorMessage}. Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
        }
      } else {
        // Re-throw if it's not a quota issue
        throw openaiError;
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
