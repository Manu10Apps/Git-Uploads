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

    // Translate using backend service (fallback chain: MyMemory → LibreTranslate → Puter → Mock)
    let result;
    let translationSource = 'mymemory';
    let memoryErrorMsg = '';
    let libreErrorMsg = '';
    let puterErrorMsg = '';
    
    // 1. Try MyMemory first (most stable, currently only working service)
    try {
      console.log('[translate-article] → Attempting MyMemory translation...');
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
      console.log('[translate-article] ✓ MyMemory translation successful');
    } catch (memoryError) {
      memoryErrorMsg = memoryError instanceof Error ? memoryError.message : String(memoryError);
      console.warn('[translate-article] ❌ MyMemory failed:', memoryErrorMsg);
      console.warn('[translate-article] → Attempting LibreTranslate translation...');
      
      // 2. Try LibreTranslate (free, open-source)
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
        console.log('[translate-article] ✓ LibreTranslate translation successful');
      } catch (libreError) {
        libreErrorMsg = libreError instanceof Error ? libreError.message : String(libreError);
        console.warn('[translate-article] ❌ LibreTranslate failed:', libreErrorMsg);
        console.warn('[translate-article] → Attempting Puter translation...');
        
        // 3. Try Puter (free AI service)
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
        } catch (puterError) {
          puterErrorMsg = puterError instanceof Error ? puterError.message : String(puterError);
          console.warn('[translate-article] ❌ Puter failed:', puterErrorMsg);
          
          // 4. Fallback: Mock translation (echo with [TEST] prefix - for development only)
          if (process.env.NODE_ENV === 'development' || process.env.TRANSLATION_MOCK === 'true') {
            console.warn('[translate-article] → Using MOCK translation (development mode)');
            result = {
              title: `[${to.toUpperCase()}] ${title}`,
              excerpt: `[${to.toUpperCase()}] ${excerpt}`,
              content: `[${to.toUpperCase()}] ${content}`,
              galleryCaptions: processedGallery?.map(item => ({
                url: item.url,
                caption: `[${to.toUpperCase()}] ${item.caption}`,
              })),
            };
            translationSource = 'mock';
            console.log('[translate-article] ✓ Mock translation (development mode)');
          } else {
            // Production: fail if no real service available
            console.error('[translate-article] ❌ All translation services failed:');
            console.error('  MyMemory:', memoryErrorMsg);
            console.error('  LibreTranslate:', libreErrorMsg);
            console.error('  Puter:', puterErrorMsg);
            throw new Error(
              `All translation services unavailable. Try again in a moment.`
            );
          }
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[translate-article] ❌ Translation failed - Full error details:', {
      message: errorMsg,
      stack: errorStack,
      type: error instanceof Error ? error.constructor.name : typeof error,
    });
    
    return NextResponse.json(
      { 
        error: `Translation failed: ${errorMsg}`,
        debug: {
          message: errorMsg,
          services: {
            myMemory: memoryErrorMsg,
            libretranslate: libreErrorMsg,
            puter: puterErrorMsg,
          },
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
